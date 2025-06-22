const express = require('express');
const router = express.Router();
const boardController = require('../controllers/boardController');
const verifyToken = require('../middleware/verifyToken');

router.post('/', verifyToken, boardController.createBoard);
router.get('/', verifyToken, boardController.getBoards);
router.get('/:id', verifyToken, boardController.getBoardById);
router.put('/:id', verifyToken, boardController.updateBoard);
router.delete('/:id', verifyToken, boardController.deleteBoard);
router.post('/:id/star', verifyToken, boardController.starBoard);

module.exports = router;