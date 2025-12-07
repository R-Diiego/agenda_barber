// Auth Guard
if (!auth.isAuthenticated()) {
    window.location.href = '/index.html';
}

const user = auth.getUser();
if (user) {
    document.getElementById('userName').textContent = user.nome || user.email;
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.logout();
});

// UI State
const views = {
    agenda: document.getElementById('appointmentList'),
    clientes: document.getElementById('clientesView'),
    ajustes: document.getElementById('ajustesView'),
    newBtn: document.getElementById('newAppointmentBtn')
};

const navs = {
    agenda: document.getElementById('navAgenda'),
    agendar: document.getElementById('navAgendar'), // Renamed
    ajustes: document.getElementById('navAjustes')
};

function switchTab(tab) {
    // Hide all
    Object.values(views).forEach(el => el.classList.add('hidden'));
    Object.values(navs).forEach(el => {
        el.classList.remove('text-primary');
        el.classList.add('text-gray-500');
    });

    // Show selected
    views[tab].classList.remove('hidden');
    navs[tab].classList.add('text-primary');
    navs[tab].classList.remove('text-gray-500');

    // Handle "Novo" button visibility (only for Agenda)
    if (tab === 'agenda') {
        views.newBtn.parentElement.classList.remove('hidden');
        loadAppointments();
    } else {
        views.newBtn.parentElement.classList.add('hidden');
    }

    if (tab === 'clientes') loadClientes();
    if (tab === 'ajustes') loadServicos();
}

// Navigation Events
navs.agenda.addEventListener('click', () => switchTab('agenda'));
// navs.clientes removed
navs.agendar.addEventListener('click', () => {
    // Open Modal logic immediately
    loadOptions();
    // Set default date to today (local)
    const now = new Date();
    const dateStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    document.getElementById('dataInput').value = dateStr;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
});
navs.ajustes.addEventListener('click', () => switchTab('ajustes'));


// Modal Logic
const modal = document.getElementById('modal');
const newAppointmentBtn = document.getElementById('newAppointmentBtn');

newAppointmentBtn.addEventListener('click', () => {
    loadOptions();
    // Set default date to today (local)
    const now = new Date();
    const dateStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    document.getElementById('dataInput').value = dateStr;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
});

function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}
window.closeModal = closeModal;

// --- Loaders ---

// Helper to format date for header
function getFormattedDateHeader(dateStr) {
    const date = new Date(dateStr + 'T00:00:00'); // Force local time
    const options = { weekday: 'long', day: '2-digit', month: '2-digit' };
    return date.toLocaleDateString('pt-BR', options).replace('-feira', '');
}

async function loadAppointments() {
    const list = document.getElementById('appointmentList');
    const now = new Date();
    const date = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    try {
        const [appointments, servicos] = await Promise.all([
            api.get(`/agendamentos?min_date=${date}&_=${Date.now()}`),
            api.get('/servicos').catch(() => []) // Fetch services for name lookup
        ]);

        // Merge Offline Items
        const queue = api.getQueue();
        const pending = queue.filter(item => item.method === 'POST' && item.endpoint === '/agendamentos');

        pending.forEach((item, idx) => {
            const body = item.body;
            // Find service name
            const s = servicos.find(s => s.id == body.servico_id);
            const servicoName = s ? s.nome : 'Serviço Offline';

            // Construct fake appointment object
            appointments.push({
                id: `off-${Date.now()}-${idx}`,
                data: body.data,
                hora: body.hora,
                cliente_nome: body.cliente_nome + ' (Pendente)',
                servico_nome: servicoName,
                duracao_minutos: s ? s.duracao_minutos : 30, // Default or lookup
                isOffline: true
            });
        });

        // Sort by Date and Time
        appointments.sort((a, b) => {
            if (a.data !== b.data) return a.data.localeCompare(b.data);
            return a.hora.localeCompare(b.hora);
        });

        if (appointments.length === 0) {
            list.innerHTML = `<div class="text-center text-gray-500 py-8">Nenhum agendamento futuro.</div>`;
            return;
        }

        // Group by Date
        const grouped = {};
        appointments.forEach(app => {
            if (!grouped[app.data]) grouped[app.data] = [];
            grouped[app.data].push(app);
        });

        let html = '';
        Object.keys(grouped).forEach((dateKey, index) => {
            const dayApps = grouped[dateKey];
            const dateId = `date-${dateKey}`;
            const isFirst = index === 0;
            const hiddenClass = isFirst ? '' : 'hidden';
            const rotateClass = isFirst ? 'rotate-180' : '';

            html += `
            <div class="mb-4">
                <div onclick="toggleDate('${dateId}')" 
                     class="bg-darker p-4 rounded-xl flex justify-between items-center cursor-pointer border border-gray-800 hover:border-gray-600 transition-all select-none">
                    <h3 class="font-bold text-primary capitalize">${getFormattedDateHeader(dateKey)}</h3>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500 bg-dark px-2 py-1 rounded-md">${dayApps.length} agendamentos</span>
                        <svg id="icon-${dateId}" class="w-5 h-5 text-gray-500 transition-transform ${rotateClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </div>
                </div>
                
                <div id="${dateId}" class="mt-2 space-y-3 ${hiddenClass}">
                    ${dayApps.map(app => `
                    <div class="bg-dark p-4 rounded-xl border ${app.isOffline ? 'border-yellow-600/50' : 'border-gray-800'} flex items-center justify-between ml-2">
                        <div class="flex items-center space-x-4">
                            <div class="flex flex-col items-center bg-darker p-2 rounded-lg min-w-[60px]">
                                <span class="text-primary font-bold text-lg">${app.hora.substring(0, 5)}</span>
                            </div>
                            <div>
                                <h4 class="font-bold ${app.isOffline ? 'text-yellow-500' : 'text-white'}">${app.cliente_nome}</h4>
                                <p class="text-sm text-gray-400">${app.servico_nome} • ${app.duracao_minutos} min</p>
                            </div>
                        </div>
                        ${!app.isOffline ? `
                        <button onclick="cancelAppointment(${app.id})" class="text-red-500 hover:bg-red-500/10 p-2 rounded-full" title="Cancelar Agendamento">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>` : `<span class="text-xs text-yellow-500 italic">Sincronizando...</span>`}
                    </div>
                    `).join('')}
                </div>
            </div>`;
        });

        list.innerHTML = html;

    } catch (error) {
        list.innerHTML = `<div class="text-red-500 text-center">Erro ao carregar agenda.</div>`;
    }
}

// Global Toggle Function
window.toggleDate = (id) => {
    const el = document.getElementById(id);
    const icon = document.getElementById('icon-' + id);
    if (el.classList.contains('hidden')) {
        el.classList.remove('hidden');
        icon.classList.add('rotate-180');
    } else {
        el.classList.add('hidden');
        icon.classList.remove('rotate-180');
    }
}

window.cancelAppointment = async (id) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;
    try {
        await api.put(`/agendamentos/${id}/cancel`);
        loadAppointments();
    } catch (err) {
        alert('Erro ao cancelar: ' + err.message);
    }
}

async function loadClientes() {
    const list = document.getElementById('clientesList');
    try {
        const clientes = await api.get('/clientes');
        list.innerHTML = clientes.map(c => `
        <div class="bg-dark p-3 rounded-lg border border-gray-800 flex justify-between items-center">
            <div>
                <div class="font-bold text-white">${c.nome}</div>
                <div class="text-sm text-gray-400">${c.telefone}</div>
            </div>
            <button class="text-gray-500 hover:text-primary"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
        </div>`).join('');
    } catch (error) {
        list.innerHTML = `<div class="text-red-500">Erro ao carregar clientes.</div>`;
    }
}

async function loadServicos() {
    const list = document.getElementById('servicosList');
    try {
        const servicos = await api.get('/servicos');
        list.innerHTML = servicos.map(s => `
        <div class="bg-dark p-3 rounded-lg border border-gray-800 flex justify-between items-center">
            <div>
                <div class="font-bold text-white">${s.nome}</div>
                <div class="text-sm text-gray-400">${s.duracao_minutos} min • R$ ${s.valor}</div>
            </div>
             <button onclick="editServico(${s.id}, '${s.nome}', ${s.valor}, ${s.duracao_minutos})" class="text-gray-500 hover:text-primary"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
        </div>`).join('');
    } catch (error) {
        list.innerHTML = `<div class="text-red-500">Erro ao carregar serviços.</div>`;
    }
}

async function loadOptions() {
    const clienteSelect = document.getElementById('clienteSelect');
    const servicoSelect = document.getElementById('servicoSelect');

    // const clientes = await api.get('/clientes');
    // clienteSelect.innerHTML = clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');

    const servicos = await api.get('/servicos');
    servicoSelect.innerHTML = servicos.map(s => `<option value="${s.id}">${s.nome} - R$ ${s.valor}</option>`).join('');
}

// Time Slots Logic
async function loadTimeSlots(date) {
    const select = document.getElementById('horaInput');
    select.innerHTML = '<option>Carregando...</option>';

    try {
        // Fetch taken slots for this specific date
        const appointments = await api.get(`/agendamentos?data=${date}&_=${Date.now()}`);
        let takenTimes = appointments.map(a => a.hora.substring(0, 5));

        // Add Offline Queue slots
        const queue = api.getQueue();
        const pendingForDate = queue.filter(item =>
            item.method === 'POST' &&
            item.endpoint === '/agendamentos' &&
            item.body.data === date
        );
        pendingForDate.forEach(item => {
            takenTimes.push(item.body.hora);
        });

        const slots = [];
        // Generate slots from 08:00 to 20:00
        for (let i = 8; i <= 20; i++) {
            const h = i.toString().padStart(2, '0');
            slots.push(`${h}:00`);
            if (i !== 20) slots.push(`${h}:30`); // No 20:30
        }

        const available = slots.filter(time => !takenTimes.includes(time));

        if (available.length === 0) {
            select.innerHTML = '<option value="">Sem horários livres</option>';
        } else {
            select.innerHTML = available.map(time => `<option value="${time}">${time}</option>`).join('');
        }
    } catch (err) {
        console.error(err);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

// Listener for date change
document.getElementById('dataInput').addEventListener('change', (e) => {
    loadTimeSlots(e.target.value);
});

// Appointment Form Submit
document.getElementById('appointmentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cliente_nome = document.getElementById('clienteNome').value;
    const servico_id = document.getElementById('servicoSelect').value;
    const data = document.getElementById('dataInput').value;
    const hora = document.getElementById('horaInput').value;

    if (!cliente_nome) {
        alert('Por favor, informe o nome do cliente.');
        return;
    }

    try {
        await api.post('/agendamentos', {
            cliente_nome,
            servico_id,
            data,
            hora
        });
        closeModal();
        loadAppointments();
    } catch (err) {
        alert('Erro ao agendar: ' + err.message);
    }
});

// Modals for CRUD (Placeholder for simplicity, usually needs separate forms)
window.openClienteModal = async () => {
    const nome = prompt("Nome do Cliente:");
    const telefone = prompt("Telefone:");
    if (nome) {
        await api.post('/clientes', { nome, telefone });
        loadClientes();
    }
}

window.openServicoModal = async () => {
    const nome = prompt("Nome do Serviço:");
    const valor = prompt("Valor (ex: 30.00):");
    const duracao = prompt("Duração (minutos):");
    if (nome && valor) {
        await api.post('/servicos', { nome, valor, duracao_minutos: duracao });
        loadServicos();
    }
}

window.editServico = async (id, oldNome, oldValor, oldDuracao) => {
    const nome = prompt("Nome do Serviço:", oldNome);
    const valor = prompt("Valor (ex: 30.00):", oldValor);
    const duracao = prompt("Duração (minutos):", oldDuracao);

    if (nome && valor) {
        try {
            await api.put(`/servicos/${id}`, { nome, valor, duracao_minutos: duracao });
            loadServicos();
        } catch (err) {
            alert('Erro ao editar: ' + err.message);
        }
    }
}


// Initial Load
// Fix "Agenda" active state visually
// views.clientes.classList.add('hidden'); // Removed
views.ajustes.classList.add('hidden');
loadAppointments();
