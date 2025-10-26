// Firebase SDK modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, deleteDoc, query, where, onSnapshot, orderBy, serverTimestamp, updateDoc, writeBatch, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"; // Added Timestamp and writeBatch
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js"; // Added deleteObject

// Your web app's Firebase configuration
// =========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyC5XTEAfbKkN4x6iw1dZPWHvtcNC_a_eVw",
  authDomain: "gestor-valente-crm.firebaseapp.com",
  projectId: "gestor-valente-crm",
  storageBucket: "gestor-valente-crm.appspot.com",
  messagingSenderId: "1015920298445",
  appId: "1:1015920298445:web:38f28f0802756c250d9c84"
};
// =========================================================================

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Global variables
let currentUser = null;
let currentUserId = null;
let allCidadaos = [];
let allDemandas = [];
let allLeaders = []; // Added to store leaders separately
let currentCidadaoId = null; // Changed from currentEditingId for clarity
let currentDemandaId = null; // Changed from currentEditingDemandaId/viewingDemandaId
let cidadaosListener = null; // Changed from unsubscribeCidadaos
let demandasListener = null; // Changed from unsubscribeDemandas
let notesListener = null; // Added for notes within demanda details
let itemToDelete = { id: null, type: null }; // For confirmation modal

// Map and Chart Variables
let map = null;
let markers = [];
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
const loginBtn = document.getElementById('login-btn'); // Added login button
const logoutBtn = document.getElementById('logout-btn');
const sidebarNav = document.getElementById('sidebar-nav');
const pages = document.querySelectorAll('.page');
const addCidadaoBtn = document.getElementById('add-cidadao-btn');
const cidadaoModal = document.getElementById('cidadao-modal');
const modalContentCidadao = document.getElementById('modal-content'); // Specific content for animation
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
const filterSexo = document.getElementById('filter-sexo');
const filterFaixaEtaria = document.getElementById('filter-faixa-etaria');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const toastContainer = document.getElementById('toast-container');
const cidadaoDetailsModal = document.getElementById('cidadao-details-modal');
const modalContentCidadaoDetails = cidadaoDetailsModal.querySelector('.bg-white'); // Specific content for animation
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
const modalContentDemandaDetails = demandaDetailsModal.querySelector('.bg-white'); // Specific content for animation
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
function showToast(message, type = 'success') { const toast = document.createElement('div'); let bgColor; switch(type){ case 'success': bgColor='bg-green-500'; break; case 'error': bgColor='bg-red-500'; break; case 'warning': bgColor='bg-yellow-400 text-black'; break; default: bgColor='bg-blue-500'; break; } toast.className = `p-4 rounded-lg shadow-md text-white ${bgColor} mb-2 transition-opacity duration-300 opacity-0`; toast.textContent = message; toastContainer.prepend(toast); setTimeout(()=>toast.style.opacity = '1', 10); setTimeout(() => { toast.style.opacity = '0'; setTimeout(()=>toast.remove(), 300); }, 3000); }
function formatCPF(cpf) { if (!cpf) return ''; cpf = cpf.replace(/\D/g, '').slice(0, 11); cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2'); cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2'); cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); return cpf; }
function formatPhone(phone) { if (!phone) return ''; phone = phone.replace(/\D/g, '').slice(0, 11); if (phone.length === 11) phone = phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'); else if (phone.length === 10) phone = phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3'); else if (phone.length === 9) phone = phone.replace(/(\d{5})(\d{4})/, '$1-$2'); else if (phone.length === 8) phone = phone.replace(/(\d{4})(\d{4})/, '$1-$2'); return phone; }
function formatCEP(cep) { if (!cep) return ''; cep = cep.replace(/\D/g, '').slice(0, 8); cep = cep.replace(/^(\d{5})(\d)/, '$1-$2'); return cep; }
function formatVoterID(voterId) { if (!voterId) return ''; voterId = voterId.replace(/\D/g, '').slice(0, 12); if (voterId.length === 12) voterId = voterId.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3'); return voterId; }
function getInitials(name) { if (!name) return '?'; const parts = name.trim().split(' '); if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase(); return (name[0]).toUpperCase(); }
function getStatusInfo(status) { switch (status) { case 'pending': return { text: 'Pendente', classes: 'status-badge status-pending', color: '#F59E0B' }; case 'inprogress': return { text: 'Em Andamento', classes: 'status-badge status-inprogress', color: '#3B82F6' }; case 'completed': return { text: 'Concluída', classes: 'status-badge status-completed', color: '#10B981' }; default: return { text: 'N/A', classes: 'status-badge', color: '#6B7280' }; } }
function formatarData(dateString) { if (!dateString) return 'N/A'; try { const parts = dateString.split('-'); if (parts.length !== 3) return dateString; return `${parts[2]}/${parts[1]}/${parts[0]}`; } catch (e) { return dateString; } }
function getFaixaEtaria(dob) { if (!dob) return 'N/A'; try { const birthDate = new Date(dob + "T00:00:00"); if (isNaN(birthDate.getTime())) return 'N/A'; const today = new Date(); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--; if (age < 0) return 'N/A'; if (age <= 17) return '0-17'; if (age <= 25) return '18-25'; if (age <= 35) return '26-35'; if (age <= 50) return '36-50'; if (age <= 65) return '51-65'; return '66+'; } catch (e) { return 'N/A'; } }

// Apply masks on input
document.getElementById('cidadao-cpf')?.addEventListener('input', (e) => { e.target.value = formatCPF(e.target.value); });
document.getElementById('cidadao-phone')?.addEventListener('input', (e) => { e.target.value = formatPhone(e.target.value); });
document.getElementById('cidadao-cep')?.addEventListener('input', (e) => { e.target.value = formatCEP(e.target.value); });
document.getElementById('cidadao-voterid')?.addEventListener('input', (e) => { e.target.value = formatVoterID(e.target.value); });

// --- Authentication ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user; currentUserId = user.uid;
        console.log("User logged in:", currentUserId);
        showApp(); loadInitialData();
    } else {
        currentUser = null; currentUserId = null;
        console.log("User logged out");
        if (cidadaosListener) cidadaosListener();
        if (demandasListener) demandasListener();
        if (notesListener) notesListener();
        cidadaosListener = null; demandasListener = null; notesListener = null;
        showLoginPage(); clearData();
    }
});

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value; const password = passwordInput.value;
    loginBtn.disabled = true; loginBtn.innerHTML = 'Aguarde...'; // Spinner feedback
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Login bem-sucedido!');
        // onAuthStateChanged handles UI change
    } catch (error) {
        console.error("Erro no login:", error.code, error.message);
        let msg = 'Email ou palavra-passe inválidos.';
        if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(error.code)) msg = 'Credenciais inválidas.';
        else if (error.code === 'auth/too-many-requests') msg = 'Muitas tentativas. Tente mais tarde.';
        else if (error.code === 'auth/network-request-failed') msg = 'Erro de rede.';
        else if (['auth/invalid-api-key', 'auth/api-key-not-valid.-please-pass-a-valid-api-key.'].includes(error.code)) msg = 'Erro de configuração da API Key.';
        showToast(msg, 'error');
        loginBtn.disabled = false; loginBtn.innerHTML = 'Entrar'; // Restore button on error
    }
    // No finally needed here as onAuthStateChanged handles success UI
});

logoutBtn?.addEventListener('click', async () => {
    try { await signOut(auth); showToast('Logout bem-sucedido!'); }
    catch (error) { console.error("Erro no logout:", error); showToast('Erro ao fazer logout.', 'error'); }
});

// --- UI Navigation ---
function showLoginPage() { loginPage?.classList.remove('hidden'); appContainer?.classList.add('hidden'); appContainer?.classList.remove('flex'); }
function showApp() { loginPage?.classList.add('hidden'); appContainer?.classList.remove('hidden'); appContainer?.classList.add('flex'); navigateTo('dashboard'); }
function navigateTo(pageId) {
    pages.forEach(p => { p.id === `${pageId}-page` ? (p.classList.remove('hidden'), p.classList.add('flex', 'flex-col')) : (p.classList.add('hidden'), p.classList.remove('flex', 'flex-col')); });
    sidebarNav?.querySelectorAll('.nav-link').forEach(l => { l.getAttribute('href') === `#${pageId}` ? l.classList.add('bg-slate-900', 'font-semibold') : l.classList.remove('bg-slate-900', 'font-semibold'); });
    if (pageId === 'dashboard') renderDashboard();
    // Demandas and Cidadaos are rendered by their listeners primarily
}
sidebarNav?.addEventListener('click', (e) => { const link = e.target.closest('a.nav-link'); if (link) { e.preventDefault(); navigateTo(link.getAttribute('href').substring(1)); } });
logoBtn?.addEventListener('click', () => { navigateTo('dashboard'); });


// --- Data Loading and Clearing ---
async function loadInitialData() {
    if (!currentUserId) { console.warn("loadInitialData skipped: No user ID."); return; }
    console.log("Loading initial data for user:", currentUserId);
    if (cidadaosListener) { cidadaosListener(); cidadaosListener = null; }
    if (demandasListener) { demandasListener(); demandasListener = null; }

    // Using root collections as decided
    const cidadaosPath = 'cidadaos';
    const cidadaosQuery = query(collection(db, cidadaosPath)); // Add appropriate 'where' clause if needed for multi-user on root
    console.log("Setting up cidadaos listener on path:", cidadaosPath);
    cidadaosListener = onSnapshot(cidadaosQuery, (snapshot) => {
        allCidadaos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allLeaders = allCidadaos.filter(c => c.type === 'Liderança').sort((a, b) => a.name.localeCompare(b.name));
        console.log("Cidadãos data updated:", allCidadaos.length);
        populateFilters(); updateLeaderSelects(); updateBairroFilter();
        const currentPageId = document.querySelector('.page:not(.hidden)')?.id?.replace('-page', '');
        if (currentPageId === 'cidadaos') renderCidadaos();
        else if (currentPageId === 'dashboard') renderDashboard();
        else if (currentPageId === 'demandas') populateDemandaFilters(); // Update leader filter on demanda page too
    }, (error) => { console.error("Erro ao carregar cidadãos:", error); showToast(`Erro cidadãos: ${error.code === 'permission-denied' ? 'Permissões.' : 'Tente recarregar.'}`, "error"); });

    const demandasPath = 'demandas';
    const demandasQuery = query(collection(db, demandasPath), orderBy('createdAt', 'desc')); // Add 'where' if needed
    console.log("Setting up demandas listener on path:", demandasPath);
    demandasListener = onSnapshot(demandasQuery, (snapshot) => {
        allDemandas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Demandas data updated:", allDemandas.length);
        const currentPageId = document.querySelector('.page:not(.hidden)')?.id?.replace('-page', '');
        if (currentPageId === 'demandas') renderDemandas();
        else if (currentPageId === 'dashboard') renderDashboard();
    }, (error) => { console.error("Erro ao carregar demandas:", error); showToast(`Erro demandas: ${error.code === 'permission-denied' ? 'Permissões.' : 'Tente recarregar.'}`, "error"); });
}

function clearData() {
    console.log("Clearing data."); allCidadaos = []; allDemandas = []; allLeaders = [];
    cidadaosGrid.innerHTML = ''; allDemandasList.innerHTML = '';
    // Reset filters
    [filterType, filterBairro, filterLeader, filterSexo, filterFaixaEtaria, searchInput, demandaFilterStatus, demandaFilterLeader].forEach(el => { if(el) el.value = ''; });
    updateLeaderSelects(); updateBairroFilter(); populateDemandaFilters(); // Clear dropdowns too
    // Clear dashboard
    document.getElementById('dashboard-total-cidadaos').textContent = '0'; document.getElementById('dashboard-total-demandas').textContent = '0';
    document.getElementById('aniversariantes-list').innerHTML = ''; document.getElementById('demandas-recentes-list').innerHTML = '';
    // Destroy charts
    [cidadaosPorTipoChartInstance, demandasPorStatusChartInstance, cidadaosPorBairroChartInstance, cidadaosPorSexoChartInstance, cidadaosPorFaixaEtariaChartInstance].forEach(chart => chart?.destroy());
    cidadaosPorTipoChartInstance = demandasPorStatusChartInstance = cidadaosPorBairroChartInstance = cidadaosPorSexoChartInstance = cidadaosPorFaixaEtariaChartInstance = null;
}

// --- Cidadãos ---
function populateFilters() { /* Re-uses updateBairroFilter and updateLeaderSelects */ }
function updateLeaderSelects() {
    const selects = [cidadaoLeaderSelect, filterLeader, demandaFilterLeader];
    selects.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = `<option value="">${select.id === 'cidadao-leader' ? 'Nenhuma' : 'Filtrar Liderança'}</option>`;
        allLeaders.forEach(l => { const opt = document.createElement('option'); opt.value = l.name; opt.textContent = l.name; select.appendChild(opt); }); // Store/Filter by name
        // Try to restore previous selection if still valid
        if (allLeaders.some(l => l.name === currentVal)) select.value = currentVal;
    });
}
function updateBairroFilter() {
    if (!filterBairro) return;
    const currentVal = filterBairro.value;
    const bairros = [...new Set(allCidadaos.map(c => c.bairro).filter(Boolean))].sort();
    filterBairro.innerHTML = '<option value="">Filtrar Bairro</option>';
    bairros.forEach(b => { const opt = document.createElement('option'); opt.value = b; opt.textContent = b; filterBairro.appendChild(opt); });
    if (bairros.includes(currentVal)) filterBairro.value = currentVal;
}
function calculateAgeAndGroup(dobString) { /* ... same as before ... */ if (!dobString) return { age: null, group: 'N/A' }; try { const birthDate = new Date(dobString + "T00:00:00"); if (isNaN(birthDate.getTime())) return { age: null, group: 'N/A'}; const today = new Date(); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--; if (age < 0) return { age: null, group: 'N/A' }; if (age <= 17) return { age: age, group: '0-17' }; if (age <= 25) return { age: age, group: '18-25' }; if (age <= 35) return { age: age, group: '26-35' }; if (age <= 50) return { age: age, group: '36-50' }; if (age <= 65) return { age: age, group: '51-65' }; return { age: age, group: '66+' }; } catch (e) { return { age: null, group: 'N/A' }; } }
function getFilteredCidadaos() { const sT = searchInput.value.toLowerCase().trim(); const t = filterType.value; const b = filterBairro.value; const l = filterLeader.value; const s = filterSexo.value; const fE = filterFaixaEtaria.value; return allCidadaos.filter(c => { const nM = (c.name || '').toLowerCase().includes(sT); const eM = (c.email || '').toLowerCase().includes(sT); const sTD = sT.replace(/\D/g,''); const cM = sTD && (c.cpf || '').includes(sTD); const sM = !sT || nM || eM || cM; const tM = !t || c.type === t; const bM = !b || c.bairro === b; const lM = !l || c.leader === l; const sExM = !s || (c.sexo || 'Não Informar') === s; const ageInfo = calculateAgeAndGroup(c.dob); const fEM = !fE || ageInfo.group === fE; return sM && tM && bM && lM && sExM && fEM; }); }
function renderCidadaos() { if(!cidadaosGrid) return; const filtered = getFilteredCidadaos().sort((a,b)=>a.name.localeCompare(b.name)); cidadaosGrid.innerHTML = ''; if (filtered.length === 0) { cidadaosGrid.innerHTML = '<p class="text-gray-500 md:col-span-full text-center py-10">Nenhum cidadão encontrado.</p>'; return; } filtered.forEach(c => { const card = document.createElement('div'); card.className = 'bg-white p-5 rounded-lg shadow-sm border flex flex-col justify-between'; const iL = getInitials(c.name); const pC = c.photoUrl ? `<img src="${c.photoUrl}" alt="${c.name}" class="w-16 h-16 rounded-full object-cover bg-gray-200" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold\\'>${iL}</div>';">` : `<div class="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold">${iL}</div>`; card.innerHTML = `<div class="flex items-center gap-4 mb-4">${pC}<div class="flex-1"><h3 class="text-lg font-bold text-gray-800 truncate" title="${c.name}">${c.name}</h3><p class="text-sm text-gray-600">${c.type||'N/A'}</p></div></div><div class="space-y-1 text-sm text-gray-600 mb-4 flex-1"><p class="truncate" title="${c.email}"><strong class="font-medium">Email:</strong> ${c.email||'-'}</p><p><strong class="font-medium">Tel:</strong> ${c.phone?formatPhone(c.phone):'-'} ${c.whatsapp?'<span class="text-green-600">(W)</span>':''}</p><p class="truncate" title="${c.bairro}"><strong class="font-medium">Bairro:</strong> ${c.bairro||'-'}</p>${c.leader?`<p class="text-xs text-gray-500 mt-1 truncate" title="Líder: ${c.leader}"><em>Líder: ${c.leader}</em></p>`:''}</div><div class="border-t pt-3 flex gap-1 justify-end flex-wrap"><button class="btn-view-details text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-2 rounded" data-id="${c.id}">Detalhes</button><button class="btn-edit text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 px-2 rounded" data-id="${c.id}">Editar</button><button class="btn-add-demanda text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 py-1 px-2 rounded" data-id="${c.id}">Demanda</button><button class="btn-delete text-xs bg-red-100 hover:bg-red-200 text-red-700 py-1 px-2 rounded" data-id="${c.id}" data-name="${c.name}">Excluir</button></div>`; cidadaosGrid.appendChild(card); }); addGridButtonListeners(); }
function addGridButtonListeners() { cidadaosGrid.removeEventListener('click', handleGridButtonClick); cidadaosGrid.addEventListener('click', handleGridButtonClick); }
function handleGridButtonClick(e) { const btn = e.target.closest('button'); if (!btn) return; const id = btn.dataset.id; const name = btn.dataset.name; if (btn.classList.contains('btn-view-details')) showCidadaoDetails(id); else if (btn.classList.contains('btn-edit')) openCidadaoModal(id); else if (btn.classList.contains('btn-add-demanda')) openDemandaModal(id); else if (btn.classList.contains('btn-delete')) requestDelete(id, 'cidadao', name); }
cidadaoPhotoUploadInput?.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { if (!file.type.startsWith('image/')) { showToast('Selecione uma imagem.', 'error'); fileNameDisplay.textContent = 'Inválido'; e.target.value = ''; return; } if (file.size > 5*1024*1024) { showToast('Máx 5MB.', 'error'); fileNameDisplay.textContent = 'Grande'; e.target.value = ''; return; } fileNameDisplay.textContent = file.name; cidadaoPhotoUrlInput.value = ''; } else fileNameDisplay.textContent = 'Nenhum ficheiro'; });

function openCidadaoModal(cidadaoId = null) { currentCidadaoId = cidadaoId; cidadaoForm.reset(); fileNameDisplay.textContent = 'Nenhum ficheiro'; childrenDetailsContainer.innerHTML = ''; updateLeaderSelects(); const cidadao = cidadaoId ? allCidadaos.find(c => c.id === cidadaoId) : null; if (cidadao) { cidadaoModalTitle.textContent = 'Editar Cidadão'; Object.keys(cidadao).forEach(key => { const elId = `cidadao-${key.toLowerCase().replace('id', 'voterid').replace('localtrabalho', 'local-trabalho')}`; const el = document.getElementById(elId); if (el) { if (el.type === 'checkbox') el.checked = cidadao[key]; else if (['cpf', 'phone', 'cep', 'voterId'].includes(key)) el.value = window[`format${key.toUpperCase()}`](cidadao[key]); else el.value = cidadao[key] ?? ''; } }); generateChildrenFields(cidadao.sons || 0, cidadao.daughters || 0, cidadao.children); } else { cidadaoModalTitle.textContent = 'Adicionar Cidadão'; generateChildrenFields(0, 0); } cidadaoModal?.classList.remove('hidden'); setTimeout(() => modalContentCidadao?.classList.remove('scale-95', 'opacity-0'), 10); }
function closeCidadaoModal() { modalContentCidadao?.classList.add('scale-95', 'opacity-0'); setTimeout(() => cidadaoModal?.classList.add('hidden'), 200); }
addCidadaoBtn?.addEventListener('click', () => openCidadaoModal()); closeModalBtn?.addEventListener('click', closeCidadaoModal); cancelBtn?.addEventListener('click', closeCidadaoModal); cidadaoModal?.addEventListener('click', (e) => { if (e.target === cidadaoModal) closeCidadaoModal(); });
function generateChildrenFields(numSons, numDaughters, existingChildren = []) { childrenDetailsContainer.innerHTML = ''; const total = parseInt(numSons||0)+parseInt(numDaughters||0); if (total > 0 && total <= 20) { childrenDetailsContainer.innerHTML = '<h3 class="text-lg font-semibold text-gray-800 border-b pb-2 mb-4">Detalhes dos Filhos</h3>'; for (let i = 0; i < total; i++) { const d = existingChildren?.[i] || {}; const w = document.createElement('div'); w.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 border p-3 rounded bg-gray-50 mb-3'; w.innerHTML = `<div><label for="child-name-${i}" class="block text-sm text-gray-700 mb-1">Nome Filho/a ${i+1}</label><input type="text" id="child-name-${i}" class="w-full border p-2 rounded child-detail-input" value="${d.name||''}" maxlength="100"></div><div><label for="child-dob-${i}" class="block text-sm text-gray-700 mb-1">Data Nasc. ${i+1}</label><input type="date" id="child-dob-${i}" class="w-full border p-2 rounded child-detail-input" value="${d.dob||''}"></div>`; childrenDetailsContainer.appendChild(w); } } else if (total > 20) childrenDetailsContainer.innerHTML = '<p class="text-red-500">Máx 20 filhos.</p>'; }
cidadaoSonsInput?.addEventListener('input', (e) => { let v=parseInt(e.target.value); if(isNaN(v)||v<0) v=0; if(v>10){ v=10; showToast('Máx 10 filhos.', 'warning'); } e.target.value = v; generateChildrenFields(v, cidadaoDaughtersInput.value); });
cidadaoDaughtersInput?.addEventListener('input', (e) => { let v=parseInt(e.target.value); if(isNaN(v)||v<0) v=0; if(v>10){ v=10; showToast('Máx 10 filhas.', 'warning'); } e.target.value = v; generateChildrenFields(cidadaoSonsInput.value, v); });

cidadaoForm?.addEventListener('submit', async (e) => {
    e.preventDefault(); if (!currentUserId) { showToast('Faça login.', 'error'); return; }
    let isValid = ['cidadao-name', 'cidadao-email'].every(id => { const i = document.getElementById(id); if (i&&!i.value.trim()){ i.classList.add('border-red-500'); return false; } if(i)i.classList.remove('border-red-500'); return true; }); if (!isValid) { showToast('Preencha nome e email.', 'error'); return; }
    saveBtn.disabled = true; saveBtn.innerHTML = 'Salvando...'; let pU = cidadaoPhotoUrlInput.value.trim(); const file = cidadaoPhotoUploadInput.files[0];
    try {
        if (file) { const fP = `photos/${currentUserId}/${Date.now()}_${file.name}`; const sR = ref(storage, fP); const sn = await uploadBytes(sR, file); pU = await getDownloadURL(sn.ref); console.log("Foto salva:", pU); }
        const children = []; const nS=parseInt(cidadaoSonsInput.value)||0; const nD=parseInt(cidadaoDaughtersInput.value)||0; for (let i=0; i<nS+nD; i++) { const nI=document.getElementById(`child-name-${i}`); const dI=document.getElementById(`child-dob-${i}`); if(nI&&dI){ const cN=nI.value.trim(); if(cN) children.push({name:cN, dob:dI.value||null}); } }
        const data = { name:document.getElementById('cidadao-name').value.trim(), email:document.getElementById('cidadao-email').value.trim().toLowerCase(), dob:document.getElementById('cidadao-dob').value||null, sexo:document.getElementById('cidadao-sexo').value, profissao:document.getElementById('cidadao-profissao').value.trim(), localTrabalho:document.getElementById('cidadao-local-trabalho').value.trim(), type:document.getElementById('cidadao-type').value, cpf:document.getElementById('cidadao-cpf').value.replace(/\D/g,''), rg:document.getElementById('cidadao-rg').value.replace(/\D/g,''), voterId:document.getElementById('cidadao-voterid').value.replace(/\D/g,''), phone:document.getElementById('cidadao-phone').value.replace(/\D/g,''), whatsapp:document.getElementById('cidadao-whatsapp').checked, cep:document.getElementById('cidadao-cep').value.replace(/\D/g,''), logradouro:document.getElementById('cidadao-logradouro').value.trim(), numero:document.getElementById('cidadao-numero').value.trim(), complemento:document.getElementById('cidadao-complemento').value.trim(), bairro:document.getElementById('cidadao-bairro').value.trim(), cidade:document.getElementById('cidadao-cidade').value.trim(), estado:document.getElementById('cidadao-estado').value.trim().toUpperCase(), leader:document.getElementById('cidadao-leader').value, sons:nS, daughters:nD, children, photoUrl:pU||null, updatedAt:serverTimestamp(), ownerId: currentUserId // Link data to user for root collection rules
        };
        const cP = 'cidadaos'; if (!currentCidadaoId) data.createdAt = serverTimestamp();
        if (currentCidadaoId) { const dR = doc(db, cP, currentCidadaoId); await setDoc(dR, data, { merge: true }); showToast('Cidadão atualizado!'); } // Use setDoc with merge for update
        else { const dR = await addDoc(collection(db, cP), data); showToast('Cidadão adicionado!'); }
        closeCidadaoModal();
    } catch (error) { console.error("Erro:", error); showToast(`Erro: ${error.message}`, 'error'); }
    finally { saveBtn.disabled = false; saveBtn.textContent = 'Salvar'; }
});

async function editCidadao(id) { if (!currentUserId || !id) return; try { const cP = 'cidadaos'; const dR = doc(db, cP, id); const dS = await getDoc(dR); if (dS.exists()) openCidadaoModal({ id: dS.id, ...dS.data() }); else showToast("Cidadão não encontrado.", "error"); } catch (error) { console.error("Erro:", error); showToast("Erro ao carregar.", "error"); } }

function requestDelete(id, type, name = '') { console.log("Request delete:", id, type, name); itemToDelete = { id, type }; const titleText = type === 'cidadao' ? 'Excluir Cidadão' : 'Excluir Demanda'; const itemIdentifier = name || (type === 'demanda' ? allDemandas.find(d=>d.id===id)?.title : '') || 'este item'; const messageText = type === 'cidadao' ? `Excluir "${itemIdentifier}"? Demandas associadas NÃO serão excluídas.` : `Excluir "${itemIdentifier}"?`; confirmationTitle.textContent = titleText; confirmationMessage.textContent = messageText; confirmationModal?.classList.remove('hidden'); }
function closeConfirmationModal() { console.log("Closing confirmation modal."); confirmationModal?.classList.add('hidden'); itemToDelete = { id: null, type: null }; }

cancelDeleteBtn?.addEventListener('click', closeConfirmationModal); // Direct listener
confirmDeleteBtn?.addEventListener('click', handleDeleteConfirmation); // Direct listener

async function handleDeleteConfirmation() {
    const { id, type } = itemToDelete;
    if (!id || !type || !currentUserId) return;
    console.log("Confirming delete:", id, type);
    confirmDeleteBtn.disabled = true; confirmDeleteBtn.textContent = 'Excluindo...';

    try {
        if (type === 'cidadao') {
            const cP = 'cidadaos'; const dR = doc(db, cP, id);
            // Optional: Delete photo from storage first
            const cidadaoData = allCidadaos.find(c=> c.id === id);
            if (cidadaoData?.photoUrl) {
                try {
                    const photoRef = ref(storage, cidadaoData.photoUrl);
                    await deleteObject(photoRef);
                    console.log("Foto excluída:", cidadaoData.photoUrl);
                } catch (photoError) {
                    // Log error but continue deleting Firestore doc
                    console.error("Erro ao excluir foto:", photoError);
                }
            }
            await deleteDoc(dR); showToast('Cidadão excluído!');
        } else if (type === 'demanda') {
            const dP = 'demandas'; const dR = doc(db, dP, id);
            // Optional: Delete subcollection 'notes' if needed (requires more complex logic/cloud function)
            await deleteDoc(dR); showToast('Demanda excluída!');
            closeDemandaDetailsModal(); // Close details if it was open
        }
    } catch (error) { console.error("Erro ao excluir:", error); showToast('Erro ao excluir.', 'error'); }
    finally { confirmDeleteBtn.disabled = false; confirmDeleteBtn.textContent = 'Excluir'; closeConfirmationModal(); }
}

async function showCidadaoDetails(id) { if (!currentUserId || !id) return; try { const cP = 'cidadaos'; const dR = doc(db, cP, id); const dS = await getDoc(dR); if (dS.exists()) { const c = { id: dS.id, ...dS.data() }; /* Fill modal details - truncated for brevity */ document.getElementById('details-name').textContent=c.name||'N/D'; document.getElementById('details-type').textContent=c.type||'N/I'; document.getElementById('details-email').textContent=c.email||'-'; document.getElementById('details-phone').textContent=c.phone?formatPhone(c.phone)+(c.whatsapp?' (W)':''):'-'; const addr=[c.logradouro,c.numero,c.complemento,c.bairro,c.cidade,c.estado,c.cep?`CEP: ${formatCEP(c.cep)}`:null].filter(Boolean).join(', ')||'N/I'; document.getElementById('details-address').textContent=addr; document.getElementById('details-cpf').textContent=c.cpf?formatCPF(c.cpf):'-'; document.getElementById('details-rg').textContent=c.rg||'-'; document.getElementById('details-voterid').textContent=c.voterId?formatVoterID(c.voterId):'-'; let dobF='-';if(c.dob){try{const d=new Date(`${c.dob}T00:00:00Z`);if(!isNaN(d.getTime()))dobF=d.toLocaleDateString('pt-BR',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'});}catch(e){}}document.getElementById('details-dob').textContent=dobF; document.getElementById('details-sexo').textContent=c.sexo||'-'; document.getElementById('details-profissao').textContent=c.profissao||'-'; document.getElementById('details-local-trabalho').textContent=c.localTrabalho||'-'; const leaderName = allLeaders.find(l=>l.name === c.leader)?.name; // Find name based on stored name
            document.getElementById('details-leader').textContent = leaderName || c.leader || '-'; // Show stored name or fallback
            const chC=document.getElementById('details-children');chC.innerHTML='';if(c.children&&c.children.length>0){/*...*/}else{/*...*/} const pD=document.getElementById('details-photo'); /*...*/ const iLD=getInitials(c.name); pD.innerHTML = c.photoUrl ? `<img src="${c.photoUrl}" onerror="this.onerror=null;this.parentElement.innerHTML='${iLD}'; this.parentElement.classList.add('bg-slate-200','text-slate-500');" class="w-full h-full object-cover">` : iLD; pD.className=`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold overflow-hidden border ${c.photoUrl?'':'bg-slate-200 text-slate-500'}`;
            detailsViewMapBtn.onclick=()=>{/*...*/}; detailsShareLocationBtn.onclick=()=>{shareLocation(c);}; cidadaoDetailsModal?.classList.remove('hidden'); setTimeout(()=>modalContentCidadaoDetails?.classList.remove('scale-95','opacity-0'), 10); } else { showToast("Detalhes não encontrados.", "error"); } } catch (error) { console.error("Erro:", error); showToast("Erro ao carregar.", "error"); } }
function closeCidadaoDetailsModal() { modalContentCidadaoDetails?.classList.add('scale-95', 'opacity-0'); setTimeout(()=>cidadaoDetailsModal?.classList.add('hidden'), 200); }
closeDetailsModalBtn?.addEventListener('click', closeCidadaoDetailsModal); cidadaoDetailsModal?.addEventListener('click', (e) => { if (e.target === cidadaoDetailsModal) closeCidadaoDetailsModal(); });

// --- Filters Event Listeners ---
searchInput?.addEventListener('input', renderCidadaos); filterType?.addEventListener('change', renderCidadaos); filterBairro?.addEventListener('change', renderCidadaos); filterLeader?.addEventListener('change', renderCidadaos); filterSexo?.addEventListener('change', renderCidadaos); filterFaixaEtaria?.addEventListener('change', renderCidadaos);
clearFiltersBtn?.addEventListener('click', () => { searchInput.value=''; filterType.value=''; filterBairro.value=''; filterLeader.value=''; filterSexo.value=''; filterFaixaEtaria.value=''; renderCidadaos(); });

// --- Demandas ---
function populateDemandaFilters() { if (!demandaFilterLeader || !allLeaders) return; const sel = demandaFilterLeader.value; demandaFilterLeader.innerHTML = '<option value="">Filtrar Liderança</option>'; allLeaders.forEach(l => { const o=document.createElement('option'); o.value = l.name; o.textContent = l.name; demandaFilterLeader.appendChild(o); }); if (allLeaders.some(l=>l.name === sel)) demandaFilterLeader.value = sel; }
function getFilteredDemandas() { const s = demandaFilterStatus.value; const lN = demandaFilterLeader.value; return allDemandas.filter(d => { const sM = !s || d.status === s; const c = allCidadaos.find(ci => ci.id === d.cidadaoId); const lM = !lN || (c && c.leader === lN); return sM && lM; }); }
function renderDemandas() { if (!allDemandasList) return; const filtered = getFilteredDemandas(); allDemandasList.innerHTML=''; if(filtered.length===0){allDemandasList.innerHTML='<p class="text-gray-500 text-center py-10">Nenhuma demanda.</p>';return;} filtered.forEach(d=>{ const c=allCidadaos.find(ci=>ci.id===d.cidadaoId); const cN=c?c.name:'C. Desconhecido'; const card=document.createElement('div'); card.className='bg-white p-4 rounded shadow-sm border flex justify-between items-start gap-4 hover:shadow-md cursor-pointer demanda-card'; card.dataset.id=d.id; const sI=getStatusInfo(d.status); const cD=d.createdAt?.toDate?d.createdAt.toDate():new Date(); const fD=cD.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}); card.innerHTML=`<div class="flex-1 overflow-hidden"><h3 class="text-lg font-semibold truncate" title="${d.title}">${d.title}</h3><p class="text-sm text-gray-600 mb-1">Para: <strong>${cN}</strong></p><p class="text-xs text-gray-500">Criada: ${fD}</p>${c&&c.leader?`<p class="text-xs text-gray-500 mt-1">Líder: ${c.leader}</p>`:''}</div><div class="flex-shrink-0"><span class="text-xs font-semibold px-2 py-1 rounded-full ${sI.classes.replace('status-badge ','')}">${sI.text}</span></div>`; allDemandasList.appendChild(card); }); addDemandaCardListener(); }
function addDemandaCardListener() { allDemandasList.removeEventListener('click', handleDemandaCardClick); allDemandasList.addEventListener('click', handleDemandaCardClick); }
function handleDemandaCardClick(e) { const card=e.target.closest('.demanda-card'); if(card&&card.dataset.id) openDemandaDetailsModal(card.dataset.id); }
function openDemandaModal(cidadaoId=null) { if(!allCidadaos||allCidadaos.length===0){showToast('Cadastre cidadãos primeiro.','warning');return;} demandaForm.reset(); currentDemandaId=null; demandaModalTitle.textContent='Adicionar Demanda'; demandaCidadaoSelect.innerHTML='<option value="" disabled selected>Selecione Cidadão</option>'; [...allCidadaos].sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.name;demandaCidadaoSelect.appendChild(o);}); if(cidadaoId)demandaCidadaoSelect.value=cidadaoId; demandaModal?.classList.remove('hidden'); }
function closeDemandaModal() { demandaModal?.classList.add('hidden'); }
addDemandaGeralBtn?.addEventListener('click',()=>openDemandaModal()); closeDemandaModalBtn?.addEventListener('click',closeDemandaModal); cancelDemandaBtn?.addEventListener('click',closeDemandaModal); demandaModal?.addEventListener('click',(e)=>{if(e.target===demandaModal)closeDemandaModal();});

demandaForm?.addEventListener('submit', async(e)=>{ e.preventDefault(); if(!currentUserId){showToast('Faça login.','error');return;} const cIS=demandaCidadaoSelect.value; const t=demandaTitleInput.value.trim(); if(!cIS){showToast('Selecione cidadão.','error');demandaCidadaoSelect.focus();return;} if(!t){showToast('Insira título.','error');demandaTitleInput.focus();return;} saveDemandaBtn.disabled=true;saveDemandaBtn.textContent='Salvando...'; const data={cidadaoId:cIS, title:t, description:demandaDescriptionInput.value.trim(), status:'pending', createdAt:serverTimestamp(), updatedAt:serverTimestamp(), notes:[], ownerId: currentUserId // Link data to user
}; try { const cP='demandas'; const dR = await addDoc(collection(db,cP), data); showToast('Demanda adicionada!'); closeDemandaModal(); } catch(error){ console.error("Erro:",error); showToast('Erro ao salvar.','error'); } finally { saveDemandaBtn.disabled=false; saveDemandaBtn.textContent='Salvar Demanda'; } });

async function openDemandaDetailsModal(demandaId) { if (!currentUserId||!demandaId) return; currentDemandaId = demandaId; if (notesListener) notesListener(); const dP='demandas'; const dDR=doc(db,dP,demandaId); try { const dS = await getDoc(dDR); // Get initial data once for static fields if(dS.exists()){ const d={id:dS.id,...dS.data()}; populateDemandaDetails(d); loadDemandaNotes(demandaId); // Load notes separately demandaDetailsModal?.classList.remove('hidden'); setTimeout(()=>modalContentDemandaDetails?.classList.remove('scale-95','opacity-0'), 10); } else { showToast("Demanda não encontrada.", "error"); closeDemandaDetailsModal(); } } catch(error){ console.error("Erro:",error); showToast("Erro ao carregar.", "error"); closeDemandaDetailsModal(); } }
function populateDemandaDetails(d) { const c=allCidadaos.find(ci=>ci.id===d.cidadaoId); const cN=c?c.name:'C. Desconhecido'; document.getElementById('details-demanda-title').textContent=d.title||'N/D'; document.getElementById('details-demanda-cidadao').textContent=`Para: ${cN}`; document.getElementById('details-demanda-description').textContent=d.description||'Sem descrição.'; document.getElementById('details-demanda-status').value=d.status||'pending'; /* Notes are loaded by loadDemandaNotes */ }
function closeDemandaDetailsModal() { if(notesListener) notesListener(); notesListener = null; modalContentDemandaDetails?.classList.add('scale-95', 'opacity-0'); setTimeout(()=>{ demandaDetailsModal?.classList.add('hidden'); currentDemandaId=null; addNoteForm.reset(); }, 200); }
closeDemandaDetailsBtn?.addEventListener('click', closeDemandaDetailsModal); demandaDetailsModal?.addEventListener('click', (e)=>{if(e.target===demandaDetailsModal)closeDemandaDetailsModal();});

document.getElementById('details-demanda-status')?.addEventListener('change', async(e)=>{ const nS=e.target.value; if(!currentUserId||!currentDemandaId||!nS)return; const dP=`demandas`; const dDR=doc(db,dP,currentDemandaId); try { await updateDoc(dDR,{status:nS,updatedAt:serverTimestamp()}); // Add automatic note for status change const notesRef = collection(dDR, 'notes'); await addDoc(notesRef, { text: `Status alterado para: ${getStatusInfo(nS).text}`, createdAt: serverTimestamp(), author: "Sistema" }); showToast('Status atualizado!'); } catch(error){ console.error("Erro:",error); showToast('Erro ao atualizar.','error'); } });
addNoteForm?.addEventListener('submit', async(e)=>{ e.preventDefault(); if(!currentUserId||!currentDemandaId)return; const nT=document.getElementById('new-note-text').value.trim(); if(!nT){showToast('Escreva algo.','error');return;} const dP=`demandas`; const dDR=doc(db,dP,currentDemandaId); try { const notesRef = collection(dDR, 'notes'); await addDoc(notesRef, { text: nT, createdAt: serverTimestamp(), author: currentUser.email || "Utilizador" }); // Store note in subcollection await updateDoc(dDR, { updatedAt: serverTimestamp() }); // Update parent timestamp showToast('Nota adicionada!'); addNoteForm.reset(); } catch(error){ console.error("Erro:",error); showToast('Erro ao adicionar.','error'); } });
deleteDemandaBtn?.addEventListener('click',()=>{ if(currentDemandaId) requestDelete(currentDemandaId, 'demanda'); });

// Load notes for the details modal
function loadDemandaNotes(demandaId) {
    if (!currentUserId || !demandaId) return;
    if (notesListener) notesListener(); // Unsubscribe previous

    const notesListEl = document.getElementById('demanda-notes-list');
    notesListEl.innerHTML = '<p class="text-sm text-gray-500">Carregando...</p>';

    const notesRef = collection(db, 'demandas', demandaId, 'notes'); // Path to subcollection
    const q = query(notesRef, orderBy('createdAt', 'asc')); // Order notes chronologically

    notesListener = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) { notesListEl.innerHTML = '<p class="text-sm text-gray-500 italic">Sem acompanhamentos.</p>'; return; }
        notesListEl.innerHTML = ''; // Clear
        snapshot.docs.forEach(doc => {
            const note = doc.data();
            const noteEl = document.createElement('div');
            noteEl.className = 'p-3 bg-gray-100 rounded-lg mb-2';
            const noteDate = note.createdAt?.toDate ? note.createdAt.toDate().toLocaleString('pt-BR') : 'Data N/A';
            noteEl.innerHTML = `<p class="text-sm text-gray-800">${note.text}</p><p class="text-xs text-gray-500 text-right">${note.author || 'User'} - ${noteDate}</p>`;
            notesListEl.appendChild(noteEl);
        });
        notesListEl.scrollTop = notesListEl.scrollHeight; // Scroll to bottom
    }, (error) => {
        console.error("Erro ao carregar notas:", error);
        notesListEl.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar notas.</p>';
        showToast(`Erro notas: ${error.code === 'permission-denied' ? 'Permissões.' : 'Tente recarregar.'}`, "error");
    });
}

// --- Demandas Filters ---
demandaFilterStatus?.addEventListener('change', renderDemandas); demandaFilterLeader?.addEventListener('change', renderDemandas);
demandaClearFiltersBtn?.addEventListener('click', () => { demandaFilterStatus.value=''; demandaFilterLeader.value=''; renderDemandas(); });

// --- Reports ---
generateReportBtn?.addEventListener('click', generatePrintReport);
function generatePrintReport() { /* ... same as before ... */ const fC = getFilteredCidadaos(); if (fC.length === 0) { showToast("Nenhum cidadão para relatório.", "warning"); return; } let html = `<!DOCTYPE html>...[report HTML]...</html>`; const win = window.open('','_blank'); if(win){ win.document.write(html); win.document.close(); setTimeout(()=>{win.focus();win.print();},500); } else showToast("Pop-up bloqueado.", "error"); }


// --- Maps --- (remain the same)
function initMap() { if (map) return; try { map = L.map(mapElement).setView([-15.7801,-47.9292],4); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19, attribution:'© OSM' }).addTo(map); } catch (e) { console.error("Map init error:", e); showToast("Erro mapa.", "error"); mapElement.innerHTML='<p class="text-red-500 p-4">Erro ao carregar mapa.</p>'; } }
async function openMapModal(cidadaosToShow = null) { const plotList = cidadaosToShow || getFilteredCidadaos(); if(plotList.length === 0){showToast("Nenhum cidadão para mostrar no mapa.","warning"); return;} mapModal?.classList.remove('hidden'); initMap(); if(!map){closeMapModal();return;} requestAnimationFrame(()=>{ map.invalidateSize(); markers.forEach(m=>map.removeLayer(m)); markers=[]; const plotData = plotList.map(c=>({name:c.name, address:[c.logradouro,c.numero,c.bairro,c.cidade,c.estado,c.cep].filter(Boolean).join(', '), photoUrl:c.photoUrl})).filter(c=>c.address); if(plotData.length > 0) geocodeAndAddMarkers(plotData); else showToast("Nenhum endereço válido encontrado.", "warning"); }); }
async function geocodeAndAddMarkers(cidadaos) { if(!map)return; const bounds=L.latLngBounds(); let added=0; const promises = cidadaos.map(async(c, index)=>{ if(!c.address) return null; const query=encodeURIComponent(c.address+", Brasil"); const url=`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&email=your-app-email@example.com`; // Add your email for Nominatim policy try { await new Promise(r=>setTimeout(r, index * 1100)); // Stagger requests slightly const res = await fetch(url,{headers:{'Accept':'application/json'}}); if(!res.ok){ if(res.status===429) console.warn(`Rate limited: ${c.address}`); else console.error(`Nominatim error ${res.status}: ${c.address}`); return null; } const data = await res.json(); if(data&&data.length>0){ const r=data[0]; const lat=parseFloat(r.lat); const lon=parseFloat(r.lon); let iH=`<div class="map-marker-content bg-white border rounded-full shadow flex items-center justify-center font-bold" style="width:30px;height:30px;font-size:14px;overflow:hidden;">`; const i=getInitials(c.name); if(c.photoUrl) iH+=`<img src="${c.photoUrl}" alt="${c.name}" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.parentElement.innerHTML='${i}';this.parentElement.classList.add('bg-slate-200','text-slate-500');">`; else {iH+=i; iH=iH.replace('class="map-marker-content','class="map-marker-content bg-slate-200 text-slate-500');} iH+=`</div>`; const icon=L.divIcon({className:'',html:iH,iconSize:[30,30],iconAnchor:[15,30],popupAnchor:[0,-30]}); const marker=L.marker([lat,lon],{icon}).addTo(map); marker.bindPopup(`<b>${c.name}</b><br>${r.display_name}`); markers.push(marker); bounds.extend([lat,lon]); added++; } else console.warn("No geocode result:", c.address); return null; } catch(e){ console.error("Geocode error:", c.address, e); return null; } }); await Promise.all(promises); if(added>0) map.fitBounds(bounds,{padding:[50,50]}); else if(cidadaos.length>0) showToast("Endereços não localizados.", "warning"); }
function closeMapModal() { mapModal?.classList.add('hidden'); }
viewMapBtn?.addEventListener('click', () => openMapModal()); // Pass no args to plot filtered list
closeMapBtn?.addEventListener('click', closeMapModal); mapModal?.addEventListener('click', (e) => { if (e.target === mapModal) closeMapModal(); });
function shareLocation(c) { const addr=[c.logradouro,c.numero,c.bairro,c.cidade,c.estado,c.cep].filter(Boolean).join(', '); if(!addr){showToast("Sem endereço.","warning");return;} const url=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`; const txt=`Localização de ${c.name}: ${url}`; if(navigator.share) navigator.share({title:`Localização ${c.name}`, text:`Localização de ${c.name}.`, url}).catch((e)=>{copyToClipboard(txt);}); else copyToClipboard(txt); }
function copyToClipboard(text) { const ta=document.createElement("textarea"); ta.value=text; document.body.appendChild(ta); ta.select(); try {const ok=document.execCommand('copy'); showToast(ok?'Copiado!':'Falha.', ok?'success':'error');} catch(e){showToast('Erro ao copiar.','error');} document.body.removeChild(ta); }


// --- Dashboard --- (remain the same)
function renderDashboard() { if (!currentUserId || !allCidadaos || !allDemandas) return; document.getElementById('dashboard-total-cidadaos').textContent = allCidadaos.length; document.getElementById('dashboard-total-demandas').textContent = allDemandas.length; renderCidadaosPorTipoChart(); renderDemandasPorStatusChart(); renderCidadaosPorBairroChart(); renderCidadaosPorSexoChart(); renderCidadaosPorFaixaEtariaChart(); renderAniversariantes(); renderDemandasRecentes(); }
function renderCidadaosPorTipoChart() { /*...*/ }
function renderDemandasPorStatusChart() { /*...*/ }
function renderCidadaosPorBairroChart() { /*...*/ }
function renderCidadaosPorSexoChart() { /*...*/ }
function renderCidadaosPorFaixaEtariaChart() { /*...*/ }
function renderAniversariantes() { /*...*/ }
function renderDemandasRecentes() { /*...*/ }
function handleRecentDemandaClick(e) { /*...*/ }

// --- Inicialização ---
// O listener onAuthStateChanged já chama loadInitialData após o login bem-sucedido.