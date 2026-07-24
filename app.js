// State Management
let currentStore = '1';
let storeData = {
  '1': {
    name: 'Loja 1 — Centro',
    isl: 94,
    conform: 24,
    nonConform: 2,
    checklists: '8 / 10',
    actions: 3,
    perdas: 'R$ 1.840'
  },
  '2': {
    name: 'Loja 2 — Bairro',
    isl: 88,
    conform: 20,
    nonConform: 4,
    checklists: '6 / 10',
    actions: 2,
    perdas: 'R$ 1.250'
  }
};

// Navigation Controller (Desktop & Mobile)
function navigate(viewId) {
  document.querySelectorAll('.view-page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.mob-nav-btn').forEach(btn => btn.classList.remove('active'));

  const targetView = document.getElementById('view-' + viewId);
  const targetNav = document.getElementById('side-' + viewId);
  const targetMobNav = document.getElementById('mob-' + viewId);

  if (targetView) targetView.classList.add('active');
  if (targetNav) targetNav.classList.add('active');
  if (targetMobNav) targetMobNav.classList.add('active');

  // Update Page Title
  const storeName = storeData[currentStore].name;
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) {
    if (viewId === 'dashboard') pageTitle.innerText = `Painel Operacional — ${storeName}`;
    else if (viewId === 'rotinas') pageTitle.innerText = `Execução de Checklist — ${storeName}`;
    else if (viewId === '5w2h') pageTitle.innerText = `Planos de Ação 5W2H — ${storeName}`;
    else if (viewId === 'perdas') pageTitle.innerText = `Prevenção de Perdas & VR — ${storeName}`;
    else if (viewId === 'whatsapp') pageTitle.innerText = `Automação de WhatsApp — ${storeName}`;
    else if (viewId === 'ranking') pageTitle.innerText = `Gamificação da Rede`;
  }

  // Scroll to top on view change
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Switch Active Store
function switchStore(storeId) {
  currentStore = storeId;
  const data = storeData[storeId];

  // Sync both select pickers
  const globalPicker = document.getElementById('global-store-picker');
  const mobilePicker = document.getElementById('mobile-store-picker');
  if (globalPicker) globalPicker.value = storeId;
  if (mobilePicker) mobilePicker.value = storeId;

  document.getElementById('isl-score').innerHTML = `${data.isl}<small>%</small>`;
  document.getElementById('isl-progress-bar').style.width = data.isl + '%';
  document.getElementById('isl-conform-count').innerText = `${data.conform} Conformes`;
  document.getElementById('isl-nonconform-count').innerText = `${data.nonConform} Não Conformes`;
  document.getElementById('stat-checklists-val').innerText = data.checklists;
  document.getElementById('stat-5w2h-val').innerText = `${data.actions} Pendentes`;
  document.getElementById('stat-perdas-val').innerText = data.perdas;

  navigate('dashboard');
}

// Start Specific Checklist Execution
function startChecklistExecution(type) {
  const title = document.getElementById('exec-title');
  const subtitle = document.getElementById('exec-subtitle');
  const storeName = storeData[currentStore].name;

  if (type === 'acougue') {
    title.innerText = 'Vistoria Açougue & Câmaras Frias';
    subtitle.innerText = `Unidade: ${storeName} | Setor 04 (Açougue)`;
  } else if (type === 'flv') {
    title.innerText = 'Recebimento Doca / FLV (Hortifrúti)';
    subtitle.innerText = `Unidade: ${storeName} | Setor 02 (Doca & Perecíveis)`;
  } else if (type === 'gondola') {
    title.innerText = 'Prevenção de Ruptura & Gôndola';
    subtitle.innerText = `Unidade: ${storeName} | Mercearia & Frente de Loja`;
  } else {
    title.innerText = 'Fechamento & Proteção Térmica Noturna';
    subtitle.innerText = `Unidade: ${storeName} | Lockout Noturno`;
  }

  navigate('rotinas');
}

// Question Answer Handler
function answerQuestion(qId, choice) {
  const card = document.getElementById('q-' + qId);
  const buttons = card.querySelectorAll('.btn-choice');

  buttons.forEach(b => b.classList.remove('selected'));

  if (choice === 'conform') {
    card.querySelector('.choice-conform').classList.add('selected');
    document.getElementById('card-5w2h-trigger-' + qId)?.classList.add('hidden');
  } else if (choice === 'nonconform') {
    card.querySelector('.choice-nonconform').classList.add('selected');
    document.getElementById('card-5w2h-trigger-' + qId)?.classList.remove('hidden');
  } else {
    card.querySelector('.choice-na').classList.add('selected');
    document.getElementById('card-5w2h-trigger-' + qId)?.classList.add('hidden');
  }
}

// AI Visual Scan Simulation
function triggerAIScan(qId) {
  const resultBox = document.getElementById('ai-result-' + qId);
  if (resultBox) {
    resultBox.classList.remove('hidden');
    answerQuestion(qId, 'nonconform');
  }
}

// Finish Checklist Submission & WhatsApp Trigger
function finishChecklistSubmission() {
  alert('Checklist finalizado com sucesso! Sincronizado offline e enviado para a matriz.');
  triggerWhatsAppModal();
}

// WhatsApp Modal Trigger
function triggerWhatsAppModal() {
  const storeName = storeData[currentStore].name;
  const modalGroupTitle = document.getElementById('wa-modal-group-title');
  const modalMsgBody = document.getElementById('wa-modal-msg-body');

  if (modalGroupTitle) modalGroupTitle.innerText = `Grupo Gestores — ${storeName}`;
  if (modalMsgBody) {
    modalMsgBody.innerHTML = `
      📱 *RESUMO OPERACIONAL - ${storeName.toUpperCase()}*<br>
      🗓️ _Data: 23/07/2026 - 12:00_<br><br>
      📊 *Saúde da Loja (ISL):* ${storeData[currentStore].isl}% (${storeData[currentStore].isl >= 90 ? 'Excelente' : 'Bom'})<br>
      ✅ *Checklists Concluídos:* ${storeData[currentStore].checklists}<br><br>
      🚨 *Planos 5W2H Ativos (1):*<br>
      • *Açougue:* Temp. Câmara Fria 02 em 6.8°C.<br>
      └ 👤 Responsável: Ricardo Silva | ⏰ Prazo: 14:00<br><br>
      _Disparado via Super Sistema Paranaíba Server_
    `;
  }

  document.getElementById('modal-wa-simulation').classList.remove('hidden');
}

// Calculate Residual Margin % live when manager edits suggested price
function calculateMargin(rowId, costPrice) {
  const inputElem = document.getElementById('price-input-' + rowId);
  const badgeElem = document.getElementById('margin-badge-' + rowId);
  
  if (!inputElem || !badgeElem) return;

  const newPrice = parseFloat(inputElem.value) || 0;
  
  if (newPrice <= 0) {
    badgeElem.innerText = '0%';
    badgeElem.className = 'margin-badge negative';
    return;
  }

  // Formula: Margin % = ((Price - Cost) / Price) * 100
  const marginPct = (((newPrice - costPrice) / newPrice) * 100).toFixed(1);

  if (marginPct >= 0) {
    badgeElem.innerText = `+${marginPct}%`;
    badgeElem.className = 'margin-badge positive';
  } else {
    badgeElem.innerText = `${marginPct}%`;
    badgeElem.className = 'margin-badge negative';
  }
}

// Submit Manager-Edited Price to VR Software
function submitPriceToVR(rowId, prodName) {
  const inputElem = document.getElementById('price-input-' + rowId);
  const btnElem = document.getElementById('btn-vr-' + rowId);
  
  const finalPrice = parseFloat(inputElem.value).toFixed(2);

  btnElem.innerHTML = '<i data-lucide="check-check"></i> Preço Alterado no VR';
  btnElem.style.background = '#10b981';
  btnElem.disabled = true;
  inputElem.disabled = true;

  if (window.lucide) lucide.createIcons();

  alert(`🎯 PREÇO ATUALIZADO NO VR SOFTWARE!\n\nProduto: ${prodName}\nNovo Preço de Venda: R$ ${finalPrice}\n\nInstrução enviada imediatamente aos caixas da ${storeData[currentStore].name}.`);
}

// 5W2H Resolve
function resolve5W2H(itemId) {
  const item = document.getElementById(itemId);
  if (item) {
    item.style.opacity = '0.4';
    item.style.pointerEvents = 'none';
    alert('Plano de Ação 5W2H finalizado com sucesso! Status atualizado no WhatsApp.');
  }
}

// Modal Controllers
function edit5W2H(qId) {
  document.getElementById('modal-edit-5w2h').classList.remove('hidden');
}

function save5W2HModal() {
  alert('Plano 5W2H atualizado e reenviado para o WhatsApp do responsável!');
  closeModals();
}

function openMicrolearningModal(topic) {
  document.getElementById('modal-pop').classList.remove('hidden');
}

function closeModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
}
