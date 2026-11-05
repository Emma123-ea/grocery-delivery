import { Link } from 'react-router-dom'
import { useAuth } from '../useAuth'

export default function Header() {
  const { user, logout } = useAuth()

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="brand">
          Grocery Delivery
        </Link>
        <nav className="nav">
          {user ? (
            <>
              <span className="nav-user">{user.name}</span>
              <button type="button" className="btn btn-secondary" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Log in
              </Link>
              <Link to="/register" className="btn btn-primary">
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}