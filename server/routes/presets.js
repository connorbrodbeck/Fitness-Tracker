const express = require('express');
const db = require('../database');

const router = express.Router();

// GET /api/presets — fetch user's meal presets
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, calories FROM meal_presets WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Presets GET error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/presets — create a preset
router.post('/', async (req, res) => {
  const { name, calories } = req.body;
  if (!name || !calories) {
    return res.status(400).json({ error: 'Name and calories are required' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO meal_presets (user_id, name, calories) VALUES (?, ?, ?)',
      [req.userId, name, calories]
    );
    res.json({ id: result.insertId, name, calories });
  } catch (err) {
    console.error('Presets POST error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/presets/:id — delete a preset
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.execute(
      'DELETE FROM meal_presets WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    res.json({ message: 'Preset deleted' });
  } catch (err) {
    console.error('Presets DELETE error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
