# Quiz Jeiel

Quiz bíblico construído com Next.js e React, com modo individual, partidas multiplayer em tempo real e interface Soft UI. **Não utiliza banco de dados, cadastro de usuários ou ranking persistente.**

## Requisitos

- Node.js 22 ou superior
- npm
- Credenciais do Pusher para habilitar o modo multiplayer

## Executar no Ubuntu

```bash
git clone https://github.com/Miranda3000-CPU/quiz-jeiel.git
cd quiz-jeiel
npm install
cp .env.example .env.local
npm run dev
```

Abra http://localhost:3000.

## Multiplayer

O modo multiplayer usa Pusher Channels para sincronizar jogadores e eventos enquanto a sala está ativa. É um serviço externo de comunicação em tempo real, não um banco de dados do aplicativo. A aplicação não mantém contas ou histórico de partidas.

Configure as seguintes variáveis em `.env.local` e também no ambiente de implantação:

- `PUSHER_APP_ID`
- `NEXT_PUBLIC_PUSHER_KEY`
- `PUSHER_SECRET`
- `NEXT_PUBLIC_PUSHER_CLUSTER`

Nunca publique as credenciais. Sem as variáveis do Pusher, o modo individual continua disponível, mas o multiplayer não funcionará.

## Dados e privacidade

- Não há PostgreSQL, SQLite, Prisma ou outro banco de dados.
- Não há cadastro, login, contas ou ranking global.
- A pontuação individual existe somente durante a partida atual; ao sair ou recarregar, ela é perdida.
- O estado da sala multiplayer é temporário e depende do serviço Pusher.
- Vercel Analytics e Speed Insights são componentes opcionais de medição de tráfego e desempenho; podem ser removidos do layout se não quiser métricas.

## Validação automatizada

O GitHub Actions executa no Ubuntu a instalação de dependências, ESLint e build de produção do Next.js em pushes e pull requests.

## Interface

A interface utiliza Soft UI: cartões arredondados, sombras suaves, campos com efeito interno e acentos de cor.
