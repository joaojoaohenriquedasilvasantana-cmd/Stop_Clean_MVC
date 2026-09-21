/**
 * Stop Clean - Gerenciamento de Funcionários (Light Mode)
 */
import API_BASE_URL from './api.js';

const baseUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;
const token = localStorage.getItem('token');
const headersPadrao = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

let modoModal = 'NOVO';
let filtroStatusAtual = 'Todos';

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('sc-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', aplicarFiltros);
  }

  carregarFuncionarios();
});

async function carregarFuncionarios() {
  const container = document.getElementById('sc-team-list') || document.querySelector('.sc-team-list');
  
  try {
    const response = await fetch(`${baseUrl}/funcionarios`, { headers: headersPadrao });
    if (!response.ok) throw new Error('Erro ao buscar funcionários.');
    
    const funcionarios = await response.json();

    if (container && Array.isArray(funcionarios) && funcionarios.length > 0) {
      container.innerHTML = '';
      funcionarios.forEach(f => {
        const isAtivo = f.status === true || f.status === 'ativo' || f.status === 1;
        const statusClass = isAtivo ? 'ativo' : 'inativo';
        const statusText = isAtivo ? 'Ativo' : 'Inativo';

        container.innerHTML += `
          <div class="sc-team-item" data-id="${f.id}">
            <div class="sc-team-info">
              <h3 class="sc-team-name">${f.nome}</h3>
              <p class="sc-team-meta">${f.cargo || 'Funcionário'} · ${f.email || f.telefone || ''}</p>
            </div>
            <span class="sc-status ${statusClass}">${statusText}</span>
            <div class="sc-team-actions">
              <button class="sc-btn sc-btn-outline sc-btn-sm" onclick="abrirModalEditar('${f.id}')">Editar</button>
              <button class="sc-btn sc-btn-outline sc-btn-sm" onclick="abrirModalPermissoes('${f.id}')">Permissões</button>
              <button class="sc-btn sc-btn-danger sc-btn-sm" onclick="deletarFuncionario('${f.id}')">Excluir</button>
            </div>
          </div>
        `;
      });
    }
  } catch (error) {
    console.error('Erro ao carregar lista de funcionários:', error);
  } finally {
    atualizarEstatisticas();
    aplicarFiltros();
  }
}

function atualizarEstatisticas() {
  const itens = document.querySelectorAll('.sc-team-item');
  let total = itens.length;
  let ativos = 0;
  let inativos = 0;

  itens.forEach(item => {
    const statusElement = item.querySelector('.sc-status');
    if (statusElement && statusElement.classList.contains('ativo')) {
      ativos++;
    } else {
      inativos++;
    }
  });

  const elTotal = document.getElementById('stat-total');
  const elAtivos = document.getElementById('stat-ativos');
  const elInativos = document.getElementById('stat-inativos');

  if (elTotal) elTotal.textContent = total;
  if (elAtivos) elAtivos.textContent = ativos;
  if (elInativos) elInativos.textContent = inativos;
}

function aplicarFiltros() {
  const termoBusca = document.getElementById('sc-search-input')?.value.toLowerCase().trim() || '';
  const itens = document.querySelectorAll('.sc-team-item');

  itens.forEach(item => {
    const nome = item.querySelector('.sc-team-name')?.textContent.toLowerCase() || '';
    const meta = item.querySelector('.sc-team-meta')?.textContent.toLowerCase() || '';
    const statusElement = item.querySelector('.sc-status');
    const isAtivo = statusElement ? statusElement.classList.contains('ativo') : false;

    let passaStatus = false;
    if (filtroStatusAtual === 'Todos') {
      passaStatus = true;
    } else if (filtroStatusAtual === 'Ativos' && isAtivo) {
      passaStatus = true;
    } else if (filtroStatusAtual === 'Inativos' && !isAtivo) {
      passaStatus = true;
    }

    const passaTexto = nome.includes(termoBusca) || meta.includes(termoBusca);

    if (passaStatus && passaTexto) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

function setFilter(btn) {
  document.querySelectorAll('.sc-filter-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });

  btn.classList.add('active');
  btn.setAttribute('aria-pressed', 'true');

  filtroStatusAtual = btn.textContent.trim();
  aplicarFiltros();
}

function abrirModalNovo() {
  modoModal = 'NOVO';
  document.getElementById('formNovoFuncionario')?.reset();
  if (document.getElementById('fId')) document.getElementById('fId').value = '';

  document.getElementById('titulo-dados').innerHTML = 'NOVO <span>FUNCIONÁRIO</span>';
  document.getElementById('subtitulo-dados').innerText = 'Etapa 1 de 2: Informações de Cadastro';
  
  document.getElementById('btn-avancar').style.display = 'inline-flex';
  document.getElementById('btn-salvar-dados').style.display = 'none';

  document.getElementById('subtitulo-permissoes').innerText = 'Etapa 2 de 2: Selecione as telas e acessos permitidos';
  document.getElementById('btn-voltar-perm').style.display = 'inline-flex';
  document.getElementById('btn-cancelar-perm').style.display = 'none';

  irParaDados();
  openModal();
}

async function abrirModalEditar(idFuncionario) {
  modoModal = 'EDITAR_DADOS';
  document.getElementById('fId').value = idFuncionario;

  document.getElementById('titulo-dados').innerHTML = 'EDITAR <span>FUNCIONÁRIO</span>';
  document.getElementById('subtitulo-dados').innerText = 'Altere as informações de cadastro do funcionário';

  document.getElementById('btn-avancar').style.display = 'none';
  document.getElementById('btn-salvar-dados').style.display = 'inline-flex';

  try {
    const res = await fetch(`${baseUrl}/funcionarios/${idFuncionario}`, { headers: headersPadrao });
    if (res.ok) {
      const f = await res.json();
      if (document.getElementById('fNome')) document.getElementById('fNome').value = f.nome || '';
      if (document.getElementById('fCpf')) document.getElementById('fCpf').value = f.cpf || '';
      if (document.getElementById('fEmail')) document.getElementById('fEmail').value = f.email || '';
      if (document.getElementById('fTelefone')) document.getElementById('fTelefone').value = f.telefone || '';
      if (document.getElementById('fCargo')) document.getElementById('fCargo').value = f.cargo || '';
      if (document.getElementById('fSalario')) document.getElementById('fSalario').value = f.salario || '';
      if (document.getElementById('fStatus')) document.getElementById('fStatus').value = f.status ? 'true' : 'false';
    }
  } catch (err) {
    console.error('Erro ao buscar dados do funcionário:', err);
  }

  irParaDados();
  openModal();
}

async function abrirModalPermissoes(idFuncionario) {
  modoModal = 'EDITAR_PERMISSOES';
  document.getElementById('fId').value = idFuncionario;

  document.getElementById('subtitulo-permissoes').innerText = 'Gerencie as permissões de acesso deste funcionário';
  document.getElementById('btn-voltar-perm').style.display = 'none';
  document.getElementById('btn-cancelar-perm').style.display = 'inline-flex';

  irParaPermissoesDirectly();
  openModal();
}

function irParaDados() {
  document.getElementById('step-permissoes')?.classList.remove('active');
  document.getElementById('step-dados')?.classList.add('active');
}

function irParaPermissoes() {
  const nome = document.getElementById('fNome')?.value;
  const senha = document.getElementById('fSenha')?.value;

  if (modoModal === 'NOVO' && (!nome || !senha)) {
    alert('Por favor, preencha os campos obrigatórios (*): Nome e Senha.');
    return;
  }
  irParaPermissoesDirectly();
}

function irParaPermissoesDirectly() {
  document.getElementById('step-dados')?.classList.remove('active');
  document.getElementById('step-permissoes')?.classList.add('active');
}

function openModal() {
  const modal = document.getElementById('modalNovo');
  if (modal) modal.classList.add('open');
}

function closeModal() {
  const modal = document.getElementById('modalNovo');
  if (modal) modal.classList.remove('open');
}

document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') closeModal();
});

async function salvarFuncionario(event) {
  event.preventDefault();

  const id = document.getElementById('fId').value;

  const dadosFuncionario = {
    nome: document.getElementById('fNome')?.value || '',
    cpf: document.getElementById('fCpf')?.value || null,
    email: document.getElementById('fEmail')?.value || null,
    telefone: document.getElementById('fTelefone')?.value || null,
    cargo: document.getElementById('fCargo')?.value || null,
    salario: document.getElementById('fSalario')?.value ? parseFloat(document.getElementById('fSalario').value) : null,
    senha: document.getElementById('fSenha')?.value || undefined,
    status: document.getElementById('fStatus')?.value === 'true',
    cep: document.getElementById('fCep')?.value || null,
    endereco: document.getElementById('fEndereco')?.value || null,
    numero: document.getElementById('fNumero')?.value || null,
    bairro: document.getElementById('fBairro')?.value || null,
    estado: document.getElementById('fEstado')?.value || null
  };

  const permissoesSelecionadas = Array.from(
    document.querySelectorAll('input[name="permissoes"]:checked')
  ).map(cb => parseInt(cb.value));

  try {
    let response;
    if (modoModal === 'EDITAR_DADOS') {
      response = await fetch(`${baseUrl}/funcionarios/${id}`, {
        method: 'PUT',
        headers: headersPadrao,
        body: JSON.stringify(dadosFuncionario)
      });
    } else if (modoModal === 'EDITAR_PERMISSOES') {
      response = await fetch(`${baseUrl}/funcionarios/${id}`, {
        method: 'PUT',
        headers: headersPadrao,
        body: JSON.stringify({ permissoes: permissoesSelecionadas })
      });
    } else {
      response = await fetch(`${baseUrl}/funcionarios`, {
        method: 'POST',
        headers: headersPadrao,
        body: JSON.stringify({ ...dadosFuncionario, permissoes: permissoesSelecionadas })
      });
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || errData.mensagem || 'Erro ao salvar funcionário.');
    }

    alert('Operação realizada com sucesso!');
    closeModal();
    carregarFuncionarios();
  } catch (error) {
    alert(error.message);
  }
}

async function deletarFuncionario(idFuncionario) {
  if (!confirm('Deseja realmente excluir este funcionário?')) return;

  try {
    const response = await fetch(`${baseUrl}/funcionarios/${idFuncionario}`, {
      method: 'DELETE',
      headers: headersPadrao
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || errData.mensagem || 'Erro ao excluir funcionário.');
    }

    alert('Funcionário excluído com sucesso!');
    carregarFuncionarios();
  } catch (error) {
    alert(error.message);
  }
}

// Expõe funções no escopo global para eventos inline de botões HTML
window.setFilter = setFilter;
window.abrirModalNovo = abrirModalNovo;
window.abrirModalEditar = abrirModalEditar;
window.abrirModalPermissoes = abrirModalPermissoes;
window.irParaDados = irParaDados;
window.irParaPermissoes = irParaPermissoes;
window.openModal = openModal;
window.closeModal = closeModal;
window.salvarFuncionario = salvarFuncionario;
window.deletarFuncionario = deletarFuncionario;