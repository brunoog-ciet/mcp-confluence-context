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

**Step 1 — Generate a Confluence Personal Access Token**

1. Open Confluence and log in
2. Click your profile picture → **Profile**
3. In the sidebar, click **Settings**
4. Click **Personal Access Tokens** → **Create token**
5. Set a name (e.g. `mcp-confluence-context`) and an expiry date
6. Copy the generated token — it is shown only once

**Step 2 — Register the connector**

```bash
flow mcp add --transport http confluence-context https://github.com/brunoog-ciet/mcp-confluence-context
```

The setup will prompt for your Confluence URL and the token generated above.

**Step 3 — Restart Claude Code**

The connector will be available after restarting.

## Available tools

| Tool | Description |
|---|---|
| `get_page` | Fetches the full content of a page by ID |
| `search_pages` | Searches pages by text — use when you don't know the ID |
| `list_children` | Lists child pages of a parent — useful for navigating hierarchies |
| `update_page` | Saves a page as a draft in Confluence Storage Format |

## Multi-tenant support

Run the setup command once per organization. Each run registers an independent MCP instance in Claude Code, addressable by its own identifier (e.g. `mcp-confluence-mycompany`).

## Known limitations

- Works with Confluence Data Center/Server via PAT
- Confluence Cloud with OAuth is not supported in this version
- Cache expires after 1h by default (configurable via `CACHE_TTL_SECONDS`)
