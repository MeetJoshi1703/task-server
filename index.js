require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth');
const boardRoutes = require('./src/routes/boardRoutes');
const columnRoutes = require('./src/routes/columnRoute');
const taskRoutes = require('./src/routes/taskRoutes');
const memberRoutes = require('./src/routes/memberRoute');
const notificationRoutes = require('./src/routes/notificationRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Routes

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/columns', columnRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal Server Error',
    statusCode: err.statusCode || 500,
    errors: err.errors || null,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});