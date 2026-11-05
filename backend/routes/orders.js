const express = require('express');
const db = require('../db');
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

router.post('/', requireAuth, (req, res) => {
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

  try {
    db.exec('BEGIN');

    const findProduct = db.prepare(
      'SELECT id, branch_id, name, price_pesewas, stock_quantity, is_available FROM products WHERE id = ?'
    );

    const lines = [];
    let branchId = null;

    for (const [productId, quantity] of wanted) {
      const product = findProduct.get(productId);

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

    const orderResult = db
      .prepare(
        `INSERT INTO orders (user_id, branch_id, delivery_address, delivery_phone, notes, total_pesewas)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(req.user.id, branchId, address, phone, cleanNotes, total);
    const orderId = Number(orderResult.lastInsertRowid);

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, unit_price_pesewas, quantity, line_total_pesewas)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const reduceStock = db.prepare(
      'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?'
    );

    for (const { product, quantity } of lines) {
      insertItem.run(
        orderId,
        product.id,
        product.name,
        product.price_pesewas,
        quantity,
        product.price_pesewas * quantity
      );
      const updated = reduceStock.run(quantity, product.id, quantity);
      if (Number(updated.changes) !== 1) {
        throw new OrderError(409, `${product.name} just ran out of stock`);
      }
    }

    db.exec('COMMIT');
    res.status(201).json({ id: orderId, total_pesewas: total, status: 'pending' });
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* no open transaction to roll back */
    }
    if (err instanceof OrderError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('Order failed:', err);
    res.status(500).json({ error: 'Could not place your order. Please try again.' });
  }
});

router.get('/', requireAuth, (req, res) => {
  const orders = db
    .prepare(
      `SELECT o.id, o.status, o.payment_status, o.total_pesewas, o.delivery_address,
              o.delivery_phone, o.notes, o.created_at, b.name AS branch_name
       FROM orders o
       JOIN branches b ON b.id = o.branch_id
       WHERE o.user_id = ?
       ORDER BY o.id DESC`
    )
    .all(req.user.id);

  const findItems = db.prepare(
    `SELECT product_id, product_name, unit_price_pesewas, quantity, line_total_pesewas
     FROM order_items WHERE order_id = ? ORDER BY id`
  );

  res.json(orders.map((o) => ({ ...o, items: findItems.all(o.id) })));
});

module.exports = router;