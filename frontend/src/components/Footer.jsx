import { Link } from 'react-router-dom'
import { siteInfo } from '../siteInfo'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>
          &copy; {new Date().getFullYear()} {siteInfo.name}
        </p>
        <nav className="footer-nav">
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/terms">Terms and conditions</Link>
        </nav>
      </div>
    </footer>
  )
}