/* ==========================================================================
   APP.JS - CLIENT LOGIC (SPA FLOW & CHART INTEGRATION)
   ========================================================================== */

const API_BASE = '/api';
let currentUser = null;
let currentToken = null;
let currentPatientId = null; // Para uso do Psicólogo
let currentPatientsList = []; // Para alimentar o feed
let evolucaoChart = null;
let currentEditRegistroId = null; // Para o paciente editar registro

// Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupInteractivity();
});

// ==========================================
// INICIALIZAÇÃO DE ESTADO E SESSÃO
// ==========================================
function initApp() {
  const savedToken = localStorage.getItem('token_sana');
  const savedUser = localStorage.getItem('user_sana');

  if (savedToken && savedUser) {
    currentToken = savedToken;
    currentUser = JSON.parse(savedUser);

    if (currentUser.role === 'profissional') {
      showScreen('screen-dashboard-profissional');
      loadProfessinalDashboard();
    } else if (currentUser.role === 'paciente') {
      showScreen('screen-dashboard-paciente');
      loadPacienteDashboard();
    }
  } else {
    showScreen('screen-landing');
  }
}

// ==========================================
// GERENCIADOR DE TELAS (SPA)
// ==========================================
function showScreen(screenId) {
  // Esconder todas as telas
  document.querySelectorAll('.screen, .screen-full').forEach(el => {
    el.classList.remove('active');
  });

  // Mostrar a tela desejada
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
  }
}

// Alternância de Abas Clínicas (Psicólogo)
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  // Ativar botão clicado
  const eventBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
  if (eventBtn) eventBtn.classList.add('active');

  // Mostrar conteúdo
  const targetContent = document.getElementById(tabId);
  if (targetContent) targetContent.classList.add('active');
}

// ==========================================
// INTERATIVIDADE FORMULÁRIOS & CHIPS
// ==========================================
function setupInteractivity() {
  // Seletor de Humor (Rostos)
  const moodOptions = document.querySelectorAll('.mood-option');
  moodOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      moodOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      const val = opt.getAttribute('data-value');
      document.getElementById('registro-humor').value = val;
    });
  });

  // Chips de Sentimentos & Gatilhos (Seleção Múltipla)
  const chips = document.querySelectorAll('.chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
    });
  });
}

// ==========================================
// CHAMADAS DE API (CLIENT-SIDE)
// ==========================================
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  const config = { method, headers };
  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.erro || 'Ocorreu um erro no processamento.');
    }
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

// ==========================================
// AUTENTICAÇÃO - PSICÓLOGO
// ==========================================
async function handleRegisterProfissional(e) {
  e.preventDefault();
  const nome = document.getElementById('reg-prof-nome').value;
  const email = document.getElementById('reg-prof-email').value;
  const crp = document.getElementById('reg-prof-crp').value;
  const senha = document.getElementById('reg-prof-senha').value;

  try {
    const data = await apiRequest('/auth/register-profissional', 'POST', { nome, email, senha, crp });
    showToast('Conta profissional criada com sucesso! Faça login.', 'success');
    e.target.reset();
    showScreen('screen-login-profissional');
  } catch (err) {}
}

async function handleLoginProfissional(e) {
  e.preventDefault();
  const email = document.getElementById('login-prof-email').value;
  const senha = document.getElementById('login-prof-senha').value;

  try {
    const data = await apiRequest('/auth/login-profissional', 'POST', { email, senha });
    currentToken = data.token;
    currentUser = data.usuario;

    localStorage.setItem('token_sana', currentToken);
    localStorage.setItem('user_sana', JSON.stringify(currentUser));

    showToast('Login profissional efetuado com sucesso!', 'success');
    showScreen('screen-dashboard-profissional');
    loadProfessinalDashboard();
    e.target.reset();
  } catch (err) {}
}

// ==========================================
// AUTENTICAÇÃO - PACIENTE
// ==========================================
async function handleLoginPaciente(e) {
  e.preventDefault();
  const email = document.getElementById('login-pac-email').value;
  const senha = document.getElementById('login-pac-senha').value;

  try {
    const data = await apiRequest('/auth/login-paciente', 'POST', { email, senha });
    currentToken = data.token;
    currentUser = data.usuario;

    localStorage.setItem('token_sana', currentToken);
    localStorage.setItem('user_sana', JSON.stringify(currentUser));

    showToast('Portal do Paciente acessado com sucesso!', 'success');
    showScreen('screen-dashboard-paciente');
    loadPacienteDashboard();
    e.target.reset();
  } catch (err) {}
}

// ==========================================
// LOGOUT
// ==========================================
function handleLogout() {
  currentUser = null;
  currentToken = null;
  currentPatientId = null;
  localStorage.removeItem('token_sana');
  localStorage.removeItem('user_sana');
  
  if (evolucaoChart) {
    evolucaoChart.destroy();
    evolucaoChart = null;
  }

  showToast('Sessão encerrada com sucesso.', 'success');
  showScreen('screen-landing');
}

// ==========================================
// PAINEL DO PSICÓLOGO - CARREGAMENTO DE DADOS
// ==========================================
async function loadProfessinalDashboard() {
  document.getElementById('prof-display-name').innerText = `Dr(a). ${currentUser.nome}`;
  await refreshPatientList();
  await loadProfessionalFeed();
}

async function refreshPatientList() {
  try {
    const patients = await apiRequest('/profissionais/pacientes');
    const container = document.getElementById('patient-list-container');
    container.innerHTML = '';

    if (patients.length === 0) {
      container.innerHTML = '<p class="empty-msg">Nenhum paciente cadastrado.</p>';
      currentPatientsList = [];
      return;
    }

    currentPatientsList = patients;
    patients.forEach(pat => {
      const card = document.createElement('div');
      card.className = `patient-card ${currentPatientId === pat.id ? 'active' : ''}`;
      card.innerHTML = `
        <h4>${pat.nome}</h4>
        <p><i class="fa-solid fa-envelope"></i> ${pat.email}</p>
        <p><i class="fa-solid fa-clock"></i> Notificação: ${pat.horario_notificacao}</p>
      `;
      card.onclick = () => selectPatient(pat);
      container.appendChild(card);
    });
  } catch (err) {}
}

async function loadProfessionalFeed() {
  try {
    const feed = await apiRequest('/profissionais/feed');
    const container = document.getElementById('professional-feed-container');
    if (!container) return;
    
    container.innerHTML = '';

    if (feed.length === 0) {
      container.innerHTML = '<p class="empty-msg">Nenhum registro recente de pacientes.</p>';
      return;
    }

    const moodEmojiMap = { 1: '😫', 2: '😟', 3: '😐', 4: '🙂', 5: '😄' };

    feed.forEach(log => {
      const item = document.createElement('div');
      item.className = 'prontuario-item feed-item';
      item.style.cursor = 'pointer';
      item.style.borderLeftColor = '#f59e0b';
      item.style.transition = 'all 0.2s';
      item.onmouseover = () => item.style.backgroundColor = 'rgba(245, 158, 11, 0.08)';
      item.onmouseout = () => item.style.backgroundColor = 'rgba(0, 0, 0, 0.25)';
      
      let tags = '';
      try {
        const sArr = JSON.parse(log.sentimentos || '[]');
        const gArr = JSON.parse(log.gatilhos || '[]');
        const allTags = [...sArr, ...gArr];
        if (allTags.length > 0) {
          tags = allTags.map(tag => `<span class="tag-badge" style="font-size:0.7rem;padding:3px 6px;margin-right:4px;">${tag}</span>`).join('');
        }
      } catch (e) {}

      item.innerHTML = `
        <div class="prontuario-item-header">
          <span><strong><i class="fa-solid fa-user"></i> ${log.paciente_nome}</strong> • ${formatDateTime(log.data_registro)}</span>
          <span>Humor: ${moodEmojiMap[log.nivel_humor] || '😐'}</span>
        </div>
        ${tags ? `<div class="tag-cloud" style="margin-top: 6px; margin-bottom: 8px;">${tags}</div>` : ''}
        <p style="margin-top: 8px; font-style: italic; color: #d1d5db;">
          "${log.anotacoes || 'Registro sem observações escritas.'}"
        </p>
        <div style="text-align: right; margin-top: 10px;">
          <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;"><i class="fa-solid fa-folder-open"></i> Abrir Paciente</button>
        </div>
      `;
      
      item.onclick = () => {
        const pat = currentPatientsList.find(p => p.id === log.paciente_id);
        if (pat) selectPatient(pat);
      };
      
      container.appendChild(item);
    });
  } catch (err) {}
}

// Selecionar paciente e abrir painel de detalhes
async function selectPatient(patient) {
  currentPatientId = patient.id;
  
  // Atualizar seleção visual de cards
  document.querySelectorAll('.patient-card').forEach(el => el.classList.remove('active'));
  const activeCards = Array.from(document.querySelectorAll('.patient-card')).filter(card => 
    card.querySelector('h4').innerText === patient.nome
  );
  activeCards.forEach(card => card.classList.add('active'));

  // Mostrar visualização ativa
  document.getElementById('no-patient-selected-view').style.display = 'none';
  document.getElementById('active-patient-view').style.display = 'flex';

  // Inserir cabeçalho do perfil do paciente
  document.getElementById('active-patient-name').innerText = patient.nome;
  document.getElementById('active-patient-email').innerText = patient.email;
  document.getElementById('active-patient-time').innerText = patient.horario_notificacao;

  // Carregar dados adicionais
  switchTab('tab-diario'); // Focar nos relatos ao abrir
  await loadPatientEvolutionData(patient.id);
  await loadPatientProntuarios(patient.id);
}

// Carregar Gráfico de Evolução e Estatísticas do Paciente
async function loadPatientEvolutionData(patientId) {
  try {
    const data = await apiRequest(`/profissionais/pacientes/${patientId}/evolucao`);

    // Atualizar Métricas Superiores
    const total = data.length;
    document.getElementById('metric-total-records').innerText = total;

    const logsContainer = document.getElementById('patient-daily-logs-container');

    if (total === 0) {
      document.getElementById('metric-avg-mood').innerText = '-';
      document.getElementById('metric-avg-sleep').innerText = '-';
      renderChart([], [], []);
      document.getElementById('sentimentos-cloud').innerHTML = '<p class="empty-msg">Nenhum sentimento registrado.</p>';
      document.getElementById('gatilhos-cloud').innerHTML = '<p class="empty-msg">Nenhum gatilho registrado.</p>';
      if (logsContainer) {
        logsContainer.innerHTML = '<p class="empty-msg">Nenhum registro diário feito por este paciente.</p>';
      }
      return;
    }

    const sumMood = data.reduce((acc, curr) => acc + curr.nivel_humor, 0);
    const sumSleep = data.reduce((acc, curr) => acc + curr.qualidade_sono, 0);
    document.getElementById('metric-avg-mood').innerText = (sumMood / total).toFixed(1) + ' / 5';
    document.getElementById('metric-avg-sleep').innerText = (sumSleep / total).toFixed(1) + ' / 5';

    // Preparar dados para o Gráfico
    const labels = data.map(item => formatDate(item.data_registro));
    const moodDataset = data.map(item => item.nivel_humor);
    const sleepDataset = data.map(item => item.qualidade_sono);

    renderChart(labels, moodDataset, sleepDataset);

    // Calcular Nuvem de Tags
    renderTagClouds(data);

    // Renderizar a lista de diários do paciente para o profissional
    if (logsContainer) {
      logsContainer.innerHTML = '';
      const sortedLogs = [...data].reverse();
      const moodEmojiMap = { 1: '😫', 2: '😟', 3: '😐', 4: '🙂', 5: '😄' };

      sortedLogs.forEach(log => {
        const logItem = document.createElement('div');
        logItem.className = 'prontuario-item';
        logItem.style.borderLeftColor = 'var(--color-secondary)'; // Usar a cor de destaque do paciente (Teal)

        let tags = '';
        try {
          const sArr = JSON.parse(log.sentimentos || '[]');
          const gArr = JSON.parse(log.gatilhos || '[]');
          const allTags = [...sArr, ...gArr];
          if (allTags.length > 0) {
            tags = allTags.map(tag => `<span class="tag-badge" style="font-size:0.7rem;padding:3px 6px;margin-right:4px;">${tag}</span>`).join('');
          }
        } catch (e) {}

        logItem.innerHTML = `
          <div class="prontuario-item-header">
            <span><i class="fa-solid fa-calendar"></i> Registro do dia ${formatDate(log.data_registro)}</span>
            <span>Humor: ${moodEmojiMap[log.nivel_humor] || '😐'} | Sono: ${log.qualidade_sono}/5</span>
          </div>
          ${tags ? `<div class="tag-cloud" style="margin-top: 6px; margin-bottom: 8px;">${tags}</div>` : ''}
          <p style="margin-top: 8px; font-style: italic; color: #d1d5db;">
            "${log.anotacoes || 'O paciente enviou este registro sem observações escritas.'}"
          </p>
        `;
        logsContainer.appendChild(logItem);
      });
    }
  } catch (err) {}
}

// Renderização Gráfico Integrado
function renderChart(labels, moodData, sleepData) {
  const ctx = document.getElementById('chart-evolucao-clinica').getContext('2d');
  
  if (evolucaoChart) {
    evolucaoChart.destroy();
  }

  evolucaoChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Nível de Humor (1-5)',
          data: moodData,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.3,
          borderWidth: 3,
          pointBackgroundColor: '#8b5cf6',
          pointRadius: 4,
          fill: true
        },
        {
          label: 'Qualidade do Sono (1-5)',
          data: sleepData,
          borderColor: '#0d9488',
          backgroundColor: 'rgba(13, 148, 136, 0.05)',
          tension: 0.3,
          borderWidth: 2,
          pointBackgroundColor: '#0d9488',
          pointRadius: 4,
          borderDash: [5, 5],
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 1,
          max: 5,
          ticks: {
            stepSize: 1,
            color: '#9ca3af'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
        },
        x: {
          ticks: {
            color: '#9ca3af'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
        }
      },
      plugins: {
        legend: {
          labels: {
            color: '#f3f4f6',
            font: { family: 'Outfit', size: 12, weight: '600' }
          }
        }
      }
    }
  });
}

// Renderizar Tags e Gatilhos
function renderTagClouds(data) {
  const sentimentoCount = {};
  const gatilhoCount = {};

  data.forEach(item => {
    try {
      const sArr = JSON.parse(item.sentimentos || '[]');
      const gArr = JSON.parse(item.gatilhos || '[]');
      
      sArr.forEach(s => sentimentoCount[s] = (sentimentoCount[s] || 0) + 1);
      gArr.forEach(g => gatilhoCount[g] = (gatilhoCount[g] || 0) + 1);
    } catch (e) {}
  });

  const sCloud = document.getElementById('sentimentos-cloud');
  const gCloud = document.getElementById('gatilhos-cloud');

  sCloud.innerHTML = '';
  gCloud.innerHTML = '';

  const sKeys = Object.keys(sentimentoCount);
  const gKeys = Object.keys(gatilhoCount);

  if (sKeys.length === 0) {
    sCloud.innerHTML = '<p class="empty-msg">Nenhum sentimento recorrente.</p>';
  } else {
    sKeys.forEach(tag => {
      const badge = document.createElement('span');
      badge.className = 'tag-badge';
      badge.innerText = `${tag} (${sentimentoCount[tag]})`;
      sCloud.appendChild(badge);
    });
  }

  if (gKeys.length === 0) {
    gCloud.innerHTML = '<p class="empty-msg">Nenhum gatilho recorrente.</p>';
  } else {
    gKeys.forEach(tag => {
      const badge = document.createElement('span');
      badge.className = 'tag-badge';
      badge.innerText = `${tag} (${gatilhoCount[tag]})`;
      gCloud.appendChild(badge);
    });
  }
}

// Cadastrar novo paciente (Psicólogo)
async function handleRegisterPaciente(e) {
  e.preventDefault();
  const nome = document.getElementById('new-pac-nome').value;
  const email = document.getElementById('new-pac-email').value;
  const senha = document.getElementById('new-pac-senha').value;
  const horario_notificacao = document.getElementById('new-pac-horario').value;
  const profissional_id = currentUser.id;

  try {
    await apiRequest('/auth/register-paciente', 'POST', {
      nome,
      email,
      senha,
      profissional_id,
      horario_notificacao
    });
    showToast('Paciente cadastrado e vinculado com sucesso!', 'success');
    closeNewPatientModal();
    await refreshPatientList();
    e.target.reset();
  } catch (err) {}
}

// Prontuários Clínicos (Cadastrar e Listar)
async function handleSaveProntuario(e) {
  e.preventDefault();
  const conteudo = document.getElementById('prontuario-texto').value;

  try {
    await apiRequest('/profissionais/prontuarios', 'POST', {
      paciente_id: currentPatientId,
      conteudo
    });
    showToast('Prontuário clínico salvo!', 'success');
    document.getElementById('prontuario-texto').value = '';
    await loadPatientProntuarios(currentPatientId);
  } catch (err) {}
}

async function loadPatientProntuarios(patientId) {
  try {
    const prontuarios = await apiRequest(`/profissionais/prontuarios/${patientId}`);
    const container = document.getElementById('prontuarios-history-container');
    container.innerHTML = '';

    if (prontuarios.length === 0) {
      container.innerHTML = '<p class="empty-msg">Nenhum registro clínico de prontuário cadastrado ainda.</p>';
      return;
    }

    prontuarios.forEach(p => {
      const item = document.createElement('div');
      item.className = 'prontuario-item';
      item.innerHTML = `
        <div class="prontuario-item-header">
          <span><i class="fa-solid fa-calendar"></i> Sessão em ${formatDateTime(p.data_criacao)}</span>
          <span>ID Registro: ${p.id.slice(0, 8)}...</span>
        </div>
        <p>${p.conteudo}</p>
      `;
      container.appendChild(item);
    });
  } catch (err) {}
}

// Modais do Psicólogo
function openNewPatientModal() {
  document.getElementById('modal-new-patient').classList.add('active');
}

function closeNewPatientModal() {
  document.getElementById('modal-new-patient').classList.remove('active');
}

function openEditPatientModal() {
  if (!currentPatientId) return;
  const pat = currentPatientsList.find(p => p.id === currentPatientId);
  if (!pat) return;

  document.getElementById('edit-pac-nome').value = pat.nome;
  document.getElementById('edit-pac-email').value = pat.email;
  document.getElementById('edit-pac-horario').value = pat.horario_notificacao;
  
  document.getElementById('modal-edit-patient').classList.add('active');
}

function closeEditPatientModal() {
  document.getElementById('modal-edit-patient').classList.remove('active');
}

async function handleEditPaciente(e) {
  e.preventDefault();
  const nome = document.getElementById('edit-pac-nome').value;
  const email = document.getElementById('edit-pac-email').value;
  const horario_notificacao = document.getElementById('edit-pac-horario').value;

  try {
    await apiRequest(`/profissionais/pacientes/${currentPatientId}`, 'PUT', {
      nome, email, horario_notificacao
    });
    showToast('Paciente atualizado com sucesso!', 'success');
    closeEditPatientModal();
    await refreshPatientList();
    
    // Atualiza visão se ele estiver ativo
    const pat = currentPatientsList.find(p => p.id === currentPatientId);
    if(pat) selectPatient(pat);
    
  } catch (err) {}
}

async function handleDeletePaciente() {
  if (!currentPatientId) return;
  
  if (confirm("TEM CERTEZA que deseja excluir este paciente? Todos os seus diários e prontuários associados serão perdidos. Esta ação não pode ser desfeita.")) {
    try {
      await apiRequest(`/profissionais/pacientes/${currentPatientId}`, 'DELETE');
      showToast('Paciente excluído com sucesso.', 'success');
      currentPatientId = null;
      document.getElementById('no-patient-selected-view').style.display = 'flex';
      document.getElementById('active-patient-view').style.display = 'none';
      await refreshPatientList();
      await loadProfessionalFeed();
    } catch (err) {}
  }
}

// ==========================================
// PORTAL DO PACIENTE - CARREGAMENTO DE DADOS
// ==========================================
async function loadPacienteDashboard() {
  document.getElementById('pac-display-name').innerText = currentUser.nome;
  await refreshPatientHistory();
}

async function refreshPatientHistory() {
  try {
    const history = await apiRequest('/pacientes/historico');
    const container = document.getElementById('patient-history-container');
    container.innerHTML = '';

    if (history.length === 0) {
      container.innerHTML = '<p class="empty-msg">Nenhum registro diário feito ainda.</p>';
      return;
    }

    const moodEmojiMap = { 1: '😫', 2: '😟', 3: '😐', 4: '🙂', 5: '😄' };

    history.forEach(log => {
      const item = document.createElement('div');
      item.className = 'history-item';
      
      let tags = '';
      try {
        const sArr = JSON.parse(log.sentimentos || '[]');
        if (sArr.length > 0) {
          tags = sArr.map(s => `<span class="tag-badge" style="font-size:0.7rem;padding:3px 6px;">${s}</span>`).join(' ');
        }
      } catch (e) {}

      item.innerHTML = `
        <div class="history-item-header">
          <span class="history-item-date"><i class="fa-solid fa-calendar"></i> ${formatDate(log.data_registro)}</span>
          <span class="history-item-mood">${moodEmojiMap[log.nivel_humor] || '😐'}</span>
        </div>
        <div class="history-item-sleep"><i class="fa-solid fa-bed"></i> Sono: <strong>${log.qualidade_sono}/5</strong></div>
        ${tags ? `<div class="tag-cloud" style="margin-top: 6px;">${tags}</div>` : ''}
        ${log.anotacoes ? `<p>"${log.anotacoes}"</p>` : ''}
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px;">
          <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" onclick='editRegistroDiario(${JSON.stringify(log).replace(/'/g, "&#39;")})'><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-logout" style="padding: 4px 10px; font-size: 0.75rem;" onclick='deleteRegistroDiario("${log.id}")'><i class="fa-solid fa-trash"></i></button>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {}
}

// Enviar Registro Diário (Paciente)
async function handleSaveRegistroDiario(e) {
  e.preventDefault();
  const nivel_humor = document.getElementById('registro-humor').value;
  const qualidade_sono = document.getElementById('registro-sono').value;
  const anotacoes = document.getElementById('registro-anotacoes').value;

  if (!nivel_humor) {
    showToast('Por favor, selecione um nível de humor (rosto)!', 'error');
    return;
  }

  // Coletar sentimentos
  const sentimentos = [];
  document.querySelectorAll('#sentimentos-chips .chip.active').forEach(chip => {
    sentimentos.push(chip.innerText);
  });

  // Coletar gatilhos
  const gatilhos = [];
  document.querySelectorAll('#gatilhos-chips .chip.active').forEach(chip => {
    gatilhos.push(chip.innerText);
  });

  try {
    if (currentEditRegistroId) {
      await apiRequest(`/pacientes/registros/${currentEditRegistroId}`, 'PUT', {
        nivel_humor: parseInt(nivel_humor),
        qualidade_sono: parseInt(qualidade_sono),
        sentimentos,
        gatilhos,
        anotacoes
      });
      showToast('Autorregistro atualizado com sucesso!', 'success');
      currentEditRegistroId = null;
      document.querySelector('#form-registro-diario button[type="submit"]').innerText = 'Enviar Registro Diário';
    } else {
      await apiRequest('/pacientes/registros', 'POST', {
        nivel_humor: parseInt(nivel_humor),
        qualidade_sono: parseInt(qualidade_sono),
        sentimentos,
        gatilhos,
        anotacoes
      });
      showToast('Autorregistro diário enviado com sucesso!', 'success');
    }
    
    // Resetar Formulário
    e.target.reset();
    document.getElementById('registro-humor').value = '';
    document.getElementById('sono-val-display').innerText = '3/5';
    document.querySelectorAll('.mood-option, .chip').forEach(el => el.classList.remove('active'));
    
    // Recarregar histórico
    await refreshPatientHistory();
  } catch (err) {}
}

function editRegistroDiario(log) {
  currentEditRegistroId = log.id;
  
  // Limpar form atual
  document.querySelectorAll('.mood-option, .chip').forEach(el => el.classList.remove('active'));
  
  // Setar Nível de Humor
  document.getElementById('registro-humor').value = log.nivel_humor;
  const moodOpt = document.querySelector(`.mood-option[data-value="${log.nivel_humor}"]`);
  if (moodOpt) moodOpt.classList.add('active');
  
  // Setar Sono
  document.getElementById('registro-sono').value = log.qualidade_sono;
  document.getElementById('sono-val-display').innerText = log.qualidade_sono + '/5';
  
  // Setar Sentimentos
  try {
    const sArr = JSON.parse(log.sentimentos || '[]');
    document.querySelectorAll('#sentimentos-chips .chip').forEach(chip => {
      if (sArr.includes(chip.innerText)) chip.classList.add('active');
    });
  } catch(e) {}
  
  // Setar Gatilhos
  try {
    const gArr = JSON.parse(log.gatilhos || '[]');
    document.querySelectorAll('#gatilhos-chips .chip').forEach(chip => {
      if (gArr.includes(chip.innerText)) chip.classList.add('active');
    });
  } catch(e) {}
  
  // Setar Anotações
  document.getElementById('registro-anotacoes').value = log.anotacoes || '';
  
  // Mudar texto botão
  document.querySelector('#form-registro-diario button[type="submit"]').innerText = 'Atualizar Registro Diário';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteRegistroDiario(id) {
  if (confirm("Deseja realmente excluir este registro diário?")) {
    try {
      await apiRequest(`/pacientes/registros/${id}`, 'DELETE');
      showToast('Registro excluído com sucesso.', 'success');
      await refreshPatientHistory();
    } catch (err) {}
  }
}

// ==========================================
// UTILITÁRIOS E TOASTS
// ==========================================
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  const messageEl = document.getElementById('toast-msg');

  messageEl.innerText = msg;
  toast.className = `toast ${type} active`;

  if (type === 'success') {
    icon.className = 'fa-solid fa-circle-check';
  } else {
    icon.className = 'fa-solid fa-triangle-exclamation';
  }

  setTimeout(() => {
    toast.classList.remove('active');
  }, 4000);
}

// Formatação de Datas
function formatDate(dateStr) {
  if (!dateStr) return '';
  // Se for YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  const date = new Date(dateStr);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  const date = new Date(dateTimeStr);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} às ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
