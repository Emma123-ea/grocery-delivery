import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../useAuth'
import { apiRequest } from '../api'
import { formatPrice } from '../formatPrice'

function label(value) {
  const text = value.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function formatDate(stamp) {
  const date = new Date(`${stamp.replace(' ', 'T')}Z`)
  return date.toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function Orders() {
  const { user, token, logout } = useAuth()
  const location = useLocation()
  const placedId = location.state && location.state.placedId
  const payError = location.state && location.state.payError
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payingId, setPayingId] = useState(null)
  const [payErrors, setPayErrors] = useState({})

  useEffect(() => {
    if (!token) return

    apiRequest('/api/orders', { token })
      .then((data) => {
        setOrders(data)
        setLoading(false)
      })
      .catch((err) => {
        if (err.status === 401) {
          logout()
          return
        }
        setError(err.message)
        setLoading(false)
      })
  }, [token, logout])

  async function handlePay(orderId) {
    setPayErrors((prev) => ({ ...prev, [orderId]: '' }))
    setPayingId(orderId)
    try {
      const data = await apiRequest('/api/payments/initialize', {
        method: 'POST',
        token,
        body: { order_id: orderId },
      })
      window.location.assign(data.authorization_url)
    } catch (err) {
      if (err.status === 401) {
        logout()
        return
      }
      setPayErrors((prev) => ({ ...prev, [orderId]: err.message }))
      setPayingId(null)
    }
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: '/orders' }} replace />
  }

  return (
    <div>
      <h1>My orders</h1>

      {placedId && !payError && <p className="banner">Order #{placedId} was placed.</p>}
      {placedId && payError && (
        <p className="banner">
          Order #{placedId} was placed, but the payment could not be started. Use Pay now below.
        </p>
      )}
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

            {o.payment_status === 'unpaid' && o.status !== 'cancelled' && (
              <div className="order-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={payingId === o.id}
                  onClick={() => handlePay(o.id)}
                >
                  {payingId === o.id ? 'Please wait...' : 'Pay now'}
                </button>
              </div>
            )}
            {payErrors[o.id] && <p className="message error">{payErrors[o.id]}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}