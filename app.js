const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(express.json());

// Replace with your MongoDB URI
mongoose.connect('mongodb://localhost:27017/authDB')
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

app.use('/api/auth', authRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));