import { useEffect, useState } from 'react'
import { useAuth } from '../useAuth'
import { apiRequest } from '../api'
import { formatPrice } from '../formatPrice'

const STATUSES = [
  ['pending', 'Pending'],
  ['confirmed', 'Confirmed'],
  ['preparing', 'Preparing'],
  ['out_for_delivery', 'Out for delivery'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'],
]

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatDate(stamp) {
  const date = new Date(`${stamp.replace(' ', 'T')}Z`)
  return date.toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function AdminOrders() {
  const { token, logout } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rowErrors, setRowErrors] = useState({})

  useEffect(() => {
    apiRequest('/api/admin/orders', { token })
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

  async function changeStatus(order, status) {
    if (status === order.status) return
    if (
      status === 'cancelled' &&
      !window.confirm(`Cancel order #${order.id}? The items go back into stock.`)
    ) {
      return
    }

    setRowErrors((prev) => ({ ...prev, [order.id]: '' }))
    try {
      await apiRequest(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        token,
        body: { status },
      })
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status } : o)))
    } catch (err) {
      if (err.status === 401) {
        logout()
        return
      }
      setRowErrors((prev) => ({ ...prev, [order.id]: err.message }))
    }
  }

  return (
    <div>
      <h2 className="admin-section-title">Orders</h2>

      {error && <p className="message error">{error}</p>}
      {loading && !error && <p className="message">Loading orders...</p>}
      {!loading && !error && orders.length === 0 && (
        <p className="message">No orders have been placed yet.</p>
      )}

      <ul className="order-list">
        {orders.map((o) => {
          const closed = o.status === 'delivered' || o.status === 'cancelled'

          return (
            <li key={o.id} className="order-card">
              <div className="order-head">
                <h2>Order #{o.id}</h2>
                <p className="order-date">{formatDate(o.created_at)}</p>
              </div>
              <p className="order-meta">
                {o.customer_name} ({o.customer_email}). Phone: {o.delivery_phone}. Branch:{' '}
                {o.branch_name}.
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
              {o.notes && <p className="order-meta">Notes: {o.notes}</p>}
              <p className="cart-total">
                Total: {formatPrice(o.total_pesewas)} ({capitalize(o.payment_status)})
              </p>

              <div className="order-actions">
                <label className="field">
                  <span>Status</span>
                  <select
                    value={o.status}
                    disabled={closed}
                    onChange={(e) => changeStatus(o, e.target.value)}
                  >
                    {STATUSES.map(([value, text]) => (
                      <option key={value} value={value}>
                        {text}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {rowErrors[o.id] && <p className="message error">{rowErrors[o.id]}</p>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}