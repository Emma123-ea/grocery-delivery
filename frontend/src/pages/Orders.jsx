import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../useAuth'
import { formatPrice } from '../formatPrice'

function label(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatDate(stamp) {
  const date = new Date(`${stamp.replace(' ', 'T')}Z`)
  return date.toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function Orders() {
  const { user, token, logout } = useAuth()
  const location = useLocation()
  const placedId = location.state && location.state.placedId
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return

    fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.status === 401) {
          logout()
          return null
        }
        if (!res.ok) throw new Error('Could not load your orders')
        return res.json()
      })
      .then((data) => {
        if (data) setOrders(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [token, logout])

  if (!user) {
    return <Navigate to="/login" state={{ from: '/orders' }} replace />
  }

  return (
    <div>
      <h1>My orders</h1>

      {placedId && <p className="banner">Order #{placedId} was placed.</p>}
      {error && <p className="message error">{error}</p>}
      {loading && !error && <p className="message">Loading your orders...</p>}
      {!loading && !error && orders.length === 0 && (
        <p className="message">
          You have not placed any orders yet. <Link to="/">Browse products</Link>
        </p>
      )}

      <ul className="order-list">
        {orders.map((o) => (
          <li key={o.id} className="order-card">
            <div className="order-head">
              <h2>Order #{o.id}</h2>
              <p className="order-date">{formatDate(o.created_at)}</p>
            </div>
            <p className="order-meta">
              {o.branch_name}. Status: {label(o.status)}. Payment: {label(o.payment_status)}.
            </p>

            <ul className="summary-list">
              {o.items.map((it) => (
                <li key={`${o.id}-${it.product_id}`} className="summary-row">
                  <span>
                    {it.quantity} x {it.product_name}
                  </span>
                  <span>{formatPrice(it.line_total_pesewas)}</span>
                </li>
              ))}
            </ul>

            <p className="order-meta">Deliver to: {o.delivery_address}</p>
            <p className="cart-total">Total: {formatPrice(o.total_pesewas)}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}