const db = require('../config/db');

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
    let paramIndex = 1;

    if (data) {
        query += ` AND a.data = $${paramIndex}`;
        params.push(data);
        paramIndex++;
    }

    if (min_date) {
        query += ` AND a.data >= $${paramIndex}`;
        params.push(min_date);
        paramIndex++;
    }

    query += ' ORDER BY a.data ASC, a.hora ASC';

    try {
        const { rows } = await db.query(query, params);
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
            const { rows: existingClient } = await db.query('SELECT id FROM clientes WHERE nome = $1', [cliente_nome]);
            if (existingClient.length > 0) {
                cliente_id = existingClient[0].id;
            } else {
                const { rows: resultClient } = await db.query(
                    'INSERT INTO clientes (user_id, nome) VALUES ($1, $2) RETURNING id',
                    [user_id, cliente_nome]
                );
                cliente_id = resultClient[0].id;
            }
        }

        // Check for existing appointment
        const { rows: existingAppointment } = await db.query(
            'SELECT id FROM agendamentos WHERE data = $1 AND hora = $2 AND status != \'cancelado\'',
            [data, hora]
        );

        if (existingAppointment.length > 0) {
            return res.status(400).json({ error: 'Horário já reservado.' });
        }

        const { rows: result } = await db.query(
            'INSERT INTO agendamentos (user_id, cliente_id, servico_id, data, hora, observacao) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [user_id, cliente_id, servico_id, data, hora, observacao]
        );
        res.status(201).json({ id: result[0].id, message: 'Agendamento criado com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.cancelAppointment = async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE agendamentos SET status = $1 WHERE id = $2', ['cancelado', id]);
        res.json({ message: 'Agendamento cancelado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
