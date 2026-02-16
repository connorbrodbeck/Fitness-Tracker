const express = require('express');
const db = require('../database');

const router = express.Router();

// GET /api/photos — list photos metadata (no image_data)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, photo_date, notes, weight_at_time, created_at FROM progress_photos WHERE user_id = ? ORDER BY photo_date DESC',
      [req.userId]
    );
    res.json(rows.map(r => ({
      id: r.id,
      photoDate: r.photo_date,
      notes: r.notes,
      weightAtTime: r.weight_at_time ? parseFloat(r.weight_at_time) : null,
      createdAt: r.created_at
    })));
  } catch (err) {
    console.error('Photos GET error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/photos/:id — single photo with full image_data
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, photo_date, image_data, notes, weight_at_time FROM progress_photos WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    const r = rows[0];
    res.json({
      id: r.id,
      photoDate: r.photo_date,
      imageData: r.image_data,
      notes: r.notes,
      weightAtTime: r.weight_at_time ? parseFloat(r.weight_at_time) : null
    });
  } catch (err) {
    console.error('Photos GET/:id error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/photos — upload photo
router.post('/', async (req, res) => {
  const { imageData, photoDate, notes, weightAtTime } = req.body;
  if (!imageData || !photoDate) {
    return res.status(400).json({ error: 'Image data and date are required' });
  }

  // Reject if image_data > 7MB
  if (imageData.length > 7 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image too large. Max 7MB after compression.' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO progress_photos (user_id, photo_date, image_data, notes, weight_at_time) VALUES (?, ?, ?, ?, ?)',
      [req.userId, photoDate, imageData, notes || null, weightAtTime || null]
    );
    res.json({ id: result.insertId, photoDate, notes, weightAtTime });
  } catch (err) {
    console.error('Photos POST error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/photos/:id — delete photo
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.execute(
      'DELETE FROM progress_photos WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    console.error('Photos DELETE error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
