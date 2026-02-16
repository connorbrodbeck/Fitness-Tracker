const express = require('express');
const db = require('../database');

const router = express.Router();

// Helper: get or create daily_log row, return its id
async function getOrCreateLog(userId, date) {
  await db.execute(
    'INSERT IGNORE INTO daily_logs (user_id, log_date) VALUES (?, ?)',
    [userId, date]
  );
  const [rows] = await db.execute(
    'SELECT * FROM daily_logs WHERE user_id = ? AND log_date = ?',
    [userId, date]
  );
  return rows[0];
}

// Helper: build a full day object from a daily_log row
async function buildDay(log) {
  const [meals] = await db.execute('SELECT * FROM meals WHERE daily_log_id = ?', [log.id]);
  const [gyms] = await db.execute('SELECT * FROM gym_sessions WHERE daily_log_id = ?', [log.id]);
  const [runs] = await db.execute('SELECT * FROM run_sessions WHERE daily_log_id = ?', [log.id]);

  return {
    date: log.log_date,
    water: !!log.water,
    calories: log.calories,
    meals: meals.map(m => ({ id: m.id, name: m.name, calories: m.calories, timestamp: m.timestamp })),
    gym: gyms.length > 0 ? { id: gyms[0].id, exercises: gyms[0].exercises, prs: gyms[0].prs, timestamp: gyms[0].timestamp } : null,
    running: runs.length > 0 ? { id: runs[0].id, distance: parseFloat(runs[0].distance), pace: runs[0].pace, duration: runs[0].duration, timestamp: runs[0].timestamp } : null
  };
}

// GET /api/logs/:date — single day with joined data
router.get('/:date', async (req, res) => {
  try {
    const log = await getOrCreateLog(req.userId, req.params.date);
    const day = await buildDay(log);
    res.json(day);
  } catch (err) {
    console.error('Log GET error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/logs?from=YYYY-MM-DD&to=YYYY-MM-DD — date range
router.get('/', async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to query params required' });
  }

  try {
    const [logs] = await db.execute(
      'SELECT * FROM daily_logs WHERE user_id = ? AND log_date BETWEEN ? AND ? ORDER BY log_date',
      [req.userId, from, to]
    );

    const days = {};
    for (const log of logs) {
      const dateStr = typeof log.log_date === 'string' ? log.log_date : log.log_date.toISOString().split('T')[0];
      days[dateStr] = await buildDay(log);
    }
    res.json(days);
  } catch (err) {
    console.error('Logs range error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/logs/:date/water — toggle water
router.put('/:date/water', async (req, res) => {
  try {
    const log = await getOrCreateLog(req.userId, req.params.date);
    const newVal = !log.water;
    await db.execute('UPDATE daily_logs SET water = ? WHERE id = ?', [newVal, log.id]);
    res.json({ water: newVal });
  } catch (err) {
    console.error('Water toggle error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/logs/:date/meals — add meal
router.post('/:date/meals', async (req, res) => {
  const { name, calories } = req.body;
  if (!name || !calories) {
    return res.status(400).json({ error: 'name and calories required' });
  }

  try {
    const log = await getOrCreateLog(req.userId, req.params.date);
    const timestamp = new Date().toLocaleTimeString();

    await db.execute(
      'INSERT INTO meals (daily_log_id, name, calories, timestamp) VALUES (?, ?, ?, ?)',
      [log.id, name, calories, timestamp]
    );

    // Recalculate total calories
    const [mealRows] = await db.execute('SELECT SUM(calories) AS total FROM meals WHERE daily_log_id = ?', [log.id]);
    const totalCals = mealRows[0].total || 0;
    await db.execute('UPDATE daily_logs SET calories = ? WHERE id = ?', [totalCals, log.id]);

    const day = await buildDay({ ...log, calories: totalCals });
    res.json(day);
  } catch (err) {
    console.error('Meal POST error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/logs/:date/gym — log gym session
router.post('/:date/gym', async (req, res) => {
  const { exercises, prs } = req.body;
  if (!exercises) {
    return res.status(400).json({ error: 'exercises required' });
  }

  try {
    const log = await getOrCreateLog(req.userId, req.params.date);
    const timestamp = new Date().toLocaleTimeString();

    // Replace existing gym session for this day
    await db.execute('DELETE FROM gym_sessions WHERE daily_log_id = ?', [log.id]);
    await db.execute(
      'INSERT INTO gym_sessions (daily_log_id, exercises, prs, timestamp) VALUES (?, ?, ?, ?)',
      [log.id, exercises, prs || null, timestamp]
    );

    // Save PR to personal_records if provided
    if (prs) {
      await db.execute(
        'INSERT INTO personal_records (user_id, record_date, description) VALUES (?, ?, ?)',
        [req.userId, req.params.date, prs]
      );
    }

    const day = await buildDay(log);
    res.json(day);
  } catch (err) {
    console.error('Gym POST error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/logs/:date/run — log run
router.post('/:date/run', async (req, res) => {
  const { distance, pace, duration } = req.body;
  if (!distance) {
    return res.status(400).json({ error: 'distance required' });
  }

  try {
    const log = await getOrCreateLog(req.userId, req.params.date);
    const timestamp = new Date().toLocaleTimeString();

    // Replace existing run for this day
    await db.execute('DELETE FROM run_sessions WHERE daily_log_id = ?', [log.id]);
    await db.execute(
      'INSERT INTO run_sessions (daily_log_id, distance, pace, duration, timestamp) VALUES (?, ?, ?, ?, ?)',
      [log.id, distance, pace || null, duration || null, timestamp]
    );

    const day = await buildDay(log);
    res.json(day);
  } catch (err) {
    console.error('Run POST error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/logs/:date — reset day
router.delete('/:date', async (req, res) => {
  try {
    // Deleting the daily_log will CASCADE to meals, gym_sessions, run_sessions
    await db.execute(
      'DELETE FROM daily_logs WHERE user_id = ? AND log_date = ?',
      [req.userId, req.params.date]
    );
    res.json({ message: 'Day reset' });
  } catch (err) {
    console.error('Day reset error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
