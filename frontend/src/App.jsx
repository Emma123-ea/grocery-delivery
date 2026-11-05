import { useEffect, useState } from 'react'

function formatPrice(pesewas) {
  const cedis = (pesewas / 100).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `GH₵ ${cedis}`
}

function App() {
  const [branches, setBranches] = useState([])
  const [products, setProducts] = useState([])
  const [branchId, setBranchId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    setLoading(true)
    setError('')
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

  return (
    <main className="page">
      <header className="page-header">
        <h1>Products</h1>
        <label className="filter">
          <span>Branch</span>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      {error && <p className="message error">{error}</p>}
      {loading && !error && <p className="message">Loading products...</p>}
      {!loading && !error && products.length === 0 && (
        <p className="message">No products found for this branch.</p>
      )}

      <ul className="product-grid">
        {products.map((p) => (
          <li key={p.id} className="product-card">
            {p.category && <p className="product-category">{p.category}</p>}
            <h2>{p.name}</h2>
            {p.description && <p className="product-description">{p.description}</p>}
            <p className="product-price">{formatPrice(p.price_pesewas)}</p>
            <p className={p.stock_quantity > 0 ? 'stock in' : 'stock out'}>
              {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of stock'}
            </p>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App