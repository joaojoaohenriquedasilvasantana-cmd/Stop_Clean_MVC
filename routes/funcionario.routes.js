import { Router } from 'express'
import * as funcionarioController from '../controllers/funcionario.controller.js'
import { autenticar, apenasFuncionario } from '../middlewares/auth.middleware.js'

const router = Router()

// ==========================================
// ROTA PÚBLICA
// ==========================================

router.post('/funcionarios/login', funcionarioController.login)

// ==========================================
// ROTAS PROTEGIDAS (apenas funcionário)
// ==========================================

// Cadastro de novo funcionário — feito por um funcionário já autenticado
router.post('/funcionarios', autenticar, apenasFuncionario, funcionarioController.cadastrar)

router.get('/funcionarios', autenticar, apenasFuncionario, funcionarioController.listar)
router.get('/funcionarios/:id', autenticar, apenasFuncionario, funcionarioController.buscarPorId)
router.put('/funcionarios/:id', autenticar, apenasFuncionario, funcionarioController.atualizar)
router.delete('/funcionarios/:id', autenticar, apenasFuncionario, funcionarioController.remover)

export default router
