(() => {
  const API = window.StopCleanAPI
  if (!API || !API.exigirLogin('funcionario')) return

  let servicos = []
  let tiposVeiculo = []
  let tiposServicos = []
  let editServicoId = null
  let editTipoVeiculoId = null
  let editTipoServicoId = null

  const $ = id => document.getElementById(id)
  const escapeHtml = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')
  const dinheiro = value => Number(value || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})

  async function carregarTudo() {
    const [s, tv, ts] = await Promise.all([
      API.get('/servicos'),
      API.get('/tipoVeiculos'),
      API.get('/tipoServicos')
    ])
    servicos = Array.isArray(s) ? s : []
    tiposVeiculo = Array.isArray(tv) ? tv : []
    tiposServicos = Array.isArray(ts) ? ts : []
    preencherSelects()
    renderServicos()
    renderTiposVeiculo()
    renderTiposServico()
  }

  function preencherSelects() {
    const s = $('selectServico')
    const t = $('selectTipoVeiculo')
    if (s) s.innerHTML = '<option value="">Selecione um serviço...</option>' + servicos.filter(x=>x.status!==false).map(x=>`<option value="${x.id}">${escapeHtml(x.nome)}</option>`).join('')
    if (t) t.innerHTML = '<option value="">Selecione o tipo...</option>' + tiposVeiculo.filter(x=>x.status!==false).map(x=>`<option value="${x.id}">${escapeHtml(x.nome)}</option>`).join('')
  }

  function renderServicos() {
    const body = $('tbodyServicos')
    if (!body) return
    body.innerHTML = servicos.length ? servicos.map(s => `
      <tr>
        <td>${s.id}</td>
        <td style="font-weight:600;">${escapeHtml(s.nome)}</td>
        <td>${escapeHtml(s.descricao || '-')}</td>
        <td>${s.contaFidelidade ? '<span class="sc-badge sc-badge-info">Sim</span>' : '<span class="sc-badge">Não</span>'}</td>
        <td>${s.status ? '<span class="sc-badge sc-badge-active">Ativo</span>' : '<span class="sc-badge">Inativo</span>'}</td>
        <td><div class="sc-actions-cell"><button class="sc-btn-icon" onclick="editarServico(${s.id})" title="Editar">✎</button><button class="sc-btn-icon delete" onclick="excluirServico(${s.id})" title="Excluir">🗑</button></div></td>
      </tr>`).join('') : '<tr><td colspan="6">Nenhum serviço cadastrado.</td></tr>'
  }

  function renderTiposVeiculo() {
    const body = $('tbodyTiposVeiculo')
    if (!body) return
    body.innerHTML = tiposVeiculo.length ? tiposVeiculo.map(t => `
      <tr><td>${t.id}</td><td>${escapeHtml(t.icone || '🚗')}</td><td style="font-weight:600;">${escapeHtml(t.nome)}</td><td>${t.status ? '<span class="sc-badge sc-badge-active">Ativo</span>' : '<span class="sc-badge">Inativo</span>'}</td><td><div class="sc-actions-cell"><button class="sc-btn-icon" onclick="editarTipoVeiculo(${t.id})">✎</button><button class="sc-btn-icon delete" onclick="excluirTipoVeiculo(${t.id})">🗑</button></div></td></tr>`).join('') : '<tr><td colspan="5">Nenhum tipo cadastrado.</td></tr>'
  }

  function renderTiposServico() {
    const body = $('tbodyPrecos')
    if (!body) return
    body.innerHTML = tiposServicos.length ? tiposServicos.map(ts => {
      const s = servicos.find(x=>x.id===ts.idServico)
      const t = tiposVeiculo.find(x=>x.id===ts.idTipoVeiculo)
      return `<tr><td>${ts.id}</td><td>${escapeHtml(s?.nome || '#'+ts.idServico)}</td><td>${escapeHtml(t?.nome || '#'+ts.idTipoVeiculo)}</td><td class="sc-price-tag">${dinheiro(ts.preco)}</td><td>${escapeHtml(ts.duracao)}</td><td><div class="sc-actions-cell"><button class="sc-btn-icon" onclick="editarTipoServico(${ts.id})">✎</button><button class="sc-btn-icon delete" onclick="excluirTipoServico(${ts.id})">🗑</button></div></td></tr>`
    }).join('') : '<tr><td colspan="6">Nenhuma configuração de preço cadastrada.</td></tr>'
  }

  function limparServico() { editServicoId=null; $('formServico')?.reset(); if($('servicoStatus')) $('servicoStatus').checked=true }
  function limparTipoVeiculo() { editTipoVeiculoId=null; $('formTipoVeiculo')?.reset(); if($('tipoStatus')) $('tipoStatus').checked=true }
  function limparTipoServico() { editTipoServicoId=null; $('formTipoServico')?.reset() }

  async function salvarServico(e) {
    e.preventDefault()
    const dados = { nome:$('servicoNome').value.trim(), descricao:$('servicoDescricao').value.trim() || null, status:$('servicoStatus').checked, contaFidelidade:$('servicoFidelidade').checked }
    try { if(editServicoId) await API.put(`/servicos/${editServicoId}`,dados); else await API.post('/servicos',dados); alert(editServicoId?'Serviço atualizado!':'Serviço cadastrado!'); limparServico(); await carregarTudo() } catch(err){ alert(err.message) }
  }

  async function salvarTipoVeiculo(e) {
    e.preventDefault()
    const dados = { nome:$('tipoNome').value.trim(), icone:$('tipoIcone').value.trim() || null, status:$('tipoStatus').checked }
    try { if(editTipoVeiculoId) await API.put(`/tipoVeiculos/${editTipoVeiculoId}`,dados); else await API.post('/tipoVeiculos',dados); alert(editTipoVeiculoId?'Tipo atualizado!':'Tipo cadastrado!'); limparTipoVeiculo(); await carregarTudo() } catch(err){ alert(err.message) }
  }

  async function salvarTipoServico(e) {
    e.preventDefault()
    const dados = { idServico:Number($('selectServico').value), idTipoVeiculo:Number($('selectTipoVeiculo').value), preco:Number($('precoValor').value), duracao:$('duracaoServico').value.trim() }
    if(!dados.idServico || !dados.idTipoVeiculo || !dados.preco || !dados.duracao){ alert('Preencha serviço, tipo, preço e duração.'); return }
    try { if(editTipoServicoId) await API.put(`/tipoServicos/${editTipoServicoId}`,dados); else await API.post('/tipoServicos',dados); alert(editTipoServicoId?'Preço atualizado!':'Preço vinculado!'); limparTipoServico(); await carregarTudo() } catch(err){ alert(err.message) }
  }

  window.editarServico = id => { const s=servicos.find(x=>x.id===id); if(!s)return; editServicoId=id; $('servicoNome').value=s.nome||''; $('servicoDescricao').value=s.descricao||''; $('servicoStatus').checked=s.status!==false; $('servicoFidelidade').checked=!!s.contaFidelidade; document.querySelector('[aria-controls="tab-servicos"]')?.click(); window.scrollTo({top:0,behavior:'smooth'}) }
  window.excluirServico = async id => { if(!confirm('Excluir este serviço?'))return; try{await API.del(`/servicos/${id}`);await carregarTudo()}catch(e){alert(e.message)} }
  window.editarTipoVeiculo = id => { const t=tiposVeiculo.find(x=>x.id===id); if(!t)return; editTipoVeiculoId=id; $('tipoNome').value=t.nome||''; $('tipoIcone').value=t.icone||''; $('tipoStatus').checked=t.status!==false; document.querySelector('[aria-controls="tab-veiculos"]')?.click(); window.scrollTo({top:0,behavior:'smooth'}) }
  window.excluirTipoVeiculo = async id => { if(!confirm('Excluir este tipo de veículo?'))return; try{await API.del(`/tipoVeiculos/${id}`);await carregarTudo()}catch(e){alert(e.message)} }
  window.editarTipoServico = id => { const ts=tiposServicos.find(x=>x.id===id); if(!ts)return; editTipoServicoId=id; $('selectServico').value=ts.idServico; $('selectTipoVeiculo').value=ts.idTipoVeiculo; $('precoValor').value=ts.preco; $('duracaoServico').value=ts.duracao||''; document.querySelector('[aria-controls="tab-precos"]')?.click(); window.scrollTo({top:0,behavior:'smooth'}) }
  window.excluirTipoServico = async id => { if(!confirm('Excluir esta configuração de preço?'))return; try{await API.del(`/tipoServicos/${id}`);await carregarTudo()}catch(e){alert(e.message)} }

  document.addEventListener('DOMContentLoaded', async () => {
    const usuario=API.getUsuario()||{}
    const greeting=$('user-greeting'); if(greeting) greeting.textContent=usuario.nome||'Funcionário'
    document.querySelectorAll('.sc-tab-btn').forEach(button=>button.addEventListener('click',()=>{
      document.querySelectorAll('.sc-tab-btn').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-selected','false')})
      document.querySelectorAll('.sc-tab-panel').forEach(c=>c.classList.remove('active'))
      button.classList.add('active');button.setAttribute('aria-selected','true');document.getElementById(button.getAttribute('aria-controls'))?.classList.add('active')
    }))
    $('formServico')?.addEventListener('submit',salvarServico)
    $('formTipoVeiculo')?.addEventListener('submit',salvarTipoVeiculo)
    $('formTipoServico')?.addEventListener('submit',salvarTipoServico)
    try{await carregarTudo()}catch(e){alert(e.message)}
  })
})()
