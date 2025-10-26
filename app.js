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

// --- [NOVO] Obter App ID ---
// O appId global __app_id é fornecido pelo ambiente Canvas. Use 'default-app-id' como fallback.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
console.log("Using App ID:", appId);
// --- [FIM NOVO] ---


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

// Function to format CPF
function formatCPF(cpf) {
    if (!cpf) return '';
    cpf = cpf.replace(/\D/g, ''); // Remove non-numeric characters
    cpf = cpf.slice(0, 11); // Limit length
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
    cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return cpf;
}

// Function to format Phone
function formatPhone(phone) {
    if (!phone) return '';
    phone = phone.replace(/\D/g, ''); // Remove non-numeric characters
    phone = phone.slice(0, 11); // Limit length (e.g., 5511987654321 -> 11987654321)
    if (phone.length === 11) {
        phone = phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (phone.length === 10) {
        phone = phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else if (phone.length === 9) { // Mobile without DDD
        phone = phone.replace(/(\d{5})(\d{4})/, '$1-$2');
    } else if (phone.length === 8) { // Landline without DDD
        phone = phone.replace(/(\d{4})(\d{4})/, '$1-$2');
    }
    return phone;
}

// Function to format CEP
function formatCEP(cep) {
    if (!cep) return '';
    cep = cep.replace(/\D/g, ''); // Remove non-numeric characters
    cep = cep.slice(0, 8); // Limit length
    cep = cep.replace(/^(\d{5})(\d)/, '$1-$2');
    return cep;
}

// Function to format Voter ID (Título de Eleitor) - Simple formatting
function formatVoterID(voterId) {
    if (!voterId) return '';
    voterId = voterId.replace(/\D/g, ''); // Remove non-numeric characters
    voterId = voterId.slice(0, 12); // Limit length
    if (voterId.length === 12) { // Standard length
       voterId = voterId.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
    }
    // Add more specific formatting if needed based on state rules
    return voterId;
}


// Apply masks on input
document.getElementById('cidadao-cpf').addEventListener('input', (e) => {
    e.target.value = formatCPF(e.target.value);
});
document.getElementById('cidadao-phone').addEventListener('input', (e) => {
    e.target.value = formatPhone(e.target.value);
});
document.getElementById('cidadao-cep').addEventListener('input', (e) => {
    e.target.value = formatCEP(e.target.value);
});
document.getElementById('cidadao-voterid').addEventListener('input', (e) => {
    e.target.value = formatVoterID(e.target.value);
});


// --- Authentication ---

// Check auth state
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        currentUserId = user.uid; // [ALTERADO] Store user ID
        console.log("User logged in:", currentUserId);
        showApp();
        loadInitialData(); // Load data only when logged in
    } else {
        currentUser = null;
        currentUserId = null; // [ALTERADO] Clear user ID
        console.log("User logged out");
        showLoginPage();
        clearData(); // Clear data when logged out
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Login bem-sucedido!');
        // onAuthStateChanged will handle showing the app
    } catch (error) {
        console.error("Erro no login:", error.code, error.message);
        // Show specific error messages based on Firebase error codes
        let friendlyMessage = 'Email ou palavra-passe inválidos.';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' ) {
           friendlyMessage = 'Credenciais inválidas. Verifique seu e-mail e senha.';
        } else if (error.code === 'auth/too-many-requests') {
           friendlyMessage = 'Muitas tentativas de login falhadas. Tente novamente mais tarde.';
        } else if (error.code === 'auth/network-request-failed') {
            friendlyMessage = 'Erro de rede. Verifique sua conexão com a internet.';
        } else if (error.code === 'auth/invalid-api-key' || error.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
             friendlyMessage = 'Erro de configuração. A chave da API do Firebase é inválida.';
        }
        showToast(friendlyMessage, 'error');
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showToast('Logout bem-sucedido!');
        // onAuthStateChanged will handle showing the login page
    } catch (error) {
        console.error("Erro no logout:", error);
        showToast('Erro ao fazer logout.', 'error');
    }
});

// --- UI Navigation ---

function showLoginPage() {
    loginPage.classList.remove('hidden');
    appContainer.classList.add('hidden');
    appContainer.classList.remove('flex'); // Remove flex when hidden
}

function showApp() {
    loginPage.classList.add('hidden');
    appContainer.classList.remove('hidden');
    appContainer.classList.add('flex'); // Make sure flex is applied
    navigateTo('dashboard'); // Default page
}

function navigateTo(pageId) {
    pages.forEach(page => {
        if (page.id === `${pageId}-page`) {
            page.classList.remove('hidden');
            page.classList.add('flex'); // Ensure page content is flexible
        } else {
            page.classList.add('hidden');
            page.classList.remove('flex');
        }
    });

    // Update active link in sidebar
    const navLinks = sidebarNav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === `#${pageId}`) {
            link.classList.add('bg-slate-900', 'font-semibold');
            link.classList.remove('hover:bg-slate-700');
        } else {
            link.classList.remove('bg-slate-900', 'font-semibold');
            link.classList.add('hover:bg-slate-700');
        }
    });

    // Load specific data or update UI for the current page
    if (pageId === 'dashboard') {
        renderDashboard();
    } else if (pageId === 'demandas') {
        renderDemandas(); // Re-render demands page
    } else if (pageId === 'cidadaos'){
        renderCidadaos(); // Re-render cidadaos page
    }
}

// Sidebar navigation event listener
sidebarNav.addEventListener('click', (e) => {
    // Check if the clicked element or its parent is a link
    const link = e.target.closest('a.nav-link');
    if (link) {
        e.preventDefault(); // Prevent default anchor behavior
        const pageId = link.getAttribute('href').substring(1);
        navigateTo(pageId);
    }
});

// Logo navigation listener
logoBtn?.addEventListener('click', () => {
   navigateTo('dashboard');
});


// --- [ALTERADO] Helper Function to get Firestore Path ---
function getFirestorePath(collectionName) {
    if (!currentUserId) {
        console.error("User ID not available for Firestore path.");
        return null; // Or throw an error
    }
    // Path for private user data according to rules
    return `artifacts/${appId}/users/${currentUserId}/${collectionName}`;
}
// --- [FIM ALTERADO] ---


// --- Data Loading and Clearing ---

async function loadInitialData() {
    // [ALTERADO] Check for currentUserId instead of currentUser object
    if (!currentUserId) {
        console.log("loadInitialData skipped: currentUserId is null.");
        return;
    }
    console.log("Loading initial data for user:", currentUserId);

    // Unsubscribe from previous listeners if they exist
    if (cidadaosListener) {
        console.log("Unsubscribing previous cidadaos listener.");
        cidadaosListener();
        cidadaosListener = null; // Important to reset
    }
    if (demandasListener) {
        console.log("Unsubscribing previous demandas listener.");
        demandasListener();
        demandasListener = null; // Important to reset
    }

    // --- Cidadãos Listener ---
    // [ALTERADO] Use helper function for path
    const cidadaosPath = getFirestorePath('cidadaos');
    if (!cidadaosPath) return; // Stop if path couldn't be constructed
    const cidadaosQuery = query(collection(db, cidadaosPath));
    console.log("Setting up new cidadaos listener on path:", cidadaosPath);
    cidadaosListener = onSnapshot(cidadaosQuery, (snapshot) => {
        allCidadaos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Cidadãos data updated:", allCidadaos.length);
        populateFilters(); // Populate filters whenever data changes

        // Determine the currently active page and re-render if necessary
        const currentPageElement = document.querySelector('.page:not(.hidden)');
        if (currentPageElement) {
            const currentPageId = currentPageElement.id.replace('-page', '');
            console.log("Current page:", currentPageId);
             if (currentPageId === 'cidadaos') {
                 console.log("Rendering cidadãos page due to data update.");
                 renderCidadaos();
             } else if (currentPageId === 'dashboard') {
                 console.log("Rendering dashboard page due to data update.");
                 renderDashboard();
             } else if (currentPageId === 'demandas') {
                 populateDemandaFilters();
             }
        } else {
            console.log("No active page found during cidadãos update.");
        }

    }, (error) => {
        console.error("Erro ao carregar cidadãos:", error);
        // [ALTERADO] Check for permission error specifically
        if (error.code === 'permission-denied') {
             showToast("Erro de permissão ao carregar cidadãos. Verifique as regras de segurança do Firestore.", "error");
        } else {
            showToast("Erro ao carregar cidadãos. Verifique a consola.", "error");
        }
    });

    // --- Demandas Listener ---
    // [ALTERADO] Use helper function for path
    const demandasPath = getFirestorePath('demandas');
    if (!demandasPath) return; // Stop if path couldn't be constructed
    const demandasQuery = query(collection(db, demandasPath), orderBy('createdAt', 'desc'));
     console.log("Setting up new demandas listener on path:", demandasPath);
    demandasListener = onSnapshot(demandasQuery, (snapshot) => {
        allDemandas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Demandas data updated:", allDemandas.length);

         // Determine the currently active page and re-render if necessary
        const currentPageElement = document.querySelector('.page:not(.hidden)');
         if (currentPageElement) {
            const currentPageId = currentPageElement.id.replace('-page', '');
            console.log("Current page:", currentPageId);
            if (currentPageId === 'demandas') {
                 console.log("Rendering demandas page due to data update.");
                 renderDemandas();
            } else if (currentPageId === 'dashboard') {
                 console.log("Rendering dashboard page due to data update.");
                 renderDashboard(); // Update dashboard which shows recent demandas
            }
        } else {
             console.log("No active page found during demandas update.");
        }
    }, (error) => {
        console.error("Erro ao carregar demandas:", error);
         // [ALTERADO] Check for permission error specifically
        if (error.code === 'permission-denied') {
             showToast("Erro de permissão ao carregar demandas. Verifique as regras de segurança do Firestore.", "error");
        } else {
            showToast("Erro ao carregar demandas. Verifique a consola.", "error");
        }
    });
}


function clearData() {
    console.log("Clearing data and unsubscribing listeners.");
    allCidadaos = [];
    allDemandas = [];

    // Unsubscribe listeners
    if (cidadaosListener) {
        cidadaosListener();
        cidadaosListener = null;
    }
    if (demandasListener) {
        demandasListener();
        demandasListener = null;
    }

    // Clear UI elements
    cidadaosGrid.innerHTML = '';
    allDemandasList.innerHTML = '';

    // Clear filters - Reset to initial state
    filterBairro.innerHTML = '<option value="">Filtrar por Bairro</option>';
    filterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>';
    demandaFilterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>';
     filterType.value = '';
     filterSexo.value = '';
     filterFaixaEtaria.value = '';
     searchInput.value = '';
     demandaFilterStatus.value = '';


    // Clear dashboard elements
    document.getElementById('dashboard-total-cidadaos').textContent = '0';
    document.getElementById('dashboard-total-demandas').textContent = '0';
    document.getElementById('aniversariantes-list').innerHTML = '';
    document.getElementById('demandas-recentes-list').innerHTML = '';

    // Destroy charts if they exist
    cidadaosPorTipoChartInstance?.destroy();
    demandasPorStatusChartInstance?.destroy();
    cidadaosPorBairroChartInstance?.destroy();
    cidadaosPorSexoChartInstance?.destroy();
    cidadaosPorFaixaEtariaChartInstance?.destroy();
    cidadaosPorTipoChartInstance = null;
    demandasPorStatusChartInstance = null;
    cidadaosPorBairroChartInstance = null;
    cidadaosPorSexoChartInstance = null;
    cidadaosPorFaixaEtariaChartInstance = null;

    console.log("Data cleared.");
}


// --- Cidadãos ---

// Populate Bairro and Leader filters
function populateFilters() {
    if (!allCidadaos || allCidadaos.length === 0) {
        filterBairro.innerHTML = '<option value="">Filtrar por Bairro</option>';
        filterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>';
        cidadaoLeaderSelect.innerHTML = '<option value="">Nenhuma</option>';
        populateDemandaFilters();
        return;
    }

    const bairros = [...new Set(allCidadaos.map(c => c.bairro).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const leaders = allCidadaos.filter(c => c.type === 'Liderança').map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));

    const selectedBairro = filterBairro.value;
    const selectedLeader = filterLeader.value;
    const selectedCidadaoLeader = cidadaoLeaderSelect.value;

    filterBairro.innerHTML = '<option value="">Filtrar por Bairro</option>';
    bairros.forEach(bairro => {
        const option = document.createElement('option');
        option.value = bairro;
        option.textContent = bairro;
        filterBairro.appendChild(option);
    });
    filterBairro.value = selectedBairro;

    filterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>';
    cidadaoLeaderSelect.innerHTML = '<option value="">Nenhuma</option>';
    leaders.forEach(leader => {
        const optionFilter = document.createElement('option');
        optionFilter.value = leader.name;
        optionFilter.textContent = leader.name;
        filterLeader.appendChild(optionFilter);

        const optionForm = document.createElement('option');
        optionForm.value = leader.name;
        optionForm.textContent = leader.name;
        cidadaoLeaderSelect.appendChild(optionForm);
    });
    filterLeader.value = selectedLeader;
    cidadaoLeaderSelect.value = selectedCidadaoLeader;

    populateDemandaFilters();
}


// Calculate Age and Age Group
function calculateAgeAndGroup(dobString) {
    if (!dobString) return { age: null, group: 'N/A' };
    try {
        const dobParts = dobString.split('-');
        if (dobParts.length !== 3) throw new Error("Invalid date format");
        const dob = new Date(Date.UTC(parseInt(dobParts[0]), parseInt(dobParts[1]) - 1, parseInt(dobParts[2])));
        if (isNaN(dob.getTime())) throw new Error("Invalid date value");

        const today = new Date();
        const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

        let age = todayUTC.getUTCFullYear() - dob.getUTCFullYear();
        const monthDiff = todayUTC.getUTCMonth() - dob.getUTCMonth();
        const dayDiff = todayUTC.getUTCDate() - dob.getUTCDate();

        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            age--;
        }

        if (age < 0) return { age: null, group: 'N/A' };
        if (age <= 17) return { age: age, group: '0-17' };
        if (age >= 18 && age <= 25) return { age: age, group: '18-25' };
        if (age >= 26 && age <= 35) return { age: age, group: '26-35' };
        if (age >= 36 && age <= 50) return { age: age, group: '36-50' };
        if (age >= 51 && age <= 65) return { age: age, group: '51-65' };
        return { age: age, group: '66+' };

    } catch (e) {
        console.error("Error calculating age for date:", dobString, e);
        return { age: null, group: 'N/A' };
    }
}


// Function to get filtered citizens
function getFilteredCidadaos() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const type = filterType.value;
    const bairro = filterBairro.value;
    const leader = filterLeader.value;
    const sexo = filterSexo.value;
    const faixaEtaria = filterFaixaEtaria.value;

    return allCidadaos.filter(cidadao => {
        const nameMatch = (cidadao.name || '').toLowerCase().includes(searchTerm);
        const emailMatch = (cidadao.email || '').toLowerCase().includes(searchTerm);
        const searchTermDigits = searchTerm.replace(/\D/g,'');
        const cpfMatch = searchTermDigits && (cidadao.cpf || '').includes(searchTermDigits);
        const searchMatch = nameMatch || emailMatch || cpfMatch;

        const typeMatch = !type || cidadao.type === type;
        const bairroMatch = !bairro || cidadao.bairro === bairro;
        const leaderMatch = !leader || cidadao.leader === leader;
        const sexoMatch = !sexo || cidadao.sexo === sexo;

        const ageInfo = calculateAgeAndGroup(cidadao.dob);
        const faixaEtariaMatch = !faixaEtaria || ageInfo.group === faixaEtaria;

        return searchMatch && typeMatch && bairroMatch && leaderMatch && sexoMatch && faixaEtariaMatch;
    });
}


// Render Cidadãos Grid
function renderCidadaos() {
    console.log("Rendering cidadãos grid...");
    cidadaosGrid.innerHTML = '';
    const filteredCidadaos = getFilteredCidadaos();
    console.log("Filtered cidadãos count:", filteredCidadaos.length);

    if (filteredCidadaos.length === 0) {
        cidadaosGrid.innerHTML = '<p class="text-gray-500 md:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-10">Nenhum cidadão encontrado com os filtros selecionados.</p>';
        return;
    }

    filteredCidadaos.forEach(cidadao => {
        const card = document.createElement('div');
        card.className = 'bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between transition-all duration-300 ease-in-out';
        const initialLetter = cidadao.name ? cidadao.name.charAt(0).toUpperCase() : '?';
        const photoContent = cidadao.photoUrl
            ? `<img src="${cidadao.photoUrl}" alt="${cidadao.name}" class="w-full h-full object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='${initialLetter}'; this.parentElement.classList.add('bg-slate-200', 'text-slate-500', 'font-bold', 'text-xl');">`
            : `<span class="font-bold text-xl">${initialLetter}</span>`;

        card.innerHTML = `
            <div>
                 <div class="flex items-center gap-3 mb-3">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${!cidadao.photoUrl ? 'bg-slate-200 text-slate-500' : ''}">
                       ${photoContent}
                    </div>
                    <div>
                        <h3 class="font-bold text-lg text-gray-800 truncate" title="${cidadao.name}">${cidadao.name || 'Nome Indisponível'}</h3>
                        <span class="text-xs px-2 py-0.5 rounded ${cidadao.type === 'Liderança' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}">${cidadao.type || 'N/A'}</span>
                    </div>
                </div>
                <p class="text-sm text-gray-600 mb-1 truncate" title="${cidadao.email}"><strong class="font-medium">Email:</strong> ${cidadao.email || '-'}</p>
                <p class="text-sm text-gray-600 mb-1"><strong class="font-medium">Tel:</strong> ${cidadao.phone ? formatPhone(cidadao.phone) : '-'} ${cidadao.whatsapp ? '<span class="text-green-600 font-semibold">(WhatsApp)</span>' : ''}</p>
                <p class="text-sm text-gray-600 truncate" title="${cidadao.bairro}"><strong class="font-medium">Bairro:</strong> ${cidadao.bairro || '-'}</p>
                ${cidadao.leader ? `<p class="text-sm text-gray-500 mt-2 truncate" title="Indicado por: ${cidadao.leader}"><em>Indicado por: ${cidadao.leader}</em></p>` : ''}
            </div>
            <div class="mt-4 flex flex-wrap gap-2 justify-end border-t pt-3">
                <button class="view-details-btn text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1 px-2 rounded-md transition-colors" data-id="${cidadao.id}">Detalhes</button>
                <button class="edit-cidadao-btn text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-1 px-2 rounded-md transition-colors" data-id="${cidadao.id}">Editar</button>
                <button class="delete-cidadao-btn text-xs bg-red-100 hover:bg-red-200 text-red-700 font-medium py-1 px-2 rounded-md transition-colors" data-id="${cidadao.id}" data-name="${cidadao.name}">Excluir</button>
            </div>
        `;
        cidadaosGrid.appendChild(card);
    });

    addGridButtonListeners();
}


// Add listeners for buttons inside the grid
function addGridButtonListeners() {
    cidadaosGrid.removeEventListener('click', handleGridButtonClick);
    cidadaosGrid.addEventListener('click', handleGridButtonClick);
}

function handleGridButtonClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const id = button.dataset.id;
    const name = button.dataset.name;

    if (button.classList.contains('view-details-btn')) {
        console.log("View details clicked for ID:", id);
        showCidadaoDetails(id);
    } else if (button.classList.contains('edit-cidadao-btn')) {
         console.log("Edit clicked for ID:", id);
        editCidadao(id);
    } else if (button.classList.contains('delete-cidadao-btn')) {
        console.log("Delete clicked for ID:", id, "Name:", name);
        confirmDeleteCidadao(id, name);
    }
}


// Handle File Upload Change
cidadaoPhotoUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            showToast('Por favor, selecione um ficheiro de imagem.', 'error');
            fileNameDisplay.textContent = 'Ficheiro inválido';
            cidadaoPhotoUploadInput.value = '';
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
             showToast('O ficheiro é muito grande (máximo 5MB).', 'error');
             fileNameDisplay.textContent = 'Ficheiro muito grande';
             cidadaoPhotoUploadInput.value = '';
             return;
        }
        fileNameDisplay.textContent = file.name;
        cidadaoPhotoUrlInput.value = '';
    } else {
        fileNameDisplay.textContent = 'Nenhum ficheiro selecionado';
    }
});


// Add/Edit Cidadao Modal
function openCidadaoModal(cidadao = null) {
    cidadaoForm.reset();
    fileNameDisplay.textContent = 'Nenhum ficheiro selecionado';
    cidadaoPhotoUploadInput.value = null;
    childrenDetailsContainer.innerHTML = '';
    currentCidadaoId = null;

    populateFilters(); // Ensure leader dropdown is populated

    if (cidadao) {
        currentCidadaoId = cidadao.id;
        cidadaoModalTitle.textContent = 'Editar Cidadão';
        document.getElementById('cidadao-name').value = cidadao.name || '';
        document.getElementById('cidadao-email').value = cidadao.email || '';
        document.getElementById('cidadao-dob').value = cidadao.dob || '';
        document.getElementById('cidadao-sexo').value = cidadao.sexo || 'Não Informar';
        document.getElementById('cidadao-profissao').value = cidadao.profissao || '';
        document.getElementById('cidadao-local-trabalho').value = cidadao.localTrabalho || '';
        document.getElementById('cidadao-type').value = cidadao.type || 'Apoiador';
        document.getElementById('cidadao-cpf').value = cidadao.cpf ? formatCPF(cidadao.cpf) : '';
        document.getElementById('cidadao-rg').value = cidadao.rg || '';
        document.getElementById('cidadao-voterid').value = cidadao.voterId ? formatVoterID(cidadao.voterId) : '';
        document.getElementById('cidadao-phone').value = cidadao.phone ? formatPhone(cidadao.phone) : '';
        document.getElementById('cidadao-whatsapp').checked = cidadao.whatsapp || false;
        document.getElementById('cidadao-cep').value = cidadao.cep ? formatCEP(cidadao.cep) : '';
        document.getElementById('cidadao-logradouro').value = cidadao.logradouro || '';
        document.getElementById('cidadao-numero').value = cidadao.numero || '';
        document.getElementById('cidadao-complemento').value = cidadao.complemento || '';
        document.getElementById('cidadao-bairro').value = cidadao.bairro || '';
        document.getElementById('cidadao-cidade').value = cidadao.cidade || '';
        document.getElementById('cidadao-estado').value = cidadao.estado || '';
        document.getElementById('cidadao-leader').value = cidadao.leader || '';
        document.getElementById('cidadao-sons').value = cidadao.sons || 0;
        document.getElementById('cidadao-daughters').value = cidadao.daughters || 0;
        document.getElementById('cidadao-photo-url').value = cidadao.photoUrl || '';
        generateChildrenFields(cidadao.sons || 0, cidadao.daughters || 0, cidadao.children);
    } else {
        cidadaoModalTitle.textContent = 'Adicionar Novo Cidadão';
        generateChildrenFields(0, 0);
    }

    cidadaoModal.classList.remove('hidden');
    setTimeout(() => {
        const modalContent = cidadaoModal.querySelector('#modal-content');
        if (modalContent) {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }
    }, 10);
}

function closeCidadaoModal() {
     const modalContent = cidadaoModal.querySelector('#modal-content');
     if (modalContent) {
         modalContent.classList.remove('scale-100', 'opacity-100');
         modalContent.classList.add('scale-95', 'opacity-0');
         setTimeout(() => {
            cidadaoModal.classList.add('hidden');
         }, 200);
     } else {
         cidadaoModal.classList.add('hidden');
     }
}

addCidadaoBtn.addEventListener('click', () => openCidadaoModal());
closeModalBtn.addEventListener('click', closeCidadaoModal);
cancelBtn.addEventListener('click', closeCidadaoModal);
cidadaoModal.addEventListener('click', (e) => {
    if (e.target === cidadaoModal) {
        closeCidadaoModal();
    }
});


// Generate dynamic fields for children
function generateChildrenFields(numSons, numDaughters, existingChildren = []) {
    childrenDetailsContainer.innerHTML = '';
    const totalChildren = parseInt(numSons || 0) + parseInt(numDaughters || 0);

    if (totalChildren > 0 && totalChildren <= 20) {
        const title = document.createElement('h3');
        title.className = 'text-lg font-semibold text-gray-800 border-b pb-2 mb-4';
        title.textContent = 'Detalhes dos Filhos';
        childrenDetailsContainer.appendChild(title);

        for (let i = 0; i < totalChildren; i++) {
            const childData = existingChildren && existingChildren[i] ? existingChildren[i] : {};
            const fieldWrapper = document.createElement('div');
            fieldWrapper.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 border p-3 rounded-lg bg-gray-50 mb-3';

            const nameDiv = document.createElement('div');
            nameDiv.innerHTML = `
                <label for="child-name-${i}" class="block text-sm font-medium text-gray-700 mb-1">Nome do Filho/a ${i + 1}</label>
                <input type="text" id="child-name-${i}" class="w-full border border-gray-300 p-2 rounded-lg child-detail-input" value="${childData.name || ''}" maxlength="100">
            `;
            const dobDiv = document.createElement('div');
            dobDiv.innerHTML = `
                <label for="child-dob-${i}" class="block text-sm font-medium text-gray-700 mb-1">Data de Nasc. ${i + 1}</label>
                <input type="date" id="child-dob-${i}" class="w-full border border-gray-300 p-2 rounded-lg child-detail-input" value="${childData.dob || ''}">
            `;
            fieldWrapper.appendChild(nameDiv);
            fieldWrapper.appendChild(dobDiv);
            childrenDetailsContainer.appendChild(fieldWrapper);
        }
    } else if (totalChildren > 20) {
        childrenDetailsContainer.innerHTML = '<p class="text-red-500">Limite de 20 filhos atingido.</p>';
    }
}


// Event listeners for son/daughter count inputs
cidadaoSonsInput.addEventListener('input', (e) => {
    let value = parseInt(e.target.value);
    if (isNaN(value) || value < 0) value = 0;
    if (value > 10) { value = 10; showToast('Número máximo de 10 filhos atingido.', 'error'); }
    e.target.value = value;
    generateChildrenFields(value, cidadaoDaughtersInput.value);
});
cidadaoDaughtersInput.addEventListener('input', (e) => {
    let value = parseInt(e.target.value);
    if (isNaN(value) || value < 0) value = 0;
    if (value > 10) { value = 10; showToast('Número máximo de 10 filhas atingido.', 'error'); }
    e.target.value = value;
    generateChildrenFields(cidadaoSonsInput.value, value);
});


// Save Cidadao (Add or Update)
cidadaoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // [ALTERADO] Check for currentUserId
    if (!currentUserId) {
        showToast('Você precisa estar logado para salvar.', 'error');
        return;
    }

    const requiredFields = ['cidadao-name', 'cidadao-email'];
    let isValid = true;
    requiredFields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input && !input.value.trim()) {
            input.classList.add('border-red-500');
            isValid = false;
        } else if (input) {
            input.classList.remove('border-red-500');
        }
    });
    if (!isValid) {
        showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<svg class="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Salvando...';

    let photoUrl = cidadaoPhotoUrlInput.value.trim();
    const file = cidadaoPhotoUploadInput.files[0];

    try {
        if (file) {
            // [ALTERADO] Use currentUserId in path
            const filePath = `user_photos/${currentUserId}/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, filePath);
            console.log("Uploading photo to:", filePath);
            const snapshot = await uploadBytes(storageRef, file);
            photoUrl = await getDownloadURL(snapshot.ref);
            console.log("Photo uploaded successfully:", photoUrl);
        } else {
             console.log("No new photo file selected, using URL:", photoUrl);
        }

        const children = [];
        const numSons = parseInt(cidadaoSonsInput.value) || 0;
        const numDaughters = parseInt(cidadaoDaughtersInput.value) || 0;
        const totalChildren = numSons + numDaughters;
        for (let i = 0; i < totalChildren; i++) {
             const nameInput = document.getElementById(`child-name-${i}`);
             const dobInput = document.getElementById(`child-dob-${i}`);
            if (nameInput && dobInput) {
                const childName = nameInput.value.trim();
                const childDob = dobInput.value;
                if (childName) {
                     children.push({ name: childName, dob: childDob || null });
                } else if (childDob) {
                     console.warn(`Child ${i+1} skipped: Name is required.`);
                }
            } else {
                 console.warn(`Inputs for child ${i+1} not found.`);
            }
        }
         console.log("Collected children data:", children);

        const cidadaoData = {
            name: document.getElementById('cidadao-name').value.trim(),
            email: document.getElementById('cidadao-email').value.trim().toLowerCase(),
            dob: document.getElementById('cidadao-dob').value || null,
            sexo: document.getElementById('cidadao-sexo').value,
            profissao: document.getElementById('cidadao-profissao').value.trim(),
            localTrabalho: document.getElementById('cidadao-local-trabalho').value.trim(),
            type: document.getElementById('cidadao-type').value,
            cpf: document.getElementById('cidadao-cpf').value.replace(/\D/g, ''),
            rg: document.getElementById('cidadao-rg').value.replace(/\D/g,''),
            voterId: document.getElementById('cidadao-voterid').value.replace(/\D/g, ''),
            phone: document.getElementById('cidadao-phone').value.replace(/\D/g, ''),
            whatsapp: document.getElementById('cidadao-whatsapp').checked,
            cep: document.getElementById('cidadao-cep').value.replace(/\D/g, ''),
            logradouro: document.getElementById('cidadao-logradouro').value.trim(),
            numero: document.getElementById('cidadao-numero').value.trim(),
            complemento: document.getElementById('cidadao-complemento').value.trim(),
            bairro: document.getElementById('cidadao-bairro').value.trim(),
            cidade: document.getElementById('cidadao-cidade').value.trim(),
            estado: document.getElementById('cidadao-estado').value.trim().toUpperCase(),
            leader: document.getElementById('cidadao-leader').value,
            sons: numSons,
            daughters: numDaughters,
            children: children,
            photoUrl: photoUrl || null,
            // [ALTERADO] Remove userId from data, it's part of the path now
            // userId: currentUserId,
            updatedAt: serverTimestamp()
        };

        // [ALTERADO] Use helper function for path
        const collectionPath = getFirestorePath('cidadaos');
        if (!collectionPath) throw new Error("Could not determine Firestore path.");


        if (!currentCidadaoId) {
             cidadaoData.createdAt = serverTimestamp();
        }

        console.log("Saving cidadao data to path:", collectionPath, "Data:", cidadaoData);

        if (currentCidadaoId) {
            console.log("Updating document ID:", currentCidadaoId);
            // [ALTERADO] Use correct path for doc ref
            const docRef = doc(db, collectionPath, currentCidadaoId);
            await updateDoc(docRef, cidadaoData);
            showToast('Cidadão atualizado com sucesso!');
        } else {
             console.log("Adding new document to:", collectionPath);
             // [ALTERADO] Use correct path for addDoc
            const docRef = await addDoc(collection(db, collectionPath), cidadaoData);
            console.log("Document added with ID:", docRef.id);
            showToast('Cidadão adicionado com sucesso!');
        }

        closeCidadaoModal();
    } catch (error) {
        console.error("Erro ao salvar cidadão:", error);
        showToast(`Erro ao salvar cidadão: ${error.message}`, 'error');
    } finally {
         saveBtn.disabled = false;
         saveBtn.textContent = 'Salvar';
    }
});


// Edit Cidadao
async function editCidadao(id) {
     // [ALTERADO] Check for currentUserId
     if (!currentUserId || !id) return;
    try {
         console.log("Attempting to fetch cidadao for edit, ID:", id);
         // [ALTERADO] Use helper function for path
         const collectionPath = getFirestorePath('cidadaos');
         if (!collectionPath) return;
         const docRef = doc(db, collectionPath, id);
         const docSnap = await getDoc(docRef);
         if (docSnap.exists()) {
              console.log("Cidadao found, opening modal.");
             openCidadaoModal({ id: docSnap.id, ...docSnap.data() });
         } else {
              console.warn("Cidadao document not found for edit, ID:", id);
             showToast("Cidadão não encontrado.", "error");
         }
    } catch (error) {
        console.error("Erro ao buscar cidadão para edição:", error);
        showToast("Erro ao carregar dados do cidadão.", "error");
    }
}

// Confirm Delete Cidadao
function confirmDeleteCidadao(id, name) {
    confirmationTitle.textContent = 'Confirmar Exclusão de Cidadão';
    confirmationMessage.textContent = `Tem a certeza que deseja excluir "${name || 'este cidadão'}"? Todas as demandas associadas NÃO serão excluídas, mas ficarão sem cidadão vinculado. Esta ação não pode ser desfeita.`;
    confirmationModal.classList.remove('hidden');

    const handleConfirm = () => {
        deleteCidadao(id);
        closeConfirmationModal();
        removeConfirmationListeners();
    };
    const handleCancel = () => {
        closeConfirmationModal();
        removeConfirmationListeners();
    };
    const removeConfirmationListeners = () => {
        confirmDeleteBtn.removeEventListener('click', handleConfirm);
        cancelDeleteBtn.removeEventListener('click', handleCancel);
    };

    removeConfirmationListeners(); // Clean up previous before adding new
    confirmDeleteBtn.addEventListener('click', handleConfirm);
    cancelDeleteBtn.addEventListener('click', handleCancel);
}

// Close Confirmation Modal
function closeConfirmationModal() {
    confirmationModal.classList.add('hidden');
}


// Delete Cidadao
async function deleteCidadao(id) {
     // [ALTERADO] Check for currentUserId
    if (!currentUserId || !id) return;
    console.log("Attempting to delete cidadao ID:", id);
    try {
        // [ALTERADO] Use helper function for path
        const collectionPath = getFirestorePath('cidadaos');
        if (!collectionPath) return;

        console.log("Proceeding with deletion of cidadao ID:", id, "from path:", collectionPath);
        const docRef = doc(db, collectionPath, id);
        await deleteDoc(docRef);
        console.log("Cidadao deleted successfully:", id);
        showToast('Cidadão excluído com sucesso!');
    } catch (error) {
        console.error("Erro ao excluir cidadão:", id, error);
        showToast('Erro ao excluir cidadão.', 'error');
    }
}


// --- Cidadao Details Modal ---
async function showCidadaoDetails(id) {
     // [ALTERADO] Check for currentUserId
     if (!currentUserId || !id) return;
    try {
        console.log("Fetching details for cidadao ID:", id);
        // [ALTERADO] Use helper function for path
        const collectionPath = getFirestorePath('cidadaos');
        if (!collectionPath) return;
        const docRef = doc(db, collectionPath, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const cidadao = { id: docSnap.id, ...docSnap.data() };
            console.log("Cidadao details found:", cidadao);

            document.getElementById('details-name').textContent = cidadao.name || 'Nome não disponível';
            document.getElementById('details-type').textContent = cidadao.type || 'Tipo não informado';
            document.getElementById('details-email').textContent = cidadao.email || '-';
            document.getElementById('details-phone').textContent = cidadao.phone ? formatPhone(cidadao.phone) + (cidadao.whatsapp ? ' (WhatsApp)' : '') : '-';

            const addressParts = [
                cidadao.logradouro, cidadao.numero, cidadao.complemento, cidadao.bairro,
                cidadao.cidade, cidadao.estado, cidadao.cep ? `CEP: ${formatCEP(cidadao.cep)}` : null
            ].filter(part => part);
            document.getElementById('details-address').textContent = addressParts.join(', ') || 'Endereço não informado';

            document.getElementById('details-cpf').textContent = cidadao.cpf ? formatCPF(cidadao.cpf) : '-';
            document.getElementById('details-rg').textContent = cidadao.rg || '-';
            document.getElementById('details-voterid').textContent = cidadao.voterId ? formatVoterID(cidadao.voterId) : '-';

            let dobFormatted = '-';
            if (cidadao.dob) {
                try {
                     const dobDate = new Date(`${cidadao.dob}T00:00:00Z`);
                     if (!isNaN(dobDate.getTime())) {
                        dobFormatted = dobDate.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' });
                     }
                } catch (e) { console.error("Error formatting DOB:", cidadao.dob, e); }
            }
             document.getElementById('details-dob').textContent = dobFormatted;

            document.getElementById('details-sexo').textContent = cidadao.sexo || '-';
            document.getElementById('details-profissao').textContent = cidadao.profissao || '-';
            document.getElementById('details-local-trabalho').textContent = cidadao.localTrabalho || '-';
            document.getElementById('details-leader').textContent = cidadao.leader || '-';

            const childrenContainer = document.getElementById('details-children');
            childrenContainer.innerHTML = '';
            if (cidadao.children && cidadao.children.length > 0) {
                 const childrenTitle = document.createElement('p');
                 childrenTitle.className = 'font-semibold text-gray-500 text-sm mb-1 mt-2';
                 childrenTitle.textContent = `FILHOS (${cidadao.children.length})`;
                 childrenContainer.appendChild(childrenTitle);
                 const childrenList = document.createElement('ul');
                 childrenList.className = 'list-none space-y-1 text-sm';
                 cidadao.children.forEach((child, index) => {
                     const listItem = document.createElement('li');
                     let dobChildFormatted = '';
                     if (child.dob) {
                        try {
                            const dobChildDate = new Date(`${child.dob}T00:00:00Z`);
                            if (!isNaN(dobChildDate.getTime())) {
                                dobChildFormatted = ` (Nasc: ${dobChildDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })})`;
                            }
                        } catch(e) { console.error("Error formatting child DOB:", child.dob, e); }
                     }
                     listItem.innerHTML = `<strong>${index + 1}. ${child.name || 'Nome não informado'}</strong>${dobChildFormatted}`;
                     childrenList.appendChild(listItem);
                 });
                 childrenContainer.appendChild(childrenList);
            } else {
                 const sonCount = cidadao.sons || 0;
                 const daughterCount = cidadao.daughters || 0;
                 if (sonCount > 0 || daughterCount > 0) {
                    childrenContainer.innerHTML = `<p class="text-sm mt-2">Filhos: ${sonCount}, Filhas: ${daughterCount} (detalhes não cadastrados).</p>`;
                 } else {
                    childrenContainer.innerHTML = '<p class="text-sm mt-2">Sem filhos cadastrados.</p>';
                 }
            }

            const photoDiv = document.getElementById('details-photo');
            const initialLetterDetails = cidadao.name ? cidadao.name.charAt(0).toUpperCase() : '?';
            photoDiv.innerHTML = '';
            photoDiv.className = 'w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-4xl overflow-hidden border border-gray-300';
            if (cidadao.photoUrl) {
                const img = document.createElement('img');
                img.src = cidadao.photoUrl;
                img.alt = cidadao.name;
                img.className = 'w-full h-full object-cover';
                img.onerror = () => {
                     console.warn("Failed to load image:", cidadao.photoUrl);
                     photoDiv.innerHTML = `<span class="font-bold text-4xl">${initialLetterDetails}</span>`;
                     photoDiv.classList.add('bg-slate-200', 'text-slate-500');
                };
                photoDiv.appendChild(img);
                photoDiv.classList.remove('bg-slate-200', 'text-slate-500');
            } else {
                photoDiv.innerHTML = `<span class="font-bold text-4xl">${initialLetterDetails}</span>`;
            }

            // Button Actions (Re-attach listeners)
            const newViewMapBtn = detailsViewMapBtn.cloneNode(true);
            detailsViewMapBtn.parentNode.replaceChild(newViewMapBtn, detailsViewMapBtn);
            detailsViewMapBtn = newViewMapBtn;
            detailsViewMapBtn.onclick = () => {
                 const mapAddressParts = [cidadao.logradouro, cidadao.numero, cidadao.bairro, cidadao.cidade, cidadao.estado, cidadao.cep].filter(Boolean);
                 if (mapAddressParts.length >= 2) {
                     const addressString = mapAddressParts.join(', ');
                     console.log("Opening map for address:", addressString);
                     openMapModal([{ name: cidadao.name, address: addressString, photoUrl: cidadao.photoUrl }]);
                 } else {
                     showToast("Endereço insuficiente para exibir no mapa.", "error");
                 }
             };

            const newShareBtn = detailsShareLocationBtn.cloneNode(true);
            detailsShareLocationBtn.parentNode.replaceChild(newShareBtn, detailsShareLocationBtn);
            detailsShareLocationBtn = newShareBtn;
             detailsShareLocationBtn.onclick = () => { shareLocation(cidadao); };

            cidadaoDetailsModal.classList.remove('hidden');
            setTimeout(() => {
                const modalContent = cidadaoDetailsModal.querySelector('.bg-white');
                if (modalContent) {
                    modalContent.classList.remove('scale-95', 'opacity-0');
                    modalContent.classList.add('scale-100', 'opacity-100');
                }
            }, 10);

        } else {
            console.warn("Cidadao details not found for ID:", id);
            showToast("Detalhes do cidadão não encontrados.", "error");
        }
    } catch (error) {
        console.error("Erro ao exibir detalhes do cidadão:", error);
        showToast("Erro ao carregar detalhes do cidadão.", "error");
    }
}


function closeCidadaoDetailsModal() {
    const modalContent = cidadaoDetailsModal.querySelector('.bg-white');
     if (modalContent) {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            cidadaoDetailsModal.classList.add('hidden');
        }, 200);
     } else {
         cidadaoDetailsModal.classList.add('hidden');
     }
}

closeDetailsModalBtn.addEventListener('click', closeCidadaoDetailsModal);
cidadaoDetailsModal.addEventListener('click', (e) => {
    if (e.target === cidadaoDetailsModal) {
        closeCidadaoDetailsModal();
    }
});


// --- Filters Event Listeners ---
searchInput.addEventListener('input', renderCidadaos);
filterType.addEventListener('change', renderCidadaos);
filterBairro.addEventListener('change', renderCidadaos);
filterLeader.addEventListener('change', renderCidadaos);
filterSexo.addEventListener('change', renderCidadaos);
filterFaixaEtaria.addEventListener('change', renderCidadaos);

clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterType.value = '';
    filterBairro.value = '';
    filterLeader.value = '';
    filterSexo.value = '';
    filterFaixaEtaria.value = '';
    renderCidadaos();
});


// --- Demandas ---

// Populate Demanda Filters
function populateDemandaFilters() {
    if (!allCidadaos) {
         demandaFilterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>';
        return;
    }
    const leaders = allCidadaos.filter(c => c.type === 'Liderança').map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));
    const selectedDemandaLeader = demandaFilterLeader.value;
    demandaFilterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>';
    leaders.forEach(leader => {
         const optionDemandaFilter = document.createElement('option');
         optionDemandaFilter.value = leader.name;
         optionDemandaFilter.textContent = leader.name;
         demandaFilterLeader.appendChild(optionDemandaFilter);
     });
    demandaFilterLeader.value = selectedDemandaLeader;
}

// Function to get filtered demandas
function getFilteredDemandas() {
    const status = demandaFilterStatus.value;
    const leaderName = demandaFilterLeader.value;

    return allDemandas.filter(demanda => {
        const statusMatch = !status || demanda.status === status;
        const cidadao = allCidadaos.find(c => c.id === demanda.cidadaoId);
        const leaderMatch = !leaderName || (cidadao && cidadao.leader === leaderName);
        return statusMatch && leaderMatch;
    });
}


// Render Demandas List
function renderDemandas() {
    console.log("Rendering demandas list...");
    allDemandasList.innerHTML = '';
    const filteredDemandas = getFilteredDemandas();
    console.log("Filtered demandas count:", filteredDemandas.length);

    if (filteredDemandas.length === 0) {
        allDemandasList.innerHTML = '<p class="text-gray-500 text-center py-10">Nenhuma demanda encontrada com os filtros selecionados.</p>';
        return;
    }

    filteredDemandas.forEach(demanda => {
        const cidadao = allCidadaos.find(c => c.id === demanda.cidadaoId);
        const cidadaoName = cidadao ? cidadao.name : 'Cidadão Desconhecido';
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-start gap-4 hover:shadow-md transition-shadow cursor-pointer demanda-card';
        card.dataset.id = demanda.id;

        let statusClass = 'bg-yellow-100 text-yellow-800';
        let statusText = 'Pendente';
        if (demanda.status === 'inprogress') {
            statusClass = 'bg-blue-100 text-blue-800'; statusText = 'Em Andamento';
        } else if (demanda.status === 'completed') {
            statusClass = 'bg-green-100 text-green-800'; statusText = 'Concluída';
        }

        const createdAtDate = demanda.createdAt?.toDate ? demanda.createdAt.toDate() : new Date();
        const formattedDate = createdAtDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        card.innerHTML = `
            <div class="flex-1 overflow-hidden">
                <h3 class="text-lg font-semibold text-gray-800 truncate" title="${demanda.title}">${demanda.title}</h3>
                <p class="text-sm text-gray-600 mb-2">Para: <strong class="font-medium">${cidadaoName}</strong></p>
                <p class="text-xs text-gray-500">Criada em: ${formattedDate}</p>
                 ${cidadao && cidadao.leader ? `<p class="text-xs text-gray-500 mt-1">Liderança: ${cidadao.leader}</p>` : ''}
            </div>
            <div class="flex-shrink-0">
                <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${statusClass}">${statusText}</span>
            </div>
        `;
        allDemandasList.appendChild(card);
    });

    addDemandaCardListener();
}

function addDemandaCardListener() {
    allDemandasList.removeEventListener('click', handleDemandaCardClick);
    allDemandasList.addEventListener('click', handleDemandaCardClick);
}

function handleDemandaCardClick(e) {
     const card = e.target.closest('.demanda-card');
    if (card && card.dataset.id) {
        console.log("Demanda card clicked, ID:", card.dataset.id);
        openDemandaDetailsModal(card.dataset.id);
    }
}


// Open Demanda Modal
function openDemandaModal(cidadaoId = null) {
     if (!allCidadaos || allCidadaos.length === 0) {
        showToast('Nenhum cidadão cadastrado para associar a demanda.', 'error');
        return;
     }
    demandaForm.reset();
    currentDemandaId = null;
    demandaModalTitle.textContent = 'Adicionar Nova Demanda';

    demandaCidadaoSelect.innerHTML = '<option value="">Selecione um Cidadão</option>';
    const sortedCidadaos = [...allCidadaos].sort((a, b) => a.name.localeCompare(b.name));
    sortedCidadaos.forEach(cidadao => {
        const option = document.createElement('option');
        option.value = cidadao.id;
        option.textContent = cidadao.name;
        demandaCidadaoSelect.appendChild(option);
    });
    if (cidadaoId) { demandaCidadaoSelect.value = cidadaoId; }
    demandaModal.classList.remove('hidden');
}


// Close Demanda Modal
function closeDemandaModal() {
    demandaModal.classList.add('hidden');
}

addDemandaGeralBtn.addEventListener('click', () => openDemandaModal());
closeDemandaModalBtn.addEventListener('click', closeDemandaModal);
cancelDemandaBtn.addEventListener('click', closeDemandaModal);
demandaModal.addEventListener('click', (e) => {
    if (e.target === demandaModal) closeDemandaModal();
});


// Save Demanda
demandaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
     // [ALTERADO] Check for currentUserId
    if (!currentUserId) {
        showToast('Você precisa estar logado.', 'error');
        return;
    }
    const cidadaoIdSelected = demandaCidadaoSelect.value;
    const title = demandaTitleInput.value.trim();

    if (!cidadaoIdSelected) {
        showToast('Por favor, selecione um cidadão.', 'error');
        demandaCidadaoSelect.focus();
        return;
    }
     if (!title) {
        showToast('Por favor, insira um título para a demanda.', 'error');
        demandaTitleInput.focus();
        return;
    }

    saveDemandaBtn.disabled = true;
    saveDemandaBtn.textContent = 'Salvando...';

    const demandaData = {
        cidadaoId: cidadaoIdSelected,
        title: title,
        description: demandaDescriptionInput.value.trim(),
        status: 'pending',
        // [ALTERADO] Remove userId from data
        // userId: currentUserId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        notes: []
    };

    try {
        // [ALTERADO] Use helper function for path
        const collectionPath = getFirestorePath('demandas');
        if (!collectionPath) throw new Error("Could not determine Firestore path.");

        console.log("Adding new demanda to:", collectionPath, demandaData);
        // [ALTERADO] Use correct path
        const docRef = await addDoc(collection(db, collectionPath), demandaData);
        console.log("Demanda added with ID:", docRef.id);
        showToast('Demanda adicionada com sucesso!');
        closeDemandaModal();
    } catch (error) {
        console.error("Erro ao salvar demanda:", error);
        showToast('Erro ao salvar demanda.', 'error');
    } finally {
        saveDemandaBtn.disabled = false;
        saveDemandaBtn.textContent = 'Salvar Demanda';
    }
});


// --- Demanda Details Modal ---

let currentDemandaDetailsListener = null;

async function openDemandaDetailsModal(demandaId) {
     // [ALTERADO] Check for currentUserId
    if (!currentUserId || !demandaId) return;
    currentDemandaId = demandaId;

    if (currentDemandaDetailsListener) {
        console.log("Unsubscribing previous demanda details listener.");
        currentDemandaDetailsListener();
        currentDemandaDetailsListener = null;
    }

    console.log("Opening details for demanda ID:", demandaId);
     // [ALTERADO] Use helper function for path
    const demandaPath = getFirestorePath('demandas');
    if (!demandaPath) return;
    const demandaDocRef = doc(db, demandaPath, demandaId);

    currentDemandaDetailsListener = onSnapshot(demandaDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const demanda = { id: docSnap.id, ...docSnap.data() };
            console.log("Demanda details updated:", demanda);
            populateDemandaDetails(demanda);
            if (demandaDetailsModal.classList.contains('hidden')) {
                 demandaDetailsModal.classList.remove('hidden');
            }
        } else {
             console.warn("Demanda document not found (possibly deleted):", demandaId);
            showToast("Demanda não encontrada. Pode ter sido excluída.", "error");
            closeDemandaDetailsModal();
        }
    }, (error) => {
         console.error("Error listening to demanda details:", error);
         showToast("Erro ao carregar detalhes da demanda.", "error");
         closeDemandaDetailsModal();
    });
}

function populateDemandaDetails(demanda) {
    const cidadao = allCidadaos.find(c => c.id === demanda.cidadaoId);
    const cidadaoName = cidadao ? cidadao.name : 'Cidadão Desconhecido';

    document.getElementById('details-demanda-title').textContent = demanda.title || 'Título Indisponível';
    document.getElementById('details-demanda-cidadao').textContent = `Para: ${cidadaoName}`;
    document.getElementById('details-demanda-description').textContent = demanda.description || 'Nenhuma descrição fornecida.';
    document.getElementById('details-demanda-status').value = demanda.status || 'pending';

    const notesList = document.getElementById('demanda-notes-list');
    notesList.innerHTML = '';
    if (demanda.notes && demanda.notes.length > 0) {
        const sortedNotes = [...demanda.notes].sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));
        sortedNotes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = 'bg-gray-100 p-3 rounded-md text-sm';
            const noteDate = note.timestamp?.toDate ? note.timestamp.toDate().toLocaleString('pt-BR') : 'Data indisponível';
            noteEl.innerHTML = `<p class="text-gray-800">${note.text}</p><p class="text-xs text-gray-500 mt-1">${noteDate}</p>`;
            notesList.appendChild(noteEl);
        });
    } else {
        notesList.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhum acompanhamento adicionado.</p>';
    }
}


function closeDemandaDetailsModal() {
    if (currentDemandaDetailsListener) {
        console.log("Unsubscribing demanda details listener on close.");
        currentDemandaDetailsListener();
        currentDemandaDetailsListener = null;
    }
    demandaDetailsModal.classList.add('hidden');
    currentDemandaId = null;
    addNoteForm.reset();
}

closeDemandaDetailsBtn.addEventListener('click', closeDemandaDetailsModal);
demandaDetailsModal.addEventListener('click', (e) => {
    if (e.target === demandaDetailsModal) {
        closeDemandaDetailsModal();
    }
});


// Update Demanda Status
document.getElementById('details-demanda-status').addEventListener('change', async (e) => {
    const newStatus = e.target.value;
     // [ALTERADO] Check for currentUserId
    if (!currentUserId || !currentDemandaId || !newStatus) return;

    console.log(`Updating status for demanda ${currentDemandaId} to ${newStatus}`);
     // [ALTERADO] Use helper function for path
    const demandaPath = getFirestorePath('demandas');
    if (!demandaPath) return;
    const demandaDocRef = doc(db, demandaPath, currentDemandaId);
    try {
        await updateDoc(demandaDocRef, {
            status: newStatus,
            updatedAt: serverTimestamp()
        });
        showToast('Status da demanda atualizado!');
    } catch (error) {
        console.error("Erro ao atualizar status da demanda:", error);
        showToast('Erro ao atualizar status.', 'error');
    }
});


// Add Note to Demanda
addNoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
     // [ALTERADO] Check for currentUserId
    if (!currentUserId || !currentDemandaId) return;

    const noteText = document.getElementById('new-note-text').value.trim();
    if (!noteText) {
        showToast('Por favor, escreva o acompanhamento.', 'error');
        return;
    }

     // [ALTERADO] Use helper function for path
    const demandaPath = getFirestorePath('demandas');
    if (!demandaPath) return;
    const demandaDocRef = doc(db, demandaPath, currentDemandaId);

    try {
        const demandaDoc = await getDoc(demandaDocRef);
        if (!demandaDoc.exists()) {
             showToast('Demanda não encontrada para adicionar nota.', 'error');
             return;
        }

        const currentNotes = demandaDoc.data().notes || [];
        const newNote = { text: noteText, timestamp: serverTimestamp() };

        await updateDoc(demandaDocRef, {
            notes: [...currentNotes, newNote],
            updatedAt: serverTimestamp()
        });

        showToast('Acompanhamento adicionado!');
        addNoteForm.reset();

    } catch (error) {
        console.error("Erro ao adicionar nota:", error);
        showToast('Erro ao adicionar acompanhamento.', 'error');
    }
});


// Delete Demanda
deleteDemandaBtn.addEventListener('click', () => {
     if (!currentDemandaId) return;
     const demandaTitle = document.getElementById('details-demanda-title').textContent || 'esta demanda';

     confirmationTitle.textContent = 'Confirmar Exclusão de Demanda';
     confirmationMessage.textContent = `Tem a certeza que deseja excluir a demanda "${demandaTitle}"? Esta ação não pode ser desfeita.`;
     confirmationModal.classList.remove('hidden');

     const handleConfirmDeleteDemanda = async () => {
          // [ALTERADO] Check for currentUserId
         if (currentUserId && currentDemandaId) {
             console.log("Confirming delete for demanda ID:", currentDemandaId);
             const demandaToDelete = currentDemandaId;
             closeConfirmationModal();
             closeDemandaDetailsModal();

             try {
                 // [ALTERADO] Use helper function for path
                const demandaPath = getFirestorePath('demandas');
                if (!demandaPath) throw new Error("Could not determine Firestore path.");
                const docRef = doc(db, demandaPath, demandaToDelete);
                await deleteDoc(docRef);
                console.log("Demanda deleted successfully:", demandaToDelete);
                showToast('Demanda excluída com sucesso!');
            } catch (error) {
                console.error("Erro ao excluir demanda:", demandaToDelete, error);
                showToast('Erro ao excluir demanda.', 'error');
            }
         }
         removeDemandaConfirmationListeners();
     };

     const handleCancelDeleteDemanda = () => {
         closeConfirmationModal();
         removeDemandaConfirmationListeners();
     };
     const removeDemandaConfirmationListeners = () => {
        confirmDeleteBtn.removeEventListener('click', handleConfirmDeleteDemanda);
        cancelDeleteBtn.removeEventListener('click', handleCancelDeleteDemanda);
     };

     removeDemandaConfirmationListeners();
     confirmDeleteBtn.addEventListener('click', handleConfirmDeleteDemanda);
     cancelDeleteBtn.addEventListener('click', handleCancelDeleteDemanda);
});


// --- Demandas Filters ---
demandaFilterStatus.addEventListener('change', renderDemandas);
demandaFilterLeader.addEventListener('change', renderDemandas);
demandaClearFiltersBtn.addEventListener('click', () => {
    demandaFilterStatus.value = '';
    demandaFilterLeader.value = '';
    renderDemandas();
});


// --- Reports ---
generateReportBtn.addEventListener('click', generatePrintReport);

function generatePrintReport() {
    const filteredCidadaos = getFilteredCidadaos();

    if (filteredCidadaos.length === 0) {
        showToast("Nenhum cidadão para gerar relatório com os filtros atuais.", "error");
        return;
    }

    let reportHtml = `... [HTML do relatório como antes] ...`; // (O HTML do relatório não precisa mudar)
     // Create HTML content for the report
    reportHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Relatório de Cidadãos - Gestor Valente</title>
            <style>
                body { font-family: 'Inter', sans-serif; margin: 20px; font-size: 10pt; }
                h1 { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; font-size: 16pt; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; table-layout: fixed; /* Ajuda a controlar larguras */ }
                th, td { border: 1px solid #ddd; padding: 6px; text-align: left; vertical-align: top; word-wrap: break-word; /* Quebra palavras longas */ }
                th { background-color: #f2f2f2; font-weight: bold; }
                /* Definir larguras aproximadas - ajuste conforme necessário */
                th:nth-child(1), td:nth-child(1) { width: 20%; } /* Nome */
                th:nth-child(2), td:nth-child(2) { width: 10%; } /* Tipo */
                th:nth-child(3), td:nth-child(3) { width: 15%; } /* Email */
                th:nth-child(4), td:nth-child(4) { width: 12%; } /* Telefone */
                th:nth-child(5), td:nth-child(5) { width: 23%; } /* Endereço */
                th:nth-child(6), td:nth-child(6) { width: 10%; } /* Liderança */
                th:nth-child(7), td:nth-child(7) { width: 10%; } /* Data Nasc. */
                th:nth-child(8), td:nth-child(8) { width: 10%; } /* Sexo */

                .logo { text-align: center; margin-bottom: 15px; font-size: 14pt; font-weight: bold; }
                 .logo span { color: #3b82f6; }
                .footer { text-align: center; margin-top: 20px; font-size: 8pt; color: #777; }
                .total { margin-top: 10px; font-weight: bold; }
                @media print {
                    body { margin: 1cm; font-size: 8pt; } /* Reduzir fonte geral */
                    h1 { font-size: 14pt; }
                    .logo { font-size: 12pt; }
                     th, td { padding: 4px; font-size: 7pt; /* Reduzir fonte da tabela */}
                     .footer { position: fixed; bottom: 0.5cm; width: 98%; /* Ajustar largura para caber margem */ left: 1%;}
                     tr { page-break-inside: avoid; }
                     .no-print { display: none; }
                     /* Ocultar scrollbars se aparecerem */
                     @page { size: A4 landscape; /* Tentar paisagem se A4 normal cortar */ margin: 1cm; }
                }
            </style>
        </head>
        <body>
            <div class="logo">Gestor<span class="text-blue-400">Valente</span></div>
            <h1>Relatório de Cidadãos</h1>
            <p class="total">Total de Cidadãos (Filtrados): ${filteredCidadaos.length}</p>
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Tipo</th>
                        <th>Email</th>
                        <th>Telefone</th>
                        <th>Endereço Completo</th>
                        <th>Liderança</th>
                        <th>Data Nasc.</th>
                        <th>Sexo</th>
                    </tr>
                </thead>
                <tbody>
    `;

    filteredCidadaos.forEach(c => {
        const fullAddress = [c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.estado, c.cep ? `CEP: ${formatCEP(c.cep)}` : null].filter(Boolean).join(', ') || '-';
        let dobReportFormatted = '-';
        if (c.dob) { try { const d=new Date(`${c.dob}T00:00:00Z`); if(!isNaN(d.getTime())) dobReportFormatted = d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'});} catch(e){} }

        reportHtml += `
            <tr>
                <td>${c.name || '-'}</td>
                <td>${c.type || '-'}</td>
                <td>${c.email || '-'}</td>
                <td>${c.phone ? formatPhone(c.phone) + (c.whatsapp ? ' (W)' : '') : '-'}</td>
                <td>${fullAddress}</td>
                <td>${c.leader || '-'}</td>
                <td>${dobReportFormatted}</td>
                <td>${c.sexo || '-'}</td>
            </tr>
        `;
    });
     reportHtml += `
                </tbody>
            </table>
            <div class="footer">Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
        </body>
        </html>
    `;


    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
        reportWindow.document.write(reportHtml);
        reportWindow.document.close();
        setTimeout(() => {
             reportWindow.focus();
             reportWindow.print();
        }, 500);
    } else {
        showToast("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups.", "error");
    }
}


// --- Maps ---

function initMap() {
    if (map) return;
    try {
        map = L.map(mapElement).setView([-15.7801, -47.9292], 4); // Center on Brazil

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        console.log("Map initialized.");
    } catch (error) {
        console.error("Error initializing Leaflet map:", error);
        showToast("Erro ao inicializar o mapa.", "error");
        mapElement.innerHTML = '<p class="text-red-500 p-4">Não foi possível carregar o mapa.</p>';
    }
}

async function openMapModal(cidadaosToShow) {
    if (cidadaosToShow.length === 0) {
        showToast("Nenhum cidadão selecionado para exibir no mapa.", "error");
        return;
    }
    mapModal.classList.remove('hidden');
    initMap();
    if (!map) {
         console.error("Map object is not available.");
         closeMapModal();
         return;
    }
     requestAnimationFrame(() => {
        map.invalidateSize();
        console.log("Map size invalidated.");
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
        console.log("Previous markers cleared.");
        geocodeAndAddMarkers(cidadaosToShow);
    });
}

async function geocodeAndAddMarkers(cidadaos) {
    if (!map) return;
    console.log("Geocoding addresses for", cidadaos.length, "cidadaos.");
    const bounds = L.latLngBounds();
    let markersAdded = 0;

    const geocodePromises = cidadaos.map(async (cidadao) => {
        if (!cidadao.address) {
            console.warn("Skipping cidadao due to missing address:", cidadao.name);
            return null;
        }
        const query = encodeURIComponent(cidadao.address + ", Brasil");
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&email=your-email@example.com`; // Add email for Nominatim policy
        console.log("Geocoding URL:", url);

        try {
             // Delay between requests to respect Nominatim usage policy (1 req/sec)
             await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1 seconds delay

            const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!response.ok) {
                 // Check for rate limiting specifically
                if (response.status === 429) {
                    console.warn(`Rate limited by Nominatim for address: ${cidadao.address}. Skipping.`);
                    showToast('Muitas requisições ao mapa. Alguns endereços podem não ser exibidos.', 'error');
                } else {
                    throw new Error(`Nominatim request failed: ${response.status} ${response.statusText}`);
                }
                return null; // Skip this address on error or rate limit
            }
            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);
                console.log(`Geocoded '${cidadao.name}' to [${lat}, ${lon}]`);

                let iconHtml = `<div class="map-marker-content bg-white border border-gray-400 rounded-full shadow-md flex items-center justify-center font-bold" style="width: 30px; height: 30px; font-size: 14px; overflow: hidden;">`;
                const initial = cidadao.name ? cidadao.name.charAt(0).toUpperCase() : '?';
                if (cidadao.photoUrl) {
                    iconHtml += `<img src="${cidadao.photoUrl}" alt="${cidadao.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.innerHTML='${initial}'; this.parentElement.classList.add('bg-slate-200', 'text-slate-500');">`;
                } else {
                    iconHtml += initial;
                    iconHtml = iconHtml.replace('class="map-marker-content', 'class="map-marker-content bg-slate-200 text-slate-500');
                }
                 iconHtml += `</div>`;

                 const customIcon = L.divIcon({ className: 'custom-map-marker', html: iconHtml, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30] });
                const marker = L.marker([lat, lon], {icon: customIcon}).addTo(map);
                marker.bindPopup(`<b>${cidadao.name}</b><br>${result.display_name}`);
                markers.push(marker);
                bounds.extend([lat, lon]);
                markersAdded++;
                return marker;
            } else {
                console.warn("Geocoding failed or no results for:", cidadao.address);
                return null;
            }
        } catch (error) {
            console.error("Error during geocoding for:", cidadao.address, error);
            return null;
        }
    });

    await Promise.all(geocodePromises);

    console.log("Markers added:", markersAdded);
    if (markersAdded > 0) {
        console.log("Fitting map bounds.");
         map.fitBounds(bounds, { padding: [50, 50] });
    } else if (cidadaos.length > 0) {
        showToast("Não foi possível localizar os endereços no mapa.", "error");
    }
}


function closeMapModal() {
    mapModal.classList.add('hidden');
}

viewMapBtn.addEventListener('click', () => {
     const filteredCidadaos = getFilteredCidadaos();
     if (filteredCidadaos.length > 0) {
          const cidadaosWithAddress = filteredCidadaos
                .map(c => ({
                    name: c.name,
                    address: [c.logradouro, c.numero, c.bairro, c.cidade, c.estado, c.cep].filter(Boolean).join(', '),
                    photoUrl: c.photoUrl
                 }))
                .filter(c => c.address);

            if (cidadaosWithAddress.length > 0) {
                openMapModal(cidadaosWithAddress);
            } else {
                 showToast("Nenhum cidadão filtrado possui endereço para exibir.", "error");
            }
     } else {
         showToast("Nenhum cidadão selecionado para exibir no mapa.", "error");
     }
});

closeMapBtn.addEventListener('click', closeMapModal);
mapModal.addEventListener('click', (e) => {
    if (e.target === mapModal) closeMapModal();
});


// Share Location
function shareLocation(cidadao) {
     const address = [cidadao.logradouro, cidadao.numero, cidadao.bairro, cidadao.cidade, cidadao.estado, cidadao.cep].filter(Boolean).join(', ');
     if (!address) {
         showToast("Endereço não cadastrado.", "error"); return;
     }
     const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
     const text = `Localização de ${cidadao.name}: ${mapsUrl}`;

     if (navigator.share) {
         navigator.share({ title: `Localização de ${cidadao.name}`, text: `Localização de ${cidadao.name}.`, url: mapsUrl })
         .then(() => console.log('Partilha bem-sucedida'))
         .catch((error) => { console.error('Erro na partilha:', error); copyToClipboard(text); });
     } else {
         copyToClipboard(text);
     }
 }

function copyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        showToast(successful ? 'Copiado!' : 'Falha ao copiar.', successful ? 'success' : 'error');
    } catch (err) {
        console.error('Erro ao copiar:', err);
        showToast('Erro ao copiar.', 'error');
    }
    document.body.removeChild(textArea);
}



// --- Dashboard ---

function renderDashboard() {
     console.log("Rendering dashboard...");
    if (!currentUserId || !allCidadaos || !allDemandas) { // Check userId too
         console.log("Dashboard render skipped: Missing data or user ID.");
         return;
    }
    document.getElementById('dashboard-total-cidadaos').textContent = allCidadaos.length;
    document.getElementById('dashboard-total-demandas').textContent = allDemandas.length;
    renderCidadaosPorTipoChart();
    renderDemandasPorStatusChart();
    renderCidadaosPorBairroChart();
    renderCidadaosPorSexoChart();
    renderCidadaosPorFaixaEtariaChart();
    renderAniversariantes();
    renderDemandasRecentes();
    console.log("Dashboard rendered.");
}

// Chart: Cidadãos por Tipo
function renderCidadaosPorTipoChart() {
    const ctx = document.getElementById('cidadaos-por-tipo-chart')?.getContext('2d');
    if (!ctx) return;
    const tipos = allCidadaos.reduce((acc, c) => { const t = c.type||'N/D'; acc[t]=(acc[t]||0)+1; return acc; }, {});
    const labels = Object.keys(tipos); const data = Object.values(tipos);
    const bgColors = ['#3B82F6','#10B981','#EF4444','#F59E0B','#8B5CF6','#60A5FA','#EC4899'];
    const borderColors = bgColors.map(c=>c.replace('0.7','1'));
    if (cidadaosPorTipoChartInstance) cidadaosPorTipoChartInstance.destroy();
    cidadaosPorTipoChartInstance = new Chart(ctx, { type: 'doughnut', data: { labels, datasets: [{ data, backgroundColor: bgColors.slice(0,labels.length), borderColor: borderColors.slice(0,labels.length), borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => { let l=c.label||''; if(l)l+=': '; if(c.parsed!==null){ const t=c.chart.data.datasets[0].data.reduce((a,b)=>a+b,0); const p=t>0?((c.parsed/t)*100).toFixed(1)+'%':'0%'; l+=`${c.parsed} (${p})`; } return l; } } } } } });
}

// Chart: Demandas por Status
function renderDemandasPorStatusChart() {
    const ctx = document.getElementById('demandas-por-status-chart')?.getContext('2d');
    if (!ctx) return;
    const counts = allDemandas.reduce((acc,d)=>{const s=d.status||'pending';acc[s]=(acc[s]||0)+1;return acc;},{pending:0,inprogress:0,completed:0});
    const labelsMap={'pending':'Pendente','inprogress':'Em Andamento','completed':'Concluída'};
    const labels = Object.keys(counts).map(k=>labelsMap[k]); const data = Object.values(counts);
    const bgColors = {'pending':'rgba(245, 158, 11, 0.7)','inprogress':'rgba(59, 130, 246, 0.7)','completed':'rgba(16, 185, 129, 0.7)'};
    const borderColors = {'pending':'rgba(245, 158, 11, 1)','inprogress':'rgba(59, 130, 246, 1)','completed':'rgba(16, 185, 129, 1)'};
    if (demandasPorStatusChartInstance) demandasPorStatusChartInstance.destroy();
    demandasPorStatusChartInstance = new Chart(ctx, { type: 'pie', data: { labels, datasets: [{ data, backgroundColor: Object.keys(counts).map(k=>bgColors[k]), borderColor: Object.keys(counts).map(k=>borderColors[k]), borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => { let l=c.label||''; if(l)l+=': '; if(c.parsed!==null){ const t=c.chart.data.datasets[0].data.reduce((a,b)=>a+b,0); const p=t>0?((c.parsed/t)*100).toFixed(1)+'%':'0%'; l+=`${c.parsed} (${p})`; } return l; } } } } } });
}

// Chart: Cidadãos por Bairro (Top 10)
function renderCidadaosPorBairroChart() {
    const ctx = document.getElementById('cidadaos-por-bairro-chart')?.getContext('2d');
    if (!ctx) return;
    const counts = allCidadaos.reduce((acc,c)=>{const b=c.bairro||'N/I';acc[b]=(acc[b]||0)+1;return acc;},{});
    const sorted = Object.entries(counts).sort(([,a],[,b])=>b-a).slice(0,10);
    const labels = sorted.map(([b])=>b); const data = sorted.map(([,c])=>c);
    const bgColor = 'rgba(75, 192, 192, 0.7)'; const bdColor = 'rgba(75, 192, 192, 1)';
    if (cidadaosPorBairroChartInstance) cidadaosPorBairroChartInstance.destroy();
    cidadaosPorBairroChartInstance = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Top 10 Bairros', data, backgroundColor: bgColor, borderColor: bdColor, borderWidth: 1 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true, title: { display: true, text: 'Nº Cidadãos' } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c=>` ${c.parsed.x} Cidadãos` } } } } });
}

// Chart: Cidadãos por Sexo
function renderCidadaosPorSexoChart() {
    const ctx = document.getElementById('cidadaos-por-sexo-chart')?.getContext('2d');
    if (!ctx) return;
    const counts = allCidadaos.reduce((acc,c)=>{const s=c.sexo||'N/I';acc[s]=(acc[s]||0)+1;return acc;},{'Masculino':0,'Feminino':0,'Outro':0,'Não Informar':0});
    const labels=Object.keys(counts); const data=Object.values(counts);
    const bgColors = {'Masculino':'#36A2EB','Feminino':'#FF6384','Outro':'#FFCE56','Não Informar':'#9966FF'};
    const bdColors = {'Masculino':'#36A2EB','Feminino':'#FF6384','Outro':'#FFCE56','Não Informar':'#9966FF'};
    if (cidadaosPorSexoChartInstance) cidadaosPorSexoChartInstance.destroy();
    cidadaosPorSexoChartInstance = new Chart(ctx, { type: 'pie', data: { labels, datasets: [{ data, backgroundColor: labels.map(l=>bgColors[l]||'#CCCCCC'), borderColor: labels.map(l=>bdColors[l]||'#CCCCCC'), borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => { let l=c.label||''; if(l)l+=': '; if(c.parsed!==null){ const t=c.chart.data.datasets[0].data.reduce((a,b)=>a+b,0); const p=t>0?((c.parsed/t)*100).toFixed(1)+'%':'0%'; l+=`${c.parsed} (${p})`; } return l; } } } } } });
}

// Chart: Cidadãos por Faixa Etária
function renderCidadaosPorFaixaEtariaChart() {
    const ctx = document.getElementById('cidadaos-por-faixa-etaria-chart')?.getContext('2d');
    if (!ctx) return;
    const counts = allCidadaos.reduce((acc,c)=>{const{group}=calculateAgeAndGroup(c.dob);acc[group]=(acc[group]||0)+1;return acc;},{'0-17':0,'18-25':0,'26-35':0,'36-50':0,'51-65':0,'66+':0,'N/A':0});
    const orderedLabels = ['0-17','18-25','26-35','36-50','51-65','66+','N/A'];
    const data = orderedLabels.map(l=>counts[l]||0);
    const bgColors = ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40','#C9CBCF'];
    const bdColors = bgColors.map(c=>c);
    if(cidadaosPorFaixaEtariaChartInstance) cidadaosPorFaixaEtariaChartInstance.destroy();
    cidadaosPorFaixaEtariaChartInstance = new Chart(ctx,{type:'pie',data:{labels:orderedLabels.map(l=>l==='N/A'?'N/I':`${l} anos`),datasets:[{data,backgroundColor:bgColors,borderColor:bdColors,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>{let l=c.label||'';if(l)l+=': ';if(c.parsed!==null){const t=c.chart.data.datasets[0].data.reduce((a,b)=>a+b,0);const p=t>0?((c.parsed/t)*100).toFixed(1)+'%':'0%';l+=`${c.parsed} (${p})`;}return l;}}}}}});
}


// List: Aniversariantes do Mês
function renderAniversariantes() {
    const list = document.getElementById('aniversariantes-list'); if(!list)return; list.innerHTML='';
    const currentMonth = new Date().getMonth();
    const aniversariantes = allCidadaos.filter(c=>{if(!c.dob)return false; try{const d=new Date(`${c.dob}T00:00:00Z`);return !isNaN(d.getTime())&&d.getUTCMonth()===currentMonth;}catch(e){return false;}}).sort((a,b)=>{try{const dA=new Date(`${a.dob}T00:00:00Z`).getUTCDate();const dB=new Date(`${b.dob}T00:00:00Z`).getUTCDate();return dA-dB;}catch(e){return 0;}});
    if(aniversariantes.length===0){list.innerHTML='<p class="text-sm text-gray-500 italic">Nenhum aniversariante este mês.</p>';return;}
    aniversariantes.forEach(c=>{const i=document.createElement('div');i.className='flex items-center justify-between text-sm py-1';let d='';try{d=new Date(`${c.dob}T00:00:00Z`).getUTCDate().toString().padStart(2,'0');}catch(e){} i.innerHTML=`<span>${c.name}</span><span class="font-semibold text-blue-600">${d||'--'}</span>`;list.appendChild(i);});
}

// List: Demandas Recentes
function renderDemandasRecentes() {
    const list = document.getElementById('demandas-recentes-list'); if(!list)return; list.innerHTML='';
    const recentes = allDemandas.slice(0, 10);
    if(recentes.length===0){list.innerHTML='<p class="text-sm text-gray-500 italic">Nenhuma demanda recente.</p>';return;}
    recentes.forEach(d=>{const c=allCidadaos.find(ci=>ci.id===d.cidadaoId);const cN=c?c.name:'C. Desconhecido';let sC='bg-yellow-100 text-yellow-800',sT='Pendente';if(d.status==='inprogress'){sC='bg-blue-100 text-blue-800';sT='Em Andamento';}else if(d.status==='completed'){sC='bg-green-100 text-green-800';sT='Concluída';}const i=document.createElement('div');i.className='border-b pb-2 mb-2 cursor-pointer hover:bg-gray-50 p-2 rounded demanda-recente-item';i.dataset.id=d.id;i.innerHTML=`<div class="flex justify-between items-center mb-1"><span class="font-semibold text-sm text-gray-700 truncate" title="${d.title}">${d.title}</span><span class="text-xs font-semibold px-2 py-0.5 rounded-full ${sC}">${sT}</span></div><p class="text-xs text-gray-500">Para: ${cN}</p>`;list.appendChild(i);});
    list.removeEventListener('click', handleRecentDemandaClick); list.addEventListener('click', handleRecentDemandaClick);
}

function handleRecentDemandaClick(e) {
    const item = e.target.closest('.demanda-recente-item');
    if (item && item.dataset.id) {
         console.log("Recent demanda clicked, ID:", item.dataset.id);
        openDemandaDetailsModal(item.dataset.id);
    }
}