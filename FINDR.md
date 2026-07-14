## Confluence como contexto no Claude Code

Você para de implementar para copiar documentação do Confluence, cola no prompt, continua — e na próxima task faz de novo. Esse conector elimina essa fricção: o Claude busca e injeta o conteúdo da página diretamente, sem sair do editor.

## Como funciona

Você menciona uma página ou um termo de busca no prompt. O servidor consulta o Confluence via REST API, armazena em cache local e entrega o conteúdo como contexto. O Claude usa esse conteúdo para guiar a implementação.

## Quando faz sentido usar

- Implementar algo que já tem especificação no Confluence (schema, contrato de API, fluxo de negócio)
- Navegar hierarquias de documentação sem abrir o browser
- Manter documentação do Confluence atualizada a partir do próprio Claude Code

## Exemplo concreto

```
busque no Confluence a documentação sobre "integração com o gateway de pagamentos"
e use o conteúdo para implementar o client em src/payments/gateway.ts
```

O Claude busca, lê e implementa — sem copiar e colar nada.

## Pré-requisitos

- Node.js 20+
- Claude Code CLI instalado
- Personal Access Token do Confluence

## Limitações conhecidas

- Funciona com Confluence Data Center/Server via PAT (token pessoal)
- Confluence Cloud com OAuth não está suportado nesta versão
- O cache expira em 1h por padrão (configurável)

---

## Metadados de publicação

| Campo | Valor |
|---|---|
| **Repositório** | https://github.com/brunoog-ciet/mcp-confluence-context |
| **Flow Agent (identificador)** | `ciandt-mcp-confluence-context` |
| **Categoria** | _(definir no momento da publicação)_ |
| **Canal** | _(definir no momento da publicação)_ |
