const express = require('express');
const { query } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const { branch_id, category } = req.query;
  let sql = 'SELECT * FROM products WHERE is_available = 1';
  const params = [];

  if (branch_id) {
    const id = Number(branch_id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid branch' });
    }
    params.push(id);
    sql += ` AND branch_id = $${params.length}`;
  }
  if (category) {
    params.push(String(category));
    sql += ` AND category = $${params.length}`;
  }

  sql += ' ORDER BY name';

  try {
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Loading products failed:', err);
    res.status(500).json({ error: 'Could not load products' });
  }
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: 'Product not found' });
  }

  try {
    const result = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Loading product failed:', err);
    res.status(500).json({ error: 'Could not load the product' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { branch_id, name, description, category, price_pesewas, stock_quantity } = req.body || {};

  const cleanName = String(name || '').trim();
  const branchId = Number(branch_id);

  if (!branch_id || !cleanName || price_pesewas === undefined) {
    return res.status(400).json({ error: 'branch_id, name and price_pesewas are required' });
  }
  if (!Number.isInteger(branchId)) {
    return res.status(400).json({ error: 'That branch does not exist' });
  }
  if (cleanName.length > 120) {
    return res.status(400).json({ error: 'Enter a product name of up to 120 characters' });
  }
  if (!Number.isInteger(price_pesewas) || price_pesewas < 0) {
    return res.status(400).json({ error: 'price_pesewas must be a whole number of pesewas' });
  }
  if (stock_quantity !== undefined && (!Number.isInteger(stock_quantity) || stock_quantity < 0)) {
    return res.status(400).json({ error: 'Stock must be a whole number' });
  }

  try {
    const branch = await query('SELECT id FROM branches WHERE id = $1', [branchId]);
    if (branch.rows.length === 0) {
      return res.status(400).json({ error: 'That branch does not exist' });
    }

    const result = await query(
      `INSERT INTO products (branch_id, name, description, category, price_pesewas, stock_quantity)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        branchId,
        cleanName,
        description ? String(description).trim() : null,
        category ? String(category).trim() : null,
        price_pesewas,
        stock_quantity === undefined ? 0 : stock_quantity,
      ]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Adding product failed:', err);
    res.status(500).json({ error: 'Could not add the product' });
  }
});

module.exports = router;