const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use(cors());
app.use(bodyParser.json());

// Disable caching for all requests
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Global Error Handler for JSON parse errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ message: 'Invalid JSON payload' });
    }
    next();
});

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/agendamentos', require('./src/routes/agendaRoutes'));
app.use('/api/clientes', require('./src/routes/clientesRoutes'));
app.use('/api/servicos', require('./src/routes/servicosRoutes'));



// Routes Placeholder
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Barbershop API is running' });
});

// Serve Frontend for any unknown route (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
