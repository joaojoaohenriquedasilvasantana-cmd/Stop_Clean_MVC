// public/js/cadastro_veiculo.js
// Controller da página CadastroVeiculo.html
// O HTML usa onclick/oninput/onsubmit inline (selectType, selectColor,
// updatePreview, formatPlaca, salvarVeiculo), por isso essas funções
// precisam ficar acessíveis em window.

let tipoVeiculoSelecionado = null
let corSelecionada = { nome: 'Preto', hex: '#111' }
let tiposVeiculoDoBanco = [] // [{ id, nome }]

document.addEventListener('DOMContentLoaded', async () => {
  if (!StopCleanAPI.exigirLogin()) return

  try {
    const resposta = await StopCleanAPI.get('/tipoVeiculos')
    tiposVeiculoDoBanco = (Array.isArray(resposta) ? resposta : []).filter(t => t.status !== false)
    renderizarTiposVeiculo()
  } catch (erro) {
    // Se não conseguir carregar os tipos agora, tenta de novo na hora de salvar
    console.error('Erro ao carregar tipos de veículo:', erro.message)
    document.getElementById('typeGrid').innerHTML = '<p class="type-loading">Não foi possível carregar os tipos. Atualize a página e tente novamente.</p>'
  }
})

function iconeTipo(nome, icone) {
  if (icone && /^[a-z0-9-]+$/i.test(icone)) return icone.startsWith('ti-') ? icone : `ti-${icone}`
  const n = String(nome || '').toLowerCase()
  if (n.includes('moto')) return 'ti-motorbike'
  if (n.includes('van')) return 'ti-van'
  if (n.includes('picape') || n.includes('caminh')) return 'ti-truck'
  if (n.includes('suv')) return 'ti-car-suv'
  return 'ti-car'
}
function renderizarTiposVeiculo() {
  const grid = document.getElementById('typeGrid')
  if (!grid) return
  if (!tiposVeiculoDoBanco.length) {
    grid.innerHTML = '<p class="type-loading">Nenhum tipo de veículo ativo está cadastrado. Procure um funcionário.</p>'
    tipoVeiculoSelecionado = null
    return
  }
  grid.innerHTML = tiposVeiculoDoBanco.map((tipo, i) => {
    const icone = iconeTipo(tipo.nome, tipo.icone)
    const nome = String(tipo.nome || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
    return `<button type="button" class="type-card${i === 0 ? ' selected' : ''}" data-id="${tipo.id}" data-nome="${nome}" data-icone="${icone}"><i class="ti ${icone}" aria-hidden="true"></i><span>${nome}</span></button>`
  }).join('')
  grid.querySelectorAll('.type-card').forEach(btn => btn.addEventListener('click', () => window.selectType(btn, btn.dataset.nome, btn.dataset.icone)))
  const primeiro = tiposVeiculoDoBanco[0]
  tipoVeiculoSelecionado = { id: primeiro.id, nome: primeiro.nome, icone: iconeTipo(primeiro.nome, primeiro.icone) }
  updatePreview()
}

// Clique em um card de tipo de veículo (Sedan, Hatch, SUV, ...)
window.selectType = function (elemento, nomeTipo, classeIcone) {
  document.querySelectorAll('.type-card').forEach(el => el.classList.remove('selected'))
  elemento.classList.add('selected')
  tipoVeiculoSelecionado = { id: Number(elemento.dataset.id), nome: nomeTipo, icone: classeIcone }
  updatePreview()
}

// Clique em uma cor
window.selectColor = function (elemento) {
  document.querySelectorAll('.color-opt').forEach(el => el.classList.remove('selected'))
  elemento.classList.add('selected')
  corSelecionada = { nome: elemento.dataset.color, hex: elemento.dataset.hex }
  updatePreview()
}

// Formata a placa em maiúsculas enquanto o usuário digita
window.formatPlaca = function (input) {
  input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
  updatePreview()
}

// Atualiza a pré-visualização do veículo conforme o formulário é preenchido
window.updatePreview = function () {
  const marca = document.getElementById('marca').value
  const modelo = document.getElementById('modelo').value
  const placa = document.getElementById('placa').value

  const previewModel = document.getElementById('previewModel')
  const previewSub = document.getElementById('previewSub')
  const previewPlaca = document.getElementById('previewPlaca')
  const previewIconI = document.getElementById('previewIconI')
  const previewColorDot = document.getElementById('previewColorDot')
  const previewColorName = document.getElementById('previewColorName')

  if (!marca && !modelo) {
    previewModel.textContent = 'Preencha os campos acima'
    previewModel.classList.add('empty')
    previewSub.style.display = 'none'
  } else {
    previewModel.textContent = `${marca} ${modelo}`.trim()
    previewModel.classList.remove('empty')
    previewSub.style.display = 'flex'
    previewPlaca.textContent = placa || '—'
  }

  previewIconI.className = `ti ${tipoVeiculoSelecionado?.icone || 'ti-car'}`
  previewColorDot.style.background = corSelecionada.hex
  previewColorName.textContent = corSelecionada.nome
}

// Encontra o id real do tipo de veículo no banco a partir do nome escolhido
// no card (ex.: "Sedan" -> id 3), comparando sem diferenciar maiúsculas.
function encontrarIdTipoVeiculo (nomeTipo) {
  const encontrado = tiposVeiculoDoBanco.find(t => String(t.id) === String(tipoVeiculoSelecionado?.id)) || tiposVeiculoDoBanco.find(t => t.nome.trim().toLowerCase() === nomeTipo.trim().toLowerCase())
  return encontrado ? encontrado.id : null
}

window.salvarVeiculo = async function (evento) {
  evento.preventDefault()

  const marca = document.getElementById('marca').value
  const modelo = document.getElementById('modelo').value.trim()
  const ano = document.getElementById('ano').value
  const placa = document.getElementById('placa').value.trim()
  const obs = document.getElementById('obs').value.trim()

  if (!marca || !modelo || !placa || placa.length !== 7) {
    alert('Preencha marca, modelo e uma placa com exatamente 7 caracteres.')
    return
  }

  // Garante que os tipos de veículo foram carregados antes de tentar salvar
  if (tiposVeiculoDoBanco.length === 0) {
    try {
      const resposta = await StopCleanAPI.get('/tipoVeiculos')
      tiposVeiculoDoBanco = (Array.isArray(resposta) ? resposta : []).filter(t => t.status !== false)
      renderizarTiposVeiculo()
    } catch (erro) {
      alert('Não foi possível carregar os tipos de veículo. Tente novamente.')
      return
    }
  }

  const idTipoVeiculo = encontrarIdTipoVeiculo(tipoVeiculoSelecionado.nome)
  if (!idTipoVeiculo) {
    alert(`O tipo de veículo "${tipoVeiculoSelecionado.nome}" não está cadastrado no sistema. Escolha outro tipo ou contate o suporte.`)
    return
  }

  const payload = {
    idTipoVeiculo,
    marca,
    modelo,
    ano: ano || undefined,
    placa,
    cor: corSelecionada.nome,
    obs: obs || undefined
  }
  // idCliente não é enviado: o backend preenche automaticamente com o
  // cliente autenticado (ver controllers/generic.controller.js -> criar)

  const btnSalvar = document.getElementById('saveBtn')
  btnSalvar.disabled = true
  btnSalvar.textContent = 'Salvando...'

  try {
    await StopCleanAPI.post('/veiculos', payload)
    alert('Veículo cadastrado com sucesso!')
    window.location.href = 'index.html'
  } catch (erro) {
    alert(erro.message)
    btnSalvar.disabled = false
    btnSalvar.innerHTML = '<i class="ti ti-check" style="margin-right:5px;" aria-hidden="true"></i> Salvar veículo'
  }
}
