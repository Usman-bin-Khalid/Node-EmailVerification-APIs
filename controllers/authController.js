const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Email Transporter (Use Mailtrap for testing or Gmail for production)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'your-email@gmail.com', pass: 'your-app-password' }
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
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ msg: "Invalid credentials" });
        }
        if (!user.isVerified) return res.status(400).json({ msg: "Please verify your email first" });

        res.json({ msg: "Login successful", user: { id: user._id, name: user.name } });
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