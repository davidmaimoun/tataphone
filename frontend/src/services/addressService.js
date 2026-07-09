const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

const addressService = {
  // Cherche des suggestions d'adresses en Israël (rue/ville) via le proxy backend.
  // signal (AbortController) permet d'annuler les requêtes obsolètes pendant la frappe.
  async autocomplete(query, { signal } = {}) {
    if (!query || query.trim().length < 2) return []
    try {
      const qs = new URLSearchParams({ q: query.trim() }).toString()
      const res = await fetch(`${API}/address/autocomplete?${qs}`, { signal })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      return data.results || []
    } catch (err) {
      if (err.name !== 'AbortError') console.error('addressService.autocomplete error:', err.message)
      return []
    }
  },
}

export default addressService