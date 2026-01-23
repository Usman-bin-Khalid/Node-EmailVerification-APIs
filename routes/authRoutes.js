const express = require('express');
const router = express.Router();
const { signup, verifyOtp, login, deleteUser } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);
router.delete('/delete/:id', deleteUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;