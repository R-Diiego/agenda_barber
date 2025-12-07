const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, clientesController.listClientes);
router.post('/', authMiddleware, clientesController.createCliente);

module.exports = router;
