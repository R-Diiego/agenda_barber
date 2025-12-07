const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('ERRO: DATABASE_URL não definida no arquivo .env ou variáveis de ambiente.');
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
});

// Test connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Erro ao conectar no banco de dados:', err.stack);
    } else {
        console.log('Conectado ao banco de dados PostgreSQL com sucesso!');
        release();
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
