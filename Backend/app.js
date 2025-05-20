// backend/app.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const authRoutes = require('./routes/authRoutes');
const signRoutes = require('./routes/signRoutes');
const userRoutes = require('./routes/userRoutes');
const modelRoutes = require('./routes/modelRoutes'); // New model routes
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/signs', signRoutes);
app.use('/api/users', userRoutes);
app.use('/api/model', modelRoutes); // New model routes

// Serve model files statically (for direct model loading)
app.use('/model', express.static('../ML/models/web_model'));

// Default route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to GestureConnect API' });
});

// Error middleware
app.use(errorMiddleware);

module.exports = app;