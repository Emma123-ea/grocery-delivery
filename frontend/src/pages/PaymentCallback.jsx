import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../useAuth'
import { apiRequest } from '../api'

export default function PaymentCallback() {
  const { user, token, logout } = useAuth()
  const [params] = useSearchParams()
  const reference = params.get('reference') || params.get('trxref')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !reference) return

    apiRequest(`/api/payments/verify/${encodeURIComponent(reference)}`, { token })
      .then(setResult)
      .catch((err) => {
        if (err.status === 401) {
          logout()
          return
        }
        setError(err.message)
      })
  }, [token, reference, logout])

  if (!reference) {
    return <p className="message error">No payment reference was found.</p>
  }
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: `/payment/callback?reference=${encodeURIComponent(reference)}` }}
        replace
      />
    )
  }

  return (
    <div>
      <h1>Payment</h1>

      {error && (
        <>
          <p className="message error">{error}</p>
          <Link to="/orders" className="btn btn-primary">
            Go to my orders
          </Link>
        </>
      )}

      {!error && !result && <p className="message">Confirming your payment...</p>}

      {result && result.status === 'paid' && (
        <>
          <p className="banner">Payment received for order #{result.order_id}.</p>
          <Link to="/orders" className="btn btn-primary">
            View my orders
          </Link>
        </>
      )}

      {result && result.status === 'pending' && (
        <>
          <p className="message">
            Your payment is still being processed. Refresh this page in a moment, or check your
            orders.
          </p>
          <Link to="/orders" className="btn btn-secondary">
            Go to my orders
          </Link>
        </>
      )}

      {result && result.status === 'failed' && (
        <>
          <p className="message error">
            The payment was not completed. You can try again from your orders.
          </p>
          <Link to="/orders" className="btn btn-primary">
            Go to my orders
          </Link>
        </>
      )}
    </div>
  )
}