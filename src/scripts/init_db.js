const db = require('../config/db');

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                console.error('Error running sql ' + sql);
                console.error(err);
                reject(err);
            } else {
                resolve({ id: this.lastID });
            }
        });
    });
}

async function initDB() {
    try {
        console.log('Initializing SQLite database...');

        // Users
        await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        role TEXT DEFAULT 'barbeiro',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Clientes
        await run(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        nome TEXT NOT NULL,
        telefone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        // Servicos
        await run(`
      CREATE TABLE IF NOT EXISTS servicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        nome TEXT NOT NULL,
        valor DECIMAL(10,2) NOT NULL,
        duracao_minutos INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        // Agendamentos
        await run(`
      CREATE TABLE IF NOT EXISTS agendamentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        cliente_id INTEGER NOT NULL,
        servico_id INTEGER NOT NULL,
        data TEXT NOT NULL,
        hora TEXT NOT NULL,
        observacao TEXT,
        status TEXT DEFAULT 'agendado',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
        FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE
      )
    `);

        // Seed Data (Optional, for testing)
        // Check if admin exists
        const row = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM users WHERE email = ?", ['admin@barber.com'], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!row) {
            console.log("Creating admin user...");
            // Password is '123456' hashed (bcrypt placeholder if we were using it, but for now simple for seed)
            // In real app, we will use bcrypt in auth controller.
            // For now, let's just insert a dummy user. Auth logic will come next.
            // We will insert 'admin' later via API or Auth logic to be safe with hashes.
        }

        console.log('Database initialized successfully!');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
    // Do not close db here as it might be used by the app if we were running it simultaneously, 
    // but for script it's fine.
}

initDB();
