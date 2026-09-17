import prisma from '../config/database.js'

// "clientes" e "funcionarios" foram removidos daqui de propósito: agora eles
// têm controllers/rotas próprios (cliente.controller.js / funcionario.controller.js)
// com as regras de cadastro, CPF, senha e permissões descritas no projeto.
export const modelosPrisma = {
  veiculos: "veiculo",
  servicos: "servico",
  tipoVeiculos: "tipoVeiculo",
  tipoServicos: "tipoServico",
  agendamentos: "agendamento",
  permissoes: "permissao",
  funcionarioPermissoes: "funPermissao",
  servicoAgendamentos: "servicoAgendamento"
}

export const obterModelo = (tabela) => modelosPrisma[tabela] || null

export const buscarTodos = async (tabela, filtro = {}) => {
  const modelo = obterModelo(tabela)
  return await prisma[modelo].findMany(filtro)
}

export const buscarPorId = async (tabela, id) => {
  const modelo = obterModelo(tabela)
  return await prisma[modelo].findUnique({
    where: { id: Number(id) }
  })
}

export const criarRegistro = async (tabela, dados) => {
  const modelo = obterModelo(tabela)
  return await prisma[modelo].create({ data: dados })
}

export const atualizarRegistro = async (tabela, id, dados) => {
  const modelo = obterModelo(tabela)
  return await prisma[modelo].update({
    where: { id: Number(id) },
    data: dados
  })
}

export const removerRegistro = async (tabela, id) => {
  const modelo = obterModelo(tabela)
  return await prisma[modelo].delete({
    where: { id: Number(id) }
  })
}