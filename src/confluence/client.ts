import axios from 'axios';
import * as cheerio from 'cheerio';
import type { DraftResult, PageContent, PageSummary } from '../types.js';

export class ConfluenceClient {
  constructor(
    private readonly baseUrl: string,
    private readonly accessToken: string,
  ) {}

  async fetchPage(pageId: string): Promise<PageContent> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/rest/api/content/${pageId}?expand=body.storage,title`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } },
      );
      const html: string = res.data.body.storage.value;
      const $ = cheerio.load(html);
      return {
        id: pageId,
        title: res.data.title as string,
        text: $.text().replace(/\s{3,}/g, '\n\n').trim(),
      };
    } catch (err: any) {
      if (err?.response?.status === 404) {
        throw new Error(`Página não encontrada (pageId=${pageId}). Verifique o ID.`);
      }
      throw new Error(`Confluence inacessível: ${err?.message ?? 'erro desconhecido'}`);
    }
  }

  async searchPages(query: string, spaceKey?: string, limit = 10): Promise<PageSummary[]> {
    const cql = spaceKey
      ? `text~"${query}" AND space="${spaceKey}" AND type=page`
      : `text~"${query}" AND type=page`;

    try {
      const res = await axios.get(
        `${this.baseUrl}/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=${limit}`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } },
      );
      return (res.data.results as any[]).map((r) => ({
        id: r.id as string,
        title: r.title as string,
        url: `${this.baseUrl}/pages/viewpage.action?pageId=${r.id}`,
      }));
    } catch (err: any) {
      throw new Error(`Erro na busca: ${err?.message ?? 'erro desconhecido'}`);
    }
  }

  async updatePageAsDraft(
    pageId: string,
    title: string,
    storageContent: string,
  ): Promise<DraftResult> {
    const currentRes = await axios.get(
      `${this.baseUrl}/rest/api/content/${pageId}?expand=version`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } },
    ).catch((err: any) => {
      if (err?.response?.status === 404) {
        throw new Error(`Página não encontrada (pageId=${pageId}). Verifique o ID.`);
      }
      throw new Error(`Erro ao buscar versão atual: ${err?.message ?? 'erro desconhecido'}`);
    });

    const nextVersion: number = (currentRes.data.version.number as number) + 1;
    const spaceKey: string = currentRes.data.space?.key ?? currentRes.data._expandable?.space?.split('/').pop() ?? '';

    await axios.put(
      `${this.baseUrl}/rest/api/content/${pageId}`,
      {
        version: { number: nextVersion },
        title,
        type: 'page',
        status: 'draft',
        space: { key: spaceKey },
        body: {
          storage: {
            value: storageContent,
            representation: 'storage',
          },
        },
      },
      { headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } },
    ).catch((err: any) => {
      throw new Error(`Erro ao salvar rascunho: ${err?.message ?? 'erro desconhecido'}`);
    });

    return {
      pageId,
      title,
      draftUrl: `${this.baseUrl}/pages/viewpage.action?pageId=${pageId}&draft=true`,
    };
  }

  async listChildren(pageId: string): Promise<PageSummary[]> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/rest/api/content/${pageId}/child/page`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } },
      );
      return (res.data.results as any[]).map((r) => ({
        id: r.id as string,
        title: r.title as string,
        url: `${this.baseUrl}/pages/viewpage.action?pageId=${r.id}`,
      }));
    } catch (err: any) {
      if (err?.response?.status === 404) {
        throw new Error(`Página não encontrada (pageId=${pageId}). Verifique o ID.`);
      }
      throw new Error(`Erro ao listar filhas: ${err?.message ?? 'erro desconhecido'}`);
    }
  }
}
