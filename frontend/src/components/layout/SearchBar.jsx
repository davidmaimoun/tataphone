'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Loader2 } from 'lucide-react'
import productService from '@/services/productService'

// Hook de recherche partagé (desktop inline + mobile overlay)
function useSearch() {
  const [q, setQ] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!q.trim() || q.trim().length < 2) { setSuggestions([]); return }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const data = await productService.getAll({ q: q.trim(), limit: 8 })
        setSuggestions(data.products || [])
      } catch { setSuggestions([]) }
      finally { setLoading(false) }
    }, 250)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [q])

  return { q, setQ, suggestions, setSuggestions, loading }
}

// Liste de suggestions réutilisable
function SuggestionList({ suggestions, q, onProduct, onSearchAll, active = -1, onHover }) {
  return (
    <>
      {suggestions.map((p, i) => (
        <button key={p._id} onClick={() => onProduct(p._id)} onMouseEnter={() => onHover?.(i)}
          className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${active === i ? 'bg-primary-50' : 'hover:bg-slate-50'}`}>
          {p.images?.[0] ? (
            <img src={p.images[0]} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0 bg-slate-100" />
          ) : (
            <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-lg">📱</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-slate-800 truncate">{p.name}</p>
            <p className="text-[13px] text-primary-600 font-bold">₪{p.price?.toLocaleString()}</p>
          </div>
        </button>
      ))}
      <button onClick={onSearchAll} className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-[14px] font-bold text-primary-600 bg-slate-50 hover:bg-primary-50 transition-colors border-t border-slate-100">
        <Search className="w-4 h-4" />כל התוצאות עבור "{q}"
      </button>
    </>
  )
}

// ── SearchBar desktop (inline) ──
export function DesktopSearch() {
  const router = useRouter()
  const { q, setQ, suggestions, setSuggestions, loading } = useSearch()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const boxRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  useEffect(() => { setOpen(suggestions.length > 0) }, [suggestions])

  const goSearch = (term) => { const query = (term || q).trim(); if (!query) return; setOpen(false); setQ(''); router.push(`/products?q=${encodeURIComponent(query)}`) }
  const goProduct = (id) => { setOpen(false); setQ(''); router.push(`/products/${id}`) }
  const onKeyDown = (e) => {
    if (!open || !suggestions.length) { if (e.key === 'Enter') goSearch(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, -1)) }
    else if (e.key === 'Enter') { e.preventDefault(); active >= 0 && suggestions[active] ? goProduct(suggestions[active]._id) : goSearch() }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKeyDown} onFocus={() => suggestions.length && setOpen(true)}
          dir="rtl" placeholder="חיפוש"
          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-full pr-9 pl-8 text-[14px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-primary-400 focus:bg-white transition-all" />
        {loading ? <Loader2 className="absolute left-3 w-4 h-4 text-slate-400 animate-spin" />
         : q ? <button onClick={() => { setQ(''); setSuggestions([]) }} className="absolute left-3"><X className="w-4 h-4 text-slate-400 hover:text-slate-600" /></button> : null}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-[60] max-h-[70vh] overflow-y-auto">
          <SuggestionList suggestions={suggestions} q={q} onProduct={goProduct} onSearchAll={() => goSearch()} active={active} onHover={setActive} />
        </div>
      )}
    </div>
  )
}

// ── Bouton loupe mobile → drawer latéral qui glisse ──
export function MobileSearch() {
  const router = useRouter()
  const { q, setQ, suggestions, setSuggestions, loading } = useSearch()
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 250); document.body.style.overflow = 'hidden' }
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const close = () => { setOpen(false); setQ(''); setSuggestions([]) }
  const goSearch = (term) => { const query = (term || q).trim(); if (!query) return; close(); router.push(`/products?q=${encodeURIComponent(query)}`) }
  const goProduct = (id) => { close(); router.push(`/products/${id}`) }

  return (
    <>
      {/* Bouton recherche (loupe + texte) dans la navbar */}
      <button onClick={() => setOpen(true)} className="flex items-center justify-center gap-2 w-full h-9 px-4 rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:border-primary-300 transition-colors" aria-label="חיפוש">
        <Search className="w-4 h-4" />
        <span className="text-[13px] font-medium">חיפוש</span>
      </button>

      {/* Overlay sombre + drawer latéral */}
      <div className={`fixed inset-0 z-[9999] ${open ? 'pointer-events-auto' : 'pointer-events-none'}`} style={{ height: '100dvh' }}>
        {/* Fond sombre */}
        <div className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={close} />

        {/* Drawer qui glisse depuis la droite */}
        <div className={`absolute right-0 top-0 bottom-0 w-[88vw] max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`} style={{ height: '100dvh' }}>
          {/* En-tête : search + fermer */}
          <div className="flex items-center gap-2 px-3 py-3 border-b border-slate-100 flex-shrink-0">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') goSearch(); if (e.key === 'Escape') close() }}
                dir="rtl" placeholder="חיפוש"
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-full pr-9 pl-9 text-[15px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-primary-400 focus:bg-white" />
              {loading ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
               : q ? <button onClick={() => { setQ(''); setSuggestions([]); inputRef.current?.focus() }} className="absolute left-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-slate-400" /></button> : null}
            </div>
            <button onClick={close} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 flex-shrink-0" aria-label="סגור">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* Résultats */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {q.trim().length >= 2 && suggestions.length === 0 && !loading && (
              <div className="text-center py-16 text-slate-400"><p className="text-4xl mb-3">🔍</p><p className="text-[14px] px-4">לא נמצאו תוצאות עבור "{q}"</p></div>
            )}
            {suggestions.length > 0 && (
              <SuggestionList suggestions={suggestions} q={q} onProduct={goProduct} onSearchAll={() => goSearch()} />
            )}
            {q.trim().length < 2 && (
              <div className="text-center py-16 text-slate-300"><p className="text-[13px]">התחל להקליד כדי לחפש...</p></div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// Composant par défaut (desktop inline). Pour mobile, importer MobileSearch.
export default function SearchBar() {
  return <DesktopSearch />
}