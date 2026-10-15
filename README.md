# Causa Raiz Lab

App web pessoal para análise de causa raiz (Ishikawa, 5 Porquês, hipóteses com evidência, riscos e plano de ação com medição antes/depois). Uso individual, acesso protegido por senha simples.

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
| `APP_PASSWORD` | Senha de acesso ao app |

## Status

- [x] Schema e trigger no Neon
- [ ] Scaffold Next.js
- [ ] Tela de senha
- [ ] API das 5 abas
- [ ] Interface
- [ ] Deploy na Netlify
