'use client'
import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Plus, Pencil, Trash2, Search, X, Check, Star, Upload, Layers, Building2, Tag, Zap, ChevronDown, ChevronUp, RefreshCw, AlertCircle, AlertTriangle } from 'lucide-react'
import metaService from '@/services/metaService'
import { productAdmin } from '@/services/productService'
import productService from '@/services/productService'
import toast from 'react-hot-toast'

// Couleurs suggérées pour le VariantsEditor (clic rapide au lieu de tout taper)
const SUGGESTED_COLORS = ['שחור','לבן','כסף','אפור','זהב','ורוד','אדום','כחול','ירוק','סגול','כתום','טיטניום','שמפניה','זהב ורוד']
const SUGGESTED_STORAGE = ['64GB','128GB','256GB','512GB','1TB']

// ── Complétude produit : détecte les champs manquants (2 niveaux de gravité) ──
// CRITIQUE (rouge) : champs essentiels au bon fonctionnement de la fiche.
// MINEUR (ambre) : champs qui améliorent la fiche mais ne la cassent pas.
function getProductIssues(p) {
  const critical = []
  const minor = []
  const hasVariants = Array.isArray(p.variants) && p.variants.some(v => v.price != null && v.price !== '')

  if (!p.images?.length)                          critical.push('תמונה')
  if (!hasVariants && !(p.price > 0))             critical.push('מחיר')
  if (!p.category?.trim())                         critical.push('קטגוריה')
  if (!p.brand?.trim())                            critical.push('מותג')
  if (!p.sku?.trim())                              critical.push('מק"ט (SKU)')

  if (!p.description?.trim())                      minor.push('תיאור')
  if (!p.tags?.length)                             minor.push('תגיות')
  if (!p.specs || Object.keys(p.specs).length === 0) minor.push('מפרט')

  return { critical, minor }
}

// ── Badge d'alerte dans la row (rouge = critique, ambre = mineur) + tooltip ──
function CompletenessBadge({ product }) {
  const { critical, minor } = getProductIssues(product)
  if (critical.length === 0 && minor.length === 0) return null

  const isCritical = critical.length > 0
  const Icon = isCritical ? AlertCircle : AlertTriangle
  const missing = [...critical, ...minor]
  const tooltip = `${isCritical ? 'חסרים שדות חובה' : 'ניתן להשלים'}: ${missing.join(', ')}`

  return (
    <span className="relative inline-flex items-center group/badge">
      <Icon className={`w-4 h-4 ${isCritical ? 'text-red-500' : 'text-amber-400'}`} strokeWidth={isCritical ? 2.5 : 2} />
      <span
        role="tooltip"
        className="pointer-events-none absolute z-30 bottom-full right-1/2 translate-x-1/2 mb-1.5 whitespace-nowrap rounded-lg bg-slate-800 text-white text-[11px] font-medium px-2.5 py-1.5 opacity-0 group-hover/badge:opacity-100 transition-opacity shadow-lg"
        dir="rtl"
      >
        {tooltip}
        <span className="absolute top-full right-1/2 translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-800" />
      </span>
    </span>
  )
}

// ── Meta manager (add/remove categories, brands, tags) ──
function MetaManager({ collection, label, icon: Icon, color }) {
  const [items, setItems] = useState([])
  const [newVal, setNewVal] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { metaService.get(collection).then(setItems) }, [collection])

  const add = async () => {
    const v = newVal.trim()
    if (!v) return
    if (items.some(i => i.toLowerCase() === v.toLowerCase())) { toast.error(`"${v}" כבר קיים`); return }
    setLoading(true)
    try { await metaService.add(collection, v); setItems(p => [...p, v].sort()); setNewVal(''); toast.success(`"${v}" נוסף!`) }
    catch { toast.error('שגיאה') } finally { setLoading(false) }
  }
  const remove = async (name) => { await metaService.delete(collection, name); setItems(p => p.filter(i => i !== name)); toast.success(`"${name}" הוסר`) }

  return (
    <div className="border border-slate-100 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color }} />
        <p className="font-bold text-[13px] text-slate-700">{label}</p>
        <span className="text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="flex gap-2 mb-3">
        <input value={newVal} onChange={e => setNewVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} dir="rtl" placeholder={`הוסף ${label}...`} className="input text-sm flex-1 h-9" />
        <button onClick={add} disabled={loading || !newVal.trim()} className="px-3 py-1.5 rounded-xl text-white text-[12px] font-bold transition-all disabled:opacity-40" style={{ background: color }}>{loading ? '...' : '+ הוסף'}</button>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
        {items.map(item => (
          <span key={item} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold group" style={{ background: `${color}15`, color }}>
            {item}<button onClick={() => remove(item)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5"><X className="w-2.5 h-2.5" /></button>
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Last Minute config (price threshold only) ──
function LastMinuteConfig() {
  const [open, setOpen] = useState(false)
  const [maxPrice, setMaxPrice] = useState(200)
  useEffect(() => { try { setMaxPrice(parseInt(localStorage.getItem('lm_maxPrice') || '200')) } catch {} }, [])
  const save = (val) => { setMaxPrice(val); try { localStorage.setItem('lm_maxPrice', val) } catch {} }
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl mb-4 overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-amber-400 flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-white fill-white" /></div>
          <p className="font-black text-slate-800 text-[14px]">סקשן "ברגע האחרון" — הגדרות</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-amber-200 pt-3">
          <p className="text-[12px] text-slate-500 mb-3">מוצרים מתחת לסכום שנבחר מוצגים אוטומטית בסקשן (לפי תגיות התאמה לסל)</p>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wide mb-1">מחיר מקס׳ (₪)</label>
              <input type="number" value={maxPrice} min={1} onChange={e => save(Number(e.target.value))} className="input text-sm w-24" />
            </div>
            <p className="text-[11px] text-amber-700 bg-amber-100 rounded-lg px-2.5 py-1.5">💡 התגיות שתוסיף למוצר קובעות התאמה לסל</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Meta panel (collapsible) ──
function MetaPanel() {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl mb-6 overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2.5"><Layers className="w-4 h-4 text-slate-500" /><p className="font-black text-slate-800 text-[14px]">ניהול קטגוריות, מותגים ותגיות</p></div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-200 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetaManager collection="categories" label="קטגוריות" icon={Layers} color="#CC785C" />
          <MetaManager collection="brands" label="מותגים" icon={Building2} color="#7C3AED" />
          <MetaManager collection="tags" label="תגיות" icon={Tag} color="#059669" />
        </div>
      )}
    </div>
  )
}


// ════════════════════════════════════════════════════════════════
//  Éditeur de variantes — SEUL système de gestion couleur/taille/stockage
// ════════════════════════════════════════════════════════════════
function VariantsEditor({ options, setOptions, variants, setVariants }) {
  // Ouvert par défaut si le produit a déjà des variantes/options
  const [open, setOpen] = useState(() => (variants?.length || 0) > 0 || (options?.length || 0) > 0)

  const addOption = (presetName = '') => setOptions(p => [...p, { name: presetName, values: [] }])
  const updateOptionName = (i, name) => setOptions(p => p.map((o, idx) => idx === i ? { ...o, name } : o))
  const removeOption = (i) => setOptions(p => p.filter((_, idx) => idx !== i))
  const addValue = (i, val) => {
    const v = val.trim(); if (!v) return
    setOptions(p => p.map((o, idx) => idx === i ? { ...o, values: [...new Set([...(o.values||[]), v])] } : o))
  }
  const removeValue = (i, val) => setOptions(p => p.map((o, idx) => idx === i ? { ...o, values: o.values.filter(x => x !== val) } : o))

  // Suggestions selon le nom de l'option
  const suggestionsFor = (optName) => {
    const n = (optName || '').trim()
    if (n === 'צבע' || n.includes('צבע')) return SUGGESTED_COLORS
    if (n === 'אחסון' || n.includes('אחסון') || n.toLowerCase().includes('gb')) return SUGGESTED_STORAGE
    return []
  }

  const generateVariants = () => {
    const valid = options.filter(o => o.name?.trim() && o.values?.length)
    if (!valid.length) { setVariants([]); return }
    let combos = [{}]
    valid.forEach(opt => {
      const next = []
      combos.forEach(combo => opt.values.forEach(val => next.push({ ...combo, [opt.name]: val })))
      combos = next
    })
    setVariants(combos.map(attrs => {
      const existing = variants.find(v => valid.every(o => v.attributes?.[o.name] === attrs[o.name]))
      return existing || { sku: '', attributes: attrs, price: '', originalPrice: '', stock: 0, supplierPrice: '', image: '' }
    }))
  }

  const updateVariant = (i, field, val) => setVariants(p => p.map((v, idx) => idx === i ? { ...v, [field]: val } : v))

  return (
    <div className="border-2 border-dashed border-primary-200 rounded-2xl p-4 bg-primary-50/30">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center justify-between w-full">
        <span className="text-[14px] font-black text-primary-700 flex items-center gap-2"><Plus className="w-4 h-4" />וריאציות (צבע, אחסון — מחיר/מלאי לכל שילוב)</span>
        <span className="text-[12px] text-slate-400">{variants.length ? `${variants.length} וריאציות` : 'אופציונלי'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {/* Boutons rapides pour ajouter une option courante */}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => addOption('צבע')} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors">+ צבע</button>
            <button type="button" onClick={() => addOption('אחסון')} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors">+ אחסון</button>
            <button type="button" onClick={() => addOption('')} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">+ אפשרות אחרת</button>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {options.map((opt, i) => {
              const suggestions = suggestionsFor(opt.name)
              return (
                <div key={i} className="bg-white rounded-xl p-3 border border-slate-100">
                  <div className="flex gap-2 items-center mb-2">
                    <input value={opt.name} onChange={e => updateOptionName(i, e.target.value)} dir="rtl" className="input text-sm font-bold flex-1" placeholder="שם האפשרות (צבע, אחסון...)" />
                    <button type="button" onClick={() => removeOption(i)} className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center mb-2">
                    {opt.values.map(val => (
                      <span key={val} className="inline-flex items-center gap-1 text-[12px] font-semibold bg-primary-100 text-primary-700 px-2.5 py-1 rounded-full">
                        {val}<button type="button" onClick={() => removeValue(i, val)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                    <input dir="rtl" className="input text-xs px-2 py-1 h-auto w-28" placeholder="ערך + Enter"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addValue(i, e.target.value); e.target.value = '' } }} />
                  </div>
                  {/* Suggestions rapides (couleurs / stockage) */}
                  {suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-50">
                      <span className="text-[10px] text-slate-400 self-center ml-1">הוסף מהיר:</span>
                      {suggestions.filter(s => !opt.values.includes(s)).map(s => (
                        <button key={s} type="button" onClick={() => addValue(i, s)} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 hover:bg-primary-100 hover:text-primary-700 transition-colors">+ {s}</button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Générer les combinaisons */}
          <button type="button" onClick={generateVariants} className="btn btn-secondary px-4 py-2 text-[13px] gap-2"><RefreshCw className="w-3.5 h-3.5" />צור / רענן וריאציות</button>

          {/* Tableau des variantes */}
          {variants.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-[12px] min-w-[560px]">
                <thead className="text-[11px] text-slate-400">
                  <tr>
                    <th className="py-1.5 px-2">צירוף</th><th className="py-1.5 px-2">מק"ט</th>
                    <th className="py-1.5 px-2">מחיר</th><th className="py-1.5 px-2">מחיר מקורי</th>
                    <th className="py-1.5 px-2">מלאי</th><th className="py-1.5 px-2">עלות ספק</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {variants.map((v, i) => (
                    <tr key={i}>
                      <td className="py-1.5 px-2 font-semibold text-slate-700 whitespace-nowrap">{Object.values(v.attributes || {}).join(' · ') || '—'}</td>
                      <td className="py-1.5 px-2"><input value={v.sku || ''} onChange={e => updateVariant(i,'sku',e.target.value)} dir="ltr" className="input text-xs w-24" placeholder="SKU" /></td>
                      <td className="py-1.5 px-2"><input type="number" step="0.01" value={v.price ?? ''} onChange={e => updateVariant(i,'price',e.target.value)} className="input text-xs w-20" placeholder="₪" /></td>
                      <td className="py-1.5 px-2"><input type="number" step="0.01" value={v.originalPrice ?? ''} onChange={e => updateVariant(i,'originalPrice',e.target.value)} className="input text-xs w-20" placeholder="₪" /></td>
                      <td className="py-1.5 px-2"><input type="number" value={v.stock ?? 0} onChange={e => updateVariant(i,'stock',e.target.value)} className="input text-xs w-16" /></td>
                      <td className="py-1.5 px-2"><input type="number" step="0.01" value={v.supplierPrice ?? ''} onChange={e => updateVariant(i,'supplierPrice',e.target.value)} className="input text-xs w-20" placeholder="₪" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[11px] text-slate-400 mt-2">💡 כל וריאציה עם מחיר/מלאי משלה. בכרטיס יוצג "החל מ-" המחיר הנמוך.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [exporting, setExporting] = useState(false)

  // Pagination + tri
  const [perPage, setPerPage] = useState(50)        // 50 | 100 | 200 | 250 | 500 | 'all'
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('createdAt')  // colonne triée
  const [sortDir, setSortDir] = useState('desc')     // 'asc' | 'desc'

  // Sélection pour export par batch (Set d'_id)
  const [selected, setSelected] = useState(() => new Set())
  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const clearSelection = () => setSelected(new Set())

  const load = async () => { setLoading(true); try { const { default: api } = await import('@/services/api'); const r = await api.get('/products/admin/list'); setProducts(r.data.products || []) } catch { productService.getAll({ limit: 9999 }).then(d => setProducts(d.products || [])) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  const handleDelete = async (id, name) => {
    if (!confirm(`למחוק את "${name}"?`)) return
    try { await productAdmin.remove(id); toast.success('נמחק'); load() } catch { toast.error('שגיאה במחיקה') }
  }

  // Toggle "featured" (mise en avant manuelle) — mise à jour rapide
  const toggleFeatured = async (p) => {
    const next = !p.isFeatured
    setProducts(prev => prev.map(x => x._id === p._id ? { ...x, isFeatured: next } : x))  // optimiste
    try {
      const fd = new FormData()
      fd.append('isFeatured', next ? 'true' : 'false')
      fd.append('existingImages', JSON.stringify(p.images || []))
      await productAdmin.update(p._id, fd)
      toast.success(next ? '⭐ נוסף להמלצות' : 'הוסר מההמלצות')
    } catch {
      setProducts(prev => prev.map(x => x._id === p._id ? { ...x, isFeatured: p.isFeatured } : x))  // rollback
      toast.error('שגיאה')
    }
  }

  // Édition inline du nombre de ventes (salesCount)
  const [editingSales, setEditingSales] = useState(null)  // { id, value }
  const saveSalesCount = async (p, newVal) => {
    const val = Math.max(0, parseInt(newVal) || 0)
    setEditingSales(null)
    if (val === (p.salesCount ?? 0)) return  // pas de changement
    const prevVal = p.salesCount ?? 0
    setProducts(prev => prev.map(x => x._id === p._id ? { ...x, salesCount: val } : x))  // optimiste
    try {
      const fd = new FormData()
      fd.append('salesCount', val)
      fd.append('existingImages', JSON.stringify(p.images || []))
      await productAdmin.update(p._id, fd)
      toast.success(`מכירות עודכן ל-${val}`)
    } catch {
      setProducts(prev => prev.map(x => x._id === p._id ? { ...x, salesCount: prevVal } : x))  // rollback
      toast.error('שגיאה')
    }
  }

  // ── Export JSON / CSV ──
  const exportProducts = async (format) => {
    setExporting(true)
    try {
      const { default: api } = await import('@/services/api')
      const res = await api.get(`/products/export?format=${format}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      const stamp = new Date().toISOString().slice(0,16).replace(/[:T]/g,'-')
      a.download = `tataphone_products_${stamp}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`ייצוא ${format.toUpperCase()} הושלם! 💾`)
    } catch { toast.error('שגיאה בייצוא') } finally { setExporting(false) }
  }

  // ── Export de la SÉLECTION (côté client) — JSON ou CSV, pour travail par batch ──
  // Le but : l'admin coche quelques produits, les exporte, les enrichit (ex: descriptions
  // via Claude), puis réimporte le fichier modifié dans l'onglet Import.
  const exportSelected = (format) => {
    const chosen = products.filter(p => selected.has(p._id))
    if (chosen.length === 0) { toast.error('לא נבחרו מוצרים'); return }

    // On exporte les champs utiles à l'édition (on garde _id et sku pour le ré-appariement à l'import)
    const rows = chosen.map(p => ({
      _id:          p._id,
      sku:          p.sku || '',
      name:         p.name || '',
      brand:        p.brand || '',
      category:     p.category || '',
      price:        p.price ?? '',
      description:  p.description || '',
      tags:         p.tags || [],
      specs:        p.specs || {},
    }))

    const stamp = new Date().toISOString().slice(0,16).replace(/[:T]/g,'-')
    let blob, filename

    if (format === 'json') {
      blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' })
      filename = `tataphone_batch_${chosen.length}_${stamp}.json`
    } else {
      // CSV : on aplatit tags (| séparé) et specs (JSON) pour rester lisible dans Excel
      const esc = (v) => {
        const s = String(v ?? '')
        return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s
      }
      const headers = ['_id','sku','name','brand','category','price','description','tags','specs']
      const lines = [headers.join(',')]
      for (const r of rows) {
        lines.push([
          r._id, esc(r.sku), esc(r.name), esc(r.brand), esc(r.category), r.price,
          esc(r.description), esc((r.tags||[]).join('|')), esc(JSON.stringify(r.specs||{})),
        ].join(','))
      }
      // BOM pour qu'Excel lise l'hébreu correctement
      blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
      filename = `tataphone_batch_${chosen.length}_${stamp}.csv`
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
    toast.success(`יוצאו ${chosen.length} מוצרים (${format.toUpperCase()}) 💾`)
  }

  // ── Tri : clic sur une colonne ──
  const toggleSort = (col) => {
    if (sortBy === col) { setSortDir(d => d === 'asc' ? 'desc' : 'asc') }
    else { setSortBy(col); setSortDir('asc') }
    setPage(1)
  }

  // Filtre recherche
  const filtered = products.filter(p => { const q = search.toLowerCase(); return !q || p.name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) })

  // Tri
  const sorted = [...filtered].sort((a, b) => {
    let av = a[sortBy], bv = b[sortBy]
    // Normaliser
    if (sortBy === 'price' || sortBy === 'stock') { av = Number(av) || 0; bv = Number(bv) || 0 }
    else { av = (av ?? '').toString().toLowerCase(); bv = (bv ?? '').toString().toLowerCase() }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  // Pagination
  const isAll = perPage === 'all'
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(sorted.length / perPage))
  const curPage = Math.min(page, totalPages)
  const paged = isAll ? sorted : sorted.slice((curPage - 1) * perPage, curPage * perPage)

  // Sélection "tout / rien" sur la page courante
  const pageIds = paged.map(p => p._id)
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id))
  const toggleSelectPage = () => setSelected(prev => {
    const n = new Set(prev)
    if (allPageSelected) pageIds.forEach(id => n.delete(id))
    else pageIds.forEach(id => n.add(id))
    return n
  })

  // En-tête de colonne triable
  const SortHeader = ({ col, label, className = '' }) => (
    <th className={`px-4 py-3 cursor-pointer select-none hover:text-primary-600 transition-colors ${className}`} onClick={() => toggleSort(col)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortBy === col && <span className="text-primary-500">{sortDir === 'asc' ? '▲' : '▼'}</span>}
      </span>
    </th>
  )

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-black text-slate-900">מוצרים ({products.length})</h1>
        <div className="flex gap-2 flex-wrap">
          {/* Export / Backup */}
          {/* <button onClick={() => exportProducts('json')} disabled={exporting} className="btn btn-secondary px-3 py-2.5 text-[13px] gap-1.5 disabled:opacity-50" title="גיבוי JSON (ניתן לייבא מחדש)">
            💾 JSON
          </button>
          <button onClick={() => exportProducts('csv')} disabled={exporting} className="btn btn-secondary px-3 py-2.5 text-[13px] gap-1.5 disabled:opacity-50" title="ייצוא CSV (Excel)">
            📊 CSV
          </button> */}
          <button onClick={() => setModal('new')} className="btn btn-primary px-4 py-2.5"><Plus className="w-4 h-4" />מוצר חדש</button>
        </div>
      </div>

      <LastMinuteConfig />
      <MetaPanel />

      {/* Barre : recherche + pagination */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="relative max-w-md flex-1 min-w-[200px]">
          {/* <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> */}
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="חפש מוצר..." className="input pr-10 w-full" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-slate-400">הצג:</span>
          {[50, 100, 200, 250, 500, 'all'].map(n => (
            <button key={n} onClick={() => { setPerPage(n); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${perPage === n ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-primary-300'}`}>
              {n === 'all' ? 'הכל' : n}
            </button>
          ))}
        </div>
      </div>

      {/* Barre d'action sélection (visible quand au moins 1 produit coché) */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 mb-3 px-4 py-2.5 rounded-xl bg-primary-50 border border-primary-200 flex-wrap">
          <span className="text-[13px] font-bold text-primary-700">{selected.size} מוצרים נבחרו</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => exportSelected('json')} className="btn btn-secondary px-3 py-1.5 text-[12px] gap-1.5">💾 ייצא נבחרים (JSON)</button>
            <button onClick={() => exportSelected('csv')} className="btn btn-secondary px-3 py-1.5 text-[12px] gap-1.5">📊 ייצא נבחרים (CSV)</button>
            <button onClick={clearSelection} className="text-[12px] font-bold text-slate-500 hover:text-red-500 px-2 py-1.5 transition-colors">נקה בחירה</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-right min-w-[600px]">
          <thead className="bg-slate-50 text-[12px] font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3 w-10"><input type="checkbox" checked={allPageSelected} onChange={toggleSelectPage} className="w-4 h-4 rounded border-slate-300 text-primary-600 cursor-pointer" title="בחר הכל בעמוד" /></th>
              <SortHeader col="name" label="מוצר" />
              <SortHeader col="brand" label="מותג" className="hidden sm:table-cell" />
              <SortHeader col="category" label="קטגוריה" />
              <SortHeader col="price" label="מחיר" />
              <SortHeader col="stock" label="מלאי" className="hidden md:table-cell" />
              <SortHeader col="salesCount" label="מכירות" className="hidden lg:table-cell" />
              <th className="px-4 py-3">מומלץ</th>
              <th className="px-4 py-3">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">טוען...</td></tr>
             : paged.length === 0 ? <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">אין מוצרים</td></tr>
             : paged.map(p => (
              <tr key={p._id} className={`hover:bg-slate-50 ${selected.has(p._id) ? 'bg-primary-50/40' : ''}`}>
                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(p._id)} onChange={() => toggleSelect(p._id)} className="w-4 h-4 rounded border-slate-300 text-primary-600 cursor-pointer" /></td>
                <td className="px-4 py-3"><div className="flex items-center gap-2">{p.images?.[0] && <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />}<div><div className="flex items-center gap-1.5"><p className="font-semibold text-slate-800 text-[14px] line-clamp-1">{p.name}</p><CompletenessBadge product={p} /></div>{p.isKosher && <span className="text-[10px] text-emerald-600 font-bold">✡ כשר</span>}</div></div></td>
                <td className="px-4 py-3 text-[13px] text-slate-500 hidden sm:table-cell">{p.brand}</td>
                <td className="px-4 py-3"><span className="text-xs font-bold bg-primary-50 text-primary-600 px-2.5 py-1 rounded-full">{p.category}</span></td>
                <td className="px-4 py-3 font-bold text-[14px]">₪{p.price?.toLocaleString()}</td>
                <td className="px-4 py-3 text-[13px] hidden md:table-cell"><span className={p.stock > 0 ? 'text-green-600' : 'text-red-500'}>{p.stock ?? 0}</span></td>
                <td className="px-4 py-3 text-[13px] hidden lg:table-cell">
                  {editingSales?.id === p._id ? (
                    <input
                      type="number" min="0" autoFocus
                      defaultValue={p.salesCount ?? 0}
                      onBlur={e => saveSalesCount(p, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setEditingSales(null) }}
                      className="input text-xs w-16 py-1"
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingSales({ id: p._id })}
                      className="font-bold text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded px-2 py-0.5 transition-colors"
                      title="לחץ לעריכת מספר המכירות">
                      {p.salesCount ?? 0} <span className="text-[10px] text-slate-300">✎</span>
                    </button>
                  )}
                  {p.rating > 0 && <span className="text-[11px] text-amber-500 mr-1">★{p.rating}</span>}
                </td>
                <td className="px-4 py-3"><button onClick={() => toggleFeatured(p)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${p.isFeatured ? 'bg-amber-100 text-amber-500' : 'bg-slate-50 text-slate-300 hover:text-amber-400'}`} title={p.isFeatured ? 'מוצג בהמלצות' : 'הוסף להמלצות'}><Star className={`w-4 h-4 ${p.isFeatured ? 'fill-amber-400' : ''}`} /></button></td>
                <td className="px-4 py-3"><div className="flex gap-1">
                  <button onClick={() => setModal(p)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:border-primary-400 hover:text-primary-600"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(p._id, p.name)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center hover:border-red-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {!isAll && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={curPage === 1}
            className="px-3 py-1.5 rounded-lg text-[13px] font-bold bg-white border border-slate-200 disabled:opacity-40 hover:border-primary-300">→ הקודם</button>
          <span className="text-[13px] text-slate-500 px-3">
            עמוד {curPage} מתוך {totalPages} · {sorted.length} מוצרים
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={curPage === totalPages}
            className="px-3 py-1.5 rounded-lg text-[13px] font-bold bg-white border border-slate-200 disabled:opacity-40 hover:border-primary-300">הבא ←</button>
        </div>
      )}
      {isAll && <p className="text-center text-[12px] text-slate-400 mt-4">מציג את כל {sorted.length} המוצרים</p>}

      {modal && <ProductModal product={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }} />}
    </div>
  )
}

function ProductModal({ product, onClose, onSave }) {
  const [metaCategories, setMetaCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [metaTags, setMetaTags] = useState([])
  const [saving, setSaving] = useState(false)
  const [newBrand, setNewBrand] = useState(''); const [newCat, setNewCat] = useState(''); const [newTag, setNewTag] = useState('')
  const [showNewBrand, setShowNewBrand] = useState(false); const [showNewCat, setShowNewCat] = useState(false); const [showNewTag, setShowNewTag] = useState(false)
  const [note, setNote] = useState(product?.note || '')
  const DEFAULT_SECTIONS = [
    { title:'תיאור', body:'' }, { title:'אחריות', body:'' },
    { title:'משלוח', body:'' }, { title:'החזרות', body:'' },
  ]
  const [details, setDetails] = useState(() => {
    const d = product?.details
    if (Array.isArray(d) && d.length) return d.map(s => ({ title:String(s.title||''), body:String(s.body||'') }))
    return DEFAULT_SECTIONS
  })
  const [specs, setSpecs] = useState(() => {
    let s = product?.specs
    if (typeof s === 'string') { try { s = JSON.parse(s) } catch { s = {} } }
    if (s && typeof s === 'object' && !Array.isArray(s)) return Object.entries(s).map(([k, v]) => ({ k: String(k), v: String(v) }))
    return []
  })
  const [form, setForm] = useState(product ? {
    ...product,
    tags: Array.isArray(product.tags) ? product.tags : [],
    isKosher: product.isKosher === true,
    salesCount: product.salesCount ?? 0,
    isFeatured: product.isFeatured === true,
  } : { name:'', brand:'', sku:'', category:'', description:'', price:'', originalPrice:'', supplierPrice:'', stock:0, tags:[], isKosher:false, salesCount:0, isFeatured:false })
  const [photos, setPhotos] = useState((product?.images || []).map((url, i) => ({ url, isMain: i === 0, file: null })))
  // ── Variantes — SEUL système ──
  const [options, setOptions] = useState(() => Array.isArray(product?.options) ? product.options : [])
  const [variants, setVariants] = useState(() => Array.isArray(product?.variants) ? product.variants : [])
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  useEffect(() => {
    metaService.get('categories').then(cats => setMetaCategories(cats.length ? cats : ['סמארטפונים','מצלמות','אוזניות','שעונים']))
    metaService.get('brands').then(setBrands)
    metaService.get('tags').then(setMetaTags)
  }, [])

  const onDrop = useCallback((accepted) => {
    const newPhotos = accepted.map(file => ({ url: URL.createObjectURL(file), isMain: false, file }))
    setPhotos(prev => { const all = [...prev, ...newPhotos]; if (!all.some(p => p.isMain) && all.length) all[0].isMain = true; return all })
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } })
  const setMain = (i) => setPhotos(prev => prev.map((p, idx) => ({ ...p, isMain: idx === i })))
  const removePhoto = (i) => setPhotos(prev => prev.filter((_, idx) => idx !== i))
  const movePhoto = (from, to) => setPhotos(prev => { const a = [...prev]; const [m] = a.splice(from, 1); a.splice(to, 0, m); return a })

  const addAndSave = async (col, val, setter) => { const v = val.trim(); if (!v) return null; await metaService.add(col, v).catch(() => {}); setter(p => [...new Set([...p, v])].sort()); return v }
  const addBrand = async () => { const v = await addAndSave('brands', newBrand, setBrands); if (v) { setForm(p => ({ ...p, brand: v })); setNewBrand(''); setShowNewBrand(false) } }
  const addCat = async () => { const v = await addAndSave('categories', newCat, setMetaCategories); if (v) { setForm(p => ({ ...p, category: v })); setNewCat(''); setShowNewCat(false) } }
  const addTag = async () => { const v = await addAndSave('tags', newTag.toLowerCase(), setMetaTags); if (v) { setForm(p => ({ ...p, tags: [...new Set([...(p.tags || []), v])] })); setNewTag(''); setShowNewTag(false) } }
  const toggleTag = t => setForm(p => ({ ...p, tags: p.tags?.includes(t) ? p.tags.filter(x => x !== t) : [...(p.tags || []), t] }))

  const submit = async (e) => {
    e.preventDefault(); setSaving(true)
    try {
      const fd = new FormData()
      const TEXT = ['name','brand','sku','category','description','price','originalPrice','supplierPrice','stock']
      TEXT.forEach(k => { const v = form[k]; if (v !== undefined && v !== null) fd.append(k, v) })
      fd.append('tags', JSON.stringify(form.tags || []))
      const specsObj = {}; specs.filter(s => s.k.trim()).forEach(s => { specsObj[s.k.trim()] = s.v.trim() })
      fd.append('specs', JSON.stringify(specsObj))
      fd.append('note', note)
      fd.append('details', JSON.stringify(details.filter(s => s.title.trim() || s.body.trim())))
      fd.append('options', JSON.stringify(options.filter(o => o.name?.trim() && o.values?.length)))
      fd.append('variants', JSON.stringify(variants.filter(v => v.sku?.trim() || Object.keys(v.attributes||{}).length)))
      fd.append('isKosher', form.isKosher ? 'true' : 'false')
      fd.append('salesCount', form.salesCount ?? 0)
      fd.append('isFeatured', form.isFeatured ? 'true' : 'false')
      const sorted = [...photos].sort((a, b) => b.isMain - a.isMain)
      fd.append('existingImages', JSON.stringify(sorted.filter(p => !p.file).map(p => p.url)))
      sorted.filter(p => p.file).forEach(p => fd.append('photos', p.file))
      const saved = product ? await productAdmin.update(product._id, fd) : await productAdmin.create(fd)
      onSave(saved); toast.success(product ? 'מוצר עודכן!' : 'מוצר נוצר!')
    } catch (err) { console.error(err); toast.error('שגיאה בשמירה') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-3xl border border-slate-100 p-8 w-full max-w-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-black text-xl text-slate-900">{product ? 'ערוך מוצר' : 'מוצר חדש'}</h2>
          <button onClick={onClose} className="icon-btn w-9 h-9"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-5">
          {/* Photos */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">תמונות מוצר<span className="font-normal text-slate-400 mr-1">— הראשונה = ראשית ⭐</span></label>
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {photos.map((p, i) => (
                  <div key={i} className="relative group/ph" style={{ width: 90 }}>
                    <div className={`w-full rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${p.isMain ? 'border-amber-400 shadow-md' : 'border-slate-200 hover:border-primary-300'}`} style={{ height: 90 }} onClick={() => setMain(i)}>
                      <img src={p.url} alt="" className="w-full h-full object-contain p-1 bg-slate-50" />
                    </div>
                    {p.isMain && <div className="absolute top-1 right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center"><Star className="w-3 h-3 text-white fill-white" /></div>}
                    <button type="button" onClick={() => removePhoto(i)} className="absolute top-1 left-1 w-5 h-5 bg-red-500 rounded-full text-white hidden group-hover/ph:flex items-center justify-center"><X className="w-3 h-3" /></button>
                    <div className="flex justify-center gap-1 mt-1">
                      {i > 0 && <button type="button" onClick={() => movePhoto(i, i - 1)} className="text-[10px] bg-slate-100 rounded px-1 hover:bg-slate-200">←</button>}
                      {i < photos.length - 1 && <button type="button" onClick={() => movePhoto(i, i + 1)} className="text-[10px] bg-slate-100 rounded px-1 hover:bg-slate-200">→</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-primary-400 hover:bg-primary-50/40'}`}>
              <input {...getInputProps()} />
              <Upload className="w-6 h-6 text-slate-300 mx-auto mb-1" />
              <p className="text-[12px] text-slate-400">גרור תמונות או לחץ להעלאה</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-bold text-slate-500 mb-1.5">שם המוצר *</label><input value={form.name} onChange={set('name')} required dir="rtl" className="input text-sm" placeholder="iPhone 15 Pro" /></div>
            <div><label className="block text-xs font-bold text-slate-500 mb-1.5">SKU</label><input value={form.sku || ''} onChange={set('sku')} dir="rtl" className={`input text-sm ${!form.sku?.trim() ? 'ring-1 ring-red-200 border-red-200 bg-red-50/30' : ''}`} placeholder="APL-15PM" /></div>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">מותג *</label>
            {!showNewBrand ? (
              <div className="flex gap-2"><select value={form.brand} onChange={set('brand')} required className={`input text-sm flex-1 ${!form.brand?.trim() ? 'ring-1 ring-red-200 border-red-200 bg-red-50/30' : ''}`}><option value="">בחר מותג...</option>{brands.map(b => <option key={b} value={b}>{b}</option>)}</select><button type="button" onClick={() => setShowNewBrand(true)} className="btn btn-ghost text-xs px-3 py-2">+ חדש</button></div>
            ) : (
              <div className="flex gap-2"><input value={newBrand} onChange={e => setNewBrand(e.target.value)} dir="rtl" className="input text-sm flex-1" placeholder="שם המותג..." autoFocus /><button type="button" onClick={addBrand} className="btn btn-primary px-3 py-2"><Check className="w-4 h-4" /></button><button type="button" onClick={() => setShowNewBrand(false)} className="btn btn-ghost px-3 py-2"><X className="w-4 h-4" /></button></div>
            )}
          </div>

          {/* Category + Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">קטגוריה *</label>
              {!showNewCat ? (
                <div className="flex gap-2"><select value={form.category} onChange={set('category')} required className={`input text-sm flex-1 ${!form.category?.trim() ? 'ring-1 ring-red-200 border-red-200 bg-red-50/30' : ''}`}><option value="">בחר...</option>{metaCategories.map(c => <option key={c} value={c}>{c}</option>)}</select><button type="button" onClick={() => setShowNewCat(true)} className="btn btn-ghost text-xs px-2 py-2">+</button></div>
              ) : (
                <div className="flex gap-2"><input value={newCat} onChange={e => setNewCat(e.target.value)} dir="rtl" className="input text-sm flex-1" placeholder="קטגוריה חדשה..." autoFocus /><button type="button" onClick={addCat} className="btn btn-primary px-3 py-2"><Check className="w-4 h-4" /></button><button type="button" onClick={() => setShowNewCat(false)} className="btn btn-ghost px-3 py-2"><X className="w-4 h-4" /></button></div>
              )}
            </div>
            <div><label className="block text-xs font-bold text-slate-500 mb-1.5">מלאי <span className="font-normal text-slate-400">(אם אין וריאציות)</span></label><input type="number" min="0" value={form.stock || 0} onChange={set('stock')} className="input text-sm" /></div>
          </div>

          {/* Prices */}
          {(() => {
            const hasVariants = variants.some(v => v.price !== '' && v.price != null)
            return (
              <div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">מחיר (₪) {!hasVariants && '*'}</label>
                    <input type="number" min="0" step="0.01" value={hasVariants ? '' : (form.price || '')} onChange={set('price')} required={!hasVariants} disabled={hasVariants} className={`input text-sm ${hasVariants ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`} placeholder={hasVariants ? 'מנוהל לפי וריאציות' : ''} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">מחיר מקורי</label>
                    <input type="number" min="0" step="0.01" value={hasVariants ? '' : (form.originalPrice || '')} onChange={set('originalPrice')} disabled={hasVariants} className={`input text-sm ${hasVariants ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`} placeholder={hasVariants ? 'מנוהל לפי וריאציות' : 'אופציונלי'} />
                  </div>
                </div>
                {hasVariants && <p className="text-[11px] text-amber-600 mt-1.5">💡 המחיר מנוהל לפי הוריאציות למטה. ערוך את המחיר בטבלת הוריאציות.</p>}
              </div>
            )
          })()}

          {/* Prix fournisseur */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <label className="block text-xs font-bold text-amber-700 mb-1.5">🔒 מחיר ספק <span className="font-normal text-amber-600">(פנימי — לא מוצג ללקוח)</span></label>
            <input type="number" min="0" step="0.01" value={form.supplierPrice || ''} onChange={set('supplierPrice')} className="input text-sm max-w-[200px]" placeholder="עלות מהספק" />
          </div>

          {/* Description */}
          <div><label className="block text-xs font-bold text-slate-500 mb-1.5">תיאור</label><textarea value={form.description || ''} onChange={set('description')} rows={3} dir="rtl" className={`input resize-none text-sm ${!form.description?.trim() ? 'ring-1 ring-amber-200 border-amber-200 bg-amber-50/30' : ''}`} placeholder="תיאור המוצר..." /></div>

          {/* Kosher */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">כשרות</label>
            <div className="flex gap-2 max-w-xs">
              {[{ val:true, label:'✡ כשר', color:'#059669', bg:'#F0FDF4', border:'#6EE7B7' }, { val:false, label:'לא כשר', color:'#DC2626', bg:'#FEF2F2', border:'#FECACA' }].map(({ val, label, color, bg, border }) => (
                <label key={String(val)} className="flex-1 cursor-pointer">
                  <input type="radio" name="isKosher" className="sr-only" checked={form.isKosher === val} onChange={() => setForm(p => ({ ...p, isKosher: val }))} />
                  <div className="flex items-center justify-center py-2 px-3 rounded-xl border-2 text-[12px] font-bold transition-all" style={{ background: form.isKosher === val ? bg : '#FAFAFA', borderColor: form.isKosher === val ? border : '#E2E8F0', color: form.isKosher === val ? color : '#94A3B8' }}>{label}</div>
                </label>
              ))}
            </div>
          </div>

          {/* Ventes (salesCount) + Mise en avant (featured) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">מספר מכירות <span className="font-normal text-slate-400">(אוטומטי, ניתן לשנות ידנית)</span></label>
              <input type="number" min="0" value={form.salesCount ?? 0} onChange={set('salesCount')} className="input text-sm" />
              <p className="text-[11px] text-slate-400 mt-1">מתעדכן אוטומטית בכל מכירה. שנה כדי "לקדם" מוצר.</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">מוצר מומלץ</label>
              <button type="button" onClick={() => setForm(p => ({ ...p, isFeatured: !p.isFeatured }))}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border-2 text-[12px] font-bold transition-all ${form.isFeatured ? 'bg-amber-50 border-amber-300 text-amber-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                <Star className={`w-4 h-4 ${form.isFeatured ? 'fill-amber-400' : ''}`} />
                {form.isFeatured ? 'מוצג בהמלצות ⭐' : 'הוסף להמלצות'}
              </button>
              <p className="text-[11px] text-slate-400 mt-1">מקפיץ את המוצר לראש "רבי המכר".</p>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">תגיות <span className="font-normal text-slate-400">(לחיפוש חכם + ברגע האחרון)</span></label>
            <div className="flex flex-wrap gap-2 mb-2">
              {metaTags.map(t => (
                <button type="button" key={t} onClick={() => toggleTag(t)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${form.tags?.includes(t) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}>#{t}</button>
              ))}
              {!showNewTag ? <button type="button" onClick={() => setShowNewTag(true)} className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition-all">+ הוסף</button>
               : <div className="flex gap-1.5"><input value={newTag} onChange={e => setNewTag(e.target.value)} dir="ltr" className="input text-xs px-2 py-1 h-auto w-28" placeholder="tag..." autoFocus /><button type="button" onClick={addTag} className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-white" /></button><button type="button" onClick={() => setShowNewTag(false)} className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center"><X className="w-3.5 h-3.5 text-slate-500" /></button></div>}
            </div>
          </div>

          {/* Variantes — SEUL système couleur/taille/stockage */}
          <VariantsEditor options={options} setOptions={setOptions} variants={variants} setVariants={setVariants} />

          {/* Note */}
          <div><label className="block text-xs font-bold text-slate-500 mb-1.5">הערת מנהל <span className="font-normal text-slate-400">("כדאי לדעת")</span></label><textarea value={note} onChange={e => setNote(e.target.value)} rows={2} dir="rtl" className="input resize-none text-sm" placeholder="לדוגמה: מחיר כולל מתאם ישראלי." /></div>

          {/* Specs */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">מפרט טכני</label>
            <div className="space-y-2 mb-2">
              {specs.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={row.k} onChange={e => setSpecs(prev => prev.map((r, idx) => idx === i ? { ...r, k: e.target.value } : r))} dir="rtl" className="input text-xs flex-1" placeholder="שם" />
                  <input value={row.v} onChange={e => setSpecs(prev => prev.map((r, idx) => idx === i ? { ...r, v: e.target.value } : r))} dir="rtl" className="input text-xs flex-1" placeholder="ערך" />
                  <button type="button" onClick={() => setSpecs(prev => prev.filter((_, idx) => idx !== i))} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setSpecs(prev => [...prev, { k:'', v:'' }])} className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"><Plus className="w-3.5 h-3.5" />הוסף שורה</button>
          </div>

          {/* Sections */}
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">מקטעים — לשוניות מתחת למוצר <span className="font-normal text-slate-400">(תיאור, אחריות, משלוח...)</span></label>
            <div className="space-y-3 mb-2">
              {details.map((sec, i) => (
                <div key={i} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                  <div className="flex gap-2 items-center mb-2">
                    <input value={sec.title} onChange={e => setDetails(prev => prev.map((s,idx)=>idx===i?{...s,title:e.target.value}:s))} dir="rtl" className="input text-sm font-bold flex-1" placeholder="כותרת הלשונית (תיאור, אחריות...)" />
                    <button type="button" onClick={() => setDetails(prev => prev.filter((_,idx)=>idx!==i))} className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center flex-shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                  <textarea value={sec.body} onChange={e => setDetails(prev => prev.map((s,idx)=>idx===i?{...s,body:e.target.value}:s))} rows={3} dir="rtl" className="input resize-none text-sm w-full" placeholder="תוכן הלשונית..." />
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setDetails(prev => [...prev, { title:'', body:'' }])} className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"><Plus className="w-3.5 h-3.5" />הוסף מקטע</button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn btn-primary px-8 py-2.5 text-[14px]">{saving ? 'שומר...' : product ? 'שמור שינויים' : 'צור מוצר'}</button>
            <button type="button" onClick={onClose} className="btn btn-ghost py-2.5 px-5 text-[14px]">ביטול</button>
          </div>
        </form>
      </div>
    </div>
  )
}