// public/js/api.js
//
// Camada de comunicação com a API do Stop Clean.
// Todo o front-end fala com o backend só através deste arquivo — cada
// página (login.js, cadastro.js, home.js, etc.) chama StopCleanAPI.get/post/
// put/del, sem precisar saber sobre fetch, token, headers, etc.
//
// Carregar SEMPRE antes dos outros scripts de página:
//   <script src="js/api.js"></script>
//   <script src="js/login.js"></script>

;(function () {
  // Quando o front-end é servido pelo próprio Express (mesma origem),
  // basta usar caminhos relativos. Se a página for aberta direto do disco
  // (file://) ou por outro servidor (ex.: Live Server), aponta para a API
  // rodando localmente.
  const API_BASE_URL = window.location.protocol === 'file:'
    ? 'http://localhost:3200'
    : ''

  const TOKEN_KEY = 'sc_token'
  const USUARIO_KEY = 'sc_usuario'

  function getToken () {
    return localStorage.getItem(TOKEN_KEY)
  }

  function getUsuario () {
    const bruto = localStorage.getItem(USUARIO_KEY)
    return bruto ? JSON.parse(bruto) : null
  }

  function salvarSessao (token, usuario) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario))
  }

  function logout () {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USUARIO_KEY)
    window.location.href = 'login.html'
  }

  // Usada no topo de páginas protegidas (dashboard, agendamento, etc.)
  // Retorna false e já redireciona para o login se não houver sessão.
  function exigirLogin () {
    if (!getToken()) {
      window.location.href = 'login.html'
      return false
    }
    return true
  }

  async function request (caminho, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' }

    if (auth) {
      const token = getToken()
      if (token) headers.Authorization = `Bearer ${token}`
    }

    let resposta
    try {
      resposta = await fetch(`${API_BASE_URL}${caminho}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
      })
    } catch (erroDeRede) {
      throw new Error('Não foi possível conectar ao servidor. Verifique se a API está rodando.')
    }

    // DELETE bem-sucedido volta 204 sem corpo
    if (resposta.status === 204) return null

    let dados = null
    try {
      dados = await resposta.json()
    } catch (_) {
      // corpo vazio ou não-JSON — segue com dados = null
    }

    if (!resposta.ok) {
      // Sessão expirada ou token inválido: desloga e manda pro login
      if (resposta.status === 401 && auth) {
        logout()
      }
      const mensagem = (dados && (dados.erro || dados.mensagem)) || `Erro ${resposta.status} ao falar com a API.`
      throw new Error(mensagem)
    }

    return dados
  }

  window.StopCleanAPI = {
    get: (caminho, opts) => request(caminho, { ...opts, method: 'GET' }),
    post: (caminho, body, opts) => request(caminho, { ...opts, method: 'POST', body }),
    put: (caminho, body, opts) => request(caminho, { ...opts, method: 'PUT', body }),
    del: (caminho, opts) => request(caminho, { ...opts, method: 'DELETE' }),

    getToken,
    getUsuario,
    salvarSessao,
    logout,
    exigirLogin
  }
})()
