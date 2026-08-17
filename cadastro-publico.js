const SUPABASE_URL = 'https://memsmrsntvkneyylggto.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lbXNtcnNudHZrbmV5eWxnZ3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MjgyMjgsImV4cCI6MjA4NzIwNDIyOH0.QoyF_On4xNjCjfgXcXH2ycBzVdDP8GoOY66mBsdJW1M';
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/public-cadastro`;

let accessPassword = null;

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const bg = type === 'error' ? 'bg-red-600' : 'bg-green-600';
    toast.className = `${bg} text-white px-4 py-3 rounded-lg shadow-lg text-sm font-medium`;
    toast.textContent = message; // textContent — nunca innerHTML com dados externos
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ── Máscaras de preenchimento (mesma lógica do app principal) ──
function applyMask(id, mask) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
        let v = this.value.replace(/\D/g, '');
        let out = '', vi = 0;
        for (let mi = 0; mi < mask.length && vi < v.length; mi++) {
            if (mask[mi] === '9') { out += v[vi++]; }
            else { out += mask[mi]; if (v[vi] === mask[mi]) vi++; }
        }
        this.value = out;
    });
}

function resetFormPageState() {
    accessPassword = null;
    document.getElementById('form-page').classList.add('hidden');
    document.getElementById('gate-page').classList.remove('hidden');
}

async function callFunction(payload) {
    const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
    });
    let json;
    try { json = await res.json(); } catch (_) { json = {}; }
    return { ok: res.ok && json.ok, status: res.status, data: json };
}

document.addEventListener('DOMContentLoaded', () => {
    applyMask('c-cpf', '999.999.999-99');
    applyMask('c-phone', '(99) 99999-9999');
    applyMask('c-cep', '99999-999');

    // ── Preenchimento automático de endereço via CEP (ViaCEP) ──
    const cepInput = document.getElementById('c-cep');
    const logradouroInput = document.getElementById('c-logradouro');
    const bairroInput = document.getElementById('c-bairro');
    const cidadeInput = document.getElementById('c-cidade');
    const estadoInput = document.getElementById('c-estado');
    const numeroInput = document.getElementById('c-numero');

    cepInput.addEventListener('blur', async (e) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length !== 8) return;
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            if (!response.ok) throw new Error('CEP não encontrado');
            const data = await response.json();
            if (data.erro) {
                showToast('CEP não encontrado.', 'error');
                return;
            }
            logradouroInput.value = data.logradouro || '';
            bairroInput.value = data.bairro || '';
            cidadeInput.value = data.localidade || '';
            estadoInput.value = data.uf || '';
            numeroInput.focus();
        } catch (err) {
            console.error(err);
            showToast('Erro ao consultar o CEP.', 'error');
        }
    });

    const gatePage = document.getElementById('gate-page');
    const formPage = document.getElementById('form-page');
    const gateForm = document.getElementById('gate-form');
    const gateBtn = document.getElementById('gate-btn');
    const gatePassword = document.getElementById('gate-password');
    const cidadaoForm = document.getElementById('cidadao-form-public');
    const saveBtn = document.getElementById('save-btn-public');

    gateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        gateBtn.disabled = true;
        gateBtn.innerHTML = '<div class="spinner"></div>';
        try {
            const { ok, status, data } = await callFunction({ action: 'verify', password: gatePassword.value });
            if (!ok) {
                if (status === 401) showToast('Chave de acesso incorreta.', 'error');
                else showToast(data.error || 'Erro ao verificar a chave.', 'error');
                return;
            }
            accessPassword = gatePassword.value;
            gatePassword.value = '';
            gatePage.classList.add('hidden');
            formPage.classList.remove('hidden');
        } catch (err) {
            console.error(err);
            showToast('Erro de conexão. Tente novamente.', 'error');
        } finally {
            gateBtn.disabled = false;
            gateBtn.innerHTML = 'Entrar';
        }
    });

    cidadaoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = s => (s && s.trim()) ? s.trim() : null;
        const name = document.getElementById('c-name').value.trim();
        if (!name) {
            showToast('O nome é obrigatório.', 'error');
            return;
        }
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<div class="spinner"></div>';
        const payload = {
            action: 'create',
            password: accessPassword,
            honeypot: document.getElementById('website').value,
            cidadao: {
                name,
                email: v(document.getElementById('c-email').value),
                dob: document.getElementById('c-dob').value || null,
                sexo: document.getElementById('c-sexo').value || null,
                type: document.getElementById('c-type').value || 'Outro',
                profissao: v(document.getElementById('c-profissao').value),
                cpf: v(document.getElementById('c-cpf').value),
                rg: v(document.getElementById('c-rg').value),
                phone: v(document.getElementById('c-phone').value),
                whatsapp: document.getElementById('c-whatsapp').checked,
                photourl: v(document.getElementById('c-photourl').value),
                cep: v(document.getElementById('c-cep').value),
                logradouro: v(document.getElementById('c-logradouro').value),
                numero: v(document.getElementById('c-numero').value),
                complemento: v(document.getElementById('c-complemento').value),
                bairro: v(document.getElementById('c-bairro').value),
                cidade: v(document.getElementById('c-cidade').value),
                estado: v(document.getElementById('c-estado').value)
            }
        };
        try {
            const { ok, status, data } = await callFunction(payload);
            if (!ok) {
                if (status === 401) {
                    showToast('Sua sessão expirou. Digite a chave novamente.', 'error');
                    resetFormPageState();
                    return;
                }
                throw new Error(data.error || 'Erro ao cadastrar.');
            }
            showToast('Cidadão cadastrado com sucesso!', 'success');
            cidadaoForm.reset();
            document.getElementById('c-name').focus();
        } catch (err) {
            console.error(err);
            showToast(err.message || 'Erro ao cadastrar. Tente novamente.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Cadastrar';
        }
    });
});
