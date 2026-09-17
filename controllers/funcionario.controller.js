import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import * as funcionarioModel from '../models/funcionario.model.js'

const SECRET = process.env.JWT_SECRET || 'chave_secreta_padrao'

// Remove a senha do objeto antes de responder ao front-end
const semSenha = (funcionario) => {
  if (!funcionario) return funcionario
  const { senha, ...resto } = funcionario
  return resto
}

// ==========================================
// CADASTRO DE FUNCIONÁRIO
// POST /funcionarios  (protegida, apenas funcionário)
// Obrigatórios: email, senha
//
// Obs: o cadastro de funcionário deixou de ser público — só um funcionário
// já autenticado pode cadastrar outro. Para o primeiro funcionário do
// sistema, crie o registro direto no banco (ex.: script de seed do Prisma).
// ==========================================
export const cadastrar = async (req, res) => {
  try {
    const { nome, email, senha, cpf, telefone, cargo, salario } = req.body

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios.' })
    }

    const existente = await funcionarioModel.buscarPorEmail(email)
    if (existente) {
      return res.status(409).json({ erro: 'Já existe um funcionário cadastrado com esse email.' })
    }

    const salt = await bcrypt.genSalt(10)
    const senhaHash = await bcrypt.hash(senha, salt)

    const novo = await funcionarioModel.criar({
      nome,
      email,
      senha: senhaHash,
      cpf,
      telefone,
      cargo,
      salario
    })

    res.status(201).json(semSenha(novo))
  } catch (error) {
    res.status(400).json({ erro: error.message })
  }
}

// ==========================================
// LOGIN DO FUNCIONÁRIO
// POST /funcionarios/login  (pública)
// ==========================================
export const login = async (req, res) => {
  try {
    const { email, senha } = req.body

    const funcionario = await funcionarioModel.buscarPorEmail(email)
    if (!funcionario) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' })
    }

    const senhaValida = await bcrypt.compare(senha, funcionario.senha)
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' })
    }

    const token = jwt.sign(
      { id: funcionario.id, nome: funcionario.nome, tipo: 'funcionario' },
      SECRET,
      { expiresIn: '1d' }
    )

    return res.status(200).json({
      token,
      usuario: { id: funcionario.id, nome: funcionario.nome, tipo: 'funcionario' }
    })
  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
}

// ==========================================
// CRUD PROTEGIDO (apenas funcionário)
// ==========================================

export const listar = async (req, res) => {
  try {
    const funcionarios = await funcionarioModel.listar()
    res.status(200).json(funcionarios.map(semSenha))
  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
}

export const buscarPorId = async (req, res) => {
  try {
    const funcionario = await funcionarioModel.buscarPorId(req.params.id)
    if (!funcionario) return res.status(404).json({ erro: 'Funcionário não encontrado.' })
    res.status(200).json(semSenha(funcionario))
  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
}

export const atualizar = async (req, res) => {
  try {
    const dados = { ...req.body }

    if (dados.senha) {
      const salt = await bcrypt.genSalt(10)
      dados.senha = await bcrypt.hash(dados.senha, salt)
    }

    const atualizado = await funcionarioModel.atualizar(req.params.id, dados)
    res.status(200).json(semSenha(atualizado))
  } catch (error) {
    res.status(400).json({ erro: error.message })
  }
}

export const remover = async (req, res) => {
  try {
    await funcionarioModel.remover(req.params.id)
    res.status(204).send()
  } catch (error) {
    res.status(400).json({ erro: error.message })
  }
}
