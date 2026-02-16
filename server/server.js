require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authenticate = require('./middleware/auth');
const requireAdmin = require('./middleware/adminAuth');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const logsRoutes = require('./routes/logs');
const weightRoutes = require('./routes/weight');
const adminRoutes = require('./routes/admin');
const presetsRoutes = require('./routes/presets');
const exercisesRoutes = require('./routes/exercises');
const photosRoutes = require('./routes/photos');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..')));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/profile', authenticate, profileRoutes);
app.use('/api/logs', authenticate, logsRoutes);
app.use('/api/weight', authenticate, weightRoutes);
app.use('/api/presets', authenticate, presetsRoutes);
app.use('/api/exercises', authenticate, exercisesRoutes);
app.use('/api/photos', authenticate, photosRoutes);

// Admin routes (requires both authentication and admin privilege)
app.use('/api/admin', authenticate, requireAdmin, adminRoutes);

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Fitness Tracker API running on http://localhost:${PORT}`);
});
