const express = require('express');
const crypto = require('crypto');
const { query, withTransaction } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const PAYSTACK_URL = 'https://api.paystack.co';

function paystackKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  return key && key.startsWith('sk_') ? key : null;
}

async function paystackRequest(path, options = {}) {
  const res = await fetch(`${PAYSTACK_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${paystackKey()}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.status) {
    throw new Error(data.message || 'Paystack request failed');
  }
  return data.data;
}

async function markPaid(payment) {
  await withTransaction(async (client) => {
    await client.query("UPDATE orders SET payment_status = 'paid' WHERE id = $1", [
      payment.order_id,
    ]);
    await client.query("UPDATE payments SET status = 'success' WHERE id = $1", [payment.id]);
  });
}

// Asks Paystack what happened to a payment and updates the order if it was paid.
// Returns 'paid', 'failed', 'pending' or 'mismatch'.
async function checkWithPaystack(payment) {
  const data = await paystackRequest(
    `/transaction/verify/${encodeURIComponent(payment.reference)}`
  );

  if (data.status === 'success') {
    if (data.currency !== 'GHS' || data.amount !== payment.amount_pesewas) {
      console.error('Payment amount mismatch for', payment.reference);
      return 'mismatch';
    }
    await markPaid(payment);
    return 'paid';
  }

  if (['failed', 'abandoned', 'reversed'].includes(data.status)) {
    return 'failed';
  }
  return 'pending';
}

router.post('/initialize', requireAuth, async (req, res) => {
  if (!paystackKey()) {
    console.error('PAYSTACK_SECRET_KEY is missing or invalid in .env');
    return res.status(500).json({ error: 'Payments are not set up yet' });
  }

  const orderId = Number(req.body && req.body.order_id);
  if (!Number.isInteger(orderId)) {
    return res.status(400).json({ error: 'Invalid order' });
  }

  try {
    const found = await query(
      'SELECT id, status, payment_status, total_pesewas FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, req.user.id]
    );
    const order = found.rows[0];

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.payment_status === 'paid') {
      return res.status(409).json({ error: 'This order has already been paid for' });
    }
    if (order.status === 'cancelled') {
      return res.status(409).json({ error: 'This order was cancelled' });
    }

    const userResult = await query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Login required' });
    }

    // If an earlier attempt was actually paid, settle it instead of charging twice.
    const earlier = await query(
      `SELECT id, order_id, reference, amount_pesewas FROM payments
       WHERE order_id = $1 AND status = 'initiated' ORDER BY id DESC LIMIT 5`,
      [order.id]
    );

    try {
      for (const payment of earlier.rows) {
        const outcome = await checkWithPaystack(payment);
        if (outcome === 'paid') {
          return res.status(409).json({ error: 'This order has already been paid for' });
        }
      }
    } catch (err) {
      console.error('Checking earlier payment failed:', err.message);
      return res
        .status(502)
        .json({ error: 'Could not check your earlier payment. Please try again.' });
    }

    const reference = `order-${order.id}-${crypto.randomBytes(6).toString('hex')}`;
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
      const data = await paystackRequest('/transaction/initialize', {
        method: 'POST',
        body: JSON.stringify({
          email: user.email,
          amount: order.total_pesewas,
          currency: 'GHS',
          reference,
          callback_url: `${frontend}/payment/callback`,
          metadata: { order_id: order.id },
        }),
      });

      await query(
        'INSERT INTO payments (order_id, reference, amount_pesewas) VALUES ($1, $2, $3)',
        [order.id, reference, order.total_pesewas]
      );

      res.json({ authorization_url: data.authorization_url, reference });
    } catch (err) {
      console.error('Paystack initialize failed:', err.message);
      res.status(502).json({ error: 'Could not start the payment. Please try again.' });
    }
  } catch (err) {
    console.error('Starting payment failed:', err);
    res.status(500).json({ error: 'Could not start the payment. Please try again.' });
  }
});

router.get('/verify/:reference', requireAuth, async (req, res) => {
  const reference = String(req.params.reference || '');

  try {
    const found = await query(
      `SELECT p.id, p.order_id, p.reference, p.amount_pesewas, o.user_id, o.payment_status
       FROM payments p
       JOIN orders o ON o.id = p.order_id
       WHERE p.reference = $1`,
      [reference]
    );
    const payment = found.rows[0];

    if (!payment || payment.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    if (payment.payment_status === 'paid') {
      return res.json({ order_id: payment.order_id, status: 'paid' });
    }

    try {
      const outcome = await checkWithPaystack(payment);
      if (outcome === 'mismatch') {
        return res
          .status(409)
          .json({ error: 'The payment amount did not match this order. Please contact us.' });
      }
      res.json({ order_id: payment.order_id, status: outcome });
    } catch (err) {
      console.error('Paystack verify failed:', err.message);
      res.status(502).json({ error: 'Could not confirm your payment yet. Please try again.' });
    }
  } catch (err) {
    console.error('Verifying payment failed:', err);
    res.status(500).json({ error: 'Could not confirm your payment yet. Please try again.' });
  }
});

module.exports = router;