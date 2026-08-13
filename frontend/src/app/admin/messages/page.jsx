'use client'
import { useState, useEffect } from 'react'
import { Mail, MailOpen, Trash2, Phone, Circle } from 'lucide-react'
import api from '@/services/api'
import toast from 'react-hot-toast'

const ADMIN_EMAIL = 'tataphone.team@gmail.com'

export default function AdminMessages() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('unread')   // 'unread' | 'read' | 'all' — défaut non-lu

  const load = () => api.get('/contact/messages')
    .then(r => { const d = r.data; setMessages(Array.isArray(d) ? d : (d.messages || [])) })
    .catch(() => {}).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const unreadCount = messages.filter(m => !m.read).length
  const readCount = messages.filter(m => m.read).length

  // Bascule lu ↔ non-lu (comme une vraie boîte mail)
  const setRead = async (id, read) => {
    setMessages(prev => prev.map(m => m._id === id ? { ...m, read } : m))
    try {
      await api.put(`/contact/messages/${id}/read`, { read })
      window.dispatchEvent(new Event('messages-updated'))
    } catch {
      setMessages(prev => prev.map(m => m._id === id ? { ...m, read: !read } : m))  // rollback
      toast.error('שגיאה')
    }
  }

  const openMail = (m) => {
    if (!m.read) setRead(m._id, true)
    window.location.href = `mailto:${m.email}?subject=${encodeURIComponent('תגובה לפנייתך — טאטעפון')}`
  }

  const remove = async (id) => {
    if (!confirm('למחוק את ההודעה?')) return
    try {
      await api.delete(`/contact/messages/${id}`)
      setMessages(prev => prev.filter(m => m._id !== id))
      window.dispatchEvent(new Event('messages-updated'))
      toast.success('נמחק')
    } catch { toast.error('שגיאה') }
  }

  const filtered = messages.filter(m =>
    filter === 'all' ? true : filter === 'unread' ? !m.read : m.read
  )

  const FILTERS = [
    { k: 'unread', l: `לא נקראו (${unreadCount})` },
    { k: 'read',   l: `נקראו (${readCount})` },
    { k: 'all',    l: `הכל (${messages.length})` },
  ]

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-slate-900 mb-1">
          הודעות {unreadCount > 0 && <span className="text-primary-600">({unreadCount})</span>}
        </h1>
        <p className="text-[13px] text-slate-400">📧 ההודעות מתקבלות גם במייל: <span className="font-semibold text-slate-500" dir="ltr">{ADMIN_EMAIL}</span></p>
      </div>

      {/* Filtres lu / non-lu / tous */}
      <div className="flex gap-2 mb-5">
        {FILTERS.map(({ k, l }) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3.5 py-2 rounded-xl text-[13px] font-bold border transition-all ${filter===k ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'}`}>{l}</button>
        ))}
      </div>

      {loading ? <p className="text-slate-400">טוען...</p>
       : filtered.length === 0 ? <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center text-slate-400"><Mail className="w-10 h-10 mx-auto mb-2 text-slate-200" />{filter === 'unread' ? 'אין הודעות שלא נקראו 🎉' : 'אין הודעות'}</div>
       : (
        <div className="space-y-3">
          {filtered.map(m => (
            <div key={m._id}
              className={`rounded-2xl border p-5 transition-all ${m.read ? 'bg-white border-slate-100' : 'bg-primary-50/40 border-primary-200 shadow-sm'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2.5">
                  {/* Indicateur lu (vert) / non-lu (rouge) — cliquable pour basculer */}
                  <button onClick={() => setRead(m._id, !m.read)} className="mt-1 flex-shrink-0" title={m.read ? 'סמן כלא נקרא' : 'סמן כנקרא'}>
                    <Circle className={`w-3 h-3 ${m.read ? 'text-emerald-500 fill-emerald-500' : 'text-red-500 fill-red-500'}`} />
                  </button>
                  <div>
                    <p className={`text-slate-800 ${m.read ? 'font-semibold' : 'font-black'}`}>{m.name}</p>
                    <div className="flex items-center gap-3 text-[12px] text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1" dir="ltr"><Mail className="w-3 h-3" />{m.email}</span>
                      {m.phone && <span className="flex items-center gap-1" dir="ltr"><Phone className="w-3 h-3" />{m.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openMail(m)} className="icon-btn w-8 h-8 text-slate-400 hover:text-primary-600 hover:bg-primary-50" title="השב במייל">
                    <MailOpen className="w-4 h-4" />
                  </button>
                  <button onClick={() => remove(m._id)} className="icon-btn w-8 h-8 text-slate-300 hover:text-red-500 hover:bg-red-50" title="מחק">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-[14px] text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3">{m.message}</p>
              {m.createdAt && <p className="text-[11px] text-slate-300 mt-2">{new Date(m.createdAt).toLocaleString('he-IL')}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}