const express = require('express');
const db = require('../database');

const router = express.Router();

// POST /api/weight — log a weigh-in
router.post('/', async (req, res) => {
  const { weight } = req.body;
  if (!weight) {
    return res.status(400).json({ error: 'Weight is required' });
  }

  const today = new Date().toISOString().split('T')[0];

  try {
    // Upsert weight history
    await db.execute(
      'INSERT INTO weight_history (user_id, weigh_date, weight) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE weight = ?',
      [req.userId, today, weight, weight]
    );

    // Update user's current weight
    await db.execute('UPDATE users SET current_weight = ? WHERE id = ?', [weight, req.userId]);

    res.json({ message: 'Weight logged', date: today, weight });
  } catch (err) {
    console.error('Weight POST error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/weight/history — last 12 entries
router.get('/history', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT weigh_date AS date, weight FROM weight_history WHERE user_id = ? ORDER BY weigh_date DESC LIMIT 12',
      [req.userId]
    );
    // Return in chronological order
    res.json(rows.reverse().map(r => ({ date: r.date, weight: parseFloat(r.weight) })));
  } catch (err) {
    console.error('Weight history error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
