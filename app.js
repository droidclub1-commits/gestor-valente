// 1. Importar as bibliotecas do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc,
    deleteDoc, onSnapshot, query, where, Timestamp, writeBatch, setDoc, orderBy // Added orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
    getStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// 2. Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC5XTEAfbKkN4x6iw1dZPWHvtcNC_a_eVw",
  authDomain: "gestor-valente-crm.firebaseapp.com",
  projectId: "gestor-valente-crm",
  storageBucket: "gestor-valente-crm.appspot.com",
  messagingSenderId: "1015920298445",
  appId: "1:1015920298445:web:38f28f0802756c250d9c84"
};

// 3. Inicialização dos Serviços
let app, auth, db, storage;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log("Firebase inicializado com sucesso.");
} catch (error) {
    console.error("Erro CRÍTICO ao inicializar o Firebase:", error);
    const toastContainer = document.getElementById('toast-container');
    if (typeof showToast === 'function') {
      showToast("Erro crítico ao conectar. Verifique a configuração e a rede.", "error");
    } else if(toastContainer) {
        toastContainer.innerHTML = `<div class="p-4 rounded-lg shadow-md text-white bg-red-500">Erro crítico ao conectar. Verifique a configuração e a rede.</div>`;
    } else {
        alert("Erro crítico ao conectar ao Firebase. Verifique a configuração.");
    }
}

// 4. Variáveis Globais da Aplicação
let allCidadaos = [], allDemandas = [], allLeaders = [];
let currentEditingId = null; // Para editar cidadão
let currentDemandaId = null; // Para detalhes/editar demanda
let cidadaosListener = null;
let demandasListener = null;
let notesListener = null;
let itemToDelete = { id: null, type: null };
let currentUser = null; // Declarada globalmente
let currentUserId = null; // Declarada globalmente

// Map and Chart Variables
let map = null, markers = [], cidadaosChart = null, demandasChart = null, cidadaosBairroChart = null, cidadaosSexoChart = null, cidadaosFaixaEtariaChart = null;


// --- Funções Utilitárias ---
function showToast(message, type = 'info') { const container = document.getElementById('toast-container'); const toast = document.createElement('div'); let bgColor, icon; switch(type){ case 'success': bgColor = 'bg-green-500'; icon = '✓'; break; case 'error': bgColor = 'bg-red-500'; icon = '✖'; break; case 'warning': bgColor = 'bg-yellow-400 text-black'; icon = '!'; break; default: bgColor = 'bg-blue-500'; icon = 'ℹ'; break; } toast.className = `p-4 rounded-lg shadow-lg flex items-center gap-3 ${bgColor} text-white mb-2 transform translate-x-full opacity-0 transition-all duration-300 ease-out`; toast.innerHTML = `<span class="font-bold text-lg">${icon}</span> <span>${message}</span>`; container.prepend(toast); setTimeout(() => toast.classList.remove('translate-x-full', 'opacity-0'), 10); setTimeout(() => { toast.classList.add('opacity-0'); setTimeout(() => toast.remove(), 300); }, 3000); }
function formatCPF(cpf) { if (!cpf) return ''; cpf = cpf.replace(/\D/g, '').slice(0, 11); cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2'); cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2'); cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); return cpf; }
function formatPhone(phone) { if (!phone) return ''; phone = phone.replace(/\D/g, '').slice(0, 11); if (phone.length === 11) phone = phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'); else if (phone.length === 10) phone = phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3'); else if (phone.length === 9) phone = phone.replace(/(\d{5})(\d{4})/, '$1-$2'); else if (phone.length === 8) phone = phone.replace(/(\d{4})(\d{4})/, '$1-$2'); return phone; }
function formatCEP(cep) { if (!cep) return ''; cep = cep.replace(/\D/g, '').slice(0, 8); cep = cep.replace(/^(\d{5})(\d)/, '$1-$2'); return cep; }
function formatVoterID(voterId) { if (!voterId) return ''; voterId = voterId.replace(/\D/g, '').slice(0, 12); if (voterId.length === 12) voterId = voterId.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3'); return voterId; }
function getInitials(name) { if (!name) return '?'; const parts = name.trim().split(' '); if (parts.length > 1 && parts[parts.length - 1]) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase(); if (name[0]) return (name[0]).toUpperCase(); return '?'; }
function getStatusInfo(status) { switch (status) { case 'pending': return { text: 'Pendente', classes: 'text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800', color: '#F59E0B' }; case 'inprogress': return { text: 'Em Andamento', classes: 'text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800', color: '#3B82F6' }; case 'completed': return { text: 'Concluída', classes: 'text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800', color: '#10B981' }; default: return { text: 'N/A', classes: 'text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-800', color: '#6B7280' }; } }
function formatarData(dateString) { if (!dateString) return 'N/A'; try { const [year, month, day] = dateString.split('-'); if (!year || !month || !day) return dateString; return `${day}/${month}/${year}`; } catch (e) { return dateString; } }
function getFaixaEtaria(dob) { if (!dob) return 'N/A'; try { const birthDate = new Date(dob + "T00:00:00Z"); if (isNaN(birthDate.getTime())) return 'N/A'; const today = new Date(); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getUTCDate())) age--; if (age < 0) return 'N/A'; if (age <= 17) return '0-17'; if (age <= 25) return '18-25'; if (age <= 35) return '26-35'; if (age <= 50) return '36-50'; if (age <= 65) return '51-65'; return '66+'; } catch (e) { return 'N/A'; } }


// 5. Função Principal (Setup)
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements Cache
    const loginPage = document.getElementById('login-page');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('email-address');
    const passwordInput = document.getElementById('password');
    const logoutBtn = document.getElementById('logout-btn');
    const sidebarNav = document.getElementById('sidebar-nav');
    const logoBtn = document.getElementById('logo-btn');
    const addCidadaoBtn = document.getElementById('add-cidadao-btn');
    const addDemandaGeralBtn = document.getElementById('add-demanda-geral-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const saveBtn = document.getElementById('save-btn');
    const closeDetailsModalBtn = document.getElementById('close-details-modal-btn');
    const closeDemandaModalBtn = document.getElementById('close-demanda-modal-btn');
    const cancelDemandaBtn = document.getElementById('cancel-demanda-btn');
    const closeDemandaDetailsBtn = document.getElementById('close-demanda-details-btn');
    const closeMapBtn = document.getElementById('close-map-btn');
    const cidadaoModal = document.getElementById('cidadao-modal');
    const modalContent = document.getElementById('modal-content');
    const cidadaoDetailsModal = document.getElementById('cidadao-details-modal');
    const demandaModal = document.getElementById('demanda-modal');
    const demandaDetailsModal = document.getElementById('demanda-details-modal');
    const mapModal = document.getElementById('map-modal');
    const confirmationModal = document.getElementById('confirmation-modal');
    const cidadaoForm = document.getElementById('cidadao-form');
    const demandaForm = document.getElementById('demanda-form');
    const addNoteForm = document.getElementById('add-note-form');
    const searchInput = document.getElementById('search-input');
    const filterType = document.getElementById('filter-type');
    const filterBairro = document.getElementById('filter-bairro');
    const filterLeader = document.getElementById('filter-leader');
    const filterSexo = document.getElementById('filter-sexo');
    const filterFaixaEtaria = document.getElementById('filter-faixa-etaria');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const generateReportBtn = document.getElementById('generate-report-btn');
    const viewMapBtn = document.getElementById('view-map-btn');
    const demandaFilterStatus = document.getElementById('demanda-filter-status');
    const demandaFilterLeader = document.getElementById('demanda-filter-leader');
    const demandaClearFiltersBtn = document.getElementById('demanda-clear-filters-btn');
    const cidadaosGrid = document.getElementById('cidadaos-grid');
    const allDemandasList = document.getElementById('all-demandas-list');
    const cidadaoLeaderSelect = document.getElementById('cidadao-leader');
    const demandaCidadaoSelect = document.getElementById('demanda-cidadao-select');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cidadaoName = document.getElementById('cidadao-name');
    const cidadaoEmail = document.getElementById('cidadao-email');
    const cidadaoDob = document.getElementById('cidadao-dob');
    const cidadaoSexo = document.getElementById('cidadao-sexo');
    const cidadaoType = document.getElementById('cidadao-type');
    const cidadaoCPF = document.getElementById('cidadao-cpf');
    const cidadaoRG = document.getElementById('cidadao-rg');
    const cidadaoVoterId = document.getElementById('cidadao-voterid');
    const cidadaoPhone = document.getElementById('cidadao-phone');
    const cidadaoWhatsapp = document.getElementById('cidadao-whatsapp');
    const cidadaoProfissao = document.getElementById('cidadao-profissao');
    const cidadaoLocalTrabalho = document.getElementById('cidadao-local-trabalho');
    const cidadaoCEP = document.getElementById('cidadao-cep');
    const cidadaoLogradouro = document.getElementById('cidadao-logradouro');
    const cidadaoNumero = document.getElementById('cidadao-numero');
    const cidadaoComplemento = document.getElementById('cidadao-complemento');
    const cidadaoBairro = document.getElementById('cidadao-bairro');
    const cidadaoCidade = document.getElementById('cidadao-cidade');
    const cidadaoEstado = document.getElementById('cidadao-estado');
    const cidadaoSons = document.getElementById('cidadao-sons');
    const cidadaoDaughters = document.getElementById('cidadao-daughters');
    const childrenDetailsContainer = document.getElementById('children-details-container');
    const cidadaoPhotoUrl = document.getElementById('cidadao-photo-url');
    const cidadaoPhotoUpload = document.getElementById('cidadao-photo-upload');
    const fileNameDisplay = document.getElementById('file-name-display');

    // Apply masks on input
    cidadaoCPF?.addEventListener('input', (e) => { e.target.value = formatCPF(e.target.value); });
    cidadaoPhone?.addEventListener('input', (e) => { e.target.value = formatPhone(e.target.value); });
    cidadaoCEP?.addEventListener('input', (e) => { e.target.value = formatCEP(e.target.value); });
    cidadaoVoterId?.addEventListener('input', (e) => { e.target.value = formatVoterID(e.target.value); });


    // --- LÓGICA DE LOGIN ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // [CORREÇÃO AQUI] Atribuir variáveis globais PRIMEIRO
            currentUser = user;
            currentUserId = user.uid;
            console.log("User logged in:", currentUserId);

            // DEPOIS, atualizar UI e inicializar
            loginPage.classList.add('hidden');
            appContainer.style.display = 'flex';
            // Adicionada verificação extra
            if (currentUserId && !appInitialized) {
                 initializeMainApp(); // Initialize only once AFTER userId is confirmed
            } else if (!currentUserId) {
                console.error("onAuthStateChanged: User object exists but currentUserId is still null!");
            }
        } else {
            // [CORREÇÃO AQUI] Limpar variáveis globais PRIMEIRO
            currentUser = null;
            currentUserId = null;
            console.log("User logged out");

            // DEPOIS, atualizar UI e limpar dados
            loginPage.classList.remove('hidden');
            appContainer.style.display = 'none';
            appInitialized = false; // Reset flag on logout
            // Clear listeners and data on logout
            if (cidadaosListener) cidadaosListener();
            if (demandasListener) demandasListener();
            if (notesListener) notesListener();
            cidadaosListener = null; demandasListener = null; notesListener = null;
            allCidadaos = []; allDemandas = []; allLeaders = [];
            clearData(); // Clear UI elements too
        }
    });

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value; const password = passwordInput.value;
        loginBtn.disabled = true; loginBtn.innerHTML = 'Aguarde...';
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged handles UI change
        } catch (error) {
            console.error("Erro no login:", error.code, error.message);
            showToast("Email ou palavra-passe inválidos.", "error");
            loginBtn.disabled = false; loginBtn.innerHTML = 'Entrar';
        }
    });

    // --- FIM DA LÓGICA DE LOGIN ---

    let appInitialized = false;

    function initializeMainApp() {
        if (appInitialized) return;

        // Double-check user ID before setting up listeners and UI
        if (!currentUserId) {
            console.error("InitializeMainApp called without currentUserId! Aborting initialization.");
             // Optionally redirect to login or show error
             showLoginPage(); // Go back to login if user ID is missing
            return;
        }

        appInitialized = true; // Set flag only after check passes
        console.log("Initializing Main App for user:", currentUserId);


        // Add Listeners only after initialization
        logoBtn?.addEventListener('click', (e) => { e.preventDefault(); switchPage('dashboard-page'); });
        logoutBtn?.addEventListener('click', async () => { try { await signOut(auth); /* appInitialized = false; handled by onAuthStateChanged */ } catch (e) { console.error("Logout error:", e); showToast("Erro ao sair.", "error"); } });
        sidebarNav?.addEventListener('click', (e) => { const link = e.target.closest('a.nav-link'); if (link) { e.preventDefault(); const page = link.getAttribute('href').substring(1); if (page === 'mapa') openMapModal(); else switchPage(page + '-page'); } });
        addCidadaoBtn?.addEventListener('click', () => openCidadaoModal());
        addDemandaGeralBtn?.addEventListener('click', () => openDemandaModal());
        viewMapBtn?.addEventListener('click', () => openMapModal()); // Map button on Cidadaos page

        // Modal Close Buttons
        closeModalBtn?.addEventListener('click', closeCidadaoModal);
        cancelBtn?.addEventListener('click', closeCidadaoModal);
        closeDetailsModalBtn?.addEventListener('click', closeDetailsModal);
        closeDemandaModalBtn?.addEventListener('click', closeDemandaModal);
        cancelDemandaBtn?.addEventListener('click', closeDemandaModal);
        closeDemandaDetailsBtn?.addEventListener('click', closeDemandaDetailsModal);
        closeMapBtn?.addEventListener('click', closeMapModal);

        // Modal Background Clicks
        cidadaoModal?.addEventListener('click', (e) => { if (e.target === cidadaoModal) closeCidadaoModal(); });
        cidadaoDetailsModal?.addEventListener('click', (e) => { if (e.target === cidadaoDetailsModal) closeDetailsModal(); });
        demandaModal?.addEventListener('click', (e) => { if (e.target === demandaModal) closeDemandaModal(); });
        demandaDetailsModal?.addEventListener('click', (e) => { if (e.target === demandaDetailsModal) closeDemandaDetailsModal(); });
        mapModal?.addEventListener('click', (e) => { if (e.target === mapModal) closeMapModal(); });
        confirmationModal?.addEventListener('click', (e) => { if (e.target === confirmationModal) closeConfirmationModal(); });


        // Form Submissions
        cidadaoForm?.addEventListener('submit', handleCidadaoFormSubmit);
        demandaForm?.addEventListener('submit', handleDemandaFormSubmit);
        addNoteForm?.addEventListener('submit', handleAddNoteSubmit);

        // Filters and Search
        searchInput?.addEventListener('input', () => renderCidadaos());
        filterType?.addEventListener('change', () => renderCidadaos());
        filterBairro?.addEventListener('change', () => renderCidadaos());
        filterLeader?.addEventListener('change', () => renderCidadaos());
        filterSexo?.addEventListener('change', () => renderCidadaos());
        filterFaixaEtaria?.addEventListener('change', () => renderCidadaos());
        clearFiltersBtn?.addEventListener('click', clearCidadaoFilters);

        demandaFilterStatus?.addEventListener('change', () => renderAllDemandas());
        demandaFilterLeader?.addEventListener('change', () => renderAllDemandas());
        demandaClearFiltersBtn?.addEventListener('click', clearDemandaFilters);

        // Report
        generateReportBtn?.addEventListener('click', generatePrintReport);

        // Confirmation Modal Buttons
        cancelDeleteBtn?.addEventListener('click', closeConfirmationModal);
        confirmDeleteBtn?.addEventListener('click', handleDeleteConfirmation);

        // CEP Blur
        cidadaoCEP?.addEventListener('blur', handleCEPBlur);

        // Photo Upload
        cidadaoPhotoUpload?.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { fileNameDisplay.textContent = file.name; cidadaoPhotoUrl.value = ''; } else { fileNameDisplay.textContent = 'Nenhum ficheiro'; } });

        // Children Inputs
        cidadaoSons?.addEventListener('input', () => updateChildrenInputs('filho'));
        cidadaoDaughters?.addEventListener('input', () => updateChildrenInputs('filha'));

        // Initialize Firestore Listeners
        setupFirestoreListeners();

        // Set Initial Page
        switchPage('dashboard-page');
    }

    // --- Firestore Listeners Setup ---
    function setupFirestoreListeners() {
        if (!currentUserId) { console.warn("Cannot setup listeners: No user ID."); return; }

        // Listener for Cidadaos (Root collection)
        const cidadaosRef = collection(db, 'cidadaos');
        // Adiciona filtro pelo ownerId SE este campo existir nos seus documentos 'cidadaos'
        const qCidadaos = query(cidadaosRef, where("ownerId", "==", currentUserId));
        console.log("Setting up Firestore listener for:", 'cidadaos', "with ownerId:", currentUserId);
        if (cidadaosListener) cidadaosListener();
        cidadaosListener = onSnapshot(qCidadaos, (snapshot) => {
            allCidadaos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allLeaders = allCidadaos.filter(c => c.type === 'Liderança').sort((a, b) => a.name.localeCompare(b.name));
            console.log("Firestore: Cidadaos updated - ", allCidadaos.length);
            updateLeaderSelects(); updateBairroFilter();
            const currentPageId = document.querySelector('.page:not(.hidden)')?.id?.replace('-page', '');
            if (currentPageId === 'cidadaos') renderCidadaos();
            if (currentPageId === 'dashboard') updateDashboard();
            if (currentPageId === 'demandas') populateDemandaFilters();
        }, (error) => { console.error("Firestore Error (Cidadaos):", error); showToast("Erro ao carregar cidadãos.", "error"); });

        // Listener for Demandas (Root collection)
        const demandasRef = collection(db, 'demandas');
        // Adiciona filtro pelo ownerId SE este campo existir nos seus documentos 'demandas'
        const qDemandas = query(demandasRef, where("ownerId", "==", currentUserId), orderBy("createdAt", "desc"));
        console.log("Setting up Firestore listener for:", 'demandas', "with ownerId:", currentUserId);
        if (demandasListener) demandasListener();
        demandasListener = onSnapshot(qDemandas, (snapshot) => {
            allDemandas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Firestore: Demandas updated - ", allDemandas.length);
            const currentPageId = document.querySelector('.page:not(.hidden)')?.id?.replace('-page', '');
            if (currentPageId === 'demandas') renderAllDemandas();
            if (currentPageId === 'dashboard') updateDashboard();
        }, (error) => { console.error("Firestore Error (Demandas):", error); showToast("Erro ao carregar demandas.", "error"); });
    }

    // Clear data and UI elements
    function clearData() {
        console.log("Clearing data."); allCidadaos = []; allDemandas = []; allLeaders = [];
        if(cidadaosGrid) cidadaosGrid.innerHTML = '';
        if(allDemandasList) allDemandasList.innerHTML = '';
        // Reset filters
        [filterType, filterBairro, filterLeader, filterSexo, filterFaixaEtaria, searchInput, demandaFilterStatus, demandaFilterLeader].forEach(el => { if(el) el.value = ''; });
        updateLeaderSelects(); updateBairroFilter(); populateDemandaFilters(); // Clear dropdowns too
        // Clear dashboard
        const totalCidadaosEl = document.getElementById('dashboard-total-cidadaos');
        const totalDemandasEl = document.getElementById('dashboard-total-demandas');
        const anivListEl = document.getElementById('aniversariantes-list');
        const demRecEl = document.getElementById('demandas-recentes-list');
        if(totalCidadaosEl) totalCidadaosEl.textContent = '0';
        if(totalDemandasEl) totalDemandasEl.textContent = '0';
        if(anivListEl) anivListEl.innerHTML = '';
        if(demRecEl) demRecEl.innerHTML = '';
        // Destroy charts
        [cidadaosChart, demandasChart, cidadaosBairroChart, cidadaosSexoChart, cidadaosFaixaEtariaChart].forEach(chart => chart?.destroy());
        cidadaosChart = demandasChart = cidadaosBairroChart = cidadaosSexoChart = cidadaosFaixaEtariaChart = null;
    }

    // --- Get Filtered Data ---
    function getFilteredCidadaos() {
        const searchTerm = searchInput?.value.toLowerCase() || '';
        const type = filterType?.value;
        const bairro = filterBairro?.value;
        const leader = filterLeader?.value; // Leader name
        const sexo = filterSexo?.value;
        const faixaEtaria = filterFaixaEtaria?.value;

        return allCidadaos.filter(c => { // Already filtered by ownerId in listener
            const nameMatch = (c.name || '').toLowerCase().includes(searchTerm);
            const emailMatch = (c.email || '').toLowerCase().includes(searchTerm);
            const cpfDigits = searchTerm.replace(/\D/g,'');
            const cpfMatch = cpfDigits && (c.cpf || '').includes(cpfDigits);
            const searchMatch = !searchTerm || nameMatch || emailMatch || cpfMatch;

            const typeMatch = !type || c.type === type;
            const bairroMatch = !bairro || c.bairro === bairro;
            const leaderMatch = !leader || c.leader === leader; // Match by name
            const sexoMatch = !sexo || (c.sexo || 'Não Informar') === sexo;
            const ageMatch = !faixaEtaria || getFaixaEtaria(c.dob) === faixaEtaria;

            return searchMatch && typeMatch && bairroMatch && leaderMatch && sexoMatch && ageMatch;
        });
    }

    // --- Render Cidadaos Grid ---
    function renderCidadaos() {
        if (!currentUserId) return; // Add check here
        const cidadaosGrid = document.getElementById('cidadaos-grid');
        if (!cidadaosGrid) return;
        const filteredCidadaos = getFilteredCidadaos();
        cidadaosGrid.innerHTML = '';
        if (filteredCidadaos.length === 0) { cidadaosGrid.innerHTML = '<p class="text-gray-500 col-span-full text-center py-10">Nenhum cidadão encontrado.</p>'; return; }
        // Sorting removed, data comes sorted from listener if orderBy is used
        // filteredCidadaos.sort((a, b) => a.name.localeCompare(b.name));
        filteredCidadaos.forEach(cidadao => {
            const card = document.createElement('div');
            card.className = 'bg-white p-5 rounded-lg shadow-md flex flex-col transition-shadow hover:shadow-lg';
            const initials = getInitials(cidadao.name);
            const photoUrl = cidadao.photoUrl;
            card.innerHTML = `
                <div class="flex items-center gap-4 mb-4">
                    ${photoUrl ?
                        `<img src="${photoUrl}" alt="${cidadao.name}" class="w-16 h-16 rounded-full object-cover bg-gray-200" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold\\'>${initials}</div>';">` :
                        `<div class="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold">${initials}</div>`
                    }
                    <div class="flex-1 min-w-0">
                        <h3 class="text-lg font-bold text-gray-800 truncate" title="${cidadao.name}">${cidadao.name}</h3>
                        <p class="text-sm text-gray-600">${cidadao.type || 'N/A'}</p>
                    </div>
                </div>
                <div class="space-y-1 text-sm text-gray-700 mb-4 flex-1">
                    <p class="flex items-center gap-2 truncate"><svg class="flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span class="truncate" title="${cidadao.email}">${cidadao.email || '-'}</span></p>
                    <p class="flex items-center gap-2"><svg class="flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${cidadao.phone ? formatPhone(cidadao.phone) : '-'} ${cidadao.whatsapp ? '<span class="text-green-600 font-bold">(W)</span>' : ''}</p>
                    <p class="flex items-center gap-2 truncate"><svg class="flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span class="truncate" title="${cidadao.bairro}">${cidadao.bairro || '-'}</span></p>
                    ${cidadao.leader ? `<p class="text-xs text-gray-500 mt-1 truncate" title="Líder: ${cidadao.leader}"><em>Líder: ${cidadao.leader}</em></p>` : ''}
                </div>
                <div class="border-t pt-3 flex gap-1 justify-end flex-wrap">
                    <button class="btn-view-details text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-2 rounded" data-id="${cidadao.id}">Detalhes</button>
                    <button class="btn-edit text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 px-2 rounded" data-id="${cidadao.id}">Editar</button>
                    <button class="btn-add-demanda text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 py-1 px-2 rounded" data-id="${cidadao.id}">Demanda</button>
                    <button class="btn-delete text-xs bg-red-100 hover:bg-red-200 text-red-700 py-1 px-2 rounded" data-id="${cidadao.id}" data-name="${cidadao.name}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </div>
            `;
            // Add events
            card.querySelector('.btn-view-details')?.addEventListener('click', () => openDetailsModal(cidadao.id));
            card.querySelector('.btn-edit')?.addEventListener('click', () => openCidadaoModal(cidadao.id));
            card.querySelector('.btn-add-demanda')?.addEventListener('click', () => openDemandaModal(cidadao.id));
            card.querySelector('.btn-delete')?.addEventListener('click', () => requestDelete(cidadao.id, 'cidadao', cidadao.name));
            cidadaosGrid.appendChild(card);
        });
    }

    // --- Render Demandas List ---
    function renderAllDemandas() {
        if (!currentUserId) return; // Add check here
        const allDemandasList = document.getElementById('all-demandas-list');
        if (!allDemandasList) return;
        const statusFilter = demandaFilterStatus?.value;
        const leaderFilter = demandaFilterLeader?.value; // Filter by name
        const filteredDemandas = allDemandas.filter(demanda => { // Already filtered by ownerId in listener
            const statusMatch = !statusFilter || demanda.status === statusFilter;
            const solicitante = allCidadaos.find(c => c.id === demanda.cidadaoId); // Find within already filtered allCidadaos
            const leaderMatch = !leaderFilter || (solicitante && solicitante.leader === leaderFilter);
            return statusMatch && leaderMatch;
        });
        allDemandasList.innerHTML = '';
        if (filteredDemandas.length === 0) { allDemandasList.innerHTML = '<p class="text-gray-500 text-center py-10">Nenhuma demanda encontrada.</p>'; return; }
        // Data comes sorted from listener
        // filteredDemandas.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        filteredDemandas.forEach(demanda => {
            const solicitante = allCidadaos.find(c => c.id === demanda.cidadaoId);
            const statusInfo = getStatusInfo(demanda.status);
            const item = document.createElement('div');
            item.className = 'bg-white p-4 rounded-lg shadow-sm border flex justify-between items-start cursor-pointer hover:shadow-md demanda-card';
            item.dataset.id = demanda.id;
            item.innerHTML = `
                <div class="flex-1 min-w-0">
                    <h3 class="text-lg font-semibold text-gray-800 truncate" title="${demanda.title}">${demanda.title}</h3>
                    <p class="text-sm text-gray-600"> Solicitante: <span class="font-medium text-blue-600">${solicitante ? solicitante.name : 'Desconhecido'}</span> </p>
                    <p class="text-xs text-gray-500"> Data: ${demanda.createdAt ? demanda.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'} ${solicitante && solicitante.leader ? ` | Líder: ${solicitante.leader}` : ''} </p>
                </div>
                <div class="flex-shrink-0 ml-4"> <span class="${statusInfo.classes}">${statusInfo.text}</span> </div>
            `;
            allDemandasList.appendChild(item);
        });
        allDemandasList.removeEventListener('click', handleDemandaListClick);
        allDemandasList.addEventListener('click', handleDemandaListClick);
    }
    function handleDemandaListClick(e) { const card = e.target.closest('.demanda-card'); if (card?.dataset.id) openDemandaDetailsModal(card.dataset.id); }

    // --- Update Selects ---
    function updateLeaderSelects() {
        const selects = [cidadaoLeaderSelect, filterLeader, demandaFilterLeader];
        selects.forEach(select => { if (!select) return; const currentVal = select.value; select.innerHTML = `<option value="">${select.id === 'cidadao-leader' ? 'Nenhuma' : 'Filtrar Liderança'}</option>`; allLeaders.forEach(l => { const opt = document.createElement('option'); opt.value = l.name; opt.textContent = l.name; select.appendChild(opt); }); if (allLeaders.some(l => l.name === currentVal)) select.value = currentVal; });
    }
    function updateBairroFilter() {
        if (!filterBairro) return; const currentVal = filterBairro.value; const bairros = [...new Set(allCidadaos.map(c => c.bairro).filter(Boolean))].sort(); filterBairro.innerHTML = '<option value="">Filtrar Bairro</option>'; bairros.forEach(b => { const opt = document.createElement('option'); opt.value = b; opt.textContent = b; filterBairro.appendChild(opt); }); if (bairros.includes(currentVal)) filterBairro.value = currentVal;
    }
    function populateDemandaFilters() { // Specific for demanda page leader filter
        if (!demandaFilterLeader) return; const currentVal = demandaFilterLeader.value; demandaFilterLeader.innerHTML = '<option value="">Filtrar Liderança</option>'; allLeaders.forEach(l => { const opt = document.createElement('option'); opt.value = l.name; opt.textContent = l.name; demandaFilterLeader.appendChild(opt); }); if (allLeaders.some(l => l.name === currentVal)) demandaFilterLeader.value = currentVal;
    }

    // --- Clear Filters ---
    function clearCidadaoFilters() { searchInput.value = ''; filterType.value = ''; filterBairro.value = ''; filterLeader.value = ''; filterSexo.value = ''; filterFaixaEtaria.value = ''; renderCidadaos(); }
    function clearDemandaFilters() { demandaFilterStatus.value = ''; demandaFilterLeader.value = ''; renderAllDemandas(); }

    // --- Dashboard ---
    function updateDashboard() {
        if(!currentUserId || !document.getElementById('dashboard-page') || document.getElementById('dashboard-page').classList.contains('hidden')) return; // Add check here
        console.log("Updating dashboard UI...");
        document.getElementById('dashboard-total-cidadaos').textContent = allCidadaos.length; document.getElementById('dashboard-total-demandas').textContent = allDemandas.length; updateAniversariantes(); updateDemandasRecentes(); updateCidadaosPorTipoChart(); updateDemandasPorStatusChart(); updateCidadaosPorBairroChart(); updateCidadaosPorSexoChart(); updateCidadaosPorFaixaEtariaChart();
     }
    function updateAniversariantes() { const listEl = document.getElementById('aniversariantes-list'); if (!listEl) return; const currentMonth = new Date().getMonth(); const aniversariantes = allCidadaos.filter(c => { if (!c.dob) return false; try { const dobDate = new Date(c.dob + "T00:00:00Z"); return !isNaN(dobDate.getTime()) && dobDate.getUTCMonth() === currentMonth; } catch (e) { return false;} }).sort((a, b) => new Date(a.dob + "T00:00:00Z").getUTCDate() - new Date(b.dob + "T00:00:00Z").getUTCDate()); listEl.innerHTML = ''; if (aniversariantes.length === 0) { listEl.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhum aniversariante este mês.</p>'; return; } aniversariantes.forEach(c => { const dia = c.dob ? new Date(c.dob + "T00:00:00Z").getUTCDate().toString().padStart(2, '0') : '--'; listEl.innerHTML += `<div class="flex items-center justify-between p-1 border-b last:border-0"><span class="text-sm text-gray-700">${c.name}</span><span class="font-bold text-blue-600 text-sm">${dia}</span></div>`; }); }
    function updateDemandasRecentes() { const listEl = document.getElementById('demandas-recentes-list'); if (!listEl) return; const recentes = allDemandas.slice(0, 5); listEl.innerHTML = ''; if (recentes.length === 0) { listEl.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhuma demanda recente.</p>'; return; } recentes.forEach(d => { const solicitante = allCidadaos.find(c => c.id === d.cidadaoId); const statusInfo = getStatusInfo(d.status); const item = document.createElement('div'); item.className = 'p-2 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 demanda-recente-item'; item.dataset.id = d.id; item.innerHTML = `<div class="flex justify-between items-center mb-1"><span class="font-semibold text-sm text-gray-800 truncate" title="${d.title}">${d.title}</span><span class="${statusInfo.classes} !py-0.5 !px-2">${statusInfo.text}</span></div><p class="text-xs text-gray-600">${solicitante ? solicitante.name : 'Desconhecido'} - ${d.createdAt ? d.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}</p>`; listEl.appendChild(item); }); listEl.removeEventListener('click', handleRecentDemandaClick); listEl.addEventListener('click', handleRecentDemandaClick); }
    function handleRecentDemandaClick(e) { const item = e.target.closest('.demanda-recente-item'); if (item?.dataset.id) openDemandaDetailsModal(item.dataset.id); }

    // --- Chart Functions ---
    function updateCidadaosPorTipoChart() { const ctx = document.getElementById('cidadaos-por-tipo-chart')?.getContext('2d'); if(!ctx) return; const data = allCidadaos.reduce((a,c)=>{const t=c.type||'N/D';a[t]=(a[t]||0)+1;return a},{}); const labels=Object.keys(data); const values=Object.values(data); if(cidadaosChart)cidadaosChart.destroy(); cidadaosChart=new Chart(ctx,{type:'pie',data:{labels,datasets:[{data:values,backgroundColor:['#3B82F6','#8B5CF6','#10B981','#F59E0B','#6B7280'].slice(0,labels.length)}] },options:{responsive:true,maintainAspectRatio:false, plugins: { legend: { position: 'right' }}}}); }
    function updateDemandasPorStatusChart() { const ctx = document.getElementById('demandas-por-status-chart')?.getContext('2d'); if(!ctx) return; const data = allDemandas.reduce((a,d)=>{a[d.status]=(a[d.status]||0)+1;return a;},{pending:0,inprogress:0,completed:0}); const labels=Object.keys(data).map(s=>getStatusInfo(s).text); const values=Object.values(data); const colors=Object.keys(data).map(s=>getStatusInfo(s).color); if(demandasChart)demandasChart.destroy(); demandasChart=new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data:values,backgroundColor:colors}]},options:{responsive:true,maintainAspectRatio:false, plugins: { legend: { position: 'right' }}}}); }
    function updateCidadaosPorBairroChart() { const ctx = document.getElementById('cidadaos-por-bairro-chart')?.getContext('2d'); if(!ctx) return; const data = allCidadaos.reduce((a,c)=>{const b=c.bairro||'N/I';a[b]=(a[b]||0)+1;return a;},{}); const sorted = Object.entries(data).sort(([,a],[,b])=>b-a).slice(0,10); const labels=sorted.map(([b])=>b); const values=sorted.map(([,c])=>c); if(cidadaosBairroChart)cidadaosBairroChart.destroy(); cidadaosBairroChart=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Cidadãos',data:values,backgroundColor:'#10B981'}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false}}}}); }
    function updateCidadaosPorSexoChart() { const ctx = document.getElementById('cidadaos-por-sexo-chart')?.getContext('2d'); if(!ctx) return; const data = allCidadaos.reduce((a,c)=>{const s=c.sexo||'N/I';a[s]=(a[s]||0)+1;return a;},{'Masculino':0,'Feminino':0,'Outro':0,'Não Informar':0}); const labels=Object.keys(data).filter(k=>data[k]>0); const values=labels.map(l=>data[l]); if(cidadaosSexoChart)cidadaosSexoChart.destroy(); cidadaosSexoChart=new Chart(ctx,{type:'pie',data:{labels,datasets:[{data:values,backgroundColor:['#3B82F6','#EC4899','#F59E0B','#6B7280'].slice(0,labels.length)}]},options:{responsive:true,maintainAspectRatio:false, plugins: { legend: { position: 'right' }}}}); }
    function updateCidadaosPorFaixaEtariaChart() { const ctx = document.getElementById('cidadaos-por-faixa-etaria-chart')?.getContext('2d'); if(!ctx) return; const faixas={'0-17':0,'18-25':0,'26-35':0,'36-50':0,'51-65':0,'66+':0,'N/A':0}; allCidadaos.forEach(c=>{faixas[getFaixaEtaria(c.dob)]++;}); const labels=Object.keys(faixas); const values=Object.values(faixas); if(cidadaosFaixaEtariaChart)cidadaosFaixaEtariaChart.destroy(); cidadaosFaixaEtariaChart=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'Cidadãos',data:values,backgroundColor:'#8B5CF6'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}}); }

    // --- Cidadao Form Logic ---
    async function handleCidadaoFormSubmit(e) {
        e.preventDefault(); if (!currentUserId) { showToast("Faça login.", "error"); return; }
        let isValid = ['cidadao-name', 'cidadao-email'].every(id => { const i=document.getElementById(id); if (i&&!i.value.trim()){ i.classList.add('border-red-500'); return false; } if(i)i.classList.remove('border-red-500'); return true; }); if (!isValid) { showToast('Preencha nome e email.', 'error'); return; }
        saveBtn.disabled = true; saveBtn.innerHTML = 'Salvando...'; let pU = cidadaoPhotoUrl.value.trim(); const file = cidadaoPhotoUpload.files[0];
        try { if (file) { const fP = `photos/${currentUserId}/${Date.now()}_${file.name}`; const sR = ref(storage, fP); const sn = await uploadBytes(sR, file); pU = await getDownloadURL(sn.ref); }
            const children = getChildrenData();
            const data = { name:cidadaoName.value.trim(), email:cidadaoEmail.value.trim().toLowerCase(), dob:cidadaoDob.value||null, sexo:cidadaoSexo.value, profissao:cidadaoProfissao.value.trim(), localTrabalho:cidadaoLocalTrabalho.value.trim(), type:cidadaoType.value, cpf:cidadaoCPF.value.replace(/\D/g,''), rg:cidadaoRG.value.replace(/\D/g,''), voterId:cidadaoVoterId.value.replace(/\D/g,''), phone:cidadaoPhone.value.replace(/\D/g,''), whatsapp:cidadaoWhatsapp.checked, cep:cidadaoCEP.value.replace(/\D/g,''), logradouro:cidadaoLogradouro.value.trim(), numero:cidadaoNumero.value.trim(), complemento:cidadaoComplemento.value.trim(), bairro:cidadaoBairro.value.trim(), cidade:cidadaoCidade.value.trim(), estado:cidadaoEstado.value.trim().toUpperCase(), leader:cidadaoLeaderSelect.value, sons:parseInt(cidadaoSons.value)||0, daughters:parseInt(cidadaoDaughters.value)||0, children, photoUrl:pU||null, updatedAt:Timestamp.now(), ownerId: currentUserId }; const cP = 'cidadaos';
            if (currentEditingId) { data.updatedAt = Timestamp.now(); const dR = doc(db, cP, currentEditingId); await setDoc(dR, data, { merge: true }); showToast('Cidadão atualizado!'); }
            else { data.createdAt = Timestamp.now(); const dR = await addDoc(collection(db, cP), data); showToast('Cidadão adicionado!'); }
            closeCidadaoModal();
        } catch (error) { console.error("Erro:", error); showToast(`Erro: ${error.message}`, 'error'); }
        finally { saveBtn.disabled = false; saveBtn.textContent = 'Salvar'; }
    }
    async function handleCEPBlur(e) {
        const cep = e.target.value.replace(/\D/g, ''); if (cep.length === 8) { try { const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`); if (!response.ok) throw new Error('CEP não encontrado'); const data = await response.json(); if (data.erro) { showToast("CEP não encontrado.", "warning"); } else { cidadaoLogradouro.value = data.logradouro; cidadaoBairro.value = data.bairro; cidadaoCidade.value = data.localidade; cidadaoEstado.value = data.uf; cidadaoNumero.focus(); } } catch (error) { console.error("Erro ao buscar CEP:", error); showToast("Erro ao consultar o CEP.", "error"); } }
     }
    function updateChildrenInputs(type, childrenData = null) {
        const countInput = type === 'filho' ? cidadaoSons : cidadaoDaughters; const count = parseInt(countInput?.value || 0); const containerId = type === 'filho' ? 'sons-inputs' : 'daughters-inputs'; const label = type === 'filho' ? 'Filho' : 'Filha'; let container = document.getElementById(containerId); if (!container && count > 0) { container = document.createElement('div'); container.id = containerId; container.className = 'mt-4 space-y-3 p-4 bg-gray-50 rounded-lg border'; childrenDetailsContainer.appendChild(container); } else if (container && count === 0) { container.remove(); return; } else if (!container && count === 0) return; container.innerHTML = ''; if (count > 0) { container.innerHTML += `<h4 class="font-medium text-gray-700 mb-2">${label}s (${count}):</h4>`; const relevantChildren = (childrenData || []).filter(c => c.type === type).sort((a,b)=> a.index - b.index); for (let i = 0; i < count; i++) { const existingChild = relevantChildren[i]; container.innerHTML += `<div class="grid grid-cols-1 md:grid-cols-2 gap-3 border-t pt-3 first:border-t-0 first:pt-0"><div><label class="block text-xs font-medium text-gray-600">${label} ${i + 1} - Nome</label><input type="text" data-type="${type}" data-index="${i}" data-field="name" class="w-full border border-gray-300 p-2 rounded-lg mt-1 text-sm child-input" value="${existingChild?.name || ''}"></div><div><label class="block text-xs font-medium text-gray-600">${label} ${i + 1} - Data Nasc.</label><input type="date" data-type="${type}" data-index="${i}" data-field="dob" class="w-full border border-gray-300 p-2 rounded-lg mt-1 text-sm child-input" value="${existingChild?.dob || ''}"></div></div>`; } }
     }
    function getChildrenData() {
        const children = []; const inputs = childrenDetailsContainer.querySelectorAll('input[data-type].child-input'); inputs.forEach(input => { const type = input.dataset.type; const index = parseInt(input.dataset.index, 10); const field = input.dataset.field; const value = input.value.trim(); let child = children.find(c => c.type === type && c.index === index); if (!child) { child = { type, index }; children.push(child); } child[field] = value; }); return children.filter(c => c.name);
     }

    // --- Details Modal ---
    function openDetailsModal(cidadaoId) {
        currentEditingId = cidadaoId; // Reuse editing ID for details context
        const cidadao = allCidadaos.find(c => c.id === cidadaoId); if (!cidadao) return;
        const detailsModal = document.getElementById('cidadao-details-modal'); const content = detailsModal?.querySelector('.bg-white');
        detailsModal.querySelectorAll('[id^="details-"]').forEach(el => {
             const keyOriginal = el.id.replace('details-', '');
             const key = keyOriginal.replace('-', ''); // Convert 'local-trabalho' to 'localTrabalho' etc.
             let value = cidadao[key] ?? '-';
             if (key === 'photo') { /* Handle photo */ }
             else if (key === 'phone') value = cidadao.phone ? `${formatPhone(cidadao.phone)} ${cidadao.whatsapp ? '(W)' : ''}` : '-';
             else if (key === 'address') value = [cidadao.logradouro, cidadao.numero, cidadao.complemento, cidadao.bairro, cidadao.cidade, cidadao.estado, cidadao.cep?`CEP: ${formatCEP(cidadao.cep)}`:null].filter(Boolean).join(', ')||'-';
             else if (key === 'cpf') value = cidadao.cpf ? formatCPF(cidadao.cpf) : '-';
             else if (key === 'voterid') value = cidadao.voterId ? formatVoterID(cidadao.voterId) : '-';
             else if (key === 'dob') value = cidadao.dob ? formatarData(cidadao.dob) : '-';
             else if (key === 'leader') { const leader = allLeaders.find(l=>l.name === cidadao.leader); value = leader?.name || cidadao.leader || '-';}
             else if (key === 'children') { /* Handle children */ }
             else if (el.tagName === 'SPAN') el.textContent = value;
        });
        const photoEl = document.getElementById('details-photo'); const initials = getInitials(cidadao.name); photoEl.innerHTML = cidadao.photoUrl ? `<img src="${cidadao.photoUrl}" onerror="this.onerror=null;this.parentElement.innerHTML='${initials}'; this.parentElement.classList.add('bg-slate-200','text-slate-500');" class="w-24 h-24 rounded-full object-cover">` : initials; photoEl.className=`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold overflow-hidden border ${cidadao.photoUrl?'':'bg-slate-200 text-slate-500'}`;
        const childrenEl = document.getElementById('details-children'); childrenEl.innerHTML=''; if(cidadao.children && cidadao.children.length > 0){ childrenEl.innerHTML = `<p class="font-semibold text-gray-500 text-sm mb-1 mt-2">FILHOS (${cidadao.children.length})</p><ul class="list-none space-y-1 text-sm">${cidadao.children.map((c,i)=>`<li><strong>${i+1}. ${c.name||'N/I'}</strong>${c.dob?` (${formatarData(c.dob)})`:''}</li>`).join('')}</ul>`;} else { const sC=cidadao.sons||0; const dC=cidadao.daughters||0; if(sC>0||dC>0) childrenEl.innerHTML=`<p class="text-sm mt-2">Filhos: ${sC}, Filhas: ${dC} (sem detalhes).</p>`; else childrenEl.innerHTML='<p class="text-sm mt-2">Sem filhos.</p>';}
        detailsViewMapBtn.onclick = () => { closeDetailsModal(); openMapModal([cidadao]); }; detailsShareLocationBtn.onclick = () => shareLocation(cidadao);
        detailsModal?.classList.remove('hidden'); setTimeout(() => content?.classList.remove('scale-95', 'opacity-0'), 10);
     }
    function closeDetailsModal() {
        const detailsModal = document.getElementById('cidadao-details-modal'); const content = detailsModal?.querySelector('.bg-white'); content?.classList.add('scale-95', 'opacity-0'); setTimeout(() => { detailsModal?.classList.add('hidden'); }, 300);
     }

    // --- Demanda Form/Modals ---
    function openDemandaModal(cidadaoId = null) {
        currentDemandaId = null; demandaForm.reset(); demandaModalTitle.textContent = "Nova Demanda"; demandaCidadaoSelect.innerHTML = '<option value="" disabled selected>Selecione...</option>'; allCidadaos.sort((a,b)=>a.name.localeCompare(b.name)).forEach(c=>{demandaCidadaoSelect.innerHTML+=`<option value="${c.id}">${c.name}</option>`;}); if(cidadaoId) demandaCidadaoSelect.value = cidadaoId; demandaModal?.classList.remove('hidden');
     }
    function closeDemandaModal() { demandaModal?.classList.add('hidden'); }
    async function handleDemandaFormSubmit(e) {
        e.preventDefault(); if(!currentUserId) return; const saveBtnDem = document.getElementById('save-demanda-btn'); saveBtnDem.disabled = true;
        try { const data = { cidadaoId: demandaCidadaoSelect.value, title: document.getElementById('demanda-title').value, description: document.getElementById('demanda-description').value, status: 'pending', createdAt: Timestamp.now(), updatedAt: Timestamp.now(), ownerId: currentUserId }; await addDoc(collection(db, 'demandas'), data); showToast("Demanda adicionada!", "success"); closeDemandaModal(); } catch (error) { console.error("Erro:", error); showToast("Erro ao salvar.", "error"); } finally { saveBtnDem.disabled = false; }
     }

    // --- Demanda Details Modal ---
    async function openDemandaDetailsModal(demandaId) {
        currentDemandaId = demandaId; const demanda = allDemandas.find(d => d.id === demandaId); if (!demanda) return; const solicitante = allCidadaos.find(c => c.id === demanda.cidadaoId); document.getElementById('details-demanda-title').textContent = demanda.title; document.getElementById('details-demanda-cidadao').textContent = `Solicitante: ${solicitante ? solicitante.name : 'Desconhecido'}`; document.getElementById('details-demanda-description').textContent = demanda.description || 'Sem descrição.'; const statusSelect = document.getElementById('details-demanda-status'); statusSelect.value = demanda.status; statusSelect.onchange = (e) => updateDemandaStatus(demandaId, e.target.value); document.getElementById('delete-demanda-btn').onclick = () => requestDelete(demandaId, 'demanda', demanda.title); loadDemandaNotes(demandaId); demandaDetailsModal?.classList.remove('hidden'); setTimeout(()=>demandaDetailsModal?.querySelector('.bg-white')?.classList.remove('scale-95','opacity-0'), 10);
     }
    function closeDemandaDetailsModal() {
        if(notesListener) notesListener(); notesListener=null; demandaDetailsModal?.querySelector('.bg-white')?.classList.add('scale-95','opacity-0'); setTimeout(()=>{demandaDetailsModal?.classList.add('hidden'); currentDemandaId=null; addNoteForm.reset();}, 300);
     }
    async function updateDemandaStatus(demandaId, newStatus) {
        if (!currentUserId) return; try { const dR = doc(db, 'demandas', demandaId); await updateDoc(dR, { status: newStatus, updatedAt: Timestamp.now() }); const notesRef = collection(dR, 'notes'); await addDoc(notesRef, { text: `Status: ${getStatusInfo(newStatus).text}`, createdAt: Timestamp.now(), author: "Sistema" }); showToast("Status atualizado!", "success"); } catch (error) { console.error("Erro:", error); showToast("Erro.", "error"); }
     }
    function loadDemandaNotes(demandaId) {
        if(!currentUserId || !demandaId) return; if(notesListener) notesListener(); const notesListEl = document.getElementById('demanda-notes-list'); notesListEl.innerHTML = 'Carregando...'; const notesRef = collection(db, 'demandas', demandaId, 'notes'); const q = query(notesRef, orderBy('createdAt', 'asc')); notesListener = onSnapshot(q, (snapshot) => { if(snapshot.empty){ notesListEl.innerHTML = '<p class="text-sm text-gray-500 italic">Sem notas.</p>'; return; } notesListEl.innerHTML = ''; snapshot.docs.forEach(doc => { const note = doc.data(); const noteEl = document.createElement('div'); noteEl.className = 'p-3 bg-gray-100 rounded mb-2'; const date = note.createdAt?.toDate?note.createdAt.toDate().toLocaleString('pt-BR'):'N/A'; noteEl.innerHTML = `<p class="text-sm">${note.text}</p><p class="text-xs text-gray-500 text-right">${note.author||'User'} - ${date}</p>`; notesListEl.appendChild(noteEl); }); notesListEl.scrollTop = notesListEl.scrollHeight; }, (error) => { console.error("Notes Error:", error); notesListEl.innerHTML = '<p class="text-red-500">Erro notas.</p>'; });
     }
    async function handleAddNoteSubmit(e) {
        e.preventDefault();
        const uid = auth.currentUser?.uid;
        if (!uid || !currentDemandaId) {
            console.warn("User not logged in or no demanda selected.");
            return;
        }
        const newNoteTextElement = document.getElementById('new-note-text');
        const text = newNoteTextElement.value.trim();
        if (!text) {
            showToast("Escreva o acompanhamento.", "warning");
            return;
        }
        const addButton = addNoteForm.querySelector('button[type="submit"]');
        if(addButton) addButton.disabled = true;
        try {
            const demandaRef = doc(db, 'demandas', currentDemandaId);
            const notesRef = collection(demandaRef, 'notes');
            await addDoc(notesRef, { text, createdAt: Timestamp.now(), author: auth.currentUser.email || "User" });
            await updateDoc(demandaRef, { updatedAt: Timestamp.now() });
            newNoteTextElement.value = '';
            showToast("Acompanhamento adicionado!", "success");
        } catch (error) {
            console.error("Erro ao adicionar nota:", error);
            showToast("Erro ao salvar.", "error");
        } finally {
            if(addButton) addButton.disabled = false;
        }
    }

    // --- Deletion Logic ---
    function requestDelete(itemId, type, name = '') { itemToDelete = { id: itemId, type: type }; const modal = document.getElementById('confirmation-modal'); const title = document.getElementById('confirmation-title'); const message = document.getElementById('confirmation-message'); const itemIdentifier = name || (type === 'demanda' ? allDemandas.find(d=>d.id===itemId)?.title : '') || 'este item'; if (type === 'cidadao') { title.textContent = 'Excluir Cidadão'; message.textContent = `Excluir "${itemIdentifier}"? Demandas associadas NÃO serão excluídas.`; } else if (type === 'demanda') { title.textContent = 'Excluir Demanda'; message.textContent = `Excluir "${itemIdentifier}"?`; } modal?.classList.remove('hidden'); }
    function closeConfirmationModal() { document.getElementById('confirmation-modal')?.classList.add('hidden'); itemToDelete = { id: null, type: null }; }
    async function handleDeleteConfirmation() {
        const { id, type } = itemToDelete; if (!id || !type || !currentUserId) return; confirmDeleteBtn.disabled = true; confirmDeleteBtn.textContent = 'Excluindo...';
        try {
            if (type === 'cidadao') {
                const dR = doc(db, 'cidadaos', id); const cData = allCidadaos.find(c=> c.id === id);
                if (cData?.photoUrl) { try { await deleteObject(ref(storage, cData.photoUrl)); } catch (e) { console.warn("Photo delete error (non-critical):", e); } }
                await deleteDoc(dR); showToast('Cidadão excluído!');
            } else if (type === 'demanda') {
                const dR = doc(db, 'demandas', id);
                // Delete notes subcollection
                const notesRef = collection(dR, 'notes');
                const notesSnap = await getDocs(notesRef);
                const batch = writeBatch(db);
                notesSnap.forEach(noteDoc => batch.delete(noteDoc.ref));
                batch.delete(dR); // Delete the demanda itself
                await batch.commit();
                showToast('Demanda excluída!');
                closeDemandaDetailsModal();
            }
        } catch (error) {
            console.error("Erro ao excluir:", error);
            showToast('Erro ao excluir.', 'error');
        } // <-- Fechamento do catch estava faltando
        finally { confirmDeleteBtn.disabled = false; confirmDeleteBtn.textContent = 'Excluir'; closeConfirmationModal(); }
     }

    // --- Map Logic ---
    function initializeMap() { if(map) map.remove(); try { map = L.map('map').setView([-14.2350, -51.9253], 4); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map); markers = []; } catch(e){ console.error("Map init error:", e); showToast("Erro mapa.", "error"); document.getElementById('map').innerHTML='Erro mapa.'; } }
    async function openMapModal(cidadaosToPlot = null) { mapModal?.classList.remove('hidden'); if (!map) { setTimeout(initializeMap, 100); } else { markers.forEach(m => m.remove()); markers = []; } await new Promise(r => setTimeout(r, 150)); map?.invalidateSize(); const cidadaos = cidadaosToPlot || getFilteredCidadaos(); const bounds = []; const promises = cidadaos.map(async (c, idx) => { if (c.logradouro && c.cidade) { try { await new Promise(r=>setTimeout(r, idx * 500)); // Delay requests
                const addr = `${c.logradouro}, ${c.numero||''}, ${c.bairro}, ${c.cidade}, ${c.estado}`; const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`); const data = await res.json(); if (data && data.length > 0) { const {lat,lon} = data[0]; const latLng = [parseFloat(lat), parseFloat(lon)]; const marker = L.marker(latLng).addTo(map).bindPopup(`<strong>${c.name}</strong><br>${addr}`); markers.push(marker); bounds.push(latLng); } } catch (e) { console.warn(`Geocode error ${c.name}:`, e); } } }); await Promise.all(promises); if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50] }); else if (!cidadaosToPlot) map.setView([-14.2350, -51.9253], 4); }
    function closeMapModal() { mapModal?.classList.add('hidden'); }

    // --- Report Logic ---
    function generatePrintReport() {
        const filteredCidadaos = getFilteredCidadaos(); if (filteredCidadaos.length === 0) { showToast("Nenhum cidadão para relatório.", "warning"); return; } const reportWindow = window.open('', '', 'width=800,height=600'); reportWindow.document.write('<html><head><title>Relatório</title><style>body{font-family:Arial,sans-serif;margin:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left; font-size: 9pt;}th{background:#f2f2f2; font-size: 10pt;}h1{text-align:center;border-bottom:2px solid #000;padding-bottom:10px}@media print{button{display:none} @page { size: A4 landscape; margin: 1cm; }}</style></head><body>'); reportWindow.document.write(`<h1>Relatório Cidadãos (${filteredCidadaos.length})</h1><button onclick="window.print()">Imprimir</button><table><thead><tr><th>Nome</th><th>Tipo</th><th>Telefone</th><th>Email</th><th>Endereço Completo</th></tr></thead><tbody>`); filteredCidadaos.forEach(c=>{ const addr=[c.logradouro,c.numero,c.complemento,c.bairro,c.cidade,c.estado,c.cep?`CEP: ${formatCEP(c.cep)}`:null].filter(Boolean).join(', ')||'-'; reportWindow.document.write(`<tr><td>${c.name}</td><td>${c.type}</td><td>${c.phone?formatPhone(c.phone):''} ${c.whatsapp?'(W)':''}</td><td>${c.email}</td><td>${addr}</td></tr>`); }); reportWindow.document.write('</tbody></table></body></html>'); reportWindow.document.close();
     }


    // --- Utils ---
    function switchPage(pageId) { document.querySelectorAll('.page').forEach(p => p.classList.add('hidden')); const newPage = document.getElementById(pageId); if(newPage) { newPage.classList.remove('hidden'); newPage.classList.add('flex', 'flex-col'); } document.querySelectorAll('#sidebar-nav a').forEach(l => { l.classList.remove('bg-slate-900','font-semibold'); if (l.getAttribute('href') === `#${pageId.replace('-page','')}`) l.classList.add('bg-slate-900','font-semibold'); }); if (pageId === 'dashboard-page') updateDashboard(); }

}); // --- FIM DO DOMContentLoaded ---
