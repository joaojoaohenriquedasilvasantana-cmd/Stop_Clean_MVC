// public/js/cadastro_veiculo.js
// Controller da página CadastroVeiculo.html
// O HTML usa onclick/oninput/onsubmit inline (selectType, selectColor,
// updatePreview, formatPlaca, salvarVeiculo), por isso essas funções
// precisam ficar acessíveis em window.

let tipoVeiculoSelecionado = { nome: 'Sedan', icone: 'ti-car' }
let corSelecionada = { nome: 'Preto', hex: '#111' }
let tiposVeiculoDoBanco = [] // [{ id, nome }]

document.addEventListener('DOMContentLoaded', async () => {
  if (!StopCleanAPI.exigirLogin()) return

  try {
    tiposVeiculoDoBanco = await StopCleanAPI.get('/tipoVeiculos')
  } catch (erro) {
    // Se não conseguir carregar os tipos agora, tenta de novo na hora de salvar
    console.error('Erro ao carregar tipos de veículo:', erro.message)
  }
})

// Clique em um card de tipo de veículo (Sedan, Hatch, SUV, ...)
window.selectType = function (elemento, nomeTipo, classeIcone) {
  document.querySelectorAll('.type-card').forEach(el => el.classList.remove('selected'))
  elemento.classList.add('selected')
  tipoVeiculoSelecionado = { nome: nomeTipo, icone: classeIcone }
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
  input.value = input.value.toUpperCase()
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

  previewIconI.className = `ti ${tipoVeiculoSelecionado.icone}`
  previewColorDot.style.background = corSelecionada.hex
  previewColorName.textContent = corSelecionada.nome
}

// Encontra o id real do tipo de veículo no banco a partir do nome escolhido
// no card (ex.: "Sedan" -> id 3), comparando sem diferenciar maiúsculas.
function encontrarIdTipoVeiculo (nomeTipo) {
  const encontrado = tiposVeiculoDoBanco.find(
    t => t.nome.trim().toLowerCase() === nomeTipo.trim().toLowerCase()
  )
  return encontrado ? encontrado.id : null
}

window.salvarVeiculo = async function (evento) {
  evento.preventDefault()

  const marca = document.getElementById('marca').value
  const modelo = document.getElementById('modelo').value.trim()
  const ano = document.getElementById('ano').value
  const placa = document.getElementById('placa').value.trim()
  const obs = document.getElementById('obs').value.trim()

  if (!marca || !modelo || !placa) {
    alert('Preencha marca, modelo e placa.')
    return
  }

  // Garante que os tipos de veículo foram carregados antes de tentar salvar
  if (tiposVeiculoDoBanco.length === 0) {
    try {
      tiposVeiculoDoBanco = await StopCleanAPI.get('/tipoVeiculos')
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
