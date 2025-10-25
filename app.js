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

// Global variables
let currentUser = null;
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
        console.log("User logged in:", user.uid);
        showApp();
        loadInitialData(); // Load data only when logged in
    } else {
        currentUser = null;
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


// --- Data Loading and Clearing ---

async function loadInitialData() {
    if (!currentUser) return;
    console.log("Loading initial data for user:", currentUser.uid);

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
    const cidadaosQuery = query(collection(db, `users/${currentUser.uid}/cidadaos`));
    console.log("Setting up new cidadaos listener.");
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
                 // Update leader filter on demandas page if needed, but don't re-render entire demandas list here
                 populateDemandaFilters();
             }
        } else {
            console.log("No active page found during cidadãos update.");
            // Optionally render the default page if needed, e.g., dashboard
            // renderDashboard();
        }

    }, (error) => {
        console.error("Erro ao carregar cidadãos:", error);
        showToast("Erro ao carregar cidadãos. Verifique a consola.", "error");
    });

    // --- Demandas Listener ---
    const demandasQuery = query(collection(db, `users/${currentUser.uid}/demandas`), orderBy('createdAt', 'desc'));
     console.log("Setting up new demandas listener.");
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
             // Optionally render the default page if needed
            // renderDashboard();
        }
    }, (error) => {
        console.error("Erro ao carregar demandas:", error);
        showToast("Erro ao carregar demandas. Verifique a consola.", "error");
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
    // Also reset other filters if they were dynamically populated, though bairro/leader are main ones
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
    // Only proceed if allCidadaos has data
    if (!allCidadaos || allCidadaos.length === 0) {
        // Reset filters if there's no data
        filterBairro.innerHTML = '<option value="">Filtrar por Bairro</option>';
        filterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>';
        cidadaoLeaderSelect.innerHTML = '<option value="">Nenhuma</option>';
        populateDemandaFilters(); // Also reset demanda leader filter
        return;
    }

    const bairros = [...new Set(allCidadaos.map(c => c.bairro).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const leaders = allCidadaos.filter(c => c.type === 'Liderança').map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));

    // Keep current selection
    const selectedBairro = filterBairro.value;
    const selectedLeader = filterLeader.value;
    const selectedCidadaoLeader = cidadaoLeaderSelect.value;

    // Populate Bairro Filter
    filterBairro.innerHTML = '<option value="">Filtrar por Bairro</option>';
    bairros.forEach(bairro => {
        const option = document.createElement('option');
        option.value = bairro;
        option.textContent = bairro;
        filterBairro.appendChild(option);
    });
    filterBairro.value = selectedBairro; // Restore selection

    // Populate Leader Filters (Cidadãos Page and Form)
    filterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>';
    cidadaoLeaderSelect.innerHTML = '<option value="">Nenhuma</option>'; // For the form
    leaders.forEach(leader => {
        // Option for the filter dropdown
        const optionFilter = document.createElement('option');
        optionFilter.value = leader.name; // Filter by name
        optionFilter.textContent = leader.name;
        filterLeader.appendChild(optionFilter);

        // Option for the form dropdown
        const optionForm = document.createElement('option');
        optionForm.value = leader.name; // Store leader's name
        optionForm.textContent = leader.name;
        cidadaoLeaderSelect.appendChild(optionForm);
    });
    filterLeader.value = selectedLeader; // Restore selection
    cidadaoLeaderSelect.value = selectedCidadaoLeader; // Restore selection

    // Populate leader filter on Demands page as well
    populateDemandaFilters();
}


// Calculate Age and Age Group
function calculateAgeAndGroup(dobString) {
    if (!dobString) return { age: null, group: 'N/A' };
    try {
        // Attempt to create a date object. Handle potential invalid formats.
        // Ensure the date string is interpreted correctly (e.g., YYYY-MM-DD)
        const dobParts = dobString.split('-');
        if (dobParts.length !== 3) throw new Error("Invalid date format");
        
        // Create Date object ensuring UTC to avoid timezone issues with calculation
        const dob = new Date(Date.UTC(parseInt(dobParts[0]), parseInt(dobParts[1]) - 1, parseInt(dobParts[2])));
        if (isNaN(dob.getTime())) throw new Error("Invalid date value"); // Check if date is valid


        const today = new Date();
         // Create today's date in UTC for consistent comparison
        const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));


        let age = todayUTC.getUTCFullYear() - dob.getUTCFullYear();
        const monthDiff = todayUTC.getUTCMonth() - dob.getUTCMonth();
        const dayDiff = todayUTC.getUTCDate() - dob.getUTCDate();

        // Adjust age if the birthday hasn't occurred yet this year
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            age--;
        }


        if (age < 0) return { age: null, group: 'N/A' }; // Date likely in the future or parse error
        if (age <= 17) return { age: age, group: '0-17' };
        if (age >= 18 && age <= 25) return { age: age, group: '18-25' };
        if (age >= 26 && age <= 35) return { age: age, group: '26-35' };
        if (age >= 36 && age <= 50) return { age: age, group: '36-50' };
        if (age >= 51 && age <= 65) return { age: age, group: '51-65' };
        // No upper limit needed for 66+
        return { age: age, group: '66+' };


    } catch (e) {
        console.error("Error calculating age for date:", dobString, e);
        return { age: null, group: 'N/A' };
    }
}


// Function to get filtered citizens (refactored from renderCidadaos)
function getFilteredCidadaos() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const type = filterType.value;
    const bairro = filterBairro.value;
    const leader = filterLeader.value;
    const sexo = filterSexo.value;
    const faixaEtaria = filterFaixaEtaria.value;

    return allCidadaos.filter(cidadao => {
        // Search Match (more robust check for null/undefined)
        const nameMatch = (cidadao.name || '').toLowerCase().includes(searchTerm);
        const emailMatch = (cidadao.email || '').toLowerCase().includes(searchTerm);
        // Normalize CPF search: search term should also be numbers only if searching CPF
        const searchTermDigits = searchTerm.replace(/\D/g,'');
        const cpfMatch = searchTermDigits && (cidadao.cpf || '').includes(searchTermDigits);
        const searchMatch = nameMatch || emailMatch || cpfMatch;


        // Filter Matches (handle empty selections correctly)
        const typeMatch = !type || cidadao.type === type;
        const bairroMatch = !bairro || cidadao.bairro === bairro;
        const leaderMatch = !leader || cidadao.leader === leader;
        const sexoMatch = !sexo || cidadao.sexo === sexo;

        // Age Group Match
        const ageInfo = calculateAgeAndGroup(cidadao.dob);
        const faixaEtariaMatch = !faixaEtaria || ageInfo.group === faixaEtaria;

        return searchMatch && typeMatch && bairroMatch && leaderMatch && sexoMatch && faixaEtariaMatch;
    });
}


// Render Cidadãos Grid
function renderCidadaos() {
    console.log("Rendering cidadãos grid...");
    cidadaosGrid.innerHTML = ''; // Clear existing grid
    const filteredCidadaos = getFilteredCidadaos();
    console.log("Filtered cidadãos count:", filteredCidadaos.length);


    if (filteredCidadaos.length === 0) {
        cidadaosGrid.innerHTML = '<p class="text-gray-500 md:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-10">Nenhum cidadão encontrado com os filtros selecionados.</p>';
        return;
    }


    filteredCidadaos.forEach(cidadao => {
        const card = document.createElement('div');
        // Added transition for smoother appearance if needed
        card.className = 'bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between transition-all duration-300 ease-in-out';
        const initialLetter = cidadao.name ? cidadao.name.charAt(0).toUpperCase() : '?';
        const photoContent = cidadao.photoUrl
            ? `<img src="${cidadao.photoUrl}" alt="${cidadao.name}" class="w-full h-full object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='${initialLetter}'; this.parentElement.classList.add('bg-slate-200', 'text-slate-500', 'font-bold', 'text-xl');">` // Fallback on error
            : `<span class="font-bold text-xl">${initialLetter}</span>`; // Display initial if no photo URL


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
            <div class="mt-4 flex flex-wrap gap-2 justify-end border-t pt-3"> <!-- Added flex-wrap -->
                <button class="view-details-btn text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-1 px-2 rounded-md transition-colors" data-id="${cidadao.id}">Detalhes</button>
                <button class="edit-cidadao-btn text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-1 px-2 rounded-md transition-colors" data-id="${cidadao.id}">Editar</button>
                <button class="delete-cidadao-btn text-xs bg-red-100 hover:bg-red-200 text-red-700 font-medium py-1 px-2 rounded-md transition-colors" data-id="${cidadao.id}" data-name="${cidadao.name}">Excluir</button>
            </div>
        `;
        cidadaosGrid.appendChild(card);
    });

    // Add event listeners for buttons within the grid AFTER appending all cards
    addGridButtonListeners();
}


// Add listeners for buttons inside the grid (using event delegation for efficiency)
function addGridButtonListeners() {
     // Remove previous listener if exists to prevent duplicates
    cidadaosGrid.removeEventListener('click', handleGridButtonClick);
    cidadaosGrid.addEventListener('click', handleGridButtonClick);
}

function handleGridButtonClick(e) {
    const button = e.target.closest('button'); // Find the closest button element
    if (!button) return; // Exit if the click wasn't on or inside a button

    const id = button.dataset.id;
    const name = button.dataset.name; // Only relevant for delete

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
        // Basic validation (optional)
        if (!file.type.startsWith('image/')) {
            showToast('Por favor, selecione um ficheiro de imagem.', 'error');
            fileNameDisplay.textContent = 'Ficheiro inválido';
            cidadaoPhotoUploadInput.value = ''; // Reset input
            return;
        }
        if (file.size > 5 * 1024 * 1024) { // Example: 5MB limit
             showToast('O ficheiro é muito grande (máximo 5MB).', 'error');
             fileNameDisplay.textContent = 'Ficheiro muito grande';
             cidadaoPhotoUploadInput.value = ''; // Reset input
             return;
        }

        fileNameDisplay.textContent = file.name;
        // Clear URL input if a file is chosen
        cidadaoPhotoUrlInput.value = '';
    } else {
        fileNameDisplay.textContent = 'Nenhum ficheiro selecionado';
    }
});


// Add/Edit Cidadao Modal
function openCidadaoModal(cidadao = null) {
    cidadaoForm.reset(); // Clear form
    fileNameDisplay.textContent = 'Nenhum ficheiro selecionado'; // Reset file display
    cidadaoPhotoUploadInput.value = null; // Clear file input value correctly
    childrenDetailsContainer.innerHTML = ''; // Clear children fields
    currentCidadaoId = null; // Reset current ID

    // Populate leader dropdown (ensure it's up-to-date)
    populateFilters();


    if (cidadao) {
        // Editing existing cidadao
        currentCidadaoId = cidadao.id;
        cidadaoModalTitle.textContent = 'Editar Cidadão';
        document.getElementById('cidadao-name').value = cidadao.name || '';
        document.getElementById('cidadao-email').value = cidadao.email || '';
        document.getElementById('cidadao-dob').value = cidadao.dob || '';
        document.getElementById('cidadao-sexo').value = cidadao.sexo || 'Não Informar';
        document.getElementById('cidadao-profissao').value = cidadao.profissao || '';
        document.getElementById('cidadao-local-trabalho').value = cidadao.localTrabalho || ''; // Corrected field name
        document.getElementById('cidadao-type').value = cidadao.type || 'Apoiador';
        document.getElementById('cidadao-cpf').value = cidadao.cpf ? formatCPF(cidadao.cpf) : '';
        document.getElementById('cidadao-rg').value = cidadao.rg || '';
        document.getElementById('cidadao-voterid').value = cidadao.voterId ? formatVoterID(cidadao.voterId) : ''; // Corrected field name
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

        // Generate fields for existing children
        generateChildrenFields(cidadao.sons || 0, cidadao.daughters || 0, cidadao.children);

    } else {
        // Adding new cidadao
        cidadaoModalTitle.textContent = 'Adicionar Novo Cidadão';
        // Generate fields based on default 0 values
        generateChildrenFields(0, 0);
    }

    cidadaoModal.classList.remove('hidden');
    // Animate modal entrance
    setTimeout(() => {
        const modalContent = cidadaoModal.querySelector('#modal-content');
        if (modalContent) {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }
    }, 10); // Small delay to allow CSS transition
}

function closeCidadaoModal() {
     const modalContent = cidadaoModal.querySelector('#modal-content');
     if (modalContent) {
         modalContent.classList.remove('scale-100', 'opacity-100');
         modalContent.classList.add('scale-95', 'opacity-0');
         setTimeout(() => {
            cidadaoModal.classList.add('hidden');
         }, 200); // Match transition duration
     } else {
         cidadaoModal.classList.add('hidden'); // Fallback if content not found
     }
}

addCidadaoBtn.addEventListener('click', () => openCidadaoModal());
closeModalBtn.addEventListener('click', closeCidadaoModal);
cancelBtn.addEventListener('click', closeCidadaoModal);
// Close modal if clicking outside the content
cidadaoModal.addEventListener('click', (e) => {
    if (e.target === cidadaoModal) {
        closeCidadaoModal();
    }
});


// Generate dynamic fields for children's names and DOBs
function generateChildrenFields(numSons, numDaughters, existingChildren = []) {
    childrenDetailsContainer.innerHTML = ''; // Clear previous fields

    const totalChildren = parseInt(numSons || 0) + parseInt(numDaughters || 0);

    if (totalChildren > 0 && totalChildren <= 20) { // Add a reasonable limit (e.g., 20)
        const title = document.createElement('h3');
        title.className = 'text-lg font-semibold text-gray-800 border-b pb-2 mb-4';
        title.textContent = 'Detalhes dos Filhos';
        childrenDetailsContainer.appendChild(title);

        for (let i = 0; i < totalChildren; i++) {
            const childData = existingChildren && existingChildren[i] ? existingChildren[i] : {}; // Safer check

            const fieldWrapper = document.createElement('div');
            fieldWrapper.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 border p-3 rounded-lg bg-gray-50 mb-3';

            // Child Name
            const nameDiv = document.createElement('div');
            const nameLabel = document.createElement('label');
            nameLabel.htmlFor = `child-name-${i}`;
            nameLabel.className = 'block text-sm font-medium text-gray-700 mb-1';
            nameLabel.textContent = `Nome do Filho/a ${i + 1}`;
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.id = `child-name-${i}`;
            nameInput.className = 'w-full border border-gray-300 p-2 rounded-lg child-detail-input'; // Added class
            nameInput.value = childData.name || ''; // Populate if exists
            nameInput.maxLength = 100; // Add max length
            nameDiv.appendChild(nameLabel);
            nameDiv.appendChild(nameInput);

            // Child DOB
            const dobDiv = document.createElement('div');
            const dobLabel = document.createElement('label');
            dobLabel.htmlFor = `child-dob-${i}`;
            dobLabel.className = 'block text-sm font-medium text-gray-700 mb-1';
            dobLabel.textContent = `Data de Nasc. ${i + 1}`;
            const dobInput = document.createElement('input');
            dobInput.type = 'date';
            dobInput.id = `child-dob-${i}`;
            dobInput.className = 'w-full border border-gray-300 p-2 rounded-lg child-detail-input'; // Added class
            dobInput.value = childData.dob || ''; // Populate if exists
            // Optional: Set max date to today
            // dobInput.max = new Date().toISOString().split("T")[0];
            dobDiv.appendChild(dobLabel);
            dobDiv.appendChild(dobInput);

            fieldWrapper.appendChild(nameDiv);
            fieldWrapper.appendChild(dobDiv);
            childrenDetailsContainer.appendChild(fieldWrapper);
        }
    } else if (totalChildren > 20) {
        childrenDetailsContainer.innerHTML = '<p class="text-red-500">Limite de 20 filhos atingido.</p>';
    }
}


// Event listeners for son/daughter count inputs to dynamically update fields
cidadaoSonsInput.addEventListener('input', (e) => {
    // Basic validation: ensure non-negative integer
    let value = parseInt(e.target.value);
    if (isNaN(value) || value < 0) {
        value = 0;
        e.target.value = 0; // Correct input visually
    }
     if (value > 10) { // Limit for each field (e.g., 10 sons, 10 daughters)
        value = 10;
        e.target.value = 10;
        showToast('Número máximo de 10 filhos atingido.', 'error');
    }
    generateChildrenFields(value, cidadaoDaughtersInput.value);
});
cidadaoDaughtersInput.addEventListener('input', (e) => {
     // Basic validation: ensure non-negative integer
    let value = parseInt(e.target.value);
    if (isNaN(value) || value < 0) {
        value = 0;
        e.target.value = 0; // Correct input visually
    }
     if (value > 10) { // Limit for each field
        value = 10;
        e.target.value = 10;
         showToast('Número máximo de 10 filhas atingido.', 'error');
    }
    generateChildrenFields(cidadaoSonsInput.value, value);
});


// Save Cidadao (Add or Update)
cidadaoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
        showToast('Você precisa estar logado para salvar.', 'error');
        return;
    }

    // Basic Form Validation (Example: Check required fields)
    const requiredFields = ['cidadao-name', 'cidadao-email']; // Add other required field IDs
    let isValid = true;
    requiredFields.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input && !input.value.trim()) {
            input.classList.add('border-red-500'); // Highlight empty required field
            isValid = false;
        } else if (input) {
            input.classList.remove('border-red-500'); // Remove highlight if valid
        }
    });

    if (!isValid) {
        showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
        return;
    }


    saveBtn.disabled = true;
    saveBtn.innerHTML = '<svg class="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Salvando...';

    let photoUrl = cidadaoPhotoUrlInput.value.trim(); // Get URL from input
    const file = cidadaoPhotoUploadInput.files[0];

    try {
        // Upload photo if a file is selected
        if (file) {
            const filePath = `user_photos/${currentUser.uid}/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, filePath);
            console.log("Uploading photo to:", filePath);
            const snapshot = await uploadBytes(storageRef, file);
            photoUrl = await getDownloadURL(snapshot.ref);
            console.log("Photo uploaded successfully:", photoUrl);
        } else {
             console.log("No new photo file selected, using URL:", photoUrl);
        }

        // Collect children details
        const children = [];
        const numSons = parseInt(cidadaoSonsInput.value) || 0;
        const numDaughters = parseInt(cidadaoDaughtersInput.value) || 0;
        const totalChildren = numSons + numDaughters;

        for (let i = 0; i < totalChildren; i++) {
             // Find the inputs for the current child index
             const nameInput = document.getElementById(`child-name-${i}`);
             const dobInput = document.getElementById(`child-dob-${i}`);

             // Check if both inputs were found (they should be if generateChildrenFields worked)
            if (nameInput && dobInput) {
                const childName = nameInput.value.trim();
                const childDob = dobInput.value; // Keep as YYYY-MM-DD string

                // Only add child if name is provided (DOB is optional)
                if (childName) {
                     children.push({
                        name: childName,
                        dob: childDob || null // Store as null if empty
                    });
                } else if (childDob) {
                     // Optionally handle case where only DOB is entered - maybe add with a placeholder name?
                     // For now, we require a name.
                     console.warn(`Child ${i+1} skipped: Name is required.`);
                }
            } else {
                 console.warn(`Inputs for child ${i+1} not found.`);
            }
        }
         console.log("Collected children data:", children);


        const cidadaoData = {
            name: document.getElementById('cidadao-name').value.trim(),
            email: document.getElementById('cidadao-email').value.trim().toLowerCase(), // Normalize email
            dob: document.getElementById('cidadao-dob').value || null, // Store as null if empty
            sexo: document.getElementById('cidadao-sexo').value,
            profissao: document.getElementById('cidadao-profissao').value.trim(),
            localTrabalho: document.getElementById('cidadao-local-trabalho').value.trim(), // Corrected field name
            type: document.getElementById('cidadao-type').value,
            cpf: document.getElementById('cidadao-cpf').value.replace(/\D/g, ''), // Store only numbers
            rg: document.getElementById('cidadao-rg').value.replace(/\D/g,''), // Store only numbers/letters if needed
            voterId: document.getElementById('cidadao-voterid').value.replace(/\D/g, ''), // Corrected field name, store only numbers
            phone: document.getElementById('cidadao-phone').value.replace(/\D/g, ''), // Store only numbers
            whatsapp: document.getElementById('cidadao-whatsapp').checked,
            cep: document.getElementById('cidadao-cep').value.replace(/\D/g, ''), // Store only numbers
            logradouro: document.getElementById('cidadao-logradouro').value.trim(),
            numero: document.getElementById('cidadao-numero').value.trim(),
            complemento: document.getElementById('cidadao-complemento').value.trim(),
            bairro: document.getElementById('cidadao-bairro').value.trim(),
            cidade: document.getElementById('cidadao-cidade').value.trim(),
            estado: document.getElementById('cidadao-estado').value.trim().toUpperCase(), // Normalize state
            leader: document.getElementById('cidadao-leader').value, // This stores the name
            sons: numSons,
            daughters: numDaughters,
            children: children, // Add collected children data
            photoUrl: photoUrl || null, // Store as null if empty string
            userId: currentUser.uid, // Associate with the current user
            // Add/Update timestamps
            updatedAt: serverTimestamp() // Always update 'updatedAt'
        };

        // Add createdAt only if creating a new document
        if (!currentCidadaoId) {
             cidadaoData.createdAt = serverTimestamp();
        }

         console.log("Saving cidadao data:", cidadaoData);


        if (currentCidadaoId) {
            // Update existing document
            console.log("Updating document ID:", currentCidadaoId);
            const docRef = doc(db, `users/${currentUser.uid}/cidadaos`, currentCidadaoId);
            // Use updateDoc for partial updates, setDoc with merge overwrites fields not included
            await updateDoc(docRef, cidadaoData);
            showToast('Cidadão atualizado com sucesso!');
        } else {
            // Add new document
             console.log("Adding new document.");
            const docRef = await addDoc(collection(db, `users/${currentUser.uid}/cidadaos`), cidadaoData);
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
     if (!currentUser || !id) return;
    try {
         console.log("Attempting to fetch cidadao for edit, ID:", id);
         const docRef = doc(db, `users/${currentUser.uid}/cidadaos`, id);
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

    // --- Safer Event Handling for Confirmation ---
    // Define named functions for listeners
    const handleConfirm = () => {
        deleteCidadao(id);
        closeConfirmationModal();
        removeConfirmationListeners(); // Clean up listeners
    };
    const handleCancel = () => {
        closeConfirmationModal();
        removeConfirmationListeners(); // Clean up listeners
    };

    // Function to remove listeners
    const removeConfirmationListeners = () => {
        confirmDeleteBtn.removeEventListener('click', handleConfirm);
        cancelDeleteBtn.removeEventListener('click', handleCancel);
        // Also remove listener for clicking outside modal if added specifically here
    };

    // Remove any previous listeners before adding new ones
    removeConfirmationListeners();

    // Add new listeners
    confirmDeleteBtn.addEventListener('click', handleConfirm);
    cancelDeleteBtn.addEventListener('click', handleCancel);

    // Optional: Add listener to close on outside click
    // confirmationModal.addEventListener('click', handleOutsideClick);
    // const handleOutsideClick = (e) => { if (e.target === confirmationModal) handleCancel(); };
}

// Close Confirmation Modal
function closeConfirmationModal() {
    confirmationModal.classList.add('hidden');
    // Consider removing listeners here as well, although handled in confirmDeleteCidadao now
}


// Delete Cidadao
async function deleteCidadao(id) {
    if (!currentUser || !id) return;
    console.log("Attempting to delete cidadao ID:", id);
    try {
        // NOTE: Firebase Security Rules should ideally handle cascading deletes or prevent deletion if relations exist.
        // The check below is a client-side safeguard but not foolproof.
        // It's generally better *not* to delete related data automatically unless explicitly required.
        // Let's just delete the citizen for now.

        /* // Optional: Client-side check for associated demandas (can be slow/incomplete)
        console.log("Checking for associated demandas before deleting cidadao:", id);
        const q = query(collection(db, `users/${currentUser.uid}/demandas`), where("cidadaoId", "==", id));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
             console.warn(`Deletion blocked: ${querySnapshot.size} demanda(s) associated with cidadao ID:`, id);
             showToast(`Não é possível excluir. Existem ${querySnapshot.size} demanda(s) associada(s) a este cidadão. Exclua as demandas primeiro.`, 'error');
             return; // Stop deletion
        }
        */

        console.log("Proceeding with deletion of cidadao ID:", id);
        const docRef = doc(db, `users/${currentUser.uid}/cidadaos`, id);
        await deleteDoc(docRef);
        console.log("Cidadao deleted successfully:", id);
        showToast('Cidadão excluído com sucesso!');
        // The onSnapshot listener will automatically update the UI (renderCidadaos)
    } catch (error) {
        console.error("Erro ao excluir cidadão:", id, error);
        showToast('Erro ao excluir cidadão.', 'error');
    }
}


// --- Cidadao Details Modal ---
async function showCidadaoDetails(id) {
     if (!currentUser || !id) return;
    try {
        console.log("Fetching details for cidadao ID:", id);
        const docRef = doc(db, `users/${currentUser.uid}/cidadaos`, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const cidadao = { id: docSnap.id, ...docSnap.data() };
            console.log("Cidadao details found:", cidadao);


            // Populate basic details (with safety checks for missing fields)
            document.getElementById('details-name').textContent = cidadao.name || 'Nome não disponível';
            document.getElementById('details-type').textContent = cidadao.type || 'Tipo não informado';
            document.getElementById('details-email').textContent = cidadao.email || '-';
             document.getElementById('details-phone').textContent = cidadao.phone ? formatPhone(cidadao.phone) + (cidadao.whatsapp ? ' (WhatsApp)' : '') : '-';


            // Construct full address safely
            const addressParts = [
                cidadao.logradouro,
                cidadao.numero,
                cidadao.complemento,
                cidadao.bairro,
                cidadao.cidade,
                cidadao.estado,
                 cidadao.cep ? `CEP: ${formatCEP(cidadao.cep)}` : null // Add formatted CEP
            ].filter(part => part); // Filter out empty or null parts
            document.getElementById('details-address').textContent = addressParts.join(', ') || 'Endereço não informado';


            document.getElementById('details-cpf').textContent = cidadao.cpf ? formatCPF(cidadao.cpf) : '-';
            document.getElementById('details-rg').textContent = cidadao.rg || '-';
            document.getElementById('details-voterid').textContent = cidadao.voterId ? formatVoterID(cidadao.voterId) : '-'; // Corrected field name
             // Format date robustly
            let dobFormatted = '-';
            if (cidadao.dob) {
                try {
                     // Ensure UTC interpretation if stored as YYYY-MM-DD
                     const dobDate = new Date(`${cidadao.dob}T00:00:00Z`); // Treat as UTC midnight
                     if (!isNaN(dobDate.getTime())) {
                        dobFormatted = dobDate.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' });
                     }
                } catch (e) { console.error("Error formatting DOB:", cidadao.dob, e); }
            }
             document.getElementById('details-dob').textContent = dobFormatted;


            document.getElementById('details-sexo').textContent = cidadao.sexo || '-';
            document.getElementById('details-profissao').textContent = cidadao.profissao || '-';
            document.getElementById('details-local-trabalho').textContent = cidadao.localTrabalho || '-'; // Corrected field name
            document.getElementById('details-leader').textContent = cidadao.leader || '-';

            // Display children details
            const childrenContainer = document.getElementById('details-children');
            childrenContainer.innerHTML = ''; // Clear previous
            if (cidadao.children && cidadao.children.length > 0) {
                 const childrenTitle = document.createElement('p');
                 childrenTitle.className = 'font-semibold text-gray-500 text-sm mb-1 mt-2'; // Adjusted style
                 childrenTitle.textContent = `FILHOS (${cidadao.children.length})`;
                 childrenContainer.appendChild(childrenTitle);
                 const childrenList = document.createElement('ul');
                 childrenList.className = 'list-none space-y-1 text-sm'; // Use space-y for spacing
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
                 // Optionally show counts if no details but counts exist
                 const sonCount = cidadao.sons || 0;
                 const daughterCount = cidadao.daughters || 0;
                 if (sonCount > 0 || daughterCount > 0) {
                    childrenContainer.innerHTML = `<p class="text-sm mt-2">Filhos: ${sonCount}, Filhas: ${daughterCount} (detalhes não cadastrados).</p>`;
                 } else {
                    childrenContainer.innerHTML = '<p class="text-sm mt-2">Sem filhos cadastrados.</p>';
                 }
            }


             // Display photo
            const photoDiv = document.getElementById('details-photo');
            const initialLetterDetails = cidadao.name ? cidadao.name.charAt(0).toUpperCase() : '?';
            photoDiv.innerHTML = ''; // Clear previous photo/initial
            // Reset classes, ensure consistent styling
            photoDiv.className = 'w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-4xl overflow-hidden border border-gray-300';
            if (cidadao.photoUrl) {
                const img = document.createElement('img');
                img.src = cidadao.photoUrl;
                img.alt = cidadao.name;
                img.className = 'w-full h-full object-cover';
                // Add fallback directly to img element
                img.onerror = () => {
                     console.warn("Failed to load image:", cidadao.photoUrl);
                     photoDiv.innerHTML = `<span class="font-bold text-4xl">${initialLetterDetails}</span>`; // Show initial on error
                     photoDiv.classList.add('bg-slate-200', 'text-slate-500'); // Ensure background if image fails
                };
                photoDiv.appendChild(img);
                photoDiv.classList.remove('bg-slate-200', 'text-slate-500'); // Remove background if image might load
            } else {
                photoDiv.innerHTML = `<span class="font-bold text-4xl">${initialLetterDetails}</span>`; // Show initial if no URL
            }


            // --- Button Actions ---
            // Remove previous listeners before adding new ones
            const newViewMapBtn = detailsViewMapBtn.cloneNode(true);
            detailsViewMapBtn.parentNode.replaceChild(newViewMapBtn, detailsViewMapBtn);
            detailsViewMapBtn = newViewMapBtn;

            const newShareBtn = detailsShareLocationBtn.cloneNode(true);
            detailsShareLocationBtn.parentNode.replaceChild(newShareBtn, detailsShareLocationBtn);
            detailsShareLocationBtn = newShareBtn;


             detailsViewMapBtn.onclick = () => {
                 // Construct address robustly for map
                 const mapAddressParts = [
                    cidadao.logradouro, cidadao.numero, cidadao.bairro, cidadao.cidade, cidadao.estado, cidadao.cep
                 ].filter(Boolean); // Only non-empty parts
                 if (mapAddressParts.length >= 2) { // Need at least street/city or CEP
                     const addressString = mapAddressParts.join(', ');
                     console.log("Opening map for address:", addressString);
                     openMapModal([{ name: cidadao.name, address: addressString, photoUrl: cidadao.photoUrl }]);
                 } else {
                     showToast("Endereço insuficiente para exibir no mapa.", "error");
                 }
             };

             detailsShareLocationBtn.onclick = () => {
                 shareLocation(cidadao);
             };


            // Show modal
            cidadaoDetailsModal.classList.remove('hidden');
            setTimeout(() => {
                const modalContent = cidadaoDetailsModal.querySelector('.bg-white'); // Target the actual content div
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
        }, 200); // Match transition duration
     } else {
         cidadaoDetailsModal.classList.add('hidden'); // Fallback
     }
     // It's generally better to remove specific listeners when the modal closes
     // or use event delegation if many buttons inside the modal need handling.
     // For these two specific buttons, cloning/replacing on open is simpler.
}

closeDetailsModalBtn.addEventListener('click', closeCidadaoDetailsModal);
cidadaoDetailsModal.addEventListener('click', (e) => {
    // Close only if the click is on the background overlay itself
    if (e.target === cidadaoDetailsModal) {
        closeCidadaoDetailsModal();
    }
});


// --- Filters Event Listeners ---
searchInput.addEventListener('input', renderCidadaos);
filterType.addEventListener('change', renderCidadaos);
filterBairro.addEventListener('change', renderCidadaos);
filterLeader.addEventListener('change', renderCidadaos);
filterSexo.addEventListener('change', renderCidadaos); // Listener for Sexo
filterFaixaEtaria.addEventListener('change', renderCidadaos); // Listener for Faixa Etária

clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterType.value = '';
    filterBairro.value = '';
    filterLeader.value = '';
    filterSexo.value = ''; // Clear Sexo
    filterFaixaEtaria.value = ''; // Clear Faixa Etária
    renderCidadaos();
});


// --- Demandas ---

// Populate Demanda Filters (specifically the leader dropdown)
function populateDemandaFilters() {
     // Only proceed if allCidadaos has data
    if (!allCidadaos) {
         demandaFilterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>';
        return;
    }

     const leaders = allCidadaos.filter(c => c.type === 'Liderança').map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));
     const selectedDemandaLeader = demandaFilterLeader.value; // Keep current selection

     demandaFilterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>';
     leaders.forEach(leader => {
         const optionDemandaFilter = document.createElement('option');
         optionDemandaFilter.value = leader.name; // Filter by name (assuming leader name is unique enough for filtering)
         optionDemandaFilter.textContent = leader.name;
         demandaFilterLeader.appendChild(optionDemandaFilter);
     });
      demandaFilterLeader.value = selectedDemandaLeader; // Restore selection
}

// Function to get filtered demandas
function getFilteredDemandas() {
    const status = demandaFilterStatus.value;
    const leaderName = demandaFilterLeader.value; // Filter by leader's name

    return allDemandas.filter(demanda => {
        const statusMatch = !status || demanda.status === status;

        // Find the citizen associated with the demanda
        const cidadao = allCidadaos.find(c => c.id === demanda.cidadaoId);
        // Match if leader filter is empty OR if the citizen exists AND their leader matches the filter
        const leaderMatch = !leaderName || (cidadao && cidadao.leader === leaderName);

        return statusMatch && leaderMatch;
    });
}


// Render Demandas List
function renderDemandas() {
    console.log("Rendering demandas list...");
    allDemandasList.innerHTML = ''; // Clear list
    const filteredDemandas = getFilteredDemandas();
     console.log("Filtered demandas count:", filteredDemandas.length);

     if (filteredDemandas.length === 0) {
        allDemandasList.innerHTML = '<p class="text-gray-500 text-center py-10">Nenhuma demanda encontrada com os filtros selecionados.</p>';
        return;
    }

    filteredDemandas.forEach(demanda => {
        const cidadao = allCidadaos.find(c => c.id === demanda.cidadaoId); // Find associated citizen
        const cidadaoName = cidadao ? cidadao.name : 'Cidadão Desconhecido';
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-start gap-4 hover:shadow-md transition-shadow cursor-pointer demanda-card';
        card.dataset.id = demanda.id; // Store demanda ID for click event

        let statusClass = 'bg-yellow-100 text-yellow-800'; // Pending default
        let statusText = 'Pendente';
        if (demanda.status === 'inprogress') {
            statusClass = 'bg-blue-100 text-blue-800';
            statusText = 'Em Andamento';
        } else if (demanda.status === 'completed') {
            statusClass = 'bg-green-100 text-green-800';
            statusText = 'Concluída';
        }

        const createdAtDate = demanda.createdAt?.toDate ? demanda.createdAt.toDate() : new Date(); // Fallback to now if timestamp is invalid/missing
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

     // Add event listener using delegation
    addDemandaCardListener();
}

function addDemandaCardListener() {
    allDemandasList.removeEventListener('click', handleDemandaCardClick); // Remove previous before adding
    allDemandasList.addEventListener('click', handleDemandaCardClick);
}

function handleDemandaCardClick(e) {
     const card = e.target.closest('.demanda-card');
    if (card && card.dataset.id) {
        console.log("Demanda card clicked, ID:", card.dataset.id);
        openDemandaDetailsModal(card.dataset.id);
    }
}


// Open Demanda Modal (for adding)
function openDemandaModal(cidadaoId = null) {
     if (!allCidadaos || allCidadaos.length === 0) {
        showToast('Nenhum cidadão cadastrado para associar a demanda.', 'error');
        return;
     }

    demandaForm.reset();
    currentDemandaId = null;
    demandaModalTitle.textContent = 'Adicionar Nova Demanda';

    // Populate citizen dropdown
    demandaCidadaoSelect.innerHTML = '<option value="">Selecione um Cidadão</option>'; // Clear and add placeholder
    // Sort citizens by name for the dropdown
    const sortedCidadaos = [...allCidadaos].sort((a, b) => a.name.localeCompare(b.name));
    sortedCidadaos.forEach(cidadao => {
        const option = document.createElement('option');
        option.value = cidadao.id;
        option.textContent = cidadao.name;
        demandaCidadaoSelect.appendChild(option);
    });

    // Pre-select if cidadaoId is provided (e.g., adding from details modal)
    if (cidadaoId) {
        demandaCidadaoSelect.value = cidadaoId;
    }

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
    if (e.target === demandaModal) {
        closeDemandaModal();
    }
});


// Save Demanda
demandaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
        showToast('Você precisa estar logado.', 'error');
        return;
    }
    const cidadaoIdSelected = demandaCidadaoSelect.value;
    const title = demandaTitleInput.value.trim();

     // Validation
    if (!cidadaoIdSelected) {
        showToast('Por favor, selecione um cidadão.', 'error');
        demandaCidadaoSelect.focus(); // Focus on the select element
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
        status: 'pending', // Default status
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        notes: [] // Initialize notes array
    };

    try {
        console.log("Adding new demanda:", demandaData);
        const docRef = await addDoc(collection(db, `users/${currentUser.uid}/demandas`), demandaData);
        console.log("Demanda added with ID:", docRef.id);
        showToast('Demanda adicionada com sucesso!');
        closeDemandaModal();
        // UI will update via onSnapshot
    } catch (error) {
        console.error("Erro ao salvar demanda:", error);
        showToast('Erro ao salvar demanda.', 'error');
    } finally {
        saveDemandaBtn.disabled = false;
        saveDemandaBtn.textContent = 'Salvar Demanda';
    }
});


// --- Demanda Details Modal ---

let currentDemandaDetailsListener = null; // Listener specific to the details modal

async function openDemandaDetailsModal(demandaId) {
    if (!currentUser || !demandaId) return;
    currentDemandaId = demandaId; // Store globally for actions within the modal

    // Unsubscribe from any previous details listener
    if (currentDemandaDetailsListener) {
        console.log("Unsubscribing previous demanda details listener.");
        currentDemandaDetailsListener();
        currentDemandaDetailsListener = null;
    }


    console.log("Opening details for demanda ID:", demandaId);
    const demandaDocRef = doc(db, `users/${currentUser.uid}/demandas`, demandaId);

    // Set up a real-time listener for this specific demanda
    currentDemandaDetailsListener = onSnapshot(demandaDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const demanda = { id: docSnap.id, ...docSnap.data() };
            console.log("Demanda details updated:", demanda);
            populateDemandaDetails(demanda);

            // Show modal only after first successful data load
            if (demandaDetailsModal.classList.contains('hidden')) {
                 demandaDetailsModal.classList.remove('hidden');
            }
        } else {
            // Handle case where the demanda was deleted while modal was open
             console.warn("Demanda document not found (possibly deleted):", demandaId);
            showToast("Demanda não encontrada. Pode ter sido excluída.", "error");
            closeDemandaDetailsModal(); // Close the modal
        }
    }, (error) => {
         console.error("Error listening to demanda details:", error);
         showToast("Erro ao carregar detalhes da demanda.", "error");
         closeDemandaDetailsModal(); // Close modal on error
    });
}

function populateDemandaDetails(demanda) {
    const cidadao = allCidadaos.find(c => c.id === demanda.cidadaoId);
    const cidadaoName = cidadao ? cidadao.name : 'Cidadão Desconhecido';

    document.getElementById('details-demanda-title').textContent = demanda.title || 'Título Indisponível';
    document.getElementById('details-demanda-cidadao').textContent = `Para: ${cidadaoName}`;
    document.getElementById('details-demanda-description').textContent = demanda.description || 'Nenhuma descrição fornecida.';
    document.getElementById('details-demanda-status').value = demanda.status || 'pending';

    // Render notes
    const notesList = document.getElementById('demanda-notes-list');
    notesList.innerHTML = ''; // Clear previous notes
    if (demanda.notes && demanda.notes.length > 0) {
        // Sort notes by timestamp, most recent first (assuming 'timestamp' exists)
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
     // Unsubscribe listener when modal closes
    if (currentDemandaDetailsListener) {
        console.log("Unsubscribing demanda details listener on close.");
        currentDemandaDetailsListener();
        currentDemandaDetailsListener = null;
    }
    demandaDetailsModal.classList.add('hidden');
    currentDemandaId = null; // Clear current demanda ID
    // Reset forms inside modal if necessary
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
    if (!currentUser || !currentDemandaId || !newStatus) return;

    console.log(`Updating status for demanda ${currentDemandaId} to ${newStatus}`);
    const demandaDocRef = doc(db, `users/${currentUser.uid}/demandas`, currentDemandaId);
    try {
        await updateDoc(demandaDocRef, {
            status: newStatus,
            updatedAt: serverTimestamp()
        });
        showToast('Status da demanda atualizado!');
        // UI updates via onSnapshot listener in openDemandaDetailsModal
    } catch (error) {
        console.error("Erro ao atualizar status da demanda:", error);
        showToast('Erro ao atualizar status.', 'error');
        // Optionally revert dropdown
        // e.target.value = originalStatus; // Need to store original status on open
    }
});


// Add Note to Demanda
addNoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || !currentDemandaId) return;

    const noteText = document.getElementById('new-note-text').value.trim();
    if (!noteText) {
        showToast('Por favor, escreva o acompanhamento.', 'error');
        return;
    }

    const demandaDocRef = doc(db, `users/${currentUser.uid}/demandas`, currentDemandaId);

    try {
        const demandaDoc = await getDoc(demandaDocRef); // Get current data first
        if (!demandaDoc.exists()) {
             showToast('Demanda não encontrada para adicionar nota.', 'error');
             return;
        }

        const currentNotes = demandaDoc.data().notes || []; // Get existing notes or empty array
        const newNote = {
            text: noteText,
            timestamp: serverTimestamp() // Use server timestamp
        };

        await updateDoc(demandaDocRef, {
            notes: [...currentNotes, newNote], // Append new note to the array
            updatedAt: serverTimestamp()
        });

        showToast('Acompanhamento adicionado!');
        addNoteForm.reset(); // Clear the textarea
        // UI updates via onSnapshot listener in openDemandaDetailsModal

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

     // --- Safer Event Handling ---
     const handleConfirmDeleteDemanda = async () => {
         if (currentUser && currentDemandaId) {
             console.log("Confirming delete for demanda ID:", currentDemandaId);
             const demandaToDelete = currentDemandaId; // Store ID before modal closes
             closeConfirmationModal(); // Close confirmation first
             closeDemandaDetailsModal(); // Close details modal as well

             try {
                const docRef = doc(db, `users/${currentUser.uid}/demandas`, demandaToDelete);
                await deleteDoc(docRef);
                console.log("Demanda deleted successfully:", demandaToDelete);
                showToast('Demanda excluída com sucesso!');
                // UI updates via main onSnapshot listener for allDemandas
            } catch (error) {
                console.error("Erro ao excluir demanda:", demandaToDelete, error);
                showToast('Erro ao excluir demanda.', 'error');
            }
         }
         removeDemandaConfirmationListeners(); // Clean up
     };

     const handleCancelDeleteDemanda = () => {
         closeConfirmationModal();
         removeDemandaConfirmationListeners(); // Clean up
     };

     const removeDemandaConfirmationListeners = () => {
        confirmDeleteBtn.removeEventListener('click', handleConfirmDeleteDemanda);
        cancelDeleteBtn.removeEventListener('click', handleCancelDeleteDemanda);
     };

     // Remove previous listeners and add new ones
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
    const filteredCidadaos = getFilteredCidadaos(); // Get currently filtered data

    if (filteredCidadaos.length === 0) {
        showToast("Nenhum cidadão para gerar relatório com os filtros atuais.", "error");
        return;
    }

    // Create HTML content for the report
    let reportHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Relatório de Cidadãos - Gestor Valente</title>
            <style>
                body { font-family: 'Inter', sans-serif; margin: 20px; font-size: 10pt; }
                h1 { text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; font-size: 16pt; }
                table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                th, td { border: 1px solid #ddd; padding: 6px; text-align: left; vertical-align: top; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .logo { text-align: center; margin-bottom: 15px; font-size: 14pt; font-weight: bold; }
                 .logo span { color: #3b82f6; } /* Blue color for Valente */
                .footer { text-align: center; margin-top: 20px; font-size: 8pt; color: #777; }
                .total { margin-top: 10px; font-weight: bold; }
                @media print {
                    body { margin: 1cm; font-size: 9pt; } /* Adjust margins and font for print */
                    h1 { font-size: 14pt; }
                    .logo { font-size: 12pt; }
                     th, td { padding: 4px; }
                     .footer { position: fixed; bottom: 0.5cm; width: 100%; }
                     /* Avoid breaking rows across pages */
                     tr { page-break-inside: avoid; }
                     /* Hide buttons or other non-print elements if they existed */
                     .no-print { display: none; }
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
        const fullAddress = [
            c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.estado, c.cep ? `CEP: ${formatCEP(c.cep)}` : null
        ].filter(Boolean).join(', ') || '-';

        let dobReportFormatted = '-';
         if (c.dob) {
             try {
                 const dobDate = new Date(`${c.dob}T00:00:00Z`);
                 if (!isNaN(dobDate.getTime())) {
                    dobReportFormatted = dobDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
                 }
             } catch (e) { /* Ignore formatting error for report */ }
         }

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

    // Open a new window and print
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
        reportWindow.document.write(reportHtml);
        reportWindow.document.close(); // Important for some browsers
        // Delay print slightly to allow content to render
        setTimeout(() => {
             reportWindow.focus(); // Focus the new window
             reportWindow.print();
             // reportWindow.close(); // Optionally close after print dialog
        }, 500); // 500ms delay
    } else {
        showToast("Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.", "error");
    }
}


// --- Maps ---

// Initialize Map
function initMap() {
    if (map) return; // Already initialized
    try {
        map = L.map(mapElement).setView([-22.9068, -43.1729], 10); // Default to Rio, adjust zoom

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        console.log("Map initialized.");
    } catch (error) {
        console.error("Error initializing Leaflet map:", error);
        showToast("Erro ao inicializar o mapa.", "error");
        mapElement.innerHTML = '<p class="text-red-500 p-4">Não foi possível carregar o mapa.</p>'; // Show error in map div
    }
}

// Open Map Modal and Geocode Addresses
async function openMapModal(cidadaosToShow) {
    if (cidadaosToShow.length === 0) {
        showToast("Nenhum cidadão selecionado para exibir no mapa.", "error");
        return;
    }

    mapModal.classList.remove('hidden');
    initMap(); // Initialize map if not already done

    if (!map) {
         console.error("Map object is not available.");
         closeMapModal(); // Close modal if map failed to init
         return; // Stop processing
    }

    // Immediately invalidate size after showing modal and initializing
    // Use requestAnimationFrame to ensure map container is visible and sized
     requestAnimationFrame(() => {
        map.invalidateSize();
        console.log("Map size invalidated.");
         // Clear previous markers
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];
         console.log("Previous markers cleared.");

        // Geocode addresses and add markers
        geocodeAndAddMarkers(cidadaosToShow);
    });
}


// Geocode addresses and add markers (using Nominatim - OpenStreetMap's geocoder)
async function geocodeAndAddMarkers(cidadaos) {
    if (!map) return;
    console.log("Geocoding addresses for", cidadaos.length, "cidadaos.");

    const bounds = L.latLngBounds(); // To fit map around markers
    let markersAdded = 0;

    // Use Promise.all to handle multiple async geocoding requests
    const geocodePromises = cidadaos.map(async (cidadao) => {
        if (!cidadao.address) {
            console.warn("Skipping cidadao due to missing address:", cidadao.name);
            return null; // Skip if no address
        }

        const query = encodeURIComponent(cidadao.address + ", Brasil"); // Add country for better results
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`;
        console.log("Geocoding URL:", url);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Nominatim request failed: ${response.statusText}`);
            }
            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);
                console.log(`Geocoded '${cidadao.name}' to [${lat}, ${lon}]`);

                // Create custom icon with image or initial
                let iconHtml = `<div class="map-marker-content bg-white border border-gray-400 rounded-full shadow-md flex items-center justify-center font-bold" style="width: 30px; height: 30px; font-size: 14px; overflow: hidden;">`;
                if (cidadao.photoUrl) {
                    // Use img inside, handle potential errors
                    iconHtml += `<img src="${cidadao.photoUrl}" alt="${cidadao.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.onerror=null; this.parentElement.innerHTML='${cidadao.name.charAt(0).toUpperCase()}'; this.parentElement.classList.add('bg-slate-200', 'text-slate-500');">`;
                } else {
                    iconHtml += cidadao.name.charAt(0).toUpperCase();
                     // Add background if no image
                    iconHtml = iconHtml.replace('class="map-marker-content', 'class="map-marker-content bg-slate-200 text-slate-500');
                }
                 iconHtml += `</div>`;


                 const customIcon = L.divIcon({
                    className: 'custom-map-marker', // Class for potential global styling
                    html: iconHtml,
                    iconSize: [30, 30], // Size of the div
                    iconAnchor: [15, 30], // Point of the icon which corresponds to marker's location
                    popupAnchor: [0, -30] // Point from which the popup should open relative to the iconAnchor
                });

                const marker = L.marker([lat, lon], {icon: customIcon}).addTo(map);
                marker.bindPopup(`<b>${cidadao.name}</b><br>${result.display_name}`);
                markers.push(marker);
                bounds.extend([lat, lon]);
                markersAdded++;
                return marker; // Return marker if needed later
            } else {
                console.warn("Geocoding failed or no results for:", cidadao.address);
                return null;
            }
        } catch (error) {
            console.error("Error during geocoding for:", cidadao.address, error);
            return null;
        }
    });

     // Wait for all geocoding attempts to finish
    await Promise.all(geocodePromises);


    console.log("Markers added:", markersAdded);
    if (markersAdded > 0) {
        console.log("Fitting map bounds.");
         map.fitBounds(bounds, { padding: [50, 50] }); // Add padding around bounds
    } else if (cidadaos.length > 0) {
        // Only show toast if we expected markers but got none
        showToast("Não foi possível localizar os endereços no mapa.", "error");
        // Optionally center on a default location again
        // map.setView([-22.9068, -43.1729], 10);
    }
}


// Close Map Modal
function closeMapModal() {
    mapModal.classList.add('hidden');
     // Optional: Clear markers when closing? Or leave them for next open?
     // markers.forEach(marker => map.removeLayer(marker));
     // markers = [];
     // console.log("Map markers cleared on close.");
}

viewMapBtn.addEventListener('click', () => {
     const filteredCidadaos = getFilteredCidadaos();
     if (filteredCidadaos.length > 0) {
          const cidadaosWithAddress = filteredCidadaos
                .map(c => ({
                    name: c.name,
                    // Construct address string robustly
                    address: [c.logradouro, c.numero, c.bairro, c.cidade, c.estado, c.cep].filter(Boolean).join(', '),
                    photoUrl: c.photoUrl
                 }))
                .filter(c => c.address); // Only include those with some address info

            if (cidadaosWithAddress.length > 0) {
                openMapModal(cidadaosWithAddress);
            } else {
                 showToast("Nenhum dos cidadãos filtrados possui endereço cadastrado para exibir no mapa.", "error");
            }
     } else {
         showToast("Nenhum cidadão selecionado nos filtros para exibir no mapa.", "error");
     }
});

closeMapBtn.addEventListener('click', closeMapModal);
mapModal.addEventListener('click', (e) => {
    // Close only if clicking the background overlay
    if (e.target === mapModal) {
        closeMapModal();
    }
});


// Share Location
function shareLocation(cidadao) {
     const address = [
        cidadao.logradouro, cidadao.numero, cidadao.bairro, cidadao.cidade, cidadao.estado, cidadao.cep
     ].filter(Boolean).join(', ');

     if (!address) {
         showToast("Endereço não cadastrado para este cidadão.", "error");
         return;
     }

     const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
     const text = `Localização de ${cidadao.name}: ${mapsUrl}`;

     if (navigator.share) {
         navigator.share({
             title: `Localização de ${cidadao.name}`,
             text: `Aqui está a localização de ${cidadao.name}.`,
             url: mapsUrl,
         })
         .then(() => console.log('Partilha bem-sucedida'))
         .catch((error) => {
             console.error('Erro na partilha:', error);
             // Fallback to copy if share fails or is cancelled
             copyToClipboard(text);
         });
     } else {
         // Fallback for browsers without navigator.share
         copyToClipboard(text);
     }
 }

// Fallback: Copy text to clipboard
function copyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        // Use document.execCommand as navigator.clipboard might be restricted in iframes
        const successful = document.execCommand('copy');
        const msg = successful ? 'Localização copiada para a área de transferência!' : 'Não foi possível copiar a localização.';
        showToast(msg, successful ? 'success' : 'error');
    } catch (err) {
        console.error('Erro ao copiar para a área de transferência:', err);
        showToast('Erro ao copiar a localização.', 'error');
    }
    document.body.removeChild(textArea);
}



// --- Dashboard ---

function renderDashboard() {
     console.log("Rendering dashboard...");
    if (!currentUser || !allCidadaos || !allDemandas) {
         console.log("Dashboard render skipped: Missing data.");
         return; // Ensure data is loaded
    }

    // --- KPIs ---
    document.getElementById('dashboard-total-cidadaos').textContent = allCidadaos.length;
    document.getElementById('dashboard-total-demandas').textContent = allDemandas.length;

    // --- Charts ---
    renderCidadaosPorTipoChart();
    renderDemandasPorStatusChart();
    renderCidadaosPorBairroChart(); // New
    renderCidadaosPorSexoChart(); // New
    renderCidadaosPorFaixaEtariaChart(); // New


    // --- Lists ---
    renderAniversariantes();
    renderDemandasRecentes();

     console.log("Dashboard rendered.");
}

// Chart: Cidadãos por Tipo
function renderCidadaosPorTipoChart() {
    const ctx = document.getElementById('cidadaos-por-tipo-chart')?.getContext('2d');
    if (!ctx) return;


    const tipos = allCidadaos.reduce((acc, c) => {
        const tipo = c.type || 'Não Definido';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
    }, {});

    const labels = Object.keys(tipos);
    const data = Object.values(tipos);

     // Predefined color palette for consistency (add more if needed)
     const backgroundColors = [
        'rgba(59, 130, 246, 0.7)',  // Blue
        'rgba(16, 185, 129, 0.7)', // Green
        'rgba(239, 68, 68, 0.7)',   // Red
        'rgba(245, 158, 11, 0.7)',  // Amber
        'rgba(139, 92, 246, 0.7)',  // Violet
        'rgba(96, 165, 250, 0.7)',  // Sky
        'rgba(236, 72, 153, 0.7)'   // Pink
    ];
     const borderColors = backgroundColors.map(color => color.replace('0.7', '1'));


    // Destroy previous chart instance if it exists
    if (cidadaosPorTipoChartInstance) {
        cidadaosPorTipoChartInstance.destroy();
    }

    cidadaosPorTipoChartInstance = new Chart(ctx, {
        type: 'doughnut', // Changed to doughnut
        data: {
            labels: labels,
            datasets: [{
                label: 'Cidadãos por Tipo',
                data: data,
                 backgroundColor: backgroundColors.slice(0, labels.length),
                 borderColor: borderColors.slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
             responsive: true,
             maintainAspectRatio: false, // Allow chart to fill container height
             plugins: {
                 legend: {
                     position: 'bottom', // Move legend to bottom
                 },
                 tooltip: {
                    callbacks: {
                        label: function(context) {
                             let label = context.label || '';
                             if (label) {
                                label += ': ';
                             }
                             if (context.parsed !== null) {
                                // Calculate percentage
                                const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) + '%' : '0%';
                                label += `${context.parsed} (${percentage})`;
                             }
                             return label;
                        }
                    }
                 }
             }
        }
    });
}


// Chart: Demandas por Status
function renderDemandasPorStatusChart() {
    const ctx = document.getElementById('demandas-por-status-chart')?.getContext('2d');
    if (!ctx) return;


    const statusCounts = allDemandas.reduce((acc, d) => {
        const status = d.status || 'pending'; // Default to pending if missing
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, { pending: 0, inprogress: 0, completed: 0 }); // Initialize all statuses

    // Map internal status keys to user-friendly labels
    const statusLabels = {
        pending: 'Pendente',
        inprogress: 'Em Andamento',
        completed: 'Concluída'
    };

    const labels = Object.keys(statusCounts).map(key => statusLabels[key]);
    const data = Object.values(statusCounts);

    // Consistent colors for statuses
     const backgroundColors = {
        pending: 'rgba(245, 158, 11, 0.7)', // Amber
        inprogress: 'rgba(59, 130, 246, 0.7)', // Blue
        completed: 'rgba(16, 185, 129, 0.7)'  // Green
    };
    const borderColors = {
         pending: 'rgba(245, 158, 11, 1)',
         inprogress: 'rgba(59, 130, 246, 1)',
         completed: 'rgba(16, 185, 129, 1)'
    };


    // Destroy previous chart instance if it exists
    if (demandasPorStatusChartInstance) {
        demandasPorStatusChartInstance.destroy();
    }

    demandasPorStatusChartInstance = new Chart(ctx, {
        type: 'pie', // Changed to pie
        data: {
            labels: labels,
            datasets: [{
                label: 'Demandas por Status',
                data: data,
                 backgroundColor: Object.keys(statusCounts).map(key => backgroundColors[key]),
                 borderColor: Object.keys(statusCounts).map(key => borderColors[key]),
                borderWidth: 1
            }]
        },
         options: {
             responsive: true,
             maintainAspectRatio: false,
             plugins: {
                 legend: {
                     position: 'bottom',
                 },
                 tooltip: {
                     callbacks: {
                         label: function(context) {
                             let label = context.label || '';
                             if (label) { label += ': '; }
                             if (context.parsed !== null) {
                                 const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                 const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) + '%' : '0%';
                                 label += `${context.parsed} (${percentage})`;
                             }
                             return label;
                         }
                     }
                 }
             }
         }
    });
}

// Chart: Cidadãos por Bairro (Top 10)
function renderCidadaosPorBairroChart() {
    const ctx = document.getElementById('cidadaos-por-bairro-chart')?.getContext('2d');
    if (!ctx) return;

    const bairroCounts = allCidadaos.reduce((acc, c) => {
        const bairro = c.bairro || 'Não Informado';
        acc[bairro] = (acc[bairro] || 0) + 1;
        return acc;
    }, {});

    // Sort by count descending and take top 10
    const sortedBairros = Object.entries(bairroCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 10);

    const labels = sortedBairros.map(([bairro]) => bairro);
    const data = sortedBairros.map(([, count]) => count);

    // Use consistent bar colors
    const backgroundColor = 'rgba(75, 192, 192, 0.7)'; // Teal
    const borderColor = 'rgba(75, 192, 192, 1)';

    if (cidadaosPorBairroChartInstance) {
        cidadaosPorBairroChartInstance.destroy();
    }

    cidadaosPorBairroChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cidadãos por Bairro (Top 10)',
                data: data,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', // Make it a horizontal bar chart
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                     title: { display: true, text: 'Nº de Cidadãos' }
                },
                 y: {
                     title: { display: false } // Bairro names are labels
                 }
            },
            plugins: {
                legend: {
                    display: false // Hide legend for single dataset bar chart
                },
                 tooltip: {
                    callbacks: {
                         label: function(context) {
                             return ` ${context.parsed.x} Cidadãos`; // Show count on hover
                         }
                    }
                 }
            }
        }
    });
}

// Chart: Cidadãos por Sexo
function renderCidadaosPorSexoChart() {
    const ctx = document.getElementById('cidadaos-por-sexo-chart')?.getContext('2d');
    if (!ctx) return;

    const sexoCounts = allCidadaos.reduce((acc, c) => {
        const sexo = c.sexo || 'Não Informar';
        acc[sexo] = (acc[sexo] || 0) + 1;
        return acc;
    }, { 'Masculino': 0, 'Feminino': 0, 'Outro': 0, 'Não Informar': 0 }); // Initialize keys

    const labels = Object.keys(sexoCounts);
    const data = Object.values(sexoCounts);

    // Define colors for consistency
     const backgroundColors = {
        'Masculino': 'rgba(54, 162, 235, 0.7)', // Blue
        'Feminino': 'rgba(255, 99, 132, 0.7)',  // Pink
        'Outro': 'rgba(255, 206, 86, 0.7)',    // Yellow
        'Não Informar': 'rgba(153, 102, 255, 0.7)' // Purple
    };
    const borderColors = {
         'Masculino': 'rgba(54, 162, 235, 1)',
         'Feminino': 'rgba(255, 99, 132, 1)',
         'Outro': 'rgba(255, 206, 86, 1)',
         'Não Informar': 'rgba(153, 102, 255, 1)'
    };

    if (cidadaosPorSexoChartInstance) {
        cidadaosPorSexoChartInstance.destroy();
    }

    cidadaosPorSexoChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Cidadãos por Sexo',
                data: data,
                backgroundColor: labels.map(label => backgroundColors[label]),
                borderColor: labels.map(label => borderColors[label]),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
             plugins: {
                 legend: {
                     position: 'bottom',
                 },
                tooltip: {
                    callbacks: {
                         label: function(context) {
                             let label = context.label || '';
                             if (label) { label += ': '; }
                             if (context.parsed !== null) {
                                 const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                 const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) + '%' : '0%';
                                 label += `${context.parsed} (${percentage})`;
                             }
                             return label;
                         }
                    }
                }
             }
        }
    });
}


// Chart: Cidadãos por Faixa Etária
function renderCidadaosPorFaixaEtariaChart() {
    const ctx = document.getElementById('cidadaos-por-faixa-etaria-chart')?.getContext('2d');
    if (!ctx) return;

    const ageGroupCounts = allCidadaos.reduce((acc, c) => {
        const { group } = calculateAgeAndGroup(c.dob); // Use the utility function
        acc[group] = (acc[group] || 0) + 1;
        return acc;
    }, {
         '0-17': 0, '18-25': 0, '26-35': 0, '36-50': 0, '51-65': 0, '66+': 0, 'N/A': 0
    }); // Initialize all groups including N/A


    // Define specific order for labels
    const orderedLabels = ['0-17', '18-25', '26-35', '36-50', '51-65', '66+', 'N/A'];
    const data = orderedLabels.map(label => ageGroupCounts[label] || 0); // Ensure data matches label order

     // Assign colors (adjust palette if needed)
    const backgroundColors = [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(201, 203, 207, 0.7)' // Grey for N/A
    ];
    const borderColors = backgroundColors.map(color => color.replace('0.7', '1'));


    if (cidadaosPorFaixaEtariaChartInstance) {
        cidadaosPorFaixaEtariaChartInstance.destroy();
    }

    cidadaosPorFaixaEtariaChartInstance = new Chart(ctx, {
        type: 'pie', // Changed to pie for better comparison of parts
        data: {
            labels: orderedLabels.map(l => l === 'N/A' ? 'Não Informada' : `${l} anos`), // More descriptive labels
            datasets: [{
                label: 'Cidadãos por Faixa Etária',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
             plugins: {
                 legend: {
                     position: 'bottom',
                 },
                tooltip: {
                     callbacks: {
                         label: function(context) {
                             let label = context.label || '';
                             if (label) { label += ': '; }
                             if (context.parsed !== null) {
                                 const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                 const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) + '%' : '0%';
                                 label += `${context.parsed} (${percentage})`;
                             }
                             return label;
                         }
                    }
                }
             }
        }
    });
}



// List: Aniversariantes do Mês
function renderAniversariantes() {
    const listContainer = document.getElementById('aniversariantes-list');
    if (!listContainer) return;

    listContainer.innerHTML = ''; // Clear list
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-indexed

    const aniversariantes = allCidadaos
        .filter(c => {
            if (!c.dob) return false;
            try {
                 // Important: Parse date as UTC to avoid timezone shifts
                 const dobDate = new Date(`${c.dob}T00:00:00Z`);
                 return !isNaN(dobDate.getTime()) && dobDate.getUTCMonth() === currentMonth;
            } catch (e) {
                return false; // Invalid date format
            }
        })
        .sort((a, b) => {
             // Sort by day of the month
             try {
                 const dayA = new Date(`${a.dob}T00:00:00Z`).getUTCDate();
                 const dayB = new Date(`${b.dob}T00:00:00Z`).getUTCDate();
                 return dayA - dayB;
             } catch(e) { return 0;} // Keep original order if dates invalid
        });


    if (aniversariantes.length === 0) {
        listContainer.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhum aniversariante este mês.</p>';
        return;
    }

    aniversariantes.forEach(c => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between text-sm py-1';
         let dobDay = '';
         try {
             dobDay = new Date(`${c.dob}T00:00:00Z`).getUTCDate().toString().padStart(2, '0'); // Get day and pad
         } catch(e) {}
        item.innerHTML = `
            <span>${c.name}</span>
            <span class="font-semibold text-blue-600">${dobDay || '--'}</span>
        `;
        listContainer.appendChild(item);
    });
}


// List: Demandas Recentes
function renderDemandasRecentes() {
    const listContainer = document.getElementById('demandas-recentes-list');
    if (!listContainer) return;

    listContainer.innerHTML = ''; // Clear list

    // Demandas are already sorted by createdAt descending from the listener query
    const recentes = allDemandas.slice(0, 10); // Take the first 10

    if (recentes.length === 0) {
        listContainer.innerHTML = '<p class="text-sm text-gray-500 italic">Nenhuma demanda recente.</p>';
        return;
    }

    recentes.forEach(demanda => {
        const cidadao = allCidadaos.find(c => c.id === demanda.cidadaoId);
        const cidadaoName = cidadao ? cidadao.name : 'Cidadão Desconhecido';

        let statusClass = 'bg-yellow-100 text-yellow-800'; // Pending default
        let statusText = 'Pendente';
        if (demanda.status === 'inprogress') {
            statusClass = 'bg-blue-100 text-blue-800';
            statusText = 'Em Andamento';
        } else if (demanda.status === 'completed') {
            statusClass = 'bg-green-100 text-green-800';
            statusText = 'Concluída';
        }

        const item = document.createElement('div');
        // Make item clickable to open details
        item.className = 'border-b pb-2 mb-2 cursor-pointer hover:bg-gray-50 p-2 rounded demanda-recente-item';
        item.dataset.id = demanda.id; // Store ID for click
        item.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <span class="font-semibold text-sm text-gray-700 truncate" title="${demanda.title}">${demanda.title}</span>
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${statusClass}">${statusText}</span>
            </div>
            <p class="text-xs text-gray-500">Para: ${cidadaoName}</p>
        `;
        listContainer.appendChild(item);
    });

     // Add single event listener to the container for recent demand items
     listContainer.removeEventListener('click', handleRecentDemandaClick); // Remove previous
     listContainer.addEventListener('click', handleRecentDemandaClick);
}

function handleRecentDemandaClick(e) {
    const item = e.target.closest('.demanda-recente-item');
    if (item && item.dataset.id) {
         console.log("Recent demanda clicked, ID:", item.dataset.id);
        openDemandaDetailsModal(item.dataset.id);
    }
}