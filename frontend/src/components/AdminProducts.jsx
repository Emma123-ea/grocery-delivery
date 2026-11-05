import { useEffect, useState } from 'react'
import { useAuth } from '../useAuth'
import { apiRequest } from '../api'
import { formatPrice } from '../formatPrice'

function toPesewas(value) {
  const number = Number(value)
  if (String(value).trim() === '' || !Number.isFinite(number) || number < 0) return null
  return Math.round(number * 100)
}

function toWholeNumber(value) {
  const number = Number(value)
  if (String(value).trim() === '' || !Number.isInteger(number) || number < 0) return null
  return number
}

function ProductRow({ product, token, onSaved, onAuthError }) {
  const [price, setPrice] = useState((product.price_pesewas / 100).toFixed(2))
  const [stock, setStock] = useState(String(product.stock_quantity))
  const [note, setNote] = useState({ text: '', error: false })
  const [busy, setBusy] = useState(false)

  async function save(changes) {
    setNote({ text: '', error: false })
    setBusy(true)
    try {
      const updated = await apiRequest(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        token,
        body: changes,
      })
      onSaved(updated)
      setPrice((updated.price_pesewas / 100).toFixed(2))
      setStock(String(updated.stock_quantity))
      setNote({ text: 'Saved', error: false })
    } catch (err) {
      if (err.status === 401) {
        onAuthError()
        return
      }
      setNote({ text: err.message, error: true })
    }
    setBusy(false)
  }

  function handleSave(e) {
    e.preventDefault()
    const price_pesewas = toPesewas(price)
    const stock_quantity = toWholeNumber(stock)

    if (price_pesewas === null) {
      setNote({ text: 'Enter a valid price', error: true })
      return
    }
    if (stock_quantity === null) {
      setNote({ text: 'Stock must be a whole number', error: true })
      return
    }
    save({ price_pesewas, stock_quantity })
  }

  return (
    <li className="admin-product">
      <div>
        <p className="admin-product-name">{product.name}</p>
        <p className="order-meta">
          {product.branch_name}
          {product.category ? `. ${product.category}` : ''}. Current price:{' '}
          {formatPrice(product.price_pesewas)}. {product.is_available ? 'Visible in the shop' : 'Hidden from the shop'}.
        </p>
        {note.text && <p className={note.error ? 'note error' : 'note'}>{note.text}</p>}
      </div>

      <form className="admin-product-form" onSubmit={handleSave}>
        <label className="field">
          <span>Price (GH₵)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Stock</span>
          <input
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Save
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy}
          onClick={() => save({ is_available: !product.is_available })}
        >
          {product.is_available ? 'Hide' : 'Show'}
        </button>
      </form>
    </li>
  )
}

export default function AdminProducts() {
  const { token, logout } = useAuth()
  const [products, setProducts] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [branchId, setBranchId] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [formError, setFormError] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    Promise.all([apiRequest('/api/admin/products', { token }), apiRequest('/api/branches')])
      .then(([productList, branchList]) => {
        setProducts(productList)
        setBranches(branchList)
        if (branchList.length > 0) setBranchId(String(branchList[0].id))
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

  async function handleAdd(e) {
    e.preventDefault()
    setFormError('')

    const price_pesewas = toPesewas(price)
    const stock_quantity = toWholeNumber(stock)

    if (!branchId) {
      setFormError('Create a branch first')
      return
    }
    if (price_pesewas === null) {
      setFormError('Enter a valid price')
      return
    }
    if (stock_quantity === null) {
      setFormError('Stock must be a whole number')
      return
    }

    setAdding(true)
    try {
      await apiRequest('/api/products', {
        method: 'POST',
        token,
        body: {
          branch_id: Number(branchId),
          name,
          category,
          description,
          price_pesewas,
          stock_quantity,
        },
      })
      const fresh = await apiRequest('/api/admin/products', { token })
      setProducts(fresh)
      setName('')
      setCategory('')
      setDescription('')
      setPrice('')
      setStock('')
    } catch (err) {
      if (err.status === 401) {
        logout()
        return
      }
      setFormError(err.message)
    }
    setAdding(false)
  }

  function handleSaved(updated) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  return (
    <div>
      <h2 className="admin-section-title">Add a product</h2>

      <form className="admin-form" onSubmit={handleAdd}>
        <label className="field">
          <span>Branch</span>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span>Category</span>
          <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} />
        </label>
        <label className="field">
          <span>Price (GH₵)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Stock</span>
          <input
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
          />
        </label>
        <label className="field wide">
          <span>Description (optional)</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {formError && <p className="message error wide">{formError}</p>}
        <div className="wide">
          <button type="submit" className="btn btn-primary" disabled={adding}>
            {adding ? 'Adding...' : 'Add product'}
          </button>
        </div>
      </form>

      <h2 className="admin-section-title">All products</h2>

      {error && <p className="message error">{error}</p>}
      {loading && !error && <p className="message">Loading products...</p>}
      {!loading && !error && products.length === 0 && (
        <p className="message">No products yet. Add your first one above.</p>
      )}

      <ul className="admin-product-list">
        {products.map((p) => (
          <ProductRow
            key={p.id}
            product={p}
            token={token}
            onSaved={handleSaved}
            onAuthError={logout}
          />
        ))}
      </ul>
    </div>
  )
}