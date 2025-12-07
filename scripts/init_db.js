const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

async function initDb() {
    try {
        const schemaPath = path.resolve(__dirname, '../src/database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Lendo schema de:', schemaPath);
        console.log('Executando query no banco de dados...');

        // Split queries if needed, but usually simple schemas run fine in one go with pg
        // However, pg driver might strict about multiple statements unless configured? 
        // Standard pg query can execute multiple statements separated by semicolons.
        await db.query(schema);

        console.log('Tabelas criadas com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('Erro ao inicializar banco de dados:', err);
        process.exit(1);
    }
}

initDb();
