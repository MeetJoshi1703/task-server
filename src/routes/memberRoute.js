const express = require('express');
const router = express.Router();
const memberController = require('../controllers/memberController');
const verifyToken = require('../middleware/verifyToken');

router.post('/:boardId', verifyToken, memberController.addMember);
router.get('/:boardId', verifyToken, memberController.getMembers);
router.put('/:boardId/:userId', verifyToken, memberController.updateMemberRole);
router.delete('/:boardId/:userId', verifyToken, memberController.removeMember);

module.exports = router;