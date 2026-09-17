import prisma from '../config/database.js'
import * as agendamentoModel from '../models/agendamento.model.js'

// Horários fixos de funcionamento
const HORARIOS_BASE = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
]

function paraMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function duracaoParaMinutos(duracaoStr) {
  if (!duracaoStr) return 30
  if (duracaoStr.includes(':')) {
    const [h, m] = duracaoStr.split(':').map(Number)
    return (h * 60) + (m || 0)
  }
  return Number(duracaoStr) || 30
}

// GET /agendamentos/horarios-disponiveis?data=YYYY-MM-DD&idVeiculo=1
export const horariosDisponiveis = async (req, res) => {
  try {
    const { data, idVeiculo } = req.query
    if (!data) return res.status(400).json({ erro: 'Informe a data (YYYY-MM-DD).' })

    const inicioDia = new Date(`${data}T00:00:00`)
    const fimDia = new Date(`${data}T23:59:59`)

    const agendamentosDoDia = await agendamentoModel.buscarAgendamentosDoDia(inicioDia, fimDia)

    let veiculo = null
    if (idVeiculo) {
      veiculo = await agendamentoModel.buscarVeiculoPorId(idVeiculo)
    }

    const ocupados = new Set()

    for (const ag of agendamentosDoDia) {
      const inicioMin = ag.horario.getUTCHours() * 60 + ag.horario.getUTCMinutes()

      let duracaoTotal = 0
      for (const sa of ag.servicos) {
        if (veiculo) {
          const tipoServico = await agendamentoModel.buscarTipoServico(sa.idServico, veiculo.idTipoVeiculo)
          duracaoTotal += duracaoParaMinutos(tipoServico?.duracao)
        } else {
          duracaoTotal += 30
        }
      }

      const fimMin = inicioMin + (duracaoTotal || 30)

      HORARIOS_BASE.forEach(h => {
        const min = paraMinutos(h)
        if (min >= inicioMin && min < fimMin) ocupados.add(h)
      })
    }

    const livres = HORARIOS_BASE.filter(h => !ocupados.has(h))
    res.status(200).json({ data, horariosDisponiveis: livres })
  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
}

// POST /agendamentos
// Body: { idCliente, idVeiculo, idFuncionario?, servicos: [idServico, ...], data, horario, obs? }
export const criarAgendamento = async (req, res) => {
  try {
    const { idCliente, idVeiculo, idFuncionario, servicos, servicosIds, data, horario, obs } = req.body

    // Aceita tanto a chave 'servicos' quanto 'servicosIds'
    const listaServicos = servicos || (Array.isArray(servicosIds) ? servicosIds : servicosIds ? [servicosIds] : [])

    if (!idCliente || !idVeiculo || !data || !horario || listaServicos.length === 0) {
      return res.status(400).json({
        erro: 'Campos obrigatórios: idCliente, idVeiculo, data, horario, servicos (array de IDs).'
      })
    }

    // Regra de acesso: cliente só pode agendar para ele mesmo
    if (req.usuarioTipo === 'cliente' && req.usuarioId !== Number(idCliente)) {
      return res.status(403).json({ erro: 'Acesso negado.' })
    }

    const veiculo = await agendamentoModel.buscarVeiculoPorId(idVeiculo)
    if (!veiculo) return res.status(404).json({ erro: 'Veículo não encontrado.' })

    if (req.usuarioTipo === 'cliente' && veiculo.idCliente !== req.usuarioId) {
      return res.status(403).json({ erro: 'Acesso negado. Este veículo não pertence a você.' })
    }

    const dataAgendamento = new Date(`${data}T00:00:00`)
    const horarioAgendamento = new Date(`1970-01-01T${horario}:00`)

    // Verifica conflito exato de horário
    const conflito = await agendamentoModel.buscarConflitoExato(dataAgendamento, horarioAgendamento)
    if (conflito) {
      return res.status(409).json({
        erro: 'Existe um agendamento nesse horário, escolha outro.'
      })
    }

    // Transação garantindo integridade e cálculo do valor total por tipo de veículo
    const novoAgendamento = await prisma.$transaction(async (tx) => {
      let somaTotal = 0
      const servicosValidados = []

      for (const idServico of listaServicos) {
        const tipoServicoConfig = await tx.tipoServico.findFirst({
          where: {
            idServico: Number(idServico),
            idTipoVeiculo: veiculo.idTipoVeiculo
          }
        })

        if (!tipoServicoConfig) {
          throw new Error(`Serviço ID ${idServico} não está disponível para o tipo de veículo informado.`)
        }

        const precoCobrado = Number(tipoServicoConfig.preco) || 0
        somaTotal += precoCobrado

        servicosValidados.push({
          idServico: Number(idServico),
          precoAplicado: precoCobrado
        })
      }

      const agendamento = await tx.agendamento.create({
        data: {
          idCliente: Number(idCliente),
          idVeiculo: Number(idVeiculo),
          idFuncionario: idFuncionario ? Number(idFuncionario) : null,
          data: dataAgendamento,
          horario: horarioAgendamento,
          statusAgendamento: 'AGENDADO',
          obs: obs || null,
          valorTotal: somaTotal,
          servicos: {
            create: servicosValidados
          }
        },
        include: {
          servicos: true
        }
      })

      return agendamento
    })

    res.status(201).json({
      mensagem: 'Agendamento criado e calculado com sucesso!',
      novoAgendamento
    })

  } catch (error) {
    console.error('Erro ao criar agendamento:', error)
    res.status(500).json({ erro: error.message || 'Erro interno ao processar o agendamento.' })
  }
}

// PUT /agendamentos/:id/status
export const alterarStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { statusAgendamento } = req.body

    const valoresValidos = ['AGENDADO', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO']
    if (!valoresValidos.includes(statusAgendamento)) {
      return res.status(400).json({ erro: `Status inválido. Use um de: ${valoresValidos.join(', ')}` })
    }

    const atualizado = await agendamentoModel.atualizarStatus(id, statusAgendamento)
    res.status(200).json({ mensagem: 'Status atualizado com sucesso.', agendamento: atualizado })
  } catch (error) {
    res.status(400).json({ erro: error.message })
  }
}