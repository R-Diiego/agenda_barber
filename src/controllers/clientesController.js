const db = require('../config/db');

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
        });
    });
}

exports.listClientes = async (req, res) => {
    try {
        const rows = await all('SELECT * FROM clientes ORDER BY nome ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createCliente = async (req, res) => {
    const { nome, telefone } = req.body;
    const user_id = req.user.id;

    try {
        const result = await run(
            'INSERT INTO clientes (user_id, nome, telefone) VALUES (?, ?, ?)',
            [user_id, nome, telefone]
        );
        res.status(201).json({ id: result.id, message: 'Cliente criado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
