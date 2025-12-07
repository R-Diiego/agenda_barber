const API_BASE_URL = '/api';

async function request(endpoint, method = 'GET', body = null) {
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
