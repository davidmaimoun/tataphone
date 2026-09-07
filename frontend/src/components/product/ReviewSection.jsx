'use client'
import { useState, useEffect } from 'react'
import { Star, MessageSquarePlus, CheckCircle, PenLine } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '@/services/api'
import useAuthStore from '@/stores/authStore'
import toast from 'react-hot-toast'

const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('he-IL') } catch { return '' } }

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => onChange(s)} className="transition-transform hover:scale-110">
          <Star className="w-7 h-7 transition-colors" style={{ fill: s <= (hover || value) ? '#F59E0B' : 'transparent', color: s <= (hover || value) ? '#F59E0B' : '#CBD5E1' }} />
        </button>
      ))}
    </div>
  )
}

function ReviewCard({ review, onDelete, canDelete }) {
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-black text-sm flex-shrink-0">{review.name?.charAt(0) || '?'}</div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-[14px] text-slate-800">{review.name}</p>
              {review.verified && <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />רכישה מאומתת</span>}
            </div>
            <p className="text-[11px] text-slate-400">{fmtDate(review.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5" style={{ fill: s <= review.rating ? '#F59E0B' : 'transparent', color: s <= review.rating ? '#F59E0B' : '#CBD5E1' }} />)}</div>
          {canDelete && <button onClick={() => onDelete(review._id)} className="text-[11px] text-red-400 hover:text-red-600 transition-colors">מחק</button>}
        </div>
      </div>
      {review.title && <p className="font-bold text-[13px] text-slate-800 mb-1">{review.title}</p>}
      <p className="text-[13px] text-slate-600 leading-relaxed">{review.body}</p>
    </motion.div>
  )
}

export default function ReviewSection({ productId }) {
  const user = useAuthStore(s => s.user)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ rating: 5, title: '', body: '', name: '' })

  useEffect(() => {
    if (!productId) return
    api.get(`/reviews/?productId=${productId}`).then(r => setReviews(r.data.reviews || [])).catch(() => {}).finally(() => setLoading(false))
  }, [productId])

  const avg = reviews.length ? (reviews.reduce((s,r) => s+r.rating, 0) / reviews.length) : 0
  const dist = [5,4,3,2,1].map(s => ({ s, count: reviews.filter(r => r.rating === s).length }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.body.trim()) return toast.error('אנא כתוב ביקורת')
    setSaving(true)
    try {
      const res = await api.post('/reviews/', { ...form, productId })
      setReviews(prev => [res.data, ...prev]); setShowForm(false); setForm({ rating: 5, title: '', body: '', name: '' })
      toast.success('הביקורת נשלחה! תודה 🙏')
    } catch (err) { toast.error(err?.response?.data?.error || 'שגיאה בשליחת הביקורת') } finally { setSaving(false) }
  }

  const deleteReview = async (id) => {
    if (!confirm('למחוק את הביקורת?')) return
    await api.delete(`/reviews/${id}`)
    setReviews(prev => prev.filter(r => r._id !== id)); toast.success('הביקורת נמחקה')
  }

  return (
    <div className="mt-4 rounded-3xl p-6 sm:p-8" style={{ background:'radial-gradient(ellipse 80% 100% at 100% 0%, rgba(204,120,92,0.06), transparent 70%)' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-[5px] h-11 rounded-full" style={{ background:'linear-gradient(180deg,#E8A882,#CC785C,#9D4B2E)' }} />
          <div>
            <h2 className="font-black text-2xl text-slate-900">ביקורות לקוחות</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">{reviews.length > 0 ? `${reviews.length} ביקורות · ממוצע ${avg.toFixed(1)} מתוך 5` : 'מה הלקוחות אומרים'}</p>
          </div>
        </div>
        {user ? (
          <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-bold transition-all hover:shadow-md hover:-translate-y-0.5"><PenLine className="w-3.5 h-3.5" />כתוב ביקורת</button>
        ) : (
          <a href="/login"><button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700 text-[13px] font-bold transition-all"><PenLine className="w-3.5 h-3.5" />התחבר כדי לכתוב ביקורת</button></a>
        )}
      </div>

      {reviews.length > 0 && (
        <div className="bg-slate-50 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row gap-6 items-center">
          <div className="text-center flex-shrink-0">
            <p className="text-5xl font-black text-slate-900">{avg.toFixed(1)}</p>
            <div className="flex gap-0.5 justify-center my-1.5">{[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4" style={{ fill: s <= Math.round(avg) ? '#F59E0B' : 'transparent', color: s <= Math.round(avg) ? '#F59E0B' : '#CBD5E1' }} />)}</div>
            <p className="text-[12px] text-slate-400">{reviews.length} ביקורות</p>
          </div>
          <div className="flex-1 w-full space-y-1.5">
            {dist.map(({ s, count }) => (
              <div key={s} className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-slate-500 w-4 text-left">{s}</span>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 flex-shrink-0" />
                <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden"><div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: reviews.length ? `${(count/reviews.length)*100}%` : '0%' }} /></div>
                <span className="text-[11px] text-slate-400 w-4">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden mb-6">
            <form onSubmit={submit} className="bg-primary-50 border border-primary-100 rounded-2xl p-5 space-y-4">
              <h3 className="font-bold text-slate-800">כתוב ביקורת</h3>
              <div><label className="text-[12px] font-bold text-slate-500 mb-1.5 block">דירוג *</label><StarPicker value={form.rating} onChange={v => setForm(p => ({...p, rating: v}))} /></div>
              {!user && <div><label className="text-[12px] font-bold text-slate-500 mb-1 block">שמך</label><input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} dir="rtl" placeholder="ישראל ישראלי" className="input text-sm w-full" /></div>}
              <div><label className="text-[12px] font-bold text-slate-500 mb-1 block">כותרת (אופציונלי)</label><input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} dir="rtl" placeholder="סיכום קצר..." className="input text-sm w-full" /></div>
              <div><label className="text-[12px] font-bold text-slate-500 mb-1 block">הביקורת שלך *</label><textarea value={form.body} onChange={e => setForm(p => ({...p, body: e.target.value}))} rows={4} dir="rtl" required placeholder="שתף את החוויה שלך עם המוצר..." className="input resize-none text-sm w-full" /></div>
              <div className="flex gap-3"><button type="submit" disabled={saving} className="btn btn-primary px-6 py-2 text-[13px]">{saving ? 'שולח...' : 'שלח ביקורת'}</button><button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost px-4 py-2 text-[13px]">ביטול</button></div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">{Array.from({length:2}).map((_,i) => <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse h-28" />)}</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10 text-slate-400"><MessageSquarePlus className="w-10 h-10 mx-auto mb-3 text-slate-200" /><p className="font-bold text-slate-500 mb-1">אין ביקורות עדיין</p><p className="text-[13px] text-slate-400">היה הראשון לשתף את החוויה שלך עם המוצר</p></div>
      ) : (
        <div className="space-y-3">{reviews.map(r => <ReviewCard key={r._id} review={r} canDelete={user && (user.role === 'admin' || user._id === r.userId)} onDelete={deleteReview} />)}</div>
      )}
    </div>
  )
}