# Quiz Jeiel

Quiz bíblico com Next.js, React, Prisma e SQLite. Inclui modo individual, partidas multiplayer via Pusher, autenticação e ranking.

## Requisitos

- Node.js 22 ou superior
- npm
- Credenciais do Pusher para usar o modo multiplayer

## Executar localmente no Ubuntu

```bash
git clone https://github.com/Miranda3000-CPU/quiz-jeiel.git
cd quiz-jeiel
npm install
cp .env.example .env
```

Configure `DATABASE_URL` no arquivo `.env`. Para desenvolvimento local:

```dotenv
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="substitua-por-um-segredo-longo-e-aleatorio"
EMAIL_PEPPER="substitua-por-outro-segredo-aleatorio"
```

Gere o Prisma Client, aplique as migrações e inicie:

```bash
npx prisma generate
npx prisma migrate deploy
npm run dev
```

A aplicação ficará disponível em http://localhost:3000.

## Variáveis para multiplayer

Preencha quando for usar o Pusher:

- `PUSHER_APP_ID`
- `NEXT_PUBLIC_PUSHER_KEY`
- `PUSHER_SECRET`
- `NEXT_PUBLIC_PUSHER_CLUSTER`

Nunca publique o arquivo `.env` nem use os segredos de CI em produção.

## Banco de dados

O banco padrão agora é SQLite. O arquivo local fica em `prisma/dev.db`; o caminho é controlado por `DATABASE_URL`. SQLite grava em disco local, portanto, em produção, mantenha o arquivo em armazenamento persistente e com backup. Não use disco efêmero de ambiente serverless para dados que precisam sobreviver a reinicializações. O banco SQLite também não é compartilhado automaticamente entre várias instâncias da aplicação.

A migração inicial está em `prisma/migrations`. Se já existirem dados no PostgreSQL, esta alteração **não migra registros automaticamente**. Exporte, converta e valide os dados antes de trocar o banco de produção.

## Validação automatizada

O GitHub Actions executa em `ubuntu-latest` a instalação de dependências, geração do Prisma Client, migrações SQLite, ESLint e build de produção em pushes e pull requests.

## Design

A interface usa Soft UI: fundo claro, cartões com sombras suaves, cantos arredondados, campos com efeito inset e acentos violeta/turquesa.
