import { Router } from 'express'
import * as controller from '../controllers/generic.controller.js'
import { autenticar } from '../middlewares/auth.middleware.js'

const router = Router()

// ==========================================
// ROTAS GENÉRICAS (CRUD por tabela)
// ==========================================
// "clientes" e "funcionarios" NÃO passam mais por aqui — eles têm rotas
// próprias em cliente.routes.js e funcionario.routes.js, com as regras
// específicas de cadastro, CPF, senha e permissões.
//
// Seguem por aqui: veiculos, servicos, tipoVeiculos, tipoServicos,
// agendamentos (CRUD genérico — a criação especializada com cálculo de
// valor fica em agendamentoCompleto.routes.js), permissoes,
// funcionarioPermissoes e servicoAgendamentos.

router.post('/:tabela', autenticar, controller.criar)
router.get('/:tabela', autenticar, controller.listar)
router.get('/:tabela/:id', autenticar, controller.listar)
router.put('/:tabela/:id', autenticar, controller.atualizar)
router.delete('/:tabela/:id', autenticar, controller.remover)

export default router
