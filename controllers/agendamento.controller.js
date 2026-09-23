import prisma from '../config/database.js'
import * as agendamentoModel from '../models/agendamento.model.js'

// =====================================================
// HORÁRIOS FIXOS DE FUNCIONAMENTO
// =====================================================

const HORARIOS_BASE = [
  "08:00", "08:30",
  "09:00", "09:30",
  "10:00", "10:30",
  "11:00", "11:30",

  "13:00", "13:30",
  "14:00", "14:30",
  "15:00", "15:30",
  "16:00", "16:30",
  "17:00", "17:30"
]


// =====================================================
// CONVERTE HH:mm PARA MINUTOS
// =====================================================

function paraMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)

  return (h * 60) + m
}


// =====================================================
// CONVERTE MINUTOS PARA HH:mm
// =====================================================

function minutosParaHora(minutos) {
  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60

  return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}


// =====================================================
// CONVERTE DURAÇÃO PARA MINUTOS
// =====================================================

function duracaoParaMinutos(duracaoStr) {

  if (!duracaoStr) {
    return 30
  }

  if (typeof duracaoStr === 'number') {
    return duracaoStr || 30
  }

  if (duracaoStr.includes(':')) {

    const partes = duracaoStr
      .split(':')
      .map(Number)

    const horas = partes[0] || 0
    const minutos = partes[1] || 0

    return (horas * 60) + minutos
  }

  return Number(duracaoStr) || 30
}


// =====================================================
// OBTÉM HORA E MINUTOS DE UM DATE
// =====================================================

function obterHoraMinutos(data) {

  return (
    data.getUTCHours() * 60 +
    data.getUTCMinutes()
  )
}


// =====================================================
// VERIFICA SOBREPOSIÇÃO DE HORÁRIOS
// =====================================================

function existeSobreposicao(
  novoInicio,
  novoFim,
  existenteInicio,
  existenteFim
) {

  return (
    novoInicio < existenteFim &&
    novoFim > existenteInicio
  )
}


// =====================================================
// GET /agendamentos/horarios-disponiveis
//
// Exemplo:
// /agendamentos/horarios-disponiveis?data=2026-09-23&idVeiculo=1
// =====================================================

export const horariosDisponiveis = async (req, res) => {

  try {

    const {
      data,
      idVeiculo
    } = req.query


    if (!data) {

      return res.status(400).json({
        erro: 'Informe a data (YYYY-MM-DD).'
      })

    }


    const inicioDia =
      new Date(`${data}T00:00:00`)


    const fimDia =
      new Date(`${data}T23:59:59`)


    const agendamentosDoDia =
      await agendamentoModel.buscarAgendamentosDoDia(
        inicioDia,
        fimDia
      )


    let veiculo = null


    if (idVeiculo) {

      veiculo =
        await agendamentoModel.buscarVeiculoPorId(
          idVeiculo
        )

    }


    const ocupados = new Set()


    // =================================================
    // ANALISA CADA AGENDAMENTO EXISTENTE
    // =================================================

    for (const ag of agendamentosDoDia) {

      // Ignora agendamentos cancelados
      if (
        ag.statusAgendamento === 'CANCELADO'
      ) {
        continue
      }


      const inicioMin =
        obterHoraMinutos(ag.horario)


      let duracaoTotal = 0


      // ===============================================
      // CALCULA A DURAÇÃO TOTAL
      // ===============================================

      for (const sa of ag.servicos || []) {

        if (veiculo) {

          const tipoServico =
            await agendamentoModel.buscarTipoServico(
              sa.idServico,
              veiculo.idTipoVeiculo
            )


          duracaoTotal +=
            duracaoParaMinutos(
              tipoServico?.duracao
            )

        } else {

          duracaoTotal += 30

        }

      }


      if (!duracaoTotal) {
        duracaoTotal = 30
      }


      const fimMin =
        inicioMin + duracaoTotal


      // ===============================================
      // MARCA OS HORÁRIOS OCUPADOS
      // ===============================================

      HORARIOS_BASE.forEach(horario => {

        const horarioMin =
          paraMinutos(horario)


        /*
         * Verifica se o intervalo de 30 minutos
         * do horário-base possui sobreposição.
         */

        if (
          horarioMin < fimMin &&
          horarioMin + 30 > inicioMin
        ) {

          ocupados.add(horario)

        }

      })

    }


    // =================================================
    // RETORNA SOMENTE OS HORÁRIOS LIVRES
    // =================================================

    const livres =
      HORARIOS_BASE.filter(
        horario => !ocupados.has(horario)
      )


    res.status(200).json({

      data,

      horariosDisponiveis:
        livres

    })


  } catch (error) {

    console.error(
      'Erro ao consultar horários disponíveis:',
      error
    )


    res.status(500).json({
      erro: error.message
    })

  }

}


// =====================================================
// POST /agendamentos
//
// Body:
//
// {
//   "idCliente": 1,
//   "idVeiculo": 2,
//   "idFuncionario": 1,
//   "servicos": [1, 2],
//   "data": "2026-09-23",
//   "horario": "08:00",
//   "obs": "Observação"
// }
// =====================================================

export const criarAgendamento = async (req, res) => {

  try {

    const {
      idCliente,
      idVeiculo,
      idFuncionario,
      servicos,
      servicosIds,
      data,
      horario,
      obs
    } = req.body


    // =================================================
    // ACEITA "servicos" OU "servicosIds"
    // =================================================

    const listaServicos =
      servicos ||
      (
        Array.isArray(servicosIds)
          ? servicosIds
          : servicosIds
            ? [servicosIds]
            : []
      )


    // =================================================
    // VALIDA CAMPOS OBRIGATÓRIOS
    // =================================================

    if (
      !idCliente ||
      !idVeiculo ||
      !data ||
      !horario ||
      listaServicos.length === 0
    ) {

      return res.status(400).json({

        erro:
          'Campos obrigatórios: idCliente, idVeiculo, data, horario, servicos (array de IDs).'

      })

    }


    // =================================================
    // CLIENTE SÓ PODE AGENDAR PARA ELE MESMO
    // =================================================

    if (
      req.usuarioTipo === 'cliente' &&
      req.usuarioId !== Number(idCliente)
    ) {

      return res.status(403).json({
        erro: 'Acesso negado.'
      })

    }


    // =================================================
    // BUSCA O VEÍCULO
    // =================================================

    const veiculo =
      await agendamentoModel.buscarVeiculoPorId(
        idVeiculo
      )


    if (!veiculo) {

      return res.status(404).json({
        erro: 'Veículo não encontrado.'
      })

    }


    // =================================================
    // CLIENTE SÓ PODE USAR SEUS PRÓPRIOS VEÍCULOS
    // =================================================

    if (
      req.usuarioTipo === 'cliente' &&
      veiculo.idCliente !== req.usuarioId
    ) {

      return res.status(403).json({

        erro:
          'Acesso negado. Este veículo não pertence a você.'

      })

    }


    // =================================================
    // VALIDA FORMATO DA DATA
    // =================================================

    const dataRegex =
      /^\d{4}-\d{2}-\d{2}$/


    if (!dataRegex.test(data)) {

      return res.status(400).json({

        erro:
          'Data inválida. Utilize o formato YYYY-MM-DD.'

      })

    }


    // =================================================
    // VALIDA FORMATO DO HORÁRIO
    // =================================================

    const horarioRegex =
      /^\d{2}:\d{2}$/


    if (!horarioRegex.test(horario)) {

      return res.status(400).json({

        erro:
          'Horário inválido. Utilize o formato HH:mm.'

      })

    }


    // =================================================
    // CONVERTE HORÁRIO PARA MINUTOS
    // =================================================

    const horarioMinutos =
      paraMinutos(horario)


    // =================================================
    // VERIFICA SE O HORÁRIO EXISTE NA GRADE
    // =================================================

    const horarioPermitido =
      HORARIOS_BASE.includes(horario)


    if (!horarioPermitido) {

      return res.status(400).json({

        erro:
          'Horário inválido. Escolha um dos horários disponíveis.'

      })

    }


    const dataAgendamento =
      new Date(`${data}T00:00:00`)


    const horarioAgendamento =
      new Date(`1970-01-01T${horario}:00`)


    // =================================================
    // VALIDA SERVIÇOS E CALCULA:
    //
    // - PREÇO TOTAL
    // - DURAÇÃO TOTAL
    // =================================================

    const servicosValidados = []

    let somaTotal = 0

    let duracaoTotal = 0


    for (const idServico of listaServicos) {

      const tipoServicoConfig =
        await prisma.tipoServico.findFirst({

          where: {

            idServico:
              Number(idServico),

            idTipoVeiculo:
              veiculo.idTipoVeiculo

          }

        })


      if (!tipoServicoConfig) {

        return res.status(400).json({

          erro:
            `Serviço ID ${idServico} não está disponível para o tipo de veículo informado.`

        })

      }


      // ===============================================
      // PREÇO
      // ===============================================

      const precoCobrado =
        Number(tipoServicoConfig.preco) || 0


      // ===============================================
      // DURAÇÃO
      // ===============================================

      const duracaoServico =
        duracaoParaMinutos(
          tipoServicoConfig.duracao
        )


      somaTotal +=
        precoCobrado


      duracaoTotal +=
        duracaoServico


      servicosValidados.push({

        idServico:
          Number(idServico),

        precoAplicado:
          precoCobrado

      })

    }


    // =================================================
    // CALCULA INÍCIO E FIM DO NOVO AGENDAMENTO
    // =================================================

    const inicioNovoAgendamento =
      horarioMinutos


    const fimNovoAgendamento =
      inicioNovoAgendamento +
      duracaoTotal


    // =================================================
    // HORÁRIO FINAL DE FUNCIONAMENTO
    //
    // 17:30 é o último horário de início.
    // O funcionamento termina às 18:00.
    // =================================================

    const FIM_EXPEDIENTE =
      18 * 60


    if (
      fimNovoAgendamento >
      FIM_EXPEDIENTE
    ) {

      return res.status(400).json({

        erro:
          'A duração dos serviços ultrapassa o horário de funcionamento. Escolha um horário anterior.'

      })

    }


    // =================================================
    // BUSCA AGENDAMENTOS DO DIA
    // =================================================

    const inicioDia =
      new Date(`${data}T00:00:00`)


    const fimDia =
      new Date(`${data}T23:59:59`)


    const agendamentosDoDia =
      await agendamentoModel.buscarAgendamentosDoDia(
        inicioDia,
        fimDia
      )


    // =================================================
    // VERIFICA CONFLITO DE HORÁRIO
    // =================================================

    for (
      const ag of agendamentosDoDia
    ) {

      // ===============================================
      // CANCELADO NÃO BLOQUEIA HORÁRIO
      // ===============================================

      if (
        ag.statusAgendamento ===
        'CANCELADO'
      ) {

        continue

      }


      // ===============================================
      // INÍCIO DO AGENDAMENTO EXISTENTE
      // ===============================================

      const inicioExistente =
        obterHoraMinutos(
          ag.horario
        )


      // ===============================================
      // DURAÇÃO DO AGENDAMENTO EXISTENTE
      // ===============================================

      let duracaoExistente = 0


      for (
        const servicoAgendamento
        of ag.servicos || []
      ) {

        const tipoServico =
          await agendamentoModel.buscarTipoServico(
            servicoAgendamento.idServico,
            veiculo.idTipoVeiculo
          )


        duracaoExistente +=
          duracaoParaMinutos(
            tipoServico?.duracao
          )

      }


      // Se não conseguir descobrir a duração,
      // considera 30 minutos.
      if (!duracaoExistente) {

        duracaoExistente = 30

      }


      // ===============================================
      // FIM DO AGENDAMENTO EXISTENTE
      // ===============================================

      const fimExistente =
        inicioExistente +
        duracaoExistente


      // ===============================================
      // VERIFICA SOBREPOSIÇÃO
      // ===============================================

      const conflito =
        existeSobreposicao(

          inicioNovoAgendamento,

          fimNovoAgendamento,

          inicioExistente,

          fimExistente

        )


      if (conflito) {

        return res.status(409).json({

          erro:
            `Horário indisponível. Já existe um agendamento entre ${minutosParaHora(inicioExistente)} e ${minutosParaHora(fimExistente)}.`

        })

      }

    }


    // =================================================
    // CRIA O AGENDAMENTO
    // =================================================

    const novoAgendamento =
      await prisma.$transaction(
        async tx => {

          const agendamento =
            await tx.agendamento.create({

              data: {

                idCliente:
                  Number(idCliente),

                idVeiculo:
                  Number(idVeiculo),

                idFuncionario:
                  idFuncionario
                    ? Number(idFuncionario)
                    : null,

                data:
                  dataAgendamento,

                horario:
                  horarioAgendamento,

                statusAgendamento:
                  'AGENDADO',

                obs:
                  obs || null,

                valorTotal:
                  somaTotal,

                servicos: {

                  create:
                    servicosValidados

                }

              },

              include: {

                servicos:
                  true

              }

            })


          return agendamento

        }
      )


    // =================================================
    // RESPOSTA
    // =================================================

    res.status(201).json({

      mensagem:
        'Agendamento criado e calculado com sucesso!',

      duracaoTotal:
        duracaoTotal,

      horarioInicio:
        horario,

      horarioFim:
        minutosParaHora(
          fimNovoAgendamento
        ),

      valorTotal:
        somaTotal,

      novoAgendamento

    })


  } catch (error) {

    console.error(
      'Erro ao criar agendamento:',
      error
    )


    res.status(500).json({

      erro:
        error.message ||
        'Erro interno ao processar o agendamento.'

    })

  }

}


// =====================================================
// PUT /agendamentos/:id/status
// =====================================================

export const alterarStatus = async (req, res) => {

  try {

    const {
      id
    } = req.params


    const {
      statusAgendamento
    } = req.body


    // =================================================
    // STATUS PERMITIDOS
    // =================================================

    const valoresValidos = [

      'AGENDADO',

      'EM_ANDAMENTO',

      'FINALIZADO',

      'CANCELADO'

    ]


    if (
      !valoresValidos.includes(
        statusAgendamento
      )
    ) {

      return res.status(400).json({

        erro:
          `Status inválido. Use um de: ${valoresValidos.join(', ')}`

      })

    }


    // =================================================
    // ATUALIZA STATUS
    // =================================================

    const atualizado =
      await agendamentoModel.atualizarStatus(
        id,
        statusAgendamento
      )


    res.status(200).json({

      mensagem:
        'Status atualizado com sucesso.',

      agendamento:
        atualizado

    })


  } catch (error) {

    res.status(400).json({

      erro:
        error.message

    })

  }

}