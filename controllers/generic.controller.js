import * as genericModel from '../models/generic.model.js'
import * as agendamentoModel from '../models/agendamento.model.js'

// Tabelas cujo acesso do cliente é restrito ao próprio registro
// (veiculo por idCliente, agendamento por idCliente)
const restringivelPorCliente = {
  veiculo: 'idCliente',
  agendamento: 'idCliente'
}

export const listar = async (req, res) => {
  try {
    const { tabela, id } = req.params
    const modelo = genericModel.obterModelo(tabela)

    if (!modelo) {
      return res.status(404).json({ erro: "Tabela inválida." })
    }

    const campoDono = restringivelPorCliente[modelo]

    // Busca por ID específico
    if (id) {
      const registro = await genericModel.buscarPorId(tabela, id)
      if (!registro) return res.status(404).json({ erro: "Registro não encontrado." })

      // Cliente só pode ver seus próprios veículos/agendamentos
      if (campoDono && req.usuarioTipo === 'cliente' && registro[campoDono] !== req.usuarioId) {
        return res.status(403).json({ erro: 'Acesso negado.' })
      }
      return res.status(200).json(registro)
    }

    // Listagem geral com filtros
    let filtro = {}
    if (campoDono && req.usuarioTipo === 'cliente') {
      filtro.where = { [campoDono]: req.usuarioId }
    }

    const dados = await genericModel.buscarTodos(tabela, filtro)
    res.status(200).json(dados)
  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
}

export const criar = async (req, res) => {
  try {
    const { tabela } = req.params
    const modelo = genericModel.obterModelo(tabela)

    if (!modelo) {
      return res.status(404).json({ erro: "Tabela inválida." })
    }

    const dados = req.body

    // Cliente cria veículo automaticamente vinculado a si mesmo
    if (modelo === 'veiculo' && req.usuarioId && req.usuarioTipo === 'cliente') {
      dados.idCliente = req.usuarioId
    }

    // REGRA: não permite dois agendamentos ativos no mesmo dia e horário
    if (modelo === 'agendamento' && dados.data && dados.horario) {
      const conflito = await agendamentoModel.buscarConflitoExato(new Date(dados.data), new Date(dados.horario))

      if (conflito) {
        return res.status(409).json({
          erro: 'Existe um agendamento nesse horário, escolha outro.'
        })
      }
    }

    // REGRA: ao vincular um serviço a um agendamento, verifica se a duração dele
    // vai se sobrepor a outro agendamento ativo no mesmo dia (início + duração)
    if (modelo === 'servicoAgendamento' && dados.idAgendamento && dados.idServico) {
      const agendamento = await agendamentoModel.buscarAgendamentoPorId(dados.idAgendamento)
      if (!agendamento) {
        return res.status(404).json({ erro: 'Agendamento não encontrado.' })
      }

      const veiculo = await agendamentoModel.buscarVeiculoPorId(agendamento.idVeiculo)
      const tipoServico = await agendamentoModel.buscarTipoServico(dados.idServico, veiculo.idTipoVeiculo)
      if (!tipoServico) {
        return res.status(404).json({ erro: 'Duração não cadastrada para esse serviço e tipo de veículo.' })
      }

      const inicioNovo = agendamentoModel.horarioParaMs(agendamento.horario)
      const fimNovo = inicioNovo + agendamentoModel.duracaoParaMs(tipoServico.duracao)

      // soma a duração dos serviços já vinculados a esse mesmo agendamento, se houver
      const intervaloAtual = await agendamentoModel.calcularIntervaloOcupado(agendamento)
      const fimNovoTotal = Math.max(fimNovo, intervaloAtual.fim)

      const sobrepoe = await agendamentoModel.existeSobreposicao(agendamento, inicioNovo, fimNovoTotal)
      if (sobrepoe) {
        return res.status(409).json({
          erro: 'Existe um agendamento nesse horário, escolha outro.'
        })
      }
    }

    const novo = await genericModel.criarRegistro(tabela, dados)
    res.status(201).json(novo)
  } catch (error) {
    res.status(400).json({ erro: error.message })
  }
}

export const atualizar = async (req, res) => {
  try {
    const { tabela, id } = req.params
    const modelo = genericModel.obterModelo(tabela)

    if (!modelo) {
      return res.status(404).json({ erro: "Tabela inválida." })
    }

    const campoDono = restringivelPorCliente[modelo]

    if (campoDono && req.usuarioTipo === 'cliente') {
      const registro = await genericModel.buscarPorId(tabela, id)
      if (!registro || registro[campoDono] !== req.usuarioId) {
        return res.status(403).json({ erro: 'Acesso negado. Este registro não pertence a você.' })
      }
    }

    const atualizado = await genericModel.atualizarRegistro(tabela, id, req.body)
    res.status(200).json(atualizado)
  } catch (error) {
    res.status(400).json({ erro: error.message })
  }
}

export const remover = async (req, res) => {
  try {
    const { tabela, id } = req.params
    const modelo = genericModel.obterModelo(tabela)

    if (!modelo) {
      return res.status(404).json({ erro: "Tabela inválida." })
    }

    const campoDono = restringivelPorCliente[modelo]

    if (campoDono && req.usuarioTipo === 'cliente') {
      const registro = await genericModel.buscarPorId(tabela, id)
      if (!registro || registro[campoDono] !== req.usuarioId) {
        return res.status(403).json({ erro: 'Acesso negado.' })
      }
    }

    await genericModel.removerRegistro(tabela, id)
    res.status(204).send()
  } catch (error) {
    res.status(400).json({ erro: error.message })
  }
}
