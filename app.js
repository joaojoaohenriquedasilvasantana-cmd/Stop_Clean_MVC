import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import routes from './routes/index.js'

const app = express()

// Obtém diretório atual
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Configuração do CORS
// O front-end (pasta /public) agora é servido pelo próprio Express, na mesma
// origem da API — nesse caso o navegador nem envia requisição de CORS.
// A lista abaixo só é usada quando alguém abre o front-end separadamente
// (ex.: extensão "Live Server" do VS Code, ou um Vite/React futuro).
const origensPermitidas = [
  'http://localhost:5173', // Vite (React), se usado no futuro
  'http://localhost:5500', // VS Code Live Server
  'http://127.0.0.1:5500',
  `http://localhost:${process.env.PORT || 3200}` // o próprio Express
]

app.use(cors({
  origin: (origin, callback) => {
    // Requisições sem 'origin' (ex.: mesma origem, Postman) são sempre liberadas
    if (!origin || origensPermitidas.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Origem não permitida pelo CORS: ' + origin))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Disponibiliza o front-end (HTML/CSS/JS do cliente) como arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')))

// Página inicial pública (landing page do site)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'apresentacao.html'))
})

// Documentação da API (movida para não conflitar com o front-end do cliente)
app.get('/docs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'docs', 'index.html'))
})

// Todas as rotas da API (ficam depois dos arquivos estáticos: se não bater
// com nenhum arquivo em /public, cai aqui)
app.use('/', routes)

export default app
