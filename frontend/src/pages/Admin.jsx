import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../useAuth'
import AdminOrders from '../components/AdminOrders'
import AdminProducts from '../components/AdminProducts'

export default function Admin() {
  const { user } = useAuth()
  const [tab, setTab] = useState('orders')

  if (!user) {
    return <Navigate to="/login" state={{ from: '/admin' }} replace />
  }
  if (user.role !== 'admin') {
    return <p className="message error">This page is for administrators only.</p>
  }

  return (
    <div>
      <h1>Admin</h1>
      <div className="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab === 'orders'}
          onClick={() => setTab('orders')}
        >
          Orders
        </button>
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab === 'products'}
          onClick={() => setTab('products')}
        >
          Products
        </button>
      </div>

      {tab === 'orders' ? <AdminOrders /> : <AdminProducts />}
    </div>
  )
}