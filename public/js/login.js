// public/js/login.js
// Controller da página login.html

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formLogin')
  const inputSenha = document.getElementById('senha')
  const btnToggleSenha = document.getElementById('toggleSenha')
  const btnSubmit = form.querySelector('button[type="submit"]')

  // Se já estiver logado, não faz sentido ficar na tela de login
  if (StopCleanAPI.getToken()) {
    window.location.href = 'index.html'
    return
  }

  // Mostrar/ocultar senha
  if (btnToggleSenha) {
    btnToggleSenha.addEventListener('click', () => {
      const estaEscondida = inputSenha.type === 'password'
      inputSenha.type = estaEscondida ? 'text' : 'password'
      btnToggleSenha.classList.toggle('ti-eye', !estaEscondida)
      btnToggleSenha.classList.toggle('ti-eye-off', estaEscondida)
    })
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    limparErro()

    const email = document.getElementById('email').value.trim()
    const senha = inputSenha.value

    if (!email || !senha) {
      mostrarErro('Preencha e-mail e senha.')
      return
    }

    definirCarregando(true)
    try {
      const resposta = await StopCleanAPI.post('/clientes/login', { email, senha }, { auth: false })
      StopCleanAPI.salvarSessao(resposta.token, resposta.usuario)
      window.location.href = 'index.html'
    } catch (erro) {
      mostrarErro(erro.message)
      definirCarregando(false)
    }
  })

  function definirCarregando (carregando) {
    btnSubmit.disabled = carregando
    btnSubmit.textContent = carregando ? 'Entrando...' : 'Entrar'
  }

  function mostrarErro (mensagem) {
    let el = document.getElementById('loginErro')
    if (!el) {
      el = document.createElement('div')
      el.id = 'loginErro'
      el.style.color = '#e53010'
      el.style.fontSize = '13px'
      el.style.marginTop = '4px'
      el.style.marginBottom = '8px'
      form.insertBefore(el, form.firstChild)
    }
    el.textContent = mensagem
  }

  function limparErro () {
    const el = document.getElementById('loginErro')
    if (el) el.remove()
  }
})
