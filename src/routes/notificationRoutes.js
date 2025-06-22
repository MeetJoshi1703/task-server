const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const verifyToken = require('../middleware/verifyToken');

router.get('/', verifyToken, notificationController.getNotifications);
router.put('/:id/read', verifyToken, notificationController.markAsRead);
router.put('/read-all', verifyToken, notificationController.markAllAsRead);
router.delete('/:id', verifyToken, notificationController.deleteNotification);

module.exports = router;