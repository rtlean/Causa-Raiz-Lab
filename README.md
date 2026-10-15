# Causa Raiz Lab

App web pessoal para análise de causa raiz (Ishikawa, 5 Porquês, hipóteses com evidência, riscos e plano de ação com medição antes/depois). Uso individual, sem login.

## Stack

- Next.js (App Router) — em construção
- Postgres no Neon (região sa-east-1)
- Deploy: Netlify

## Banco de dados

O schema está em `db/migrations/0001_schema.sql` e já foi aplicado no banco principal do projeto Neon.

Regra central do método: uma ação só pode ser criada sobre uma hipótese com estado `validada`. Isso é garantido pela trigger `acao_exige_causa_validada`, não só pela interface.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha. Nunca faça commit de `.env*` com valores reais.

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Connection string do Neon (com `sslmode=require`) |

## Como rodar

```bash
npm install
npm run dev
```

## Estrutura

- `app/` — página (`/`) e rotas da API (`/api/*`)
- `components/App.tsx` — as 5 abas (Dashboard, Análises, Diagrama, Riscos, Plano de Ação)
- `lib/` — conexão com o bancoe helpers de validação
- `db/migrations/` — schema SQL

## Status

- [x] Schema e trigger no Neon (aplicados em `production`)
- [x] Scaffold Next.js, com build de produção passando
- [x] API das 5 abas
- [x] Interface das 5 abas
- [ ] Teste ponta a ponta contra o banco (pendente)
