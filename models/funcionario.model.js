import prisma from '../config/database.js'

export const buscarPorEmail = async (email) => {
  return await prisma.funcionario.findFirst({ where: { email } })
}

export const buscarPorId = async (id) => {
  return await prisma.funcionario.findUnique({ where: { id: Number(id) } })
}

export const listar = async () => {
  return await prisma.funcionario.findMany()
}

export const criar = async (dados) => {
  return await prisma.funcionario.create({ data: dados })
}

export const atualizar = async (id, dados) => {
  return await prisma.funcionario.update({
    where: { id: Number(id) },
    data: dados
  })
}

export const remover = async (id) => {
  return await prisma.funcionario.delete({ where: { id: Number(id) } })
}
