import { Router } from 'express'
import * as funcionarioController from '../controllers/funcionario.controller.js'
import { autenticar, apenasFuncionario, apenasAdmin, proprioOuAdminFuncionario } from '../middlewares/auth.middleware.js'

const router = Router()

// ==========================================
// ROTA PÚBLICA
// ==========================================

router.post('/funcionarios/login', funcionarioController.login)

// ==========================================
// ROTAS PROTEGIDAS (apenas funcionário)
// ==========================================

// Cadastro de novo funcionário — feito por um funcionário já autenticado
router.post('/funcionarios', autenticar, apenasFuncionario, apenasAdmin, funcionarioController.cadastrar)

router.get('/funcionarios', autenticar, apenasFuncionario, apenasAdmin, funcionarioController.listar)
router.get('/funcionarios/:id', autenticar, apenasFuncionario, proprioOuAdminFuncionario, funcionarioController.buscarPorId)
router.put('/funcionarios/:id', autenticar, apenasFuncionario, proprioOuAdminFuncionario, funcionarioController.atualizar)
router.delete('/funcionarios/:id', autenticar, apenasFuncionario, apenasAdmin, funcionarioController.remover)

export default router
