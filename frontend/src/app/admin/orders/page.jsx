'use client'
import { useState, useEffect } from 'react'
import { Mail, Search, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, AlertTriangle } from 'lucide-react'
import orderService from '@/services/orderService'
import useAuthStore from '@/stores/authStore'
import toast from 'react-hot-toast'
import { ORDER_STATUSES, statusLabel, statusStyle, normalizeStatus } from '@/utils/orderStatus'

// Numéro de commande affiché : séquentiel (#1001) si dispo, sinon fallback sur l'ID court.
function orderRef(o) {
  return o.orderNumber ? `#${o.orderNumber}` : o._id?.slice(-6).toUpperCase()
}

function fmtDateOnly(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('he-IL', { day:'2-digit', month:'2-digit', year:'2-digit' }) }
  catch { return '—' }
}
function fmtTimeOnly(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleTimeString('he-IL', { hour:'2-digit', minute:'2-digit' }) }
  catch { return '—' }
}

const PER_PAGE_OPTIONS = [25, 50, 100, 'all']

export default function AdminOrders() {
  const logout = useAuthStore(s => s.logout)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [sendingInvoice, setSendingInvoice] = useState(null)

  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')

  const [perPage, setPerPage] = useState(50)
  const [page, setPage] = useState(1)

  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    orderService.getAll()
      .then(d => { setOrders(d.orders || (Array.isArray(d) ? d : [])); setError(null) })
      .catch(err => {
        const status = err?.response?.status
        if (status === 401 || status === 422) { logout(); window.location.href = '/login' }
        else { setError('שגיאה בטעינת הזמנות'); toast.error('שגיאה בטעינת הזמנות') }
      })
      .finally(() => setLoading(false))
  }, [])

  const updateStatus = async (id, status) => {
    try {
      await orderService.updateStatus(id, status)
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o))
      toast.success('סטטוס עודכן')
    } catch { toast.error('שגיאה בעדכון סטטוס') }
  }

  const sendInvoice = async (id) => {
    setSendingInvoice(id)
    try { await orderService.sendInvoice(id); toast.success('סיכום נשלח! 📧') }
    catch { toast.error('שגיאה') } finally { setSendingInvoice(null) }
  }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await orderService.delete(toDelete._id)
      setOrders(prev => prev.filter(o => o._id !== toDelete._id))
      toast.success('ההזמנה הועברה לארכיון')
      setToDelete(null)
    } catch { toast.error('שגיאה במחיקה') } finally { setDeleting(false) }
  }

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir(col === 'createdAt' || col === 'total' ? 'desc' : 'asc') }
  }

  const filtered = orders.filter(o => {
    const q = search.toLowerCase()
    const c = o.customer || {}
    const matchSearch = !q || `${c.firstName||''} ${c.lastName||''}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) || c.phone?.includes(q) ||
      o._id?.includes(q) || String(o.orderNumber||'').includes(q)
    return matchSearch && (filterStatus === 'all' || normalizeStatus(o.status) === filterStatus)
  })

  const sorted = [...filtered].sort((a, b) => {
    let av, bv
    switch (sortBy) {
      case 'ref':      av = a.orderNumber || 0; bv = b.orderNumber || 0; break
      case 'customer': av = `${a.customer?.firstName||''}`.toLowerCase(); bv = `${b.customer?.firstName||''}`.toLowerCase(); break
      case 'total':    av = a.total || 0; bv = b.total || 0; break
      case 'status':   av = normalizeStatus(a.status); bv = normalizeStatus(b.status); break
      default:         av = new Date(a.createdAt || 0).getTime(); bv = new Date(b.createdAt || 0).getTime()
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const isAll = perPage === 'all'
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(sorted.length / perPage))
  const curPage = Math.min(page, totalPages)
  const paged = isAll ? sorted : sorted.slice((curPage - 1) * perPage, curPage * perPage)

  const totalRev = orders.filter(o => normalizeStatus(o.status) !== 'cancelled').reduce((s,o) => s + (o.total||0), 0)

  const SortTh = ({ col, label, center }) => (
    <th className={`py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-wide cursor-pointer select-none hover:text-primary-600 transition-colors ${center ? 'text-center' : 'text-right'}`}
        onClick={() => toggleSort(col)}>
      <span className={`inline-flex items-center gap-1 ${center ? 'justify-center' : ''}`}>
        {label}
        {sortBy === col
          ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
          : <ChevronsUpDown className="w-3 h-3 opacity-30" />}
      </span>
    </th>
  )

  if (error) return <div className="p-8 text-center text-slate-400"><p className="text-5xl mb-4">⚠️</p><p className="font-semibold">{error}</p></div>

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 mb-1">הזמנות</h1>
        <p className="text-sm text-slate-400">{orders.length} הזמנות · הכנסות: ₪{totalRev.toLocaleString()}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pr-10" placeholder="חיפוש לקוח, אימייל, מספר הזמנה..." />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{k:'all',l:'הכל'}, ...ORDER_STATUSES.map(s=>({k:s,l:statusLabel(s)}))].map(({ k, l }) => (
            <button key={k} onClick={() => { setFilterStatus(k); setPage(1) }}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${filterStatus===k ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-[12px] text-slate-400">הצג:</span>
        {PER_PAGE_OPTIONS.map(n => (
          <button key={n} onClick={() => { setPerPage(n); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${perPage === n ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-primary-300'}`}>
            {n === 'all' ? 'הכל' : n}
          </button>
        ))}
        <span className="text-[12px] text-slate-400 mr-auto">{sorted.length} תוצאות</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="border-b border-slate-100 bg-slate-50/60">
            <tr>
              <SortTh col="ref" label="#" />
              <SortTh col="createdAt" label="תאריך" />
              <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-wide text-right">שעה</th>
              <SortTh col="customer" label="לקוח" />
              <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-wide text-right">פרטי קשר</th>
              <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-wide text-center">פריטים</th>
              <SortTh col="total" label="סכום" />
              <SortTh col="status" label="סטטוס" />
              <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-wide text-center">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({length:5}).map((_,i) => (
              <tr key={i} className="border-b border-slate-50 animate-pulse">{Array.from({length:9}).map((_,j) => <td key={j} className="py-3 px-4"><div className="h-4 bg-slate-100 rounded w-16"/></td>)}</tr>
            )) : paged.length === 0 ? (
              <tr><td colSpan={9} className="py-16 text-center text-slate-400">לא נמצאו הזמנות</td></tr>
            ) : paged.map(o => {
              const c = o.customer || {}
              const st = statusStyle(o.status)
              const cur = normalizeStatus(o.status)
              return (
                <>
                  <tr key={o._id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => setExpanded(expanded === o._id ? null : o._id)}>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-500 font-bold">{orderRef(o)}{o.isTest && <span className="block text-[9px] text-amber-500 font-bold">TEST</span>}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">{fmtDateOnly(o.createdAt)}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">{fmtTimeOnly(o.createdAt)}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{c.firstName} {c.lastName}</td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs"><p>{c.email}</p><p>{c.phone}</p></td>
                    <td className="py-3.5 px-4 text-slate-500 text-center">{o.items?.length}</td>
                    <td className="py-3.5 px-4 text-primary-600">₪{o.total?.toLocaleString()}</td>
                    <td className="py-3.5 px-4">
                      <select value={cur} onClick={e=>e.stopPropagation()} onChange={e=>updateStatus(o._id,e.target.value)}
                        className="text-xs font-bold rounded-xl px-3 py-1.5 border-0 outline-none cursor-pointer" style={{ background:st.bg, color:st.color }}>
                        {ORDER_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
                      </select>
                    </td>
                    <td className="py-3.5 px-4" onClick={e=>e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={()=>sendInvoice(o._id)} disabled={sendingInvoice===o._id} className="icon-btn w-8 h-8 disabled:opacity-50" title="שלח סיכום">
                          {sendingInvoice===o._id
                            ? <svg className="animate-spin w-3.5 h-3.5 text-primary-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                            : <Mail className="w-3.5 h-3.5"/>}
                        </button>
                        <button onClick={()=>setToDelete(o)} className="icon-btn w-8 h-8 text-slate-300 hover:text-red-500 hover:bg-red-50" title="מחק הזמנה">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === o._id && (
                    <tr key={`${o._id}-exp`} className="bg-primary-50/40">
                      <td colSpan={9} className="px-8 py-3">
                        <p className="text-xs font-bold text-slate-500 mb-2">פירוט:</p>
                        <div className="flex flex-wrap gap-2">
                          {(o.items||[]).map((item,i) => (
                            <div key={i} className="bg-white rounded-xl px-3 py-2 text-xs border border-slate-100">
                              <span className="font-semibold">{item.name||item.product}</span>
                              <span className="text-slate-400 mr-2">×{item.qty}</span>
                              <span className="text-primary-600 mr-1">₪{(item.price*item.qty).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                        {c.address && <p className="text-xs text-slate-400 mt-2">📍 {c.address}, {c.city}</p>}
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {!isAll && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={curPage === 1}
            className="px-3 py-1.5 rounded-lg text-[12px] font-bold bg-white border border-slate-200 text-slate-500 disabled:opacity-40 hover:border-primary-300">→ הקודם</button>
          <span className="text-[12px] text-slate-500 font-bold">עמוד {curPage} מתוך {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={curPage === totalPages}
            className="px-3 py-1.5 rounded-lg text-[12px] font-bold bg-white border border-slate-200 text-slate-500 disabled:opacity-40 hover:border-primary-300">הבא ←</button>
        </div>
      )}

      {toDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !deleting && setToDelete(null)}>
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-black text-slate-900">מחיקת הזמנה {orderRef(toDelete)}</h3>
                <p className="text-[12px] text-slate-400">{toDelete.customer?.firstName} {toDelete.customer?.lastName} · ₪{toDelete.total?.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-[13px] text-slate-600 leading-6 mb-5">
              ההזמנה תועבר לארכיון (ניתן לשחזר). היא לא תופיע יותר ברשימה. להמשיך?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setToDelete(null)} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50">ביטול</button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> : <Trash2 className="w-4 h-4" />}
                מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}