import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { homedir } from 'os';
import { join } from 'path';
import { ConfluenceClient } from './confluence/client.js';
import { CacheManager } from './cache/manager.js';

const STORAGE_DIR = join(homedir(), '.mcp-confluence-context');

const pat = process.env.CONFLUENCE_PAT!;
const baseUrl = process.env.CONFLUENCE_BASE_URL!;
const defaultSpaceKey = process.env.CONFLUENCE_SPACE_KEY;
const ttl = parseInt(process.env.CACHE_TTL_SECONDS ?? '3600', 10);

if (!pat || !baseUrl) {
  throw new Error('CONFLUENCE_PAT e CONFLUENCE_BASE_URL são obrigatórios.');
}

const client = new ConfluenceClient(baseUrl, pat);
const cache = new CacheManager(STORAGE_DIR, ttl);

async function fetchPageWithCache(pageId: string): Promise<{ title: string; text: string }> {
  const cached = await cache.get(pageId);
  if (cached) return { title: cached.title, text: cached.text };

  let page: { id: string; title: string; text: string };
  try {
    page = await client.fetchPage(pageId);
  } catch (err: any) {
    const stale = await cache.get(pageId, { forceStale: true });
    if (stale) {
      console.error(`Aviso: usando cache expirado para página ${pageId} (${err.message})`);
      return { title: stale.title, text: stale.text };
    }
    throw err;
  }

  await cache.set(page);
  return { title: page.title, text: page.text };
}

const server = new Server(
  { name: 'mcp-confluence-context', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_page',
      description:
        'Busca o conteúdo de uma página do Confluence pelo ID e retorna o texto completo como contexto para implementação.',
      inputSchema: {
        type: 'object',
        properties: {
          pageId: { type: 'string', description: 'ID numérico da página no Confluence' },
        },
        required: ['pageId'],
      },
    },
    {
      name: 'search_pages',
      description:
        'Pesquisa páginas no Confluence por texto. Retorna lista de páginas com ID, título e URL. Use para descobrir o ID de uma página antes de chamar get_page.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texto para buscar nas páginas' },
          spaceKey: {
            type: 'string',
            description: 'Chave do espaço Confluence para filtrar (ex: DEV, ARCH). Opcional.',
          },
          limit: {
            type: 'number',
            description: 'Número máximo de resultados (padrão: 10)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'update_page',
      description:
        'Salva o conteúdo de uma página do Confluence como rascunho (draft) sem publicar. Retorna a URL do rascunho para que o usuário revise e publique manualmente.',
      inputSchema: {
        type: 'object',
        properties: {
          pageId: { type: 'string', description: 'ID numérico da página a ser editada' },
          title: { type: 'string', description: 'Novo título da página' },
          content: {
            type: 'string',
            description: 'Conteúdo em Confluence Storage Format (XHTML)',
          },
        },
        required: ['pageId', 'title', 'content'],
      },
    },
    {
      name: 'list_children',
      description:
        'Lista as páginas filhas de uma página do Confluence. Útil para navegar hierarquias de documentação.',
      inputSchema: {
        type: 'object',
        properties: {
          pageId: { type: 'string', description: 'ID da página pai no Confluence' },
        },
        required: ['pageId'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === 'get_page') {
    const { pageId } = args as { pageId: string };

    let page: { title: string; text: string };
    try {
      page = await fetchPageWithCache(pageId);
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Erro ao buscar página: ${err.message}` }] };
    }

    const output = [
      `# ${page.title}`,
      '',
      page.text,
      '',
      '---',
      '_Use o conteúdo acima como documentação de referência para a sua implementação._',
    ].join('\n');

    return { content: [{ type: 'text', text: output }] };
  }

  if (name === 'update_page') {
    const { pageId, title, content } = args as { pageId: string; title: string; content: string };

    let draft: { pageId: string; title: string; draftUrl: string };
    try {
      draft = await client.updatePageAsDraft(pageId, title, content);
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Erro ao salvar rascunho: ${err.message}` }] };
    }

    await cache.invalidate(pageId);

    const output = [
      `## Rascunho salvo com sucesso`,
      '',
      `**Página:** ${draft.title} (ID: \`${draft.pageId}\`)`,
      `**URL do rascunho:** ${draft.draftUrl}`,
      '',
      '_Acesse o link acima no Confluence para revisar o conteúdo e publicar quando estiver pronto._',
    ].join('\n');

    return { content: [{ type: 'text', text: output }] };
  }

  if (name === 'search_pages') {
    const { query, spaceKey, limit } = args as {
      query: string;
      spaceKey?: string;
      limit?: number;
    };

    const space = spaceKey ?? defaultSpaceKey;

    let results: { id: string; title: string; url: string }[];
    try {
      results = await client.searchPages(query, space, limit);
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Erro na busca: ${err.message}` }] };
    }

    if (results.length === 0) {
      return {
        content: [{ type: 'text', text: `Nenhuma página encontrada para "${query}".` }],
      };
    }

    const lines = [
      `## Resultados para "${query}"`,
      '',
      ...results.map((r, i) => `${i + 1}. **${r.title}** — ID: \`${r.id}\`\n   ${r.url}`),
      '',
      '_Chame `get_page` com o ID desejado para obter o conteúdo completo._',
    ];

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }

  if (name === 'list_children') {
    const { pageId } = args as { pageId: string };

    let children: { id: string; title: string; url: string }[];
    try {
      children = await client.listChildren(pageId);
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Erro ao listar filhas: ${err.message}` }] };
    }

    if (children.length === 0) {
      return {
        content: [{ type: 'text', text: `A página ${pageId} não possui páginas filhas.` }],
      };
    }

    const lines = [
      `## Páginas filhas de ${pageId}`,
      '',
      ...children.map((c, i) => `${i + 1}. **${c.title}** — ID: \`${c.id}\`\n   ${c.url}`),
      '',
      '_Chame `get_page` com o ID desejado para obter o conteúdo completo._',
    ];

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }

  throw new Error(`Tool desconhecida: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
