import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import * as clienteModel from '../models/cliente.model.js'

const SECRET = process.env.JWT_SECRET || 'chave_secreta_padrao'

// Remove a senha do objeto antes de responder ao front-end
const semSenha = (cliente) => {
  if (!cliente) return cliente
  const { senha, ...resto } = cliente
  return resto
}

// ==========================================
// VERIFICAÇÃO DE CPF
// GET /clientes/verificar-cpf/:cpf  (pública)
// Usada pelo front-end antes de exibir o formulário de cadastro do cliente,
// para avisar se o CPF já foi cadastrado por um funcionário.
// ==========================================
export const verificarCpf = async (req, res) => {
  try {
    const { cpf } = req.params
    const existente = await clienteModel.buscarPorCpf(cpf)

    if (!existente) {
      return res.status(200).json({ existe: false })
    }

    if (existente.email && existente.senha) {
      return res.status(200).json({
        existe: true,
        cadastroCompleto: true,
        mensagem: 'CPF já cadastrado. Faça login.'
      })
    }

    return res.status(200).json({
      existe: true,
      cadastroCompleto: false,
      mensagem: 'Já existe um cadastro com esse CPF. Falta apenas concluir com email e senha.'
    })
  } catch (error) {
    res.status(400).json({ erro: error.message })
  }
}

// ==========================================
// CADASTRO PÚBLICO (feito pelo próprio cliente)
// POST /clientes/cadastro  (pública)
// Obrigatórios: cpf, email, senha
//
// Regra: se já existir um cliente com esse CPF (cadastrado antes por um
// funcionário, sem email/senha), este endpoint COMPLETA o cadastro existente
// em vez de criar um novo registro duplicado.
// ==========================================
export const cadastrar = async (req, res) => {
  try {
    const { nome, cpf, email, senha, telefone } = req.body

    if (!cpf || !email || !senha) {
      return res.status(400).json({ erro: 'CPF, email e senha são obrigatórios.' })
    }

    const existente = await clienteModel.buscarPorCpf(cpf)

    // Já existe cadastro completo com esse CPF -> não deixa duplicar
    if (existente && existente.email && existente.senha) {
      return res.status(409).json({ erro: 'CPF já cadastrado. Faça login.' })
    }

    const salt = await bcrypt.genSalt(10)
    const senhaHash = await bcrypt.hash(senha, salt)

    // Já existe um cadastro parcial (criado por funcionário) -> completa
    if (existente) {
      const atualizado = await clienteModel.atualizar(existente.id, {
        nome: nome || existente.nome,
        email,
        senha: senhaHash,
        ...(telefone ? { telefone } : {})
      })

      return res.status(200).json({
        mensagem: 'Já existia um cadastro com esse CPF. Cadastro concluído com sucesso!',
        cliente: semSenha(atualizado)
      })
    }

    // CPF novo -> cria cliente completo
    const novo = await clienteModel.criar({
      nome,
      cpf,
      email,
      senha: senhaHash,
      ...(telefone ? { telefone } : {})
    })

    return res.status(201).json({
      mensagem: 'Cadastro realizado com sucesso!',
      cliente: semSenha(novo)
    })
  } catch (error) {
    res.status(400).json({ erro: error.message })
  }
}

// ==========================================
// CADASTRO FEITO PELO FUNCIONÁRIO
// POST /clientes/cadastro-funcionario  (protegida, apenas funcionário)
// Obrigatórios: cpf, telefone — sem email e sem senha.
// ==========================================
export const cadastrarPorFuncionario = async (req, res) => {
  try {
    const { nome, cpf, telefone } = req.body

    if (!cpf || !telefone) {
      return res.status(400).json({ erro: 'CPF e telefone são obrigatórios.' })
    }

    const existente = await clienteModel.buscarPorCpf(cpf)
    if (existente) {
      return res.status(409).json({ erro: 'Já existe um cliente cadastrado com esse CPF.' })
    }

    const novo = await clienteModel.criar({ nome, cpf, telefone })

    res.status(201).json(semSenha(novo))
  } catch (error) {
    res.status(400).json({ erro: error.message })
  }
}

// ==========================================
// LOGIN DO CLIENTE
// POST /clientes/login  (pública)
// ==========================================
export const login = async (req, res) => {
  try {
    const { email, senha } = req.body

    const cliente = await clienteModel.buscarPorEmail(email)

    // Cobre tanto "não encontrado" quanto "cadastro incompleto" (sem senha,
    // criado apenas pelo funcionário) — em ambos os casos não pode logar.
    if (!cliente || !cliente.senha) {
      return res.status(401).json({ erro: 'Credenciais inválidas ou cadastro incompleto.' })
    }

    const senhaValida = await bcrypt.compare(senha, cliente.senha)
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas.' })
    }

    const token = jwt.sign(
      { id: cliente.id, nome: cliente.nome, tipo: 'cliente' },
      SECRET,
      { expiresIn: '1d' }
    )

    return res.status(200).json({
      token,
      usuario: { id: cliente.id, nome: cliente.nome, tipo: 'cliente' }
    })
  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
}

// ==========================================
// CRUD PROTEGIDO
// ==========================================

// Funcionário: lista todos os clientes
export const listar = async (req, res) => {
  try {
    const clientes = await clienteModel.listar()
    res.status(200).json(clientes.map(semSenha))
  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
}

// Funcionário: qualquer cliente | Cliente: apenas o próprio registro
export const buscarPorId = async (req, res) => {
  try {
    const { id } = req.params

    if (req.usuarioTipo === 'cliente' && req.usuarioId !== Number(id)) {
      return res.status(403).json({ erro: 'Acesso negado.' })
    }

    const cliente = await clienteModel.buscarPorId(id)
    if (!cliente) return res.status(404).json({ erro: 'Cliente não encontrado.' })

    res.status(200).json(semSenha(cliente))
  } catch (error) {
    res.status(500).json({ erro: error.message })
  }
}

// Funcionário: qualquer cliente | Cliente: apenas o próprio registro
export const atualizar = async (req, res) => {
  try {
    const { id } = req.params

    if (req.usuarioTipo === 'cliente' && req.usuarioId !== Number(id)) {
      return res.status(403).json({ erro: 'Acesso negado.' })
    }

    const dados = { ...req.body }

    // Cliente não pode alterar CPF, tokens ou total de lavagens por conta própria
    if (req.usuarioTipo === 'cliente') {
      delete dados.cpf
      delete dados.tokens
      delete dados.totalLavagens
    }

    if (dados.senha) {
      const salt = await bcrypt.genSalt(10)
      dados.senha = await bcrypt.hash(dados.senha, salt)
    }

    const atualizado = await clienteModel.atualizar(id, dados)
    res.status(200).json(semSenha(atualizado))
  } catch (error) {
    res.status(400).json({ erro: error.message })
  }
}

// Funcionário: remove cliente
export const remover = async (req, res) => {
  try {
    const { id } = req.params
    await clienteModel.remover(id)
    res.status(204).send()
  } catch (error) {
    res.status(400).json({ erro: error.message })
  }
}
