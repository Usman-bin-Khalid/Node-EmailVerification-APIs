const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

// Email Transporter (Use Mailtrap for testing or Gmail for production)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'usmanbinkhalidpk@gmail.com', pass: 'lydqvuubgoqnvwwe' }
});

exports.signup = async (req, res) => {
    const { name, email, password, confirmPassword, dob, gender, country } = req.body;

    if (password !== confirmPassword) return res.status(400).json({ msg: "Passwords do not match" });

    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user = new User({
            name, email, password: hashedPassword, dob, gender, country,
            otp, otpExpires: Date.now() + 3600000 // 1 hour
        });

        await user.save();

        await transporter.sendMail({
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`
        });

        res.status(201).json({ msg: "User registered. Please check your email for OTP." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await User.findOne({ email, otp, otpExpires: { $gt: Date.now() } });
        if (!user) return res.status(400).json({ msg: "Invalid or expired OTP" });

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ msg: "Email verified successfully. You can now login." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        // 1. Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: "Invalid credentials" });
        }

        // 2. Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: "Invalid credentials" });
        }

        // 3. Check verification status
        if (!user.isVerified) {
            return res.status(400).json({ msg: "Please verify your email first" });
        }

        // 4. Create Access Token (Short-lived)
        const accessToken = jwt.sign(
            { id: user._id }, 
            process.env.ACCESS_TOKEN_SECRET, 
            { expiresIn: '15m' }
        );

        // 5. Create Refresh Token (Long-lived)
        const refreshToken = jwt.sign(
            { id: user._id }, 
            process.env.REFRESH_TOKEN_SECRET, 
            { expiresIn: '7d' }
        );

        // Note: In a production app, you might want to save the refreshToken 
        // to your database or send it via an HttpOnly cookie for better security.

        res.json({
            msg: "Login successful",
            accessToken,
            refreshToken,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email 
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: "User deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

