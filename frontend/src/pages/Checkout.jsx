import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../useAuth'
import { useCart } from '../useCart'
import { apiRequest } from '../api'
import { formatPrice } from '../formatPrice'

export default function Checkout() {
  const { user, token, logout } = useAuth()
  const { items, totalPesewas, clearCart } = useCart()
  const navigate = useNavigate()
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  if (!user) {
    return <Navigate to="/login" state={{ from: '/checkout' }} replace />
  }

  if (redirecting) {
    return <p className="message">Taking you to the payment page...</p>
  }

  if (items.length === 0) {
    return (
      <div>
        <h1>Checkout</h1>
        <p className="message">Your cart is empty.</p>
        <Link to="/" className="btn btn-primary">
          Browse products
        </Link>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    let order
    try {
      order = await apiRequest('/api/orders', {
        method: 'POST',
        token,
        body: {
          items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
          delivery_address: address,
          delivery_phone: phone,
          notes,
        },
      })
    } catch (err) {
      if (err.status === 401) {
        logout()
        return
      }
      setError(err.message)
      setSubmitting(false)
      return
    }

    setRedirecting(true)
    clearCart()

    try {
      const payment = await apiRequest('/api/payments/initialize', {
        method: 'POST',
        token,
        body: { order_id: order.id },
      })
      window.location.assign(payment.authorization_url)
    } catch {
      navigate('/orders', { state: { placedId: order.id, payError: true } })
    }
  }

  return (
    <div>
      <h1>Checkout</h1>

      <div className="checkout-layout">
        <form className="auth-form checkout-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Delivery address</span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              maxLength={300}
              required
            />
          </label>
          <label className="field">
            <span>Phone number for delivery</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />
          </label>
          <label className="field">
            <span>Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </label>
          <p className="order-meta">You will be taken to Paystack to pay.</p>
          {error && <p className="message error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Placing order...' : `Place order and pay (${formatPrice(totalPesewas)})`}
          </button>
        </form>

        <section className="order-summary">
          <h2>Order summary</h2>
          <ul className="summary-list">
            {items.map((item) => (
              <li key={item.id} className="summary-row">
                <span>
                  {item.quantity} x {item.name}
                </span>
                <span>{formatPrice(item.price_pesewas * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="cart-total">Total: {formatPrice(totalPesewas)}</p>
          <Link to="/cart">Edit cart</Link>
        </section>
      </div>
    </div>
  )
}