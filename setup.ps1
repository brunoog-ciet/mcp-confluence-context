#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$SCRIPT_DIR  = $PSScriptRoot
$CONFIG_FILE = Join-Path $HOME '.claude.json'

Write-Host "=== mcp-confluence-context setup ===" -ForegroundColor Cyan
Write-Host ""

$TENANT_NAME = Read-Host "Nome do tenant (ex: bradesco, bradescoseguros)"
if (-not $TENANT_NAME) {
    Write-Error "Erro: nome do tenant e obrigatorio."
    exit 1
}

$ENV_FILE = Join-Path $SCRIPT_DIR ".env.$TENANT_NAME"

$PAT       = Read-Host "CONFLUENCE_PAT (Personal Access Token)"
$BASE_URL  = Read-Host "CONFLUENCE_BASE_URL (ex: https://confluence.empresa.com.br)"
$SPACE_KEY = Read-Host "CONFLUENCE_SPACE_KEY (ex: DEV - pressione Enter para pular)"
$CACHE_TTL = Read-Host "CACHE_TTL_SECONDS (padrao: 3600)"
if (-not $CACHE_TTL) { $CACHE_TTL = '3600' }

Set-Content -Path $ENV_FILE -Encoding UTF8 -Value @(
    "CONFLUENCE_PAT=$PAT",
    "CONFLUENCE_BASE_URL=$BASE_URL",
    "CONFLUENCE_SPACE_KEY=$SPACE_KEY",
    "CACHE_TTL_SECONDS=$CACHE_TTL"
)

Write-Host ".env criado em $ENV_FILE"

Write-Host "Instalando dependencias..."
npm install --prefix $SCRIPT_DIR

Write-Host "Compilando TypeScript..."
npm run build --prefix $SCRIPT_DIR

$MCP_ENTRY   = Join-Path $SCRIPT_DIR 'dist\index.js'
$SERVER_NAME = "mcp-confluence-$TENANT_NAME"

if (Test-Path $CONFIG_FILE) {
    $config = Get-Content $CONFIG_FILE -Raw | ConvertFrom-Json

    if (-not $config.mcpServers) {
        $config | Add-Member -NotePropertyName 'mcpServers' -NotePropertyValue ([PSCustomObject]@{})
    }

    $serverEntry = [PSCustomObject]@{
        command = 'node'
        args    = @($MCP_ENTRY)
        env     = [PSCustomObject]@{ DOTENV_CONFIG_PATH = $ENV_FILE }
    }
    $config.mcpServers | Add-Member -NotePropertyName $SERVER_NAME -NotePropertyValue $serverEntry -Force

    Copy-Item $CONFIG_FILE "${CONFIG_FILE}.bak"
    $config | ConvertTo-Json -Depth 10 | Set-Content $CONFIG_FILE -Encoding UTF8
    Write-Host "MCP '$SERVER_NAME' registrado em $CONFIG_FILE"
} else {
    $entryEscaped = $MCP_ENTRY -replace '\\', '\\\\'
    $envEscaped   = $ENV_FILE  -replace '\\', '\\\\'
    Write-Host ""
    Write-Host "Arquivo $CONFIG_FILE nao encontrado."
    Write-Host "Crie o arquivo e adicione:"
    Write-Host '{'
    Write-Host '  "mcpServers": {'
    Write-Host "    `"$SERVER_NAME`": {"
    Write-Host '      "command": "node",'
    Write-Host "      `"args`": [`"$entryEscaped`"],"
    Write-Host "      `"env`": { `"DOTENV_CONFIG_PATH`": `"$envEscaped`" }"
    Write-Host '    }'
    Write-Host '  }'
    Write-Host '}'
}

Write-Host ""
Write-Host "=== Setup do tenant '$TENANT_NAME' concluido. Reinicie o Claude Code. ===" -ForegroundColor Green
Write-Host "Para adicionar outro tenant, execute este script novamente com outro nome."
