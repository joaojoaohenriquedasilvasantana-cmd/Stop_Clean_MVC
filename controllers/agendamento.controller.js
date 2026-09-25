import prisma from '../config/database.js'
import * as agendamentoModel from '../models/agendamento.model.js'

// =====================================================
// HORÁRIOS DE FUNCIONAMENTO
// =====================================================

const HORARIOS_BASE = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",

  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30"
]


// =====================================================
// CONVERTE HH:mm PARA MINUTOS
// =====================================================

function paraMinutos(horario) {

  const [horas, minutos] =
    horario.split(':').map(Number)

  return (horas * 60) + minutos
}


// =====================================================
// CONVERTE MINUTOS PARA HH:mm
// =====================================================

function minutosParaHora(minutos) {

  const horas =
    Math.floor(minutos / 60)

  const mins =
    minutos % 60

  return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}


// =====================================================
// CONVERTE DURAÇÃO PARA MINUTOS
// =====================================================

function duracaoParaMinutos(duracao) {

  if (duracao === null || duracao === undefined) {
    return 30
  }


  // Se já for número
  if (typeof duracao === 'number') {
    return duracao || 30
  }


  // Se for Date
  if (duracao instanceof Date) {

    return (
      duracao.getUTCHours() * 60 +
      duracao.getUTCMinutes()
    )

  }


  const valor =
    String(duracao)


  // HH:mm:ss ou HH:mm
  if (valor.includes(':')) {

    const partes =
      valor.split(':').map(Number)

    const horas =
      partes[0] || 0

    const minutos =
      partes[1] || 0

    return (
      (horas * 60) +
      minutos
    )
  }


  return Number(valor) || 30
}


// =====================================================
// OBTÉM O HORÁRIO DO BANCO EM MINUTOS
//
// IMPORTANTE:
// usamos UTC porque o horário do agendamento é salvo
// como um horário "neutro", sem conversão de fuso.
// =====================================================

function horarioBancoParaMinutos(horario) {

  if (!horario) {
    return 0
  }


  if (horario instanceof Date) {

    return (
      horario.getUTCHours() * 60 +
      horario.getUTCMinutes()
    )

  }


  // Caso venha como string
  if (typeof horario === 'string') {

    // Exemplo:
    // "08:00:00"
    // "08:00"

    const somenteHorario =
      horario.substring(0, 5)

    return paraMinutos(
      somenteHorario
    )
  }


  return 0
}


// =====================================================
// CRIA DATA DO AGENDAMENTO SEM ALTERAÇÃO DE FUSO
// =====================================================

function criarDataUTC(data) {

  return new Date(
    `${data}T00:00:00.000Z`
  )
}


// =====================================================
// CRIA HORÁRIO DO AGENDAMENTO SEM ALTERAÇÃO DE FUSO
// =====================================================
//
// 08:00 -> 08:00 UTC
// 10:30 -> 10:30 UTC
//
// Não usar:
// new Date("1970-01-01T08:00:00")
// =====================================================

function criarHorarioUTC(horario) {

  return new Date(
    `1970-01-01T${horario}:00.000Z`
  )
}


// =====================================================
// VERIFICA SOBREPOSIÇÃO
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
// GET
// /agendamentos/horarios-disponiveis
//
// ?data=2026-09-23&idVeiculo=1
// =====================================================

export const horariosDisponiveis = async (req, res) => {

  try {

    const {
      data,
      idVeiculo
    } = req.query


    // =================================================
    // VALIDA DATA
    // =================================================

    if (!data) {

      return res.status(400).json({

        erro:
          'Informe a data (YYYY-MM-DD).'

      })

    }


    // =================================================
    // DATAS DO DIA EM UTC
    // =================================================

    const inicioDia =
      criarDataUTC(data)


    const proximoDia =
      new Date(inicioDia)


    proximoDia.setUTCDate(
      proximoDia.getUTCDate() + 1
    )


    // =================================================
    // BUSCA AGENDAMENTOS DO DIA
    // =================================================

    const agendamentosDoDia =
      await agendamentoModel.buscarAgendamentosDoDia(
        inicioDia,
        proximoDia
      )


    // =================================================
    // BUSCA VEÍCULO
    // =================================================

    let veiculo = null


    if (idVeiculo) {

      veiculo =
        await agendamentoModel.buscarVeiculoPorId(
          idVeiculo
        )

    }


    // =================================================
    // HORÁRIOS OCUPADOS
    // =================================================

    const ocupados =
      new Set()


    // =================================================
    // ANALISA AGENDAMENTOS
    // =================================================

    for (
      const ag of agendamentosDoDia
    ) {

      // Cancelado não ocupa horário
      if (
        ag.statusAgendamento ===
        'CANCELADO'
      ) {

        continue

      }


      const inicioMin =
        horarioBancoParaMinutos(
          ag.horario
        )


      let duracaoTotal = 0


      // =================================================
      // CALCULA DURAÇÃO DOS SERVIÇOS
      // =================================================

      for (
        const servicoAgendamento
        of ag.servicos || []
      ) {

        if (veiculo) {

          const tipoServico =
            await agendamentoModel.buscarTipoServico(
              servicoAgendamento.idServico,
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
        inicioMin +
        duracaoTotal


      // =================================================
      // MARCA HORÁRIOS SOBREPOSTOS
      // =================================================

      for (
        const horarioBase
        of HORARIOS_BASE
      ) {

        const inicioHorario =
          paraMinutos(
            horarioBase
          )


        const fimHorario =
          inicioHorario + 30


        if (
          existeSobreposicao(
            inicioHorario,
            fimHorario,
            inicioMin,
            fimMin
          )
        ) {

          ocupados.add(
            horarioBase
          )

        }

      }

    }


    // =================================================
    // RETORNA HORÁRIOS LIVRES
    // =================================================

    const livres =
      HORARIOS_BASE.filter(
        horario =>
          !ocupados.has(horario)
      )


    return res.status(200).json({

      data,

      horariosDisponiveis:
        livres

    })


  } catch (error) {

    console.error(
      'Erro ao consultar horários disponíveis:',
      error
    )


    return res.status(500).json({

      erro:
        error.message

    })

  }

}



// =====================================================
// GET /agendamentos
// Lista agendamentos com os relacionamentos necessários
// para o painel do funcionário.
// =====================================================
export const listar = async (req, res) => {
  try {
    const { q, status, dataInicio, dataFim } = req.query

    const filtro = req.usuarioTipo === 'cliente'
      ? { idCliente: req.usuarioId }
      : {}

    if (status && ['AGENDADO', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO'].includes(status)) {
      filtro.statusAgendamento = status
    }

    if (dataInicio || dataFim) {
      filtro.data = {}
      if (dataInicio) filtro.data.gte = new Date(`${dataInicio}T00:00:00.000Z`)
      if (dataFim) {
        const fim = new Date(`${dataFim}T00:00:00.000Z`)
        fim.setUTCDate(fim.getUTCDate() + 1)
        filtro.data.lt = fim
      }
    }

    if (q && q.trim()) {
      const termo = q.trim()
      filtro.AND = [
        {
          OR: [
            { cliente: { nome: { contains: termo, mode: 'insensitive' } } },
            { cliente: { telefone: { contains: termo, mode: 'insensitive' } } },
            { veiculo: { placa: { contains: termo, mode: 'insensitive' } } },
            { veiculo: { marca: { contains: termo, mode: 'insensitive' } } },
            { veiculo: { modelo: { contains: termo, mode: 'insensitive' } } },
            { servicos: { some: { servico: { nome: { contains: termo, mode: 'insensitive' } } } } }
          ]
        }
      ]
    }

    const agendamentos = await prisma.agendamento.findMany({
      where: filtro,
      orderBy: [
        { data: 'asc' },
        { horario: 'asc' }
      ],
      include: {
        cliente: true,
        veiculo: {
          include: { tipoVeiculo: true }
        },
        funcionario: true,
        servicos: {
          include: { servico: true }
        }
      }
    })

    const resultado = agendamentos.map(ag => ({
      ...ag,
      cliente: ag.cliente ? { id: ag.cliente.id, nome: ag.cliente.nome, cpf: ag.cliente.cpf, telefone: ag.cliente.telefone } : null,
      funcionario: ag.funcionario ? { id: ag.funcionario.id, nome: ag.funcionario.nome } : null,
      servicos: ag.servicos.map(s => ({
        id: s.id,
        idServico: s.idServico,
        precoAplicado: s.precoAplicado,
        servico: s.servico
      }))
    }))

    return res.status(200).json(resultado)
  } catch (error) {
    console.error('Erro ao listar agendamentos:', error)
    return res.status(500).json({ erro: error.message })
  }
}

// =====================================================
// POST /agendamentos
// =====================================================

export const criarAgendamento = async (
  req,
  res
) => {

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
    // ACEITA servicos OU servicosIds
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
    // VALIDA CAMPOS
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
    // VALIDA CLIENTE
    // =================================================

    if (
      req.usuarioTipo === 'cliente' &&
      req.usuarioId !== Number(idCliente)
    ) {

      return res.status(403).json({

        erro:
          'Acesso negado.'

      })

    }


    // =================================================
    // BUSCA VEÍCULO
    // =================================================

    const veiculo =
      await agendamentoModel.buscarVeiculoPorId(
        idVeiculo
      )


    if (!veiculo) {

      return res.status(404).json({

        erro:
          'Veículo não encontrado.'

      })

    }


    // =================================================
    // CLIENTE SÓ PODE USAR SEU VEÍCULO
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
    // VALIDA DATA
    // =================================================

    const dataRegex =
      /^\d{4}-\d{2}-\d{2}$/


    if (
      !dataRegex.test(data)
    ) {

      return res.status(400).json({

        erro:
          'Data inválida. Utilize o formato YYYY-MM-DD.'

      })

    }


    // =================================================
    // VALIDA HORÁRIO
    // =================================================

    const horarioRegex =
      /^\d{2}:\d{2}$/


    if (
      !horarioRegex.test(horario)
    ) {

      return res.status(400).json({

        erro:
          'Horário inválido. Utilize o formato HH:mm.'

      })

    }


    // =================================================
    // VERIFICA SE HORÁRIO EXISTE NA GRADE
    // =================================================

    if (
      !HORARIOS_BASE.includes(horario)
    ) {

      return res.status(400).json({

        erro:
          'Horário inválido. Escolha um dos horários disponíveis.'

      })

    }


    const horarioInicioMin =
      paraMinutos(horario)


    // =================================================
    // DATA E HORÁRIO
    //
    // CORREÇÃO DO FUSO HORÁRIO
    // =================================================

    const dataAgendamento =
      criarDataUTC(data)


    const horarioAgendamento =
      criarHorarioUTC(horario)


    // =================================================
    // VALIDA SERVIÇOS
    // =================================================

    const servicosValidados = []


    let somaTotal = 0


    let duracaoTotal = 0


    // =================================================
    // BUSCA CONFIGURAÇÃO DOS SERVIÇOS
    // =================================================

    for (
      const idServico
      of listaServicos
    ) {

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


      // =================================================
      // PREÇO
      // =================================================

      const precoCobrado =
        Number(
          tipoServicoConfig.preco
        ) || 0


      // =================================================
      // DURAÇÃO
      // =================================================

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
    // FIM DO NOVO AGENDAMENTO
    // =================================================

    const horarioFimMin =
      horarioInicioMin +
      duracaoTotal


    // =================================================
    // LIMITE DO EXPEDIENTE
    // =================================================

    const FIM_EXPEDIENTE =
      18 * 60


    if (
      horarioFimMin >
      FIM_EXPEDIENTE
    ) {

      return res.status(400).json({

        erro:
          'A duração dos serviços ultrapassa o horário de funcionamento. Escolha um horário anterior.'

      })

    }


    // =================================================
    // BUSCA AGENDAMENTOS DA MESMA DATA
    // =================================================

    const inicioDia =
      criarDataUTC(data)


    const proximoDia =
      new Date(inicioDia)


    proximoDia.setUTCDate(
      proximoDia.getUTCDate() + 1
    )


    const agendamentosDoDia =
      await agendamentoModel.buscarAgendamentosDoDia(
        inicioDia,
        proximoDia
      )


    // =================================================
    // VERIFICA CONFLITOS
    // =================================================

    for (
      const ag
      of agendamentosDoDia
    ) {

      // Cancelado não bloqueia horário
      if (
        ag.statusAgendamento ===
        'CANCELADO'
      ) {

        continue

      }


      const inicioExistente =
        horarioBancoParaMinutos(
          ag.horario
        )


      let duracaoExistente = 0


      // =================================================
      // CALCULA DURAÇÃO DO AGENDAMENTO EXISTENTE
      // =================================================

      for (
        const servicoAgendamento
        of ag.servicos || []
      ) {

        /*
         * Aqui usamos o tipo do veículo que pertence
         * ao próprio agendamento quando disponível.
         *
         * Caso não esteja disponível, usamos o veículo
         * que está sendo agendado.
         */

        const tipoVeiculo =
          ag.veiculo?.idTipoVeiculo ??
          veiculo.idTipoVeiculo


        const tipoServico =
          await agendamentoModel.buscarTipoServico(
            servicoAgendamento.idServico,
            tipoVeiculo
          )


        duracaoExistente +=
          duracaoParaMinutos(
            tipoServico?.duracao
          )

      }


      if (!duracaoExistente) {

        duracaoExistente = 30

      }


      const fimExistente =
        inicioExistente +
        duracaoExistente


      // =================================================
      // VERIFICA SOBREPOSIÇÃO
      // =================================================

      const conflito =
        existeSobreposicao(

          horarioInicioMin,

          horarioFimMin,

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
    //
    // A verificação acima evita duplicidade no fluxo
    // normal. A transação mantém a criação atômica.
    // =================================================

    const novoAgendamento =
      await prisma.$transaction(
        async tx => {

          // =============================================
          // SEGUNDA VERIFICAÇÃO DENTRO DA TRANSAÇÃO
          //
          // Isso protege contra duas requisições chegando
          // praticamente ao mesmo tempo.
          // =============================================

          const agendamentosNovamente =
            await tx.agendamento.findMany({

              where: {

                data: {

                  gte:
                    inicioDia,

                  lt:
                    proximoDia

                },

                statusAgendamento: {

                  in: [
                    'AGENDADO',
                    'EM_ANDAMENTO'
                  ]

                }

              },

              include: {

                servicos: true

              }

            })


          // =============================================
          // VERIFICA DUPLICIDADE/CONFLITO NOVAMENTE
          // =============================================

          for (
            const ag
            of agendamentosNovamente
          ) {

            const inicioExistente =
              horarioBancoParaMinutos(
                ag.horario
              )


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


            if (!duracaoExistente) {

              duracaoExistente = 30

            }


            const fimExistente =
              inicioExistente +
              duracaoExistente


            if (
              existeSobreposicao(

                horarioInicioMin,

                horarioFimMin,

                inicioExistente,

                fimExistente

              )
            ) {

              const erro =
                new Error(
                  `Horário indisponível. Já existe um agendamento entre ${minutosParaHora(inicioExistente)} e ${minutosParaHora(fimExistente)}.`
                )


              erro.statusCode = 409


              throw erro

            }

          }


          // =============================================
          // CRIA AGENDAMENTO
          // =============================================

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

    return res.status(201).json({

      mensagem:
        'Agendamento criado com sucesso!',

      duracaoTotal:
        duracaoTotal,

      horarioInicio:
        horario,

      horarioFim:
        minutosParaHora(
          horarioFimMin
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


    // =================================================
    // ERRO DE CONFLITO
    // =================================================

    if (
      error.statusCode === 409
    ) {

      return res.status(409).json({

        erro:
          error.message

      })

    }


    return res.status(500).json({

      erro:
        error.message ||
        'Erro interno ao processar o agendamento.'

    })

  }

}


// =====================================================
// PUT /agendamentos/:id/status
// =====================================================

export const alterarStatus = async (
  req,
  res
) => {

  try {

    const {
      id
    } = req.params


    const {
      statusAgendamento
    } = req.body


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


    const agendamentoExistente = await agendamentoModel.buscarAgendamentoPorId(id)

    if (!agendamentoExistente) {
      return res.status(404).json({ erro: 'Agendamento não encontrado.' })
    }

    // Cancelamento: cliente só pode cancelar o próprio agendamento;
    // funcionário autenticado pode cancelar qualquer agendamento ainda AGENDADO.
    if (statusAgendamento === 'CANCELADO') {
      if (agendamentoExistente.statusAgendamento !== 'AGENDADO') {
        return res.status(409).json({
          erro: 'Somente agendamentos com status AGENDADO podem ser cancelados.'
        })
      }

      if (req.usuarioTipo === 'cliente' && Number(agendamentoExistente.idCliente) !== Number(req.usuarioId)) {
        return res.status(403).json({ erro: 'Você só pode cancelar seus próprios agendamentos.' })
      }

      if (!['cliente', 'funcionario'].includes(req.usuarioTipo)) {
        return res.status(403).json({ erro: 'Você não tem permissão para cancelar agendamentos.' })
      }
    } else {
      // Mudanças operacionais (iniciar/finalizar) são exclusivas da equipe.
      if (req.usuarioTipo !== 'funcionario') {
        return res.status(403).json({ erro: 'Somente funcionários podem alterar o status para iniciar ou finalizar.' })
      }
    }

    const atualizado = await agendamentoModel.atualizarStatus(id, statusAgendamento)


    return res.status(200).json({

      mensagem:
        'Status atualizado com sucesso.',

      agendamento:
        atualizado

    })


  } catch (error) {

    return res.status(400).json({

      erro:
        error.message

    })

  }

}