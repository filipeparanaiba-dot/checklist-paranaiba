/* ==========================================================================
   SUPER CHECKLIST PARANAÍBA — PRODUCTION JAVASCRIPT ENGINE (V3.0)
   ========================================================================== */

let currentStore = '1';

const storeDatabase = {
  '1': {
    name: 'Loja 1 — Centro',
    isl: 94,
    conformCount: 24,
    nonConformCount: 2,
    checklistsStr: '8 / 10',
    actionsStr: '3 Pendentes',
    perdasStr: 'R$ 1.840'
  },
  '2': {
    name: 'Loja 2 — Bairro',
    isl: 88,
    conformCount: 20,
    nonConformCount: 4,
    checklistsStr: '6 / 10',
    actionsStr: '2 Pendentes',
    perdasStr: 'R$ 1.250'
  }
};

// Safe Lucide Icons Refresh
function safeCreateIcons() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    try { lucide.createIcons(); } catch (e) { console.warn(e); }
  }
}

// Navigation Controller
function navigate(viewId) {
  document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.mob-tab').forEach(b => b.classList.remove('active'));

  const targetPage = document.getElementById('view-' + viewId);
  const targetNav = document.getElementById('nav-' + viewId);
  const targetMobNav = document.getElementById('mobtab-' + viewId);

  if (targetPage) targetPage.classList.add('active');
  if (targetNav) targetNav.classList.add('active');
  if (targetMobNav) targetMobNav.classList.add('active');

  // Sync Header Titles
  const storeName = storeDatabase[currentStore].name;
  const hTitle = document.getElementById('header-page-title');
  const hSub = document.getElementById('header-page-subtitle');

  if (hTitle && hSub) {
    if (viewId === 'dashboard') {
      hTitle.innerText = `Painel Operacional — ${storeName}`;
      hSub.innerText = `Acompanhamento em tempo real de rotinas, prevenção de perdas e indicadores`;
    } else if (viewId === 'rotinas') {
      hTitle.innerText = `Execução de Auditoria — ${storeName}`;
      hSub.innerText = `Formulários operacionais de fiscalização de setor`;
    } else if (viewId === 'builder') {
      hTitle.innerText = `Criador de Checklists (Form Builder)`;
      hSub.innerText = `Personalização livre e criação de rotinas para qualquer setor`;
    } else if (viewId === '5w2h') {
      hTitle.innerText = `Planos de Ação 5W2H — ${storeName}`;
      hSub.innerText = `Gestão de não conformidades com atribuição de responsáveis e SLA`;
    } else if (viewId === 'perdas') {
      hTitle.innerText = `Prevenção de Perdas & VR Software — ${storeName}`;
      hSub.innerText = `Tabela com Preço de Custo real e alteração de preço sugerido`;
    } else if (viewId === 'whatsapp') {
      hTitle.innerText = `Automação WhatsApp Bot — ${storeName}`;
      hSub.innerText = `Gerenciador de disparos e relatórios em grupos de gestores`;
    } else if (viewId === 'ranking') {
      hTitle.innerText = `Gamificação da Rede`;
      hSub.innerText = `Ranking de saúde de lojas e conformidade operacional`;
    }
  }

  // Scroll to top immediately for mobile & desktop
  const mainEl = document.querySelector('.app-main');
  if (mainEl) mainEl.scrollTop = 0;
  window.scrollTo(0, 0);

  safeCreateIcons();
}

// Change Active Store
function changeStore(storeId) {
  currentStore = storeId;
  const db = storeDatabase[storeId];

  // Sync pickers
  const desktopPicker = document.getElementById('desktop-store-picker');
  const mobilePicker = document.getElementById('mobile-store-picker');
  if (desktopPicker) desktopPicker.value = storeId;
  if (mobilePicker) mobilePicker.value = storeId;

  // Reactivity
  document.getElementById('isl-score-val').innerText = db.isl;
  document.getElementById('isl-bar-fill').style.width = db.isl + '%';
  document.getElementById('isl-conform-txt').innerText = `${db.conformCount} Itens Conformes`;
  document.getElementById('isl-nonconform-txt').innerText = `${db.nonConformCount} Não Conformes`;
  document.getElementById('metric-checklists').innerText = db.checklistsStr;
  document.getElementById('metric-5w2h').innerText = db.actionsStr;
  document.getElementById('metric-perdas').innerText = db.perdasStr;

  navigate('dashboard');
}

// Start Specific Sector Audit
function startChecklist(sectorKey) {
  const title = document.getElementById('exec-title');
  const subtitle = document.getElementById('exec-subtitle');
  const storeName = storeDatabase[currentStore].name;

  if (sectorKey === 'acougue') {
    title.innerText = 'Vistoria Açougue & Câmaras Frias';
    subtitle.innerText = `Unidade: ${storeName} | Setor 04 (Açougue)`;
  } else if (sectorKey === 'flv') {
    title.innerText = 'Recebimento Doca / FLV (Hortifrúti)';
    subtitle.innerText = `Unidade: ${storeName} | Setor 02 (Doca & Perecíveis)`;
  } else if (sectorKey === 'gondola') {
    title.innerText = 'Prevenção de Ruptura & Gôndola';
    subtitle.innerText = `Unidade: ${storeName} | Mercearia & Frente de Loja`;
  } else {
    title.innerText = 'Fechamento & Proteção Térmica Noturna';
    subtitle.innerText = `Unidade: ${storeName} | Lockout Noturno`;
  }

  navigate('rotinas');
}

// Question Option Selection
function answerQuestion(qId, choice) {
  const card = document.getElementById('qcard-' + qId);
  if (!card) return;

  const buttons = card.querySelectorAll('.btn-resp');
  buttons.forEach(b => b.classList.remove('selected'));

  if (choice === 'conform') {
    const btn = card.querySelector('.resp-conform');
    if (btn) btn.classList.add('selected');
    document.getElementById('trigger-5w2h-' + qId)?.classList.add('hidden');
  } else if (choice === 'nonconform') {
    const btn = card.querySelector('.resp-nonconform');
    if (btn) btn.classList.add('selected');
    document.getElementById('trigger-5w2h-' + qId)?.classList.remove('hidden');
  } else {
    const btn = card.querySelector('.resp-na');
    if (btn) btn.classList.add('selected');
    document.getElementById('trigger-5w2h-' + qId)?.classList.add('hidden');
  }
}

// AI Visual Scan Simulation
function simulateAIScan(qId) {
  const box = document.getElementById('ai-box-' + qId);
  if (box) {
    box.classList.remove('hidden');
    answerQuestion(qId, 'nonconform');
  }
}

// Form Builder Question Management
function addBuilderQuestion() {
  const container = document.getElementById('builder-questions-list');
  const div = document.createElement('div');
  div.className = 'builder-q-item';
  div.innerHTML = `
    <input type="text" placeholder="Digite a pergunta da vistoria...">
    <button class="btn-del" onclick="this.parentElement.remove()">&times;</button>
  `;
  container.appendChild(div);
}

function saveCustomChecklist() {
  const name = document.getElementById('builder-name').value;
  const sector = document.getElementById('builder-sector').value;

  if (!name) {
    alert('Por favor, informe o nome do checklist!');
    return;
  }

  alert(`🎯 CHECKLIST CRIADO COM SUCESSO!\n\nNome: ${name}\nSetor: ${sector}\n\nDisponibilizado imediatamente para os celulares dos encarregados da ${storeDatabase[currentStore].name}.`);
  document.getElementById('builder-name').value = '';
  navigate('dashboard');
}

// Loss Prevention Margin % Live Calculator
function calcMargin(rowId, costPrice) {
  const inputEl = document.getElementById('price-in-' + rowId);
  const pillEl = document.getElementById('margin-pill-' + rowId);
  if (!inputEl || !pillEl) return;

  const newPrice = parseFloat(inputEl.value) || 0;
  if (newPrice <= 0) {
    pillEl.innerText = '0%';
    pillEl.className = 'margin-pill red';
    return;
  }

  // Margin % = ((Price - Cost) / Price) * 100
  const margin = (((newPrice - costPrice) / newPrice) * 100).toFixed(1);

  if (margin >= 0) {
    pillEl.innerText = `+${margin}%`;
    pillEl.className = 'margin-pill green';
  } else {
    pillEl.innerText = `${margin}%`;
    pillEl.className = 'margin-pill red';
  }
}

// Submit Modified Suggested Price to VR Software
function sendToVR(rowId, prodName) {
  const inputEl = document.getElementById('price-in-' + rowId);
  const btnEl = document.getElementById('btn-vr-send-' + rowId);
  const priceVal = parseFloat(inputEl.value).toFixed(2);

  btnEl.innerHTML = '<i data-lucide="check-check"></i> Preço Alterado no VR';
  btnEl.style.background = '#10b981';
  btnEl.disabled = true;
  inputEl.disabled = true;

  safeCreateIcons();

  alert(`🚀 REBAIXE ENVIADO AO VR SOFTWARE!\n\nProduto: ${prodName}\nNovo Preço no Caixa: R$ ${priceVal}\n\nPreço atualizado em todos os PDVs da ${storeDatabase[currentStore].name}.`);
}

// 5W2H Action Completion
function resolve5W2H(cardId) {
  const elem = document.getElementById(cardId);
  if (elem) {
    elem.style.opacity = '0.35';
    elem.style.pointerEvents = 'none';
    alert('Plano 5W2H marcado como Concluído! Notificação enviada no grupo do WhatsApp.');
  }
}

// Submission of Checklist Audit
function submitChecklist() {
  alert('Auditoria finalizada com sucesso! Dados sincronizados no servidor e laudo enviado ao WhatsApp.');
  openWhatsAppModal();
}

// Modal Trigger Functions
function open5W2HModal(qId) {
  document.getElementById('modal-5w2h-edit').classList.remove('hidden');
}

function save5W2HModal() {
  alert('Plano 5W2H atualizado e reenviado para o WhatsApp do encarregado!');
  closeModals();
}

function openWhatsAppModal() {
  const storeName = storeDatabase[currentStore].name;
  const grpTitle = document.getElementById('wa-grp-title');
  const txtBody = document.getElementById('wa-body-txt');

  if (grpTitle) grpTitle.innerText = `Grupo Gestores — ${storeName}`;
  if (txtBody) {
    txtBody.innerHTML = `
      📱 *RESUMO OPERACIONAL - ${storeName.toUpperCase()}*<br>
      🗓️ _Data: 23/07/2026 - 12:00_<br><br>
      📊 *Saúde da Loja (ISL):* ${storeDatabase[currentStore].isl}% (${storeDatabase[currentStore].isl >= 90 ? 'Excelente' : 'Bom'})<br>
      ✅ *Checklists Concluídos:* ${storeDatabase[currentStore].checklistsStr}<br><br>
      🚨 *Planos 5W2H Ativos (1):*<br>
      • *Açougue:* Temp. Câmara Fria em 6.8°C.<br>
      └ 👤 Responsável: Ricardo Silva | ⏰ Prazo: 14:00<br><br>
      _Disparado via Super Sistema Paranaíba Server_
    `;
  }

  document.getElementById('modal-wa').classList.remove('hidden');
}

function openPOPModal() {
  document.getElementById('modal-pop').classList.remove('hidden');
}

function closeModals() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
  safeCreateIcons();
});
