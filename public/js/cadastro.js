// public/js/cadastro.js
// Controller da página cadastro.html (POST /clientes/cadastro)

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formCadastro')
  const btnSubmit = form.querySelector('.sc-submit')

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    limparMensagem()

    const nome = document.getElementById('nome').value.trim()
    const cpf = document.getElementById('cpf').value.trim()
    const telefone = document.getElementById('telefone').value.trim()
    const email = document.getElementById('email').value.trim()
    const senha = document.getElementById('senha').value
    const confirmar = document.getElementById('confirmar').value

    if (!nome || !cpf || !telefone || !email || !senha) {
      mostrarMensagem('Preencha todos os campos.', 'erro')
      return
    }
    if (senha.length < 8) {
      mostrarMensagem('A senha deve ter no mínimo 8 caracteres.', 'erro')
      return
    }
    if (senha !== confirmar) {
      mostrarMensagem('As senhas não coincidem.', 'erro')
      return
    }

    definirCarregando(true)
    try {
      await StopCleanAPI.post('/clientes/cadastro', {
        nome,
        cpf: cpf.replace(/\D/g, ''), // manda só dígitos pro backend
        telefone,
        email,
        senha
      }, { auth: false })

      mostrarMensagem('Conta criada com sucesso! Redirecionando para o login...', 'sucesso')
      setTimeout(() => { window.location.href = 'login.html' }, 1500)
    } catch (erro) {
      mostrarMensagem(erro.message, 'erro')
      definirCarregando(false)
    }
  })

  function definirCarregando (carregando) {
    btnSubmit.disabled = carregando
    btnSubmit.textContent = carregando ? 'Criando conta...' : 'Criar minha conta'
  }

  function mostrarMensagem (mensagem, tipo) {
    let el = document.getElementById('cadastroMsg')
    if (!el) {
      el = document.createElement('div')
      el.id = 'cadastroMsg'
      el.style.fontSize = '13px'
      el.style.marginBottom = '12px'
      form.insertBefore(el, form.firstChild)
    }
    el.style.color = tipo === 'erro' ? '#e53010' : '#2e7d32'
    el.textContent = mensagem
  }

  function limparMensagem () {
    const el = document.getElementById('cadastroMsg')
    if (el) el.remove()
  }
})
