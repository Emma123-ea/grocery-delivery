import { useEffect, useState } from 'react'
import { useAuth } from '../useAuth'
import { apiRequest } from '../api'

function BranchRow({ branch, token, onSaved, onAuthError }) {
  const [name, setName] = useState(branch.name)
  const [address, setAddress] = useState(branch.address)
  const [phone, setPhone] = useState(branch.phone || '')
  const [note, setNote] = useState({ text: '', error: false })
  const [busy, setBusy] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setNote({ text: '', error: false })
    setBusy(true)
    try {
      const updated = await apiRequest(`/api/admin/branches/${branch.id}`, {
        method: 'PATCH',
        token,
        body: { name, address, phone },
      })
      onSaved(updated)
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

  return (
    <li className="admin-product">
      <form className="admin-product-form branch-form" onSubmit={handleSave}>
        <label className="field">
          <span>Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span>Address</span>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Phone</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Save
        </button>
      </form>
      {note.text && <p className={note.error ? 'note error' : 'note'}>{note.text}</p>}
    </li>
  )
}

export default function AdminBranches() {
  const { token, logout } = useAuth()
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [formError, setFormError] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    apiRequest('/api/admin/branches', { token })
      .then((data) => {
        setBranches(data)
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
    setAdding(true)
    try {
      await apiRequest('/api/branches', {
        method: 'POST',
        token,
        body: { name, address, phone },
      })
      const fresh = await apiRequest('/api/admin/branches', { token })
      setBranches(fresh)
      setName('')
      setAddress('')
      setPhone('')
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
    setBranches((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }

  return (
    <div>
      <h2 className="admin-section-title">Add a branch</h2>

      <form className="admin-form" onSubmit={handleAdd}>
        <label className="field">
          <span>Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span>Address</span>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>Phone (optional)</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        {formError && <p className="message error wide">{formError}</p>}
        <div className="wide">
          <button type="submit" className="btn btn-primary" disabled={adding}>
            {adding ? 'Adding...' : 'Add branch'}
          </button>
        </div>
      </form>

      <h2 className="admin-section-title">All branches</h2>

      {error && <p className="message error">{error}</p>}
      {loading && !error && <p className="message">Loading branches...</p>}
      {!loading && !error && branches.length === 0 && (
        <p className="message">No branches yet. Add your first one above.</p>
      )}

      <ul className="admin-product-list">
        {branches.map((b) => (
          <BranchRow
            key={b.id}
            branch={b}
            token={token}
            onSaved={handleSaved}
            onAuthError={logout}
          />
        ))}
      </ul>
    </div>
  )
}