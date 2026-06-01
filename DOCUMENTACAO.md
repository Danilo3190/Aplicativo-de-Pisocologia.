# Documentação Técnica do Aplicativo de Psicologia

Esta documentação foi gerada para auxiliar na manutenção e evolução do sistema. Ela detalha a arquitetura, estrutura de pastas e a responsabilidade de cada arquivo e função.

---

## 1. Visão Geral da Arquitetura

O projeto é dividido em um **Backend** construído com Node.js, Express e TypeScript, e um **Frontend** construído como uma Single Page Application (SPA) usando HTML, CSS e JavaScript Vanilla. O banco de dados utilizado é o **SQLite**.

---

## 2. Estrutura de Pastas e Arquivos

Abaixo está a árvore de diretórios principal:

```text
/
├── database.sqlite       # Arquivo físico do banco de dados SQLite
├── package.json          # Dependências e scripts do Node.js
├── tsconfig.json         # Configurações do TypeScript
├── public/               # Código-fonte do Frontend (Servido estaticamente)
│   ├── app.js            # Lógica principal do frontend
│   ├── index.html        # Estrutura visual da aplicação
│   └── styles.css        # Estilos da aplicação
└── src/                  # Código-fonte do Backend (API)
    ├── server.ts         # Ponto de entrada do servidor e definição das rotas
    ├── config/           # Configurações globais (Banco e Segurança)
    ├── controllers/      # Lógica de negócio das rotas
    ├── models/           # Pasta reservada para modelos (atualmente vazios, criados no database.ts)
    └── routes/           # Pasta reservada para rotas modularizadas (atualmente em server.ts)
```

---

## 3. Detalhamento do Backend (`src/`)

### 3.1. `src/server.ts`
Arquivo principal que inicializa o servidor Express.
- **Responsabilidades:**
  - Configurar middlewares (CORS, JSON parsers).
  - Servir a pasta `public/` como arquivos estáticos (o frontend).
  - Definir todas as rotas da API (`/api/auth/...`, `/api/profissionais/...`, `/api/pacientes/...`) e vinculá-las aos respectivos controllers.
  - Implementar uma rota de fallback (`*any`) para suportar navegação SPA no frontend.

### 3.2. Pasta `src/config/`
Contém configurações essenciais de infraestrutura.

- **`database.ts`**: Configura a conexão com o banco de dados SQLite.
  - **Função `CriarTabelas()`**: Responsável por criar as tabelas fundamentais caso não existam: `profissionais`, `pacientes`, `registros_diarios` e `prontuarios`.

- **`security.ts`**: Centraliza regras de segurança, autenticação e criptografia.
  - **`hashPassword(password)` / `verifyPassword(password, hash)`**: Funções para criar e validar senhas usando `pbkdf2Sync` (salt + hash).
  - **`generateToken(payload)` / `verifyToken(token)`**: Funções para gerar e decodificar tokens de autenticação (estilo JWT).
  - **`authMiddleware`**: Middleware do Express usado nas rotas protegidas. Garante que a rota só seja acessada se houver um token válido no cabeçalho `Authorization`.

### 3.3. Pasta `src/controllers/`
Onde reside a lógica de negócios da aplicação. As rotas em `server.ts` chamam as funções destes arquivos.

#### `authController.ts` (Autenticação)
- **`registerProfissional`**: Recebe dados do psicólogo, gera o hash da senha, insere no banco e retorna sucesso.
- **`loginProfissional`**: Valida credenciais do psicólogo, gera um token e devolve dados do usuário.
- **`registerPaciente`**: Recebe dados de um novo paciente vinculado a um psicólogo. Gera hash da senha e insere no banco.
- **`loginPaciente`**: Valida credenciais do paciente e retorna token e dados do usuário.

#### `pacienteController.ts` (Portal do Paciente)
- **`cadastrarRegistroDiario`**: Salva um novo registro de humor, sono, sentimentos e anotações do paciente logado.
- **`listarHistoricoProprio`**: Retorna todos os registros diários (histórico) do paciente logado ordenados pela data.
- **`editarRegistroDiario`**: Atualiza as informações de um registro diário existente.
- **`excluirRegistroDiario`**: Deleta um registro diário (após validar permissão do usuário logado).

#### `profissionalController.ts` (Painel do Psicólogo)
- **`listarPacientes`**: Retorna os pacientes vinculados ao psicólogo logado.
- **`cadastrarProntuario`**: Salva uma nova anotação clínica associada a um paciente e ao profissional logado.
- **`listarProntuarios`**: Busca todos os prontuários clínicos de um paciente específico.
- **`obterEvolucaoPaciente`**: Busca os registros de humor (diários) de um paciente para alimentar os gráficos de evolução do psicólogo.
- **`obterFeedRecente`**: Retorna os últimos 50 registros de todos os pacientes vinculados ao profissional.
- **`editarPaciente` / `excluirPaciente`**: Permitem editar dados do paciente ou apagá-lo (excluindo em cascata os seus registros e prontuários).

---

## 4. Detalhamento do Frontend (`public/`)

### 4.1. `app.js` (Lógica do Client-side)
Gerencia o estado da SPA (Single Page Application), comunicação com a API e manipulação da interface de usuário (DOM).

**Principais Funções e Blocos:**
- **Estado Global**: Utiliza variáveis como `currentUser`, `currentToken`, `currentPatientId` para manter dados da sessão ativa na memória.
- **`initApp()`**: Inicializa a tela com base nos dados do LocalStorage (se já houver token, pula o login).
- **`showScreen(screenId)` / `switchTab(tabId)`**: Gerenciam a visibilidade de abas e telas sem recarregar a página.
- **`apiRequest(endpoint, method, body)`**: Wrapper/Utilitário para simplificar as chamadas `fetch` para o backend, embutindo o Token automaticamente.
- **Blocos de Autenticação (`handleRegister...`, `handleLogin...`, `handleLogout`)**: Conectam os formulários da tela de login à API e salvam o token no `localStorage`.
- **Blocos do Psicólogo (`loadProfessinalDashboard`, `refreshPatientList`, `loadProfessionalFeed`, `selectPatient`)**: Buscam dados da API e renderizam a lista de pacientes, feed recente e o prontuário.
- **Blocos do Paciente (`loadPacienteDashboard`, `refreshPatientHistory`, `handleSaveRegistroDiario`)**: Gerenciam os inputs do diário (humor, chips de sentimento, sono) e enviam/listam dados da API.
- **Gráficos e Visualização (`loadPatientEvolutionData`, `renderChart`, `renderTagClouds`)**: Utilizam a biblioteca **Chart.js** para renderizar gráficos de linha do histórico de humor/sono e processam dados para montar a "nuvem" de sentimentos e gatilhos.

### 4.2. `index.html` e `styles.css`
- **`index.html`**: Contém todo o layout da aplicação. Utiliza divs ocultáveis (telas com classes `.screen` que são ativadas/desativadas pelo JavaScript). Importa o FontAwesome para ícones e o Chart.js para gráficos.
- **`styles.css`**: Define as regras visuais. Usa um sistema de design dark-mode focado, com variáveis CSS (`--bg-dark`, `--color-primary`) e layout responsivo com Grid/Flexbox.

---

## 5. Dicas de Manutenção Rápida

- **Adicionar um Novo Campo no Banco de Dados**:
  1. Atualize a instrução `CREATE TABLE` em `src/config/database.ts`.
  2. Atualize o controller que insere ou busca os dados (ex: `src/controllers/pacienteController.ts` ou `profissionalController.ts`).
  3. Atualize o frontend no `app.js` (onde os dados são enviados e/ou renderizados) e os formulários no `index.html`.

- **Criar uma Nova Rota**:
  1. Crie a função no controller apropriado (ou em um novo dentro de `src/controllers/`).
  2. Adicione a rota em `src/server.ts` chamando a nova função.
  3. Se for protegida, não esqueça de injetar o `authMiddleware`.

- **Problemas de Token Expirado**:
  A expiração do token está definida em `src/config/security.ts` (`generateToken()`). Atualmente expira em 24h.
