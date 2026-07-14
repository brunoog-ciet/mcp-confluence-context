# mcp-confluence-context

MCP server que expõe páginas do Confluence como contexto no Claude Code. Busque documentação de ferramentas, padrões e guias diretamente no prompt — sem copiar e colar.

Suporta múltiplos tenants (organizações Confluence distintas) rodando como instâncias independentes.

## Como funciona

1. Você pede ao Claude para buscar uma página ou pesquisar por um termo
2. O servidor consulta o Confluence via REST API (com cache local)
3. O conteúdo da página é injetado como contexto no prompt
4. O Claude usa esse conteúdo para guiar a implementação

---

## Pré-requisitos

- Node.js 20+
- [Claude Code CLI](https://claude.ai/code) instalado
- Acesso ao Confluence da sua empresa

---

## Instalação — tenant único

Se você usa apenas uma organização Confluence, execute o setup uma vez:

**macOS / Linux**
```bash
./setup.sh
```

**Windows (PowerShell)**
```powershell
.\setup.ps1
```

> No Windows, caso o PowerShell bloqueie a execução de scripts, rode antes:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

O script vai solicitar:

| Campo | Descrição |
|---|---|
| Nome do tenant | Identificador curto, ex: `bradesco` |
| `CONFLUENCE_PAT` | Personal Access Token do Confluence (veja como gerar abaixo) |
| `CONFLUENCE_BASE_URL` | URL da instância, ex: `https://confluence.empresa.com.br` |
| `CONFLUENCE_SPACE_KEY` | Chave do espaço padrão para filtrar buscas (ex: `DEV`). Opcional. |
| `CACHE_TTL_SECONDS` | Tempo de cache em segundos (padrão: `3600`) |

Após o setup, **reinicie o Claude Code**.

---

## Instalação — múltiplos tenants (duas organizações)

Execute o setup uma vez para cada organização. Cada execução registra uma instância MCP independente no Claude Code.

### 1. Primeiro tenant

```bash
./setup.sh
```

Quando solicitado:
```
Nome do tenant: bradesco
CONFLUENCE_PAT: <seu token do Bradesco>
CONFLUENCE_BASE_URL: https://confluence.bradesco.com.br
CONFLUENCE_SPACE_KEY: DEV
```

Isso cria:
- `.env.bradesco` com as credenciais
- Entrada `mcp-confluence-bradesco` no `~/.claude.json`

### 2. Segundo tenant

Execute o script novamente:

```bash
./setup.sh
```

Quando solicitado:
```
Nome do tenant: bradescoseguros
CONFLUENCE_PAT: <seu token do Bradesco Seguros>
CONFLUENCE_BASE_URL: https://confluence.bradescoseguros.com.br
CONFLUENCE_SPACE_KEY: SEG
```

Isso cria:
- `.env.bradescoseguros` com as credenciais
- Entrada `mcp-confluence-bradescoseguros` no `~/.claude.json`

### 3. Reinicie o Claude Code

Após registrar os dois tenants, reinicie o Claude Code. O resultado no `~/.claude.json` será:

```json
{
  "mcpServers": {
    "mcp-confluence-bradesco": {
      "command": "node",
      "args": ["/caminho/para/dist/index.js"],
      "env": { "DOTENV_CONFIG_PATH": "/caminho/para/.env.bradesco" }
    },
    "mcp-confluence-bradescoseguros": {
      "command": "node",
      "args": ["/caminho/para/dist/index.js"],
      "env": { "DOTENV_CONFIG_PATH": "/caminho/para/.env.bradescoseguros" }
    }
  }
}
```

### 4. Usando os dois tenants no Claude Code

As tools ficam disponíveis com o prefixo do servidor. Basta mencionar de qual organização quer a informação:

```
# Buscar no Confluence do Bradesco
usando o servidor mcp-confluence-bradesco, pesquise por "autenticação OAuth"

# Buscar no Confluence do Bradesco Seguros
usando o servidor mcp-confluence-bradescoseguros, traga a página 191667649
```

---

## Como gerar o Personal Access Token no Confluence

1. Acesse o Confluence e faça login
2. Clique na sua foto de perfil (canto superior direito) → **Perfil**
3. No menu lateral, clique em **Configurações**
4. Clique em **Tokens de acesso pessoal**
5. Clique em **Criar token**
6. Defina um nome (ex: `mcp-confluence-context`) e uma data de expiração
7. Clique em **Criar** e **copie o token gerado** — ele só é exibido uma vez

> Se a opção não aparecer, solicite ao administrador do Confluence que habilite tokens de acesso pessoal.

---

## Como encontrar o ID de uma página

Abra a página no Confluence e localize o ID na URL:

- `https://confluence.empresa.com.br/pages/viewpage.action?pageId=`**`191667649`**
- Ou: clique em **...** (reticências) → **Informações da página** → o ID aparece na URL

---

## Tools disponíveis

### `get_page`

Busca o conteúdo completo de uma página pelo ID.

```
traga o conteúdo da página 191667649 e use como referência para criar o schema Zod
```

### `search_pages`

Pesquisa páginas por texto. Use para descobrir o ID quando não souber.

```
pesquise no Confluence por "autenticação OAuth" e me mostre as páginas disponíveis
```

### `list_children`

Lista as páginas filhas de uma página pai. Útil para navegar hierarquias de documentação.

```
liste as subpáginas da página 191667649
```

### `update_page`

Salva o conteúdo de uma página como **rascunho** sem publicar. Requer o conteúdo em [Confluence Storage Format](https://confluence.atlassian.com/doc/confluence-storage-format-790796544.html). Após salvar, retorna a URL do rascunho para que você revise e publique manualmente no Confluence.

```
atualize a página 191667649 com o título "Guia de Auth" e o seguinte conteúdo em storage format: <p>Novo conteúdo</p>
```

> O cache da página é invalidado automaticamente após a edição.

---

## Exemplos de uso

```
# Buscar documentação e usar para implementar
busque no Confluence a documentação sobre "integração com o gateway de pagamentos"
e use o conteúdo para implementar o client em src/payments/gateway.ts

# Navegar a hierarquia antes de buscar
liste as subpáginas de 191667649, depois traga o conteúdo da que fala sobre autenticação

# Fornecer o ID diretamente quando já souber
use a página 191667649 do Confluence como referência e implemente o fluxo descrito
em src/auth/login.ts
```

---

## Cache

O conteúdo das páginas é armazenado em `~/.mcp-confluence-context/page-{id}.json` com TTL configurável (padrão 1h). Em caso de falha na conexão com o Confluence, o servidor utiliza automaticamente o cache expirado como fallback.

---

## Estrutura do projeto

```
mcp-confluence-context/
├── src/
│   ├── index.ts              # Entrypoint do MCP server (4 tools)
│   ├── types.ts              # Tipos compartilhados
│   ├── confluence/
│   │   └── client.ts         # fetchPage, searchPages, listChildren, updatePageAsDraft
│   └── cache/
│       └── manager.ts        # Cache por pageId com TTL
├── setup.sh                  # Script de instalação — macOS/Linux
├── setup.ps1                 # Script de instalação — Windows (PowerShell)
└── .env.example              # Template de variáveis de ambiente
```

Os arquivos `.env.<tenant>` são criados pelo script de setup e não devem ser versionados.

---

## Desenvolvimento

```bash
npm install
npm run build   # compila TypeScript
npm test        # roda os testes
```
