import API_BASE_URL from './api.js';

// ==========================================
// CONFIGURAÇÕES DA API
// ==========================================
const API_URL = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`; 
const token = localStorage.getItem('token'); 
const headersPadrao = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// Variaveis de Estado Globais para Modais
let servicosGlobais = [];
let servicosSelecionadosAgendamento = [];
let clientesEVeiculosGlobais = [];

// ==========================================
// FUNÇÕES DE CONSUMO DA API (FETCH)
// ==========================================

async function carregarMetricas() {
  try {
    const response = await fetch(`${API_URL}/metricas/hoje`, { headers: headersPadrao });
    if (!response.ok) throw new Error('Erro ao buscar métricas');
    
    const metricas = await response.json();
    
    const metricsContainer = document.querySelector('.sc-metrics');
    if (metricsContainer) {
      metricsContainer.innerHTML = `
        <li class="sc-metric-card">
          <p class="sc-metric-label">Receita do dia</p>
          <p class="sc-metric-value">R$${parseFloat(metricas.receita || 0).toFixed(2)}</p>
          <p class="sc-metric-sub up">Valor atualizado</p>
        </li>
        <li class="sc-metric-card">
          <p class="sc-metric-label">Serviços hoje</p>
          <p class="sc-metric-value">${metricas.servicos || 0}</p>
          <p class="sc-metric-sub up">Concluídos e em andamento</p>
        </li>
        <li class="sc-metric-card">
          <p class="sc-metric-label">Pendentes</p>
          <p class="sc-metric-value">${metricas.pendentes || 0}</p>
          <p class="sc-metric-sub">Aguardando atend.</p>
        </li>
        <li class="sc-metric-card">
          <p class="sc-metric-label">Clientes hoje</p>
          <p class="sc-metric-value">${metricas.clientes || 0}</p>
          <p class="sc-metric-sub">Atendidos hoje</p>
        </li>
      `;
    }
  } catch (error) {
    console.error(error);
    const metricsContainer = document.querySelector('.sc-metrics');
    if (metricsContainer) {
      metricsContainer.innerHTML = '<p style="font-size: 13px; color: var(--sc-muted);">Não foi possível carregar as métricas do banco.</p>';
    }
  }
}

async function carregarAgendamentos() {
  try {
    const response = await fetch(`${API_URL}/agendamentos/hoje`, { headers: headersPadrao });
    if (!response.ok) throw new Error('Erro ao buscar agendamentos');
    
    const agendamentos = await response.json();
    const listaAgenda = document.querySelector('.sc-agenda-list');
    if (!listaAgenda) return;
    
    listaAgenda.innerHTML = ''; 

    if (Array.isArray(agendamentos) && agendamentos.length > 0) {
      agendamentos.forEach(agenda => {
        const statusClass = (agenda.status || 'pendente').toLowerCase().replace(' ', '');
        
        listaAgenda.innerHTML += `
          <li class="sc-agenda-item">
            <div class="sc-agenda-time">${agenda.horario || '10:00'}</div>
            <div class="sc-agenda-info">
              <h3 class="sc-agenda-name">${agenda.cliente?.nome || agenda.cliente || 'Cliente'}</h3>
              <p class="sc-agenda-detail">${agenda.veiculo || 'Veículo'} · ${agenda.placa || ''} · ${agenda.servico?.nome || agenda.servico || ''}</p>
            </div>
            <span class="sc-agenda-status ${statusClass}">${agenda.status || 'Pendente'}</span>
            <button class="sc-btn sc-btn-outline sc-btn-sm" onclick="verOS('${agenda.id}')">Ver O.S.</button>
          </li>
        `;
      });
    } else {
      listaAgenda.innerHTML = '<p style="font-size: 13px; color: var(--sc-muted);">Nenhum agendamento para hoje.</p>';
    }
  } catch (error) {
    console.error(error);
    const listaAgenda = document.querySelector('.sc-agenda-list');
    if (listaAgenda) {
      listaAgenda.innerHTML = '<p style="font-size: 13px; color: var(--sc-muted);">Não foi possível carregar os agendamentos do banco.</p>';
    }
  }
}

async function carregarServicos() {
  try {
    const response = await fetch(`${API_URL}/servicos`, { headers: headersPadrao });
    if (!response.ok) throw new Error('Erro ao buscar serviços');
    
    servicosGlobais = await response.json();
    const listaServicos = document.querySelector('.sc-service-list');
    if (!listaServicos) return;

    listaServicos.innerHTML = '';

    if (Array.isArray(servicosGlobais) && servicosGlobais.length > 0) {
      servicosGlobais.forEach(servico => {
        listaServicos.innerHTML += `
          <li class="sc-service-item">
            <div>
              <h3 class="sc-service-name">${servico.nome}</h3>
              <p class="sc-service-desc">${servico.descricao || ''}</p>
            </div>
            <div class="sc-service-price">R$${parseFloat(servico.preco || 0).toFixed(2)}</div>
            <div class="sc-service-actions">
              <button class="sc-btn sc-btn-outline sc-btn-sm" onclick="editarServico('${servico.id}')">✏ Editar</button>
            </div>
          </li>
        `;
      });
    } else {
      listaServicos.innerHTML = '<p style="font-size: 13px; color: var(--sc-muted);">Nenhum serviço cadastrado.</p>';
    }
  } catch (error) {
    console.error(error);
    const listaServicos = document.querySelector('.sc-service-list');
    if (listaServicos) {
      listaServicos.innerHTML = '<p style="font-size: 13px; color: var(--sc-muted);">Não foi possível carregar os serviços do banco.</p>';
    }
  }
}

async function carregarClientesEVeiculosSelect() {
  const selectCliente = document.getElementById('selectCliente');
  const selectVeiculo = document.getElementById('selectVeiculo');

  if (!selectCliente || !selectVeiculo) return;

  try {
    const response = await fetch(`${API_URL}/clientes-com-veiculos`, { headers: headersPadrao });
    if (!response.ok) throw new Error('Erro ao buscar clientes');

    clientesEVeiculosGlobais = await response.json();

    const clientesMap = new Map();
    clientesEVeiculosGlobais.forEach(item => {
      if (!clientesMap.has(item.clienteId)) {
        clientesMap.set(item.clienteId, item.clienteNome);
      }
    });

    selectCliente.innerHTML = '<option value="">Selecione um cliente...</option>';
    clientesMap.forEach((nome, id) => {
      selectCliente.innerHTML += `<option value="${id}">${nome}</option>`;
    });

    selectVeiculo.innerHTML = '<option value="">Selecione primeiro um cliente...</option>';
    selectVeiculo.disabled = true;

  } catch (error) {
    console.error(error);
    selectCliente.innerHTML = '<option value="">Erro ao carregar lista de clientes</option>';
  }
}

document.getElementById('selectCliente')?.addEventListener('change', (e) => {
  const clienteId = e.target.value;
  const selectVeiculo = document.getElementById('selectVeiculo');

  if (!selectVeiculo) return;

  if (!clienteId) {
    selectVeiculo.innerHTML = '<option value="">Selecione primeiro um cliente...</option>';
    selectVeiculo.disabled = true;
    return;
  }

  const veiculosDoCliente = clientesEVeiculosGlobais.filter(item => item.clienteId == clienteId);

  if (veiculosDoCliente.length === 0) {
    selectVeiculo.innerHTML = '<option value="">Nenhum veículo cadastrado para este cliente</option>';
    selectVeiculo.disabled = true;
  } else {
    selectVeiculo.innerHTML = '<option value="">Selecione o veículo...</option>';
    veiculosDoCliente.forEach(item => {
      selectVeiculo.innerHTML += `<option value="${item.veiculoId}">${item.veiculoModelo} - Placa: ${item.veiculoPlaca} (${item.veiculoCor || 'Cor N/I'})</option>`;
    });
    selectVeiculo.disabled = false;
  }
});

function renderizarServicosModalAgendamento() {
  const container = document.getElementById('modalSvcGrid');
  if (!container) return;

  if (servicosGlobais.length === 0) {
    container.innerHTML = '<p style="font-size:12px; color:var(--sc-hint);">Nenhum serviço cadastrado.</p>';
    return;
  }

  container.innerHTML = '';
  servicosGlobais.forEach(s => {
    const card = document.createElement('div');
    card.className = 'sc-svc-card';
    card.dataset.id = s.id;
    card.dataset.preco = s.preco;

    card.innerHTML = `
      <div class="sc-svc-info">
        <h4>${s.nome}</h4>
        <p>${s.descricao || ''}</p>
      </div>
      <div class="sc-svc-price">R$ ${parseFloat(s.preco || 0).toFixed(2)}</div>
    `;

    card.addEventListener('click', () => {
      card.classList.toggle('selected');
      atualizarTotalAgendamentoModal();
    });

    container.appendChild(card);
  });
}

function atualizarTotalAgendamentoModal() {
  const cards = document.querySelectorAll('.sc-svc-card.selected');
  let total = 0;
  servicosSelecionadosAgendamento = [];

  cards.forEach(c => {
    total += parseFloat(c.dataset.preco || 0);
    servicosSelecionadosAgendamento.push(c.dataset.id);
  });

  const displayTotal = document.getElementById('modalAgendamentoTotal');
  if (displayTotal) {
    displayTotal.textContent = `R$ ${total.toFixed(2)}`;
  }
}

// ==========================================
// INICIALIZAÇÃO DA PÁGINA E CONTROLES
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  carregarMetricas();
  carregarAgendamentos();
  carregarServicos();

  const buttons = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  function switchTab(targetId) {
    if (!targetId) return;

    buttons.forEach(btn => btn.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));

    const activeButtons = document.querySelectorAll(`.tab-btn[data-target="${targetId}"]`);
    activeButtons.forEach(btn => btn.classList.add('active'));

    const activeContent = document.getElementById(targetId);
    if (activeContent) {
      activeContent.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const initialHash = window.location.hash.replace('#', '');
  if (initialHash && document.getElementById(initialHash)) {
    switchTab(initialHash);
  } else {
    switchTab('dashboard');
  }

  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-target');
      if (target) {
        switchTab(target);
        window.location.hash = target;
      }
    });
  });

  // Modal Cadastrar Novo Cliente / Veículo
  const modalNovoCliente = document.getElementById('modalNovoCliente');
  const btnNovoCliente = document.getElementById('btnNovoCliente');
  const btnFecharModal = document.getElementById('btnFecharModal');
  const btnCancelarModal = document.getElementById('btnCancelarModal');
  const btnVoltarPasso1 = document.getElementById('btnVoltarPasso1');

  const modalStepBadge = document.getElementById('modalStepBadge');
  const modalTitle = document.getElementById('modalTitle');
  const formStepCliente = document.getElementById('formStepCliente');
  const formStepVeiculo = document.getElementById('formStepVeiculo');

  let dadosClienteTemp = null;

  function irParaPasso1() {
    if (modalStepBadge) modalStepBadge.textContent = 'PASSO 1 DE 2';
    if (modalTitle) modalTitle.textContent = 'Cadastrar Novo Cliente';
    if (formStepCliente) formStepCliente.style.display = 'block';
    if (formStepVeiculo) formStepVeiculo.style.display = 'none';
  }

  function irParaPasso2() {
    if (modalStepBadge) modalStepBadge.textContent = 'PASSO 2 DE 2';
    if (modalTitle) modalTitle.textContent = 'Cadastrar Veículo do Cliente';
    if (formStepCliente) formStepCliente.style.display = 'none';
    if (formStepVeiculo) formStepVeiculo.style.display = 'block';
  }

  function abrirModalCliente() {
    irParaPasso1();
    if (modalNovoCliente) modalNovoCliente.classList.add('active');
  }

  function fecharModalCliente() {
    if (modalNovoCliente) {
      modalNovoCliente.classList.remove('active');
      dadosClienteTemp = null;
      if (formStepCliente) formStepCliente.reset();
      if (formStepVeiculo) formStepVeiculo.reset();
      irParaPasso1();
    }
  }

  if (btnNovoCliente) btnNovoCliente.addEventListener('click', abrirModalCliente);
  if (btnFecharModal) btnFecharModal.addEventListener('click', fecharModalCliente);
  if (btnCancelarModal) btnCancelarModal.addEventListener('click', fecharModalCliente);
  if (btnVoltarPasso1) btnVoltarPasso1.addEventListener('click', irParaPasso1);

  if (formStepCliente) {
    formStepCliente.addEventListener('submit', (e) => {
      e.preventDefault();
      dadosClienteTemp = {
        nome: document.getElementById('clienteNome')?.value.trim(),
        cpf: document.getElementById('clienteCpf')?.value.trim(),
        telefone: document.getElementById('clienteTelefone')?.value.trim()
      };
      irParaPasso2();
    });
  }

  if (formStepVeiculo) {
    formStepVeiculo.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payloadFinal = {
        cliente: dadosClienteTemp,
        veiculo: {
          placa: document.getElementById('veiculoPlaca')?.value.trim(),
          tipo: document.getElementById('veiculoTipo')?.value,
          marca: document.getElementById('veiculoMarca')?.value.trim(),
          modelo: document.getElementById('veiculoModelo')?.value.trim(),
          ano: document.getElementById('veiculoAno')?.value ? parseInt(document.getElementById('veiculoAno').value) : null,
          cor: document.getElementById('veiculoCor')?.value.trim(),
          observacao: document.getElementById('veiculoObservacao')?.value.trim()
        }
      };

      try {
        const response = await fetch(`${API_URL}/clientes-com-veiculo`, {
          method: 'POST',
          headers: headersPadrao,
          body: JSON.stringify(payloadFinal)
        });

        if (!response.ok) throw new Error('Erro ao cadastrar cliente e veículo.');

        alert('Cliente e Veículo cadastrados com sucesso!');
        fecharModalCliente();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  // Modal Agendar Serviço
  const modalAgendarServico = document.getElementById('modalAgendarServico');
  const btnAgendarCliente = document.getElementById('btnAgendarCliente');
  const btnFecharModalAgendamento = document.getElementById('btnFecharModalAgendamento');
  const btnCancelarAgendamento = document.getElementById('btnCancelarAgendamento');
  const formAgendarServico = document.getElementById('formAgendarServico');

  function abrirModalAgendamento() {
    carregarClientesEVeiculosSelect();
    renderizarServicosModalAgendamento();
    atualizarTotalAgendamentoModal();
    if (modalAgendarServico) modalAgendarServico.classList.add('active');
  }

  function fecharModalAgendamento() {
    if (modalAgendarServico) {
      modalAgendarServico.classList.remove('active');
      if (formAgendarServico) formAgendarServico.reset();
      servicosSelecionadosAgendamento = [];
      const selectVeiculo = document.getElementById('selectVeiculo');
      if (selectVeiculo) {
        selectVeiculo.innerHTML = '<option value="">Selecione primeiro um cliente...</option>';
        selectVeiculo.disabled = true;
      }
      atualizarTotalAgendamentoModal();
    }
  }

  if (btnAgendarCliente) btnAgendarCliente.addEventListener('click', abrirModalAgendamento);
  if (btnFecharModalAgendamento) btnFecharModalAgendamento.addEventListener('click', fecharModalAgendamento);
  if (btnCancelarAgendamento) btnCancelarAgendamento.addEventListener('click', fecharModalAgendamento);

  if (formAgendarServico) {
    formAgendarServico.addEventListener('submit', async (e) => {
      e.preventDefault();

      const clienteId = document.getElementById('selectCliente')?.value;
      const veiculoId = document.getElementById('selectVeiculo')?.value;
      const data = document.getElementById('agendamentoData')?.value;
      const horario = document.getElementById('agendamentoHorario')?.value;
      const observacao = document.getElementById('agendamentoObs')?.value.trim();

      if (!clienteId) {
        alert('Selecione um cliente.');
        return;
      }

      if (!veiculoId) {
        alert('Selecione um veículo para continuar.');
        return;
      }

      if (servicosSelecionadosAgendamento.length === 0) {
        alert('Selecione ao menos um tipo de serviço.');
        return;
      }

      const payload = {
        clienteId,
        veiculoId,
        servicoIds: servicosSelecionadosAgendamento,
        data,
        horario,
        observacao
      };

      try {
        const response = await fetch(`${API_URL}/agendamentos`, {
          method: 'POST',
          headers: headersPadrao,
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Erro ao realizar agendamento.');

        alert('Agendamento realizado com sucesso!');
        fecharModalAgendamento();
        carregarAgendamentos();
      } catch (error) {
        alert(error.message);
      }
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === modalNovoCliente) fecharModalCliente();
    if (e.target === modalAgendarServico) fecharModalAgendamento();
  });
});

function verOS(id) {
  alert(`Abrindo Ordem de Serviço ID: ${id}`);
}

function editarServico(id) {
  alert(`Editando serviço ID: ${id}`);
}

window.verOS = verOS;
window.editarServico = editarServico;