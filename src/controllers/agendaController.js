const db = require('../config/db');

// Helper to wrap db.all in promise
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
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

exports.listAppointments = async (req, res) => {
    const { data, min_date } = req.query; // data = strict, min_date = >=
    let query = `
    SELECT a.*, c.nome as cliente_nome, s.nome as servico_nome, s.duracao_minutos 
    FROM agendamentos a
    JOIN clientes c ON a.cliente_id = c.id
    JOIN servicos s ON a.servico_id = s.id
    WHERE a.status != 'cancelado'
  `;
    const params = [];

    if (data) {
        query += ' AND a.data = ?';
        params.push(data);
    }

    if (min_date) {
        query += ' AND a.data >= ?';
        params.push(min_date);
    }

    query += ' ORDER BY a.data ASC, a.hora ASC';

    try {
        const rows = await all(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createAppointment = async (req, res) => {
    let { cliente_id, cliente_nome, servico_id, data, hora, observacao } = req.body;
    const user_id = req.user.id;

    try {
        // If manual name provided, find or create client
        if (cliente_nome && !cliente_id) {
            const existingClient = await all('SELECT id FROM clientes WHERE nome = ?', [cliente_nome]);
            if (existingClient.length > 0) {
                cliente_id = existingClient[0].id;
            } else {
                const resultClient = await run('INSERT INTO clientes (user_id, nome) VALUES (?, ?)', [user_id, cliente_nome]);
                cliente_id = resultClient.id;
            }
        }

        // Check for existing appointment
        const existingAppointment = await all(
            'SELECT id FROM agendamentos WHERE data = ? AND hora = ? AND status != "cancelado"',
            [data, hora]
        );

        if (existingAppointment.length > 0) {
            return res.status(400).json({ error: 'Horário já reservado.' });
        }

        const result = await run(
            'INSERT INTO agendamentos (user_id, cliente_id, servico_id, data, hora, observacao) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, cliente_id, servico_id, data, hora, observacao]
        );
        res.status(201).json({ id: result.id, message: 'Agendamento criado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.cancelAppointment = async (req, res) => {
    const { id } = req.params;
    try {
        await run('UPDATE agendamentos SET status = ? WHERE id = ?', ['cancelado', id]);
        res.json({ message: 'Agendamento cancelado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
