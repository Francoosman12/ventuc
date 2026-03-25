const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');

router.post('/open', financeController.openBox);
router.post('/close', financeController.closeBox);
router.get('/summary/:sessionId', financeController.getSessionSummary);
router.get('/status', financeController.getSessionStatus);
router.get('/stats', financeController.getFinanceStats);
router.get('/history', financeController.getClosedSessions);

module.exports = router;