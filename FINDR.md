## Confluence as context in Claude Code

You stop implementing to copy documentation from Confluence, paste it into the prompt, continue — and do it all over again on the next task. This connector eliminates that friction: Claude fetches and injects the page content directly, without leaving the editor.

## How it works

You mention a page or a search term in the prompt. The server queries Confluence via REST API, stores the result in a local cache, and delivers the content as context. Claude uses that content to guide the implementation.

## When it makes sense to use

- Implementing something that already has a specification in Confluence (schema, API contract, business flow)
- Navigating documentation hierarchies without opening a browser
- Keeping Confluence documentation up to date directly from Claude Code

## Concrete example

```
search Confluence for "payment gateway integration"
and use the content to implement the client at src/payments/gateway.ts
```

Claude fetches, reads, and implements — no copy-pasting required.

## Installation

**Prerequisites**

- Node.js 20+
- Claude Code CLI installed
- Confluence Personal Access Token (PAT)

**macOS / Linux**

```bash
git clone https://github.com/brunoog-ciet/mcp-confluence-context.git
cd mcp-confluence-context
npm install && npm run build
./setup.sh
```

**Windows (PowerShell)**

```powershell
git clone https://github.com/brunoog-ciet/mcp-confluence-context.git
cd mcp-confluence-context
npm install; npm run build
.\setup.ps1
```

The setup script will prompt for:

| Field | Description |
|---|---|
| Tenant name | Short identifier, e.g. `mycompany` |
| `CONFLUENCE_PAT` | Your Confluence Personal Access Token |
| `CONFLUENCE_BASE_URL` | Instance URL, e.g. `https://confluence.mycompany.com` |
| `CONFLUENCE_SPACE_KEY` | Default space key to filter searches (e.g. `DEV`). Optional. |
| `CACHE_TTL_SECONDS` | Cache duration in seconds (default: `3600`) |

After setup, **restart Claude Code**.

**Generating a Personal Access Token in Confluence**

1. Open Confluence and log in
2. Click your profile picture → **Profile**
3. In the sidebar, click **Settings**
4. Click **Personal Access Tokens**
5. Click **Create token**, set a name and expiry, then copy the generated token — it is shown only once

## Available tools

| Tool | Description |
|---|---|
| `get_page` | Fetches the full content of a page by ID |
| `search_pages` | Searches pages by text — use when you don't know the ID |
| `list_children` | Lists child pages of a parent — useful for navigating hierarchies |
| `update_page` | Saves a page as a draft in Confluence Storage Format |

## Multi-tenant support

Run the setup script once per organization. Each run registers an independent MCP instance in Claude Code:

```bash
./setup.sh  # first org
./setup.sh  # second org
```

Each instance gets its own identifier (e.g. `mcp-confluence-mycompany`) and can be addressed directly in the prompt.

## Known limitations

- Works with Confluence Data Center/Server via PAT
- Confluence Cloud with OAuth is not supported in this version
- Cache expires after 1h by default (configurable via `CACHE_TTL_SECONDS`)

---

## Publication metadata

| Field | Value |
|---|---|
| **Repository** | https://github.com/brunoog-ciet/mcp-confluence-context |
| **Flow Agent (identifier)** | `ciandt-mcp-confluence-context` |
| **Category** | _(set at publication time)_ |
| **Channel** | _(set at publication time)_ |
