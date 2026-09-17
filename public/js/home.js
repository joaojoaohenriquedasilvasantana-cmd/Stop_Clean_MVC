// public/js/home.js
// Controller do painel do cliente (index.html)

const TOTAL_LAVAGENS_FIDELIDADE = 10

document.addEventListener('DOMContentLoaded', async () => {
  if (!StopCleanAPI.exigirLogin()) return

  const usuarioSessao = StopCleanAPI.getUsuario()
  document.getElementById('user-greeting').textContent = usuarioSessao
    ? `Olá, ${usuarioSessao.nome}`
    : 'Olá!'

  const btnSair = document.getElementById('btnSair')
  if (btnSair) {
    btnSair.addEventListener('click', (evento) => {
      evento.preventDefault()
      StopCleanAPI.logout()
    })
  }

  // Carrega tudo em paralelo — cada bloco trata seu próprio erro para que
  // uma falha em uma seção não derrube o painel inteiro.
  await Promise.all([
    carregarPerfilEFidelidade(),
    carregarProximoAgendamento(),
    carregarVeiculos()
  ])
})

async function carregarPerfilEFidelidade () {
  const usuarioSessao = StopCleanAPI.getUsuario()
  try {
    const cliente = await StopCleanAPI.get(`/clientes/${usuarioSessao.id}`)

    document.getElementById('perfil-nome').textContent = cliente.nome || '—'
    document.getElementById('perfil-email').textContent = cliente.email || '—'
    document.getElementById('perfil-telefone').textContent = cliente.telefone || '—'

    renderizarFidelidade(cliente.totalLavagens || 0)
  } catch (erro) {
    document.getElementById('fidelidade-hint').textContent = 'Não foi possível carregar os dados de fidelidade.'
  }
}

function renderizarFidelidade (totalLavagens) {
  const atual = totalLavagens % TOTAL_LAVAGENS_FIDELIDADE
  const faltam = atual === 0 ? TOTAL_LAVAGENS_FIDELIDADE : TOTAL_LAVAGENS_FIDELIDADE - atual

  const dropsEl = document.getElementById('fidelidade-drops')
  dropsEl.innerHTML = ''
  for (let i = 0; i < TOTAL_LAVAGENS_FIDELIDADE; i++) {
    const drop = document.createElement('i')
    drop.className = i < atual ? 'ti ti-droplet-filled drop' : 'ti ti-droplet drop'
    drop.style.color = i < atual ? '#F5C400' : '#555'
    drop.style.fontSize = '20px'
    dropsEl.appendChild(drop)
  }

  document.getElementById('fidelidade-hint').textContent = faltam === TOTAL_LAVAGENS_FIDELIDADE
    ? `Você tem ${atual}/${TOTAL_LAVAGENS_FIDELIDADE} lavagens — faltam ${faltam} para a lavagem grátis!`
    : `Você tem ${atual}/${TOTAL_LAVAGENS_FIDELIDADE} lavagens — faltam ${faltam} para a lavagem grátis!`
}

async function carregarProximoAgendamento () {
  const container = document.getElementById('agendamento-container')
  try {
    const agendamentos = await StopCleanAPI.get('/agendamentos')

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const futuros = (agendamentos || [])
      .filter(a => a.statusAgendamento === 'AGENDADO' && new Date(a.data) >= hoje)
      .sort((a, b) => new Date(a.data) - new Date(b.data))

    if (futuros.length === 0) {
      container.innerHTML = `
        <p style="color: var(--sc-muted); font-size: 13px;">Você ainda não tem agendamentos futuros.</p>
      `
      return
    }

    const proximo = futuros[0]
    const dataFormatada = new Date(proximo.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    const horarioFormatado = new Date(proximo.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
    const valor = proximo.valorTotal ? Number(proximo.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

    container.innerHTML = `
      <p style="margin-bottom:4px;"><strong>${dataFormatada}</strong> às <strong>${horarioFormatado}</strong></p>
      <p style="color: var(--sc-muted); font-size: 13px;">Valor estimado: ${valor}</p>
    `
  } catch (erro) {
    container.innerHTML = `<p style="color:#e53010; font-size:13px;">${erro.message}</p>`
  }
}

async function carregarVeiculos () {
  const listaEl = document.getElementById('veiculos-list')
  try {
    const [veiculos, tipos] = await Promise.all([
      StopCleanAPI.get('/veiculos'),
      StopCleanAPI.get('/tipoVeiculos')
    ])

    const nomeTipoPorId = new Map((tipos || []).map(t => [t.id, t.nome]))

    if (!veiculos || veiculos.length === 0) {
      listaEl.innerHTML = `<p style="color: var(--sc-muted); font-size: 13px;">Você ainda não cadastrou nenhum veículo.</p>`
      return
    }

    listaEl.innerHTML = veiculos.map(v => `
      <div class="sc-card" style="margin-bottom:10px; padding:14px;">
        <p style="margin-bottom:4px;"><strong>${v.marca || ''} ${v.modelo || ''}</strong> — ${nomeTipoPorId.get(v.idTipoVeiculo) || 'Veículo'}</p>
        <p style="color: var(--sc-muted); font-size: 13px;">Placa: ${v.placa} · Cor: ${v.cor || '—'} · Ano: ${v.ano || '—'}</p>
      </div>
    `).join('')
  } catch (erro) {
    listaEl.innerHTML = `<p style="color:#e53010; font-size:13px;">${erro.message}</p>`
  }
}
