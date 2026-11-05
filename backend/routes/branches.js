const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const branches = db
    .prepare('SELECT id, name, address, phone FROM branches WHERE is_active = 1 ORDER BY name')
    .all();
  res.json(branches);
});

router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { name, address, phone } = req.body || {};

  if (!name || !address) {
    return res.status(400).json({ error: 'Name and address are required' });
  }

  const result = db
    .prepare('INSERT INTO branches (name, address, phone) VALUES (?, ?, ?)')
    .run(String(name).trim(), String(address).trim(), phone ? String(phone).trim() : null);

  res.status(201).json({ id: Number(result.lastInsertRowid), name, address, phone: phone || null });
});

module.exports = router;