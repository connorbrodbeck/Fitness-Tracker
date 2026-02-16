const db = require('../database');

async function requireAdmin(req, res, next) {
  try {
    const [rows] = await db.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.userId]
    );

    if (rows.length === 0 || !rows[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (err) {
    console.error('Admin auth error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = requireAdmin;
