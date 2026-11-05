import { useEffect, useState } from 'react'
import { useCart } from '../useCart'
import { formatPrice } from '../formatPrice'

export default function Products() {
  const { items, addItem } = useCart()
  const [branches, setBranches] = useState([])
  const [products, setProducts] = useState([])
  const [branchId, setBranchId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notices, setNotices] = useState({})

  useEffect(() => {
    fetch('/api/branches')
      .then((res) => {
        if (!res.ok) throw new Error('Could not load branches')
        return res.json()
      })
      .then(setBranches)
      .catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    const query = branchId ? `?branch_id=${branchId}` : ''

    fetch(`/api/products${query}`)
      .then((res) => {
        if (!res.ok) throw new Error('Could not load products')
        return res.json()
      })
      .then((data) => {
        setProducts(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [branchId])

  function handleBranchChange(e) {
    setError('')
    setLoading(true)
    setBranchId(e.target.value)
  }

  function handleAdd(product) {
    const result = addItem(product)
    setNotices((prev) => ({ ...prev, [product.id]: result.ok ? '' : result.error }))
  }

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <label className="filter">
          <span>Branch</span>
          <select value={branchId} onChange={handleBranchChange}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="message error">{error}</p>}
      {loading && !error && <p className="message">Loading products...</p>}
      {!loading && !error && products.length === 0 && (
        <p className="message">No products found for this branch.</p>
      )}

      <ul className="product-grid">
        {products.map((p) => {
          const inCart = items.find((i) => i.id === p.id)
          const soldOut = p.stock_quantity <= 0

          return (
            <li key={p.id} className="product-card">
              {p.category && <p className="product-category">{p.category}</p>}
              <h2>{p.name}</h2>
              {p.description && <p className="product-description">{p.description}</p>}
              <p className="product-price">{formatPrice(p.price_pesewas)}</p>
              <p className={soldOut ? 'stock out' : 'stock in'}>
                {soldOut ? 'Out of stock' : `${p.stock_quantity} in stock`}
              </p>

              <div className="product-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleAdd(p)}
                  disabled={soldOut}
                >
                  Add to cart
                </button>
              </div>

              {inCart && <p className="in-cart">{inCart.quantity} in your cart</p>}
              {notices[p.id] && <p className="card-notice">{notices[p.id]}</p>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}