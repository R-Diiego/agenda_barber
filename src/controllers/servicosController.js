const db = require('../config/db');

exports.listServicos = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM servicos ORDER BY nome ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createServico = async (req, res) => {
    const { nome, valor, duracao_minutos } = req.body;
    const user_id = req.user.id;

    try {
        const { rows: result } = await db.query(
            'INSERT INTO servicos (user_id, nome, valor, duracao_minutos) VALUES ($1, $2, $3, $4) RETURNING id',
            [user_id, nome, valor, duracao_minutos]
        );
        res.status(201).json({ id: result[0].id, message: 'Serviço criado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateServico = async (req, res) => {
    const { id } = req.params;
    const { nome, valor, duracao_minutos } = req.body;
    try {
        await db.query(
            'UPDATE servicos SET nome = $1, valor = $2, duracao_minutos = $3 WHERE id = $4',
            [nome, valor, duracao_minutos, id]
        );
        res.json({ message: 'Serviço atualizado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
