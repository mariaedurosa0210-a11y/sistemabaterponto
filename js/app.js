/**
 * Application Core Logic - Sistema de Ponto Web
 * Controla validação de matrícula, navegação de telas, geração de Hash SHA-256,
 * validação de jornada com tolerância, tratamento de alertas anti-fraude e impressão de ticket.
 */

import {
  getFuncionarioByMatricula,
  uploadComprovanteFoto,
  saveRegistroPonto,
  getStoredConfig,
  saveStoredConfig
} from './supabaseClient.js';

import { initCamera, captureSnapshot } from './camera.js';

// Estado global da aplicação
const state = {
  matricula: '',
  funcionario: null,
  tipoBatida: null, // 'ENTRADA', 'SAIDA_ALMOCO', 'RETORNO_ALMOCO', 'SAIDA'
  isCameraActive: false,
  cameraError: null,
  isProcessing: false
};

// Mapeamento dos rótulos amigáveis para os tipos de batida
const TIPO_LABELS = {
  'ENTRADA': 'Entrada Principal',
  'SAIDA_ALMOCO': 'Saída p/ Almoço',
  'RETORNO_ALMOCO': 'Retorno do Almoço',
  'SAIDA': 'Saída Principal'
};

// Inicialização de Elementos do DOM
document.addEventListener('DOMContentLoaded', () => {
  initRealtimeClock();
  setupKeypad();
  setupPunchTypeButtons();
  setupActionButtons();
  setupConfigModal();
  setupCamera();

  // Renderizar ícones Lucide se disponível
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

/**
 * Atualiza relógio digital da interface a cada segundo.
 */
function initRealtimeClock() {
  const timeEl = document.getElementById('clock-time');
  const dateEl = document.getElementById('clock-date');

  function update() {
    const now = new Date();
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString('pt-BR', { hour12: false });
    }
    if (dateEl) {
      dateEl.textContent = now.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  update();
  setInterval(update, 1000);
}

/**
 * Configuração da Câmera
 */
async function setupCamera() {
  const videoEl = document.getElementById('camera-video');
  const badgeEl = document.getElementById('camera-badge');

  const res = await initCamera(videoEl);
  state.isCameraActive = res.active;
  state.cameraError = res.error || null;

  if (badgeEl) {
    if (res.active) {
      badgeEl.className = 'camera-badge active';
      badgeEl.innerHTML = '<i data-lucide="video"></i> Câmera Ativa';
    } else {
      badgeEl.className = 'camera-badge error';
      badgeEl.innerHTML = '<i data-lucide="video-off"></i> Câmera Bloqueada/Ausente';
    }
    if (window.lucide) window.lucide.createIcons();
  }
}

/**
 * Configuração do Teclado Numérico e Busca
 */
function setupKeypad() {
  const displayEl = document.getElementById('matricula-display');
  const keypad = document.getElementById('keypad-grid');
  const validarBtn = document.getElementById('btn-validar-matricula');

  if (validarBtn) {
    validarBtn.addEventListener('click', async () => {
      await handleValidarMatricula();
    });
  }

  if (keypad) {
    keypad.addEventListener('click', async (e) => {
      const target = e.target.closest('button');
      if (!target) return;

      const key = target.dataset.key;
      const action = target.dataset.action;

      if (key !== undefined) {
        if (state.matricula.length < 10) {
          state.matricula += key;
          updateMatriculaDisplay();
        }
      } else if (action === 'clear') {
        state.matricula = '';
        resetEmployeeSelection();
        updateMatriculaDisplay();
      } else if (action === 'backspace') {
        state.matricula = state.matricula.slice(0, -1);
        resetEmployeeSelection();
        updateMatriculaDisplay();
      } else if (action === 'confirm') {
        await handleValidarMatricula();
      }
    });
  }

  if (displayEl) {
    displayEl.addEventListener('input', (e) => {
      state.matricula = e.target.value.replace(/\D/g, '');
      e.target.value = state.matricula;
      resetEmployeeSelection();
    });

    displayEl.addEventListener('keypress', async (e) => {
      if (e.key === 'Enter') {
        await handleValidarMatricula();
      }
    });
  }
}

function updateMatriculaDisplay() {
  const displayEl = document.getElementById('matricula-display');
  if (displayEl) {
    displayEl.value = state.matricula;
  }
}

function resetEmployeeSelection() {
  state.funcionario = null;
  state.tipoBatida = null;

  const empCard = document.getElementById('employee-card');
  if (empCard) empCard.style.display = 'none';

  updatePunchButtonsState();
}

/**
 * Validação do Funcionário por Matrícula
 */
async function handleValidarMatricula() {
  if (!state.matricula) {
    showToast('Digite o número da matrícula.', 'warning');
    return;
  }

  showToast('Consultando funcionário...', 'info');

  const res = await getFuncionarioByMatricula(state.matricula);

  if (!res.success) {
    showToast(res.error, 'error');
    resetEmployeeSelection();
    return;
  }

  state.funcionario = res.data;
  showToast(`Funcionário localizado: ${res.data.nome}`, 'success');

  const empCard = document.getElementById('employee-card');
  const empName = document.getElementById('employee-name');
  const empDetails = document.getElementById('employee-details');

  if (empCard && empName && empDetails) {
    empName.textContent = res.data.nome;
    const cargoStr = res.data.cargo ? ` • ${res.data.cargo}` : '';
    const jornadaStr = res.data.jornadas_padrao ? ` • Jornada: ${res.data.jornadas_padrao.nome}` : '';
    empDetails.textContent = `Matrícula: ${res.data.matricula}${cargoStr}${jornadaStr}`;
    empCard.style.display = 'flex';
  }

  updatePunchButtonsState();
}

/**
 * Botões de Seleção do Tipo de Batida
 */
function setupPunchTypeButtons() {
  const grid = document.getElementById('punch-types-grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-punch');
    if (!btn || btn.disabled) return;

    document.querySelectorAll('.btn-punch').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    state.tipoBatida = btn.dataset.tipo;

    const confirmBtn = document.getElementById('btn-confirm-punch');
    if (confirmBtn) {
      confirmBtn.disabled = !state.funcionario || !state.tipoBatida;
    }
  });
}

function updatePunchButtonsState() {
  const buttons = document.querySelectorAll('.btn-punch');
  const confirmBtn = document.getElementById('btn-confirm-punch');

  buttons.forEach(btn => {
    btn.disabled = !state.funcionario;
    btn.classList.remove('selected');
  });

  if (confirmBtn) {
    confirmBtn.disabled = !state.funcionario || !state.tipoBatida;
  }
}

/**
 * Configuração dos Botões de Ação Principais
 */
function setupActionButtons() {
  const confirmBtn = document.getElementById('btn-confirm-punch');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', handleRegistrarPonto);
  }

  const printBtn = document.getElementById('btn-print-ticket');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      if (window.printJS) {
        window.printJS({
          printable: 'ticket-content',
          type: 'html',
          style: `
            .ticket-container { font-family: monospace; font-size: 12px; padding: 10px; border: 1px dashed #000; }
            .ticket-header { text-align: center; font-weight: bold; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
            .ticket-row { display: flex; justify-content: space-between; margin: 4px 0; }
            .ticket-hash { font-size: 9px; word-break: break-all; background: #f0f0f0; padding: 4px; margin-top: 6px; }
            .ticket-footer { text-align: center; margin-top: 8px; border-top: 1px dashed #000; padding-top: 5px; font-size: 10px; }
          `
        });
      } else {
        window.print();
      }
    });
  }

  const closeTicketBtn = document.getElementById('btn-close-ticket');
  if (closeTicketBtn) {
    closeTicketBtn.addEventListener('click', () => {
      closeModal('ticket-modal');
      resetForm();
    });
  }
}

/**
 * Geração de Hash SHA-256 Combinando: matricula + timestamp ISO + tipo
 * @param {string} matricula
 * @param {string} timestampIso
 * @param {string} tipo
 * @returns {Promise<string>}
 */
export async function generateSHA256Hash(matricula, timestampIso, tipo) {
  const rawString = `${matricula}_${timestampIso}_${tipo}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(rawString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verificação de Jornada e Tolerância
 * Compara horário atual com a jornada padrão vinculada
 * @param {object} jornada
 * @param {string} tipoBatida
 * @param {Date} now
 * @returns {string} 'NORMAL' | 'ATRASO' | 'SAIDA_ANTECIPADA'
 */
export function checkJornadaStatus(jornada, tipoBatida, now = new Date()) {
  if (!jornada) return 'NORMAL';

  const toleranciMinutos = jornada.tolerancia_minutos || 10;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  function timeToMinutes(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  const entrada1 = timeToMinutes(jornada.entrada_1);
  const saida1 = timeToMinutes(jornada.saida_1);
  const entrada2 = timeToMinutes(jornada.entrada_2);
  const saida2 = timeToMinutes(jornada.saida_2);

  if (tipoBatida === 'ENTRADA' && entrada1 !== null) {
    if (currentMinutes > entrada1 + toleranciMinutos) {
      return 'ATRASO';
    }
  } else if (tipoBatida === 'SAIDA_ALMOCO' && saida1 !== null) {
    if (currentMinutes < saida1 - toleranciMinutos) {
      return 'SAIDA_ANTECIPADA';
    }
  } else if (tipoBatida === 'RETORNO_ALMOCO' && entrada2 !== null) {
    if (currentMinutes > entrada2 + toleranciMinutos) {
      return 'ATRASO';
    }
  } else if (tipoBatida === 'SAIDA' && saida2 !== null) {
    if (currentMinutes < saida2 - toleranciMinutos) {
      return 'SAIDA_ANTECIPADA';
    }
  }

  return 'NORMAL';
}

/**
 * Fluxo Principal: Registrar Ponto
 */
async function handleRegistrarPonto() {
  if (state.isProcessing) return;

  if (!state.funcionario || !state.tipoBatida) {
    showToast('Selecione o funcionário e o tipo de batida.', 'warning');
    return;
  }

  state.isProcessing = true;
  showToast('Processando registro de ponto...', 'info');

  const videoEl = document.getElementById('camera-video');
  let photoBlob = null;
  let alertaFraude = false;
  let motivoAlerta = null;

  // 1. Verificação da Câmera (Prevenção de Fraude de Imagem)
  if (!state.isCameraActive) {
    alertaFraude = true;
    motivoAlerta = 'Câmera indisponível ou bloqueada durante o registro.';
  } else {
    photoBlob = await captureSnapshot(videoEl);
    if (!photoBlob) {
      alertaFraude = true;
      motivoAlerta = 'Falha ao capturar imagem snapshot da câmera.';
    }
  }

  // Se houver fraude de imagem (câmera indisponível/bloqueada), registra o alerta de fraude
  if (alertaFraude) {
    showToast(`Alerta de fraude registrado: ${motivoAlerta}`, 'error');

    // Registrar o evento de fraude no banco de dados com alerta_fraude = true
    const nowIso = new Date().toISOString();
    const hash = await generateSHA256Hash(state.funcionario.matricula, nowIso, state.tipoBatida);

    const fraudRecord = {
      funcionario_id: state.funcionario.id,
      matricula: state.funcionario.matricula,
      tipo: state.tipoBatida,
      hash_autenticidade: hash,
      foto_url: null,
      status_jornada: 'NORMAL',
      alerta_fraude: true,
      motivo_alerta: motivoAlerta
    };

    const saveRes = await saveRegistroPonto(fraudRecord);
    state.isProcessing = false;

    if (saveRes.success) {
      displayTicketModal(saveRes.data);
    }
    return;
  }

  // 2. Upload da Imagem Snapshot para o Supabase Storage
  let fotoUrl = null;
  if (photoBlob) {
    const uploadRes = await uploadComprovanteFoto(photoBlob, state.funcionario.matricula);
    if (uploadRes.success) {
      fotoUrl = uploadRes.publicUrl;
    } else {
      console.warn('Não foi possível salvar a imagem no Storage:', uploadRes.error);
    }
  }

  // 3. Verificação da Jornada e Status (ATRASO / SAIDA_ANTECIPADA)
  const statusJornada = checkJornadaStatus(
    state.funcionario.jornadas_padrao,
    state.tipoBatida
  );

  const timestampIso = new Date().toISOString();
  const hashAutenticidade = await generateSHA256Hash(
    state.funcionario.matricula,
    timestampIso,
    state.tipoBatida
  );

  // 4. Gravação da Batida no Supabase (timestamp gerado pelo servidor via default NOW())
  const recordPayload = {
    funcionario_id: state.funcionario.id,
    matricula: state.funcionario.matricula,
    tipo: state.tipoBatida,
    hash_autenticidade: hashAutenticidade,
    foto_url: fotoUrl,
    status_jornada: statusJornada,
    alerta_fraude: false,
    motivo_alerta: null
  };

  const saveRes = await saveRegistroPonto(recordPayload);

  state.isProcessing = false;

  if (!saveRes.success) {
    showToast(saveRes.error, 'error');
    return;
  }

  showToast('Ponto registrado com sucesso!', 'success');

  // 5. Exibir Comprovante Ticket
  const createdRecord = saveRes.data;
  displayTicketModal(createdRecord);
}

/**
 * Exibe modal com o ticket comprovante da batida
 */
function displayTicketModal(record) {
  const dataHoraObj = record.data_hora ? new Date(record.data_hora) : new Date();
  const dataStr = dataHoraObj.toLocaleDateString('pt-BR');
  const horaStr = dataHoraObj.toLocaleTimeString('pt-BR', { hour12: false });

  document.getElementById('ticket-nome').textContent = state.funcionario.nome;
  document.getElementById('ticket-matricula').textContent = state.funcionario.matricula;
  document.getElementById('ticket-tipo').textContent = TIPO_LABELS[record.tipo] || record.tipo;
  document.getElementById('ticket-datahora').textContent = `${dataStr} às ${horaStr}`;
  document.getElementById('ticket-status').textContent = record.alerta_fraude ? 'ALERTA_FRAUDE' : record.status_jornada;
  document.getElementById('ticket-hash').textContent = record.hash_autenticidade;

  openModal('ticket-modal');
}

function resetForm() {
  state.matricula = '';
  resetEmployeeSelection();
  updateMatriculaDisplay();
}

/**
 * Modal de Configurações das Credenciais Supabase
 */
function setupConfigModal() {
  const configBtn = document.getElementById('btn-open-config');
  const closeBtn = document.getElementById('btn-close-config');
  const saveBtn = document.getElementById('btn-save-config');

  if (configBtn) {
    configBtn.addEventListener('click', () => {
      const cfg = getStoredConfig();
      document.getElementById('cfg-url').value = cfg.url;
      document.getElementById('cfg-key').value = cfg.key;
      openModal('config-modal');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeModal('config-modal'));
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const url = document.getElementById('cfg-url').value;
      const key = document.getElementById('cfg-key').value;
      saveStoredConfig(url, key);
      showToast('Configurações salvas. Recarregando página...', 'success');
      setTimeout(() => window.location.reload(), 1000);
    });
  }
}

/**
 * Helpers para Modais e Toasts
 */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('status-toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `status-toast visible ${type}`;

  setTimeout(() => {
    toast.classList.remove('visible');
  }, 4000);
}
