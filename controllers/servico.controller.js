import prisma from '../config/database.js'

// GET /servicos/tipo-veiculo/:idTipoVeiculo
export const listarServicosPorTipoVeiculo = async (req, res) => {
  try {
    const { idTipoVeiculo } = req.params

    const servicosPrecos = await prisma.tipoServico.findMany({
      where: {
        idTipoVeiculo: Number(idTipoVeiculo)
      },
      include: {
        servico: true // Traz nome e descrição da tabela de Serviços
      }
    })

    res.status(200).json(servicosPrecos)
  } catch (error) {
    console.error('Erro ao buscar serviços:', error)
    res.status(500).json({ erro: 'Erro interno ao carregar os serviços.' })
  }
}