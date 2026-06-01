import { Request, Response } from 'express';
import crypto from 'crypto';
import db from '../config/database';
import { hashPassword, verifyPassword, generateToken } from '../config/security';

export function registerProfissional(req: Request, res: Response) {
  const { nome, email, senha, crp } = req.body;
  if (!nome || !email || !senha || !crp) {
    return res.status(400).json({ erro: 'Todos os campos (nome, email, senha, crp) são obrigatórios.' });
  }

  const id = crypto.randomUUID();
  const hashedPassword = hashPassword(senha);

  db.run(
    `INSERT INTO profissionais (id, nome, email, senha, crp) VALUES (?, ?, ?, ?, ?)`,
    [id, nome, email, hashedPassword, crp],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ erro: 'E-mail ou CRP já cadastrado no sistema.' });
        }
        return res.status(500).json({ erro: 'Erro ao registrar profissional: ' + err.message });
      }
      res.status(201).json({ mensagem: 'Psicólogo registrado com sucesso.', id });
    }
  );
}

export function loginProfissional(req: Request, res: Response) {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  db.get(`SELECT * FROM profissionais WHERE email = ?`, [email], (err, row: any) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro no servidor: ' + err.message });
    }
    if (!row || !verifyPassword(senha, row.senha)) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    const token = generateToken({ id: row.id, role: 'profissional', email: row.email });
    res.json({
      mensagem: 'Login realizado com sucesso.',
      token,
      usuario: { id: row.id, nome: row.nome, email: row.email, crp: row.crp, role: 'profissional' }
    });
  });
}

export function registerPaciente(req: Request, res: Response) {
  const { nome, email, senha, profissional_id, horario_notificacao } = req.body;
  if (!nome || !email || !senha || !profissional_id) {
    return res.status(400).json({ erro: 'Nome, email, senha e profissional_id são obrigatórios.' });
  }

  const id = crypto.randomUUID();
  const hashedPassword = hashPassword(senha);
  const horario = horario_notificacao || '20:00';

  db.run(
    `INSERT INTO pacientes (id, nome, email, senha, profissional_id, horario_notificacao) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, nome, email, hashedPassword, profissional_id, horario],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ erro: 'Este e-mail de paciente já está cadastrado.' });
        }
        return res.status(500).json({ erro: 'Erro ao registrar paciente: ' + err.message });
      }
      res.status(201).json({ mensagem: 'Paciente cadastrado com sucesso.', id });
    }
  );
}

export function loginPaciente(req: Request, res: Response) {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
  }

  db.get(`SELECT * FROM pacientes WHERE email = ?`, [email], (err, row: any) => {
    if (err) {
      return res.status(500).json({ erro: 'Erro no servidor: ' + err.message });
    }
    if (!row || !verifyPassword(senha, row.senha)) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    const token = generateToken({ id: row.id, role: 'paciente', email: row.email });
    res.json({
      mensagem: 'Login realizado com sucesso.',
      token,
      usuario: {
        id: row.id,
        nome: row.nome,
        email: row.email,
        profissional_id: row.profissional_id,
        horario_notificacao: row.horario_notificacao,
        role: 'paciente'
      }
    });
  });
}
