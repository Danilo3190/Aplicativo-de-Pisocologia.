import { Response } from 'express';
import crypto from 'crypto';
import db from '../config/database';
import { AuthenticatedRequest } from '../config/security';

export function listarPacientes(req: AuthenticatedRequest, res: Response) {
  const profissionalId = req.user?.id;
  if (req.user?.role !== 'profissional') {
    return res.status(403).json({ erro: 'Acesso negado. Apenas psicólogos possuem acesso.' });
  }

  db.all(
    `SELECT id, nome, email, horario_notificacao FROM pacientes WHERE profissional_id = ? ORDER BY nome ASC`,
    [profissionalId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao buscar pacientes: ' + err.message });
      }
      res.json(rows);
    }
  );
}

export function cadastrarProntuario(req: AuthenticatedRequest, res: Response) {
  const profissionalId = req.user?.id;
  const { paciente_id, conteudo } = req.body;

  if (req.user?.role !== 'profissional') {
    return res.status(403).json({ erro: 'Acesso negado. Apenas psicólogos podem cadastrar prontuários.' });
  }
  if (!paciente_id || !conteudo) {
    return res.status(400).json({ erro: 'Paciente e conteúdo do prontuário são obrigatórios.' });
  }

  // Segurança: verificar se o paciente pertence a este profissional
  db.get(
    `SELECT id FROM pacientes WHERE id = ? AND profissional_id = ?`,
    [paciente_id, profissionalId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao validar vínculo: ' + err.message });
      }
      if (!row) {
        return res.status(403).json({ erro: 'Acesso negado. Este paciente não está vinculado ao seu consultório.' });
      }

      const id = crypto.randomUUID();
      db.run(
        `INSERT INTO prontuarios (id, paciente_id, profissional_id, conteudo) VALUES (?, ?, ?, ?)`,
        [id, paciente_id, profissionalId, conteudo],
        function (err) {
          if (err) {
            return res.status(500).json({ erro: 'Erro ao salvar prontuário: ' + err.message });
          }
          res.status(201).json({ mensagem: 'Prontuário clínico registrado com sucesso.', id });
        }
      );
    }
  );
}

export function listarProntuarios(req: AuthenticatedRequest, res: Response) {
  const profissionalId = req.user?.id;
  const { pacienteId } = req.params;

  if (req.user?.role !== 'profissional') {
    return res.status(403).json({ erro: 'Acesso negado. Apenas psicólogos possuem acesso.' });
  }

  // Segurança: verificar vínculo
  db.get(
    `SELECT id FROM pacientes WHERE id = ? AND profissional_id = ?`,
    [pacienteId, profissionalId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao validar vínculo: ' + err.message });
      }
      if (!row) {
        return res.status(403).json({ erro: 'Acesso negado. Este paciente não pertence ao seu consultório.' });
      }

      db.all(
        `SELECT id, conteudo, data_criacao FROM prontuarios WHERE paciente_id = ? AND profissional_id = ? ORDER BY data_criacao DESC`,
        [pacienteId, profissionalId],
        (err, rows) => {
          if (err) {
            return res.status(500).json({ erro: 'Erro ao buscar prontuários: ' + err.message });
          }
          res.json(rows);
        }
      );
    }
  );
}

export function obterEvolucaoPaciente(req: AuthenticatedRequest, res: Response) {
  const profissionalId = req.user?.id;
  const { pacienteId } = req.params;

  if (req.user?.role !== 'profissional') {
    return res.status(403).json({ erro: 'Acesso negado. Apenas psicólogos possuem acesso.' });
  }

  // Segurança: verificar vínculo
  db.get(
    `SELECT id FROM pacientes WHERE id = ? AND profissional_id = ?`,
    [pacienteId, profissionalId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao validar vínculo: ' + err.message });
      }
      if (!row) {
        return res.status(403).json({ erro: 'Acesso negado. Este paciente não pertence ao seu consultório.' });
      }

      db.all(
        `SELECT id, nivel_humor, sentimentos, anotacoes, qualidade_sono, gatilhos, data_registro 
         FROM registros_diarios 
         WHERE paciente_id = ? 
         ORDER BY data_registro ASC`,
        [pacienteId],
        (err, rows) => {
          if (err) {
            return res.status(500).json({ erro: 'Erro ao buscar histórico de humor: ' + err.message });
          }
          res.json(rows);
        }
      );
    }
  );
}

export function obterFeedRecente(req: AuthenticatedRequest, res: Response) {
  const profissionalId = req.user?.id;

  if (req.user?.role !== 'profissional') {
    return res.status(403).json({ erro: 'Acesso negado. Apenas psicólogos possuem acesso.' });
  }

  // Busca os últimos 50 registros de todos os pacientes deste profissional
  db.all(
    `SELECT r.id, r.nivel_humor, r.sentimentos, r.anotacoes, r.qualidade_sono, r.gatilhos, r.data_registro, p.nome as paciente_nome, p.id as paciente_id 
     FROM registros_diarios r 
     JOIN pacientes p ON r.paciente_id = p.id 
     WHERE p.profissional_id = ? 
     ORDER BY r.data_registro DESC 
     LIMIT 50`,
    [profissionalId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao buscar feed recente: ' + err.message });
      }
      res.json(rows);
    }
  );
}

export function editarPaciente(req: AuthenticatedRequest, res: Response) {
  const profissionalId = req.user?.id;
  const { id } = req.params;
  const { nome, email, horario_notificacao } = req.body;

  if (req.user?.role !== 'profissional') {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  // Verifica se paciente existe e pertence ao profissional
  db.get(`SELECT id FROM pacientes WHERE id = ? AND profissional_id = ?`, [id, profissionalId], (err, row) => {
    if (err) return res.status(500).json({ erro: 'Erro no servidor: ' + err.message });
    if (!row) return res.status(403).json({ erro: 'Paciente não encontrado ou acesso negado.' });

    db.run(
      `UPDATE pacientes SET nome = ?, email = ?, horario_notificacao = ? WHERE id = ?`,
      [nome, email, horario_notificacao, id],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ erro: 'Este e-mail já está em uso.' });
          }
          return res.status(500).json({ erro: 'Erro ao atualizar paciente: ' + err.message });
        }
        res.json({ mensagem: 'Paciente atualizado com sucesso!' });
      }
    );
  });
}

export function excluirPaciente(req: AuthenticatedRequest, res: Response) {
  const profissionalId = req.user?.id;
  const { id } = req.params;

  if (req.user?.role !== 'profissional') {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  // Verifica se paciente existe e pertence ao profissional
  db.get(`SELECT id FROM pacientes WHERE id = ? AND profissional_id = ?`, [id, profissionalId], (err, row) => {
    if (err) return res.status(500).json({ erro: 'Erro no servidor: ' + err.message });
    if (!row) return res.status(403).json({ erro: 'Paciente não encontrado ou acesso negado.' });

    // Exclui prontuários e registros diários antes do paciente (se PRAGMA foreign_keys não estiver ON)
    db.run(`DELETE FROM prontuarios WHERE paciente_id = ?`, [id], () => {
      db.run(`DELETE FROM registros_diarios WHERE paciente_id = ?`, [id], () => {
        db.run(`DELETE FROM pacientes WHERE id = ?`, [id], function (err) {
          if (err) return res.status(500).json({ erro: 'Erro ao excluir paciente: ' + err.message });
          res.json({ mensagem: 'Paciente e todo o seu histórico foram excluídos com sucesso.' });
        });
      });
    });
  });
}
