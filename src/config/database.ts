import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao SQLite:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite com sucesso.');
    CriarTabelas();
  }
});

function CriarTabelas() {
  db.serialize(() => {
    // 1. Tabela de Psicólogos (Profissionais)
    db.run(`
      CREATE TABLE IF NOT EXISTS profissionais (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        crp TEXT UNIQUE NOT NULL
      )
    `);

    // 2. Tabela de Pacientes
    db.run(`
      CREATE TABLE IF NOT EXISTS pacientes (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        profissional_id TEXT,
        horario_notificacao TEXT DEFAULT '20:00',
        FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
      )
    `);

    // 3. Tabela de Registros Diários (Humor)
    db.run(`
      CREATE TABLE IF NOT EXISTS registros_diarios (
        id TEXT PRIMARY KEY,
        paciente_id TEXT NOT NULL,
        nivel_humor INTEGER NOT NULL, 
        sentimentos TEXT,             
        anotacoes TEXT,
        qualidade_sono INTEGER DEFAULT 3,
        gatilhos TEXT,
        data_registro DATE DEFAULT CURRENT_DATE,
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
      )
    `);

    // 4. Tabela de Prontuários Eletrônicos (Registros Clínicos do Psicólogo)
    db.run(`
      CREATE TABLE IF NOT EXISTS prontuarios (
        id TEXT PRIMARY KEY,
        paciente_id TEXT NOT NULL,
        profissional_id TEXT NOT NULL,
        conteudo TEXT NOT NULL,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
        FOREIGN KEY (profissional_id) REFERENCES profissionais(id)
      )
    `);
  });
}

export default db;