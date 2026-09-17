import { Router } from 'express'
import { autenticar } from '../middlewares/auth.middleware.js'
import * as servicoController from '../controllers/servico.controller.js'

const router = Router()

router.get('/servicos/tipo-veiculo/:idTipoVeiculo', autenticar, servicoController.listarServicosPorTipoVeiculo)

export default router