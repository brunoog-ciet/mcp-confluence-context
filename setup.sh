#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$HOME/.claude.json"

echo "=== mcp-confluence-context setup ==="
echo ""

read -rp "Nome do tenant (ex: bradesco, bradescoseguros): " TENANT_NAME
if [ -z "$TENANT_NAME" ]; then
  echo "Erro: nome do tenant é obrigatório."
  exit 1
fi

ENV_FILE="$SCRIPT_DIR/.env.$TENANT_NAME"

read -rp "CONFLUENCE_PAT (Personal Access Token): " PAT
read -rp "CONFLUENCE_BASE_URL (ex: https://confluence.empresa.com.br): " BASE_URL
read -rp "CONFLUENCE_SPACE_KEY (ex: DEV — pressione Enter para pular): " SPACE_KEY
read -rp "CACHE_TTL_SECONDS (padrão: 3600): " CACHE_TTL
CACHE_TTL="${CACHE_TTL:-3600}"

cat > "$ENV_FILE" <<EOF
CONFLUENCE_PAT=$PAT
CONFLUENCE_BASE_URL=$BASE_URL
CONFLUENCE_SPACE_KEY=$SPACE_KEY
CACHE_TTL_SECONDS=$CACHE_TTL
EOF
chmod 600 "$ENV_FILE"
echo ".env criado em $ENV_FILE"

echo "Instalando dependências..."
npm install --prefix "$SCRIPT_DIR"

echo "Compilando TypeScript..."
npm run build --prefix "$SCRIPT_DIR"

MCP_ENTRY="$SCRIPT_DIR/dist/index.js"
SERVER_NAME="mcp-confluence-$TENANT_NAME"

if [ -f "$CONFIG_FILE" ]; then
  TMP=$(mktemp)
  python3 - "$CONFIG_FILE" "$MCP_ENTRY" "$ENV_FILE" "$SERVER_NAME" > "$TMP" <<'PY'
import json, sys
config_path, entry, env_file, server_name = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
with open(config_path) as f:
    config = json.load(f)
config.setdefault('mcpServers', {})
config['mcpServers'][server_name] = {
    'command': 'node',
    'args': [entry],
    'env': {'DOTENV_CONFIG_PATH': env_file},
}
print(json.dumps(config, indent=2))
PY
  cp "$CONFIG_FILE" "${CONFIG_FILE}.bak"
  mv "$TMP" "$CONFIG_FILE"
  echo "MCP '$SERVER_NAME' registrado em $CONFIG_FILE"
else
  echo ""
  echo "Arquivo $CONFIG_FILE não encontrado."
  echo "Crie o arquivo e adicione:"
  cat <<JSON
{
  "mcpServers": {
    "$SERVER_NAME": {
      "command": "node",
      "args": ["$MCP_ENTRY"],
      "env": { "DOTENV_CONFIG_PATH": "$ENV_FILE" }
    }
  }
}
JSON
fi

echo ""
echo "=== Setup do tenant '$TENANT_NAME' concluído. Reinicie o Claude Code. ==="
echo "Para adicionar outro tenant, execute este script novamente com outro nome."
