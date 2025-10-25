// 1. Importar as bibliotecas do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, orderBy, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 2. Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC5XTEAfbKkN4x6iw1dZPWHvtcNC_a_eVw",
  authDomain: "gestor-valente-crm.firebaseapp.com",
  projectId: "gestor-valente-crm",
  storageBucket: "gestor-valente-crm.firebasestorage.app",
  messagingSenderId: "1015920298445",
  appId: "1:1015920298445:web:38f28f0802756c250d9c84"
};;

// 3. Inicializar o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const cidadaosCollection = collection(db, "cidadaos");
const demandasCollection = collection(db, "demandas");

document.addEventListener('DOMContentLoaded', () => {
    const loginPage = document.getElementById('login-page');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    
    onAuthStateChanged(auth, user => {
        if (user) {
            loginPage.classList.add('hidden');
            appContainer.classList.remove('hidden');
            appContainer.classList.add('flex');
            initializeMainApp();
        } else {
            loginPage.classList.remove('hidden');
            appContainer.classList.add('hidden');
            appContainer.classList.remove('flex');
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email-address').value;
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('login-btn');
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<div class="spinner"></div>';
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            showToast('Email ou palavra-passe inválidos.', 'error');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Entrar';
        }
    });
    
    let appInitialized = false;
    function initializeMainApp() {
        if (appInitialized) return;
        appInitialized = true;

        const logoutBtn = document.getElementById('logout-btn');
        const sidebarNav = document.getElementById('sidebar-nav');
        const pages = document.querySelectorAll('.page');
        const dashboardTotalCidadaos = document.getElementById('dashboard-total-cidadaos');
        const dashboardTotalDemandas = document.getElementById('dashboard-total-demandas');
        const aniversariantesList = document.getElementById('aniversariantes-list');
        const demandasRecentesList = document.getElementById('demandas-recentes-list');
        const addCidadaoBtn = document.getElementById('add-cidadao-btn');
        const cidadaoModal = document.getElementById('cidadao-modal');
        const cidadaoModalTitle = document.getElementById('cidadao-modal-title');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        const cidadaoForm = document.getElementById('cidadao-form');
        const saveBtn = document.getElementById('save-btn');
        const cidadaosGrid = document.getElementById('cidadaos-grid');
        const searchInput = document.getElementById('search-input');
        const sonsInput = document.getElementById('cidadao-sons');
        const daughtersInput = document.getElementById('cidadao-daughters');
        const childrenContainer = document.getElementById('children-details-container');
        const leaderSelect = document.getElementById('cidadao-leader');
        const filterType = document.getElementById('filter-type');
        const filterBairro = document.getElementById('filter-bairro');
        const filterLeader = document.getElementById('filter-leader');
        // [INÍCIO DA ALTERAÇÃO] - Capturar novos elementos
        const filterSexo = document.getElementById('filter-sexo');
        const filterFaixaEtaria = document.getElementById('filter-faixa-etaria');
        // [FIM DA ALTERAÇÃO]
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        const generateReportBtn = document.getElementById('generate-report-btn');
        const cidadaoDetailsModal = document.getElementById('cidadao-details-modal');
        const closeDetailsModalBtn = document.getElementById('close-details-modal-btn');
        const detailsViewMapBtn = document.getElementById('details-view-map-btn');
        const detailsShareLocationBtn = document.getElementById('details-share-location-btn');
        const addDemandaGeralBtn = document.getElementById('add-demanda-geral-btn');
        const allDemandasList = document.getElementById('all-demandas-list');
        const demandaFilterStatus = document.getElementById('demanda-filter-status');
        const demandaFilterLeader = document.getElementById('demanda-filter-leader');
        const demandaClearFiltersBtn = document.getElementById('demanda-clear-filters-btn');
        const demandaModal = document.getElementById('demanda-modal');
        const closeDemandaModalBtn = document.getElementById('close-demanda-modal-btn');
        const cancelDemandaBtn = document.getElementById('cancel-demanda-btn');
        const demandaForm = document.getElementById('demanda-form');
        const demandaFormCidadaoSelect = document.getElementById('demanda-cidadao-select');
        const demandaDetailsModal = document.getElementById('demanda-details-modal');
        const closeDemandaDetailsBtn = document.getElementById('close-demanda-details-btn');
        const detailsDemandaTitle = document.getElementById('details-demanda-title');
        const detailsDemandaCidadao = document.getElementById('details-demanda-cidadao');
        const detailsDemandaDescription = document.getElementById('details-demanda-description');
        const detailsDemandaStatus = document.getElementById('details-demanda-status');
        const demandaNotesList = document.getElementById('demanda-notes-list');
        const addNoteForm = document.getElementById('add-note-form');
        const newNoteText = document.getElementById('new-note-text');
        const deleteDemandaBtn = document.getElementById('delete-demanda-btn');
        const mapModal = document.getElementById('map-modal');
        const viewMapBtn = document.getElementById('view-map-btn');
        const closeMapBtn = document.getElementById('close-map-btn');
        const confirmationModal = document.getElementById('confirmation-modal');
        const confirmationTitle = document.getElementById('confirmation-title');
        const confirmationMessage = document.getElementById('confirmation-message');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

        let allCidadaos = [], allDemandas = [], allLeaders = [], editingCidadaoId = null, viewingCidadaoId = null;
        let itemToDelete = { id: null, type: null }, viewingDemandaId = null, notesUnsubscribe = null;
        // INICIALIZAÇÃO DOS NOVOS GRÁFICOS
        let map = null, markers = [], cidadaosChart = null, demandasChart = null, cidadaosBairroChart = null, cidadaosSexoChart = null, cidadaosFaixaEtariaChart = null;

        logoutBtn.addEventListener('click', async () => {
            try { await signOut(auth); } catch (error) { showToast('Erro ao terminar a sessão.', 'error'); }
        });
        
        function switchPage(pageId) {
            pages.forEach(p => p.classList.add('hidden'));
            document.getElementById(pageId).classList.remove('hidden');
            sidebarNav.querySelectorAll('a').forEach(link => {
                link.classList.remove('bg-slate-900', 'font-semibold');
                link.classList.add('hover:bg-slate-700');
                if (link.getAttribute('href') === `#${pageId.replace('-page', '')}`) {
                    link.classList.add('bg-slate-900', 'font-semibold');
                    link.classList.remove('hover:bg-slate-700');
                }
            });
        }
        sidebarNav.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) { e.preventDefault(); switchPage(link.getAttribute('href').substring(1) + '-page'); }
        });
        
        function updateDashboard() {
            dashboardTotalCidadaos.textContent = allCidadaos.length;
            dashboardTotalDemandas.textContent = allDemandas.length;
            renderAniversariantesDoMes();
            renderDemandasRecentes();
            renderCidadaosPorTipoChart();
            renderDemandasPorStatusChart();
            // CHAMADA DOS NOVOS GRÁFICOS
            renderCidadaosPorBairroChart();
            renderCidadaosPorSexoChart();
            renderCidadaosPorFaixaEtariaChart();
        }
        function renderAniversariantesDoMes() {
            const today = new Date();
            const currentMonth = today.getMonth();
            const aniversariantes = allCidadaos.filter(c => {
                if (!c.dob) return false;
                const birthDate = new Date(c.dob);
                return birthDate.getUTCMonth() === currentMonth;
            }).sort((a, b) => new Date(a.dob).getUTCDate() - new Date(b.dob).getUTCDate());
            aniversariantesList.innerHTML = '';
            if (aniversariantes.length === 0) {
                aniversariantesList.innerHTML = '<p class="text-gray-500 text-sm">Nenhum aniversariante este mês.</p>';
            } else {
                aniversariantes.forEach(c => {
                    const birthDate = new Date(c.dob);
                    const day = String(birthDate.getUTCDate()).padStart(2, '0');
                    const el = document.createElement('div');
                    el.className = 'aniversariante-item flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 cursor-pointer';
                    el.dataset.id = c.id;
                    el.innerHTML = `<span class="font-medium text-gray-700 pointer-events-none">${c.name}</span><span class="font-bold text-blue-600 pointer-events-none">${day}</span>`;
                    aniversariantesList.appendChild(el);
                });
            }
        }
        aniversariantesList.addEventListener('click', (e) => {
            const item = e.target.closest('.aniversariante-item');
            if (item) openCidadaoDetailsModal(item.dataset.id);
        });
        function renderDemandasRecentes() {
            demandasRecentesList.innerHTML = '';
            const recentDemandas = allDemandas.slice(0, 5);
            if (recentDemandas.length === 0) {
                demandasRecentesList.innerHTML = '<p class="text-gray-500 text-sm">Nenhuma demanda recente.</p>';
            } else {
                recentDemandas.forEach(demanda => {
                    const cidadao = allCidadaos.find(c => c.id === demanda.cidadaoId);
                    const el = document.createElement('div');
                    el.className = 'p-2 rounded-lg hover:bg-gray-100';
                    el.innerHTML = `<p class="font-semibold text-gray-800 truncate">${demanda.title}</p><p class="text-sm text-gray-500">Para: ${cidadao ? cidadao.name : 'Desconhecido'}</p>`;
                    demandasRecentesList.appendChild(el);
                });
            }
        }
        function renderCidadaosPorTipoChart() {
            const ctx = document.getElementById('cidadaos-por-tipo-chart').getContext('2d');
            const typeCounts = allCidadaos.reduce((acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, {});
            if (cidadaosChart) cidadaosChart.destroy();
            cidadaosChart = new Chart(ctx, { type: 'doughnut', data: { labels: Object.keys(typeCounts), datasets: [{ data: Object.values(typeCounts), backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#f97316'] }] }, options: { responsive: true, plugins: { legend: { position: 'top' } } } });
        }
        function renderDemandasPorStatusChart() {
            const ctx = document.getElementById('demandas-por-status-chart').getContext('2d');
            const statusCounts = allDemandas.reduce((acc, d) => { const status = d.status || 'pending'; acc[status] = (acc[status] || 0) + 1; return acc; }, {});
            if (demandasChart) demandasChart.destroy();
            demandasChart = new Chart(ctx, { type: 'bar', data: { labels: ['Status das Demandas'], datasets: [ { label: 'Pendentes', data: [statusCounts['pending'] || 0], backgroundColor: '#f59e0b' }, { label: 'Em Andamento', data: [statusCounts['inprogress'] || 0], backgroundColor: '#3b82f6' }, { label: 'Concluídas', data: [statusCounts['completed'] || 0], backgroundColor: '#22c55e' } ] }, options: { responsive: true, indexAxis: 'y', scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } } });
        }

        // --- NOVAS FUNÇÕES DE GRÁFICO ---

        function getAge(dateString) {
            if (!dateString) return null;
            const today = new Date();
            const birthDate = new Date(dateString);
            let age = today.getFullYear() - birthDate.getUTCFullYear();
            const m = today.getUTCMonth() - birthDate.getUTCMonth();
            if (m < 0 || (m === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
                age--;
            }
            return age;
        }

        function getAgeRange(age) {
            if (age === null || age < 0) return 'N/A';
            if (age <= 17) return '0-17';
            if (age <= 25) return '18-25';
            if (age <= 35) return '26-35';
            if (age <= 50) return '36-50';
            if (age <= 65) return '51-65';
            return '66+';
        }

        function renderCidadaosPorBairroChart() {
            const ctx = document.getElementById('cidadaos-por-bairro-chart').getContext('2d');
            const bairroCounts = allCidadaos.reduce((acc, c) => { 
                const bairro = c.address?.bairro || 'N/A';
                acc[bairro] = (acc[bairro] || 0) + 1; 
                return acc; 
            }, {});

            // Ordenar bairros por contagem (do maior para o menor) e pegar os 10 primeiros
            const sortedBairros = Object.entries(bairroCounts)
                .sort(([,a],[,b]) => b-a)
                .slice(0, 10);
            
            const labels = sortedBairros.map(item => item[0]);
            const data = sortedBairros.map(item => item[1]);

            if (cidadaosBairroChart) cidadaosBairroChart.destroy();
            cidadaosBairroChart = new Chart(ctx, { 
                type: 'bar', 
                data: { 
                    labels: labels, 
                    datasets: [{ 
                        label: 'Cidadãos',
                        data: data, 
                        backgroundColor: '#3b82f6' 
                    }] 
                }, 
                options: { 
                    responsive: true, 
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                } 
            });
        }

        function renderCidadaosPorSexoChart() {
            const ctx = document.getElementById('cidadaos-por-sexo-chart').getContext('2d');
            const sexoCounts = allCidadaos.reduce((acc, c) => { 
                const sexo = c.sexo || 'Não Informar';
                acc[sexo] = (acc[sexo] || 0) + 1; 
                return acc; 
            }, {});
            
            if (cidadaosSexoChart) cidadaosSexoChart.destroy();
            cidadaosSexoChart = new Chart(ctx, { 
                type: 'pie', 
                data: { 
                    labels: Object.keys(sexoCounts), 
                    datasets: [{ 
                        data: Object.values(sexoCounts), 
                        backgroundColor: ['#3b82f6', '#ec4899', '#f97316', '#6b7280'] 
                    }] 
                }, 
                options: { 
                    responsive: true, 
                    plugins: { legend: { position: 'top' } } 
                } 
            });
        }

        function renderCidadaosPorFaixaEtariaChart() {
            const ctx = document.getElementById('cidadaos-por-faixa-etaria-chart').getContext('2d');
            const faixaEtariaCounts = allCidadaos.reduce((acc, c) => { 
                const age = getAge(c.dob);
                const range = getAgeRange(age);
                acc[range] = (acc[range] || 0) + 1; 
                return acc; 
            }, {});

            // Garantir a ordem correta dos rótulos
            const labels = ['0-17', '18-25', '26-35', '36-50', '51-65', '66+', 'N/A'];
            const data = labels.map(label => faixaEtariaCounts[label] || 0);

            if (cidadaosFaixaEtariaChart) cidadaosFaixaEtariaChart.destroy();
            cidadaosFaixaEtariaChart = new Chart(ctx, { 
                type: 'pie', 
                data: { 
                    labels: labels, 
                    datasets: [{ 
                        data: data, 
                        backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#6b7280'] 
                    }] 
                }, 
                options: { 
                    responsive: true, 
                    plugins: { legend: { position: 'top' } } 
                } 
            });
        }

        // --- FIM DAS NOVAS FUNÇÕES DE GRÁFICO ---

        function renderCidadaos() {
            let filteredCidadaos = [...allCidadaos];
            const searchTerm = searchInput.value.toLowerCase();
            if (searchTerm) { filteredCidadaos = filteredCidadaos.filter(c => c.name.toLowerCase().includes(searchTerm) || c.email.toLowerCase().includes(searchTerm) || (c.cpf && c.cpf.includes(searchTerm))); }
            const type = filterType.value;
            if (type) { filteredCidadaos = filteredCidadaos.filter(c => c.type === type); }
            const bairro = filterBairro.value;
            if (bairro) { filteredCidadaos = filteredCidadaos.filter(c => c.address && c.address.bairro === bairro); }
            const leaderId = filterLeader.value;
            if (leaderId) { filteredCidadaos = filteredCidadaos.filter(c => c.leaderId === leaderId); }

            // [INÍCIO DA ALTERAÇÃO] - Adicionar lógica dos novos filtros
            const sexo = filterSexo.value;
            if (sexo) {
                filteredCidadaos = filteredCidadaos.filter(c => (c.sexo || 'Não Informar') === sexo);
            }

            const faixaEtaria = filterFaixaEtaria.value;
            if (faixaEtaria) {
                filteredCidadaos = filteredCidadaos.filter(c => {
                    const age = getAge(c.dob);
                    const range = getAgeRange(age);
                    return range === faixaEtaria;
                });
            }
            // [FIM DA ALTERAÇÃO]
            
            if (filteredCidadaos.length === 0) { cidadaosGrid.innerHTML = `<p class="text-slate-500 col-span-full text-center mt-8">Nenhum cidadão encontrado com os filtros aplicados.</p>`; return; }
            cidadaosGrid.innerHTML = filteredCidadaos.map(cidadao => {
                const photoElement = cidadao.photo ? `<img src="${cidadao.photo}" class="w-24 h-24 object-cover rounded-full" alt="Foto de ${cidadao.name}">` : `<div class="w-24 h-24 ${cidadao.color || 'bg-gray-500'} rounded-full flex items-center justify-center text-white text-3xl font-bold">${cidadao.initials || '??'}</div>`;
                return `
                    <div data-id="${cidadao.id}" class="cidadao-card bg-white rounded-lg p-5 shadow-sm text-center flex flex-col items-center transition-transform transform hover:-translate-y-1 cursor-pointer">
                        <div class="relative w-24 h-24 mb-4 pointer-events-none">
                            ${photoElement}
                            <div class="absolute -top-1 -right-1 flex flex-col gap-1 pointer-events-auto">
                                <button data-id="${cidadao.id}" class="edit-cidadao-btn bg-gray-600 text-white w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-700 p-1.5"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg></button>
                                <button data-id="${cidadao.id}" class="delete-cidadao-btn bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-600 text-xl font-bold">&times;</button>
                            </div>
                        </div>
                        <h3 class="text-lg font-bold text-gray-800 pointer-events-none">${cidadao.name}</h3>
                        <p class="text-gray-500 pointer-events-none">${cidadao.type}</p>
                        <p class="text-xs text-gray-400 mt-2 truncate w-full pointer-events-none" title="${cidadao.phone || ''}">${cidadao.phone || 'Sem contato'}</p>
                    </div>
                `;
            }).join('');
        }
        // [INÍCIO DA ALTERAÇÃO] - Adicionar novos filtros ao event listener
        [searchInput, filterType, filterBairro, filterLeader, filterSexo, filterFaixaEtaria].forEach(el => el.addEventListener('input', renderCidadaos));
        // [FIM DA ALTERAÇÃO]
        clearFiltersBtn.addEventListener('click', () => {
            searchInput.value = '';
            filterType.value = '';
            filterBairro.value = '';
            filterLeader.value = '';
            // [INÍCIO DA ALTERAÇÃO] - Resetar novos filtros
            filterSexo.value = '';
            filterFaixaEtaria.value = '';
            // [FIM DA ALTERAÇÃO]
            renderCidadaos();
        });
        function populateFilterDropdowns() {
            const bairros = [...new Set(allCidadaos.map(c => c.address?.bairro).filter(Boolean))].sort();
            const currentBairro = filterBairro.value;
            filterBairro.innerHTML = '<option value="">Filtrar por Bairro</option>';
            bairros.forEach(bairro => {
                const option = document.createElement('option');
                option.value = bairro;
                option.textContent = bairro;
                filterBairro.appendChild(option);
            });
            filterBairro.value = currentBairro;
            const currentLeader = filterLeader.value;
            filterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>';
            allLeaders.forEach(leader => {
                const option = document.createElement('option');
                option.value = leader.id;
                option.textContent = leader.name;
                filterLeader.appendChild(option);
            });
            filterLeader.value = currentLeader;
        }
        
        function openCidadaoModal(cidadaoId = null) {
            editingCidadaoId = cidadaoId;
            populateLeadersDropdown(true); 
            if (editingCidadaoId) {
                const cidadao = allCidadaos.find(c => c.id === editingCidadaoId);
                cidadaoModalTitle.textContent = "Editar Cidadão";
                document.getElementById('cidadao-name').value = cidadao.name;
                document.getElementById('cidadao-email').value = cidadao.email;
                document.getElementById('cidadao-dob').value = cidadao.dob || '';
                document.getElementById('cidadao-sexo').value = cidadao.sexo || 'Não Informar'; // ATUALIZAÇÃO PARA EDITAR
                document.getElementById('cidadao-type').value = cidadao.type;
                document.getElementById('cidadao-leader').value = cidadao.leaderId || '';
                document.getElementById('cidadao-cpf').value = cidadao.cpf || '';
                document.getElementById('cidadao-rg').value = cidadao.rg || '';
                document.getElementById('cidadao-voterid').value = cidadao.voterId || '';
                document.getElementById('cidadao-phone').value = cidadao.phone || '';
                document.getElementById('cidadao-whatsapp').checked = cidadao.hasWhatsApp || false;
                document.getElementById('cidadao-profissao').value = cidadao.profissao || '';
                document.getElementById('cidadao-local-trabalho').value = cidadao.localTrabalho || '';
                
                if(cidadao.address) {
                    document.getElementById('cidadao-cep').value = cidadao.address.cep || '';
                    document.getElementById('cidadao-logradouro').value = cidadao.address.logradouro || '';
                    document.getElementById('cidadao-numero').value = cidadao.address.numero || '';
                    document.getElementById('cidadao-complemento').value = cidadao.address.complemento || '';
                    document.getElementById('cidadao-bairro').value = cidadao.address.bairro || '';
                    document.getElementById('cidadao-cidade').value = cidadao.address.cidade || '';
                    document.getElementById('cidadao-estado').value = cidadao.address.estado || '';
                }

                sonsInput.value = cidadao.sons || 0;
                daughtersInput.value = cidadao.daughters || 0;
                renderChildrenFields();
                 if (cidadao.children && cidadao.children.length > 0) {
                     const fieldsets = childrenContainer.querySelectorAll('fieldset');
                     fieldsets.forEach((fieldset, index) => {
                         if(cidadao.children[index]) {
                             fieldset.querySelector('.child-detail-name').value = cidadao.children[index].name || '';
                             fieldset.querySelector('.child-detail-cpf').value = cidadao.children[index].cpf || '';
                             fieldset.querySelector('.child-detail-dob').value = cidadao.children[index].dob || '';
                         }
                     });
                 }
                document.getElementById('cidadao-photo-url').value = cidadao.photo && cidadao.photo.startsWith('http') ? cidadao.photo : '';
            } else {
                cidadaoModalTitle.textContent = "Adicionar Novo Cidadão";
            }
            cidadaoModal.classList.remove('hidden');
            setTimeout(() => document.getElementById('modal-content').classList.remove('scale-95', 'opacity-0'), 10);
        }

        function closeCidadaoModal() {
            document.getElementById('modal-content').classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                cidadaoModal.classList.add('hidden');
                cidadaoForm.reset();
                childrenContainer.innerHTML = '';
                document.getElementById('file-name-display').textContent = 'Nenhum ficheiro selecionado';
                editingCidadaoId = null;
            }, 300);
        }
        addCidadaoBtn.addEventListener('click', () => openCidadaoModal());
        closeModalBtn.addEventListener('click', closeCidadaoModal);
        cancelBtn.addEventListener('click', closeCidadaoModal);
        
        cidadaosGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.cidadao-card');
            const editBtn = e.target.closest('.edit-cidadao-btn');
            const deleteBtn = e.target.closest('.delete-cidadao-btn');
            
            if (editBtn) {
                openCidadaoModal(editBtn.dataset.id);
            } else if (deleteBtn) {
                openConfirmationModal(deleteBtn.dataset.id, 'cidadao');
            } else if (card) {
                openCidadaoDetailsModal(card.dataset.id);
            }
        });
        
        closeDetailsModalBtn.addEventListener('click', closeCidadaoDetailsModal);

        document.getElementById('cidadao-cep').addEventListener('blur', async (e) => {
            const cep = e.target.value.replace(/\D/g, '');
            if (cep.length !== 8) return;
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                if (data.erro) { showToast('CEP não encontrado.', 'error'); return; }
                document.getElementById('cidadao-logradouro').value = data.logradouro;
                document.getElementById('cidadao-bairro').value = data.bairro;
                document.getElementById('cidadao-cidade').value = data.localidade;
                document.getElementById('cidadao-estado').value = data.uf;
                document.getElementById('cidadao-numero').focus();
            } catch (error) { console.error('Erro ao buscar CEP:', error); showToast('Erro ao consultar o CEP.', 'error'); }
        });

        function renderChildrenFields() {
            childrenContainer.innerHTML = '';
            const sonsCount = parseInt(sonsInput.value) || 0;
            const daughtersCount = parseInt(daughtersInput.value) || 0;
            if (sonsCount === 0 && daughtersCount === 0) return;

            const header = document.createElement('h3');
            header.className = 'text-lg font-semibold text-gray-800 border-t pt-4';
            header.textContent = 'Detalhes dos Filhos e Filhas';
            childrenContainer.appendChild(header);

            for (let i = 1; i <= sonsCount; i++) childrenContainer.appendChild(createChildFieldset(i, 'Filho'));
            for (let i = 1; i <= daughtersCount; i++) childrenContainer.appendChild(createChildFieldset(i, 'Filha'));
        }
        function createChildFieldset(index, type) {
            const fieldset = document.createElement('fieldset');
            fieldset.className = 'border p-3 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2';
            fieldset.innerHTML = `
                <legend class="px-2 font-medium text-sm">${type} ${index}</legend>
                <div><label class="block text-xs font-medium text-gray-600">Nome</label><input type="text" class="child-detail-name w-full border border-gray-300 p-2 rounded-lg mt-1" required></div>
                <div><label class="block text-xs font-medium text-gray-600">CPF</label><input type="text" class="child-detail-cpf w-full border border-gray-300 p-2 rounded-lg mt-1" placeholder="000.000.000-00"></div>
                <div><label class="block text-xs font-medium text-gray-600">Data de Nasc.</label><input type="date" class="child-detail-dob w-full border border-gray-300 p-2 rounded-lg mt-1"></div>
            `;
            return fieldset;
        }
        sonsInput.addEventListener('input', renderChildrenFields);
        daughtersInput.addEventListener('input', renderChildrenFields);
        const maskpatterns = { 'cidadao-cpf': '000.000.000-00', 'cidadao-cep': '00000-000', 'cidadao-phone': '(00) 00000-0000', 'cidadao-voterid': '0000 0000 0000' };
        function applyMask(e) {
            const { id, value } = e.target;
            let pattern = maskpatterns[id];
             if (!pattern && e.target.classList.contains('child-detail-cpf')) { pattern = '000.000.000-00'; }
            if (!pattern) return;
            const numericValue = value.replace(/\D/g, '');
            let formattedValue = ''; let valueIndex = 0;
            for (let i = 0; i < pattern.length && valueIndex < numericValue.length; i++) { formattedValue += pattern[i] === '0' ? numericValue[valueIndex++] : pattern[i]; }
            e.target.value = formattedValue;
        }
        ['cidadao-cpf', 'cidadao-cep', 'cidadao-phone', 'cidadao-voterid'].forEach(id => document.getElementById(id).addEventListener('input', applyMask));
        childrenContainer.addEventListener('input', applyMask);
        document.getElementById('cidadao-photo-upload').addEventListener('change', (e) => {
            const fileName = e.target.files.length > 0 ? e.target.files[0].name : 'Nenhum ficheiro selecionado';
            document.getElementById('file-name-display').textContent = fileName;
             if (e.target.files.length > 0) document.getElementById('cidadao-photo-url').value = '';
        });

        function populateLeadersDropdown(isForm = false) {
            const select = isForm ? leaderSelect : filterLeader;
            const currentVal = select.value;
            select.innerHTML = `<option value="">${isForm ? 'Nenhuma' : 'Filtrar por Liderança'}</option>`;
            allLeaders.forEach(leader => {
                const option = document.createElement('option');
                option.value = leader.id;
                option.textContent = leader.name;
                select.appendChild(option);
            });
            select.value = currentVal;
        }

        cidadaoForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const cpf = document.getElementById('cidadao-cpf').value;
            const voterId = document.getElementById('cidadao-voterid').value;

            if (cpf || voterId) {
                const queries = [];
                if (cpf) queries.push(getDocs(query(cidadaosCollection, where("cpf", "==", cpf))));
                if (voterId) queries.push(getDocs(query(cidadaosCollection, where("voterId", "==", voterId))));

                const results = await Promise.all(queries);
                let duplicateDoc = null;
                let duplicateField = '';

                if (results[0] && !results[0].empty) {
                    results[0].forEach(doc => { if (doc.id !== editingCidadaoId) { duplicateDoc = doc; duplicateField = 'CPF'; } });
                }

                if (!duplicateDoc && results[cpf ? 1 : 0] && !results[cpf ? 1 : 0].empty) {
                     results[cpf ? 1 : 0].forEach(doc => { if (doc.id !== editingCidadaoId) { duplicateDoc = doc; duplicateField = 'Título de Eleitor'; } });
                }

                if (duplicateDoc) {
                    const duplicateData = duplicateDoc.data();
                    const leader = allLeaders.find(l => l.id === duplicateData.leaderId);
                    const leaderName = leader ? leader.name : 'não informada';
                    showToast(`${duplicateField} já cadastrado. Indicado pela liderança: ${leaderName}.`, 'error');
                    return;
                }
            }
            
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<div class="spinner"></div><span>A Salvar...</span>';

            const childrenData = [];
            document.querySelectorAll('#children-details-container fieldset').forEach(fieldset => {
                childrenData.push({
                    name: fieldset.querySelector('.child-detail-name').value,
                    cpf: fieldset.querySelector('.child-detail-cpf').value,
                    dob: fieldset.querySelector('.child-detail-dob').value
                });
            });

            const fullAddress = `${document.getElementById('cidadao-logradouro').value}, ${document.getElementById('cidadao-numero').value}, ${document.getElementById('cidadao-bairro').value}, ${document.getElementById('cidadao-cidade').value} - ${document.getElementById('cidadao-estado').value}`;
            const coords = await geocodeAddress(fullAddress);
            
            const cidadaoData = {
                name: document.getElementById('cidadao-name').value, email: document.getElementById('cidadao-email').value, dob: document.getElementById('cidadao-dob').value,
                sexo: document.getElementById('cidadao-sexo').value, // SALVA O NOVO CAMPO
                type: document.getElementById('cidadao-type').value, cpf: cpf, rg: document.getElementById('cidadao-rg').value,
                voterId: voterId, phone: document.getElementById('cidadao-phone').value,
                hasWhatsApp: document.getElementById('cidadao-whatsapp').checked, 
                profissao: document.getElementById('cidadao-profissao').value,
                localTrabalho: document.getElementById('cidadao-local-trabalho').value,
                address: {
                    cep: document.getElementById('cidadao-cep').value, logradouro: document.getElementById('cidadao-logradouro').value,
                    numero: document.getElementById('cidadao-numero').value, complemento: document.getElementById('cidadao-complemento').value,
                    bairro: document.getElementById('cidadao-bairro').value, cidade: document.getElementById('cidadao-cidade').value,
                    estado: document.getElementById('cidadao-estado').value,
                },
                lat: coords?.lat || null, lon: coords?.lon || null,
                leaderId: document.getElementById('cidadao-leader').value,
                sons: parseInt(sonsInput.value) || 0, daughters: parseInt(daughtersInput.value) || 0, children: childrenData,
                initials: document.getElementById('cidadao-name').value.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            };
            
            const photoFile = document.getElementById('cidadao-photo-upload').files[0];
            const photoUrl = document.getElementById('cidadao-photo-url').value;

            if (photoFile) {
                cidadaoData.photo = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(photoFile);
                });
            } else if (photoUrl) {
                cidadaoData.photo = photoUrl;
            } else if (!editingCidadaoId) {
                 cidadaoData.color = ['bg-purple-500', 'bg-teal-500', 'bg-indigo-500', 'bg-pink-500'][Math.floor(Math.random() * 4)];
            } else {
                const existingCidadao = allCidadaos.find(c => c.id === editingCidadaoId);
                cidadaoData.photo = existingCidadao ? (existingCidadao.photo || null) : null;
                cidadaoData.color = existingCidadao ? (existingCidadao.color || null) : null;
            }

            try {
                if (editingCidadaoId) {
                    const docRef = doc(db, "cidadaos", editingCidadaoId);
                    await updateDoc(docRef, cidadaoData);
                    showToast('Cidadão atualizado com sucesso!');
                } else {
                    await addDoc(cidadaosCollection, cidadaoData);
                    showToast('Cidadão adicionado com sucesso!');
                }
                closeCidadaoModal();
            } catch (error) { console.error("Erro ao salvar cidadão: ", error); showToast('Erro ao salvar cidadão.', 'error'); }

            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Salvar';
        });
        
        function renderAllDemandas() {
            let filteredDemandas = [...allDemandas];
            const status = demandaFilterStatus.value;
            if (status) {
                filteredDemandas = filteredDemandas.filter(d => d.status === status);
            }
            const leaderId = demandaFilterLeader.value;
            if (leaderId) {
                const groupMemberIds = allCidadaos.filter(c => c.leaderId === leaderId).map(c => c.id);
                groupMemberIds.push(leaderId);
                filteredDemandas = filteredDemandas.filter(d => groupMemberIds.includes(d.cidadaoId));
            }
            allDemandasList.innerHTML = '';
            if (filteredDemandas.length === 0) {
                allDemandasList.innerHTML = '<p class="text-slate-500 text-center mt-8">Nenhuma demanda encontrada com os filtros aplicados.</p>';
                return;
            }
            const statusMap = { pending: "Pendente", inprogress: "Em Andamento", completed: "Concluída" };
            const statusClassMap = { pending: "status-pending", inprogress: "status-inprogress", completed: "status-completed" };
            filteredDemandas.forEach(demanda => {
                const cidadao = allCidadaos.find(c => c.id === demanda.cidadaoId);
                const leader = allLeaders.find(l => l.id === cidadao?.leaderId);
                const item = document.createElement('div');
                item.dataset.id = demanda.id;
                item.className = 'bg-white p-4 rounded-lg shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md';
                item.innerHTML = `
                    <div>
                        <h4 class="font-bold text-lg text-gray-800">${demanda.title}</h4>
                        <p class="text-sm text-gray-500">Solicitante: ${cidadao ? cidadao.name : 'Desconhecido'} ${leader ? `(Grupo de ${leader.name})` : ''}</p>
                    </div>
                    <span class="status-badge ${statusClassMap[demanda.status]}">${statusMap[demanda.status]}</span>
                `;
                allDemandasList.appendChild(item);
            });
        }
        [demandaFilterStatus, demandaFilterLeader].forEach(el => el.addEventListener('input', renderAllDemandas));
        demandaClearFiltersBtn.addEventListener('click', () => {
            demandaFilterStatus.value = '';
            demandaFilterLeader.value = '';
            renderAllDemandas();
        });
        function openNewDemandaModal() {
            demandaForm.reset();
            demandaFormCidadaoSelect.innerHTML = '<option value="" disabled selected>Selecione um cidadão...</option>';
            allCidadaos.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id;
                option.textContent = c.name;
                demandaFormCidadaoSelect.appendChild(option);
            });
            demandaModal.classList.remove('hidden');
        }
        addDemandaGeralBtn.addEventListener('click', openNewDemandaModal);
        allDemandasList.addEventListener('click', (e) => {
            const item = e.target.closest('div[data-id]');
            if (item) {
                openDemandaDetailsModal(item.dataset.id);
            }
        });
        closeDemandaModalBtn.addEventListener('click', () => demandaModal.classList.add('hidden'));
        cancelDemandaBtn.addEventListener('click', () => demandaModal.classList.add('hidden'));
        demandaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('demanda-title').value;
            const description = document.getElementById('demanda-description').value;
            const cidadaoId = demandaFormCidadaoSelect.value;
            if (!cidadaoId) {
                showToast('Por favor, selecione um cidadão.', 'error');
                return;
            }
            await addDoc(demandasCollection, {
                title, description, cidadaoId,
                status: 'pending', createdAt: serverTimestamp()
            });
            showToast('Demanda adicionada com sucesso!');
            demandaForm.reset();
            demandaModal.classList.add('hidden');
        });
        
        async function openDemandaDetailsModal(demandaId) {
            viewingDemandaId = demandaId;
            const demanda = allDemandas.find(d => d.id === demandaId);
            const cidadao = allCidadaos.find(c => c.id === demanda.cidadaoId);
            detailsDemandaTitle.textContent = demanda.title;
            detailsDemandaCidadao.textContent = `Para: ${cidadao ? cidadao.name : 'Desconhecido'}`;
            detailsDemandaDescription.textContent = demanda.description || 'Sem descrição.';
            detailsDemandaStatus.value = demanda.status;
            if (notesUnsubscribe) notesUnsubscribe();
            const notesCollection = collection(db, "demandas", demandaId, "notes");
            notesUnsubscribe = onSnapshot(query(notesCollection, orderBy("createdAt", "asc")), (snapshot) => {
                demandaNotesList.innerHTML = '';
                if(snapshot.empty) { demandaNotesList.innerHTML = `<p class="text-sm text-gray-500">Nenhum acompanhamento adicionado.</p>`; return; }
                snapshot.docs.forEach(doc => {
                    const note = doc.data();
                    const noteEl = document.createElement('div');
                    noteEl.className = 'bg-gray-100 p-3 rounded-lg';
                    const noteDate = note.createdAt ? note.createdAt.toDate().toLocaleString('pt-BR') : 'A guardar...';
                    const userEmail = note.userEmail ? `por <b>${note.userEmail}</b>` : '';
                    noteEl.innerHTML = `<p class="text-sm text-gray-800">${note.text}</p><p class="text-xs text-gray-500 text-right mt-1">Adicionado ${userEmail} em ${noteDate}</p>`;
                    demandaNotesList.appendChild(noteEl);
                });
            });
            demandaDetailsModal.classList.remove('hidden');
        }
        function closeDemandaDetailsModal() {
            if (notesUnsubscribe) notesUnsubscribe();
            viewingDemandaId = null;
            demandaDetailsModal.classList.add('hidden');
        }
        closeDemandaDetailsBtn.addEventListener('click', closeDemandaDetailsModal);
        detailsDemandaStatus.addEventListener('change', async (e) => {
            if (viewingDemandaId) {
                await updateDoc(doc(db, "demandas", viewingDemandaId), { status: e.target.value });
                showToast('Status da demanda atualizado!', 'info');
            }
        });
        addNoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = newNoteText.value.trim();
            if (!viewingDemandaId || !text) return;
            const user = auth.currentUser;
            const notesCollection = collection(db, "demandas", viewingDemandaId, "notes");
            await addDoc(notesCollection, { text, createdAt: serverTimestamp(), userEmail: user.email });
            addNoteForm.reset();
        });

        function openConfirmationModal(id, type) {
            itemToDelete = { id, type };
            confirmationTitle.textContent = `Confirmar Exclusão de ${type === 'cidadao' ? 'Cidadão' : 'Demanda'}`;
            confirmationMessage.textContent = `Você tem certeza? Esta ação não pode ser desfeita.${type === 'cidadao' ? ' Todas as demandas associadas também serão excluídas.' : ''}`;
            confirmationModal.classList.remove('hidden');
        }
        cancelDeleteBtn.addEventListener('click', () => confirmationModal.classList.add('hidden'));
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!itemToDelete.id) return;
            const { id, type } = itemToDelete;
            const batch = writeBatch(db);
            if (type === 'cidadao') {
                const demandsQuery = query(demandasCollection, where("cidadaoId", "==", id));
                const demandsSnapshot = await getDocs(demandsQuery);
                demandsSnapshot.forEach(d => batch.delete(d.ref));
                batch.delete(doc(db, "cidadaos", id));
            } else if (type === 'demanda') {
                const notesCollection = collection(db, "demandas", id, "notes");
                const notesSnapshot = await getDocs(notesCollection);
                notesSnapshot.forEach(d => batch.delete(d.ref));
                batch.delete(doc(db, "demandas", id));
                closeDemandaDetailsModal();
            }
            await batch.commit();
            showToast(`${type === 'cidadao' ? 'Cidadão' : 'Demanda'} excluído(a) com sucesso.`, 'error');
            confirmationModal.classList.add('hidden');
        });
        
        deleteDemandaBtn.addEventListener('click', () => {
            if (viewingDemandaId) openConfirmationModal(viewingDemandaId, 'demanda');
        });

        function openCidadaoDetailsModal(cidadaoId) {
            viewingCidadaoId = cidadaoId;
            const cidadao = allCidadaos.find(c => c.id === cidadaoId);
            if (!cidadao) return;
            const photoEl = document.getElementById('details-photo');
            photoEl.innerHTML = cidadao.photo ? `<img src="${cidadao.photo}" class="w-24 h-24 object-cover rounded-full" alt="Foto de ${cidadao.name}">` : `<div class="w-24 h-24 ${cidadao.color || 'bg-gray-500'} rounded-full flex items-center justify-center text-white text-4xl font-bold">${cidadao.initials || '??'}</div>`;
            document.getElementById('details-name').textContent = cidadao.name;
            document.getElementById('details-type').textContent = cidadao.type;
            document.getElementById('details-email').textContent = cidadao.email || 'N/A';
            document.getElementById('details-phone').textContent = cidadao.phone || 'N/A';
            const addr = cidadao.address;
            const fullAddress = addr ? `${addr.logradouro || ''}, ${addr.numero || 'S/N'}<br>${addr.bairro || ''}, ${addr.cidade || ''} - ${addr.estado || ''}` : 'N/A';
            document.getElementById('details-address').innerHTML = fullAddress;
            document.getElementById('details-cpf').textContent = cidadao.cpf || 'N/A';
            document.getElementById('details-rg').textContent = cidadao.rg || 'N/A';
            document.getElementById('details-voterid').textContent = cidadao.voterId || 'N/A';
            document.getElementById('details-profissao').textContent = cidadao.profissao || 'N/A';
            document.getElementById('details-local-trabalho').textContent = cidadao.localTrabalho || 'N/A';
            const dob = cidadao.dob ? new Date(cidadao.dob).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A';
            document.getElementById('details-dob').textContent = dob;
            document.getElementById('details-sexo').textContent = cidadao.sexo || 'N/A'; // ATUALIZAÇÃO DOS DETALHES
            const leader = allLeaders.find(l => l.id === cidadao.leaderId);
            document.getElementById('details-leader').textContent = leader ? leader.name : 'Nenhuma';
        
            const childrenDetails = document.getElementById('details-children');
            childrenDetails.innerHTML = '';
            if (cidadao.children && cidadao.children.length > 0) {
                const childrenTitle = document.createElement('h4');
                childrenTitle.className = 'font-semibold text-gray-500 text-sm mt-4';
                childrenTitle.textContent = 'FILHOS/FILHAS';
                childrenDetails.appendChild(childrenTitle);
                cidadao.children.forEach(child => {
                    const p = document.createElement('p');
                    p.innerHTML = `<strong>${child.name}</strong> (${child.dob ? new Date(child.dob).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}) - CPF: ${child.cpf || 'N/A'}`;
                    childrenDetails.appendChild(p);
                });
            }

            cidadaoDetailsModal.classList.remove('hidden');
            setTimeout(() => cidadaoDetailsModal.querySelector('.transform').classList.remove('scale-95', 'opacity-0'), 10);
        }

        function closeCidadaoDetailsModal() {
            cidadaoDetailsModal.querySelector('.transform').classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                cidadaoDetailsModal.classList.add('hidden');
                viewingCidadaoId = null;
            }, 300);
        }

        async function geocodeAddress(address) {
            if (!address || address.length < 10) return null;
            try {
                // A API Nominatim requer um user-agent. Usamos um genérico.
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`, {
                    headers: { 'User-Agent': 'GestorValenteApp/1.0' }
                });
                const data = await response.json();
                if (data && data.length > 0) {
                    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
                }
                return null;
            } catch (error) {
                console.error('Erro de geocodificação:', error);
                return null;
            }
        }

        function initMap() {
            if (map) return;
            map = L.map('map').setView([-14.2350, -51.9253], 4); // Centro do Brasil
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);
        }

        function updateMapMarkers(cidadaos) {
            if (!map) initMap();
            markers.forEach(m => map.removeLayer(m));
            markers = [];
            const validCidadaos = cidadaos.filter(c => c.lat && c.lon);
            if (validCidadaos.length === 0) return;

            const bounds = [];
            validCidadaos.forEach(c => {
                const marker = L.marker([c.lat, c.lon]).addTo(map);
                const leader = allLeaders.find(l => l.id === c.leaderId);
                marker.bindPopup(`<b>${c.name}</b><br>${c.type}<br>${c.address?.bairro || 'Endereço incompleto'}${leader ? `<br>Liderança: ${leader.name}` : ''}`);
                markers.push(marker);
                bounds.push([c.lat, c.lon]);
            });
            if(bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50] });
        }
        
        viewMapBtn.addEventListener('click', () => {
            mapModal.classList.remove('hidden');
            setTimeout(() => {
                initMap();
                updateMapMarkers(allCidadaos.filter(c => c.lat && c.lon));
                map.invalidateSize();
            }, 100);
        });
        
        detailsViewMapBtn.addEventListener('click', () => {
            const cidadao = allCidadaos.find(c => c.id === viewingCidadaoId);
            if (cidadao && cidadao.lat && cidadao.lon) {
                closeCidadaoDetailsModal();
                mapModal.classList.remove('hidden');
                setTimeout(() => {
                    initMap();
                    updateMapMarkers([cidadao]);
                    map.invalidateSize();
                    map.setView([cidadao.lat, cidadao.lon], 15);
                }, 100);
            } else {
                showToast('Este cidadão não possui localização cadastrada.', 'error');
            }
        });

        detailsShareLocationBtn.addEventListener('click', () => {
            const cidadao = allCidadaos.find(c => c.id === viewingCidadaoId);
            if (!cidadao || !cidadao.lat || !cidadao.lon) {
                showToast('Não é possível partilhar: localização não cadastrada.', 'error');
                return;
            }
            const mapsUrl = `https://www.google.com/maps?q=${cidadao.lat},${cidadao.lon}`;
            const message = `Olá, segue a localização de ${cidadao.name}:\n${mapsUrl}`;
            
            const tempInput = document.createElement('textarea');
            tempInput.value = message;
            document.body.appendChild(tempInput);
            tempInput.select();
            try {
                document.execCommand('copy');
                showToast('Link de localização copiado para a área de transferência!');
            } catch (err) {
                showToast('Não foi possível copiar o link.', 'error');
            }
            document.body.removeChild(tempInput);
        });

        closeMapBtn.addEventListener('click', () => mapModal.classList.add('hidden'));

        // [FUNÇÃO REMOVIDA] - A função generateCSV foi removida.

        // [NOVA FUNÇÃO] - Cria uma página HTML para impressão/PDF
        function generatePrintReport(data) {
            const reportDate = new Date().toLocaleDateString('pt-BR');
            const reportTime = new Date().toLocaleTimeString('pt-BR');

            // 1. Criar o conteúdo HTML da página de impressão
            let htmlContent = `
                <html>
                <head>
                    <title>Relatório de Cidadãos</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 20px;
                        }
                        h1 {
                            text-align: center;
                            font-size: 24px;
                            border-bottom: 2px solid #000;
                            padding-bottom: 10px;
                        }
                        p {
                            text-align: center;
                            font-size: 12px;
                            color: #555;
                            margin-bottom: 20px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 10px;
                        }
                        th, td {
                            border: 1px solid #ddd;
                            padding: 6px;
                            text-align: left;
                            word-break: break-word; /* Quebra palavras longas */
                        }
                        th {
                            background-color: #f2f2f2;
                            font-size: 11px;
                        }
                        tr:nth-child(even) {
                            background-color: #f9f9f9;
                        }
                         /* Estilos de impressão */
                        @media print {
                            @page {
                                size: A4 landscape; /* Define a página para paisagem */
                                margin: 1cm;
                            }
                            body {
                                margin: 0;
                            }
                        }
                    </style>
                </head>
                <body>
                    <h1>Relatório de Cidadãos</h1>
                    <p>Gerado em: ${reportDate} às ${reportTime}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Tipo</th>
                                <th>Telefone</th>
                                <th>WhatsApp</th>
                                <th>Liderança</th>
                                <th>Endereço Completo</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            // 2. Adicionar os dados dos cidadãos à tabela
            data.forEach(c => {
                const leader = allLeaders.find(l => l.id === c.leaderId);
                const addr = c.address || {};
                
                const fullAddress = [
                    addr.logradouro || '',
                    addr.numero ? `Nº ${addr.numero}` : 'S/N',
                    addr.complemento || '',
                    addr.bairro || '',
                    addr.cidade || '',
                    addr.estado || '',
                    addr.cep || ''
                ].filter(Boolean).join(', ');

                htmlContent += `
                    <tr>
                        <td>${c.name}</td>
                        <td>${c.type}</td>
                        <td>${c.phone || 'N/A'}</td>
                        <td>${c.hasWhatsApp ? 'Sim' : 'Não'}</td>
                        <td>${leader ? leader.name : 'Nenhuma'}</td>
                        <td>${fullAddress || 'N/A'}</td>
                    </tr>
                `;
            });

            htmlContent += `
                        </tbody>
                    </table>
                </body>
                </html>
            `;
            
            // 3. Abrir uma nova janela e acionar a impressão
            const printWindow = window.open('', '_blank');
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus(); // Necessário para alguns navegadores
            
            // Espera a janela carregar para chamar a impressão
            printWindow.onload = function() {
                printWindow.print();
            };
        }
        
        // [ALTERAÇÃO] - O botão agora chama a nova função de impressão
        generateReportBtn.addEventListener('click', () => {
            // Você pode passar 'allCidadaos' ou os cidadãos filtrados atualmente
            // Vamos usar 'allCidadaos' por enquanto.
            generatePrintReport(allCidadaos);
            showToast('Relatório pronto para impressão!', 'info');
        });


        // Observadores do Firestore
        onSnapshot(query(cidadaosCollection), (snapshot) => {
            allCidadaos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allLeaders = allCidadaos.filter(c => c.type === 'Liderança').sort((a, b) => a.name.localeCompare(b.name));
            populateFilterDropdowns();
            populateLeadersDropdown(true);
            
            // Popular o filtro de liderança da página de Demandas
            demandaFilterLeader.innerHTML = '<option value="">Filtrar por Liderança</option>';
            allLeaders.forEach(leader => {
                const option = document.createElement('option');
                option.value = leader.id;
                option.textContent = leader.name;
                demandaFilterLeader.appendChild(option);
            });
            
            renderCidadaos();
            updateDashboard();
            renderAllDemandas();
        });

        onSnapshot(query(demandasCollection, orderBy("createdAt", "desc")), (snapshot) => {
            allDemandas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateDashboard();
            renderAllDemandas();
        });
        
        switchPage('dashboard-page');
    }

    function showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        const colors = {
            info: 'bg-blue-500',
            success: 'bg-green-500',
            error: 'bg-red-500'
        };
        toast.className = `w-full max-w-sm p-4 rounded-lg shadow-md text-white ${colors[type]} transform transition-all translate-x-full opacity-0`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
        }, 100);

        setTimeout(() => {
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 500);
        }, 3000);
    }
});