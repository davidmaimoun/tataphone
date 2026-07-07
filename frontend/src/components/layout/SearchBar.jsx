'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2 } from 'lucide-react'
import productService from '@/services/productService'

export default function SearchBar({ compact = false }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const boxRef = useRef(null)
  const timerRef = useRef(null)

  // Ferme au clic extérieur
  useEffect(() => {
    const handler = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Recherche des suggestions (debounce 250ms)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!q.trim() || q.trim().length < 2) { setSuggestions([]); setOpen(false); return }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const data = await productService.getAll({ q: q.trim(), limit: 6 })
        setSuggestions(data.products || [])
        setOpen(true)
        setActive(-1)
      } catch { setSuggestions([]) }
      finally { setLoading(false) }
    }, 250)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [q])

  const goToSearch = (term) => {
    const query = (term || q).trim()
    if (!query) return
    setOpen(false)
    setQ('')
    router.push(`/products?q=${encodeURIComponent(query)}`)
  }

  const goToProduct = (id) => {
    setOpen(false)
    setQ('')
    router.push(`/products/${id}`)
  }

  const onKeyDown = (e) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter') goToSearch()
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, -1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= 0 && suggestions[active]) goToProduct(suggestions[active]._id)
      else goToSearch()
    }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => { if (suggestions.length) setOpen(true) }}
          dir="rtl"
          placeholder="חיפוש מוצרים..."
          className={`w-full bg-slate-50 border border-slate-200 rounded-full pr-10 pl-9 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-primary-400 focus:bg-white transition-all ${compact ? 'h-9 text-[13px]' : 'h-10 text-[14px]'}`}
        />
        {loading ? (
          <Loader2 className="absolute left-3 w-4 h-4 text-slate-400 animate-spin" />
        ) : q ? (
          <button onClick={() => { setQ(''); setSuggestions([]); setOpen(false) }} className="absolute left-3 w-4 h-4 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
          </button>
        ) : null}
      </div>

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-50 max-h-[400px] overflow-y-auto">
          {suggestions.map((p, i) => (
            <button
              key={p._id}
              onClick={() => goToProduct(p._id)}
              onMouseEnter={() => setActive(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors ${active === i ? 'bg-primary-50' : 'hover:bg-slate-50'}`}
            >
              {p.images?.[0] ? (
                <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-slate-100" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-lg">📱</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 truncate">{p.name}</p>
                <p className="text-[12px] text-primary-600 font-bold">₪{p.price?.toLocaleString()}</p>
              </div>
            </button>
          ))}
          <button
            onClick={() => goToSearch()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[13px] font-bold text-primary-600 bg-slate-50 hover:bg-primary-50 transition-colors border-t border-slate-100"
          >
            <Search className="w-4 h-4" />
            הצג את כל התוצאות עבור "{q}"
          </button>
        </div>
      )}
    </div>
  )
}