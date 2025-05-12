require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
const port = process.env.PORT || 3000;

// Configurações de segurança e performance
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requisições por IP
});
app.use(limiter);

app.use(express.json({ limit: '10kb' }));

// Rotas
const authRoutes = require('./routes/auth');
const novelRoutes = require('./routes/novel');
const chapterRoutes = require('./routes/chapter');

app.use('/api/auth', authRoutes);
app.use('/api/novels', novelRoutes);
app.use('/api/chapters', chapterRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Middleware de erro
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Documentação da API: http://localhost:${port}/api-docs`);
  }
});
