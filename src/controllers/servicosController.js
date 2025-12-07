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

exports.listServicos = async (req, res) => {
    try {
        const rows = await all('SELECT * FROM servicos ORDER BY nome ASC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createServico = async (req, res) => {
    const { nome, valor, duracao_minutos } = req.body;
    const user_id = req.user.id;

    try {
        const result = await run(
            'INSERT INTO servicos (user_id, nome, valor, duracao_minutos) VALUES (?, ?, ?, ?)',
            [user_id, nome, valor, duracao_minutos]
        );
        res.status(201).json({ id: result.id, message: 'Serviço criado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.updateServico = async (req, res) => {
    const { id } = req.params;
    const { nome, valor, duracao_minutos } = req.body;
    try {
        await run(
            'UPDATE servicos SET nome = ?, valor = ?, duracao_minutos = ? WHERE id = ?',
            [nome, valor, duracao_minutos, id]
        );
        res.json({ message: 'Serviço atualizado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
