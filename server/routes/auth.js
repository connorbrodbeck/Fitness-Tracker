const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { username, password, currentWeight, goalWeight, startWeight, calorieGoal } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      'INSERT INTO users (username, password_hash, current_weight, goal_weight, start_weight, calorie_goal) VALUES (?, ?, ?, ?, ?, ?)',
      [
        username,
        passwordHash,
        currentWeight || 145,
        goalWeight || 180,
        startWeight || currentWeight || 145,
        calorieGoal || 3000
      ]
    );

    const token = jwt.sign({ userId: result.insertId }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        username,
        currentWeight: currentWeight || 145,
        goalWeight: goalWeight || 180,
        startWeight: startWeight || currentWeight || 145,
        calorieGoal: calorieGoal || 3000,
        bestStreak: 0
      }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username already taken' });
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        currentWeight: parseFloat(user.current_weight),
        goalWeight: parseFloat(user.goal_weight),
        startWeight: parseFloat(user.start_weight),
        calorieGoal: user.calorie_goal,
        bestStreak: user.best_streak,
        isAdmin: !!user.is_admin
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
