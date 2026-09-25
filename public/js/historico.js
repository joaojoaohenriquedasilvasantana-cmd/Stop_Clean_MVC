(() => {
  const API = window.StopCleanAPI
  if (!API || !API.exigirLogin()) return

  const usuario = API.getUsuario() || {}
  const modoFuncionario = usuario.tipo === 'funcionario'
  let registros = []
  const $ = id => document.getElementById(id)
  const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  const moeda = v => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
  const hora = v => { if(!v)return '-'; if(typeof v==='string' && /^\d{2}:\d{2}/.test(v))return v.slice(0,5); const d=new Date(v); return Number.isNaN(d.getTime())?String(v).slice(0,5):`${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}` }
  const data = v => String(v||'').slice(0,10)
  const statusLabel = s => ({AGENDADO:'Agendado',EM_ANDAMENTO:'Em Andamento',FINALIZADO:'Finalizado',CANCELADO:'Cancelado'}[s]||s)

  function montarQuery() {
    const params = new URLSearchParams()
    const q = $('filter-search')?.value.trim()
    const status = $('filter-status')?.value
    const dataInicio = $('filter-data-inicio')?.value
    const dataFim = $('filter-data-fim')?.value
    if (q) params.set('q', q)
    if (status && status !== 'TODOS') params.set('status', status)
    if (dataInicio) params.set('dataInicio', dataInicio)
    if (dataFim) params.set('dataFim', dataFim)
    return params.toString()
  }

  async function carregar({filtrar = false} = {}) {
    const query = filtrar ? montarQuery() : ''
    const ags = await API.get(`/agendamentos${query ? `?${query}` : ''}`)
    registros = Array.isArray(ags) ? ags : []

    // As métricas representam o conjunto retornado pela API no momento da pesquisa.
    $('stat-total-lavagens').textContent = registros.filter(x=>x.statusAgendamento==='FINALIZADO').length
    if (modoFuncionario) {
      $('stat-tokens').textContent = '-'
    } else {
      try {
        const cliente = await API.get(`/clientes/${usuario.id}`)
        $('stat-tokens').textContent = cliente?.tokens ?? 0
        if (!filtrar) $('stat-total-lavagens').textContent = cliente?.totalLavagens ?? registros.filter(x=>x.statusAgendamento==='FINALIZADO').length
      } catch (_) {
        $('stat-tokens').textContent = '0'
      }
    }
    $('stat-total-gasto').textContent = moeda(registros.filter(x=>x.statusAgendamento==='FINALIZADO').reduce((s,x)=>s+Number(x.valorTotal||0),0))
    render(registros)
  }

  function render(lista) {
    const container=$('historico-container'); container.innerHTML=''; $('results-count').textContent=`${lista.length} registro(s) encontrado(s)`
    $('empty-state').classList.toggle('hidden',lista.length>0)
    lista.forEach(item=>{
      const v=item.veiculo||{}, nomes=(item.servicos||[]).map(s=>s.servico?.nome).filter(Boolean).join(', ')||'Serviço não informado'
      const d=new Date(`${data(item.data)}T00:00:00`)
      const card=document.createElement('article'); card.className='sc-history-card'
      card.innerHTML=`<div class="sc-card-date"><span class="sc-card-day">${String(d.getDate()).padStart(2,'0')}</span><span class="sc-card-month">${d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','')}</span><span class="sc-card-time">${esc(hora(item.horario))}</span></div><div><h3 class="sc-card-vehicle-title">${esc(`${v.marca||''} ${v.modelo||''}`.trim()||'Veículo')}</h3><p class="sc-card-vehicle-sub">Placa: ${esc(v.placa||'-')} | Cor: ${esc(v.cor||'-')}</p>${modoFuncionario ? `<p class="sc-card-vehicle-sub">Cliente: ${esc(item.cliente?.nome||'-')} | Telefone: ${esc(item.cliente?.telefone||'-')}</p>` : ''}</div><div><p class="sc-card-services"><strong>Serviços:</strong> ${esc(nomes)}</p></div><div class="sc-card-price-box"><span class="sc-badge status-${esc(item.statusAgendamento)}">${esc(statusLabel(item.statusAgendamento))}</span><div class="sc-card-price">${moeda(item.valorTotal)}</div></div><div class="sc-history-actions"><button class="sc-btn sc-btn-outline" onclick="abrirDetalhes(${item.id})">VER DETALHES</button>${item.statusAgendamento==='AGENDADO' ? `<button class="sc-btn sc-btn-danger" onclick="cancelarAgendamento(${item.id})">CANCELAR</button>` : ''}</div>`
      container.appendChild(card)
    })
  }

  window.abrirDetalhes = id => {
    const item=registros.find(x=>Number(x.id)===Number(id)); if(!item)return
    const v=item.veiculo||{}, cliente=item.cliente||{}
    $('modal-id').textContent=item.id
    $('modal-veiculo').textContent=`${v.marca||''} ${v.modelo||''}`.trim()||'Veículo'
    $('modal-placa').textContent=v.placa||'-'
    $('modal-data-hora').textContent=`${new Date(`${data(item.data)}T00:00:00`).toLocaleDateString('pt-BR')} às ${hora(item.horario)}`
    $('modal-token').textContent=item.tokenAplicado?'Sim (Gratuito)':'Não'
    $('modal-status').textContent=statusLabel(item.statusAgendamento)
    $('modal-status').className=`sc-badge status-${item.statusAgendamento}`
    $('modal-valor-total').textContent=moeda(item.valorTotal)
    const list=$('modal-servicos-list'); list.innerHTML=(item.servicos||[]).map(s=>`<li><span>${esc(s.servico?.nome||'Serviço')}</span><strong>${moeda(s.precoAplicado)}</strong></li>`).join('')
    if (modoFuncionario) {
      const detailGrid = document.querySelector('.sc-detail-grid')
      if (detailGrid && !$('modal-cliente')) {
        const box = document.createElement('div'); box.innerHTML='<small class="sc-label">Cliente:</small><strong id="modal-cliente" class="sc-value">--</strong><small class="sc-label">Telefone:</small><strong id="modal-telefone" class="sc-value">--</strong>'; detailGrid.appendChild(box)
      }
      if ($('modal-cliente')) $('modal-cliente').textContent=cliente.nome||'-'
      if ($('modal-telefone')) $('modal-telefone').textContent=cliente.telefone||'-'
    }
    if(item.obs){$('modal-obs').textContent=item.obs;$('modal-obs-box').classList.remove('hidden')}else{$('modal-obs-box').classList.add('hidden')}
    $('sc-modal-detalhes').setAttribute('aria-hidden','false')
  }

  function fechar(){ $('sc-modal-detalhes').setAttribute('aria-hidden','true') }

  window.cancelarAgendamento = async id => {
    const item = registros.find(x => Number(x.id) === Number(id))
    if (!item || item.statusAgendamento !== 'AGENDADO') return
    const confirmacao = confirm('Deseja cancelar este agendamento? Ele permanecerá salvo no histórico com status Cancelado.')
    if (!confirmacao) return
    try {
      await API.put(`/agendamentos/${id}/status`, { statusAgendamento: 'CANCELADO' })
      await carregar({ filtrar: Boolean(montarQuery()) })
      alert('Agendamento cancelado. O registro foi mantido no histórico.')
    } catch (error) {
      alert(error.message || 'Não foi possível cancelar o agendamento.')
    }
  }


  document.addEventListener('DOMContentLoaded',async()=>{
    if (modoFuncionario) {
      document.title = 'Histórico de Agendamentos | Stop Clean'
      $('historico-subtitulo').textContent = 'Consulta geral de agendamentos e serviços do lava-rápido.'
    }

    $('btn-pesquisar-filtros')?.addEventListener('click', async()=>{
      const btn=$('btn-pesquisar-filtros'); btn.disabled=true; btn.textContent='PESQUISANDO...'
      try { await carregar({filtrar:true}) } catch(e) { $('historico-container').innerHTML=`<p>${esc(e.message)}</p>` }
      finally { btn.disabled=false; btn.textContent='PESQUISAR' }
    })

    $('btn-limpar-filtros')?.addEventListener('click',async()=>{
      $('filter-search').value=''; $('filter-status').value='TODOS'; $('filter-data-inicio').value=''; $('filter-data-fim').value=''
      try { await carregar({filtrar:false}) } catch(e) { $('historico-container').innerHTML=`<p>${esc(e.message)}</p>` }
    })

    document.querySelectorAll('[data-close-modal]').forEach(x=>x.addEventListener('click',fechar))
    try { await carregar({filtrar:false}) } catch(e) { $('historico-container').innerHTML=`<p>${esc(e.message)}</p>` }
  })
})()
