# Quiz Bíblico Moderno (Multiplayer & Ranking)

Este projeto foi migrado para **Next.js** para suportar partidas multiplayer em tempo real e um sistema de ranking global.

## Novas Funcionalidades
- **Modo Multiplayer:** Jogue com amigos em tempo real usando WebSockets (via Pusher).
- **Ranking Global:** Salve suas pontuações em um banco de dados persistente (Neon/PostgreSQL) e veja quem são os melhores.
- **UI Moderna:** Refatorado com React e Tailwind CSS, mantendo o estilo visual dourado original.

## Configuração Local

### Requisitos
- Node.js 18+
- Conta no [Neon.tech](https://neon.tech) (PostgreSQL)
- Conta no [Pusher.com](https://pusher.com) (Channels)

### Instalação
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Configure as variáveis de ambiente:
   - Copie `.env.example` para `.env`.
   - Preencha com suas credenciais do Neon e Pusher.
3. Prepare o banco de dados:
   ```bash
   npx prisma db push
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## Deploy (Vercel)
Este projeto é totalmente compatível com o deploy na Vercel. Lembre-se de configurar as variáveis de ambiente no painel da Vercel.

---

## Como Contribuir
Você pode contribuir adicionando mais perguntas ao arquivo `src/data/bible.json`.

### Formato das Perguntas
```json
{
  "question": "Quem conduziu o povo de Israel à Terra Prometida após a morte de Moisés?",
  "options": [
    { "id": "A", "text": "Calebe" },
    { "id": "B", "text": "Arão" },
    { "id": "C", "text": "Josué" },
    { "id": "D", "text": "Samuel" }
  ],
  "answer": "C",
  "reference": "Josué 1:1-2"
}
```

## Correções e Sugestões
Se encontrar alguma pergunta incorreta, envie um e-mail para jeiel.lima.miranda@gmail.com ou faça um Pull Request.

# Changelog
### Versão 2.0 (Atual)
- Migração completa para Next.js 16 (App Router).
- Implementação de Multiplayer com Pusher.
- Integração de Ranking Global com Neon PostgreSQL.
- Estilização com Tailwind CSS.
