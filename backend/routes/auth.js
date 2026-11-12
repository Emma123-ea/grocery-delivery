const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

const router = express.Router();

function createToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

router.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const cleanName = String(name).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPhone = phone ? String(phone).trim() : null;

  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hash = bcrypt.hashSync(String(password), 10);
    const result = await query(
      'INSERT INTO users (name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
      [cleanName, cleanEmail, cleanPhone, hash]
    );

    const user = {
      id: result.rows[0].id,
      name: cleanName,
      email: cleanEmail,
      role: 'customer',
    };

    res.status(201).json({ token: createToken(user), user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    console.error('Register failed:', err);
    res.status(500).json({ error: 'Could not create your account. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  try {
    const result = await query(
      'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
      [cleanEmail]
    );
    const row = result.rows[0];

    if (!row || !bcrypt.compareSync(String(password), row.password_hash)) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    const user = { id: row.id, name: row.name, email: row.email, role: row.role };
    res.json({ token: createToken(user), user });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ error: 'Could not log you in. Please try again.' });
  }
});

module.exports = router;