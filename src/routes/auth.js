const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/signup', authController.signUp);
router.post('/signin', authController.signIn);
router.post('/signout', authController.signOut);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/password', authMiddleware, authController.updatePassword);
router.delete('/account', authMiddleware, authController.deleteAccount);

module.exports = router;