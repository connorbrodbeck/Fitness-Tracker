const express = require('express');
const db = require('../database');

const router = express.Router();

// GET /api/profile
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, username, current_weight, goal_weight, start_weight, calorie_goal, best_streak, is_admin FROM users WHERE id = ?',
      [req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const u = rows[0];
    res.json({
      id: u.id,
      username: u.username,
      currentWeight: parseFloat(u.current_weight),
      goalWeight: parseFloat(u.goal_weight),
      startWeight: parseFloat(u.start_weight),
      calorieGoal: u.calorie_goal,
      bestStreak: u.best_streak,
      isAdmin: !!u.is_admin
    });
  } catch (err) {
    console.error('Profile GET error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/profile
router.put('/', async (req, res) => {
  const { goalWeight, calorieGoal, bestStreak } = req.body;
  try {
    const fields = [];
    const values = [];
    if (goalWeight !== undefined) { fields.push('goal_weight = ?'); values.push(goalWeight); }
    if (calorieGoal !== undefined) { fields.push('calorie_goal = ?'); values.push(calorieGoal); }
    if (bestStreak !== undefined) { fields.push('best_streak = ?'); values.push(bestStreak); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.userId);
    await db.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('Profile PUT error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
