import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Products from './pages/Products'
import Login from './pages/Login'
import Register from './pages/Register'

export default function App() {
  return (
    <>
      <Header />
      <main className="page">
        <Routes>
          <Route path="/" element={<Products />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<p className="message">Page not found.</p>} />
        </Routes>
      </main>
    </>
  )
}