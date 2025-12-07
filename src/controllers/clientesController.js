const db = require('../config/db');

exports.listClientes = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM clientes ORDER BY nome ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createCliente = async (req, res) => {
    const { nome, telefone } = req.body;
    const user_id = req.user.id;

    try {
        const { rows: result } = await db.query(
            'INSERT INTO clientes (user_id, nome, telefone) VALUES ($1, $2, $3) RETURNING id',
            [user_id, nome, telefone]
        );
        res.status(201).json({ id: result[0].id, message: 'Cliente criado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
