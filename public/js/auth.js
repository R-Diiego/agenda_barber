const auth = {
    login: async (email, senha) => {
        try {
            const data = await api.post('/auth/login', { email, senha });
            if (data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                return true;
            }
            return false;
        } catch (error) {
            alert('Erro ao fazer login: ' + error.message);
            return false;
        }
    },

    register: async (nome, email, senha) => {
        try {
            await api.post('/auth/register', { nome, email, senha });
            return true;
        } catch (error) {
            alert('Erro ao cadastrar: ' + error.message);
            return false;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    getUser: () => {
        return JSON.parse(localStorage.getItem('user'));
    }
};
