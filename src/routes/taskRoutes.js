const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const verifyToken = require('../middleware/verifyToken');

router.get('/getAllTasks', verifyToken, taskController.getAllTasks);
router.post('/', verifyToken, taskController.createTask);
router.get('/:columnId', verifyToken, taskController.getTasksByColumn);
router.get('/details/:id', verifyToken, taskController.getTaskById);
router.put('/:id', verifyToken, taskController.updateTask);
router.delete('/:id', verifyToken, taskController.deleteTask);
router.post('/move', verifyToken, taskController.moveTask);
router.post('/:id/assignees', verifyToken, taskController.addAssignee);
router.delete('/:id/assignees/:userId', verifyToken, taskController.removeAssignee);
router.post('/:id/tags', verifyToken, taskController.addTag);
router.delete('/:id/tags/:tag', verifyToken, taskController.removeTag);
router.post('/:id/comments', verifyToken, taskController.addComment);
router.delete('/:id/comments/:commentId', verifyToken, taskController.deleteComment);
router.post('/:id/attachments', verifyToken, taskController.addAttachment);
router.delete('/:id/attachments/:attachmentId', verifyToken, taskController.deleteAttachment);

module.exports = router;