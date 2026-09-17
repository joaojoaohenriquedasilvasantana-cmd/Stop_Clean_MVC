// public/js/AgendamentoCliente.js
// Controller da página AgendamentoCliente.html

document.addEventListener('DOMContentLoaded', async () => {
  if (!StopCleanAPI.exigirLogin()) return

  const usuarioSessao = StopCleanAPI.getUsuario()

  const selectVeiculo = document.getElementById('selectVeiculo')
  const svcGrid = document.getElementById('svcGrid')
  const svcEmpty = document.getElementById('svcEmpty')
  const inputData = document.getElementById('inputData')
  const selectHorario = document.getElementById('selectHorario')
  const textareaObs = document.getElementById('textareaObs')
  const btnConfirmar = document.getElementById('btnConfirmarAgendamento')

  const nomeUsuarioEl = document.querySelector('.sc-user-name')
  if (nomeUsuarioEl && usuarioSessao) nomeUsuarioEl.textContent = usuarioSessao.nome

  // Data mínima = hoje
  const hojeISO = new Date().toISOString().slice(0, 10)
  inputData.min = hojeISO
  if (!inputData.value) inputData.value = hojeISO

  let veiculos = []
  let servicosDisponiveis = [] // [{ idServico, nome, descricao, preco, duracao }]
  const servicosSelecionados = new Map() // idServico -> { nome, preco, duracao }

  await carregarVeiculos()
  await carregarServicosDoVeiculoSelecionado()
  await carregarHorariosDisponiveis()
  atualizarResumo()

  selectVeiculo.addEventListener('change', async () => {
    servicosSelecionados.clear()
    await carregarServicosDoVeiculoSelecionado()
    await carregarHorariosDisponiveis()
    atualizarResumo()
  })

  inputData.addEventListener('change', carregarHorariosDisponiveis)
  selectHorario.addEventListener('change', atualizarResumo)

  btnConfirmar.addEventListener('click', confirmarAgendamento)

  // ------------------------------------------------------------------

  async function carregarVeiculos () {
    try {
      veiculos = await StopCleanAPI.get('/veiculos')

      if (!veiculos || veiculos.length === 0) {
        selectVeiculo.innerHTML = '<option value="">Nenhum veículo cadastrado</option>'
        btnConfirmar.disabled = true
        alert('Você ainda não tem veículos cadastrados. Cadastre um veículo antes de agendar.')
        window.location.href = 'CadastroVeiculo.html'
        return
      }

      selectVeiculo.innerHTML = veiculos.map(v =>
        `<option value="${v.id}" data-tipo="${v.idTipoVeiculo}">${v.marca || ''} ${v.modelo || ''} – ${v.placa}</option>`
      ).join('')
    } catch (erro) {
      selectVeiculo.innerHTML = '<option value="">Erro ao carregar veículos</option>'
    }
  }

  async function carregarServicosDoVeiculoSelecionado () {
    const veiculoId = Number(selectVeiculo.value)
    const veiculo = veiculos.find(v => v.id === veiculoId)
    if (!veiculo) return

    svcGrid.innerHTML = '<p style="color:var(--sc-muted); font-size:13px;">Carregando serviços...</p>'

    try {
      const tiposServico = await StopCleanAPI.get(`/servicos/tipo-veiculo/${veiculo.idTipoVeiculo}`)

      servicosDisponiveis = (tiposServico || []).map(ts => ({
        idServico: ts.idServico,
        nome: ts.servico?.nome || 'Serviço',
        descricao: ts.servico?.descricao || '',
        preco: Number(ts.preco) || 0,
        duracao: ts.duracao
      }))

      renderizarServicos()
    } catch (erro) {
      svcGrid.innerHTML = `<p style="color:#e53010; font-size:13px;">${erro.message}</p>`
    }
  }

  function renderizarServicos () {
    if (servicosDisponiveis.length === 0) {
      svcGrid.innerHTML = '<p style="color:var(--sc-muted); font-size:13px;">Nenhum serviço disponível para este veículo.</p>'
      return
    }

    svcGrid.innerHTML = servicosDisponiveis.map(s => `
      <button type="button" class="svc-card" data-id="${s.idServico}">
        <div class="svc-check"><i class="ti ti-check" aria-hidden="true"></i></div>
        <div class="svc-info">
          <div class="svc-name">${s.nome}</div>
          ${s.descricao ? `<div class="svc-desc">${s.descricao}</div>` : ''}
          <div class="svc-dur"><i class="ti ti-clock" aria-hidden="true"></i> ${formatarDuracao(s.duracao)}</div>
        </div>
        <div class="svc-price">R$ ${s.preco.toFixed(2).replace('.', ',')}</div>
      </button>
    `).join('')

    svcGrid.querySelectorAll('.svc-card').forEach(card => {
      card.addEventListener('click', () => {
        const idServico = Number(card.dataset.id)
        const servico = servicosDisponiveis.find(s => s.idServico === idServico)

        if (servicosSelecionados.has(idServico)) {
          servicosSelecionados.delete(idServico)
          card.classList.remove('selected')
        } else {
          servicosSelecionados.set(idServico, servico)
          card.classList.add('selected')
        }

        svcEmpty.style.display = servicosSelecionados.size === 0 ? 'flex' : 'none'
        atualizarResumo()
      })
    })
  }

  async function carregarHorariosDisponiveis () {
    const veiculoId = Number(selectVeiculo.value)
    const data = inputData.value
    if (!veiculoId || !data) return

    const horarioAtualSelecionado = selectHorario.value

    try {
      const resposta = await StopCleanAPI.get(`/agendamentos/horarios-disponiveis?data=${data}&idVeiculo=${veiculoId}`)
      const livres = resposta.horariosDisponiveis || []

      if (livres.length === 0) {
        selectHorario.innerHTML = '<option value="">Sem horários livres nesta data</option>'
        return
      }

      selectHorario.innerHTML = livres.map(h => `<option value="${h}">${h}</option>`).join('')

      // Tenta manter o horário que já estava selecionado, se ainda estiver livre
      if (livres.includes(horarioAtualSelecionado)) {
        selectHorario.value = horarioAtualSelecionado
      }
    } catch (erro) {
      selectHorario.innerHTML = `<option value="">${erro.message}</option>`
    }
  }

  function atualizarResumo () {
    const nomes = Array.from(servicosSelecionados.values()).map(s => s.nome)
    const precoTotal = Array.from(servicosSelecionados.values()).reduce((soma, s) => soma + s.preco, 0)
    const duracaoTotalMin = Array.from(servicosSelecionados.values())
      .reduce((soma, s) => soma + duracaoParaMinutos(s.duracao), 0)

    document.getElementById('summaryService').textContent = nomes.length ? nomes.join(', ') : '—'

    const veiculoSelecionado = veiculos.find(v => v.id === Number(selectVeiculo.value))
    document.getElementById('summaryVehicle').textContent = veiculoSelecionado
      ? `${veiculoSelecionado.marca || ''} ${veiculoSelecionado.modelo || ''} – ${veiculoSelecionado.placa}`
      : '—'

    document.getElementById('summaryDate').textContent = inputData.value
      ? new Date(`${inputData.value}T00:00:00`).toLocaleDateString('pt-BR')
      : '—'

    document.getElementById('summaryTime').textContent = selectHorario.value || '—'
    document.getElementById('summaryDur').textContent = duracaoTotalMin ? `${duracaoTotalMin} min` : '—'
    document.getElementById('summaryPrice').textContent = precoTotal
      ? precoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'R$ 0,00'
  }

  async function confirmarAgendamento () {
    if (servicosSelecionados.size === 0) {
      svcEmpty.style.display = 'flex'
      svcEmpty.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (!inputData.value || !selectHorario.value) {
      alert('Escolha uma data e um horário disponível.')
      return
    }

    const payload = {
      idCliente: usuarioSessao.id,
      idVeiculo: Number(selectVeiculo.value),
      servicos: Array.from(servicosSelecionados.keys()),
      data: inputData.value,
      horario: selectHorario.value,
      obs: textareaObs.value.trim() || undefined
    }

    btnConfirmar.disabled = true
    btnConfirmar.textContent = 'Confirmando...'

    try {
      await StopCleanAPI.post('/agendamentos', payload)
      alert('Agendamento confirmado com sucesso!')
      window.location.href = 'index.html'
    } catch (erro) {
      alert(erro.message)
      btnConfirmar.disabled = false
      btnConfirmar.innerHTML = '<i class="ti ti-calendar-check" aria-hidden="true"></i> Confirmar agendamento'
      // Horário pode ter sido ocupado por outra pessoa: atualiza a lista
      carregarHorariosDisponiveis()
    }
  }

  function formatarDuracao (duracaoStr) {
    const min = duracaoParaMinutos(duracaoStr)
    return min ? `${min} min` : '—'
  }

  function duracaoParaMinutos (duracaoStr) {
    if (!duracaoStr) return 0
    if (String(duracaoStr).includes(':')) {
      const [h, m] = String(duracaoStr).split(':').map(Number)
      return (h * 60) + (m || 0)
    }
    return Number(duracaoStr) || 0
  }
})
