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
let currentUserId = null; // Store user ID (might still be useful for other things)
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

// DOM Elements (remain the same)
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
const filterSexo = document.getElementById('filter-sexo');
const filterFaixaEtaria = document.getElementById('filter-faixa-etaria');
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


// --- Utility Functions --- (remain the same)
function showToast(message, type = 'success') { const toast = document.createElement('div'); toast.className = `p-4 rounded-lg shadow-md text-white ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`; toast.textContent = message; toastContainer.appendChild(toast); setTimeout(() => { toast.remove(); }, 3000); }
function formatCPF(cpf) { if (!cpf) return ''; cpf = cpf.replace(/\D/g, '').slice(0, 11); cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2'); cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2'); cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); return cpf; }
function formatPhone(phone) { if (!phone) return ''; phone = phone.replace(/\D/g, '').slice(0, 11); if (phone.length === 11) phone = phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'); else if (phone.length === 10) phone = phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3'); else if (phone.length === 9) phone = phone.replace(/(\d{5})(\d{4})/, '$1-$2'); else if (phone.length === 8) phone = phone.replace(/(\d{4})(\d{4})/, '$1-$2'); return phone; }
function formatCEP(cep) { if (!cep) return ''; cep = cep.replace(/\D/g, '').slice(0, 8); cep = cep.replace(/^(\d{5})(\d)/, '$1-$2'); return cep; }
function formatVoterID(voterId) { if (!voterId) return ''; voterId = voterId.replace(/\D/g, '').slice(0, 12); if (voterId.length === 12) voterId = voterId.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3'); return voterId; }
document.getElementById('cidadao-cpf').addEventListener('input', (e) => { e.target.value = formatCPF(e.target.value); });
document.getElementById('cidadao-phone').addEventListener('input', (e) => { e.target.value = formatPhone(e.target.value); });
document.getElementById('cidadao-cep').addEventListener('input', (e) => { e.target.value = formatCEP(e.target.value); });
document.getElementById('cidadao-voterid').addEventListener('input', (e) => { e.target.value = formatVoterID(e.target.value); });


// --- Authentication --- (remains the same)
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
loginForm.addEventListener('submit', async (e) => { e.preventDefault(); const email = emailInput.value; const password = passwordInput.value; try { await signInWithEmailAndPassword(auth, email, password); showToast('Login bem-sucedido!'); } catch (error) { console.error("Erro no login:", error.code, error.message); let msg = 'Email ou palavra-passe inválidos.'; if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(error.code)) msg = 'Credenciais inválidas.'; else if (error.code === 'auth/too-many-requests') msg = 'Muitas tentativas. Tente mais tarde.'; else if (error.code === 'auth/network-request-failed') msg = 'Erro de rede.'; else if (['auth/invalid-api-key', 'auth/api-key-not-valid.-please-pass-a-valid-api-key.'].includes(error.code)) msg = 'Erro de configuração da API Key.'; showToast(msg, 'error'); } });
logoutBtn.addEventListener('click', async () => { try { await signOut(auth); showToast('Logout bem-sucedido!'); } catch (error) { console.error("Erro no logout:", error); showToast('Erro ao fazer logout.', 'error'); } });

// --- UI Navigation --- (remains the same)
function showLoginPage() { loginPage.classList.remove('hidden'); appContainer.classList.add('hidden'); appContainer.classList.remove('flex'); }
function showApp() { loginPage.classList.add('hidden'); appContainer.classList.remove('hidden'); appContainer.classList.add('flex'); navigateTo('dashboard'); }
function navigateTo(pageId) { pages.forEach(p => { p.id === `${pageId}-page` ? (p.classList.remove('hidden'), p.classList.add('flex')) : (p.classList.add('hidden'), p.classList.remove('flex')); }); sidebarNav.querySelectorAll('.nav-link').forEach(l => { l.getAttribute('href') === `#${pageId}` ? (l.classList.add('bg-slate-900', 'font-semibold'), l.classList.remove('hover:bg-slate-700')) : (l.classList.remove('bg-slate-900', 'font-semibold'), l.classList.add('hover:bg-slate-700')); }); if (pageId === 'dashboard') renderDashboard(); else if (pageId === 'demandas') renderDemandas(); else if (pageId === 'cidadaos') renderCidadaos(); }
sidebarNav.addEventListener('click', (e) => { const link = e.target.closest('a.nav-link'); if (link) { e.preventDefault(); navigateTo(link.getAttribute('href').substring(1)); } });
logoBtn?.addEventListener('click', () => { navigateTo('dashboard'); });


// --- Data Loading and Clearing ---
async function loadInitialData() {
    // Check if user is logged in
    if (!currentUserId) { console.log("loadInitialData skipped: currentUserId is null."); return; }
    console.log("Loading initial data for user:", currentUserId);

    // Unsubscribe previous listeners
    if (cidadaosListener) { console.log("Unsubscribing previous cidadaos listener."); cidadaosListener(); cidadaosListener = null; }
    if (demandasListener) { console.log("Unsubscribing previous demandas listener."); demandasListener(); demandasListener = null; }

    // --- Cidadãos Listener ---
    // [REVERTIDO] Use root collection path 'cidadaos'
    const cidadaosPath = 'cidadaos'; // <-- Caminho raiz
    // Consider adding a where clause if only user's data should be shown, e.g., where("ownerId", "==", currentUserId)
    // For now, reads the whole root collection as per the image.
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

    // --- Demandas Listener ---
    // [REVERTIDO] Use root collection path 'demandas'
    const demandasPath = 'demandas'; // <-- Caminho raiz
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
    // (clearData remains the same)
    console.log("Clearing data and unsubscribing listeners."); allCidadaos = []; allDemandas = []; if (cidadaosListener) { cidadaosListener(); cidadaosListener = null; } if (demandasListener) { demandasListener(); demandasListener = null; } cidadaosGrid.innerHTML = ''; allDemandasList.innerHTML = ''; filterBairro.innerHTML = '<option value="">Filtrar por Bairro</option>'; filterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>'; demandaFilterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>'; filterType.value = ''; filterSexo.value = ''; filterFaixaEtaria.value = ''; searchInput.value = ''; demandaFilterStatus.value = ''; document.getElementById('dashboard-total-cidadaos').textContent = '0'; document.getElementById('dashboard-total-demandas').textContent = '0'; document.getElementById('aniversariantes-list').innerHTML = ''; document.getElementById('demandas-recentes-list').innerHTML = ''; cidadaosPorTipoChartInstance?.destroy(); demandasPorStatusChartInstance?.destroy(); cidadaosPorBairroChartInstance?.destroy(); cidadaosPorSexoChartInstance?.destroy(); cidadaosPorFaixaEtariaChartInstance?.destroy(); cidadaosPorTipoChartInstance = null; demandasPorStatusChartInstance = null; cidadaosPorBairroChartInstance = null; cidadaosPorSexoChartInstance = null; cidadaosPorFaixaEtariaChartInstance = null; console.log("Data cleared.");
}


// --- Cidadãos --- (Most functions remain largely the same, but CRUD operations point to root collection)
function populateFilters() { /*...*/ } // Remains the same
function calculateAgeAndGroup(dobString) { /*...*/ } // Remains the same
function getFilteredCidadaos() { /*...*/ } // Remains the same
function renderCidadaos() { /*...*/ } // Remains the same
function addGridButtonListeners() { /*...*/ } // Remains the same
function handleGridButtonClick(e) { /*...*/ } // Remains the same
cidadaoPhotoUploadInput.addEventListener('change', (e) => { /*...*/ }); // Remains the same
function openCidadaoModal(cidadao = null) { /*...*/ } // Remains the same
function closeCidadaoModal() { /*...*/ } // Remains the same
addCidadaoBtn.addEventListener('click', () => openCidadaoModal()); closeModalBtn.addEventListener('click', closeCidadaoModal); cancelBtn.addEventListener('click', closeCidadaoModal); cidadaoModal.addEventListener('click', (e) => { if (e.target === cidadaoModal) closeCidadaoModal(); });
function generateChildrenFields(numSons, numDaughters, existingChildren = []) { /*...*/ } // Remains the same
cidadaoSonsInput.addEventListener('input', (e) => { /*...*/ }); // Remains the same
cidadaoDaughtersInput.addEventListener('input', (e) => { /*...*/ }); // Remains the same

cidadaoForm.addEventListener('submit', async (e) => {
    e.preventDefault(); if (!currentUserId) { showToast('Faça login.', 'error'); return; }
    let isValid = ['cidadao-name', 'cidadao-email'].every(id => { const i = document.getElementById(id); if (i&&!i.value.trim()){ i.classList.add('border-red-500'); return false; } if(i)i.classList.remove('border-red-500'); return true; }); if (!isValid) { showToast('Preencha campos obrigatórios.', 'error'); return; }
    saveBtn.disabled = true; saveBtn.innerHTML = 'Salvando...'; let pU = cidadaoPhotoUrlInput.value.trim(); const file = cidadaoPhotoUploadInput.files[0];
    try {
        if (file) {
            // [REVERTIDO] Path might need adjustment depending on rules for Storage
            const fP = `user_photos/${currentUserId}/${Date.now()}_${file.name}`; // Keeping user ID for organization
            const sR = ref(storage, fP); const sn = await uploadBytes(sR, file); pU = await getDownloadURL(sn.ref); console.log("Foto salva:", pU);
        }
        const children = []; const nS=parseInt(cidadaoSonsInput.value)||0; const nD=parseInt(cidadaoDaughtersInput.value)||0; for (let i=0; i<nS+nD; i++) { const nI=document.getElementById(`child-name-${i}`); const dI=document.getElementById(`child-dob-${i}`); if(nI&&dI){ const cN=nI.value.trim(); if(cN) children.push({name:cN, dob:dI.value||null}); } }
        const data = { name:document.getElementById('cidadao-name').value.trim(), email:document.getElementById('cidadao-email').value.trim().toLowerCase(), dob:document.getElementById('cidadao-dob').value||null, sexo:document.getElementById('cidadao-sexo').value, profissao:document.getElementById('cidadao-profissao').value.trim(), localTrabalho:document.getElementById('cidadao-local-trabalho').value.trim(), type:document.getElementById('cidadao-type').value, cpf:document.getElementById('cidadao-cpf').value.replace(/\D/g,''), rg:document.getElementById('cidadao-rg').value.replace(/\D/g,''), voterId:document.getElementById('cidadao-voterid').value.replace(/\D/g,''), phone:document.getElementById('cidadao-phone').value.replace(/\D/g,''), whatsapp:document.getElementById('cidadao-whatsapp').checked, cep:document.getElementById('cidadao-cep').value.replace(/\D/g,''), logradouro:document.getElementById('cidadao-logradouro').value.trim(), numero:document.getElementById('cidadao-numero').value.trim(), complemento:document.getElementById('cidadao-complemento').value.trim(), bairro:document.getElementById('cidadao-bairro').value.trim(), cidade:document.getElementById('cidadao-cidade').value.trim(), estado:document.getElementById('cidadao-estado').value.trim().toUpperCase(), leader:document.getElementById('cidadao-leader').value, sons:nS, daughters:nD, children, photoUrl:pU||null, updatedAt:serverTimestamp(),
            // [REVERTIDO] Optionally add ownerId if rules require it for root collections
            // ownerId: currentUserId
        };
        // [REVERTIDO] Use root collection path 'cidadaos'
        const cP = 'cidadaos'; // <-- Caminho raiz
        if (!currentCidadaoId) data.createdAt = serverTimestamp();
        console.log("Saving cidadao data to path:", cP, "Data:", data);
        if (currentCidadaoId) { const dR = doc(db, cP, currentCidadaoId); await updateDoc(dR, data); showToast('Cidadão atualizado!'); }
        else { const dR = await addDoc(collection(db, cP), data); showToast('Cidadão adicionado!'); }
        closeCidadaoModal();
    } catch (error) { console.error("Erro:", error); showToast(`Erro: ${error.message}`, 'error'); }
    finally { saveBtn.disabled = false; saveBtn.textContent = 'Salvar'; }
});

async function editCidadao(id) { if (!currentUserId || !id) return; try {
    // [REVERTIDO] Use root collection path 'cidadaos'
    const cP = 'cidadaos'; // <-- Caminho raiz
    const dR = doc(db, cP, id); const dS = await getDoc(dR); if (dS.exists()) openCidadaoModal({ id: dS.id, ...dS.data() }); else showToast("Cidadão não encontrado.", "error"); } catch (error) { console.error("Erro:", error); showToast("Erro ao carregar.", "error"); } }
function confirmDeleteCidadao(id, name) { /*...*/ } // Remains the same
function closeConfirmationModal() { /*...*/ } // Remains the same
async function deleteCidadao(id) { if (!currentUserId || !id) return; try {
    // [REVERTIDO] Use root collection path 'cidadaos'
    const cP = 'cidadaos'; // <-- Caminho raiz
    const dR = doc(db, cP, id); await deleteDoc(dR); showToast('Cidadão excluído!'); } catch (error) { console.error("Erro:", error); showToast('Erro ao excluir.', 'error'); } }

async function showCidadaoDetails(id) { if (!currentUserId || !id) return; try {
    // [REVERTIDO] Use root collection path 'cidadaos'
    const cP = 'cidadaos'; // <-- Caminho raiz
    const dR = doc(db, cP, id); const dS = await getDoc(dR); if (dS.exists()) { const c = { id: dS.id, ...dS.data() };
        // (Restante da lógica de preenchimento do modal permanece a mesma)
        document.getElementById('details-name').textContent=c.name||'N/D'; /* ... etc ... */ document.getElementById('details-leader').textContent=c.leader||'-'; const chC=document.getElementById('details-children');chC.innerHTML='';if(c.children&&c.children.length>0){/*...*/}else{const sC=c.sons||0;const dC=c.daughters||0;if(sC>0||dC>0)chC.innerHTML=`<p class="text-sm mt-2">Filhos: ${sC}, Filhas: ${dC} (sem detalhes).</p>`;else chC.innerHTML='<p class="text-sm mt-2">Sem filhos.</p>';} const pD=document.getElementById('details-photo');const iLD=c.name?c.name.charAt(0).toUpperCase():'?';pD.innerHTML='';pD.className='w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-4xl overflow-hidden border border-gray-300';if(c.photoUrl){const img=document.createElement('img');img.src=c.photoUrl;img.alt=c.name;img.className='w-full h-full object-cover';img.onerror=()=>{pD.innerHTML=`<span class="font-bold text-4xl">${iLD}</span>`;pD.classList.add('bg-slate-200','text-slate-500');};pD.appendChild(img);pD.classList.remove('bg-slate-200','text-slate-500');}else{pD.innerHTML=`<span class="font-bold text-4xl">${iLD}</span>`;} const nVMB=detailsViewMapBtn.cloneNode(true);detailsViewMapBtn.parentNode.replaceChild(nVMB,detailsViewMapBtn);detailsViewMapBtn=nVMB;detailsViewMapBtn.onclick=()=>{const mapAddr=[c.logradouro,c.numero,c.bairro,c.cidade,c.estado,c.cep].filter(Boolean);if(mapAddr.length>=2){const addrStr=mapAddr.join(', ');openMapModal([{name:c.name,address:addrStr,photoUrl:c.photoUrl}]);}else{showToast("Endereço insuficiente.", "error");}}; const nSB=detailsShareLocationBtn.cloneNode(true);detailsShareLocationBtn.parentNode.replaceChild(nSB,detailsShareLocationBtn);detailsShareLocationBtn=nSB;detailsShareLocationBtn.onclick=()=>{shareLocation(c);}; cidadaoDetailsModal.classList.remove('hidden'); setTimeout(() => { cidadaoDetailsModal.querySelector('.bg-white')?.classList.remove('scale-95','opacity-0'); cidadaoDetailsModal.querySelector('.bg-white')?.classList.add('scale-100','opacity-100'); }, 10);
    } else { showToast("Detalhes não encontrados.", "error"); } } catch (error) { console.error("Erro:", error); showToast("Erro ao carregar detalhes.", "error"); } }
function closeCidadaoDetailsModal() { /*...*/ } // Remains the same
closeDetailsModalBtn.addEventListener('click', closeCidadaoDetailsModal); cidadaoDetailsModal.addEventListener('click', (e) => { if (e.target === cidadaoDetailsModal) closeCidadaoDetailsModal(); });

// --- Filters Event Listeners --- (remain the same)
searchInput.addEventListener('input', renderCidadaos); filterType.addEventListener('change', renderCidadaos); filterBairro.addEventListener('change', renderCidadaos); filterLeader.addEventListener('change', renderCidadaos); filterSexo.addEventListener('change', renderCidadaos); filterFaixaEtaria.addEventListener('change', renderCidadaos);
clearFiltersBtn.addEventListener('click', () => { searchInput.value=''; filterType.value=''; filterBairro.value=''; filterLeader.value=''; filterSexo.value=''; filterFaixaEtaria.value=''; renderCidadaos(); });

// --- Demandas --- (Functions use root collection path 'demandas')
function populateDemandaFilters() { /*...*/ } // Remains the same
function getFilteredDemandas() { /*...*/ } // Remains the same
function renderDemandas() { /*...*/ } // Remains the same
function addDemandaCardListener() { /*...*/ } // Remains the same
function handleDemandaCardClick(e) { /*...*/ } // Remains the same
function openDemandaModal(cidadaoId=null) { /*...*/ } // Remains the same
function closeDemandaModal() { /*...*/ } // Remains the same
addDemandaGeralBtn.addEventListener('click',()=>openDemandaModal()); closeDemandaModalBtn.addEventListener('click',closeDemandaModal); cancelDemandaBtn.addEventListener('click',closeDemandaModal); demandaModal.addEventListener('click',(e)=>{if(e.target===demandaModal)closeDemandaModal();});

demandaForm.addEventListener('submit', async(e)=>{ e.preventDefault(); if(!currentUserId){showToast('Faça login.','error');return;} const cIS=demandaCidadaoSelect.value; const t=demandaTitleInput.value.trim(); if(!cIS){showToast('Selecione cidadão.','error');demandaCidadaoSelect.focus();return;} if(!t){showToast('Insira título.','error');demandaTitleInput.focus();return;} saveDemandaBtn.disabled=true;saveDemandaBtn.textContent='Salvando...'; const data={cidadaoId:cIS, title:t, description:demandaDescriptionInput.value.trim(), status:'pending', createdAt:serverTimestamp(), updatedAt:serverTimestamp(), notes:[],
    // [REVERTIDO] Optionally add ownerId if rules require it
    // ownerId: currentUserId
}; try {
    // [REVERTIDO] Use root collection path 'demandas'
    const cP='demandas'; // <-- Caminho raiz
    const dR = await addDoc(collection(db,cP), data); showToast('Demanda adicionada!'); closeDemandaModal(); } catch(error){ console.error("Erro:",error); showToast('Erro ao salvar.','error'); } finally { saveDemandaBtn.disabled=false; saveDemandaBtn.textContent='Salvar Demanda'; } });

async function openDemandaDetailsModal(demandaId) { if (!currentUserId||!demandaId) return; currentDemandaId = demandaId; if (currentDemandaDetailsListener) currentDemandaDetailsListener();
    // [REVERTIDO] Use root collection path 'demandas'
    const dP='demandas'; // <-- Caminho raiz
    const dDR=doc(db,dP,demandaId); currentDemandaDetailsListener = onSnapshot(dDR,(dS)=>{ if(dS.exists()){ const d={id:dS.id,...dS.data()}; populateDemandaDetails(d); if(demandaDetailsModal.classList.contains('hidden')) demandaDetailsModal.classList.remove('hidden'); } else { showToast("Demanda não encontrada.", "error"); closeDemandaDetailsModal(); } },(error)=>{ console.error("Erro:",error); showToast("Erro ao carregar.", "error"); closeDemandaDetailsModal(); }); }
function populateDemandaDetails(d) { /*...*/ } // Remains the same
function closeDemandaDetailsModal() { /*...*/ } // Remains the same
closeDemandaDetailsBtn.addEventListener('click', closeDemandaDetailsModal); demandaDetailsModal.addEventListener('click', (e)=>{if(e.target===demandaDetailsModal)closeDemandaDetailsModal();});

document.getElementById('details-demanda-status').addEventListener('change', async(e)=>{ const nS=e.target.value; if(!currentUserId||!currentDemandaId||!nS)return;
    // [REVERTIDO] Use root collection path 'demandas'
    const dP=`demandas`; // <-- Caminho raiz
    const dDR=doc(db,dP,currentDemandaId); try { await updateDoc(dDR,{status:nS,updatedAt:serverTimestamp()}); showToast('Status atualizado!'); } catch(error){ console.error("Erro:",error); showToast('Erro ao atualizar.','error'); } });
addNoteForm.addEventListener('submit', async(e)=>{ e.preventDefault(); if(!currentUserId||!currentDemandaId)return; const nT=document.getElementById('new-note-text').value.trim(); if(!nT){showToast('Escreva algo.','error');return;}
    // [REVERTIDO] Use root collection path 'demandas'
    const dP=`demandas`; // <-- Caminho raiz
    const dDR=doc(db,dP,currentDemandaId); try { const dDoc=await getDoc(dDR); if(!dDoc.exists()){showToast('Demanda não encontrada.','error');return;} const cN=dDoc.data().notes||[]; const newN={text:nT, timestamp:serverTimestamp()}; await updateDoc(dDR,{notes:[...cN,newN],updatedAt:serverTimestamp()}); showToast('Nota adicionada!'); addNoteForm.reset(); } catch(error){ console.error("Erro:",error); showToast('Erro ao adicionar.','error'); } });
deleteDemandaBtn.addEventListener('click',()=>{ if(!currentDemandaId)return; const dT=document.getElementById('details-demanda-title').textContent||'esta demanda'; confirmationTitle.textContent='Confirmar Exclusão'; confirmationMessage.textContent=`Excluir "${dT}"?`; confirmationModal.classList.remove('hidden'); const handleConfirm=async()=>{ if(currentUserId&&currentDemandaId){ const dTD=currentDemandaId; closeConfirmationModal(); closeDemandaDetailsModal(); try {
    // [REVERTIDO] Use root collection path 'demandas'
    const dP=`demandas`; // <-- Caminho raiz
    const dR=doc(db,dP,dTD); await deleteDoc(dR); showToast('Demanda excluída!'); } catch(error){ console.error("Erro:",error); showToast('Erro ao excluir.','error'); } } removeListeners(); }; const handleCancel=()=>{closeConfirmationModal(); removeListeners();}; const removeListeners=()=>{confirmDeleteBtn.removeEventListener('click',handleConfirm); cancelDeleteBtn.removeEventListener('click',handleCancel);}; removeListeners(); confirmDeleteBtn.addEventListener('click',handleConfirm); cancelDeleteBtn.addEventListener('click',handleCancel); });

// --- Demandas Filters --- (remain the same)
demandaFilterStatus.addEventListener('change', renderDemandas); demandaFilterLeader.addEventListener('change', renderDemandas);
demandaClearFiltersBtn.addEventListener('click', () => { demandaFilterStatus.value=''; demandaFilterLeader.value=''; renderDemandas(); });

// --- Reports --- (remains the same)
generateReportBtn.addEventListener('click', generatePrintReport);
function generatePrintReport() { const fC = getFilteredCidadaos(); if (fC.length === 0) { showToast("Nenhum cidadão para relatório.", "error"); return; } let html = ` <!DOCTYPE html>...[rest of report HTML]...</html> `; const win = window.open('','_blank'); if(win){ win.document.write(html); win.document.close(); setTimeout(()=>{win.focus();win.print();},500); } else showToast("Pop-up bloqueado.", "error"); }


// --- Maps --- (remain the same)
function initMap() { /*...*/ }
async function openMapModal(cidadaosToShow) { /*...*/ }
async function geocodeAndAddMarkers(cidadaos) { /*...*/ }
function closeMapModal() { /*...*/ }
viewMapBtn.addEventListener('click', () => { /*...*/ });
closeMapBtn.addEventListener('click', closeMapModal); mapModal.addEventListener('click', (e) => { if (e.target === mapModal) closeMapModal(); });
function shareLocation(c) { /*...*/ }
function copyToClipboard(text) { /*...*/ }


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