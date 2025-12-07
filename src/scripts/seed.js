const db = require('../config/db');
const bcrypt = require('bcryptjs');

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
        });
    });
}

async function seed() {
    console.log('Seeding database...');

    try {
        // 1. Create User
        // Password: 'password123'
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('password123', salt);

        // Check if exists
        // We'll just try insert, if unique constraint fails, we ignore
        try {
            await run('INSERT INTO users (nome, email, senha_hash) VALUES (?, ?, ?)', ['Barbeiro Teste', 'admin@barber.com', hash]);
            console.log('User created: admin@barber.com / password123');
        } catch (e) {
            console.log('User likely already exists');
        }

        // Get User ID
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM users WHERE email = ?', ['admin@barber.com'], (err, row) => resolve(row));
        });

        if (!user) return;

        // 2. Services
        const services = [
            { nome: 'Corte Social', valor: 35.00, duracao: 30 },
            { nome: 'Barba', valor: 25.00, duracao: 20 },
            { nome: 'Corte + Barba', valor: 50.00, duracao: 50 },
            { nome: 'Pezinho', valor: 10.00, duracao: 10 }
        ];

        for (const s of services) {
            await run('INSERT INTO servicos (user_id, nome, valor, duracao_minutos) VALUES (?, ?, ?, ?)', [user.id, s.nome, s.valor, s.duracao]);
        }
        console.log('Services seeded');

        // 3. Clients
        const clients = [
            { nome: 'João Silva', telefone: '11999999999' },
            { nome: 'Carlos Souza', telefone: '11888888888' },
            { nome: 'Pedro Santos', telefone: '11777777777' }
        ];

        for (const c of clients) {
            await run('INSERT INTO clientes (user_id, nome, telefone) VALUES (?, ?, ?)', [user.id, c.nome, c.telefone]);
        }
        console.log('Clients seeded');

        console.log('Seeding complete!');

    } catch (err) {
        console.error('Seeding error:', err);
    }
}

seed();
