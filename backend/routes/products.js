const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { branch_id, category } = req.query;
  let sql = 'SELECT * FROM products WHERE is_available = 1';
  const params = [];

  if (branch_id) {
    sql += ' AND branch_id = ?';
    params.push(Number(branch_id));
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(String(category));
  }

  sql += ' ORDER BY name';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(req.params.id));
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { branch_id, name, description, category, price_pesewas, stock_quantity } = req.body || {};

  if (!branch_id || !name || price_pesewas === undefined) {
    return res.status(400).json({ error: 'branch_id, name and price_pesewas are required' });
  }
  if (!Number.isInteger(price_pesewas) || price_pesewas < 0) {
    return res.status(400).json({ error: 'price_pesewas must be a whole number of pesewas' });
  }

  const branch = db.prepare('SELECT id FROM branches WHERE id = ?').get(Number(branch_id));
  if (!branch) {
    return res.status(400).json({ error: 'That branch does not exist' });
  }

  const result = db
    .prepare(
      `INSERT INTO products (branch_id, name, description, category, price_pesewas, stock_quantity)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      Number(branch_id),
      String(name).trim(),
      description ? String(description).trim() : null,
      category ? String(category).trim() : null,
      price_pesewas,
      Number.isInteger(stock_quantity) ? stock_quantity : 0
    );

  res.status(201).json({ id: Number(result.lastInsertRowid) });
});

module.exports = router;