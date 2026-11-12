const express = require('express');
const { query, withTransaction } = require('../db');
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

async function withItems(orders) {
  if (orders.length === 0) return [];

  const ids = orders.map((o) => o.id);
  const items = await query(
    `SELECT order_id, product_id, product_name, quantity, line_total_pesewas
     FROM order_items WHERE order_id = ANY($1::int[]) ORDER BY id`,
    [ids]
  );

  const byOrder = new Map();
  for (const item of items.rows) {
    if (!byOrder.has(item.order_id)) byOrder.set(item.order_id, []);
    byOrder.get(item.order_id).push(item);
  }

  return orders.map((o) => ({ ...o, items: byOrder.get(o.id) || [] }));
}

router.get('/orders', async (req, res) => {
  try {
    const orders = await query(
      `SELECT o.id, o.status, o.payment_status, o.total_pesewas, o.delivery_address,
              o.delivery_phone, o.notes, o.created_at,
              b.name AS branch_name, u.name AS customer_name, u.email AS customer_email
       FROM orders o
       JOIN branches b ON b.id = o.branch_id
       JOIN users u ON u.id = o.user_id
       ORDER BY o.id DESC`
    );
    res.json(await withItems(orders.rows));
  } catch (err) {
    console.error('Loading admin orders failed:', err);
    res.status(500).json({ error: 'Could not load orders' });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  const id = Number(req.params.id);
  const status = req.body && req.body.status;

  if (!Number.isInteger(id) || !STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid order or status' });
  }

  try {
    await withTransaction(async (client) => {
      const found = await client.query('SELECT id, status FROM orders WHERE id = $1 FOR UPDATE', [id]);
      const order = found.rows[0];

      if (!order) {
        throw new AdminError(404, 'Order not found');
      }
      if (CLOSED.includes(order.status)) {
        throw new AdminError(409, 'This order is already closed and cannot be changed');
      }

      if (status === 'cancelled') {
        const items = await client.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1 ORDER BY product_id',
          [id]
        );
        for (const item of items.rows) {
          await client.query(
            'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
            [item.quantity, item.product_id]
          );
        }
      }

      await client.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);
    });

    res.json({ id, status });
  } catch (err) {
    if (err instanceof AdminError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Status update failed:', err);
    res.status(500).json({ error: 'Could not update the order' });
  }
});

router.get('/products', async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, b.name AS branch_name
       FROM products p
       JOIN branches b ON b.id = p.branch_id
       ORDER BY p.id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Loading admin products failed:', err);
    res.status(500).json({ error: 'Could not load products' });
  }
});

router.patch('/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: 'Product not found' });
  }

  try {
    const found = await query('SELECT * FROM products WHERE id = $1', [id]);
    const product = found.rows[0];

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

    await query(
      `UPDATE products
       SET name = $1, description = $2, category = $3, price_pesewas = $4,
           stock_quantity = $5, is_available = $6
       WHERE id = $7`,
      [name, description, category, price, stock, available, id]
    );

    const updated = await query(
      `SELECT p.*, b.name AS branch_name
       FROM products p
       JOIN branches b ON b.id = p.branch_id
       WHERE p.id = $1`,
      [id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Updating product failed:', err);
    res.status(500).json({ error: 'Could not update the product' });
  }
});

router.get('/branches', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, address, phone, is_active FROM branches ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Loading admin branches failed:', err);
    res.status(500).json({ error: 'Could not load branches' });
  }
});

router.patch('/branches/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: 'Branch not found' });
  }

  try {
    const found = await query('SELECT * FROM branches WHERE id = $1', [id]);
    const branch = found.rows[0];

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    const body = req.body || {};
    const name = body.name !== undefined ? String(body.name).trim() : branch.name;
    const address = body.address !== undefined ? String(body.address).trim() : branch.address;
    const phone = body.phone !== undefined ? String(body.phone).trim() || null : branch.phone;

    if (!name || name.length > 120) {
      return res.status(400).json({ error: 'Enter a branch name of up to 120 characters' });
    }
    if (!address || address.length > 300) {
      return res.status(400).json({ error: 'Enter an address of up to 300 characters' });
    }
    if (phone && phone.length > 30) {
      return res.status(400).json({ error: 'Phone number is too long' });
    }

    const updated = await query(
      `UPDATE branches SET name = $1, address = $2, phone = $3 WHERE id = $4
       RETURNING id, name, address, phone, is_active`,
      [name, address, phone, id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error('Updating branch failed:', err);
    res.status(500).json({ error: 'Could not update the branch' });
  }
});

module.exports = router;