// Firebase SDK modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, deleteDoc, query, where, onSnapshot, orderBy, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js"; // Import storage functions

// Your web app's Firebase configuration
// =========================================================================
// CONFIGURAÇÃO ATUALIZADA COM OS SEUS DADOS REAIS
const firebaseConfig = {
  apiKey: "AIzaSyC5XTEAfbKkN4x6iw1dZPWHvtcNC_a_eVw",
  authDomain: "gestor-valente-crm.firebaseapp.com",
  projectId: "gestor-valente-crm",
  storageBucket: "gestor-valente-crm.appspot.com", // CORRIGIDO: Usei o que estava antes, o seu tinha ".firebasestorage"
  messagingSenderId: "1015920298445",
  appId: "1:1015920298445:web:38f28f0802756c250d9c84"
};
// =========================================================================


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // Initialize storage

// --- [REMOVIDO] Obtenção do App ID (não é mais necessário para o caminho direto) ---
// const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
// console.log("Using App ID:", appId);
// --- [FIM REMOVIDO] ---


// Global variables
let currentUser = null;
let currentUserId = null; // Store user ID separately for path construction
let allCidadaos = [];
let allDemandas = [];
let currentCidadaoId = null; // To track editing cidadao
let currentDemandaId = null; // To track editing demanda
let cidadaosListener = null;
let demandasListener = null;
let map = null; // Leaflet map instance
let markers = []; // Array to hold map markers
let cidadaosPorTipoChartInstance = null;
let demandasPorStatusChartInstance = null;
let cidadaosPorBairroChartInstance = null;
let cidadaosPorSexoChartInstance = null;
let cidadaosPorFaixaEtariaChartInstance = null;

// DOM Elements
const loginPage = document.getElementById('login-page');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email-address');
const passwordInput = document.getElementById('password');
const logoutBtn = document.getElementById('logout-btn');
const sidebarNav = document.getElementById('sidebar-nav');
const pages = document.querySelectorAll('.page');
const addCidadaoBtn = document.getElementById('add-cidadao-btn');
const cidadaoModal = document.getElementById('cidadao-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cidadaoForm = document.getElementById('cidadao-form');
const cancelBtn = document.getElementById('cancel-btn');
const saveBtn = document.getElementById('save-btn');
const cidadaosGrid = document.getElementById('cidadaos-grid');
const cidadaoModalTitle = document.getElementById('cidadao-modal-title');
const searchInput = document.getElementById('search-input');
const filterType = document.getElementById('filter-type');
const filterBairro = document.getElementById('filter-bairro');
const filterLeader = document.getElementById('filter-leader');
const filterSexo = document.getElementById('filter-sexo'); // Filtro Sexo
const filterFaixaEtaria = document.getElementById('filter-faixa-etaria'); // Filtro Faixa Etária
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const toastContainer = document.getElementById('toast-container');
const cidadaoDetailsModal = document.getElementById('cidadao-details-modal');
const closeDetailsModalBtn = document.getElementById('close-details-modal-btn');
const addDemandaGeralBtn = document.getElementById('add-demanda-geral-btn');
const demandaModal = document.getElementById('demanda-modal');
const closeDemandaModalBtn = document.getElementById('close-demanda-modal-btn');
const demandaForm = document.getElementById('demanda-form');
const cancelDemandaBtn = document.getElementById('cancel-demanda-btn');
const saveDemandaBtn = document.getElementById('save-demanda-btn');
const demandaCidadaoSelect = document.getElementById('demanda-cidadao-select');
const demandaTitleInput = document.getElementById('demanda-title');
const demandaDescriptionInput = document.getElementById('demanda-description');
const allDemandasList = document.getElementById('all-demandas-list');
const demandaModalTitle = document.getElementById('demanda-modal-title');
const demandaDetailsModal = document.getElementById('demanda-details-modal');
const closeDemandaDetailsBtn = document.getElementById('close-demanda-details-btn');
const addNoteForm = document.getElementById('add-note-form');
const deleteDemandaBtn = document.getElementById('delete-demanda-btn');
const demandaFilterStatus = document.getElementById('demanda-filter-status');
const demandaFilterLeader = document.getElementById('demanda-filter-leader');
const demandaClearFiltersBtn = document.getElementById('demanda-clear-filters-btn');
const generateReportBtn = document.getElementById('generate-report-btn');
const viewMapBtn = document.getElementById('view-map-btn');
const mapModal = document.getElementById('map-modal');
const closeMapBtn = document.getElementById('close-map-btn');
const mapElement = document.getElementById('map');
const detailsViewMapBtn = document.getElementById('details-view-map-btn');
const detailsShareLocationBtn = document.getElementById('details-share-location-btn');
const confirmationModal = document.getElementById('confirmation-modal');
const confirmationTitle = document.getElementById('confirmation-title');
const confirmationMessage = document.getElementById('confirmation-message');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const logoBtn = document.getElementById('logo-btn');
const cidadaoLeaderSelect = document.getElementById('cidadao-leader');
const cidadaoSonsInput = document.getElementById('cidadao-sons');
const cidadaoDaughtersInput = document.getElementById('cidadao-daughters');
const childrenDetailsContainer = document.getElementById('children-details-container');
const cidadaoPhotoUrlInput = document.getElementById('cidadao-photo-url');
const cidadaoPhotoUploadInput = document.getElementById('cidadao-photo-upload');
const fileNameDisplay = document.getElementById('file-name-display');


// --- Utility Functions ---
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-lg shadow-md text-white ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function formatCPF(cpf) {
    if (!cpf) return '';
    cpf = cpf.replace(/\D/g, '').slice(0, 11);
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return cpf;
}

function formatPhone(phone) {
    if (!phone) return '';
    phone = phone.replace(/\D/g, '').slice(0, 11);
    if (phone.length === 11) phone = phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    else if (phone.length === 10) phone = phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    else if (phone.length === 9) phone = phone.replace(/(\d{5})(\d{4})/, '$1-$2');
    else if (phone.length === 8) phone = phone.replace(/(\d{4})(\d{4})/, '$1-$2');
    return phone;
}

function formatCEP(cep) {
    if (!cep) return '';
    cep = cep.replace(/\D/g, '').slice(0, 8);
    cep = cep.replace(/^(\d{5})(\d)/, '$1-$2');
    return cep;
}

function formatVoterID(voterId) {
    if (!voterId) return '';
    voterId = voterId.replace(/\D/g, '').slice(0, 12);
    if (voterId.length === 12) voterId = voterId.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
    return voterId;
}

document.getElementById('cidadao-cpf').addEventListener('input', (e) => { e.target.value = formatCPF(e.target.value); });
document.getElementById('cidadao-phone').addEventListener('input', (e) => { e.target.value = formatPhone(e.target.value); });
document.getElementById('cidadao-cep').addEventListener('input', (e) => { e.target.value = formatCEP(e.target.value); });
document.getElementById('cidadao-voterid').addEventListener('input', (e) => { e.target.value = formatVoterID(e.target.value); });


// --- Authentication ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user; currentUserId = user.uid;
        console.log("User logged in:", currentUserId);
        showApp(); loadInitialData();
    } else {
        currentUser = null; currentUserId = null;
        console.log("User logged out");
        showLoginPage(); clearData();
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value; const password = passwordInput.value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Login bem-sucedido!');
    } catch (error) {
        console.error("Erro no login:", error.code, error.message);
        let msg = 'Email ou palavra-passe inválidos.';
        if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(error.code)) msg = 'Credenciais inválidas.';
        else if (error.code === 'auth/too-many-requests') msg = 'Muitas tentativas. Tente mais tarde.';
        else if (error.code === 'auth/network-request-failed') msg = 'Erro de rede.';
        else if (['auth/invalid-api-key', 'auth/api-key-not-valid.-please-pass-a-valid-api-key.'].includes(error.code)) msg = 'Erro de configuração da API Key.';
        showToast(msg, 'error');
    }
});

logoutBtn.addEventListener('click', async () => {
    try { await signOut(auth); showToast('Logout bem-sucedido!'); }
    catch (error) { console.error("Erro no logout:", error); showToast('Erro ao fazer logout.', 'error'); }
});

// --- UI Navigation ---
function showLoginPage() { loginPage.classList.remove('hidden'); appContainer.classList.add('hidden'); appContainer.classList.remove('flex'); }
function showApp() { loginPage.classList.add('hidden'); appContainer.classList.remove('hidden'); appContainer.classList.add('flex'); navigateTo('dashboard'); }
function navigateTo(pageId) { pages.forEach(p => { p.id === `${pageId}-page` ? (p.classList.remove('hidden'), p.classList.add('flex')) : (p.classList.add('hidden'), p.classList.remove('flex')); }); sidebarNav.querySelectorAll('.nav-link').forEach(l => { l.getAttribute('href') === `#${pageId}` ? (l.classList.add('bg-slate-900', 'font-semibold'), l.classList.remove('hover:bg-slate-700')) : (l.classList.remove('bg-slate-900', 'font-semibold'), l.classList.add('hover:bg-slate-700')); }); if (pageId === 'dashboard') renderDashboard(); else if (pageId === 'demandas') renderDemandas(); else if (pageId === 'cidadaos') renderCidadaos(); }
sidebarNav.addEventListener('click', (e) => { const link = e.target.closest('a.nav-link'); if (link) { e.preventDefault(); navigateTo(link.getAttribute('href').substring(1)); } });
logoBtn?.addEventListener('click', () => { navigateTo('dashboard'); });


// --- Data Loading and Clearing ---
async function loadInitialData() {
    if (!currentUserId) { console.log("loadInitialData skipped: currentUserId is null."); return; }
    console.log("Loading initial data for user:", currentUserId);
    if (cidadaosListener) { console.log("Unsubscribing previous cidadaos listener."); cidadaosListener(); cidadaosListener = null; }
    if (demandasListener) { console.log("Unsubscribing previous demandas listener."); demandasListener(); demandasListener = null; }

    const cidadaosPath = `users/${currentUserId}/cidadaos`;
    const cidadaosQuery = query(collection(db, cidadaosPath));
    console.log("Setting up new cidadaos listener on path:", cidadaosPath);
    cidadaosListener = onSnapshot(cidadaosQuery, (snapshot) => {
        allCidadaos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Cidadãos data updated:", allCidadaos.length);
        populateFilters();
        const currentPageElement = document.querySelector('.page:not(.hidden)');
        if (currentPageElement) {
            const currentPageId = currentPageElement.id.replace('-page', '');
            if (currentPageId === 'cidadaos') renderCidadaos();
            else if (currentPageId === 'dashboard') renderDashboard();
            else if (currentPageId === 'demandas') populateDemandaFilters();
        } else console.log("No active page found during cidadãos update.");
    }, (error) => { console.error("Erro ao carregar cidadãos:", error); showToast(`Erro ao carregar cidadãos${error.code === 'permission-denied' ? ': Permissões insuficientes.' : '.'}`, "error"); });

    const demandasPath = `users/${currentUserId}/demandas`;
    const demandasQuery = query(collection(db, demandasPath), orderBy('createdAt', 'desc'));
    console.log("Setting up new demandas listener on path:", demandasPath);
    demandasListener = onSnapshot(demandasQuery, (snapshot) => {
        allDemandas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Demandas data updated:", allDemandas.length);
        const currentPageElement = document.querySelector('.page:not(.hidden)');
        if (currentPageElement) {
            const currentPageId = currentPageElement.id.replace('-page', '');
            if (currentPageId === 'demandas') renderDemandas();
            else if (currentPageId === 'dashboard') renderDashboard();
        } else console.log("No active page found during demandas update.");
    }, (error) => { console.error("Erro ao carregar demandas:", error); showToast(`Erro ao carregar demandas${error.code === 'permission-denied' ? ': Permissões insuficientes.' : '.'}`, "error"); });
}

function clearData() {
    console.log("Clearing data and unsubscribing listeners.");
    allCidadaos = []; allDemandas = [];
    if (cidadaosListener) { cidadaosListener(); cidadaosListener = null; }
    if (demandasListener) { demandasListener(); demandasListener = null; }
    cidadaosGrid.innerHTML = ''; allDemandasList.innerHTML = '';
    filterBairro.innerHTML = '<option value="">Filtrar por Bairro</option>'; filterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>'; demandaFilterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>';
    filterType.value = ''; filterSexo.value = ''; filterFaixaEtaria.value = ''; searchInput.value = ''; demandaFilterStatus.value = '';
    document.getElementById('dashboard-total-cidadaos').textContent = '0'; document.getElementById('dashboard-total-demandas').textContent = '0';
    document.getElementById('aniversariantes-list').innerHTML = ''; document.getElementById('demandas-recentes-list').innerHTML = '';
    cidadaosPorTipoChartInstance?.destroy(); demandasPorStatusChartInstance?.destroy(); cidadaosPorBairroChartInstance?.destroy(); cidadaosPorSexoChartInstance?.destroy(); cidadaosPorFaixaEtariaChartInstance?.destroy();
    cidadaosPorTipoChartInstance = null; demandasPorStatusChartInstance = null; cidadaosPorBairroChartInstance = null; cidadaosPorSexoChartInstance = null; cidadaosPorFaixaEtariaChartInstance = null;
    console.log("Data cleared.");
}


// --- Cidadãos ---
function populateFilters() { if (!allCidadaos || allCidadaos.length === 0) { filterBairro.innerHTML = '<option value="">Filtrar por Bairro</option>'; filterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>'; cidadaoLeaderSelect.innerHTML = '<option value="">Nenhuma</option>'; populateDemandaFilters(); return; } const bairros = [...new Set(allCidadaos.map(c => c.bairro).filter(Boolean))].sort((a, b) => a.localeCompare(b)); const leaders = allCidadaos.filter(c => c.type === 'Liderança').map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)); const selectedBairro = filterBairro.value; const selectedLeader = filterLeader.value; const selectedCidadaoLeader = cidadaoLeaderSelect.value; filterBairro.innerHTML = '<option value="">Filtrar por Bairro</option>'; bairros.forEach(b => { const o = document.createElement('option'); o.value = b; o.textContent = b; filterBairro.appendChild(o); }); filterBairro.value = selectedBairro; filterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>'; cidadaoLeaderSelect.innerHTML = '<option value="">Nenhuma</option>'; leaders.forEach(l => { const oF = document.createElement('option'); oF.value = l.name; oF.textContent = l.name; filterLeader.appendChild(oF); const oFo = document.createElement('option'); oFo.value = l.name; oFo.textContent = l.name; cidadaoLeaderSelect.appendChild(oFo); }); filterLeader.value = selectedLeader; cidadaoLeaderSelect.value = selectedCidadaoLeader; populateDemandaFilters(); }
function calculateAgeAndGroup(dobString) { if (!dobString) return { age: null, group: 'N/A' }; try { const dobParts = dobString.split('-'); if (dobParts.length !== 3) throw new Error("Invalid date format"); const dob = new Date(Date.UTC(parseInt(dobParts[0]), parseInt(dobParts[1]) - 1, parseInt(dobParts[2]))); if (isNaN(dob.getTime())) throw new Error("Invalid date value"); const todayUTC = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())); let age = todayUTC.getUTCFullYear() - dob.getUTCFullYear(); const monthDiff = todayUTC.getUTCMonth() - dob.getUTCMonth(); const dayDiff = todayUTC.getUTCDate() - dob.getUTCDate(); if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--; if (age < 0) return { age: null, group: 'N/A' }; if (age <= 17) return { age: age, group: '0-17' }; if (age <= 25) return { age: age, group: '18-25' }; if (age <= 35) return { age: age, group: '26-35' }; if (age <= 50) return { age: age, group: '36-50' }; if (age <= 65) return { age: age, group: '51-65' }; return { age: age, group: '66+' }; } catch (e) { console.error("Error calculating age:", dobString, e); return { age: null, group: 'N/A' }; } }
function getFilteredCidadaos() { const sT = searchInput.value.toLowerCase().trim(); const t = filterType.value; const b = filterBairro.value; const l = filterLeader.value; const s = filterSexo.value; const fE = filterFaixaEtaria.value; return allCidadaos.filter(c => { const nM = (c.name || '').toLowerCase().includes(sT); const eM = (c.email || '').toLowerCase().includes(sT); const sTD = sT.replace(/\D/g,''); const cM = sTD && (c.cpf || '').includes(sTD); const sM = nM || eM || cM; const tM = !t || c.type === t; const bM = !b || c.bairro === b; const lM = !l || c.leader === l; const sExM = !s || c.sexo === s; const ageInfo = calculateAgeAndGroup(c.dob); const fEM = !fE || ageInfo.group === fE; return sM && tM && bM && lM && sExM && fEM; }); }
function renderCidadaos() { console.log("Rendering cidadãos grid..."); cidadaosGrid.innerHTML = ''; const filteredCidadaos = getFilteredCidadaos(); console.log("Filtered cidadãos count:", filteredCidadaos.length); if (filteredCidadaos.length === 0) { cidadaosGrid.innerHTML = '<p class="text-gray-500 md:col-span-full text-center py-10">Nenhum cidadão encontrado.</p>'; return; } filteredCidadaos.forEach(c => { const card = document.createElement('div'); card.className = 'bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between'; const iL = c.name ? c.name.charAt(0).toUpperCase() : '?'; const pC = c.photoUrl ? `<img src="${c.photoUrl}" alt="${c.name}" class="w-full h-full object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='${iL}'; this.parentElement.classList.add('bg-slate-200','text-slate-500','font-bold','text-xl');">` : `<span class="font-bold text-xl">${iL}</span>`; card.innerHTML = `<div><div class="flex items-center gap-3 mb-3"><div class="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${!c.photoUrl?'bg-slate-200 text-slate-500':''}">${pC}</div><div><h3 class="font-bold text-lg text-gray-800 truncate" title="${c.name}">${c.name||'N/D'}</h3><span class="text-xs px-2 py-0.5 rounded ${c.type==='Liderança'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-700'}">${c.type||'N/A'}</span></div></div><p class="text-sm text-gray-600 mb-1 truncate" title="${c.email}"><strong class="font-medium">Email:</strong> ${c.email||'-'}</p><p class="text-sm text-gray-600 mb-1"><strong class="font-medium">Tel:</strong> ${c.phone?formatPhone(c.phone):'-'} ${c.whatsapp?'<span class="text-green-600 font-semibold">(W)</span>':''}</p><p class="text-sm text-gray-600 truncate" title="${c.bairro}"><strong class="font-medium">Bairro:</strong> ${c.bairro||'-'}</p>${c.leader?`<p class="text-sm text-gray-500 mt-2 truncate" title="Indicado por: ${c.leader}"><em>Indicado por: ${c.leader}</em></p>`:''}</div><div class="mt-4 flex flex-wrap gap-2 justify-end border-t pt-3"><button class="view-details-btn text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-2 rounded" data-id="${c.id}">Detalhes</button><button class="edit-cidadao-btn text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 px-2 rounded" data-id="${c.id}">Editar</button><button class="delete-cidadao-btn text-xs bg-red-100 hover:bg-red-200 text-red-700 py-1 px-2 rounded" data-id="${c.id}" data-name="${c.name}">Excluir</button></div>`; cidadaosGrid.appendChild(card); }); addGridButtonListeners(); }
function addGridButtonListeners() { cidadaosGrid.removeEventListener('click', handleGridButtonClick); cidadaosGrid.addEventListener('click', handleGridButtonClick); }
function handleGridButtonClick(e) { const btn = e.target.closest('button'); if (!btn) return; const id = btn.dataset.id; const name = btn.dataset.name; if (btn.classList.contains('view-details-btn')) showCidadaoDetails(id); else if (btn.classList.contains('edit-cidadao-btn')) editCidadao(id); else if (btn.classList.contains('delete-cidadao-btn')) confirmDeleteCidadao(id, name); }
cidadaoPhotoUploadInput.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { if (!file.type.startsWith('image/')) { showToast('Selecione uma imagem.', 'error'); fileNameDisplay.textContent = 'Inválido'; e.target.value = ''; return; } if (file.size > 5*1024*1024) { showToast('Máx 5MB.', 'error'); fileNameDisplay.textContent = 'Grande'; e.target.value = ''; return; } fileNameDisplay.textContent = file.name; cidadaoPhotoUrlInput.value = ''; } else fileNameDisplay.textContent = 'Nenhum ficheiro'; });

function openCidadaoModal(cidadao = null) { cidadaoForm.reset(); fileNameDisplay.textContent = 'Nenhum ficheiro'; cidadaoPhotoUploadInput.value = null; childrenDetailsContainer.innerHTML = ''; currentCidadaoId = null; populateFilters(); if (cidadao) { currentCidadaoId = cidadao.id; cidadaoModalTitle.textContent = 'Editar Cidadão'; for (const key in cidadao) { const el = document.getElementById(`cidadao-${key.toLowerCase().replace('id', 'voterid').replace('localtrabalho', 'local-trabalho')}`); if (el) { if (el.type === 'checkbox') el.checked = cidadao[key]; else if (key === 'cpf') el.value = formatCPF(cidadao[key]); else if (key === 'phone') el.value = formatPhone(cidadao[key]); else if (key === 'cep') el.value = formatCEP(cidadao[key]); else if (key === 'voterId') el.value = formatVoterID(cidadao[key]); else el.value = cidadao[key] || (el.tagName === 'SELECT' ? (key === 'sexo' ? 'Não Informar' : '') : ''); } } generateChildrenFields(cidadao.sons || 0, cidadao.daughters || 0, cidadao.children); } else { cidadaoModalTitle.textContent = 'Adicionar Cidadão'; generateChildrenFields(0, 0); } cidadaoModal.classList.remove('hidden'); setTimeout(() => { cidadaoModal.querySelector('#modal-content')?.classList.remove('scale-95', 'opacity-0'); cidadaoModal.querySelector('#modal-content')?.classList.add('scale-100', 'opacity-100'); }, 10); }
function closeCidadaoModal() { const c = cidadaoModal.querySelector('#modal-content'); if(c){ c.classList.remove('scale-100', 'opacity-100'); c.classList.add('scale-95', 'opacity-0'); setTimeout(()=>cidadaoModal.classList.add('hidden'), 200); } else cidadaoModal.classList.add('hidden'); }
addCidadaoBtn.addEventListener('click', () => openCidadaoModal()); closeModalBtn.addEventListener('click', closeCidadaoModal); cancelBtn.addEventListener('click', closeCidadaoModal); cidadaoModal.addEventListener('click', (e) => { if (e.target === cidadaoModal) closeCidadaoModal(); });
function generateChildrenFields(numSons, numDaughters, existingChildren = []) { childrenDetailsContainer.innerHTML = ''; const total = parseInt(numSons||0)+parseInt(numDaughters||0); if (total > 0 && total <= 20) { childrenDetailsContainer.innerHTML = '<h3 class="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Detalhes dos Filhos</h3>'; for (let i = 0; i < total; i++) { const d = existingChildren?.[i] || {}; const w = document.createElement('div'); w.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 border p-3 rounded bg-gray-50 mb-3'; w.innerHTML = `<div><label for="child-name-${i}" class="block text-sm font-medium text-gray-700 mb-1">Nome Filho/a ${i+1}</label><input type="text" id="child-name-${i}" class="w-full border border-gray-300 p-2 rounded child-detail-input" value="${d.name||''}" maxlength="100"></div><div><label for="child-dob-${i}" class="block text-sm font-medium text-gray-700 mb-1">Data Nasc. ${i+1}</label><input type="date" id="child-dob-${i}" class="w-full border border-gray-300 p-2 rounded child-detail-input" value="${d.dob||''}"></div>`; childrenDetailsContainer.appendChild(w); } } else if (total > 20) childrenDetailsContainer.innerHTML = '<p class="text-red-500">Máx 20 filhos.</p>'; }
cidadaoSonsInput.addEventListener('input', (e) => { let v=parseInt(e.target.value); if(isNaN(v)||v<0) v=0; if(v>10){ v=10; showToast('Máx 10 filhos.', 'error'); } e.target.value = v; generateChildrenFields(v, cidadaoDaughtersInput.value); });
cidadaoDaughtersInput.addEventListener('input', (e) => { let v=parseInt(e.target.value); if(isNaN(v)||v<0) v=0; if(v>10){ v=10; showToast('Máx 10 filhas.', 'error'); } e.target.value = v; generateChildrenFields(cidadaoSonsInput.value, v); });

cidadaoForm.addEventListener('submit', async (e) => {
    e.preventDefault(); if (!currentUserId) { showToast('Faça login.', 'error'); return; }
    let isValid = ['cidadao-name', 'cidadao-email'].every(id => { const i = document.getElementById(id); if (i&&!i.value.trim()){ i.classList.add('border-red-500'); return false; } if(i)i.classList.remove('border-red-500'); return true; }); if (!isValid) { showToast('Preencha campos obrigatórios.', 'error'); return; }
    saveBtn.disabled = true; saveBtn.innerHTML = 'Salvando...'; let pU = cidadaoPhotoUrlInput.value.trim(); const file = cidadaoPhotoUploadInput.files[0];
    try {
        if (file) { const fP = `user_photos/${currentUserId}/${Date.now()}_${file.name}`; const sR = ref(storage, fP); const sn = await uploadBytes(sR, file); pU = await getDownloadURL(sn.ref); console.log("Foto salva:", pU); }
        const children = []; const nS=parseInt(cidadaoSonsInput.value)||0; const nD=parseInt(cidadaoDaughtersInput.value)||0; for (let i=0; i<nS+nD; i++) { const nI=document.getElementById(`child-name-${i}`); const dI=document.getElementById(`child-dob-${i}`); if(nI&&dI){ const cN=nI.value.trim(); if(cN) children.push({name:cN, dob:dI.value||null}); } }
        const data = { name:document.getElementById('cidadao-name').value.trim(), email:document.getElementById('cidadao-email').value.trim().toLowerCase(), dob:document.getElementById('cidadao-dob').value||null, sexo:document.getElementById('cidadao-sexo').value, profissao:document.getElementById('cidadao-profissao').value.trim(), localTrabalho:document.getElementById('cidadao-local-trabalho').value.trim(), type:document.getElementById('cidadao-type').value, cpf:document.getElementById('cidadao-cpf').value.replace(/\D/g,''), rg:document.getElementById('cidadao-rg').value.replace(/\D/g,''), voterId:document.getElementById('cidadao-voterid').value.replace(/\D/g,''), phone:document.getElementById('cidadao-phone').value.replace(/\D/g,''), whatsapp:document.getElementById('cidadao-whatsapp').checked, cep:document.getElementById('cidadao-cep').value.replace(/\D/g,''), logradouro:document.getElementById('cidadao-logradouro').value.trim(), numero:document.getElementById('cidadao-numero').value.trim(), complemento:document.getElementById('cidadao-complemento').value.trim(), bairro:document.getElementById('cidadao-bairro').value.trim(), cidade:document.getElementById('cidadao-cidade').value.trim(), estado:document.getElementById('cidadao-estado').value.trim().toUpperCase(), leader:document.getElementById('cidadao-leader').value, sons:nS, daughters:nD, children, photoUrl:pU||null, updatedAt:serverTimestamp() };
        const cP = `users/${currentUserId}/cidadaos`; if (!currentCidadaoId) data.createdAt = serverTimestamp();
        if (currentCidadaoId) { const dR = doc(db, cP, currentCidadaoId); await updateDoc(dR, data); showToast('Cidadão atualizado!'); }
        else { const dR = await addDoc(collection(db, cP), data); showToast('Cidadão adicionado!'); }
        closeCidadaoModal();
    } catch (error) { console.error("Erro:", error); showToast(`Erro: ${error.message}`, 'error'); }
    finally { saveBtn.disabled = false; saveBtn.textContent = 'Salvar'; }
});

async function editCidadao(id) { if (!currentUserId || !id) return; try { const cP = `users/${currentUserId}/cidadaos`; const dR = doc(db, cP, id); const dS = await getDoc(dR); if (dS.exists()) openCidadaoModal({ id: dS.id, ...dS.data() }); else showToast("Cidadão não encontrado.", "error"); } catch (error) { console.error("Erro:", error); showToast("Erro ao carregar.", "error"); } }
function confirmDeleteCidadao(id, name) { confirmationTitle.textContent = 'Confirmar Exclusão'; confirmationMessage.textContent = `Excluir "${name||'este cidadão'}"?`; confirmationModal.classList.remove('hidden'); const handleConfirm = ()=>{deleteCidadao(id); closeConfirmationModal(); removeListeners();}; const handleCancel = ()=>{closeConfirmationModal(); removeListeners();}; const removeListeners = ()=>{confirmDeleteBtn.removeEventListener('click', handleConfirm); cancelDeleteBtn.removeEventListener('click', handleCancel);}; removeListeners(); confirmDeleteBtn.addEventListener('click', handleConfirm); cancelDeleteBtn.addEventListener('click', handleCancel); }
function closeConfirmationModal() { confirmationModal.classList.add('hidden'); }
async function deleteCidadao(id) { if (!currentUserId || !id) return; try { const cP = `users/${currentUserId}/cidadaos`; const dR = doc(db, cP, id); await deleteDoc(dR); showToast('Cidadão excluído!'); } catch (error) { console.error("Erro:", error); showToast('Erro ao excluir.', 'error'); } }

async function showCidadaoDetails(id) { if (!currentUserId || !id) return; try { const cP = `users/${currentUserId}/cidadaos`; const dR = doc(db, cP, id); const dS = await getDoc(dR); if (dS.exists()) { const c = { id: dS.id, ...dS.data() }; document.getElementById('details-name').textContent=c.name||'N/D'; document.getElementById('details-type').textContent=c.type||'N/I'; document.getElementById('details-email').textContent=c.email||'-'; document.getElementById('details-phone').textContent=c.phone?formatPhone(c.phone)+(c.whatsapp?' (W)':''):'-'; const addr=[c.logradouro,c.numero,c.complemento,c.bairro,c.cidade,c.estado,c.cep?`CEP: ${formatCEP(c.cep)}`:null].filter(Boolean).join(', ')||'N/I'; document.getElementById('details-address').textContent=addr; document.getElementById('details-cpf').textContent=c.cpf?formatCPF(c.cpf):'-'; document.getElementById('details-rg').textContent=c.rg||'-'; document.getElementById('details-voterid').textContent=c.voterId?formatVoterID(c.voterId):'-'; let dobF='-';if(c.dob){try{const d=new Date(`${c.dob}T00:00:00Z`);if(!isNaN(d.getTime()))dobF=d.toLocaleDateString('pt-BR',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'});}catch(e){}}document.getElementById('details-dob').textContent=dobF; document.getElementById('details-sexo').textContent=c.sexo||'-'; document.getElementById('details-profissao').textContent=c.profissao||'-'; document.getElementById('details-local-trabalho').textContent=c.localTrabalho||'-'; document.getElementById('details-leader').textContent=c.leader||'-'; const chC=document.getElementById('details-children');chC.innerHTML='';if(c.children&&c.children.length>0){chC.innerHTML=`<p class="font-semibold text-gray-500 text-sm mb-1 mt-2">FILHOS (${c.children.length})</p><ul class="list-none space-y-1 text-sm">${c.children.map((ch,idx)=>{let dobCF='';if(ch.dob){try{const d=new Date(`${ch.dob}T00:00:00Z`);if(!isNaN(d.getTime()))dobCF=` (Nasc: ${d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'})})`;}catch(e){}} return `<li><strong>${idx+1}. ${ch.name||'N/I'}</strong>${dobCF}</li>`;}).join('')}</ul>`;}else{const sC=c.sons||0;const dC=c.daughters||0;if(sC>0||dC>0)chC.innerHTML=`<p class="text-sm mt-2">Filhos: ${sC}, Filhas: ${dC} (sem detalhes).</p>`;else chC.innerHTML='<p class="text-sm mt-2">Sem filhos.</p>';} const pD=document.getElementById('details-photo');const iLD=c.name?c.name.charAt(0).toUpperCase():'?';pD.innerHTML='';pD.className='w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-4xl overflow-hidden border border-gray-300';if(c.photoUrl){const img=document.createElement('img');img.src=c.photoUrl;img.alt=c.name;img.className='w-full h-full object-cover';img.onerror=()=>{pD.innerHTML=`<span class="font-bold text-4xl">${iLD}</span>`;pD.classList.add('bg-slate-200','text-slate-500');};pD.appendChild(img);pD.classList.remove('bg-slate-200','text-slate-500');}else{pD.innerHTML=`<span class="font-bold text-4xl">${iLD}</span>`;} const nVMB=detailsViewMapBtn.cloneNode(true);detailsViewMapBtn.parentNode.replaceChild(nVMB,detailsViewMapBtn);detailsViewMapBtn=nVMB;detailsViewMapBtn.onclick=()=>{const mapAddr=[c.logradouro,c.numero,c.bairro,c.cidade,c.estado,c.cep].filter(Boolean);if(mapAddr.length>=2){const addrStr=mapAddr.join(', ');openMapModal([{name:c.name,address:addrStr,photoUrl:c.photoUrl}]);}else{showToast("Endereço insuficiente.", "error");}}; const nSB=detailsShareLocationBtn.cloneNode(true);detailsShareLocationBtn.parentNode.replaceChild(nSB,detailsShareLocationBtn);detailsShareLocationBtn=nSB;detailsShareLocationBtn.onclick=()=>{shareLocation(c);}; cidadaoDetailsModal.classList.remove('hidden'); setTimeout(() => { cidadaoDetailsModal.querySelector('.bg-white')?.classList.remove('scale-95','opacity-0'); cidadaoDetailsModal.querySelector('.bg-white')?.classList.add('scale-100','opacity-100'); }, 10); } else { showToast("Detalhes não encontrados.", "error"); } } catch (error) { console.error("Erro:", error); showToast("Erro ao carregar detalhes.", "error"); } }
function closeCidadaoDetailsModal() { const c = cidadaoDetailsModal.querySelector('.bg-white'); if(c){ c.classList.remove('scale-100','opacity-100'); c.classList.add('scale-95','opacity-0'); setTimeout(()=>cidadaoDetailsModal.classList.add('hidden'), 200); } else cidadaoDetailsModal.classList.add('hidden'); }
closeDetailsModalBtn.addEventListener('click', closeCidadaoDetailsModal); cidadaoDetailsModal.addEventListener('click', (e) => { if (e.target === cidadaoDetailsModal) closeCidadaoDetailsModal(); });

searchInput.addEventListener('input', renderCidadaos); filterType.addEventListener('change', renderCidadaos); filterBairro.addEventListener('change', renderCidadaos); filterLeader.addEventListener('change', renderCidadaos); filterSexo.addEventListener('change', renderCidadaos); filterFaixaEtaria.addEventListener('change', renderCidadaos);
clearFiltersBtn.addEventListener('click', () => { searchInput.value=''; filterType.value=''; filterBairro.value=''; filterLeader.value=''; filterSexo.value=''; filterFaixaEtaria.value=''; renderCidadaos(); });

// --- Demandas ---
function populateDemandaFilters() { if (!allCidadaos) { demandaFilterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>'; return; } const leaders = allCidadaos.filter(c => c.type === 'Liderança').map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)); const selected = demandaFilterLeader.value; demandaFilterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>'; leaders.forEach(l => { const o = document.createElement('option'); o.value = l.name; o.textContent = l.name; demandaFilterLeader.appendChild(o); }); demandaFilterLeader.value = selected; }
function getFilteredDemandas() { const s = demandaFilterStatus.value; const lN = demandaFilterLeader.value; return allDemandas.filter(d => { const sM = !s || d.status === s; const c = allCidadaos.find(ci => ci.id === d.cidadaoId); const lM = !lN || (c && c.leader === lN); return sM && lM; }); }
function renderDemandas() { console.log("Rendering demandas..."); allDemandasList.innerHTML=''; const filtered = getFilteredDemandas(); if(filtered.length===0){allDemandasList.innerHTML='<p class="text-gray-500 text-center py-10">Nenhuma demanda encontrada.</p>';return;} filtered.forEach(d=>{ const c=allCidadaos.find(ci=>ci.id===d.cidadaoId); const cN=c?c.name:'C. Desconhecido'; const card=document.createElement('div'); card.className='bg-white p-4 rounded shadow-sm border flex justify-between items-start gap-4 hover:shadow-md cursor-pointer demanda-card'; card.dataset.id=d.id; let sC='bg-yellow-100 text-yellow-800', sT='Pendente'; if(d.status==='inprogress'){sC='bg-blue-100 text-blue-800';sT='Em Andamento';} else if(d.status==='completed'){sC='bg-green-100 text-green-800';sT='Concluída';} const cD=d.createdAt?.toDate?d.createdAt.toDate():new Date(); const fD=cD.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}); card.innerHTML=`<div class="flex-1 overflow-hidden"><h3 class="text-lg font-semibold truncate" title="${d.title}">${d.title}</h3><p class="text-sm text-gray-600 mb-2">Para: <strong>${cN}</strong></p><p class="text-xs text-gray-500">Criada: ${fD}</p>${c&&c.leader?`<p class="text-xs text-gray-500 mt-1">Liderança: ${c.leader}</p>`:''}</div><div class="flex-shrink-0"><span class="text-xs font-semibold px-2 py-1 rounded-full ${sC}">${sT}</span></div>`; allDemandasList.appendChild(card); }); addDemandaCardListener(); }
function addDemandaCardListener() { allDemandasList.removeEventListener('click', handleDemandaCardClick); allDemandasList.addEventListener('click', handleDemandaCardClick); }
function handleDemandaCardClick(e) { const card=e.target.closest('.demanda-card'); if(card&&card.dataset.id) openDemandaDetailsModal(card.dataset.id); }
function openDemandaModal(cidadaoId=null) { if(!allCidadaos||allCidadaos.length===0){showToast('Nenhum cidadão cadastrado.','error');return;} demandaForm.reset(); currentDemandaId=null; demandaModalTitle.textContent='Adicionar Demanda'; demandaCidadaoSelect.innerHTML='<option value="">Selecione Cidadão</option>'; const sorted=[...allCidadaos].sort((a,b)=>a.name.localeCompare(b.name)); sorted.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.name;demandaCidadaoSelect.appendChild(o);}); if(cidadaoId)demandaCidadaoSelect.value=cidadaoId; demandaModal.classList.remove('hidden'); }
function closeDemandaModal() { demandaModal.classList.add('hidden'); }
addDemandaGeralBtn.addEventListener('click',()=>openDemandaModal()); closeDemandaModalBtn.addEventListener('click',closeDemandaModal); cancelDemandaBtn.addEventListener('click',closeDemandaModal); demandaModal.addEventListener('click',(e)=>{if(e.target===demandaModal)closeDemandaModal();});

demandaForm.addEventListener('submit', async(e)=>{ e.preventDefault(); if(!currentUserId){showToast('Faça login.','error');return;} const cIS=demandaCidadaoSelect.value; const t=demandaTitleInput.value.trim(); if(!cIS){showToast('Selecione cidadão.','error');demandaCidadaoSelect.focus();return;} if(!t){showToast('Insira título.','error');demandaTitleInput.focus();return;} saveDemandaBtn.disabled=true;saveDemandaBtn.textContent='Salvando...'; const data={cidadaoId:cIS, title:t, description:demandaDescriptionInput.value.trim(), status:'pending', createdAt:serverTimestamp(), updatedAt:serverTimestamp(), notes:[]}; try { const cP=`users/${currentUserId}/demandas`; const dR = await addDoc(collection(db,cP), data); showToast('Demanda adicionada!'); closeDemandaModal(); } catch(error){ console.error("Erro:",error); showToast('Erro ao salvar.','error'); } finally { saveDemandaBtn.disabled=false; saveDemandaBtn.textContent='Salvar Demanda'; } });

async function openDemandaDetailsModal(demandaId) { if (!currentUserId||!demandaId) return; currentDemandaId = demandaId; if (currentDemandaDetailsListener) currentDemandaDetailsListener(); const dP=`users/${currentUserId}/demandas`; const dDR=doc(db,dP,demandaId); currentDemandaDetailsListener = onSnapshot(dDR,(dS)=>{ if(dS.exists()){ const d={id:dS.id,...dS.data()}; populateDemandaDetails(d); if(demandaDetailsModal.classList.contains('hidden')) demandaDetailsModal.classList.remove('hidden'); } else { showToast("Demanda não encontrada.", "error"); closeDemandaDetailsModal(); } },(error)=>{ console.error("Erro:",error); showToast("Erro ao carregar.", "error"); closeDemandaDetailsModal(); }); }
function populateDemandaDetails(d) { const c=allCidadaos.find(ci=>ci.id===d.cidadaoId); const cN=c?c.name:'C. Desconhecido'; document.getElementById('details-demanda-title').textContent=d.title||'N/D'; document.getElementById('details-demanda-cidadao').textContent=`Para: ${cN}`; document.getElementById('details-demanda-description').textContent=d.description||'Sem descrição.'; document.getElementById('details-demanda-status').value=d.status||'pending'; const nL=document.getElementById('demanda-notes-list');nL.innerHTML=''; if(d.notes&&d.notes.length>0){ const sorted=[...d.notes].sort((a,b)=>(b.timestamp?.toDate()||0)-(a.timestamp?.toDate()||0)); sorted.forEach(n=>{ const nE=document.createElement('div'); nE.className='bg-gray-100 p-3 rounded text-sm'; const nD=n.timestamp?.toDate?n.timestamp.toDate().toLocaleString('pt-BR'):'N/D'; nE.innerHTML=`<p>${n.text}</p><p class="text-xs text-gray-500 mt-1">${nD}</p>`; nL.appendChild(nE); }); } else nL.innerHTML='<p class="text-sm text-gray-500 italic">Sem acompanhamentos.</p>'; }
function closeDemandaDetailsModal() { if(currentDemandaDetailsListener)currentDemandaDetailsListener(); demandaDetailsModal.classList.add('hidden'); currentDemandaId=null; addNoteForm.reset(); }
closeDemandaDetailsBtn.addEventListener('click', closeDemandaDetailsModal); demandaDetailsModal.addEventListener('click', (e)=>{if(e.target===demandaDetailsModal)closeDemandaDetailsModal();});

document.getElementById('details-demanda-status').addEventListener('change', async(e)=>{ const nS=e.target.value; if(!currentUserId||!currentDemandaId||!nS)return; const dP=`users/${currentUserId}/demandas`; const dDR=doc(db,dP,currentDemandaId); try { await updateDoc(dDR,{status:nS,updatedAt:serverTimestamp()}); showToast('Status atualizado!'); } catch(error){ console.error("Erro:",error); showToast('Erro ao atualizar.','error'); } });
addNoteForm.addEventListener('submit', async(e)=>{ e.preventDefault(); if(!currentUserId||!currentDemandaId)return; const nT=document.getElementById('new-note-text').value.trim(); if(!nT){showToast('Escreva algo.','error');return;} const dP=`users/${currentUserId}/demandas`; const dDR=doc(db,dP,currentDemandaId); try { const dDoc=await getDoc(dDR); if(!dDoc.exists()){showToast('Demanda não encontrada.','error');return;} const cN=dDoc.data().notes||[]; const newN={text:nT, timestamp:serverTimestamp()}; await updateDoc(dDR,{notes:[...cN,newN],updatedAt:serverTimestamp()}); showToast('Nota adicionada!'); addNoteForm.reset(); } catch(error){ console.error("Erro:",error); showToast('Erro ao adicionar.','error'); } });
deleteDemandaBtn.addEventListener('click',()=>{ if(!currentDemandaId)return; const dT=document.getElementById('details-demanda-title').textContent||'esta demanda'; confirmationTitle.textContent='Confirmar Exclusão'; confirmationMessage.textContent=`Excluir "${dT}"?`; confirmationModal.classList.remove('hidden'); const handleConfirm=async()=>{ if(currentUserId&&currentDemandaId){ const dTD=currentDemandaId; closeConfirmationModal(); closeDemandaDetailsModal(); try { const dP=`users/${currentUserId}/demandas`; const dR=doc(db,dP,dTD); await deleteDoc(dR); showToast('Demanda excluída!'); } catch(error){ console.error("Erro:",error); showToast('Erro ao excluir.','error'); } } removeListeners(); }; const handleCancel=()=>{closeConfirmationModal(); removeListeners();}; const removeListeners=()=>{confirmDeleteBtn.removeEventListener('click',handleConfirm); cancelDeleteBtn.removeEventListener('click',handleCancel);}; removeListeners(); confirmDeleteBtn.addEventListener('click',handleConfirm); cancelDeleteBtn.addEventListener('click',handleCancel); });

demandaFilterStatus.addEventListener('change', renderDemandas); demandaFilterLeader.addEventListener('change', renderDemandas);
demandaClearFiltersBtn.addEventListener('click', () => { demandaFilterStatus.value=''; demandaFilterLeader.value=''; renderDemandas(); });

// --- Reports ---
generateReportBtn.addEventListener('click', generatePrintReport);
function generatePrintReport() { const fC = getFilteredCidadaos(); if (fC.length === 0) { showToast("Nenhum cidadão para relatório.", "error"); return; } let html = ` <!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório Cidadãos</title><style>body{font-family:Inter,sans-serif;margin:20px;font-size:10pt}h1{text-align:center;border-bottom:1px solid #ccc;padding-bottom:10px;margin-bottom:20px;font-size:16pt}table{width:100%;border-collapse:collapse;margin-top:15px;table-layout:fixed}th,td{border:1px solid #ddd;padding:6px;text-align:left;vertical-align:top;word-wrap:break-word}th{background:#f2f2f2;font-weight:bold}th:nth-child(1),td:nth-child(1){width:20%}th:nth-child(2),td:nth-child(2){width:10%}th:nth-child(3),td:nth-child(3){width:15%}th:nth-child(4),td:nth-child(4){width:12%}th:nth-child(5),td:nth-child(5){width:23%}th:nth-child(6),td:nth-child(6){width:10%}th:nth-child(7),td:nth-child(7){width:10%}th:nth-child(8),td:nth-child(8){width:10%}.logo{text-align:center;margin-bottom:15px;font-size:14pt;font-weight:bold}.logo span{color:#3b82f6}.footer{text-align:center;margin-top:20px;font-size:8pt;color:#777}.total{margin-top:10px;font-weight:bold}@media print{body{margin:1cm;font-size:8pt}h1{font-size:14pt}.logo{font-size:12pt}th,td{padding:4px;font-size:7pt}.footer{position:fixed;bottom:.5cm;width:98%;left:1%}tr{page-break-inside:avoid}.no-print{display:none}@page{size:A4 landscape;margin:1cm}}</style></head><body><div class="logo">Gestor<span>Valente</span></div><h1>Relatório Cidadãos</h1><p class="total">Total (Filtrados): ${fC.length}</p><table><thead><tr><th>Nome</th><th>Tipo</th><th>Email</th><th>Telefone</th><th>Endereço</th><th>Liderança</th><th>Nasc.</th><th>Sexo</th></tr></thead><tbody>`; fC.forEach(c => { const addr = [c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.estado, c.cep ? `CEP: ${formatCEP(c.cep)}` : null].filter(Boolean).join(', ')||'-'; let dobF='-'; if(c.dob){try{const d=new Date(`${c.dob}T00:00:00Z`);if(!isNaN(d.getTime()))dobF=d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'});}catch(e){}} html += `<tr><td>${c.name||'-'}</td><td>${c.type||'-'}</td><td>${c.email||'-'}</td><td>${c.phone?formatPhone(c.phone)+(c.whatsapp?' (W)':''):'-'}</td><td>${addr}</td><td>${c.leader||'-'}</td><td>${dobF}</td><td>${c.sexo||'-'}</td></tr>`; }); html += `</tbody></table><div class="footer">Gerado em: ${new Date().toLocaleString('pt-BR')}</div></body></html>`; const win = window.open('','_blank'); if(win){ win.document.write(html); win.document.close(); setTimeout(()=>{win.focus();win.print();},500); } else showToast("Pop-up bloqueado.", "error"); }


// --- Maps ---
function initMap() { if (map) return; try { map = L.map(mapElement).setView([-15.7801,-47.9292],4); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, attribution:'© OSM' }).addTo(map); } catch (e) { console.error("Map init error:", e); showToast("Erro mapa.", "error"); mapElement.innerHTML='<p class="text-red-500 p-4">Erro ao carregar mapa.</p>'; } }
async function openMapModal(cidadaosToShow) { if(cidadaosToShow.length===0){showToast("Nenhum cidadão.", "error"); return;} mapModal.classList.remove('hidden'); initMap(); if(!map){closeMapModal();return;} requestAnimationFrame(()=>{ map.invalidateSize(); markers.forEach(m=>map.removeLayer(m)); markers=[]; geocodeAndAddMarkers(cidadaosToShow); }); }
async function geocodeAndAddMarkers(cidadaos) { if(!map)return; const bounds=L.latLngBounds(); let added=0; const promises = cidadaos.map(async(c)=>{ if(!c.address) return null; const query=encodeURIComponent(c.address+", Brasil"); const url=`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&email=user@example.com`; try { await new Promise(r=>setTimeout(r,1100)); const res = await fetch(url,{headers:{'Accept':'application/json'}}); if(!res.ok){ if(res.status===429) console.warn(`Rate limited: ${c.address}`); else console.error(`Nominatim error ${res.status}: ${c.address}`); return null; } const data = await res.json(); if(data&&data.length>0){ const r=data[0]; const lat=parseFloat(r.lat); const lon=parseFloat(r.lon); let iH=`<div class="map-marker-content bg-white border rounded-full shadow flex items-center justify-center font-bold" style="width:30px;height:30px;font-size:14px;overflow:hidden;">`; const i=c.name?c.name.charAt(0).toUpperCase():'?'; if(c.photoUrl) iH+=`<img src="${c.photoUrl}" alt="${c.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.parentElement.innerHTML='${i}';this.parentElement.classList.add('bg-slate-200','text-slate-500');">`; else {iH+=i; iH=iH.replace('class="map-marker-content','class="map-marker-content bg-slate-200 text-slate-500');} iH+=`</div>`; const icon=L.divIcon({className:'custom-map-marker',html:iH,iconSize:[30,30],iconAnchor:[15,30],popupAnchor:[0,-30]}); const marker=L.marker([lat,lon],{icon}).addTo(map); marker.bindPopup(`<b>${c.name}</b><br>${r.display_name}`); markers.push(marker); bounds.extend([lat,lon]); added++; return marker; } else console.warn("No geocode result:", c.address); return null; } catch(e){ console.error("Geocode error:", c.address, e); return null; } }); await Promise.all(promises); if(added>0) map.fitBounds(bounds,{padding:[50,50]}); else if(cidadaos.length>0) showToast("Endereços não localizados.", "error"); }
function closeMapModal() { mapModal.classList.add('hidden'); }
viewMapBtn.addEventListener('click', () => { const fC = getFilteredCidadaos(); if (fC.length > 0) { const cWA = fC.map(c => ({ name:c.name, address:[c.logradouro, c.numero, c.bairro, c.cidade, c.estado, c.cep].filter(Boolean).join(', '), photoUrl:c.photoUrl })).filter(c => c.address); if (cWA.length > 0) openMapModal(cWA); else showToast("Nenhum cidadão filtrado possui endereço.", "error"); } else showToast("Nenhum cidadão selecionado.", "error"); });
closeMapBtn.addEventListener('click', closeMapModal); mapModal.addEventListener('click', (e) => { if (e.target === mapModal) closeMapModal(); });
function shareLocation(c) { const addr=[c.logradouro,c.numero,c.bairro,c.cidade,c.estado,c.cep].filter(Boolean).join(', '); if(!addr){showToast("Sem endereço.","error");return;} const url=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`; const txt=`Localização de ${c.name}: ${url}`; if(navigator.share) navigator.share({title:`Localização de ${c.name}`, text:`Localização de ${c.name}.`, url}).catch((e)=>{console.error('Share error:', e); copyToClipboard(txt);}); else copyToClipboard(txt); }
function copyToClipboard(text) { const ta=document.createElement("textarea"); ta.value=text; document.body.appendChild(ta); ta.select(); try {const ok=document.execCommand('copy'); showToast(ok?'Copiado!':'Falha.', ok?'success':'error');} catch(e){showToast('Erro ao copiar.','error');} document.body.removeChild(ta); }


// --- Dashboard ---
function renderDashboard() { if (!currentUserId || !allCidadaos || !allDemandas) return; document.getElementById('dashboard-total-cidadaos').textContent = allCidadaos.length; document.getElementById('dashboard-total-demandas').textContent = allDemandas.length; renderCidadaosPorTipoChart(); renderDemandasPorStatusChart(); renderCidadaosPorBairroChart(); renderCidadaosPorSexoChart(); renderCidadaosPorFaixaEtariaChart(); renderAniversariantes(); renderDemandasRecentes(); }
function renderCidadaosPorTipoChart() { const ctx=document.getElementById('cidadaos-por-tipo-chart')?.getContext('2d'); if(!ctx)return; const tipos=allCidadaos.reduce((a,c)=>{const t=c.type||'N/D';a[t]=(a[t]||0)+1;return a;},{}); const labels=Object.keys(tipos); const data=Object.values(tipos); const bg=['#3B82F6','#10B981','#EF4444','#F59E0B','#8B5CF6','#60A5FA','#EC4899']; const bd=bg.map(c=>c.replace('0.7','1')); if(cidadaosPorTipoChartInstance)cidadaosPorTipoChartInstance.destroy(); cidadaosPorTipoChartInstance=new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:bg.slice(0,labels.length),borderColor:bd.slice(0,labels.length),borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>{let l=c.label||'';if(l)l+=': ';if(c.parsed!==null){const t=c.chart.data.datasets[0].data.reduce((a,b)=>a+b,0);const p=t>0?((c.parsed/t)*100).toFixed(1)+'%':'0%';l+=`${c.parsed} (${p})`;}return l;}}}}}}); }
function renderDemandasPorStatusChart() { const ctx=document.getElementById('demandas-por-status-chart')?.getContext('2d'); if(!ctx)return; const counts=allDemandas.reduce((a,d)=>{const s=d.status||'pending';a[s]=(a[s]||0)+1;return a;},{pending:0,inprogress:0,completed:0}); const map={'pending':'Pendente','inprogress':'Em Andamento','completed':'Concluída'}; const labels=Object.keys(counts).map(k=>map[k]); const data=Object.values(counts); const bg={'pending':'#F59E0B99','inprogress':'#3B82F699','completed':'#10B98199'}; const bd={'pending':'#F59E0B','inprogress':'#3B82F6','completed':'#10B981'}; if(demandasPorStatusChartInstance)demandasPorStatusChartInstance.destroy(); demandasPorStatusChartInstance=new Chart(ctx,{type:'pie',data:{labels,datasets:[{data,backgroundColor:Object.keys(counts).map(k=>bg[k]),borderColor:Object.keys(counts).map(k=>bd[k]),borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>{let l=c.label||'';if(l)l+=': ';if(c.parsed!==null){const t=c.chart.data.datasets[0].data.reduce((a,b)=>a+b,0);const p=t>0?((c.parsed/t)*100).toFixed(1)+'%':'0%';l+=`${c.parsed} (${p})`;}return l;}}}}}}); }
function renderCidadaosPorBairroChart() { const ctx=document.getElementById('cidadaos-por-bairro-chart')?.getContext('2d'); if(!ctx)return; const counts=allCidadaos.reduce((a,c)=>{const b=c.bairro||'N/I';a[b]=(a[b]||0)+1;return a;},{}); const sorted=Object.entries(counts).sort(([,a],[,b])=>b-a).slice(0,10); const labels=sorted.map(([b])=>b); const data=sorted.map(([,c])=>c); if(cidadaosPorBairroChartInstance)cidadaosPorBairroChartInstance.destroy(); cidadaosPorBairroChartInstance=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Top 10 Bairros',data,backgroundColor:'#4BC0C099',borderColor:'#4BC0C0',borderWidth:1}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,scales:{x:{beginAtZero:true,title:{display:true,text:'Nº Cidadãos'}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>` ${c.parsed.x} Cidadãos`}}}}}); }
function renderCidadaosPorSexoChart() { const ctx=document.getElementById('cidadaos-por-sexo-chart')?.getContext('2d'); if(!ctx)return; const counts=allCidadaos.reduce((a,c)=>{const s=c.sexo||'N/I';a[s]=(a[s]||0)+1;return a;},{'Masculino':0,'Feminino':0,'Outro':0,'Não Informar':0}); const labels=Object.keys(counts).filter(k=>counts[k]>0); const data=labels.map(l=>counts[l]); const bg={'Masculino':'#36A2EB99','Feminino':'#FF638499','Outro':'#FFCE5699','Não Informar':'#9966FF99','N/I':'#C9CBCF99'}; const bd={'Masculino':'#36A2EB','Feminino':'#FF6384','Outro':'#FFCE56','Não Informar':'#9966FF','N/I':'#C9CBCF'}; if(cidadaosPorSexoChartInstance)cidadaosPorSexoChartInstance.destroy(); cidadaosPorSexoChartInstance=new Chart(ctx,{type:'pie',data:{labels,datasets:[{data,backgroundColor:labels.map(l=>bg[l]),borderColor:labels.map(l=>bd[l]),borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>{let l=c.label||'';if(l)l+=': ';if(c.parsed!==null){const t=c.chart.data.datasets[0].data.reduce((a,b)=>a+b,0);const p=t>0?((c.parsed/t)*100).toFixed(1)+'%':'0%';l+=`${c.parsed} (${p})`;}return l;}}}}}}); }
function renderCidadaosPorFaixaEtariaChart() { const ctx=document.getElementById('cidadaos-por-faixa-etaria-chart')?.getContext('2d'); if(!ctx)return; const counts=allCidadaos.reduce((a,c)=>{const{group}=calculateAgeAndGroup(c.dob);a[group]=(a[group]||0)+1;return a;},{'0-17':0,'18-25':0,'26-35':0,'36-50':0,'51-65':0,'66+':0,'N/A':0}); const order=['0-17','18-25','26-35','36-50','51-65','66+','N/A']; const labels=order.filter(l=>counts[l]>0); const data=labels.map(l=>counts[l]); const bg=['#FF638499','#36A2EB99','#FFCE5699','#4BC0C099','#9966FF99','#FF9F4099','#C9CBCF99']; const bd=['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40','#C9CBCF']; if(cidadaosPorFaixaEtariaChartInstance)cidadaosPorFaixaEtariaChartInstance.destroy(); cidadaosPorFaixaEtariaChartInstance=new Chart(ctx,{type:'pie',data:{labels:labels.map(l=>l==='N/A'?'N/I':`${l} anos`),datasets:[{data,backgroundColor:bg.slice(0,labels.length),borderColor:bd.slice(0,labels.length),borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>{let l=c.label||'';if(l)l+=': ';if(c.parsed!==null){const t=c.chart.data.datasets[0].data.reduce((a,b)=>a+b,0);const p=t>0?((c.parsed/t)*100).toFixed(1)+'%':'0%';l+=`${c.parsed} (${p})`;}return l;}}}}}}); }
function renderAniversariantes() { const list=document.getElementById('aniversariantes-list'); if(!list)return; list.innerHTML=''; const month=new Date().getMonth(); const aniv=allCidadaos.filter(c=>{if(!c.dob)return false;try{const d=new Date(`${c.dob}T00:00:00Z`);return !isNaN(d.getTime())&&d.getUTCMonth()===month;}catch(e){return false;}}).sort((a,b)=>{try{const dA=new Date(`${a.dob}T00:00:00Z`).getUTCDate();const dB=new Date(`${b.dob}T00:00:00Z`).getUTCDate();return dA-dB;}catch(e){return 0;}}); if(aniv.length===0){list.innerHTML='<p class="text-sm text-gray-500 italic">Nenhum aniversariante.</p>';return;} aniv.forEach(c=>{const i=document.createElement('div');i.className='flex items-center justify-between text-sm py-1';let d='';try{d=new Date(`${c.dob}T00:00:00Z`).getUTCDate().toString().padStart(2,'0');}catch(e){} i.innerHTML=`<span>${c.name}</span><span class="font-semibold text-blue-600">${d||'--'}</span>`;list.appendChild(i);}); }
function renderDemandasRecentes() { const list=document.getElementById('demandas-recentes-list'); if(!list)return; list.innerHTML=''; const recentes=allDemandas.slice(0,10); if(recentes.length===0){list.innerHTML='<p class="text-sm text-gray-500 italic">Nenhuma demanda recente.</p>';return;} recentes.forEach(d=>{const c=allCidadaos.find(ci=>ci.id===d.cidadaoId);const cN=c?c.name:'C. Desconhecido';let sC='bg-yellow-100 text-yellow-800',sT='Pendente';if(d.status==='inprogress'){sC='bg-blue-100 text-blue-800';sT='Em Andamento';}else if(d.status==='completed'){sC='bg-green-100 text-green-800';sT='Concluída';}const i=document.createElement('div');i.className='border-b pb-2 mb-2 cursor-pointer hover:bg-gray-50 p-2 rounded demanda-recente-item';i.dataset.id=d.id;i.innerHTML=`<div class="flex justify-between items-center mb-1"><span class="font-semibold text-sm text-gray-700 truncate" title="${d.title}">${d.title}</span><span class="text-xs font-semibold px-2 py-0.5 rounded-full ${sC}">${sT}</span></div><p class="text-xs text-gray-500">Para: ${cN}</p>`;list.appendChild(i);}); list.removeEventListener('click', handleRecentDemandaClick); list.addEventListener('click', handleRecentDemandaClick); }
function handleRecentDemandaClick(e) { const item=e.target.closest('.demanda-recente-item'); if(item&&item.dataset.id) openDemandaDetailsModal(item.dataset.id); }

// --- Inicialização ---
// O listener onAuthStateChanged já chama loadInitialData após o login bem-sucedido.