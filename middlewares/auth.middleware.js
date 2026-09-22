import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'chave_secreta_padrao'

// Middleware de autenticação: valida o token JWT enviado no header Authorization
// e injeta o usuário autenticado (id e tipo) na requisição.
export const autorizarTabela = (req, res, next) => {
  const tabelas = {
      cliente: [
          'veiculos',
          'tipoVeiculos',
          'servicos',
          'agendamentos'
      ],

      funcionario: [
          'veiculos',
          'servicos',
          'tipoVeiculos',
          'tipoServicos',
          'agendamentos',
          'permissoes',
          'funcionarioPermissoes',
          'servicoAgendamentos'
      ]
  }

  const tabela = req.params.tabela
  const tipoUsuario = req.usuarioTipo

  const permitidas = tabelas[tipoUsuario] || []

  if (!permitidas.includes(tabela)) {
      return res.status(403).json({
          erro: 'Você não possui permissão para acessar este recurso.'
      })
  }

  next()
}

export const autenticar = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ erro: 'Token não informado' })

    const token = authHeader.split(' ')[1]
    const payload = jwt.verify(token, SECRET)

    req.usuarioId = payload.id
    req.usuarioTipo = payload.tipo

    next()
  } catch (error) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' })
  }
}

// Middleware de autorização: só deixa passar se o token for de um funcionário.
// Deve ser usado sempre depois de `autenticar`.
export const apenasFuncionario = (req, res, next) => {
  if (req.usuarioTipo !== 'funcionario') {
    return res.status(403).json({ erro: 'Acesso restrito a funcionários.' })
  }
  next()
}

// Middleware de autorização: só deixa passar se o token for de um cliente.
// Deve ser usado sempre depois de `autenticar`.
export const apenasCliente = (req, res, next) => {
  if (req.usuarioTipo !== 'cliente') {
    return res.status(403).json({ erro: 'Acesso restrito a clientes.' })
  }
  next()
}
