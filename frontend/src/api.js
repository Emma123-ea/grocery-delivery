export async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.')
    err.status = res.status
    throw err
  }
  return data
}