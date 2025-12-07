const express = require('express');
const router = express.Router();
const servicosController = require('../controllers/servicosController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, servicosController.listServicos);
router.post('/', authMiddleware, servicosController.createServico);
router.put('/:id', authMiddleware, servicosController.updateServico);

module.exports = router;
