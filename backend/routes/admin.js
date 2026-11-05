const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

const STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
];
const CLOSED = ['delivered', 'cancelled'];

class AdminError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

router.get('/orders', (req, res) => {
  const orders = db
    .prepare(
      `SELECT o.id, o.status, o.payment_status, o.total_pesewas, o.delivery_address,
              o.delivery_phone, o.notes, o.created_at,
              b.name AS branch_name, u.name AS customer_name, u.email AS customer_email
       FROM orders o
       JOIN branches b ON b.id = o.branch_id
       JOIN users u ON u.id = o.user_id
       ORDER BY o.id DESC`
    )
    .all();

  const findItems = db.prepare(
    `SELECT product_id, product_name, quantity, line_total_pesewas
     FROM order_items WHERE order_id = ? ORDER BY id`
  );

  res.json(orders.map((o) => ({ ...o, items: findItems.all(o.id) })));
});

router.patch('/orders/:id/status', (req, res) => {
  const id = Number(req.params.id);
  const status = req.body && req.body.status;

  if (!Number.isInteger(id) || !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid order or status' });
  }

  try {
    db.exec('BEGIN');

    const order = db.prepare('SELECT id, status FROM orders WHERE id = ?').get(id);
    if (!order) {
      throw new AdminError(404, 'Order not found');
    }
    if (CLOSED.includes(order.status)) {
      throw new AdminError(409, 'This order is already closed and cannot be changed');
    }

    if (status === 'cancelled') {
      const items = db
        .prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?')
        .all(id);
      const restock = db.prepare(
        'UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?'
      );
      for (const item of items) {
        restock.run(item.quantity, item.product_id);
      }
    }

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    db.exec('COMMIT');
    res.json({ id, status });
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* no open transaction to roll back */
    }
    if (err instanceof AdminError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Status update failed:', err);
    res.status(500).json({ error: 'Could not update the order' });
  }
});

router.get('/products', (req, res) => {
  const products = db
    .prepare(
      `SELECT p.*, b.name AS branch_name
       FROM products p
       JOIN branches b ON b.id = p.branch_id
       ORDER BY p.id DESC`
    )
    .all();
  res.json(products);
});

router.patch('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const product = Number.isInteger(id)
    ? db.prepare('SELECT * FROM products WHERE id = ?').get(id)
    : undefined;

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const body = req.body || {};
  const name = body.name !== undefined ? String(body.name).trim() : product.name;
  const description =
    body.description !== undefined ? String(body.description).trim() || null : product.description;
  const category =
    body.category !== undefined ? String(body.category).trim() || null : product.category;
  const price = body.price_pesewas !== undefined ? body.price_pesewas : product.price_pesewas;
  const stock = body.stock_quantity !== undefined ? body.stock_quantity : product.stock_quantity;
  const available =
    body.is_available !== undefined
      ? body.is_available === true || body.is_available === 1
        ? 1
        : 0
      : product.is_available;

  if (!name || name.length > 120) {
    return res.status(400).json({ error: 'Enter a product name of up to 120 characters' });
  }
  if (!Number.isInteger(price) || price < 0) {
    return res.status(400).json({ error: 'Price must be a whole number of pesewas' });
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return res.status(400).json({ error: 'Stock must be a whole number' });
  }

  db.prepare(
    `UPDATE products
     SET name = ?, description = ?, category = ?, price_pesewas = ?, stock_quantity = ?, is_available = ?
     WHERE id = ?`
  ).run(name, description, category, price, stock, available, id);

  const updated = db
    .prepare(
      `SELECT p.*, b.name AS branch_name
       FROM products p
       JOIN branches b ON b.id = p.branch_id
       WHERE p.id = ?`
    )
    .get(id);

  res.json(updated);
});

module.exports = router;