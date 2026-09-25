/* Stop Clean - Gerenciamento de Funcionários */

(() => {
  const API = window.StopCleanAPI
  if (!API || !API.exigirLogin()) return

  let modoModal = 'NOVO'
  let filtroStatusAtual = 'Todos'

  const $ = id => document.getElementById(id)
  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')

  async function carregarFuncionarios() {
    const container = document.querySelector('.sc-team-list')
    if (!container) return

    try {
      const funcionarios = await API.get('/funcionarios')
      container.innerHTML = ''

      if (!funcionarios.length) {
        container.innerHTML = '<p style="padding:20px;color:var(--sc-muted);">Nenhum funcionário cadastrado.</p>'
      } else {
        funcionarios.forEach(f => {
          const ativo = f.status !== false
          const iniciais = String(f.nome || 'F').split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
          container.insertAdjacentHTML('beforeend', `
            <article class="sc-team-item" data-id="${f.id}">
              <div class="sc-avatar" aria-hidden="true">${escapeHtml(iniciais)}</div>
              <div class="sc-team-info">
                <h2 class="sc-team-name">${escapeHtml(f.nome || 'Sem nome')}</h2>
                <p class="sc-team-role">${escapeHtml(f.cargo || 'Funcionário')}</p>
                <p class="sc-team-meta">${escapeHtml(f.email || f.telefone || '')}</p>
              </div>
              <span class="sc-status ${ativo ? 'ativo' : 'inativo'}"><span class="sc-status-dot"></span>${ativo ? 'Ativo' : 'Inativo'}</span>
              <div class="sc-team-actions">
                <button class="sc-btn sc-btn-outline sc-btn-sm" onclick="abrirModalEditar(${f.id})">✏ Editar</button>
                <button class="sc-btn sc-btn-primary sc-btn-sm" onclick="abrirModalPermissoes(${f.id})">Permissões</button>
                <button class="sc-btn sc-btn-danger sc-btn-sm" onclick="deletarFuncionario(${f.id})">Excluir</button>
              </div>
            </article>
          `)
        })
      }
    } catch (error) {
      container.innerHTML = `<p style="padding:20px;color:var(--sc-muted);">${escapeHtml(error.message)}</p>`
    }

    atualizarEstatisticas()
    aplicarFiltros()
  }

  function atualizarEstatisticas() {
    const itens = document.querySelectorAll('.sc-team-item')
    let ativos = 0
    itens.forEach(item => item.querySelector('.sc-status')?.classList.contains('ativo') && ativos++)
    $('stat-total').textContent = itens.length
    $('stat-ativos').textContent = ativos
    $('stat-inativos').textContent = itens.length - ativos
  }

  function aplicarFiltros() {
    const termo = ($('sc-search-input')?.value || '').toLowerCase().trim()
    document.querySelectorAll('.sc-team-item').forEach(item => {
      const texto = item.textContent.toLowerCase()
      const ativo = item.querySelector('.sc-status')?.classList.contains('ativo')
      const statusOk = filtroStatusAtual === 'Todos' || (filtroStatusAtual === 'Ativos' && ativo) || (filtroStatusAtual === 'Inativos' && !ativo)
      item.style.display = statusOk && texto.includes(termo) ? 'flex' : 'none'
    })
  }

  function setFilter(btn) {
    document.querySelectorAll('.sc-filter-btn').forEach(b => {
      b.classList.remove('active')
      b.setAttribute('aria-pressed', 'false')
    })
    btn.classList.add('active')
    btn.setAttribute('aria-pressed', 'true')
    filtroStatusAtual = btn.textContent.trim()
    aplicarFiltros()
  }

  function limparPermissoes() {
    document.querySelectorAll('input[name="permissoes"]').forEach(cb => { cb.checked = false })
  }

  async function carregarPermissoesDoFuncionario(id) {
    limparPermissoes()
    const registros = await API.get('/funcionarioPermissoes')
    const ids = registros.filter(p => Number(p.idFuncionario) === Number(id)).map(p => Number(p.idPermissao))
    document.querySelectorAll('input[name="permissoes"]').forEach(cb => { cb.checked = ids.includes(Number(cb.value)) })
  }

  async function abrirModalNovo() {
    modoModal = 'NOVO'
    $('formNovoFuncionario')?.reset()
    $('fId').value = ''
    $('fSenha').required = true
    $('titulo-dados').innerHTML = 'NOVO <span>FUNCIONÁRIO</span>'
    $('subtitulo-dados').textContent = 'Etapa 1 de 2: Informações de Cadastro'
    $('btn-avancar').style.display = 'inline-flex'
    $('btn-salvar-dados').style.display = 'none'
    $('btn-voltar-perm').style.display = 'inline-flex'
    $('btn-cancelar-perm').style.display = 'none'
    limparPermissoes()
    irParaDados()
    openModal()
  }

  async function abrirModalEditar(id) {
    modoModal = 'EDITAR_DADOS'
    $('fId').value = id
    $('fSenha').required = false
    $('titulo-dados').innerHTML = 'EDITAR <span>FUNCIONÁRIO</span>'
    $('subtitulo-dados').textContent = 'Altere as informações de cadastro do funcionário'
    $('btn-avancar').style.display = 'none'
    $('btn-salvar-dados').style.display = 'inline-flex'

    try {
      const f = await API.get(`/funcionarios/${id}`)
      ;['Nome','Cpf','Email','Telefone','Cargo','Salario','Cep','Endereco','Numero','Bairro','Estado'].forEach(campo => {
        const el = $(`f${campo}`)
        if (el) el.value = f[campo.charAt(0).toLowerCase() + campo.slice(1)] ?? ''
      })
      $('fStatus').value = f.status === false ? 'false' : 'true'
    } catch (error) {
      alert(error.message)
      return
    }

    irParaDados()
    openModal()
  }

  async function abrirModalPermissoes(id) {
    modoModal = 'EDITAR_PERMISSOES'
    $('fId').value = id
    $('subtitulo-permissoes').textContent = 'Gerencie as permissões de acesso deste funcionário'
    $('btn-voltar-perm').style.display = 'none'
    $('btn-cancelar-perm').style.display = 'inline-flex'
    try {
      await carregarPermissoesDoFuncionario(id)
      irParaPermissoesDirectly()
      openModal()
    } catch (error) {
      alert(error.message)
    }
  }

  function irParaDados() {
    $('step-permissoes')?.classList.remove('active')
    $('step-dados')?.classList.add('active')
  }

  function irParaPermissoes() {
    if (!$('fNome').value.trim() || !$('fEmail').value.trim() || (modoModal === 'NOVO' && !$('fSenha').value)) {
      alert('Preencha nome, e-mail e senha para continuar.')
      return
    }
    irParaPermissoesDirectly()
  }

  function irParaPermissoesDirectly() {
    $('step-dados')?.classList.remove('active')
    $('step-permissoes')?.classList.add('active')
  }

  function openModal() { $('modalNovo')?.classList.add('open') }
  function closeModal() { $('modalNovo')?.classList.remove('open') }

  async function salvarPermissoes(id) {
    const selecionadas = [...document.querySelectorAll('input[name="permissoes"]:checked')].map(cb => Number(cb.value))
    const atuais = await API.get('/funcionarioPermissoes')
    const doFuncionario = atuais.filter(p => Number(p.idFuncionario) === Number(id))

    for (const registro of doFuncionario) {
      await API.del(`/funcionarioPermissoes/${registro.id}`)
    }
    for (const idPermissao of selecionadas) {
      await API.post('/funcionarioPermissoes', { idFuncionario: Number(id), idPermissao })
    }
  }

  async function salvarFuncionario(event) {
    event.preventDefault()
    const id = $('fId').value
    const dados = {
      nome: $('fNome').value.trim(),
      cpf: $('fCpf').value.trim() || null,
      email: $('fEmail').value.trim() || null,
      telefone: $('fTelefone').value.trim() || null,
      cargo: $('fCargo').value.trim() || null,
      salario: $('fSalario').value ? Number($('fSalario').value) : null,
      status: $('fStatus').value === 'true',
      cep: $('fCep').value.trim() || null,
      endereco: $('fEndereco').value.trim() || null,
      numero: $('fNumero').value.trim() || null,
      bairro: $('fBairro').value.trim() || null,
      estado: $('fEstado').value.trim() || null
    }

    if ($('fSenha').value) dados.senha = $('fSenha').value

    try {
      let funcionario
      if (modoModal === 'EDITAR_PERMISSOES') {
        await salvarPermissoes(id)
      } else if (modoModal === 'EDITAR_DADOS') {
        funcionario = await API.put(`/funcionarios/${id}`, dados)
      } else {
        if (!dados.senha) throw new Error('A senha é obrigatória.')
        funcionario = await API.post('/funcionarios', dados)
        await salvarPermissoes(funcionario.id)
      }

      alert('Operação realizada com sucesso!')
      closeModal()
      await carregarFuncionarios()
    } catch (error) {
      alert(error.message)
    }
  }

  async function deletarFuncionario(id) {
    if (!confirm('Deseja realmente excluir este funcionário?')) return
    try {
      await API.del(`/funcionarios/${id}`)
      alert('Funcionário excluído com sucesso!')
      await carregarFuncionarios()
    } catch (error) {
      alert(error.message)
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('sc-search-input')?.addEventListener('input', aplicarFiltros)
    carregarFuncionarios()
    document.querySelector('.sc-badge')?.replaceChildren(document.createTextNode('★ Funcionário'))
  })

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal() })

  window.setFilter = setFilter
  window.abrirModalNovo = abrirModalNovo
  window.abrirModalEditar = abrirModalEditar
  window.abrirModalPermissoes = abrirModalPermissoes
  window.irParaDados = irParaDados
  window.irParaPermissoes = irParaPermissoes
  window.openModal = openModal
  window.closeModal = closeModal
  window.salvarFuncionario = salvarFuncionario
  window.deletarFuncionario = deletarFuncionario
})()
