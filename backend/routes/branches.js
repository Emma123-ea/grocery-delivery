const express = require('express');
const { query } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, address, phone FROM branches WHERE is_active = 1 ORDER BY name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Loading branches failed:', err);
    res.status(500).json({ error: 'Could not load branches' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { name, address, phone } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanAddress = String(address || '').trim();
  const cleanPhone = phone ? String(phone).trim() : null;

  if (!cleanName || !cleanAddress) {
    return res.status(400).json({ error: 'Name and address are required' });
  }
  if (cleanName.length > 120 || cleanAddress.length > 300 || (cleanPhone && cleanPhone.length > 30)) {
    return res.status(400).json({ error: 'One of the fields is too long' });
  }

  try {
    const result = await query(
      'INSERT INTO branches (name, address, phone) VALUES ($1, $2, $3) RETURNING id',
      [cleanName, cleanAddress, cleanPhone]
    );
    res.status(201).json({
      id: result.rows[0].id,
      name: cleanName,
      address: cleanAddress,
      phone: cleanPhone,
    });
  } catch (err) {
    console.error('Adding branch failed:', err);
    res.status(500).json({ error: 'Could not add the branch' });
  }
});

module.exports = router;