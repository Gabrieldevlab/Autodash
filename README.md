# Autodash

Aplicação web em React + Vite com integração Supabase.

## Pré-requisitos

- Node.js instalado
- Conta Supabase configurada
- Variáveis de ambiente definidas localmente ou no Vercel

## Instalação local

1. Instale dependências:
   `npm install`
2. Copie o exemplo de ambiente:
   `cp .env.example .env.local`
3. Defina os valores no `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

> Não compartilhe suas chave(s) públicas ou privadas. Arquivos `.env*` já estão ignorados pelo Git.

## Rodando localmente

- Ambiente de desenvolvimento:
  `npm run dev`
- Build de produção:
  `npm run build`
- Visualizar build:
  `npm run preview`

## Deploy no Vercel

Este projeto já está preparado para deploy no Vercel com build estática.

1. Crie um repositório no GitHub e envie este código para ele.
2. Conecte o repositório no Vercel.
3. Defina as variáveis de ambiente no Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Configure o comando de build no Vercel:
   - Build command: `npm run build`
   - Output directory: `dist`

O arquivo `vercel.json` já garante que todas as rotas do SPA sejam redirecionadas para `index.html`.

## Observações

- O projeto usa `@supabase/supabase-js` e Vite.
- Caso precise também de deploy de backend, podemos adicionar rotas serverless separadas.
