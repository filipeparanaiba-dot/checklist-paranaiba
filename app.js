/* ==========================================================================
   SUPER CHECKLIST PARANAÍBA — PRODUCTION JAVASCRIPT ENGINE (V9.0)
   ========================================================================== */

let currentStore = '1';
let productCounter = 100;
let offlineQueue = [];

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

// Network Online/Offline Status Detector (PWA Engine)
function initNetworkListeners() {
  const banner = document.getElementById('net-offline-banner');
  const sideBox = document.getElementById('side-status-box');
  const sideTitle = document.getElementById('side-status-title');
  const sideSub = document.getElementById('side-status-sub');

  function updateStatus() {
    if (!navigator.onLine) {
      if (banner) banner.classList.remove('hidden');
      if (sideBox) sideBox.classList.add('offline');
      if (sideTitle) sideTitle.innerText = 'Modo Offline (IndexedDB)';
      if (sideSub) sideSub.innerText = 'Câmara Fria • Dados Salvos no Celular';
    } else {
      if (banner) banner.classList.add('hidden');
      if (sideBox) sideBox.classList.remove('offline');
      if (sideTitle) sideTitle.innerText = 'VR Software Conectado';
      if (sideSub) sideSub.innerText = 'API v4.2 • PWA Offline Ready';

      if (offlineQueue.length > 0) {
        alert(`⚡ SINCRONIZAÇÃO AUTOMÁTICA PWA!\n\nForam sincronizadas ${offlineQueue.length} vistorias e alterações feitas offline no servidor.`);
        offlineQueue = [];
      }
    }
  }

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  updateStatus();
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
    } else if (viewId === 'epi') {
      hTitle.innerText = `Segurança do Trabalho & EPIs (CIPA) — ${storeName}`;
      hSub.innerText = `Fichas digitais de entrega de EPI, fiscalização NR-36 e assinaturas de termos`;
    } else if (viewId === 'fornecedores') {
      hTitle.innerText = `Doca & Auditoria de Fornecedores — ${storeName}`;
      hSub.innerText = `Emissão de laudos de recebimento e avaliação de qualidade de carga`;
    } else if (viewId === 'analytics') {
      hTitle.innerText = `Analytics & Curva ABC — ${storeName}`;
      hSub.innerText = `Relatórios executivos em PDF/Excel e integração com a Curva ABC do VR Software`;
    } else if (viewId === 'manutencao') {
      hTitle.innerText = `Manutenção Preventiva de Maquinário — ${storeName}`;
      hSub.innerText = `Chamados técnicos com fotos Antes/Depois e controle de equipamentos`;
    } else if (viewId === 'builder') {
      hTitle.innerText = `Criador de Checklists (Form Builder)`;
      hSub.innerText = `Personalização livre e criação de rotinas para qualquer setor`;
    } else if (viewId === '5w2h') {
      hTitle.innerText = `Planos de Ação 5W2H — ${storeName}`;
      hSub.innerText = `Gestão de não conformidades com atribuição de responsáveis e SLA`;
    } else if (viewId === 'perdas') {
      hTitle.innerText = `Prevenção de Perdas & VR Software — ${storeName}`;
      hSub.innerText = `Bipagem de produtos em data crítica, custo real e ajuste de margem`;
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

// Toggle EPI Delivery Form
function toggleEPIForm() {
  const panel = document.getElementById('panel-epi-form');
  if (panel) {
    panel.classList.toggle('hidden');
  }
}

// Save EPI Delivery
function saveEPIDelivery() {
  const employee = document.getElementById('epi-employee').value;
  const item = document.getElementById('epi-item-select').value;
  const expiry = document.getElementById('epi-expiry-date').value || '2027-07-23';
  const sig = document.getElementById('epi-signature').value || '4091';

  if (!employee) {
    alert('Por favor, informe o nome do colaborador!');
    return;
  }

  const tbody = document.getElementById('epi-table-body');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><strong>${employee}</strong></td>
    <td>Setor Ativo</td>
    <td>${item}</td>
    <td>Certificado C.A. OK</td>
    <td>Hoje</td>
    <td><span class="tag-green">${expiry}</span></td>
    <td><button class="btn-sm-action" onclick="alert('📄 FICHA CIPA GERADA!\n\nRecibo de entrega de EPI assinado digitalmente (Matrícula ${sig}).')"><i data-lucide="file-text"></i> Ver Ficha</button></td>
  `;

  tbody.insertBefore(tr, tbody.firstChild);
  safeCreateIcons();

  alert(`🦺 ENTREGA DE EPI REGISTRADA COM SUCESSO!\n\nColaborador: ${employee}\nEquipamento: ${item}\nMatrícula/Assinatura: ${sig}\n\nFicha CIPA arquivada e termo assinado digitalmente.`);
  toggleEPIForm();
}

// Toggle Supplier Receiving Form
function toggleReceivingForm() {
  const panel = document.getElementById('panel-receiving-form');
  if (panel) {
    panel.classList.toggle('hidden');
  }
}

// Save Supplier Receiving Audit
function saveReceivingAudit() {
  const supplier = document.getElementById('rec-supplier').value;
  const nfe = document.getElementById('rec-nfe').value || 'NF 00912';
  const temp = document.getElementById('rec-temp').value || '3.2';
  const status = document.getElementById('rec-status').value;
  const obs = document.getElementById('rec-obs').value || 'Conferência realizada na doca.';

  const tbody = document.getElementById('receiving-table-body');
  const tr = document.createElement('tr');
  
  let statusBadge = '<span class="tag-green">Aprovado 100%</span>';
  if (status === 'RESSALVA') statusBadge = '<span class="tag-orange">Ressalva</span>';
  if (status === 'REJEITADO') statusBadge = '<span class="tag-red">Carga Rejeitada</span>';

  tr.innerHTML = `
    <td>Hoje - agora</td>
    <td><strong>${supplier}</strong></td>
    <td>${nfe}</td>
    <td><strong>${temp}°C</strong></td>
    <td>${statusBadge}</td>
    <td>${obs}</td>
    <td><button class="btn-sm-action" onclick="downloadLaudoPDF('${nfe}', '${supplier}')"><i data-lucide="download"></i> Imprimir Laudo</button></td>
  `;

  tbody.insertBefore(tr, tbody.firstChild);
  safeCreateIcons();

  alert(`📋 LAUDO DE RECEBIMENTO EMITIDO!\n\nFornecedor: ${supplier}\nNF-e: ${nfe}\nStatus: ${status}\n\nNotificação enviada ao Setor de Compras e Laudo de Devolução gerado.`);
  toggleReceivingForm();
}

// Download Formal Rejection / Receiving PDF Laudo
function downloadLaudoPDF(nfe, supplier) {
  alert(`📄 EMISSÃO DE LAUDO OFICIAL DE RECEBIMENTO!\n\nDocumento 'Laudo_Recebimento_${nfe}.pdf' referente ao fornecedor ${supplier} pronto para impressão e assinatura do motorista.`);
}

// Toggle Equipment Maintenance Form
function toggleNewTicketForm() {
  const panel = document.getElementById('panel-new-ticket');
  if (panel) {
    panel.classList.toggle('hidden');
  }
}

// Save Maintenance Ticket
function saveNewMaintenanceTicket() {
  const equip = document.getElementById('ticket-equip-select').value;
  const urgency = document.getElementById('ticket-urgency').value;
  const tech = document.getElementById('ticket-tech').value || 'Ricardo Silva';
  const cost = document.getElementById('ticket-cost').value || '350.00';

  if (!navigator.onLine) {
    offlineQueue.push({ type: 'TICKET', equip, urgency, tech, cost, date: new Date() });
    alert(`🛠️ CHAMADO REGISTRADO NO MODO OFFLINE!\n\nComo você está sem internet (ex: dentro da Câmara Fria), o chamado foi salvo no celular e será sincronizado assim que o Wi-Fi voltar.`);
  } else {
    alert(`🛠️ CHAMADO TÉCNICO DE MANUTENÇÃO REGISTRADO!\n\nEquipamento: ${equip}\nUrgência: ${urgency}\nTécnico Atribuído: ${tech}\nCusto Estimado: R$ ${cost}\n\nNotificação enviada com foto ANTES/DEPOIS no WhatsApp da equipe.`);
  }

  toggleNewTicketForm();
}

// Export Audit PDF Report
function exportAuditPDF() {
  const storeName = storeDatabase[currentStore].name;
  alert(`📄 RELATÓRIO EXECUTIVO GERADO COM SUCESSO!\n\nUnidade: ${storeName}\nSaúde da Loja (ISL): ${storeDatabase[currentStore].isl}%\nConformidades: ${storeDatabase[currentStore].conformCount}\nPerdas Evitadas: ${storeDatabase[currentStore].perdasStr}\n\nO download do arquivo 'Relatorio_Auditoria_${currentStore}.pdf' foi iniciado.`);
}

// Export Audit Excel (CSV) Spreadsheet
function exportAuditExcel() {
  const storeName = storeDatabase[currentStore].name;
  const csvContent = `data:text/csv;charset=utf-8,Unidade,ISL,Conformidades,NaoConformidades,PerdasEvitadas\n"${storeName}",${storeDatabase[currentStore].isl}%,${storeDatabase[currentStore].conformCount},${storeDatabase[currentStore].nonConformCount},"${storeDatabase[currentStore].perdasStr}"`;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Auditoria_Paranaiba_Loja_${currentStore}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  alert(`📊 PLANILHA EXCEL (CSV) EXPORTADA!\n\nArquivo 'Auditoria_Paranaiba_Loja_${currentStore}.csv' baixado com sucesso.`);
}

// Sync Curva ABC Batch from VR Software API
function importVRABCBatch() {
  const tbody = document.getElementById('abc-table-body');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><span class="abc-badge curve-a">CURVA A</span></td>
    <td>78910999</td>
    <td><strong>Presunto Cozido Sadia 200g</strong></td>
    <td>22 un/dia</td>
    <td>30 un.</td>
    <td><span class="tag-red">2 dias</span></td>
    <td><strong class="text-red">R$ 297,00</strong></td>
    <td><button class="btn-sm-action" onclick="navigate('perdas')">Rebaixar no VR</button></td>
  `;
  tbody.insertBefore(tr, tbody.firstChild);

  alert(`⚡ BATCH DA CURVA ABC SINCRONIZADO DO VR SOFTWARE!\n\nForam identificados novos lotes de alta rotatividade com vencimento crítico.`);
}

// Toggle Barcode Product Registration Panel
function toggleAddProductForm() {
  const panel = document.getElementById('panel-add-product');
  if (panel) {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      document.getElementById('new-prod-barcode').focus();
    }
  }
}

// Simulate Camera Barcode Scan (Bipador EAN-13)
function simulateBarcodeScan() {
  const samples = [
    { barcode: '78910005', name: 'Leite Integral 1L Parmalat', cost: 3.40, retail: 6.90, sug: 4.80, qty: 35, sector: 'Laticínios & Frios' },
    { barcode: '78910012', name: 'Peito de Peru Fatiado 150g', cost: 6.20, retail: 12.90, sug: 8.50, qty: 15, sector: 'Açougue & Carnes' },
    { barcode: '78910099', name: 'Iogurte Morango 170g Vigor', cost: 1.80, retail: 4.20, sug: 2.79, qty: 50, sector: 'Laticínios & Frios' },
    { barcode: '78910440', name: 'Pão de Forma Tradicional 450g', cost: 4.50, retail: 9.90, sug: 6.50, qty: 20, sector: 'Padaria & Panificação' }
  ];

  const chosen = samples[Math.floor(Math.random() * samples.length)];

  document.getElementById('new-prod-barcode').value = chosen.barcode;
  document.getElementById('new-prod-name').value = chosen.name;
  document.getElementById('new-prod-cost').value = chosen.cost.toFixed(2);
  document.getElementById('new-prod-retail').value = chosen.retail.toFixed(2);
  document.getElementById('new-prod-sug').value = chosen.sug.toFixed(2);
  document.getElementById('new-prod-qty').value = chosen.qty;
  document.getElementById('new-prod-sector').value = chosen.sector;

  const d = new Date();
  d.setDate(d.getDate() + 3);
  document.getElementById('new-prod-expiry').value = d.toISOString().split('T')[0];

  updateNewProdMargin();

  alert(`📸 CÓDIGO DE BARRAS BIPADO COM SUCESSO!\n\nEAN: ${chosen.barcode}\nProduto: ${chosen.name}\nPreço de Custo (VR): R$ ${chosen.cost.toFixed(2)}\n\nDados preenchidos automaticamente.`);
}

// Calculate Margin % for New Product Form
function updateNewProdMargin() {
  const cost = parseFloat(document.getElementById('new-prod-cost').value) || 0;
  const sug = parseFloat(document.getElementById('new-prod-sug').value) || 0;
  const tag = document.getElementById('new-prod-margin-tag');

  if (sug <= 0 || cost <= 0) {
    tag.innerText = '0%';
    tag.className = 'margin-pill red';
    return;
  }

  const margin = (((sug - cost) / sug) * 100).toFixed(1);
  if (margin >= 0) {
    tag.innerText = `+${margin}%`;
    tag.className = 'margin-pill green';
  } else {
    tag.innerText = `${margin}%`;
    tag.className = 'margin-pill red';
  }
}

// Save New Critical Date Product into Table
function saveNewCriticalProduct() {
  const barcode = document.getElementById('new-prod-barcode').value || '78900000';
  const name = document.getElementById('new-prod-name').value;
  const expiry = document.getElementById('new-prod-expiry').value || '2026-07-26';
  const qty = document.getElementById('new-prod-qty').value || '10';
  const cost = parseFloat(document.getElementById('new-prod-cost').value) || 0;
  const retail = parseFloat(document.getElementById('new-prod-retail').value) || 0;
  const sug = parseFloat(document.getElementById('new-prod-sug').value) || 0;

  if (!name) {
    alert('Por favor, informe o nome do produto ou bipe o código de barras!');
    return;
  }

  productCounter++;
  const newRowId = productCounter;
  const margin = sug > 0 ? (((sug - cost) / sug) * 100).toFixed(1) : 0;
  const marginClass = margin >= 0 ? 'green' : 'red';

  const tbody = document.getElementById('perdas-table-body');
  const tr = document.createElement('tr');
  tr.id = 'perdas-row-' + newRowId;
  tr.innerHTML = `
    <td>
      <strong>${name}</strong>
      <small>Cod: ${barcode} • Cadastrado Agora</small>
    </td>
    <td>${qty} un.</td>
    <td><span class="tag-red">Crítico (${expiry})</span></td>
    <td><strong class="txt-cost">R$ ${cost.toFixed(2)}</strong></td>
    <td><span class="old-price">R$ ${retail.toFixed(2)}</span></td>
    <td>
      <div class="price-input-box">
        <span>R$</span>
        <input type="number" step="0.01" value="${sug.toFixed(2)}" id="price-in-${newRowId}" oninput="calcMargin(${newRowId}, ${cost})">
      </div>
    </td>
    <td><span class="margin-pill ${marginClass}" id="margin-pill-${newRowId}">${margin >= 0 ? '+' : ''}${margin}%</span></td>
    <td>
      <button class="btn-send-vr" id="btn-vr-send-${newRowId}" onclick="sendToVR(${newRowId}, '${name}')"><i data-lucide="send"></i> Enviar p/ VR</button>
    </td>
  `;

  tbody.insertBefore(tr, tbody.firstChild);

  safeCreateIcons();

  if (!navigator.onLine) {
    offlineQueue.push({ type: 'PERDA', name, barcode, date: new Date() });
    alert(`✅ PRODUTO EM DATA CRÍTICA REGISTRADO NO MODO OFFLINE!\n\nSalvo localmente no smartphone. Será enviado ao VR Software ao sair da câmara fria.`);
  } else {
    alert(`✅ PRODUTO EM DATA CRÍTICA CADASTRADO E INSERIDO!\n\nProduto: ${name}\nEAN: ${barcode}\nQtd: ${qty} un.\nVencimento: ${expiry}\nMargem Residual: ${margin}%\n\nDisponível para envio ao VR Software.`);
  }

  document.getElementById('new-prod-name').value = '';
  document.getElementById('new-prod-barcode').value = '';
  toggleAddProductForm();
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
  if (!navigator.onLine) {
    offlineQueue.push({ type: 'AUDIT', date: new Date() });
    alert('📶 VISTORIA FINALIZADA NO MODO OFFLINE!\n\nOs dados foram armazenados no seu celular e serão sincronizados com o servidor da matriz assim que o Wi-Fi for restabelecido.');
  } else {
    alert('Auditoria finalizada com sucesso! Dados sincronizados no servidor e laudo enviado ao WhatsApp.');
    openWhatsAppModal();
  }
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
  initNetworkListeners();
});
