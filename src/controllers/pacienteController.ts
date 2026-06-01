import { Response } from 'express';
import crypto from 'crypto';
import db from '../config/database';
import { AuthenticatedRequest } from '../config/security';

export function cadastrarRegistroDiario(req: AuthenticatedRequest, res: Response) {
  const pacienteId = req.user?.id;
  const { nivel_humor, sentimentos, anotacoes, qualidade_sono, gatilhos } = req.body;

  if (req.user?.role !== 'paciente') {
    return res.status(403).json({ erro: 'Acesso negado. Apenas pacientes podem enviar autorregistros diários.' });
  }

  if (nivel_humor === undefined || nivel_humor < 1 || nivel_humor > 5) {
    return res.status(400).json({ erro: 'O nível de humor (1 a 5) é obrigatório.' });
  }

  const id = crypto.randomUUID();
  const sentimentosJSON = sentimentos ? JSON.stringify(sentimentos) : '[]';
  const gatilhosJSON = gatilhos ? JSON.stringify(gatilhos) : '[]';
  const sonoVal = qualidade_sono !== undefined ? qualidade_sono : 3;

  db.run(
    `INSERT INTO registros_diarios (id, paciente_id, nivel_humor, sentimentos, anotacoes, qualidade_sono, gatilhos) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, pacienteId, nivel_humor, sentimentosJSON, anotacoes || '', sonoVal, gatilhosJSON],
    function (err) {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao registrar humor diário: ' + err.message });
      }
      res.status(201).json({ mensagem: 'Registro diário enviado com sucesso!', id });
    }
  );
}

export function listarHistoricoProprio(req: AuthenticatedRequest, res: Response) {
  const pacienteId = req.user?.id;

  if (req.user?.role !== 'paciente') {
    return res.status(403).json({ erro: 'Acesso negado. Apenas pacientes possuem acesso.' });
  }

  db.all(
    `SELECT id, nivel_humor, sentimentos, anotacoes, qualidade_sono, gatilhos, data_registro 
     FROM registros_diarios 
     WHERE paciente_id = ? 
     ORDER BY data_registro DESC`,
    [pacienteId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ erro: 'Erro ao buscar histórico: ' + err.message });
      }
      res.json(rows);
    }
  );
}

export function editarRegistroDiario(req: AuthenticatedRequest, res: Response) {
  const pacienteId = req.user?.id;
  const { id } = req.params;
  const { nivel_humor, sentimentos, anotacoes, qualidade_sono, gatilhos } = req.body;

  if (req.user?.role !== 'paciente') {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  // Verifica se o registro existe e pertence ao paciente
  db.get(`SELECT id FROM registros_diarios WHERE id = ? AND paciente_id = ?`, [id, pacienteId], (err, row) => {
    if (err) return res.status(500).json({ erro: 'Erro no servidor: ' + err.message });
    if (!row) return res.status(403).json({ erro: 'Registro não encontrado ou acesso negado.' });

    const sentimentosJSON = sentimentos ? JSON.stringify(sentimentos) : '[]';
    const gatilhosJSON = gatilhos ? JSON.stringify(gatilhos) : '[]';

    db.run(
      `UPDATE registros_diarios 
       SET nivel_humor = ?, sentimentos = ?, anotacoes = ?, qualidade_sono = ?, gatilhos = ? 
       WHERE id = ?`,
      [nivel_humor, sentimentosJSON, anotacoes, qualidade_sono, gatilhosJSON, id],
      function (err) {
        if (err) return res.status(500).json({ erro: 'Erro ao atualizar registro: ' + err.message });
        res.json({ mensagem: 'Registro diário atualizado com sucesso!' });
      }
    );
  });
}

export function excluirRegistroDiario(req: AuthenticatedRequest, res: Response) {
  const pacienteId = req.user?.id;
  const { id } = req.params;

  if (req.user?.role !== 'paciente') {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  db.get(`SELECT id FROM registros_diarios WHERE id = ? AND paciente_id = ?`, [id, pacienteId], (err, row) => {
    if (err) return res.status(500).json({ erro: 'Erro no servidor: ' + err.message });
    if (!row) return res.status(403).json({ erro: 'Registro não encontrado ou acesso negado.' });

    db.run(`DELETE FROM registros_diarios WHERE id = ?`, [id], function (err) {
      if (err) return res.status(500).json({ erro: 'Erro ao excluir registro: ' + err.message });
      res.json({ mensagem: 'Registro diário excluído com sucesso.' });
    });
  });
}
