const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');


const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Must be false for port 587
    auth: {
        user: 'usmanbinkhalidpk@gmail.com',
        pass: 'lydqvuubgoqnvwwe' 
    },
    tls: {
        // This prevents the "ETIMEDOUT" or "Self-signed certificate" errors
        rejectUnauthorized: false 
    }
});



exports.signup = async (req, res) => {
    const { name, email, password, confirmPassword, dob, gender, country } = req.body;
    if (password !== confirmPassword) return res.status(400).json({ msg: "Passwords do not match" });

    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // 1. Create the user object but DO NOT .save() yet
        const newUser = new User({
            name, email, password: hashedPassword, dob, gender, country,
            otp, otpExpires: Date.now() + 3600000 
        });

        // 2. Try to send the email FIRST
        await transporter.sendMail({
            from: '"Your App Name" <usmanbinkhalidpk@gmail.com>',
            to: email,
            subject: "Verify your account",
            text: `Your OTP is ${otp}`
        });

        // 3. Only if email sends successfully, save the user to the database
        await newUser.save();

        res.status(201).json({ msg: "User registered. Please check your email for OTP." });
    } catch (err) {
        // If email fails, the error is caught here and user is never saved in DB
        console.error("Mail Error: ", err);
        res.status(500).json({ error: "Failed to send OTP. Please try again later." });
    }
};



exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ msg: "User with this email does not exist" });

        // Generate a new 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Update user with OTP and 1-hour expiry
        user.otp = otp;
        user.otpExpires = Date.now() + 3600000; 
        await user.save();

        // Send Email
        await transporter.sendMail({
            from: '"Your App Name" <usmanbinkhalidpk@gmail.com>',
            to: email,
            subject: "Password Reset OTP",
            text: `Your OTP for resetting your password is: ${otp}. It will expire in 1 hour.`
        });

        res.json({ msg: "OTP sent to your email" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const user = await User.findOne({ 
            email, 
            otp, 
            otpExpires: { $gt: Date.now() } // Check if OTP is not expired
        });

        if (!user) {
            return res.status(400).json({ msg: "Invalid OTP or OTP has expired" });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

    
        // Clear OTP fields so they can't be reused
        user.otp = undefined;
        user.otpExpires = undefined;
        
        await user.save();

        res.json({ msg: "Password reset successful. You can now login with your new password." });
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

