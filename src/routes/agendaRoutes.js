const express = require('express');
const router = express.Router();
const agendaController = require('../controllers/agendaController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, agendaController.listAppointments);
router.post('/', authMiddleware, agendaController.createAppointment);
router.put('/:id/cancel', authMiddleware, agendaController.cancelAppointment);

module.exports = router;
