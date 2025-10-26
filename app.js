// 1. Importar as bibliotecas do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc, 
    deleteDoc, onSnapshot, query, where, Timestamp, writeBatch, setDoc
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { 
    getStorage, ref, uploadBytes, getDownloadURL, deleteObject 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

// 2. Configuração do Firebase (COLOQUE A SUA AQUI)
const firebaseConfig = {
  apiKey: "API_KEY",
  authDomain: "AUTH_DOMAIN",
  projectId: "PROJECT_ID",
  storageBucket: "STORAGE_BUCKET",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

// 3. Inicialização dos Serviços
let app, auth, db, storage;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
} catch (error) {
    console.error("Erro ao inicializar o Firebase:", error);
    showToast("Erro crítico ao conectar. Verifique a configuração.", "error");
}

// 4. Variáveis Globais da Aplicação
let allCidadaos = [], allDemandas = [], allLeaders = [];
let currentEditingId = null;
let currentCidadaoIdForDemanda = null;
let currentCidadaoIdForDetails = null;
let currentEditingDemandaId = null;
let unsubscribeCidadaos = null;
let unsubscribeDemandas = null;

// 5. Função Principal (Setup)
document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DE LOGIN ---
    const loginPage = document.getElementById('login-page');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const emailInput = document.getElementById('email-address');
    const passwordInput = document.getElementById('password');

    // Monitorar estado da autenticação
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuário está logado
            loginPage.classList.add('hidden');
            appContainer.style.display = 'flex'; // Usar flex para layout sidebar/main
            initializeMainApp(); // Inicializar a aplicação principal
        } else {
            // Usuário não está logado
            loginPage.classList.remove('hidden');
            appContainer.style.display = 'none';
            
            // Limpar listeners antigos se existirem
            if (unsubscribeCidadaos) unsubscribeCidadaos();
            if (unsubscribeDemandas) unsubscribeDemandas();
            allCidadaos = [];
            allDemandas = [];
            allLeaders = [];
        }
    });

    // Evento de submit do formulário de login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;

        // Mostrar spinner e desabilitar botão
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<div class="spinner"></div>';

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // O onAuthStateChanged vai tratar da mudança de tela
        } catch (error) {
            console.error("Erro no login:", error.code, error.message);
            showToast("Email ou palavra-passe inválidos.", "error");
        } finally {
            // Restaurar botão
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Entrar';
        }
    });

    // --- FIM DA LÓGICA DE LOGIN ---

    // Flag para garantir que a inicialização só ocorra uma vez
    let appInitialized = false;

    /**
     * Inicializa os componentes principais da aplicação (depois do login)
     */
    function initializeMainApp() {
        if (appInitialized) return;
        appInitialized = true;

        // [ALTERAÇÃO AQUI] Captura o botão da logo
        const logoBtn = document.getElementById('logo-btn'); 
        const logoutBtn = document.getElementById('logout-btn');
        const sidebarNav = document.getElementById('sidebar-nav');
        
        // Botões principais
        const addCidadaoBtn = document.getElementById('add-cidadao-btn');
        const addDemandaGeralBtn = document.getElementById('add-demanda-geral-btn');
        
        // Botões dos Modais
        const closeModalBtn = document.getElementById('close-modal-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        const saveBtn = document.getElementById('save-btn');
        const closeDetailsModalBtn = document.getElementById('close-details-modal-btn');
        const closeDemandaModalBtn = document.getElementById('close-demanda-modal-btn');
        const cancelDemandaBtn = document.getElementById('cancel-demanda-btn');
        const closeDemandaDetailsBtn = document.getElementById('close-demanda-details-btn');
        const closeMapBtn = document.getElementById('close-map-btn');
        
        // Modais
        const cidadaoModal = document.getElementById('cidadao-modal');
        const modalContent = document.getElementById('modal-content');
        const cidadaoDetailsModal = document.getElementById('cidadao-details-modal');
        const demandaModal = document.getElementById('demanda-modal');
        const demandaDetailsModal = document.getElementById('demanda-details-modal');
        const mapModal = document.getElementById('map-modal');
        const confirmationModal = document.getElementById('confirmation-modal');

        // Formulários
        const cidadaoForm = document.getElementById('cidadao-form');
        const demandaForm = document.getElementById('demanda-form');
        const addNoteForm = document.getElementById('add-note-form');

        // Filtros Cidadãos
        const searchInput = document.getElementById('search-input');
        const filterType = document.getElementById('filter-type');
        const filterBairro = document.getElementById('filter-bairro');
        const filterLeader = document.getElementById('filter-leader');
        const filterSexo = document.getElementById('filter-sexo');
        const filterFaixaEtaria = document.getElementById('filter-faixa-etaria');
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        const generateReportBtn = document.getElementById('generate-report-btn');
        const viewMapBtn = document.getElementById('view-map-btn');

        // Filtros Demandas
        const demandaFilterStatus = document.getElementById('demanda-filter-status');
        const demandaFilterLeader = document.getElementById('demanda-filter-leader');
        const demandaClearFiltersBtn = document.getElementById('demanda-clear-filters-btn');

        // Elementos Dinâmicos
        const cidadaosGrid = document.getElementById('cidadaos-grid');
        const allDemandasList = document.getElementById('all-demandas-list');
        const cidadaoLeaderSelect = document.getElementById('cidadao-leader');
        const demandaCidadaoSelect = document.getElementById('demanda-cidadao-select');

        // Confirmação de Exclusão
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

        // Campos do Formulário Cidadão
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

        let itemToDelete = { id: null, type: null }, viewingDemandaId = null, notesUnsubscribe = null;
        
        // INICIALIZAÇÃO DOS GRÁFICOS
        let map = null, markers = [], cidadaosChart = null, demandasChart = null, cidadaosBairroChart = null, cidadaosSexoChart = null, cidadaosFaixaEtariaChart = null;

        // [ALTERAÇÃO AQUI] Adiciona o listener de clique na logo
        if (logoBtn) {
            logoBtn.addEventListener('click', (e) => {
                e.preventDefault();
                switchPage('dashboard-page');
            });
        }

        // --- LISTENERS PRINCIPAIS ---

        // Logout
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                // O onAuthStateChanged vai tratar da mudança de tela
                appInitialized = false; // Resetar flag
            } catch (error) {
                console.error("Erro ao sair:", error);
                showToast("Erro ao terminar sessão.", "error");
            }
        });

        // Navegação pela Sidebar
        sidebarNav.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) {
                e.preventDefault();
                const page = link.getAttribute('href').substring(1); // remove o '#'
                if (page === 'mapa') {
                    openMapModal();
                } else {
                    switchPage(page + '-page');
                }
            }
        });

        // Abrir modais de adição
        addCidadaoBtn.addEventListener('click', () => openCidadaoModal());
        addDemandaGeralBtn.addEventListener('click', () => openDemandaModal());
        
        // Botão de ver mapa (na página cidadãos)
        viewMapBtn.addEventListener('click', openMapModal);
        
        // Fechar Modais
        closeModalBtn.addEventListener('click', closeCidadaoModal);
        cancelBtn.addEventListener('click', closeCidadaoModal);
        closeDetailsModalBtn.addEventListener('click', closeDetailsModal);
        closeDemandaModalBtn.addEventListener('click', closeDemandaModal);
        cancelDemandaBtn.addEventListener('click', closeDemandaModal);
        closeDemandaDetailsBtn.addEventListener('click', closeDemandaDetailsModal);
        closeMapBtn.addEventListener('click', closeMapModal);

        // Submissão de Formulários
        cidadaoForm.addEventListener('submit', handleCidadaoFormSubmit);
        demandaForm.addEventListener('submit', handleDemandaFormSubmit);
        addNoteForm.addEventListener('submit', handleAddNoteSubmit);

        // Filtros e Pesquisa
        searchInput.addEventListener('input', () => renderCidadaos(allCidadaos));
        filterType.addEventListener('change', () => renderCidadaos(allCidadaos));
        filterBairro.addEventListener('change', () => renderCidadaos(allCidadaos));
        filterLeader.addEventListener('change', () => renderCidadaos(allCidadaos));
        filterSexo.addEventListener('change', () => renderCidadaos(allCidadaos));
        filterFaixaEtaria.addEventListener('change', () => renderCidadaos(allCidadaos));
        clearFiltersBtn.addEventListener('click', clearCidadaoFilters);

        demandaFilterStatus.addEventListener('change', () => renderAllDemandas(allDemandas));
        demandaFilterLeader.addEventListener('change', () => renderAllDemandas(allDemandas));
        demandaClearFiltersBtn.addEventListener('click', clearDemandaFilters);

        // Relatório
        generateReportBtn.addEventListener('click', generatePrintReport);

        // Modal de Confirmação
        cancelDeleteBtn.addEventListener('click', closeConfirmationModal);
        confirmDeleteBtn.addEventListener('click', handleDeleteConfirmation);

        // Busca de CEP
        cidadaoCEP.addEventListener('blur', handleCEPBlur);
        
        // Input de Foto
        cidadaoPhotoUpload.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                fileNameDisplay.textContent = e.target.files[0].name;
                cidadaoPhotoUrl.value = ''; // Limpa o URL se um arquivo for selecionado
            } else {
                fileNameDisplay.textContent = 'Nenhum ficheiro selecionado';
            }
        });

        // Inputs dinâmicos de filhos
        cidadaoSons.addEventListener('input', () => updateChildrenInputs('filho'));
        cidadaoDaughters.addEventListener('input', () => updateChildrenInputs('filha'));

        // Inicializar os dados
        setupFirestoreListeners();
        
        // Definir página inicial
        switchPage('dashboard-page');
    }

    // --- FIM DO INITIALIZEMAINAPP ---

    /**
     * Configura os listeners em tempo real do Firestore
     */
    function setupFirestoreListeners() {
        const uid = auth.currentUser.uid;
        if (!uid) return;

        // Listener para Cidadãos
        const cidadaosRef = collection(db, 'users', uid, 'cidadaos');
        unsubscribeCidadaos = onSnapshot(cidadaosRef, (snapshot) => {
            allCidadaos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allLeaders = allCidadaos
                .filter(c => c.type === 'Liderança')
                .sort((a, b) => a.name.localeCompare(b.name));
            
            updateLeaderSelects();
            renderCidadaos(allCidadaos);
            updateDashboard();
            updateBairroFilter();
        }, (error) => {
            console.error("Erro ao ouvir cidadãos:", error);
            showToast("Erro ao carregar cidadãos.", "error");
        });

        // Listener para Demandas
        const demandasRef = collection(db, 'users', uid, 'demandas');
        unsubscribeDemandas = onSnapshot(query(demandasRef), (snapshot) => {
            allDemandas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderAllDemandas(allDemandas);
            updateDashboard();
        }, (error) => {
            console.error("Erro ao ouvir demandas:", error);
            showToast("Erro ao carregar demandas.", "error");
        });
    }

    /**
     * Retorna a lista de cidadãos com base nos filtros aplicados
     */
    function getFilteredCidadaos() {
        const searchTerm = searchInput.value.toLowerCase();
        const type = filterType.value;
        const bairro = filterBairro.value;
        const leader = filterLeader.value;
        const sexo = filterSexo.value;
        const faixaEtaria = filterFaixaEtaria.value;

        return allCidadaos.filter(cidadao => {
            const nameMatch = cidadao.name.toLowerCase().includes(searchTerm);
            const emailMatch = cidadao.email.toLowerCase().includes(searchTerm);
            const cpfMatch = (cidadao.cpf || '').includes(searchTerm);
            
            const typeMatch = !type || cidadao.type === type;
            const bairroMatch = !bairro || cidadao.bairro === bairro;
            const leaderMatch = !leader || cidadao.leader === leader;
            const sexoMatch = !sexo || (cidadao.sexo || 'Não Informar') === sexo;
            
            const ageMatch = !faixaEtaria || getFaixaEtaria(cidadao.dob) === faixaEtaria;

            return (nameMatch || emailMatch || cpfMatch) && typeMatch && bairroMatch && leaderMatch && sexoMatch && ageMatch;
        });
    }

    /**
     * Renderiza os cidadãos na grelha
     */
    function renderCidadaos() {
        const cidadaosGrid = document.getElementById('cidadaos-grid');
        if (!cidadaosGrid) return;
        
        const filteredCidadaos = getFilteredCidadaos();
        
        cidadaosGrid.innerHTML = ''; // Limpar grelha
        
        if (filteredCidadaos.length === 0) {
            cidadaosGrid.innerHTML = '<p class="text-gray-500 col-span-full text-center">Nenhum cidadão encontrado.</p>';
            return;
        }

        filteredCidadaos.sort((a, b) => a.name.localeCompare(b.name));

        filteredCidadaos.forEach(cidadao => {
            const card = document.createElement('div');
            card.className = 'bg-white p-5 rounded-lg shadow-md flex flex-col transition-shadow hover:shadow-lg';
            
            const initials = getInitials(cidadao.name);
            const photoUrl = cidadao.photoUrl;

            card.innerHTML = `
                <div class="flex items-center gap-4 mb-4">
                    ${photoUrl ? 
                        `<img src="${photoUrl}" alt="${cidadao.name}" class="w-16 h-16 rounded-full object-cover bg-gray-200">` : 
                        `<div class="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold">${initials}</div>`
                    }
                    <div class="flex-1">
                        <h3 class="text-lg font-bold text-gray-800 truncate">${cidadao.name}</h3>
                        <p class="text-sm text-gray-600">${cidadao.type}</p>
                    </div>
                </div>
                <div class="space-y-2 text-sm text-gray-700 mb-4 flex-1">
                    <p class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><span class="truncate">${cidadao.email}</span></p>
                    <p class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${cidadao.phone || 'Não informado'}</p>
                    <p class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${cidadao.bairro || 'Não informado'}</p>
                </div>
                <div class="border-t pt-4 flex gap-2">
                    <button class="btn-view-details flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium">Ver Detalhes</button>
                    <button class="btn-edit flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium">Editar</button>
                    <button class="btn-add-demanda bg-purple-500 hover:bg-purple-600 text-white py-2 px-3 rounded-lg text-sm font-medium">Demanda</button>
                    <button class="btn-delete bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg text-sm font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </div>
            `;
            
            // Adicionar eventos aos botões do card
            card.querySelector('.btn-view-details').addEventListener('click', () => openDetailsModal(cidadao.id));
            card.querySelector('.btn-edit').addEventListener('click', () => openCidadaoModal(cidadao.id));
            card.querySelector('.btn-add-demanda').addEventListener('click', () => openDemandaModal(cidadao.id));
            card.querySelector('.btn-delete').addEventListener('click', () => requestDelete(cidadao.id, 'cidadao'));

            cidadaosGrid.appendChild(card);
        });
    }
    
    /**
     * Renderiza todas as demandas na página de Demandas
     */
    function renderAllDemandas(demandas) {
        const allDemandasList = document.getElementById('all-demandas-list');
        if (!allDemandasList) return;

        const statusFilter = document.getElementById('demanda-filter-status').value;
        const leaderFilter = document.getElementById('demanda-filter-leader').value;

        const filteredDemandas = demandas.filter(demanda => {
            const statusMatch = !statusFilter || demanda.status === statusFilter;
            
            // Encontrar o cidadão solicitante para verificar a liderança
            const solicitante = allCidadaos.find(c => c.id === demanda.cidadaoId);
            const leaderMatch = !leaderFilter || (solicitante && solicitante.leader === leaderFilter);
            
            return statusMatch && leaderMatch;
        });
        
        allDemandasList.innerHTML = '';
        
        if (filteredDemandas.length === 0) {
            allDemandasList.innerHTML = '<p class="text-gray-500 text-center">Nenhuma demanda encontrada.</p>';
            return;
        }

        // Ordenar por data de criação (mais recentes primeiro)
        filteredDemandas.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        filteredDemandas.forEach(demanda => {
            const solicitante = allCidadaos.find(c => c.id === demanda.cidadaoId);
            const statusInfo = getStatusInfo(demanda.status);
            
            const item = document.createElement('div');
            item.className = 'bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center cursor-pointer hover:shadow-md';
            item.innerHTML = `
                <div class="flex-1">
                    <h3 class="text-lg font-semibold text-gray-800">${demanda.title}</h3>
                    <p class="text-sm text-gray-600">
                        Solicitante: <span class="font-medium text-blue-600">${solicitante ? solicitante.name : 'Desconhecido'}</span>
                    </p>
                    <p class="text-sm text-gray-500">
                        Data: ${demanda.createdAt ? demanda.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}
                    </p>
                </div>
                <div>
                    <span class="${statusInfo.classes}">${statusInfo.text}</span>
                </div>
            `;
            item.addEventListener('click', () => openDemandaDetailsModal(demanda.id));
            allDemandasList.appendChild(item);
        });
    }

    /**
     * Atualiza os selects de Liderança
     */
    function updateLeaderSelects() {
        const selects = [
            document.getElementById('cidadao-leader'),
            document.getElementById('filter-leader'),
            document.getElementById('demanda-filter-leader')
        ];
        
        selects.forEach(select => {
            if (!select) return;
            
            const currentValue = select.value;
            select.innerHTML = `<option value="">${select.id === 'cidadao-leader' ? 'Nenhuma' : 'Filtrar por Liderança'}</option>`; // Reset
            
            allLeaders.forEach(leader => {
                const option = document.createElement('option');
                option.value = leader.id;
                option.textContent = leader.name;
                select.appendChild(option);
            });
            
            select.value = currentValue; // Restaurar valor se ainda existir
        });
    }

    /**
     * Atualiza o filtro de Bairro com base nos cidadãos existentes
     */
    function updateBairroFilter() {
        const filterBairro = document.getElementById('filter-bairro');
        if (!filterBairro) return;

        const currentValue = filterBairro.value;
        const bairros = [...new Set(allCidadaos.map(c => c.bairro).filter(Boolean))];
        bairros.sort();
        
        filterBairro.innerHTML = '<option value="">Filtrar por Bairro</option>';
        bairros.forEach(bairro => {
            const option = document.createElement('option');
            option.value = bairro;
            option.textContent = bairro;
            filterBairro.appendChild(option);
        });
        filterBairro.value = currentValue;
    }

    /**
     * Limpa os filtros da página de cidadãos
     */
    function clearCidadaoFilters() {
        searchInput.value = '';
        filterType.value = '';
        filterBairro.value = '';
        filterLeader.value = '';
        filterSexo.value = '';
        filterFaixaEtaria.value = '';
        renderCidadaos(allCidadaos);
    }
    
    /**
     * Limpa os filtros da página de demandas
     */
    function clearDemandaFilters() {
        demandaFilterStatus.value = '';
        demandaFilterLeader.value = '';
        renderAllDemandas(allDemandas);
    }

    // --- LÓGICA DO DASHBOARD ---

    /**
     * Atualiza todos os componentes do dashboard
     */
    function updateDashboard() {
        // Stats
        document.getElementById('dashboard-total-cidadaos').textContent = allCidadaos.length;
        document.getElementById('dashboard-total-demandas').textContent = allDemandas.length;

        // Listas
        updateAniversariantes();
        updateDemandasRecentes();

        // Gráficos
        updateCidadaosPorTipoChart();
        updateDemandasPorStatusChart();
        updateCidadaosPorBairroChart();
        updateCidadaosPorSexoChart();
        updateCidadaosPorFaixaEtariaChart();
    }

    /**
     * Atualiza a lista de aniversariantes
     */
    function updateAniversariantes() {
        const listEl = document.getElementById('aniversariantes-list');
        if (!listEl) return;
        
        const currentMonth = new Date().getMonth();
        const aniversariantes = allCidadaos.filter(c => {
            if (!c.dob) return false;
            // Tratar DOB como string 'YYYY-MM-DD'
            const parts = c.dob.split('-');
            if (parts.length < 3) return false;
            const dobDate = new Date(parts[0], parts[1] - 1, parts[2]);
            return dobDate.getMonth() === currentMonth;
        });
        
        aniversariantes.sort((a, b) => new Date(a.dob).getDate() - new Date(b.dob).getDate());

        listEl.innerHTML = '';
        if (aniversariantes.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-gray-500">Nenhum aniversariante este mês.</p>';
            return;
        }
        
        aniversariantes.forEach(c => {
            const parts = c.dob.split('-');
            const dia = parts[2];
            listEl.innerHTML += `
                <div class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                    <span class="font-medium text-gray-700">${c.name}</span>
                    <span class="font-bold text-blue-600">${dia}</span>
                </div>
            `;
        });
    }

    /**
     * Atualiza a lista de demandas recentes
     */
    function updateDemandasRecentes() {
        const listEl = document.getElementById('demandas-recentes-list');
        if (!listEl) return;

        const recentes = allDemandas
            .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
            .slice(0, 5);

        listEl.innerHTML = '';
        if (recentes.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-gray-500">Nenhuma demanda recente.</p>';
            return;
        }

        recentes.forEach(d => {
            const solicitante = allCidadaos.find(c => c.id === d.cidadaoId);
            const statusInfo = getStatusInfo(d.status);
            listEl.innerHTML += `
                <div class="p-2 rounded-lg hover:bg-gray-50 border-b last:border-b-0">
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-semibold text-gray-800">${d.title}</span>
                        <span class="${statusInfo.classes} !py-0.5 !px-2">${statusInfo.text}</span>
                    </div>
                    <p class="text-sm text-gray-600">
                        ${solicitante ? solicitante.name : 'Desconhecido'} - 
                        ${d.createdAt ? d.createdAt.toDate().toLocaleDateString('pt-BR') : 'N/A'}
                    </p>
                </div>
            `;
        });
    }

    // --- Funções dos Gráficos ---

    function updateCidadaosPorTipoChart() {
        const ctx = document.getElementById('cidadaos-por-tipo-chart');
        if (!ctx) return;
        
        const data = allCidadaos.reduce((acc, c) => {
            acc[c.type] = (acc[c.type] || 0) + 1;
            return acc;
        }, {});

        const labels = Object.keys(data);
        const values = Object.values(data);

        if (cidadaosChart) cidadaosChart.destroy();
        cidadaosChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cidadãos por Tipo',
                    data: values,
                    backgroundColor: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#6B7280'],
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function updateDemandasPorStatusChart() {
        const ctx = document.getElementById('demandas-por-status-chart');
        if (!ctx) return;

        const data = allDemandas.reduce((acc, d) => {
            acc[d.status] = (acc[d.status] || 0) + 1;
            return acc;
        }, {});

        const labels = Object.keys(data).map(s => getStatusInfo(s).text);
        const values = Object.values(data);
        const colors = Object.keys(data).map(s => getStatusInfo(s).color);

        if (demandasChart) demandasChart.destroy();
        demandasChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Demandas por Status',
                    data: values,
                    backgroundColor: colors,
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
    
    function updateCidadaosPorBairroChart() {
        const ctx = document.getElementById('cidadaos-por-bairro-chart');
        if (!ctx) return;

        const data = allCidadaos.reduce((acc, c) => {
            const bairro = c.bairro || 'Não informado';
            acc[bairro] = (acc[bairro] || 0) + 1;
            return acc;
        }, {});

        const sortedData = Object.entries(data).sort(([,a],[,b]) => b-a).slice(0, 10);
        const labels = sortedData.map(item => item[0]);
        const values = sortedData.map(item => item[1]);

        if (cidadaosBairroChart) cidadaosBairroChart.destroy();
        cidadaosBairroChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cidadãos por Bairro (Top 10)',
                    data: values,
                    backgroundColor: '#10B981', // Verde
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                indexAxis: 'y', // Gráfico de barras horizontal
            }
        });
    }

    function updateCidadaosPorSexoChart() {
        const ctx = document.getElementById('cidadaos-por-sexo-chart');
        if (!ctx) return;
        
        const data = allCidadaos.reduce((acc, c) => {
            const sexo = c.sexo || 'Não Informar';
            acc[sexo] = (acc[sexo] || 0) + 1;
            return acc;
        }, {});

        const labels = Object.keys(data);
        const values = Object.values(data);

        if (cidadaosSexoChart) cidadaosSexoChart.destroy();
        cidadaosSexoChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cidadãos por Sexo',
                    data: values,
                    backgroundColor: ['#3B82F6', '#EC4899', '#F59E0B', '#6B7280'], // Azul, Rosa, Laranja, Cinza
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    function updateCidadaosPorFaixaEtariaChart() {
        const ctx = document.getElementById('cidadaos-por-faixa-etaria-chart');
        if (!ctx) return;

        const faixas = {
            '0-17': 0, '18-25': 0, '26-35': 0, '36-50': 0, '51-65': 0, '66+': 0, 'N/A': 0
        };

        allCidadaos.forEach(c => {
            const faixa = getFaixaEtaria(c.dob);
            faixas[faixa]++;
        });

        const labels = Object.keys(faixas);
        const values = Object.values(faixas);

        if (cidadaosFaixaEtariaChart) cidadaosFaixaEtariaChart.destroy();
        cidadaosFaixaEtariaChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Cidadãos por Faixa Etária',
                    data: values,
                    backgroundColor: '#8B5CF6', // Roxo
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
            }
        });
    }

    // --- LÓGICA DO FORMULÁRIO CIDADÃO ---

    /**
     * Abre o modal de Cidadão (novo ou edição)
     */
    async function openCidadaoModal(cidadaoId = null) {
        currentEditingId = cidadaoId;
        cidadaoForm.reset();
        fileNameDisplay.textContent = 'Nenhum ficheiro selecionado';
        childrenDetailsContainer.innerHTML = '';
        
        const titleEl = document.getElementById('cidadao-modal-title');
        
        if (cidadaoId) {
            titleEl.textContent = 'Editar Cidadão';
            const cidadao = allCidadaos.find(c => c.id === cidadaoId);
            if (cidadao) {
                // Preencher formulário
                cidadaoName.value = cidadao.name || '';
                cidadaoEmail.value = cidadao.email || '';
                cidadaoDob.value = cidadao.dob || '';
                cidadaoSexo.value = cidadao.sexo || 'Não Informar';
                cidadaoType.value = cidadao.type || 'Cidadão Comum';
                cidadaoLeaderSelect.value = cidadao.leader || '';
                cidadaoCPF.value = cidadao.cpf || '';
                cidadaoRG.value = cidadao.rg || '';
                cidadaoVoterId.value = cidadao.voterid || '';
                cidadaoPhone.value = cidadao.phone || '';
                cidadaoWhatsapp.checked = cidadao.whatsapp || false;
                cidadaoProfissao.value = cidadao.profissao || '';
                cidadaoLocalTrabalho.value = cidadao.localTrabalho || '';
                cidadaoCEP.value = cidadao.cep || '';
                cidadaoLogradouro.value = cidadao.logradouro || '';
                cidadaoNumero.value = cidadao.numero || '';
                cidadaoComplemento.value = cidadao.complemento || '';
                cidadaoBairro.value = cidadao.bairro || '';
                cidadaoCidade.value = cidadao.cidade || '';
                cidadaoEstado.value = cidadao.estado || '';
                cidadaoSons.value = cidadao.sons || 0;
                cidadaoDaughters.value = cidadao.daughters || 0;
                cidadaoPhotoUrl.value = cidadao.photoUrl || '';
                
                // Preencher detalhes dos filhos (se houver)
                updateChildrenInputs('filho', cidadao.children);
                updateChildrenInputs('filha', cidadao.children);
            }
        } else {
            titleEl.textContent = 'Adicionar Novo Cidadão';
        }

        cidadaoModal.classList.remove('hidden');
        setTimeout(() => {
            modalContent.classList.remove('scale-95', 'opacity-0');
        }, 10);
    }

    /**
     * Fecha o modal de Cidadão
     */
    function closeCidadaoModal() {
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            cidadaoModal.classList.add('hidden');
        }, 300);
    }
    
    /**
     * Atualiza os campos de input para nomes e datas de nascimento dos filhos
     */
    function updateChildrenInputs(type, childrenData = null) {
        const count = (type === 'filho' ? cidadaoSons.value : cidadaoDaughters.value) || 0;
        const containerId = type === 'filho' ? 'sons-inputs' : 'daughters-inputs';
        const label = type === 'filho' ? 'Filho' : 'Filha';

        let container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'space-y-3 p-4 bg-gray-50 rounded-lg';
            childrenDetailsContainer.appendChild(container);
        }

        container.innerHTML = ''; // Limpar inputs existentes

        if (count > 0) {
            container.innerHTML += `<h4 class="font-medium text-gray-700">${label}s:</h4>`;
        }

        for (let i = 0; i < count; i++) {
            // Tentar obter dados existentes
            const existingChild = (childrenData || []).find(c => c.type === type && c.index === i);
            
            container.innerHTML += `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-medium text-gray-600">${label} ${i + 1} - Nome</label>
                        <input type="text" data-type="${type}" data-index="${i}" data-field="name" class="w-full border border-gray-300 p-2 rounded-lg mt-1" value="${existingChild?.name || ''}">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-gray-600">${label} ${i + 1} - Data Nasc.</label>
                        <input type="date" data-type="${type}" data-index="${i}" data-field="dob" class="w-full border border-gray-300 p-2 rounded-lg mt-1" value="${existingChild?.dob || ''}">
                    </div>
                </div>
            `;
        }
    }
    
    /**
     * Coleta os dados dos inputs dinâmicos dos filhos
     */
    function getChildrenData() {
        const children = [];
        const inputs = childrenDetailsContainer.querySelectorAll('input[data-type]');
        
        inputs.forEach(input => {
            const type = input.dataset.type;
            const index = parseInt(input.dataset.index, 10);
            const field = input.dataset.field;
            const value = input.value;

            let child = children.find(c => c.type === type && c.index === index);
            if (!child) {
                child = { type, index };
                children.push(child);
            }
            child[field] = value;
        });
        
        // Remover dados incompletos (ex: só nome sem data)
        return children.filter(c => c.name && c.dob);
    }


    /**
     * Trata da submissão do formulário de cidadão (novo ou edição)
     */
    async function handleCidadaoFormSubmit(e) {
        e.preventDefault();
        const uid = auth.currentUser.uid;
        if (!uid) {
            showToast("Sessão expirada. Faça login novamente.", "error");
            return;
        }

        const saveBtn = document.getElementById('save-btn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<div class="spinner"></div>';

        try {
            let photoUrl = cidadaoPhotoUrl.value;
            const file = cidadaoPhotoUpload.files[0];

            // 1. Upload da Foto (se houver)
            if (file) {
                const filePath = `users/${uid}/cidadaos/${Date.now()}_${file.name}`;
                const fileRef = ref(storage, filePath);
                await uploadBytes(fileRef, file);
                photoUrl = await getDownloadURL(fileRef);
            }

            // 2. Montar objeto do Cidadão
            const cidadaoData = {
                name: cidadaoName.value,
                email: cidadaoEmail.value,
                dob: cidadaoDob.value,
                sexo: cidadaoSexo.value,
                type: cidadaoType.value,
                leader: cidadaoLeaderSelect.value || null,
                cpf: cidadaoCPF.value,
                rg: cidadaoRG.value,
                voterid: cidadaoVoterId.value,
                phone: cidadaoPhone.value,
                whatsapp: cidadaoWhatsapp.checked,
                profissao: cidadaoProfissao.value,
                localTrabalho: cidadaoLocalTrabalho.value,
                cep: cidadaoCEP.value,
                logradouro: cidadaoLogradouro.value,
                numero: cidadaoNumero.value,
                complemento: cidadaoComplemento.value,
                bairro: cidadaoBairro.value,
                cidade: cidadaoCidade.value,
                estado: cidadaoEstado.value,
                sons: parseInt(cidadaoSons.value, 10) || 0,
                daughters: parseInt(cidadaoDaughters.value, 10) || 0,
                children: getChildrenData(),
                photoUrl: photoUrl || null,
                updatedAt: Timestamp.now()
            };

            // 3. Salvar no Firestore
            if (currentEditingId) {
                // Editar
                const docRef = doc(db, 'users', uid, 'cidadaos', currentEditingId);
                await updateDoc(docRef, cidadaoData);
                showToast("Cidadão atualizado com sucesso!", "success");
            } else {
                // Criar
                cidadaoData.createdAt = Timestamp.now();
                await addDoc(collection(db, 'users', uid, 'cidadaos'), cidadaoData);
                showToast("Cidadão adicionado com sucesso!", "success");
            }

            closeCidadaoModal();

        } catch (error) {
            console.error("Erro ao salvar cidadão:", error);
            showToast("Erro ao salvar cidadão. Tente novamente.", "error");
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Salvar';
        }
    }

    /**
     * Busca dados do CEP na API ViaCEP
     */
    async function handleCEPBlur(e) {
        const cep = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
        if (cep.length === 8) {
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                if (!response.ok) throw new Error('CEP não encontrado');
                const data = await response.json();
                if (data.erro) {
                    showToast("CEP não encontrado.", "warning");
                } else {
                    cidadaoLogradouro.value = data.logradouro;
                    cidadaoBairro.value = data.bairro;
                    cidadaoCidade.value = data.localidade;
                    cidadaoEstado.value = data.uf;
                    cidadaoNumero.focus(); // Mover foco para o número
                }
            } catch (error) {
                console.error("Erro ao buscar CEP:", error);
                showToast("Erro ao consultar o CEP.", "error");
            }
        }
    }


    // --- LÓGICA DE DETALHES DO CIDADÃO ---

    /**
     * Abre o modal de Detalhes do Cidadão
     */
    function openDetailsModal(cidadaoId) {
        currentCidadaoIdForDetails = cidadaoId;
        const cidadao = allCidadaos.find(c => c.id === cidadaoId);
        if (!cidadao) return;

        const detailsModal = document.getElementById('cidadao-details-modal');
        const content = detailsModal.querySelector('.transform'); // Alvo para animação

        // Preencher Foto ou Iniciais
        const photoEl = document.getElementById('details-photo');
        if (cidadao.photoUrl) {
            photoEl.innerHTML = `<img src="${cidadao.photoUrl}" alt="${cidadao.name}" class="w-24 h-24 rounded-full object-cover bg-gray-200">`;
        } else {
            photoEl.innerHTML = `<div class="w-24 h-24 rounded-full bg-blue-500 text-white flex items-center justify-center text-4xl font-bold">${getInitials(cidadao.name)}</div>`;
        }
        
        // Preencher Informações
        document.getElementById('details-name').textContent = cidadao.name;
        document.getElementById('details-type').textContent = cidadao.type;
        document.getElementById('details-email').textContent = cidadao.email || 'Não informado';
        document.getElementById('details-phone').textContent = cidadao.phone ? `${cidadao.phone} ${cidadao.whatsapp ? '(WhatsApp)' : ''}` : 'Não informado';
        
        // Endereço Completo
        const addressParts = [
            cidadao.logradouro,
            cidadao.numero,
            cidadao.complemento,
            cidadao.bairro,
            cidadao.cidade,
            cidadao.estado,
            cidadao.cep
        ].filter(Boolean); // Remove partes vazias
        document.getElementById('details-address').textContent = addressParts.join(', ') || 'Não informado';
        
        // Documentos
        document.getElementById('details-cpf').textContent = cidadao.cpf || 'Não informado';
        document.getElementById('details-rg').textContent = cidadao.rg || 'Não informado';
        document.getElementById('details-voterid').textContent = cidadao.voterid || 'Não informado';
        
        // Adicionais
        document.getElementById('details-dob').textContent = cidadao.dob ? formatarData(cidadao.dob) : 'Não informado';
        document.getElementById('details-sexo').textContent = cidadao.sexo || 'Não Informar';
        document.getElementById('details-profissao').textContent = cidadao.profissao || 'Não informado';
        document.getElementById('details-local-trabalho').textContent = cidadao.localTrabalho || 'Não informado';

        // Liderança
        const leader = allLeaders.find(l => l.id === cidadao.leader);
        document.getElementById('details-leader').textContent = leader ? leader.name : 'Nenhuma';

        // Filhos
        const childrenEl = document.getElementById('details-children');
        const totalFilhos = (cidadao.sons || 0) + (cidadao.daughters || 0);
        childrenEl.innerHTML = `<strong>Família:</strong> ${totalFilhos} filho(s)`;
        if (cidadao.children && cidadao.children.length > 0) {
            const childrenList = cidadao.children.map(c => 
                `<li class="text-sm ml-4">${c.name} (${formatarData(c.dob)})</li>`
            ).join('');
            childrenEl.innerHTML += `<ul class="list-disc list-inside">${childrenList}</ul>`;
        }

        // Adicionar eventos aos botões do modal de detalhes
        document.getElementById('details-view-map-btn').onclick = () => {
            closeDetailsModal();
            openMapModal([cidadao]); // Abre o mapa com apenas este cidadão
        };
        
        document.getElementById('details-share-location-btn').onclick = () => shareLocation(cidadao);

        // Exibir modal
        detailsModal.classList.remove('hidden');
        setTimeout(() => {
            content.classList.remove('scale-95', 'opacity-0');
        }, 10);
    }
    
    /**
     * Fecha o modal de Detalhes
     */
    function closeDetailsModal() {
        const detailsModal = document.getElementById('cidadao-details-modal');
        const content = detailsModal.querySelector('.transform');
        
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            detailsModal.classList.add('hidden');
            currentCidadaoIdForDetails = null;
        }, 300);
    }

    /**
     * Partilha localização via WhatsApp
     */
    function shareLocation(cidadao) {
        if (!cidadao.logradouro || !cidadao.cidade) {
            showToast("Endereço incompleto para partilhar.", "warning");
            return;
        }
        
        const address = `${cidadao.logradouro}, ${cidadao.numero || 'S/N'}, ${cidadao.bairro}, ${cidadao.cidade}, ${cidadao.estado}`;
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        
        const text = `Olá! Aqui está a localização de ${cidadao.name}:\n${address}\n\nVer no mapa:\n${url}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        
        window.open(whatsappUrl, '_blank');
    }

    // --- LÓGICA DE DEMANDAS ---

    /**
     * Abre o modal de Demandas (nova)
     */
    function openDemandaModal(cidadaoId = null) {
        currentEditingDemandaId = null;
        demandaForm.reset();
        
        // Preencher select de cidadãos
        const demandaCidadaoSelect = document.getElementById('demanda-cidadao-select');
        demandaCidadaoSelect.innerHTML = '<option value="" disabled selected>Selecione um cidadão...</option>';
        allCidadaos.sort((a,b) => a.name.localeCompare(b.name)).forEach(c => {
            demandaCidadaoSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
        
        if (cidadaoId) {
            demandaCidadaoSelect.value = cidadaoId;
            document.getElementById('demanda-modal-title').textContent = "Nova Demanda";
        } else {
            document.getElementById('demanda-modal-title').textContent = "Nova Demanda";
        }
        
        // Definir solicitante (seja da página geral ou do card)
        currentCidadaoIdForDemanda = cidadaoId;
        
        demandaModal.classList.remove('hidden');
    }

    /**
     * Fecha o modal de Demandas
     */
    function closeDemandaModal() {
        demandaModal.classList.add('hidden');
    }

    /**
     * Trata da submissão do formulário de demanda
     */
    async function handleDemandaFormSubmit(e) {
        e.preventDefault();
        const uid = auth.currentUser.uid;
        if (!uid) {
            showToast("Sessão expirada. Faça login novamente.", "error");
            return;
        }
        
        const saveBtn = document.getElementById('save-demanda-btn');
        saveBtn.disabled = true;

        try {
            const demandaData = {
                cidadaoId: document.getElementById('demanda-cidadao-select').value,
                title: document.getElementById('demanda-title').value,
                description: document.getElementById('demanda-description').value,
                status: 'pending', // Status inicial
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };
            
            // Salvar no Firestore
            await addDoc(collection(db, 'users', uid, 'demandas'), demandaData);
            showToast("Demanda adicionada com sucesso!", "success");
            closeDemandaModal();

        } catch (error) {
            console.error("Erro ao salvar demanda:", error);
            showToast("Erro ao salvar demanda. Tente novamente.", "error");
        } finally {
            saveBtn.disabled = false;
        }
    }

    // --- LÓGICA DE DETALHES DA DEMANDA ---

    /**
     * Abre o modal de Detalhes da Demanda
     */
    async function openDemandaDetailsModal(demandaId) {
        viewingDemandaId = demandaId;
        const demanda = allDemandas.find(d => d.id === demandaId);
        if (!demanda) return;

        const solicitante = allCidadaos.find(c => c.id === demanda.cidadaoId);

        // Preencher dados
        document.getElementById('details-demanda-title').textContent = demanda.title;
        document.getElementById('details-demanda-cidadao').textContent = `Solicitante: ${solicitante ? solicitante.name : 'Desconhecido'}`;
        document.getElementById('details-demanda-description').textContent = demanda.description || 'Sem descrição.';
        
        // Status
        const statusSelect = document.getElementById('details-demanda-status');
        statusSelect.value = demanda.status;
        // Remover listener antigo para evitar duplicação
        statusSelect.onchange = null; 
        // Adicionar novo listener
        statusSelect.onchange = (e) => updateDemandaStatus(demandaId, e.target.value);
        
        // Botão Excluir
        document.getElementById('delete-demanda-btn').onclick = () => requestDelete(demandaId, 'demanda');

        // Carregar Notas
        loadDemandaNotes(demandaId);

        demandaDetailsModal.classList.remove('hidden');
    }
    
    /**
     * Fecha o modal de Detalhes da Demanda
     */
    function closeDemandaDetailsModal() {
        demandaDetailsModal.classList.add('hidden');
        viewingDemandaId = null;
        if (notesUnsubscribe) {
            notesUnsubscribe(); // Parar de ouvir as notas
            notesUnsubscribe = null;
        }
    }

    /**
     * Atualiza o status de uma demanda
     */
    async function updateDemandaStatus(demandaId, newStatus) {
        const uid = auth.currentUser.uid;
        if (!uid) return;

        try {
            const docRef = doc(db, 'users', uid, 'demandas', demandaId);
            await updateDoc(docRef, {
                status: newStatus,
                updatedAt: Timestamp.now()
            });
            
            // Adicionar uma nota automática
            await addDoc(collection(docRef, 'notes'), {
                text: `Status alterado para: ${getStatusInfo(newStatus).text}`,
                createdAt: Timestamp.now(),
                author: "Sistema"
            });
            
            showToast("Status atualizado!", "success");
        } catch (error) {
            console.error("Erro ao atualizar status:", error);
            showToast("Erro ao atualizar status.", "error");
        }
    }

    /**
     * Carrega e ouve as notas de acompanhamento de uma demanda
     */
    function loadDemandaNotes(demandaId) {
        const uid = auth.currentUser.uid;
        if (!uid) return;

        const notesListEl = document.getElementById('demanda-notes-list');
        notesListEl.innerHTML = '<p class="text-sm text-gray-500">A carregar notas...</p>';
        
        const notesRef = collection(db, 'users', uid, 'demandas', demandaId, 'notes');
        const q = query(notesRef); // NOTA: Removido orderBy para evitar erro de índice

        notesUnsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                notesListEl.innerHTML = '<p class="text-sm text-gray-500">Nenhum acompanhamento registado.</p>';
                return;
            }
            
            // Ordenar manualmente no cliente
            const notes = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));

            notesListEl.innerHTML = '';
            notes.forEach(note => {
                const noteEl = document.createElement('div');
                noteEl.className = 'p-3 bg-gray-100 rounded-lg';
                noteEl.innerHTML = `
                    <p class="text-sm text-gray-800">${note.text}</p>
                    <p class="text-xs text-gray-500 text-right">
                        ${note.author || 'Utilizador'} - ${note.createdAt ? note.createdAt.toDate().toLocaleString('pt-BR') : ''}
                    </O>
                `;
                notesListEl.appendChild(noteEl);
            });
            // Auto-scroll para a última nota
            notesListEl.scrollTop = notesListEl.scrollHeight;
        }, (error) => {
            console.error("Erro ao carregar notas:", error);
            notesListEl.innerHTML = '<p class="text-sm text-red-500">Erro ao carregar notas.</p>';
        });
    }

    /**
     * Trata da submissão do formulário de nova nota
     */
    async function handleAddNoteSubmit(e) {
        e.preventDefault();
        const uid = auth.currentUser.uid;
        if (!uid || !viewingDemandaId) return;

        const newNoteText = document.getElementById('new-note-text');
        const text = newNoteText.value.trim();
        if (!text) return;
        
        try {
            const notesRef = collection(db, 'users', uid, 'demandas', viewingDemandaId, 'notes');
            await addDoc(notesRef, {
                text: text,
                createdAt: Timestamp.now(),
                author: auth.currentUser.email || "Utilizador"
            });
            newNoteText.value = ''; // Limpar campo
        } catch (error) {
            console.error("Erro ao adicionar nota:", error);
            showToast("Erro ao salvar nota.", "error");
        }
    }

    // --- LÓGICA DE EXCLUSÃO ---

    /**
     * Abre o modal de confirmação para exclusão
     */
    function requestDelete(itemId, type) {
        itemToDelete = { id: itemId, type: type };
        const modal = document.getElementById('confirmation-modal');
        const title = document.getElementById('confirmation-title');
        const message = document.getElementById('confirmation-message');

        if (type === 'cidadao') {
            const cidadao = allCidadaos.find(c => c.id === itemId);
            title.textContent = 'Excluir Cidadão';
            message.textContent = `Tem a certeza que quer excluir "${cidadao.name}"? Esta ação também excluirá todas as demandas associadas a ele.`;
        } else if (type === 'demanda') {
            const demanda = allDemandas.find(d => d.id === demandaId);
            title.textContent = 'Excluir Demanda';
            message.textContent = `Tem a certeza que quer excluir a demanda "${demanda.title}"?`;
        }
        
        modal.classList.remove('hidden');
    }

    /**
     * Fecha o modal de confirmação
     */
    function closeConfirmationModal() {
        document.getElementById('confirmation-modal').classList.add('hidden');
        itemToDelete = { id: null, type: null };
    }

    /**
     * Executa a exclusão após confirmação
     */
    async function handleDeleteConfirmation() {
        const { id, type } = itemToDelete;
        if (!id || !type) return;

        const uid = auth.currentUser.uid;
        if (!uid) return;

        const btn = document.getElementById('confirm-delete-btn');
        btn.disabled = true;

        try {
            if (type === 'cidadao') {
                // Exclusão de Cidadão (e suas demandas)
                const batch = writeBatch(db);
                
                // 1. Marcar cidadão para exclusão
                const cidadaoRef = doc(db, 'users', uid, 'cidadaos', id);
                batch.delete(cidadaoRef);
                
                // 2. Encontrar e marcar demandas associadas para exclusão
                const demandasQuery = query(collection(db, 'users', uid, 'demandas'), where("cidadaoId", "==", id));
                const demandasSnapshot = await getDocs(demandasQuery);
                
                demandasSnapshot.forEach(demandaDoc => {
                    batch.delete(demandaDoc.ref);
                    // NOTA: Excluir subcoleções (notas) é mais complexo e requer leitura
                    // Aqui, estamos apenas a excluir o documento principal da demanda.
                });
                
                await batch.commit();
                showToast("Cidadão e suas demandas foram excluídos.", "success");

            } else if (type === 'demanda') {
                // Exclusão de Demanda (e suas notas)
                const demandaRef = doc(db, 'users', uid, 'demandas', id);
                
                // 1. Excluir notas (subcoleção)
                const notesRef = collection(demandaRef, 'notes');
                const notesSnapshot = await getDocs(notesRef);
                const batch = writeBatch(db);
                notesSnapshot.forEach(noteDoc => {
                    batch.delete(noteDoc.ref);
                });
                
                // 2. Excluir demanda
                batch.delete(demandaRef);
                
                await batch.commit();
                
                closeDemandaDetailsModal(); // Fechar modal se estiver aberto
                showToast("Demanda excluída com sucesso.", "success");
            }

        } catch (error) {
            console.error(`Erro ao excluir ${type}:`, error);
            showToast(`Erro ao excluir ${type}.`, "error");
        } finally {
            btn.disabled = false;
            closeConfirmationModal();
        }
    }


    // --- LÓGICA DO MAPA ---

    /**
     * Inicializa o Leaflet Map
     */
    function initializeMap() {
        if (map) {
            map.remove(); // Remover mapa anterior se existir
        }
        map = L.map('map').setView([-14.2350, -51.9253], 4); // Centro do Brasil

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        markers = []; // Limpar marcadores antigos
    }

    /**
     * Abre o modal do mapa e plota os cidadãos
     */
    async function openMapModal(cidadaosToPlot = null) {
        mapModal.classList.remove('hidden');
        
        if (!map) {
            setTimeout(initializeMap, 100); // Dar tempo para o modal renderizar
        } else {
            // Limpar marcadores antigos
            markers.forEach(m => m.remove());
            markers = [];
        }
        
        // Aguardar a inicialização do mapa
        await new Promise(resolve => setTimeout(resolve, 150)); 
        map.invalidateSize(); // Forçar o mapa a recalcular o tamanho
        
        const cidadaos = cidadaosToPlot || allCidadaos;
        const bounds = [];

        for (const cidadao of cidadaos) {
            if (cidadao.logradouro && cidadao.cidade) {
                try {
                    const address = `${cidadao.logradouro}, ${cidadao.numero || ''}, ${cidadao.bairro}, ${cidadao.cidade}, ${cidadao.estado}`;
                    
                    // Usar Nominatim (API gratuita do OpenStreetMap)
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
                    const data = await response.json();
                    
                    if (data && data.length > 0) {
                        const { lat, lon } = data[0];
                        const latLng = [parseFloat(lat), parseFloat(lon)];
                        
                        const marker = L.marker(latLng).addTo(map);
                        marker.bindPopup(`
                            <strong>${cidadao.name}</strong><br>
                            ${cidadao.type}<br>
                            ${cidadao.logradouro}, ${cidadao.numero || 'S/N'}
                        `);
                        markers.push(marker);
                        bounds.push(latLng);
                    }
                } catch (error) {
                    console.warn(`Erro ao geocodificar ${cidadao.name}:`, error);
                }
            }
        }
        
        // Ajustar o zoom
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (!cidadaosToPlot) {
            // Se nenhum cidadão tiver endereço (mapa geral), voltar ao centro do Brasil
            map.setView([-14.2350, -51.9253], 4);
        }
    }

    /**
     * Fecha o modal do mapa
     */
    function closeMapModal() {
        mapModal.classList.add('hidden');
    }

    // --- LÓGICA DO RELATÓRIO/IMPRESSÃO ---
    
    /**
     * Gera um relatório formatado para impressão (ou PDF)
     */
    function generatePrintReport() {
        const filteredCidadaos = getFilteredCidadaos(); // Usar os filtros
        
        if (filteredCidadaos.length === 0) {
            showToast("Nenhum cidadão encontrado para gerar o relatório.", "warning");
            return;
        }

        const reportWindow = window.open('', '', 'width=800,height=600');
        reportWindow.document.write('<html><head><title>Relatório de Cidadãos</title>');
        // Estilos para impressão
        reportWindow.document.write(`
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
                @media print {
                    button { display: none; }
                }
            </style>
        `);
        reportWindow.document.write('</head><body>');
        reportWindow.document.write('<h1>Relatório de Cidadãos</h1>');
        reportWindow.document.write(`<p>Total de cidadãos: ${filteredCidadaos.length}</p>`);
        reportWindow.document.write('<button onclick="window.print()">Imprimir</button>');
        
        // Criar tabela
        reportWindow.document.write('<table>');
        reportWindow.document.write(`
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Telefone</th>
                    <th>Email</th>
                    <th>Endereço Completo</th>
                </tr>
            </thead>
            <tbody>
        `);
        
        // Preencher tabela
        filteredCidadaos.forEach(cidadao => {
            const addressParts = [
                cidadao.logradouro,
                cidadao.numero,
                cidadao.complemento,
                cidadao.bairro,
                cidadao.cidade,
                cidadao.estado,
                cidadao.cep
            ].filter(Boolean);
            const endereco = addressParts.join(', ') || 'Não informado';
            
            reportWindow.document.write(`
                <tr>
                    <td>${cidadao.name}</td>
                    <td>${cidadao.type}</td>
                    <td>${cidadao.phone || ''} ${cidadao.whatsapp ? '(W)' : ''}</td>
                    <td>${cidadao.email}</td>
                    <td>${endereco}</td>
                </tr>
            `);
        });

        reportWindow.document.write('</tbody></table>');
        reportWindow.document.write('</body></html>');
        reportWindow.document.close();
    }


    // --- FUNÇÕES UTILITÁRIAS ---

    /**
     * Troca a página visível na aplicação
     */
    function switchPage(pageId) {
        // Esconder todas as páginas
        document.querySelectorAll('.page').forEach(page => {
            page.classList.add('hidden');
            page.classList.remove('flex', 'flex-col'); // Remover classes de layout
        });
        
        // Mostrar a página nova
        const newPage = document.getElementById(pageId);
        if (newPage) {
            newPage.classList.remove('hidden');
            // Adicionar classes de layout flex se for uma página principal
            if(pageId === 'dashboard-page' || pageId === 'cidadaos-page' || pageId === 'demandas-page') {
                newPage.classList.add('flex', 'flex-col');
            }
        }
        
        // Atualizar link ativo na sidebar
        document.querySelectorAll('#sidebar-nav a').forEach(link => {
            link.classList.remove('bg-slate-900', 'font-semibold');
            if (link.getAttribute('href') === `#${pageId.replace('-page', '')}`) {
                link.classList.add('bg-slate-900', 'font-semibold');
            }
        });
        
        // Atualizar dashboard se for a página
        if (pageId === 'dashboard-page') {
            updateDashboard();
        }
    }

    /**
     * Exibe uma notificação (toast)
     */
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        
        let bgColor, textColor, icon;
        
        switch (type) {
            case 'success':
                bgColor = 'bg-green-500'; textColor = 'text-white'; icon = '✓';
                break;
            case 'error':
                bgColor = 'bg-red-500'; textColor = 'text-white'; icon = '✖';
                break;
            case 'warning':
                bgColor = 'bg-yellow-400'; textColor = 'text-black'; icon = '!';
                break;
            default:
                bgColor = 'bg-blue-500'; textColor = 'text-white'; icon = 'ℹ';
                break;
        }

        toast.className = `p-4 rounded-lg shadow-lg flex items-center gap-3 ${bgColor} ${textColor} transform translate-x-full opacity-0 transition-all duration-300 ease-out`;
        toast.innerHTML = `<span class="font-bold text-lg">${icon}</span> <span>${message}</span>`;
        
        container.appendChild(toast);
        
        // Animação de entrada
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 10);

        // Animação de saída
        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000); // Toast desaparece após 3 segundos
    }

    /**
     * Retorna as iniciais de um nome
     */
    function getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return (name[0]).toUpperCase();
    }
    
    /**
     * Retorna informações de status (texto, classes, cor)
     */
    function getStatusInfo(status) {
        switch (status) {
            case 'pending':
                return { text: 'Pendente', classes: 'status-badge status-pending', color: '#F59E0B' };
            case 'inprogress':
                return { text: 'Em Andamento', classes: 'status-badge status-inprogress', color: '#3B82F6' };
            case 'completed':
                return { text: 'Concluída', classes: 'status-badge status-completed', color: '#10B981' };
            default:
                return { text: 'N/A', classes: 'status-badge', color: '#6B7280' };
        }
    }
    
    /**
     * Formata data 'YYYY-MM-DD' para 'DD/MM/YYYY'
     */
    function formatarData(dateString) {
        if (!dateString) return 'N/A';
        try {
            const parts = dateString.split('-');
            if (parts.length !== 3) return dateString; // Retorna original se não for YYYY-MM-DD
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        } catch (e) {
            return dateString; // Retorna original em caso de erro
        }
    }
    
    /**
     * Calcula a faixa etária com base na data de nascimento
     */
    function getFaixaEtaria(dob) {
        if (!dob) return 'N/A';
        
        try {
            const birthDate = new Date(dob);
            if (isNaN(birthDate.getTime())) return 'N/A';
            
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            
            if (age <= 17) return '0-17';
            if (age <= 25) return '18-25';
            if (age <= 35) return '26-35';
            if (age <= 50) return '36-50';
            if (age <= 65) return '51-65';
            if (age >= 66) return '66+';
            
            return 'N/A';
        } catch (e) {
            return 'N/A';
        }
    }

}); // Fim do DOMContentLoaded