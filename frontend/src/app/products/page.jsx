'use client'
import { Suspense, useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { SlidersHorizontal, X, ChevronDown, Search } from 'lucide-react'
import productService from '@/services/productService'
import metaService from '@/services/metaService'
import ProductCard from '@/components/product/ProductCard'

const SORT_OPTIONS = [
  { value: 'default', label: 'ברירת מחדל' },
  { value: 'price_asc', label: 'מחיר: נמוך לגבוה ↑' },
  { value: 'price_desc', label: 'מחיר: גבוה לנמוך ↓' },
  { value: 'rating_desc', label: 'דירוג הגבוה ביותר' },
  { value: 'new', label: 'חדש ביותר' },
]

function useUrlParams() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const setParam = (key, val) => {
    const next = new URLSearchParams(searchParams.toString())
    if (val) next.set(key, val); else next.delete(key)
    router.push(`/products?${next.toString()}`)
  }
  return { searchParams, setParam, router }
}

// ── Drawer de filtres (catégorie, prix, marque, kosher, stock) ──
function FilterDrawer({ open, onClose, categories, brands, priceRange }) {
  const { searchParams, router } = useUrlParams()

  const category   = searchParams.get('category') || ''
  const brand      = searchParams.get('brand') || ''
  const isKosher   = searchParams.get('isKosher') === 'true'
  const inStock    = searchParams.get('inStock') === 'true'
  const sale       = searchParams.get('sale') === 'true'
  const isNew      = searchParams.get('new') === 'true'
  const minPrice   = searchParams.get('min_price') || ''
  const maxPrice   = searchParams.get('max_price') || ''

  const [localMin, setLocalMin] = useState(minPrice)
  const [localMax, setLocalMax] = useState(maxPrice)
  useEffect(() => { setLocalMin(minPrice); setLocalMax(maxPrice) }, [minPrice, maxPrice])

  const update = (changes) => {
    const next = new URLSearchParams(searchParams.toString())
    Object.entries(changes).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k) })
    router.push(`/products?${next.toString()}`)
  }

  const toggle = (key) => update({ [key]: searchParams.get(key) === 'true' ? '' : 'true' })
  const applyPrice = () => update({ min_price: localMin, max_price: localMax })
  const clearAll = () => { router.push('/products'); onClose() }

  const activeCount = [category, brand, isKosher, inStock, sale, isNew, minPrice, maxPrice].filter(Boolean).length

  return (
    <div className={`fixed inset-0 z-[60] transition-all duration-200 ${open ? 'visible' : 'invisible'}`}>
      <div className={`absolute inset-0 bg-black/40 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <div className={`absolute right-0 top-0 h-full w-[85vw] max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary-600" />סינון
            {activeCount > 0 && <span className="text-[11px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{activeCount}</span>}
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Rapides */}
          <div>
            <p className="text-[12px] font-black text-slate-400 uppercase tracking-wide mb-2.5">מהיר</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => toggle('sale')} className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${sale ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-600 border-slate-200'}`}>🔥 מבצעים</button>
              <button onClick={() => toggle('new')} className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${isNew ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200'}`}>✨ חדש</button>
              <button onClick={() => toggle('isKosher')} className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${isKosher ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}>✡ כשר</button>
              <button onClick={() => toggle('inStock')} className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${inStock ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>📦 במלאי</button>
            </div>
          </div>

          {/* Prix */}
          <div>
            <p className="text-[12px] font-black text-slate-400 uppercase tracking-wide mb-2.5">טווח מחירים (₪)</p>
            <div className="flex items-center gap-2">
              <input type="number" min="0" value={localMin} onChange={e => setLocalMin(e.target.value)} placeholder="מ-" className="input text-sm flex-1" />
              <span className="text-slate-300">—</span>
              <input type="number" min="0" value={localMax} onChange={e => setLocalMax(e.target.value)} placeholder="עד" className="input text-sm flex-1" />
              <button onClick={applyPrice} className="btn btn-primary px-3 py-2 text-[13px]">החל</button>
            </div>
            {priceRange && <p className="text-[11px] text-slate-400 mt-1.5">בין ₪{priceRange.min} ל-₪{priceRange.max}</p>}
          </div>

          {/* Catégories */}
          {categories.length > 0 && (
            <div>
              <p className="text-[12px] font-black text-slate-400 uppercase tracking-wide mb-2.5">קטגוריה</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button key={cat} onClick={() => update({ category: category === cat ? '' : cat })}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${category === cat ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Marques */}
          {brands.length > 0 && (
            <div>
              <p className="text-[12px] font-black text-slate-400 uppercase tracking-wide mb-2.5">מותג</p>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {brands.map(b => (
                  <button key={b} onClick={() => update({ brand: brand === b ? '' : b })}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-all ${brand === b ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button onClick={clearAll} className="flex-1 py-2.5 rounded-xl text-[14px] font-bold text-red-500 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors">נקה הכל</button>
          <button onClick={onClose} className="flex-1 btn btn-primary py-2.5 text-[14px]">הצג תוצאות</button>
        </div>
      </div>
    </div>
  )
}

function ProductsInner() {
  const { searchParams, setParam, router } = useUrlParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const sort      = searchParams.get('sort') || 'default'
  const category  = searchParams.get('category') || ''
  const brand     = searchParams.get('brand') || ''
  const sale      = searchParams.get('sale') === 'true'
  const isNew     = searchParams.get('new') === 'true'
  const isKosher  = searchParams.get('isKosher') === 'true' || searchParams.get('kosher') === 'yes'
  const inStock   = searchParams.get('inStock') === 'true'
  const query     = searchParams.get('q') || ''
  const minPrice  = parseFloat(searchParams.get('min_price')) || 0
  const maxPrice  = parseFloat(searchParams.get('max_price')) || Infinity

  const hasFilters = sort !== 'default' || category || brand || sale || isNew || isKosher || inStock || query || searchParams.get('min_price') || searchParams.get('max_price')
  const clearFilters = () => router.push('/products')

  // Ouvre le drawer si ?openFilter=1 (depuis le bouton navbar)
  useEffect(() => {
    if (searchParams.get('openFilter') === '1') {
      setDrawerOpen(true)
      const next = new URLSearchParams(searchParams.toString())
      next.delete('openFilter')
      router.replace(`/products?${next.toString()}`)
    }
  }, [searchParams, router])

  useEffect(() => {
    productService.getAll({ limit: 500 }).then(d => setProducts(d.products || [])).catch(() => {}).finally(() => setLoading(false))
    metaService.get('categories').then(setCategories).catch(() => {})
    metaService.get('brands').then(setBrands).catch(() => {})
  }, [])

  // Fourchette de prix réelle
  const priceRange = useMemo(() => {
    if (!products.length) return null
    const prices = products.map(p => p.price).filter(Boolean)
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
  }, [products])

  const filtered = useMemo(() => {
    let list = [...products]
    if (query) {
      const q = query.toLowerCase()
      list = list.filter(p => p.name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q))
    }
    if (category) list = list.filter(p => p.category === category)
    if (brand) list = list.filter(p => p.brand === brand)
    if (sale) list = list.filter(p => p.discount && p.originalPrice > p.price)
    if (isNew) list = list.filter(p => p.isNew)
    if (isKosher) list = list.filter(p => p.isKosher === true)
    if (inStock) list = list.filter(p => (p.stock ?? 0) > 0)
    list = list.filter(p => p.price >= minPrice && p.price <= maxPrice)
    switch (sort) {
      case 'price_asc': list.sort((a,b) => a.price - b.price); break
      case 'price_desc': list.sort((a,b) => b.price - a.price); break
      case 'rating_desc': list.sort((a,b) => (b.rating||0) - (a.rating||0)); break
      case 'new': list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); break
    }
    return list
  }, [products, query, category, brand, sale, isNew, isKosher, inStock, minPrice, maxPrice, sort])

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-6">
      {/* Titre + tri + bouton filtre */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="min-w-0">
          <h1 className="font-black text-2xl sm:text-3xl text-slate-900 truncate">
            {query ? `תוצאות עבור "${query}"` : 'כל המוצרים'}
          </h1>
          <p className="text-[13px] text-slate-400 mt-0.5">{filtered.length} מוצרים</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Bouton filtre */}
          <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-[13px] font-bold text-slate-700 hover:border-primary-300 transition-colors">
            <SlidersHorizontal className="w-4 h-4" />סינון
            {hasFilters && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
          </button>
          {/* Tri */}
          <div className="relative">
            <select value={sort} onChange={e => setParam('sort', e.target.value === 'default' ? '' : e.target.value)} className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-8 text-[13px] font-semibold text-slate-700 cursor-pointer focus:outline-none focus:border-primary-400">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Chips des filtres actifs */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {query && <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-bold bg-primary-50 text-primary-700 border border-primary-100"><Search className="w-3 h-3" />{query}</span>}
          {category && <span className="px-3 py-1 rounded-full text-[12px] font-bold bg-primary-50 text-primary-700 border border-primary-100">{category}</span>}
          {brand && <span className="px-3 py-1 rounded-full text-[12px] font-bold bg-primary-50 text-primary-700 border border-primary-100">{brand}</span>}
          {isKosher && <span className="px-3 py-1 rounded-full text-[12px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">✡ כשר</span>}
          {inStock && <span className="px-3 py-1 rounded-full text-[12px] font-bold bg-blue-50 text-blue-700 border border-blue-100">📦 במלאי</span>}
          {sale && <span className="px-3 py-1 rounded-full text-[12px] font-bold bg-red-50 text-red-700 border border-red-100">🔥 מבצעים</span>}
          <button onClick={clearFilters} className="flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors"><X className="w-3 h-3" />נקה הכל</button>
        </div>
      )}

      {/* Grille produits */}
      {loading ? (
        <div className="products-grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">{Array.from({length:8}).map((_,i) => <div key={i} className="bg-white/60 rounded-2xl animate-pulse" style={{height:300}} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24"><p className="text-6xl mb-4">🔍</p><p className="font-black text-xl text-slate-800 mb-2">לא נמצאו מוצרים</p><button onClick={clearFilters} className="btn btn-primary mt-4 px-8">הצג הכל</button></div>
      ) : (
        <div className="products-grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 items-stretch">{filtered.map((p) => <ProductCard key={p._id} product={p} />)}</div>
      )}

      {/* Drawer de filtres */}
      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} categories={categories} brands={brands} priceRange={priceRange} />
    </div>
  )
}

export default function ProductsPage() { return <Suspense><ProductsInner /></Suspense> }