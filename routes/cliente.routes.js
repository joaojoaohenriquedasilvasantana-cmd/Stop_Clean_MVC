import { Router } from 'express'
import * as clienteController from '../controllers/cliente.controller.js'
import { autenticar, apenasFuncionario } from '../middlewares/auth.middleware.js'

const router = Router()

// ==========================================
// ROTAS PÚBLICAS
// ==========================================

router.get('/clientes/verificar-cpf/:cpf', clienteController.verificarCpf)
router.post('/clientes/cadastro', clienteController.cadastrar)
router.post('/clientes/login', clienteController.login)

// ==========================================
// ROTAS PROTEGIDAS
// ==========================================

// Cadastro de cliente feito pelo funcionário (apenas cpf + telefone)
router.post('/clientes/cadastro-funcionario', autenticar, apenasFuncionario, clienteController.cadastrarPorFuncionario)

// Lista todos os clientes — apenas funcionário
router.get('/clientes', autenticar, apenasFuncionario, clienteController.listar)

// Busca/atualiza um cliente — funcionário: qualquer um | cliente: apenas o próprio
router.get('/clientes/:id', autenticar, clienteController.buscarPorId)
router.put('/clientes/:id', autenticar, clienteController.atualizar)

// Remove cliente — apenas funcionário
router.delete('/clientes/:id', autenticar, apenasFuncionario, clienteController.remover)

export default router
