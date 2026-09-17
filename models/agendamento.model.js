import prisma from '../config/database.js'

// ==========================================
// HELPERS DE TEMPO
// ==========================================

// Converte uma duração no formato "HH:MM:SS" (ou "HH:MM") para milissegundos
export const duracaoParaMs = (duracao) => {
  const [h = 0, m = 0, s = 0] = String(duracao).split(':').map(Number)
  return ((h * 60 + m) * 60 + s) * 1000
}

// Extrai o horário (hh:mm:ss) de um Date/Time do Prisma como milissegundos desde a meia-noite (UTC)
export const horarioParaMs = (dataHora) => {
  const d = new Date(dataHora)
  return d.getUTCHours() * 3600000 + d.getUTCMinutes() * 60000 + d.getUTCSeconds() * 1000
}

// ==========================================
// CONSULTAS
// ==========================================

export const buscarVeiculoPorId = async (id) => {
  return await prisma.veiculo.findUnique({ where: { id: Number(id) } })
}

export const buscarAgendamentoPorId = async (id) => {
  return await prisma.agendamento.findUnique({ where: { id: Number(id) } })
}

// Busca o preço/duração de um serviço para um tipo de veículo específico
// (a precificação e a duração variam conforme o tipo de veículo)
export const buscarTipoServico = async (idServico, idTipoVeiculo) => {
  return await prisma.tipoServico.findFirst({
    where: { idServico: Number(idServico), idTipoVeiculo: Number(idTipoVeiculo) }
  })
}

export const buscarServicosVinculados = async (idAgendamento) => {
  return await prisma.servicoAgendamento.findMany({
    where: { idAgendamento: Number(idAgendamento) }
  })
}

export const buscarAgendamentosDoDia = async (inicioDia, fimDia) => {
  return await prisma.agendamento.findMany({
    where: {
      data: { gte: inicioDia, lte: fimDia },
      statusAgendamento: { not: 'CANCELADO' }
    },
    include: { servicos: true }
  })
}

// ==========================================
// REGRAS DE CONFLITO DE HORÁRIO
// ==========================================

// Verifica se já existe um agendamento ativo na mesma data/horário (duplicidade exata)
export const buscarConflitoExato = async (data, horario, ignorarId = null) => {
  return await prisma.agendamento.findFirst({
    where: {
      data,
      horario,
      statusAgendamento: { not: 'CANCELADO' },
      ...(ignorarId ? { id: { not: Number(ignorarId) } } : {})
    }
  })
}

// Soma a duração de todos os serviços já vinculados a um agendamento
// e retorna o intervalo (início/fim em ms) que ele ocupa na agenda do dia
export const calcularIntervaloOcupado = async (agendamento) => {
  const veiculo = await buscarVeiculoPorId(agendamento.idVeiculo)
  const vinculados = await buscarServicosVinculados(agendamento.id)

  let duracaoTotalMs = 0
  for (const vinculo of vinculados) {
    const tipoServico = await buscarTipoServico(vinculo.idServico, veiculo.idTipoVeiculo)
    if (tipoServico) duracaoTotalMs += duracaoParaMs(tipoServico.duracao)
  }

  const inicio = horarioParaMs(agendamento.horario)
  return { inicio, fim: inicio + duracaoTotalMs }
}

// Verifica se um intervalo [inicioNovo, fimNovoTotal) no mesmo dia do `agendamento`
// se sobrepõe a algum outro agendamento ativo (usado ao vincular um novo serviço)
export const existeSobreposicao = async (agendamento, inicioNovo, fimNovoTotal) => {
  const outros = await prisma.agendamento.findMany({
    where: {
      data: agendamento.data,
      statusAgendamento: { not: 'CANCELADO' },
      id: { not: agendamento.id }
    }
  })

  for (const outro of outros) {
    const { inicio: inicioOutro, fim: fimOutro } = await calcularIntervaloOcupado(outro)
    if (inicioNovo < fimOutro && fimNovoTotal > inicioOutro) return true
  }
  return false
}

// ==========================================
// ESCRITA
// ==========================================

export const criarAgendamentoCompleto = async (dados) => {
  return await prisma.agendamento.create({
    data: dados,
    include: { servicos: true }
  })
}

export const atualizarStatus = async (id, statusAgendamento) => {
  return await prisma.agendamento.update({
    where: { id: Number(id) },
    data: { statusAgendamento }
  })
}
