import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../useAuth'
import { useCart } from '../useCart'
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

  if (!user) {
    return <Navigate to="/login" state={{ from: '/checkout' }} replace />
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
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
          delivery_address: address,
          delivery_phone: phone,
          notes,
        }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 401) {
        logout()
        return
      }
      if (!res.ok) {
        throw new Error(data.error || 'Could not place your order. Please try again.')
      }

      clearCart()
      navigate('/orders', { state: { placedId: data.id } })
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
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
          {error && <p className="message error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Placing order...' : `Place order (${formatPrice(totalPesewas)})`}
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