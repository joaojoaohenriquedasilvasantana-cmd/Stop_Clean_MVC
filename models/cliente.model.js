import prisma from '../config/database.js'

export const buscarPorCpf = async (cpf) => {
  return await prisma.cliente.findUnique({ where: { cpf } })
}

export const buscarPorEmail = async (email) => {
  return await prisma.cliente.findFirst({ where: { email } })
}

export const buscarPorId = async (id) => {
  return await prisma.cliente.findUnique({ where: { id: Number(id) } })
}

export const listar = async () => {
  return await prisma.cliente.findMany()
}

export const criar = async (dados) => {
  return await prisma.cliente.create({ data: dados })
}

export const atualizar = async (id, dados) => {
  return await prisma.cliente.update({
    where: { id: Number(id) },
    data: dados
  })
}

export const remover = async (id) => {
  return await prisma.cliente.delete({ where: { id: Number(id) } })
}
