/* Stop Clean - Painel do Funcionário */

(() => {
  const API = window.StopCleanAPI

  if (!API || !API.exigirLogin('funcionario')) return

  const usuario = API.getUsuario() || {}
  let clientes = []
  let veiculos = []
  let tiposVeiculo = []
  let servicos = []
  let tiposServicos = []
  let agendamentos = []
  let servicosSelecionados = []
  let dadosClienteTemp = null

  const $ = (id) => document.getElementById(id)

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  const dinheiro = (valor) => `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`

  const dataLocalISO = (date = new Date()) => {
    const offset = date.getTimezoneOffset()
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10)
  }

  const formatarData = (valor) => {
    if (!valor) return '-'
    const d = new Date(`${String(valor).slice(0, 10)}T00:00:00`)
    return Number.isNaN(d.getTime()) ? String(valor) : d.toLocaleDateString('pt-BR')
  }

  const formatarHora = (valor) => {
    if (!valor) return '-'
    if (typeof valor === 'string' && /^\d{2}:\d{2}/.test(valor)) return valor.slice(0, 5)
    const d = new Date(valor)
    if (Number.isNaN(d.getTime())) return String(valor).slice(0, 5)
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  }

  function statusTexto(status) {
    return {
      AGENDADO: 'Agendado',
      EM_ANDAMENTO: 'Em andamento',
      FINALIZADO: 'Finalizado',
      CANCELADO: 'Cancelado'
    }[status] || status || 'Agendado'
  }

  function statusClasse(status) {
    return String(status || 'AGENDADO').toLowerCase().replace('_', '-')
  }

  function preencherTiposVeiculoNoCadastro() {
    const select = $('veiculoTipo')
    if (!select) return

    const tiposAtivos = tiposVeiculo.filter(tipo => tipo.status !== false)
    select.innerHTML = '<option value="">Selecione o tipo de veículo...</option>'

    tiposAtivos.forEach(tipo => {
      const option = document.createElement('option')
      option.value = String(tipo.id)
      option.textContent = tipo.nome
      select.appendChild(option)
    })

    if (!tiposAtivos.length) {
      select.innerHTML = '<option value="">Nenhum tipo ativo cadastrado</option>'
    }
  }

  async function carregarDadosBase() {
    const [clientesResp, veiculosResp, tiposResp, servicosResp, tiposServicosResp] = await Promise.all([
      API.get('/clientes'),
      API.get('/veiculos'),
      API.get('/tipoVeiculos'),
      API.get('/servicos'),
      API.get('/tipoServicos')
    ])

    clientes = Array.isArray(clientesResp) ? clientesResp : []
    veiculos = Array.isArray(veiculosResp) ? veiculosResp : []
    tiposVeiculo = Array.isArray(tiposResp) ? tiposResp : []
    servicos = Array.isArray(servicosResp) ? servicosResp : []
    tiposServicos = Array.isArray(tiposServicosResp) ? tiposServicosResp : []
  }

  async function carregarAgendamentos() {
    try {
      const resposta = await API.get('/agendamentos')
      agendamentos = Array.isArray(resposta) ? resposta : []
      renderizarAgendamentosHoje()
      atualizarMetricas()
    } catch (error) {
      console.error(error)
      const lista = document.querySelector('.sc-agenda-list')
      if (lista) lista.innerHTML = `<p style="font-size:13px;color:var(--sc-muted);">${escapeHtml(error.message)}</p>`
    }
  }

  function agendamentosHoje() {
    const hoje = dataLocalISO()
    return agendamentos.filter(a => String(a.data).slice(0, 10) === hoje)
  }

  function atualizarMetricas() {
    const hoje = agendamentosHoje()
    const ativos = hoje.filter(a => a.statusAgendamento !== 'CANCELADO')
    const pendentes = hoje.filter(a => a.statusAgendamento === 'AGENDADO')
    const receita = ativos.reduce((s, a) => s + Number(a.valorTotal || 0), 0)
    const clientesHoje = new Set(ativos.map(a => a.idCliente)).size

    const box = document.querySelector('.sc-metrics')
    if (!box) return

    box.innerHTML = `
      <li class="sc-metric-card"><p class="sc-metric-label">Receita do dia</p><p class="sc-metric-value">${dinheiro(receita)}</p><p class="sc-metric-sub up">Agendamentos do dia</p></li>
      <li class="sc-metric-card"><p class="sc-metric-label">Serviços hoje</p><p class="sc-metric-value">${ativos.length}</p><p class="sc-metric-sub">Ativos no dia</p></li>
      <li class="sc-metric-card"><p class="sc-metric-label">Pendentes</p><p class="sc-metric-value">${pendentes.length}</p><p class="sc-metric-sub">Aguardando atendimento</p></li>
      <li class="sc-metric-card"><p class="sc-metric-label">Clientes hoje</p><p class="sc-metric-value">${clientesHoje}</p><p class="sc-metric-sub">Clientes agendados</p></li>
    `
  }

  function renderizarAgendamentosHoje() {
    const lista = document.querySelector('.sc-agenda-list')
    if (!lista) return

    const hoje = agendamentosHoje().sort((a, b) => formatarHora(a.horario).localeCompare(formatarHora(b.horario)))

    if (!hoje.length) {
      lista.innerHTML = '<p style="font-size:13px;color:var(--sc-muted);">Nenhum agendamento para hoje.</p>'
      return
    }

    lista.innerHTML = hoje.map(a => {
      const cliente = a.cliente?.nome || `Cliente #${a.idCliente}`
      const veiculo = a.veiculo ? `${a.veiculo.marca || ''} ${a.veiculo.modelo || ''}`.trim() : 'Veículo'
      const placa = a.veiculo?.placa || ''
      const nomesServicos = (a.servicos || []).map(s => s.servico?.nome).filter(Boolean).join(', ')

      return `
        <li class="sc-agenda-item">
          <div class="sc-agenda-time">${escapeHtml(formatarHora(a.horario))}</div>
          <div class="sc-agenda-info">
            <h3 class="sc-agenda-name">${escapeHtml(cliente)}</h3>
            <p class="sc-agenda-detail">${escapeHtml(veiculo)} · ${escapeHtml(placa)} · ${escapeHtml(nomesServicos || 'Serviço')}</p>
          </div>
          <span class="sc-agenda-status ${statusClasse(a.statusAgendamento)}">${escapeHtml(statusTexto(a.statusAgendamento))}</span>
          <button class="sc-btn sc-btn-outline sc-btn-sm" onclick="alterarStatusAgendamento(${a.id}, 'EM_ANDAMENTO')">Iniciar</button>
          <button class="sc-btn sc-btn-outline sc-btn-sm" onclick="alterarStatusAgendamento(${a.id}, 'FINALIZADO')" ${a.statusAgendamento !== 'EM_ANDAMENTO' ? 'disabled' : ''}>Finalizar</button>
          ${a.statusAgendamento === 'AGENDADO' ? `<button class="sc-btn sc-btn-danger sc-btn-sm" onclick="alterarStatusAgendamento(${a.id}, 'CANCELADO')">Cancelar</button>` : ''}
          <button class="sc-btn sc-btn-outline sc-btn-sm" onclick="mostrarDetalhesAgendamento(${a.id})">Detalhes</button>
        </li>
      `
    }).join('')
  }

  function mostrarDetalhesAgendamento(id) {
    const ag = agendamentos.find(item => Number(item.id) === Number(id))
    if (!ag) return

    const cliente = ag.cliente || {}
    const veiculo = ag.veiculo || {}
    const nomes = (ag.servicos || []).map(s => s.servico?.nome).filter(Boolean).join(', ') || 'Serviço não informado'

    const overlay = document.getElementById('modalDetalhesAgendamento')
    if (!overlay) return

    document.getElementById('detalheClienteNome').textContent = cliente.nome || `Cliente #${ag.idCliente}`
    document.getElementById('detalheClienteTelefone').textContent = cliente.telefone || 'Telefone não cadastrado'
    document.getElementById('detalheVeiculo').textContent = `${veiculo.marca || ''} ${veiculo.modelo || ''}`.trim() || 'Veículo não informado'
    document.getElementById('detalhePlaca').textContent = veiculo.placa || '-'
    document.getElementById('detalheData').textContent = formatarData(ag.data)
    document.getElementById('detalheHorario').textContent = formatarHora(ag.horario)
    document.getElementById('detalheServico').textContent = nomes
    document.getElementById('detalheStatus').textContent = statusTexto(ag.statusAgendamento)
    overlay.classList.add('active')
  }

  function fecharDetalhesAgendamento() {
    document.getElementById('modalDetalhesAgendamento')?.classList.remove('active')
  }

  async function carregarServicosTela() {
    const lista = document.querySelector('.sc-service-list')
    if (!lista) return

    if (!servicos.length) {
      lista.innerHTML = '<p style="font-size:13px;color:var(--sc-muted);">Nenhum serviço cadastrado.</p>'
      return
    }

    lista.innerHTML = servicos.map(s => {
      const configs = tiposServicos.filter(ts => ts.idServico === s.id)
      const menorPreco = configs.length ? Math.min(...configs.map(c => Number(c.preco))) : 0
      return `
        <li class="sc-service-item">
          <div>
            <h3 class="sc-service-name">${escapeHtml(s.nome)}</h3>
            <p class="sc-service-desc">${escapeHtml(s.descricao || '')}</p>
          </div>
          <div class="sc-service-price">${configs.length ? `A partir de ${dinheiro(menorPreco)}` : 'Sem preço'}</div>
        </li>
      `
    }).join('')
  }

  function preencherClientes() {
    const select = $('selectCliente')
    if (!select) return

    select.innerHTML = '<option value="">Selecione um cliente...</option>'
    clientes.forEach(c => {
      select.insertAdjacentHTML('beforeend', `<option value="${c.id}">${escapeHtml(c.nome || `Cliente #${c.id}`)}${c.cpf ? ` - ${escapeHtml(c.cpf)}` : ''}</option>`)
    })
  }

  function preencherTiposVeiculo() {
    const select = $('veiculoTipo')
    if (!select) return
    select.innerHTML = '<option value="">Selecione...</option>'
    tiposVeiculo.filter(t => t.status !== false).forEach(t => {
      select.insertAdjacentHTML('beforeend', `<option value="${t.id}">${escapeHtml(t.nome)}</option>`)
    })
  }

  function atualizarVeiculosDoCliente() {
    const clienteId = Number($('selectCliente')?.value)
    const select = $('selectVeiculo')
    if (!select) return

    select.innerHTML = '<option value="">Selecione o veículo...</option>'
    select.disabled = !clienteId

    if (!clienteId) return

    veiculos.filter(v => v.idCliente === clienteId).forEach(v => {
      const tipo = tiposVeiculo.find(t => t.id === v.idTipoVeiculo)
      select.insertAdjacentHTML('beforeend', `<option value="${v.id}">${escapeHtml(`${v.marca || ''} ${v.modelo || ''}`.trim() || 'Veículo')} - ${escapeHtml(v.placa)}${tipo ? ` (${escapeHtml(tipo.nome)})` : ''}</option>`)
    })
  }

  function renderizarServicosParaVeiculo() {
    const container = $('modalSvcGrid')
    const veiculoId = Number($('selectVeiculo')?.value)
    if (!container) return

    servicosSelecionados = []
    atualizarTotalAgendamentoModal()

    const veiculo = veiculos.find(v => v.id === veiculoId)
    if (!veiculo) {
      container.innerHTML = '<p style="font-size:12px;color:var(--sc-hint);">Selecione um veículo para carregar os serviços.</p>'
      return
    }

    const configs = tiposServicos.filter(ts => ts.idTipoVeiculo === veiculo.idTipoVeiculo)
    if (!configs.length) {
      container.innerHTML = '<p style="font-size:12px;color:var(--sc-hint);">Nenhum serviço configurado para este tipo de veículo.</p>'
      return
    }

    container.innerHTML = configs.map(config => {
      const s = servicos.find(item => item.id === config.idServico)
      if (!s || s.status === false) return ''
      return `
        <div class="sc-svc-card" data-id="${s.id}" data-preco="${Number(config.preco)}">
          <div class="sc-svc-info"><h4>${escapeHtml(s.nome)}</h4><p>${escapeHtml(s.descricao || '')} · ${escapeHtml(config.duracao || '')}</p></div>
          <div class="sc-svc-price">${dinheiro(config.preco)}</div>
        </div>
      `
    }).join('')

    container.querySelectorAll('.sc-svc-card').forEach(card => {
      card.addEventListener('click', () => {
        card.classList.toggle('selected')
        servicosSelecionados = [...container.querySelectorAll('.sc-svc-card.selected')].map(c => Number(c.dataset.id))
        atualizarTotalAgendamentoModal()
        carregarHorariosDisponiveis()
      })
    })
  }

  function atualizarTotalAgendamentoModal() {
    const total = [...document.querySelectorAll('.sc-svc-card.selected')].reduce((sum, c) => sum + Number(c.dataset.preco || 0), 0)
    if ($('modalAgendamentoTotal')) $('modalAgendamentoTotal').textContent = dinheiro(total)
  }

  async function carregarHorariosDisponiveis() {
    const data = $('agendamentoData')?.value
    const veiculoId = $('selectVeiculo')?.value
    const select = $('agendamentoHorario')
    if (!select || !data || !veiculoId) return

    try {
      const resposta = await API.get(`/agendamentos/horarios-disponiveis?data=${encodeURIComponent(data)}&idVeiculo=${encodeURIComponent(veiculoId)}`)
      const horarios = resposta.horariosDisponiveis || []
      select.innerHTML = '<option value="">Selecione...</option>'
      horarios.forEach(h => select.insertAdjacentHTML('beforeend', `<option value="${h}">${h}</option>`))
      if (!horarios.length) select.innerHTML = '<option value="">Nenhum horário disponível</option>'
    } catch (error) {
      console.error(error)
      select.innerHTML = '<option value="">Erro ao carregar horários</option>'
    }
  }

  async function abrirModalAgendamento() {
    try {
      await carregarDadosBase()
      preencherClientes()
      preencherTiposVeiculo()
      $('agendamentoData').value = dataLocalISO()
      $('modalAgendarServico')?.classList.add('active')
      $('modalSvcGrid').innerHTML = '<p style="font-size:12px;color:var(--sc-hint);">Selecione o veículo.</p>'
      atualizarTotalAgendamentoModal()
    } catch (error) {
      alert(error.message)
    }
  }

  function fecharModalAgendamento() {
    $('modalAgendarServico')?.classList.remove('active')
    $('formAgendarServico')?.reset()
    servicosSelecionados = []
    if ($('selectVeiculo')) $('selectVeiculo').disabled = true
    if ($('modalSvcGrid')) $('modalSvcGrid').innerHTML = ''
    atualizarTotalAgendamentoModal()
  }

  async function enviarAgendamento(event) {
    event.preventDefault()

    const idCliente = Number($('selectCliente')?.value)
    const idVeiculo = Number($('selectVeiculo')?.value)
    const data = $('agendamentoData')?.value
    const horario = $('agendamentoHorario')?.value

    if (!idCliente || !idVeiculo || !data || !horario || !servicosSelecionados.length) {
      alert('Preencha cliente, veículo, serviço, data e horário.')
      return
    }

    try {
      await API.post('/agendamentos', {
        idCliente,
        idVeiculo,
        idFuncionario: usuario.id,
        servicos: servicosSelecionados,
        data,
        horario,
        obs: $('agendamentoObs')?.value.trim() || null
      })

      alert('Agendamento realizado com sucesso!')
      fecharModalAgendamento()
      await carregarAgendamentos()
    } catch (error) {
      alert(error.message)
      await carregarHorariosDisponiveis()
    }
  }

  async function cadastrarClienteEVeiculo(event) {
    event.preventDefault()

    if (!dadosClienteTemp) return

    const placa = $('veiculoPlaca')?.value.trim().toUpperCase()
    const idTipoVeiculo = Number($('veiculoTipo')?.value)

    if (!placa || !idTipoVeiculo) {
      alert('Informe a placa e o tipo do veículo.')
      return
    }

    try {
      const cliente = await API.post('/clientes/cadastro-funcionario', dadosClienteTemp)

      await API.post('/veiculos', {
        idCliente: cliente.id,
        idTipoVeiculo,
        placa,
        marca: $('veiculoMarca')?.value.trim() || null,
        modelo: $('veiculoModelo')?.value.trim() || null,
        ano: $('veiculoAno')?.value.trim() || null,
        cor: $('veiculoCor')?.value.trim() || null,
        obs: $('veiculoObservacao')?.value.trim() || null
      })

      alert('Cliente e veículo cadastrados com sucesso!')
      fecharModalCliente()
      await carregarDadosBase()
    } catch (error) {
      alert(error.message)
    }
  }

  function abrirModalCliente() {
    dadosClienteTemp = null
    $('formStepCliente')?.reset()
    $('formStepVeiculo')?.reset()
    $('modalStepBadge').textContent = 'PASSO 1 DE 2'
    $('modalTitle').textContent = 'Cadastrar Novo Cliente'
    $('formStepCliente').style.display = 'block'
    $('formStepVeiculo').style.display = 'none'
    preencherTiposVeiculo()
    $('modalNovoCliente')?.classList.add('active')
  }

  function fecharModalCliente() {
    $('modalNovoCliente')?.classList.remove('active')
    dadosClienteTemp = null
  }

  function avancarCliente() {
    dadosClienteTemp = {
      nome: $('clienteNome').value.trim(),
      cpf: $('clienteCpf').value.trim(),
      telefone: $('clienteTelefone').value.trim()
    }
    if (!dadosClienteTemp.cpf || !dadosClienteTemp.telefone) {
      alert('CPF e telefone são obrigatórios.')
      return
    }
    $('modalStepBadge').textContent = 'PASSO 2 DE 2'
    $('modalTitle').textContent = 'Cadastrar Veículo do Cliente'
    $('formStepCliente').style.display = 'none'
    $('formStepVeiculo').style.display = 'block'
  }

  async function alterarStatusAgendamento(id, status) {
    if (status === 'FINALIZADO' && !confirm('Deseja finalizar este agendamento?')) return
    if (status === 'CANCELADO' && !confirm('Deseja cancelar este agendamento? Ele ficará salvo no histórico com status Cancelado.')) return
    try {
      await API.put(`/agendamentos/${id}/status`, { statusAgendamento: status })
      await carregarAgendamentos()
    } catch (error) {
      alert(error.message)
    }
  }

  function configurarAbas() {
    const buttons = document.querySelectorAll('.tab-btn')
    const contents = document.querySelectorAll('.tab-content')

    function switchTab(target) {
      buttons.forEach(b => b.classList.remove('active'))
      contents.forEach(c => c.classList.remove('active'))
      document.querySelectorAll(`.tab-btn[data-target="${target}"]`).forEach(b => b.classList.add('active'))
      document.getElementById(target)?.classList.add('active')
      if (target === 'agendamentos') carregarAgendamentos()
      if (target === 'servicos') carregarServicosTela()
    }

    const inicial = location.hash.replace('#', '') || 'dashboard'
    switchTab(document.getElementById(inicial) ? inicial : 'dashboard')

    buttons.forEach(btn => btn.addEventListener('click', e => {
      e.preventDefault()
      const target = btn.dataset.target
      switchTab(target)
      location.hash = target
    }))
  }

  function configurarModais() {
    $('btnNovoCliente')?.addEventListener('click', abrirModalCliente)
    $('btnFecharModal')?.addEventListener('click', fecharModalCliente)
    $('btnCancelarModal')?.addEventListener('click', fecharModalCliente)
    $('btnVoltarPasso1')?.addEventListener('click', () => {
      $('modalStepBadge').textContent = 'PASSO 1 DE 2'
      $('modalTitle').textContent = 'Cadastrar Novo Cliente'
      $('formStepCliente').style.display = 'block'
      $('formStepVeiculo').style.display = 'none'
    })
    $('formStepCliente')?.addEventListener('submit', e => { e.preventDefault(); avancarCliente() })
    $('formStepVeiculo')?.addEventListener('submit', cadastrarClienteEVeiculo)

    $('btnAgendarCliente')?.addEventListener('click', abrirModalAgendamento)
    $('btnFecharModalAgendamento')?.addEventListener('click', fecharModalAgendamento)
    $('btnCancelarAgendamento')?.addEventListener('click', fecharModalAgendamento)
    $('formAgendarServico')?.addEventListener('submit', enviarAgendamento)
    $('selectCliente')?.addEventListener('change', () => {
      atualizarVeiculosDoCliente()
      renderizarServicosParaVeiculo()
    })
    $('selectVeiculo')?.addEventListener('change', () => {
      renderizarServicosParaVeiculo()
      carregarHorariosDisponiveis()
    })
    $('agendamentoData')?.addEventListener('change', carregarHorariosDisponiveis)
    $('btnNovoServico')?.addEventListener('click', () => { window.location.href = 'servicos.html' })
    $('btnHistoricoFuncionario')?.addEventListener('click', () => { window.location.href = 'historico.html' })
    $('btnFecharDetalhesAgendamento')?.addEventListener('click', fecharDetalhesAgendamento)
    $('modalDetalhesAgendamento')?.addEventListener('click', (e) => {
      if (e.target.id === 'modalDetalhesAgendamento') fecharDetalhesAgendamento()
    })
  }

  function configurarUsuario() {
    const nome = usuario.nome || 'FUNCIONÁRIO'
    const partes = nome.trim().split(/\s+/)
    const iniciais = (partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1]?.[0] || '' : '')
    document.querySelector('.sc-topbar-name')?.replaceChildren(document.createTextNode(nome))
    document.querySelector('.sc-topbar-avatar')?.replaceChildren(document.createTextNode(iniciais.toUpperCase()))
    const titulo = document.querySelector('.sc-page-title')
    if (titulo) titulo.innerHTML = `BEM-VINDO, <span>${escapeHtml(partes[0]?.toUpperCase() || 'FUNCIONÁRIO')}.</span>`
    const sub = document.querySelector('.sc-page-sub')
    if (sub) sub.textContent = `${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · Painel Administrativo`
  }


  async function abrirPerfilFuncionario() {
    const painel = $('painelInformacoesPessoais')
    const card = $('btnInformacoesPessoais')?.parentElement
    if (painel) painel.hidden = false
    if (card) card.hidden = true
    const msg = $('perfilMensagem')
    if (msg) msg.textContent = 'Carregando seus dados...'
    try {
      const id = usuario.id
      if (!id) throw new Error('Não foi possível identificar o funcionário na sessão. Faça login novamente.')
      const f = await API.get(`/funcionarios/${encodeURIComponent(id)}`)
      const map = {perfilNome:'nome',perfilCpf:'cpf',perfilTelefone:'telefone',perfilEmail:'email',perfilCep:'cep',perfilEstado:'estado',perfilEndereco:'endereco',perfilNumero:'numero',perfilBairro:'bairro'}
      Object.entries(map).forEach(([input,key]) => { if ($(input)) $(input).value = f[key] ?? '' })
      if (msg) msg.textContent = ''
    } catch (e) { if (msg) msg.textContent = e.message }
  }

  function fecharPerfilFuncionario() {
    $('painelInformacoesPessoais').hidden = true
    const card = $('btnInformacoesPessoais')?.parentElement
    if (card) card.hidden = false
  }

  async function salvarPerfilFuncionario(event) {
    event.preventDefault()
    const btn = $('btnSalvarPerfil')
    const msg = $('perfilMensagem')
    const id = usuario.id
    if (!id) { msg.textContent = 'Sessão sem identificação. Entre novamente.'; return }
    const dados = {
      nome: $('perfilNome').value.trim(),
      cpf: $('perfilCpf').value.trim(),
      telefone: $('perfilTelefone').value.trim(),
      email: $('perfilEmail').value.trim(),
      cep: $('perfilCep').value.trim(),
      estado: $('perfilEstado').value.trim(),
      endereco: $('perfilEndereco').value.trim(),
      numero: $('perfilNumero').value.trim(),
      bairro: $('perfilBairro').value.trim()
    }
    const senha = $('perfilSenha').value
    if (senha) {
      if (senha.length < 8) { msg.textContent = 'A senha deve ter pelo menos 8 caracteres.'; return }
      dados.senha = senha
    }
    btn.disabled = true
    msg.textContent = 'Salvando...'
    try {
      const atualizado = await API.put(`/funcionarios/${encodeURIComponent(id)}`, dados)
      Object.assign(usuario, {nome: atualizado.nome, email: atualizado.email})
      sessionStorage.setItem('sc_usuario', JSON.stringify(usuario))
      configurarUsuario()
      $('perfilSenha').value = ''
      msg.textContent = 'Perfil atualizado com sucesso.'
    } catch (e) { msg.textContent = e.message || 'Erro ao atualizar perfil.' }
    finally { btn.disabled = false }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    configurarUsuario()
    configurarAbas()
    configurarModais()
    $('btnInformacoesPessoais')?.addEventListener('click', abrirPerfilFuncionario)
    $('btnVoltarConfiguracoes')?.addEventListener('click', fecharPerfilFuncionario)
    $('formPerfilFuncionario')?.addEventListener('submit', salvarPerfilFuncionario)

    document.querySelector('.sc-sidebar-bottom a')?.addEventListener('click', e => {
      e.preventDefault()
      API.logout()
    })

    try {
      await carregarDadosBase()
      await Promise.all([carregarAgendamentos(), carregarServicosTela()])
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
    }
  })

  window.alterarStatusAgendamento = alterarStatusAgendamento
  window.mostrarDetalhesAgendamento = mostrarDetalhesAgendamento
})()
