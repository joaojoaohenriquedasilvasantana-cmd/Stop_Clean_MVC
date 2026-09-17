// public/js/atualizar_cliente.js
// Controller da página AtualizarCliente.html
// Observação: o formulário usa onsubmit="salvarDadosCliente(event)" inline,
// por isso a função precisa ficar acessível em window.

let usuarioSessaoAtual = null

document.addEventListener('DOMContentLoaded', async () => {
  if (!StopCleanAPI.exigirLogin()) return

  usuarioSessaoAtual = StopCleanAPI.getUsuario()

  try {
    const cliente = await StopCleanAPI.get(`/clientes/${usuarioSessaoAtual.id}`)
    document.getElementById('nome').value = cliente.nome || ''
    document.getElementById('cpf').value = cliente.cpf || ''
    document.getElementById('telefone').value = cliente.telefone || ''
    document.getElementById('email').value = cliente.email || ''
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro')
  }
})

window.salvarDadosCliente = async function (evento) {
  evento.preventDefault()
  limparMensagem()

  const nome = document.getElementById('nome').value.trim()
  const telefone = document.getElementById('telefone').value.trim()
  const email = document.getElementById('email').value.trim()
  const senha = document.getElementById('senha').value
  const confirmar = document.getElementById('confirmar').value

  if (senha && senha.length < 8) {
    mostrarMensagem('A nova senha deve ter no mínimo 8 caracteres.', 'erro')
    return
  }
  if (senha && senha !== confirmar) {
    mostrarMensagem('As senhas não coincidem.', 'erro')
    return
  }

  const payload = { nome, telefone, email }
  if (senha) payload.senha = senha

  const btnSalvar = document.getElementById('saveBtn')
  btnSalvar.disabled = true
  btnSalvar.textContent = 'Salvando...'

  try {
    await StopCleanAPI.put(`/clientes/${usuarioSessaoAtual.id}`, payload)

    // Atualiza o nome guardado na sessão (usado no cabeçalho de outras páginas)
    usuarioSessaoAtual.nome = nome
    StopCleanAPI.salvarSessao(StopCleanAPI.getToken(), usuarioSessaoAtual)

    mostrarMensagem('Dados atualizados com sucesso!', 'sucesso')
    setTimeout(() => { window.location.href = 'index.html' }, 1200)
  } catch (erro) {
    mostrarMensagem(erro.message, 'erro')
    btnSalvar.disabled = false
    btnSalvar.textContent = 'Salvar Alterações'
  }
}

function mostrarMensagem (mensagem, tipo) {
  const form = document.getElementById('formAtualizar')
  let el = document.getElementById('atualizarMsg')
  if (!el) {
    el = document.createElement('div')
    el.id = 'atualizarMsg'
    el.style.fontSize = '13px'
    el.style.marginBottom = '12px'
    form.insertBefore(el, form.firstChild)
  }
  el.style.color = tipo === 'erro' ? '#e53010' : '#2e7d32'
  el.textContent = mensagem
}

function limparMensagem () {
  const el = document.getElementById('atualizarMsg')
  if (el) el.remove()
}
