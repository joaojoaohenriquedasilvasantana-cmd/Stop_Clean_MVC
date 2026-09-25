/* Stop Clean - recursos globais de tema, navegação e sessão */
(() => {
  const THEME_KEY = 'sc_theme'
  const dark = localStorage.getItem(THEME_KEY) === 'dark'
  document.documentElement.classList.toggle('sc-dark', dark)

  function aplicarTema(theme) {
    const isDark = theme === 'dark'
    document.documentElement.classList.toggle('sc-dark', isDark)
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light')
    const btn = document.getElementById('sc-theme-toggle')
    if (btn) {
      btn.innerHTML = isDark ? '☀️ <span>Claro</span>' : '🌙 <span>Escuro</span>'
      btn.setAttribute('aria-label', isDark ? 'Ativar tema claro' : 'Ativar tema escuro')
    }
  }

  function voltar() {
    if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
      window.history.back()
    } else {
      window.location.href = 'apresentacao.html'
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const pagina = location.pathname.split('/').pop().toLowerCase()
    const isPresentation = pagina === '' || pagina === 'apresentacao.html'

    const controls = document.createElement('div')
    controls.className = 'sc-global-controls'

    if (!isPresentation) {
      const back = document.createElement('button')
      back.type = 'button'
      back.id = 'sc-back-button'
      back.className = 'sc-global-btn'
      back.textContent = '← Voltar'
      back.addEventListener('click', voltar)
      controls.appendChild(back)
    }

    const theme = document.createElement('button')
    theme.type = 'button'
    theme.id = 'sc-theme-toggle'
    theme.className = 'sc-global-btn'
    theme.addEventListener('click', () => aplicarTema(document.documentElement.classList.contains('sc-dark') ? 'light' : 'dark'))
    controls.appendChild(theme)
    document.body.appendChild(controls)
    aplicarTema(localStorage.getItem(THEME_KEY) || 'light')

    // Logout dos painéis Home.
    const sair = document.getElementById('btnSair')
    if (sair && window.StopCleanAPI) {
      sair.addEventListener('click', (e) => {
        e.preventDefault()
        window.StopCleanAPI.logout()
      })
    }

    const sairFuncionario = document.querySelector('[data-logout-funcionario]')
    if (sairFuncionario && window.StopCleanAPI) {
      sairFuncionario.addEventListener('click', (e) => {
        e.preventDefault()
        window.StopCleanAPI.logout('LoginFuncionario.html')
      })
    }
  })
})()
