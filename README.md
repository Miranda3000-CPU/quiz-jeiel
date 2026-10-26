# Quiz Jeiel

Quiz bíblico construído com Next.js e React, com partidas individuais e interface Soft UI. **Não utiliza banco de dados, cadastro de usuários ou ranking persistente.**

## Requisitos

- Node.js 22 ou superior
- npm

## Executar no Ubuntu

```bash
git clone https://github.com/Miranda3000-CPU/quiz-jeiel.git
cd quiz-jeiel
npm install
npm run dev
```

Abra http://localhost:3000.

## Modo de jogo

- O jogo funciona somente no modo solo.
- Cada partida seleciona 15 perguntas aleatórias do conjunto disponível.
- O jogador escolhe um limite de tempo total para a partida.
- A avaliação e as referências para estudo são exibidas no resultado final.
- O resultado pode ser compartilhado como card vertical 9:16.
- Não há salas, sincronização entre jogadores, contas ou histórico de partidas.

## Dados e privacidade

- Não há PostgreSQL, SQLite, Prisma ou outro banco de dados.
- Não há cadastro, login, contas ou ranking global.
- A pontuação individual existe somente durante a partida atual; ao sair ou recarregar, ela é perdida.
- Vercel Analytics e Speed Insights medem tráfego e desempenho. Remova os componentes correspondentes do layout se não quiser essas métricas.

## Validação automatizada

O GitHub Actions executa no Ubuntu a instalação de dependências, ESLint e build de produção do Next.js em pushes e pull requests.

## Interface

A interface utiliza Soft UI: cartões arredondados, sombras suaves, campos com efeito interno e acentos de cor.
