import { Router } from 'express'

import clienteRoutes from './cliente.routes.js'
import funcionarioRoutes from './funcionario.routes.js'
import servicoRoutes from './servico.routes.js'
import agendamentoCompletoRoutes from './agendamentoCompleto.routes.js'
import genericRoutes from './generic.routes.js'

const router = Router()

// Rotas de cliente (cadastro, login, cadastro pelo funcionário, CRUD)
// Precisam vir ANTES de genericRoutes, senão a rota genérica /:tabela
// captura "/clientes" achando que é um nome de tabela.
router.use('/', clienteRoutes)

// Rotas de funcionário (login, cadastro, CRUD) — mesmo motivo acima.
router.use('/', funcionarioRoutes)

// Rotas específicas de serviços
router.use('/', servicoRoutes)

// Rotas específicas de agendamento completo
// (precisa vir ANTES de genericRoutes, senão a rota genérica /:tabela
// captura "/agendamentos-completo" achando que é um nome de tabela)
router.use('/', agendamentoCompletoRoutes)

// Rotas genéricas da API (CRUD por tabela) — veiculos, servicos,
// tipoVeiculos, tipoServicos, agendamentos, permissoes, etc.
router.use('/', genericRoutes)

export default router
