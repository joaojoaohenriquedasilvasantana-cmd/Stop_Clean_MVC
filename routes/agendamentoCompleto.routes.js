import { Router } from 'express'
import { autenticar } from '../middlewares/auth.middleware.js'
import * as agendamentoController from '../controllers/agendamento.controller.js'

const router = Router()

router.get('/agendamentos/horarios-disponiveis', autenticar, agendamentoController.horariosDisponiveis)
router.post('/agendamentos', autenticar, agendamentoController.criarAgendamento)
router.put('/agendamentos/:id/status', autenticar, agendamentoController.alterarStatus)

export default router