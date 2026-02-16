const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../database');

const router = express.Router();

// GET /api/admin/users — list all users with summary stats
router.get('/users', async (req, res) => {
  try {
    const [users] = await db.execute(`
      SELECT
        u.id,
        u.username,
        u.created_at,
        u.current_weight,
        u.goal_weight,
        u.start_weight,
        u.calorie_goal,
        u.best_streak,
        u.is_admin,
        MAX(dl.log_date) AS last_active
      FROM users u
      LEFT JOIN daily_logs dl ON u.id = dl.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    const summaries = users.map(u => ({
      id: u.id,
      username: u.username,
      signupDate: u.created_at,
      currentWeight: parseFloat(u.current_weight),
      goalWeight: parseFloat(u.goal_weight),
      startWeight: parseFloat(u.start_weight),
      calorieGoal: u.calorie_goal,
      bestStreak: u.best_streak,
      isAdmin: !!u.is_admin,
      lastActive: u.last_active
    }));

    res.json(summaries);
  } catch (err) {
    console.error('Admin users list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/users/:id — full detail for one user
router.get('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    const [users] = await db.execute(
      'SELECT id, username, created_at, current_weight, goal_weight, start_weight, calorie_goal, best_streak, is_admin FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = users[0];

    // Recent daily logs (last 30 days)
    const [logs] = await db.execute(
      'SELECT * FROM daily_logs WHERE user_id = ? ORDER BY log_date DESC LIMIT 30',
      [userId]
    );

    // Recent meals
    const [meals] = await db.execute(`
      SELECT m.*, dl.log_date
      FROM meals m
      JOIN daily_logs dl ON m.daily_log_id = dl.id
      WHERE dl.user_id = ?
      ORDER BY dl.log_date DESC, m.id DESC
      LIMIT 50
    `, [userId]);

    // Recent gym sessions
    const [gymSessions] = await db.execute(`
      SELECT g.*, dl.log_date
      FROM gym_sessions g
      JOIN daily_logs dl ON g.daily_log_id = dl.id
      WHERE dl.user_id = ?
      ORDER BY dl.log_date DESC, g.id DESC
      LIMIT 20
    `, [userId]);

    // Recent runs
    const [runs] = await db.execute(`
      SELECT r.*, dl.log_date
      FROM run_sessions r
      JOIN daily_logs dl ON r.daily_log_id = dl.id
      WHERE dl.user_id = ?
      ORDER BY dl.log_date DESC, r.id DESC
      LIMIT 20
    `, [userId]);

    // Weight history
    const [weightHistory] = await db.execute(
      'SELECT * FROM weight_history WHERE user_id = ? ORDER BY weigh_date DESC',
      [userId]
    );

    // Personal records
    const [prs] = await db.execute(
      'SELECT * FROM personal_records WHERE user_id = ? ORDER BY record_date DESC',
      [userId]
    );

    res.json({
      profile: {
        id: u.id,
        username: u.username,
        signupDate: u.created_at,
        currentWeight: parseFloat(u.current_weight),
        goalWeight: parseFloat(u.goal_weight),
        startWeight: parseFloat(u.start_weight),
        calorieGoal: u.calorie_goal,
        bestStreak: u.best_streak,
        isAdmin: !!u.is_admin
      },
      recentLogs: logs,
      recentMeals: meals,
      recentGymSessions: gymSessions,
      recentRuns: runs,
      weightHistory: weightHistory,
      personalRecords: prs
    });
  } catch (err) {
    console.error('Admin user detail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/activity — recent activity across all users
router.get('/activity', async (req, res) => {
  try {
    const [meals] = await db.execute(`
      SELECT
        'meal' AS type,
        u.username,
        m.name AS description,
        m.calories,
        dl.log_date AS date,
        m.timestamp
      FROM meals m
      JOIN daily_logs dl ON m.daily_log_id = dl.id
      JOIN users u ON dl.user_id = u.id
      ORDER BY dl.log_date DESC, m.id DESC
      LIMIT 20
    `);

    const [gym] = await db.execute(`
      SELECT
        'gym' AS type,
        u.username,
        g.exercises AS description,
        g.prs,
        dl.log_date AS date,
        g.timestamp
      FROM gym_sessions g
      JOIN daily_logs dl ON g.daily_log_id = dl.id
      JOIN users u ON dl.user_id = u.id
      ORDER BY dl.log_date DESC, g.id DESC
      LIMIT 15
    `);

    const [runs] = await db.execute(`
      SELECT
        'run' AS type,
        u.username,
        CONCAT(r.distance, ' miles') AS description,
        r.pace,
        dl.log_date AS date,
        r.timestamp
      FROM run_sessions r
      JOIN daily_logs dl ON r.daily_log_id = dl.id
      JOIN users u ON dl.user_id = u.id
      ORDER BY dl.log_date DESC, r.id DESC
      LIMIT 15
    `);

    // Combine and sort by date descending
    const allActivity = [...meals, ...gym, ...runs]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 50);

    res.json(allActivity);
  } catch (err) {
    console.error('Admin activity feed error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/users/:id — update user account
router.put('/users/:id', async (req, res) => {
  const { password, isAdmin, calorieGoal, goalWeight } = req.body;

  try {
    const fields = [];
    const values = [];

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      fields.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (isAdmin !== undefined) {
      fields.push('is_admin = ?');
      values.push(isAdmin ? 1 : 0);
    }

    if (calorieGoal !== undefined) {
      fields.push('calorie_goal = ?');
      values.push(calorieGoal);
    }

    if (goalWeight !== undefined) {
      fields.push('goal_weight = ?');
      values.push(goalWeight);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);
    await db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Admin user update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/users/:id — delete user account
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent self-deletion
    if (parseInt(userId) === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const [result] = await db.execute(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Admin user delete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
