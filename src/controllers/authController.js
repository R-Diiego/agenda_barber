const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Helper to wrap db.run in promise
function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
        });
    });
}

// Helper to wrap db.get in promise
function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

exports.register = async (req, res) => {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    try {
        const existing = await get('SELECT * FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(400).json({ message: 'Email já cadastrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(senha, salt);

        const result = await run(
            'INSERT INTO users (nome, email, senha_hash) VALUES (?, ?, ?)',
            [nome, email, hash]
        );

        res.status(201).json({ message: 'Usuário criado', userId: result.id });
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
};

exports.login = async (req, res) => {
    const { email, senha } = req.body;

    try {
        const user = await get('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        const isMatch = await bcrypt.compare(senha, user.senha_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({ token, user: { id: user.id, nome: user.nome, email: user.email } });
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
};
