const express = require('express');
const router = express.Router();
const columnController = require('../controllers/columnController');
const verifyToken = require('../middleware/verifyToken');

router.post('/', verifyToken, columnController.createColumn);
router.get('/:boardId', verifyToken, columnController.getColumnsByBoard);
router.put('/:id', verifyToken, columnController.updateColumn);
router.delete('/:id', verifyToken, columnController.deleteColumn);
router.post('/reorder', verifyToken, columnController.reorderColumns);

module.exports = router;