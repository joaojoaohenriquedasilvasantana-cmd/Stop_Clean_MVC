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
    // Insere os controles em uma faixa própria abaixo do cabeçalho, evitando
    // sobreposição com logo, saudação, sair e demais botões da página.
    const header = document.querySelector('.sc-topbar, .sc-header, header, .topbar, .navbar');
    const layout = document.querySelector('.sc-layout');
    const main = document.querySelector('main');

    // Em páginas com layout flex (como o Home do funcionário), a barra de
    // controles não pode virar um terceiro item dentro de .sc-layout, pois
    // isso empurra a sidebar e o conteúdo para fora da viewport.
    // Mantemos os controles no fluxo, entre o cabeçalho e o layout.
    // Prioriza o cabeçalho: os controles ficam em uma faixa própria logo
    // abaixo dele, sem virar item do layout principal (flex/grid).
    // Isso evita deslocar a sidebar/conteúdo e preserva layouts com abas
    // controladas por inputs radio.
    if (header && header.parentElement) {
      header.insertAdjacentElement('afterend', controls);
    } else if (layout && layout.parentElement) {
      layout.parentElement.insertBefore(controls, layout);
    } else if (main && main.parentElement) {
      main.parentElement.insertBefore(controls, main);
    } else {
      document.body.insertBefore(controls, document.body.firstChild);
    }
    controls.style.position = 'relative';
    controls.style.inset = 'auto';
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
