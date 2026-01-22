const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();

const app = express();
app.use(express.json());

// Replace with your MongoDB URI
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

app.use('/api/auth', authRoutes);

const PORT = 5002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));