const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.register = async (req, res) => {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    try {
        const { rows: existing } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email já cadastrado' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(senha, salt);

        const { rows: result } = await db.query(
            'INSERT INTO users (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id',
            [nome, email, hash]
        );

        res.status(201).json({ message: 'Usuário criado', userId: result[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
};

exports.login = async (req, res) => {
    const { email, senha } = req.body;

    try {
        const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = rows[0];

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
        console.error(err);
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
};
