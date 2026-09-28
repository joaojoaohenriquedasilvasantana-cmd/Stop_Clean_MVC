import jwt from 'jsonwebtoken'
import prisma from '../config/database.js'

const SECRET = process.env.JWT_SECRET
if (!SECRET || SECRET.length < 32) {
  throw new Error('JWT_SECRET é obrigatório e deve ter pelo menos 32 caracteres.')
}

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
    req.usuarioCargo = payload.cargo

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

// Autoriza o próprio funcionário ou administrador explicitamente identificado no token.
// Verifica se o funcionário possui uma permissão administrativa cadastrada.
// ADMIN continua com acesso total por compatibilidade com o sistema atual.
const possuiAcessoAdministrativo = async (idFuncionario) => {
  if (!idFuncionario) return false
  const permissoes = await prisma.permissao.findMany({
    select: { id: true, tela: true }
  })

  const idsAdministrativos = permissoes
    .filter(p => {
      const tela = String(p.tela || '').trim().toUpperCase()
      return [
        'ACESSO_ADMINISTRATIVO',
        'ACESSO ADMINISTRATIVO',
        'ACESSO-ADMINISTRATIVO',
        'ADMINISTRATIVO'
      ].includes(tela)
    })
    .map(p => p.id)

  if (!idsAdministrativos.length) return false

  const vinculo = await prisma.funPermissao.findFirst({
    where: {
      idFuncionario: Number(idFuncionario),
      idPermissao: { in: idsAdministrativos }
    },
    select: { id: true }
  })

  return Boolean(vinculo)
}

export const proprioOuAdminFuncionario = async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    if (req.usuarioTipo !== 'funcionario') {
      return res.status(403).json({ erro: 'Acesso restrito a funcionários.' })
    }

    if (Number(req.usuarioId) === id || req.usuarioCargo === 'ADMIN') return next()

    if (await possuiAcessoAdministrativo(req.usuarioId)) return next()

    return res.status(403).json({ erro: 'Você só pode acessar ou alterar seu próprio cadastro.' })
  } catch (error) {
    return res.status(500).json({ erro: 'Não foi possível verificar sua permissão administrativa.' })
  }
}

export const apenasAdmin = async (req, res, next) => {
  try {
    if (req.usuarioTipo !== 'funcionario') {
      return res.status(403).json({ erro: 'Acesso restrito a funcionários.' })
    }

    // Não altera o comportamento dos administradores já existentes.
    if (req.usuarioCargo === 'ADMIN') return next()

    if (await possuiAcessoAdministrativo(req.usuarioId)) return next()

    return res.status(403).json({ erro: 'Você não possui a permissão de Acesso Administrativo.' })
  } catch (error) {
    return res.status(500).json({ erro: 'Não foi possível verificar sua permissão administrativa.' })
  }
}
