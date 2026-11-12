const express = require('express');
const { query, withTransaction } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const MAX_QUANTITY = 99;
const MAX_DISTINCT_ITEMS = 50;
const PHONE_PATTERN = /^[+\d][\d\s-]{6,19}$/;

class OrderError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function withItems(orders) {
  if (orders.length === 0) return [];

  const ids = orders.map((o) => o.id);
  const items = await query(
    `SELECT order_id, product_id, product_name, unit_price_pesewas, quantity, line_total_pesewas
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

router.post('/', requireAuth, async (req, res) => {
  const { items, delivery_address, delivery_phone, notes } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty' });
  }

  const address = String(delivery_address || '').trim();
  const phone = String(delivery_phone || '').trim();
  const cleanNotes = notes ? String(notes).trim().slice(0, 500) : null;

  if (address.length < 5 || address.length > 300) {
    return res.status(400).json({ error: 'Enter a full delivery address' });
  }
  if (!PHONE_PATTERN.test(phone)) {
    return res.status(400).json({ error: 'Enter a valid phone number' });
  }

  const wanted = new Map();
  for (const item of items) {
    const productId = Number(item && item.product_id);
    const quantity = Number(item && item.quantity);
    if (
      !Number.isInteger(productId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY
    ) {
      return res.status(400).json({ error: 'One of the items in your cart is invalid' });
    }
    wanted.set(productId, (wanted.get(productId) || 0) + quantity);
  }
  if (wanted.size > MAX_DISTINCT_ITEMS) {
    return res.status(400).json({ error: 'Too many different items in one order' });
  }

  const productIds = [...wanted.keys()].sort((a, b) => a - b);

  try {
    const result = await withTransaction(async (client) => {
      const lines = [];
      let branchId = null;

      for (const productId of productIds) {
        const quantity = wanted.get(productId);
        const found = await client.query(
          `SELECT id, branch_id, name, price_pesewas, stock_quantity, is_available
           FROM products WHERE id = $1`,
          [productId]
        );
        const product = found.rows[0];

        if (!product || !product.is_available) {
          throw new OrderError(
            409,
            'One of the items in your cart is no longer available. Remove it and try again.'
          );
        }
        if (branchId === null) {
          branchId = product.branch_id;
        } else if (branchId !== product.branch_id) {
          throw new OrderError(400, 'All items in an order must come from the same branch');
        }
        if (product.stock_quantity < quantity) {
          throw new OrderError(
            409,
            product.stock_quantity === 0
              ? `${product.name} is out of stock`
              : `Only ${product.stock_quantity} of ${product.name} available`
          );
        }

        lines.push({ product, quantity });
      }

      const total = lines.reduce((sum, l) => sum + l.product.price_pesewas * l.quantity, 0);

      const inserted = await client.query(
        `INSERT INTO orders (user_id, branch_id, delivery_address, delivery_phone, notes, total_pesewas)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [req.user.id, branchId, address, phone, cleanNotes, total]
      );
      const orderId = inserted.rows[0].id;

      for (const { product, quantity } of lines) {
        await client.query(
          `INSERT INTO order_items
             (order_id, product_id, product_name, unit_price_pesewas, quantity, line_total_pesewas)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, product.id, product.name, product.price_pesewas, quantity, product.price_pesewas * quantity]
        );

        const updated = await client.query(
          `UPDATE products SET stock_quantity = stock_quantity - $1
           WHERE id = $2 AND stock_quantity >= $1`,
          [quantity, product.id]
        );
        if (updated.rowCount !== 1) {
          throw new OrderError(409, `${product.name} just ran out of stock`);
        }
      }

      return { id: orderId, total_pesewas: total, status: 'pending' };
    });

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof OrderError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Order failed:', err);
    res.status(500).json({ error: 'Could not place your order. Please try again.' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const orders = await query(
      `SELECT o.id, o.status, o.payment_status, o.total_pesewas, o.delivery_address,
              o.delivery_phone, o.notes, o.created_at, b.name AS branch_name
       FROM orders o
       JOIN branches b ON b.id = o.branch_id
       WHERE o.user_id = $1
       ORDER BY o.id DESC`,
      [req.user.id]
    );
    res.json(await withItems(orders.rows));
  } catch (err) {
    console.error('Loading orders failed:', err);
    res.status(500).json({ error: 'Could not load your orders' });
  }
});

module.exports = router;