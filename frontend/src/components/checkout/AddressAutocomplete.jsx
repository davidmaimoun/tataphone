'use client'
import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import addressService from '@/services/addressService'

// Champ "רחוב" avec autocomplete d'adresses israéliennes (OpenStreetMap/Nominatim).
// onSelect(suggestion) reçoit { street, houseNumber, city, postcode }
export default function AddressAutocomplete({ label = 'רחוב', value, onChange, onSelect, required, placeholder = 'הרצל' }) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapRef = useRef(null)
  const debounceRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    // Ferme le dropdown si on clique en dehors
    const onClickOutside = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleChange = (e) => {
    const q = e.target.value
    onChange(q)
    setActiveIndex(-1)

    clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    if (q.trim().length < 2) { setSuggestions([]); setOpen(false); return }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      const results = await addressService.autocomplete(q, { signal: controller.signal })
      setLoading(false)
      setSuggestions(results)
      setOpen(results.length > 0)
    }, 350)
  }

  const selectSuggestion = (s) => {
    onChange(s.street || value)
    onSelect?.(s)
    setOpen(false)
    setSuggestions([])
  }

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { if (activeIndex >= 0) { e.preventDefault(); selectSuggestion(suggestions[activeIndex]) } }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">{label}</label>
      <div className="relative" dir="rtl">
        <MapPin className="absolute top-1/2 -translate-y-1/2 start-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          required={required}
          placeholder={placeholder}
          autoComplete="off"
          className="input w-full !ps-10"
        />
        {loading && <Loader2 className="absolute top-1/2 -translate-y-1/2 end-3.5 w-4 h-4 text-slate-400 animate-spin" />}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto" dir="rtl">
          {suggestions.map((s, i) => (
            <li
              key={`${s.label}-${i}`}
              onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s) }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`px-3.5 py-2.5 text-[13px] cursor-pointer border-b border-slate-50 last:border-0 ${activeIndex === i ? 'bg-primary-50 text-primary-700' : 'text-slate-700'}`}
            >
              <p className="font-semibold">{[s.street, s.houseNumber].filter(Boolean).join(' ')}</p>
              <p className="text-[11px] text-slate-400">{[s.city, s.postcode].filter(Boolean).join(' · ')}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}