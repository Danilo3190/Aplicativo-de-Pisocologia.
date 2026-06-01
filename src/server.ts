import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import db from './config/database';
import { authMiddleware } from './config/security';

// Importar Controladores
import {
  registerProfissional,
  loginProfissional,
  registerPaciente,
  loginPaciente
} from './controllers/authController';

import {
  listarPacientes,
  cadastrarProntuario,
  listarProntuarios,
  obterEvolucaoPaciente,
  obterFeedRecente,
  editarPaciente,
  excluirPaciente
} from './controllers/profissionalController';

import {
  cadastrarRegistroDiario,
  listarHistoricoProprio,
  editarRegistroDiario,
  excluirRegistroDiario
} from './controllers/pacienteController';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do Frontend (Pasta Public)
app.use(express.static(path.join(__dirname, '../public')));

// ==========================================
// ROTAS DE AUTENTICAÇÃO (API)
// ==========================================
app.post('/api/auth/register-profissional', registerProfissional);
app.post('/api/auth/login-profissional', loginProfissional);
app.post('/api/auth/register-paciente', authMiddleware, registerPaciente); // Somente Psicólogo logado cria paciente
app.post('/api/auth/login-paciente', loginPaciente);

// ==========================================
// ROTAS DO PSICÓLOGO (PROFISSIONAL)
// ==========================================
app.get('/api/profissionais/pacientes', authMiddleware, listarPacientes);
app.put('/api/profissionais/pacientes/:id', authMiddleware, editarPaciente);
app.delete('/api/profissionais/pacientes/:id', authMiddleware, excluirPaciente);
app.get('/api/profissionais/feed', authMiddleware, obterFeedRecente);
app.post('/api/profissionais/prontuarios', authMiddleware, cadastrarProntuario);
app.get('/api/profissionais/prontuarios/:pacienteId', authMiddleware, listarProntuarios);
app.get('/api/profissionais/pacientes/:pacienteId/evolucao', authMiddleware, obterEvolucaoPaciente);

// ==========================================
// ROTAS DO PACIENTE
// ==========================================
app.post('/api/pacientes/registros', authMiddleware, cadastrarRegistroDiario);
app.put('/api/pacientes/registros/:id', authMiddleware, editarRegistroDiario);
app.delete('/api/pacientes/registros/:id', authMiddleware, excluirRegistroDiario);
app.get('/api/pacientes/historico', authMiddleware, listarHistoricoProprio);

// Rota de status geral da API
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    mensagem: 'API do Sistema de Gestão Terapêutica rodando perfeitamente!'
  });
});

// Qualquer outra rota serve o index.html da SPA do frontend
app.get('*any', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Inicializar Servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log('Banco de dados carregado:', db ? 'Sucesso' : 'Erro');
});