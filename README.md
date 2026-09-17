# Stop Clean — API

API REST em Node.js/Express + Prisma para o sistema de agendamento de lava-rápido (clientes, veículos, funcionários, serviços e agendamentos).

## Estrutura do projeto (MVC)

```
.
├── app.js                     # Configuração do Express (middlewares globais, rotas, estáticos)
├── server.js                  # Ponto de entrada: sobe o servidor HTTP
├── config/
│   └── database.js            # Instância única do Prisma Client (com adapter do Postgres)
├── controllers/                # Camada de controle: recebe req/res, valida entrada, chama models
│   ├── auth.controller.js      # Login
│   ├── agendamento.controller.js
│   ├── generic.controller.js   # CRUD genérico por tabela
│   └── servico.controller.js
├── middlewares/
│   └── auth.middleware.js      # Middleware de autenticação (verificação do JWT)
├── models/                     # Camada de dados: única parte que fala com o Prisma/banco
│   ├── usuario.model.js
│   ├── agendamento.model.js
│   └── generic.model.js
├── routes/
│   ├── index.js                # Agregador: monta todas as rotas em um único router
│   ├── auth.routes.js
│   ├── servico.routes.js
│   ├── agendamentoCompleto.routes.js
│   └── generic.routes.js
├── public/
│   └── index.html              # Página estática de documentação da API
├── prisma/
│   └── schema.prisma
└── docs/
    └── instalacao-prisma.txt
```

**Fluxo de uma requisição:** `routes` recebe a rota → aplica `middlewares` (ex.: `autenticar`) → chama o `controller` correspondente → o `controller` chama o `model` → o `model` fala com o Prisma (`config/database.js`) → resposta volta pelo `controller`.

## O que foi ajustado na unificação dos dois projetos

1. **Rota de serviços não estava registrada.** `routes/servico.routes.js` existia mas nunca era importado em `app.js` — a rota `/servicos/tipo-veiculo/:id` estava morta. Agora ela é montada via `routes/index.js`.
2. **Middleware de autenticação separado do controller.** `autenticar` estava dentro de `auth.controller.js`, misturando responsabilidades. Agora vive em `middlewares/auth.middleware.js`, e `auth.controller.js` cuida só do `login`.
3. **Instância duplicada do Prisma Client.** `agendamento.controller.js` e `servico.controller.js` criavam `new PrismaClient()` direto, ignorando a instância única e configurada (com adapter de Postgres/SSL) exportada por `config/database.js`. Agora todos os controllers usam a mesma instância.
4. **Dependência duplicada.** `bcrypt` e `bcryptjs` estavam ambos no `package.json` (sobra da fusão dos dois projetos); o código só usa `bcrypt`, então `bcryptjs` foi removido.
5. **`routes/index.js` criado** como agregador único de rotas, deixando `app.js` mais enxuto (só configuração do Express).
6. **`views/index.html` → `public/index.html`.** Era um HTML estático servido por `express.static`, não uma view de template engine — faz mais sentido em `public/`.
7. Arquivo de instruções do Prisma renomeado de `Instalação Prisma.txt` (nome com caracteres especiais que quebram em alguns sistemas) para `docs/instalacao-prisma.txt`.

## Rodando o projeto

```bash
cp .env.example .env   # preencha DATABASE_URL, JWT_SECRET e PORT
npm install             # sincroniza o lockfile após a remoção do bcryptjs
npx prisma generate
npx prisma db push      # cria as tabelas a partir do schema.prisma
npm run dev              # ou: npm start
```

## Pendências que valem uma próxima revisão

- O `generic.controller.js`/`generic.model.js` implementa um CRUD genérico por nome de tabela recebido na URL (`/:tabela`). Funciona, mas foge um pouco do padrão MVC clássico (um controller por recurso) e mistura regras de negócio específicas (ex.: conflito de horário de agendamento) dentro de um controller genérico. Se quiser, posso separar isso em controllers dedicados por recurso (`cliente.controller.js`, `veiculo.controller.js` etc.) mantendo o roteamento mais explícito.
- Não há testes automatizados no projeto.
