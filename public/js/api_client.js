const API_BASE_URL = '/api';

// Offline Queue Management
const offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');

function addToQueue(endpoint, method, body) {
    offlineQueue.push({ endpoint, method, body, timestamp: Date.now() });
    localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
    showOfflineNotification('Ação salva offline. Será sincronizada quando houver internet.');
}

async function processQueue() {
    if (offlineQueue.length === 0) return;

    console.log(`Processing ${offlineQueue.length} offline items...`);
    const tempQueue = [...offlineQueue];
    // Clear queue strictly before processing to avoid loops if they keep failing, 
    // but better to keep them if they fail? 
    // Let's try to process. If fail, maybe re-queue?
    // For simplicity, we try once. If fail, we alert.

    // Actually, let's just try to process them one by one.
    // If one succeeds, remove it. 

    // We'll iterate backwards or just shift.

    const remaining = [];

    for (const item of tempQueue) {
        try {
            console.log('Syncing:', item);
            await request(item.endpoint, item.method, item.body, true); // true = skipQueue
        } catch (err) {
            console.error('Sync failed for item:', item, err);
            // decide whether to keep it. If it's a 4xx, maybe drop it. 
            // If it's 5xx or network, keep it.
            // For now, let's keep it if it looks like a network error, otherwise drop.
            // Simple logic: if still offline, we wouldn't be here (event listener).
            // So if it fails now, it's likely a permanent error or server issue. 
            // We'll keep it for now to be safe, but this can cause blocking.
            // Let's Drop it and Alert user? No, safer to keep.
            remaining.push(item);
        }
    }

    if (remaining.length !== offlineQueue.length) {
        // Something changed
        localStorage.setItem('offlineQueue', JSON.stringify(remaining));
        // Update memory
        offlineQueue.length = 0;
        remaining.forEach(i => offlineQueue.push(i));

        if (remaining.length === 0) {
            showOfflineNotification('Sincronização concluída com sucesso!', 'success');
            // Refresh data
            window.location.reload();
        } else {
            showOfflineNotification('Alguns itens não puderam ser sincronizados.');
        }
    }
}

// Network Status Listeners
window.addEventListener('online', () => {
    document.body.classList.remove('offline-mode');
    showOfflineNotification('Você está online. Sincronizando...', 'info');
    processQueue();
});

window.addEventListener('offline', () => {
    document.body.classList.add('offline-mode');
    showOfflineNotification('Você está offline. Modo de leitura.', 'warning');
});

// Helper for UI notifications (Simple toast)
function showOfflineNotification(msg, type = 'info') {
    let toast = document.getElementById('offlineToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'offlineToast';
        toast.className = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg z-50 transition-opacity duration-300 text-sm font-bold';
        document.body.appendChild(toast);
    }

    const colors = {
        info: 'bg-blue-600',
        success: 'bg-green-600',
        warning: 'bg-yellow-600',
        error: 'bg-red-600'
    };

    toast.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full shadow-lg z-50 transition-opacity duration-300 text-sm font-bold ${colors[type] || colors.info}`;
    toast.textContent = msg;

    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}


async function request(endpoint, method = 'GET', body = null, skipQueue = false) {
    const headers = {
        'Content-Type': 'application/json'
    };

    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers,
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    // Check Online Status BEFORE Fetch
    if (!navigator.onLine && !skipQueue) {
        if (method !== 'GET') {
            // Queue it
            addToQueue(endpoint, method, body);
            // Return fake success for optimistic UI
            return { offline: true, message: 'Salvo offline' };
        } else {
            // For GET, we rely on SW Cache.
            // But if we want to be explicit:
            // return fetch(...) which will hit SW.
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/index.html';
            return null;
        }

        const text = await response.text();
        let data;
        try {
            // Handle empty response
            if (!text) return {};
            data = JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse JSON:', text);
            console.error('Original Error:', e);
            // If it's HTML, it might be an error page from the server/proxy
            const isHtml = text.trim().startsWith('<');
            const snippet = isHtml ? 'Received HTML response instead of JSON' : text.substring(0, 100);
            throw new Error(`Resposta inválida do servidor (${response.status}): ${snippet}`);
        }

        if (!response.ok) {
            throw new Error(data.message || data.error || 'Erro na requisição');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);

        // Secondary Offline Check (if fetch failed due to network despite navigator.onLine saying true)
        // Note: fetch throws TypeError on network failure
        if (!skipQueue && method !== 'GET' && error.name === 'TypeError') {
            addToQueue(endpoint, method, body);
            return { offline: true, message: 'Salvo offline (erro de rede)' };
        }

        throw error;
    }
}

// PWA Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('SW register success', reg.scope))
            .catch(err => console.log('SW register fail', err));
    });
}

const api = {
    get: (endpoint) => request(endpoint, 'GET'),
    post: (endpoint, body) => request(endpoint, 'POST', body),
    put: (endpoint, body) => request(endpoint, 'PUT', body),
    delete: (endpoint) => request(endpoint, 'DELETE'),
};

// Initialize
if (!navigator.onLine) {
    document.body.classList.add('offline-mode');
    setTimeout(() => showOfflineNotification('Você está offline. Modo de leitura.', 'warning'), 1000);
} else if (offlineQueue.length > 0) {
    setTimeout(() => processQueue(), 2000);
}
