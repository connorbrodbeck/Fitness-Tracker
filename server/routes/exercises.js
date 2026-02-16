const express = require('express');
const db = require('../database');

const router = express.Router();

// GET /api/exercises — fetch user's exercises grouped by category
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, category, last_weight, last_reps FROM exercises WHERE user_id = ? ORDER BY category, last_used DESC',
      [req.userId]
    );
    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      lastWeight: r.last_weight ? parseFloat(r.last_weight) : null,
      lastReps: r.last_reps
    })));
  } catch (err) {
    console.error('Exercises GET error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/exercises — upsert exercise
router.post('/', async (req, res) => {
  const { name, category, lastWeight, lastReps } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  try {
    await db.execute(
      'INSERT INTO exercises (user_id, name, category, last_weight, last_reps) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE category = VALUES(category), last_weight = VALUES(last_weight), last_reps = VALUES(last_reps)',
      [req.userId, name, category, lastWeight || null, lastReps || null]
    );
    res.json({ message: 'Exercise saved' });
  } catch (err) {
    console.error('Exercises POST error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/exercises/:id — delete an exercise
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.execute(
      'DELETE FROM exercises WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    res.json({ message: 'Exercise deleted' });
  } catch (err) {
    console.error('Exercises DELETE error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
