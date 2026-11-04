import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('Checking...')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('Backend not reachable'))
  }, [])

  return (
    <div>
      <h1>Grocery Delivery</h1>
      <p>Backend status: {status}</p>
    </div>
  )
}

export default App