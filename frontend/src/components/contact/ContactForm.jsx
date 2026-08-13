'use client'
import { useState } from 'react'
import { Send } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/services/api'

export default function ContactForm() {
  const [form, setForm] = useState({ name:'', email:'', phone:'', message:'' })
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      await api.post('/contact/', form)
      toast.success('הודעתך נשלחה! נחזור אליך בהקדם 🙏')
      setForm({ name:'', email:'', phone:'', message:'' })
    } catch { toast.error('שגיאה בשליחה, נסה שנית') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="lg:col-span-3 lg:order-1 bg-white rounded-2xl border border-slate-100 p-8 shadow-[0_4px_16px_rgba(0,0,0,0.05)] space-y-5">
      <h2 className="font-black text-[22px] text-slate-900 mb-2">שלח לנו הודעה</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">שם מלא</label>
          <input type="text" value={form.name} onChange={set('name')} required className="input" dir="rtl" placeholder="ישראל ישראלי" />
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">טלפון</label>
          <input type="tel" value={form.phone} onChange={set('phone')} className="input" dir="rtl" placeholder="050-0000000" />
        </div>
      </div>
      <div>
        <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">אימייל</label>
        <input type="email" value={form.email} onChange={set('email')} required className="input" dir="rtl" placeholder="your@email.com" />
      </div>
      <div>
        <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">הודעה</label>
        <textarea value={form.message} onChange={set('message')} required rows={5} dir="rtl" className="input resize-none" placeholder="כתוב כאן את הודעתך..." style={{ minHeight:130 }} />
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary w-full py-3 text-[15px] justify-center">
        <Send className="w-4 h-4" />{loading ? 'שולח...' : 'שלח הודעה'}
      </button>
    </form>
  )
}