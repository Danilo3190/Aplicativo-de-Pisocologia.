# MenteLivre - Gestão de Terapias Psicológicas

**Trabalho de Graduação (TG)**  
**Curso:** Análise e Desenvolvimento de Sistemas - FATEC Franca  
**Autor:** Danilo  
**Natureza do Projeto:** Tecnologias Digitais de Informação e Comunicação para Suporte à Gestão de Terapias Psicológicas

---

## 📖 Visão Geral

O cenário contemporâneo da saúde mental aponta para um crescimento drástico na busca por suporte psicológico. No modelo tradicional de psicoterapia, a coleta de dados sobre o estado emocional do paciente ocorre de forma retrospectiva e intermitente (apenas nas sessões clínicas). Essa assincronia gera um "vazio de informações" entre as consultas.

O **MenteLivre** é uma plataforma SaaS Full-Stack desenvolvida para preencher essa lacuna. Ele conecta psicólogos e pacientes diariamente, permitindo que os pacientes registrem seu humor, qualidade do sono, gatilhos e anotações (diários) de forma assíncrona. O psicólogo, por sua vez, acessa um painel com análise gráfica, um feed recente de atualizações e prontuários eletrônicos, apoiando a tomada de decisão clínica com base em dados reais.

---

## 🚀 Funcionalidades (Features)

### 🧑‍⚕️ Para o Psicólogo (Profissional)
* **Gestão de Pacientes (CRUD Completo)**: Cadastro, listagem, edição (nome, e-mail, horário de notificação) e exclusão de pacientes.
* **Feed de Status Recentes**: Tela inicial que exibe em tempo real as últimas anotações e sentimentos registrados por todos os pacientes.
* **Evolução Clínica (Gráficos)**: Integração com Chart.js para visualizar em gráficos de linha a variação de Humor e Qualidade do Sono ao longo dos dias.
* **Prontuário Eletrônico**: Criação e histórico de anotações técnicas e clínicas para cada sessão.
* **Relatos do Paciente**: Aba dedicada listando o histórico exato do que o paciente digitou no seu dia a dia.

### 👤 Para o Paciente
* **Autorregistro Diário (CRUD Completo)**: 
  * Envio de avaliações de Humor (1 a 5).
  * Envio de avaliações de Qualidade de Sono (1 a 5).
  * Seleção de sentimentos e gatilhos diários.
  * Anotações livres (formato de diário).
  * Edição e Exclusão de registros antigos caso haja erro de preenchimento.
* **Portal Histórico**: Visualização em linha do tempo de todos os seus registros enviados.

---

## 🛠️ Tecnologias Utilizadas (Stack)

### Backend (API RESTful)
- **Node.js** com **TypeScript**
- **Express.js** para roteamento e middlewares
- **SQLite** (`sqlite3`) como banco de dados relacional leve e embutido
- **JWT (JSON Web Token)** para autenticação, autorização e controle de sessão
- Segurança por `crypto` (hashing de senhas nativo do Node)

### Frontend (Single Page Application - SPA)
- **HTML5 e CSS3 (Vanilla)** com design focado em *Glassmorphism* (efeito de vidro translúcido).
- **JavaScript Moderno (ES6+)** sem frameworks pesados, garantindo alta performance no lado do cliente.
- **Chart.js** para renderização dos gráficos de evolução temporal.
- **FontAwesome** para iconografia vetorial.
- **Google Fonts** (Inter e Outfit) para tipografia moderna.

---

## 🗄️ Estrutura do Banco de Dados

O sistema utiliza um banco de dados relacional contendo 4 tabelas principais:
1. `profissionais`: Armazena dados dos psicólogos (id, nome, email, senha_hash, crp).
2. `pacientes`: Armazena dados dos pacientes e relaciona (chave estrangeira) ao profissional criador.
3. `registros_diarios`: Histórico enviado pelo paciente (humor, sono, gatilhos, textos).
4. `prontuarios`: Registros clínicos de uso restrito do psicólogo para acompanhar as sessões de cada paciente.

---

## 💻 Como Executar o Projeto Localmente

1. **Pré-requisitos**:
   - Ter o Node.js instalado (versão 18+ recomendada).
   - Git para clonar o repositório.

2. **Instalação das dependências**:
   Abra o terminal na pasta do projeto e execute:
   ```bash
   npm install
   ```

3. **Iniciando o Servidor**:
   Para iniciar o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   *O console deve exibir: "Servidor rodando em http://localhost:3000"*

4. **Acessando a Aplicação**:
   - Abra seu navegador web e acesse `http://localhost:3000`.
   - Você será recebido pela landing page (tela inicial do sistema).

---

## 🛡️ Segurança e Boas Práticas

- **Senhas Criptografadas**: Nenhuma senha é salva em texto puro. O sistema utiliza hashing robusto na persistência de dados.
- **Isolamento de Dados**: Pacientes só conseguem ver e editar os próprios diários. Profissionais só têm acesso aos pacientes que eles mesmos registraram (validação de chaves estrangeiras via JWT de autenticação).

---
*Documentação gerada com apoio de IA (Antigravity Agent) para a disciplina de Trabalho de Graduação da FATEC Franca.*
