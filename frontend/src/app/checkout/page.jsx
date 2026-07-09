'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Phone, MessageSquare, FlaskConical, Check, ShieldCheck } from 'lucide-react'
import useCartStore from '@/stores/cartStore'
import useAuthStore from '@/stores/authStore'
import PaymentSection from '@/components/checkout/PaymentSection'
import AddressAutocomplete from '@/components/checkout/AddressAutocomplete'
import Field from '@/components/common/Field'
import settingsService, { computeShipping } from '@/services/settingsService'
import toast from 'react-hot-toast'

const TEST_DATA = { firstName:'David', lastName:'Maimoun', email:'davidmaimoun@hotmail.com', phone:'0501234567', street:'הרצל', houseNumber:'12', apartment:'', city:'תל אביב', notes:'Test' }

function validatePhone(phone) { const d = phone.replace(/\D/g, ''); return d.length >= 9 && d.length <= 10 }

export default function CheckoutPage() {
  const items = useCartStore(s => s.items)
  const clearCart = useCartStore(s => s.clearCart)
  const user = useAuthStore(s => s.user)
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState({
    firstName: user?.name?.split(' ')[0] || '', lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '', phone:'', street:'', houseNumber:'', apartment:'', city:'', notes:'',
  })
  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  // Sélection d'une suggestion d'autocomplete → remplit rue/ville (numéro laissé à l'utilisateur si absent)
  const handleAddressSelect = (s) => {
    setForm(p => ({
      ...p,
      street: s.street || p.street,
      city: s.city || p.city,
      houseNumber: s.houseNumber || p.houseNumber,
    }))
  }

  // Adresse complète composée pour l'envoi à l'API (compatible avec le format existant côté backend)
  const composedAddress = [form.street, form.houseNumber].filter(Boolean).join(' ') + (form.apartment ? `, דירה ${form.apartment}` : '')
  const formForPayment = { ...form, address: composedAddress }

  // Charge les settings (TVA, livraison) depuis l'API
  useEffect(() => { settingsService.get().then(setSettings).catch(() => {}) }, [])

  const fillTestData = () => {
    setForm(TEST_DATA)
    setAgreed(true)
    toast.success('הטופס מולא — לחץ על אמצעי תשלום')
  }

  // ── Calculs (les prix produits sont TTC) ──
  const productsTotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const vatRate = settings ? Number(settings.vatRate) / 100 : 0.18
  const shipping = settings ? computeShipping(productsTotal, settings) : 0
  const totalTTC = productsTotal + shipping                       // ← MONTANT PAYÉ (produits + livraison)
  const subtotal = Math.round(productsTotal / (1 + vatRate))      // HT (indicatif)
  const vatAmount = productsTotal - subtotal                      // TVA comprise (indicatif)

  const handlePaymentSuccess = async () => { clearCart(); router.push('/order-success') }

  if (items.length === 0) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <p className="text-slate-500">העגלה ריקה</p>
      <button onClick={() => router.push('/products')} className="btn btn-primary px-6 py-3">לחנות ←</button>
    </div>
  )

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-black text-2xl text-slate-900">פרטי הזמנה</h1>
        <button onClick={fillTestData} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"><FlaskConical className="w-3.5 h-3.5" />מלא טופס בדיקה</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {!user && <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 text-[13px] text-primary-700 font-medium">💡 ניתן לרכוש גם בלי חשבון</div>}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <h2 className="font-bold text-slate-800 text-[16px]">פרטים אישיים</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="שם פרטי" icon={User} type="text" value={form.firstName} onChange={set('firstName')} required placeholder="ישראל" />
              <Field label="שם משפחה" type="text" value={form.lastName} onChange={set('lastName')} required placeholder="ישראלי" />
            </div>
            <Field label="אימייל" icon={Mail} type="email" value={form.email} onChange={set('email')} required placeholder="your@email.com" />
            <div>
              <Field label="טלפון" icon={Phone} type="tel" value={form.phone} onChange={set('phone')} required placeholder="050-0000000" />
              <p className="text-[11px] text-slate-400 mt-1">9-10 ספרות (כולל קידומת)</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <h2 className="font-bold text-slate-800 text-[16px]">כתובת למשלוח</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <AddressAutocomplete label="רחוב" value={form.street} onChange={(val) => setForm(p => ({ ...p, street: val }))} onSelect={handleAddressSelect} required placeholder="הרצל" />
              </div>
              <Field label="מספר בית" type="text" inputMode="numeric" value={form.houseNumber} onChange={set('houseNumber')} required placeholder="12" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="עיר" type="text" value={form.city} onChange={set('city')} required placeholder="תל אביב" />
              <Field label="דירה / קומה (אופציונלי)" type="text" value={form.apartment} onChange={set('apartment')} placeholder="דירה 4, קומה 2" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-slate-600 mb-1.5">הערות</label>
              <div className="relative">
                <textarea value={form.notes} onChange={set('notes')} rows={3} dir="rtl" placeholder="הערות אופציונליות..." className="input pr-10 resize-none w-full" style={{minHeight:80}} />
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            <h2 className="font-black text-[16px] text-slate-800 mb-4">סיכום הזמנה</h2>
            <div className="space-y-2 mb-4">
              {items.map(i => <div key={i._id} className="flex justify-between text-[12px]"><span className="text-slate-500 flex-1 line-clamp-1">{i.name} ×{i.qty}</span><span className="font-semibold mr-2">₪{(i.price*i.qty).toLocaleString()}</span></div>)}
            </div>
            <div className="border-t border-slate-100 pt-3 space-y-1.5 mb-4">
              <div className="flex justify-between text-[12px] text-slate-500"><span>סכום ביניים</span><span>₪{productsTotal.toLocaleString()}</span></div>
              <div className="flex justify-between text-[12px] text-slate-500">
                <span>משלוח</span>
                <span>{shipping === 0 ? <span className="text-green-600 font-semibold">חינם</span> : `₪${shipping.toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between text-[12px] text-slate-400"><span>מתוכם מע״מ</span><span>₪{vatAmount.toLocaleString()}</span></div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100"><span className="font-black text-[15px] text-slate-800">סה"כ</span><span className="price-num text-primary-600" style={{fontSize:22}}>₪{totalTTC.toLocaleString()}</span></div>
            </div>
            <PaymentSection form={formForPayment} totalTTC={totalTTC} vatAmount={vatAmount} subtotal={subtotal} shipping={shipping} items={items} agreed={agreed} validatePhone={validatePhone} onSuccess={handlePaymentSuccess} />
          </div>
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <label className="flex gap-3 cursor-pointer">
              <div className="flex-shrink-0 mt-0.5">
                <div onClick={() => setAgreed(v => !v)} className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${agreed ? 'bg-primary-600 border-primary-600' : 'border-slate-300 bg-white'}`}>{agreed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}</div>
              </div>
              <p className="text-[11.5px] text-slate-600 leading-relaxed">קראתי והסכמתי ל<a href="/terms" className="text-primary-600 underline mx-0.5">תנאי שימוש</a> ול<a href="/privacy" className="text-primary-600 underline">מדיניות הפרטיות</a>. הפרטים יישמרו לצורך טיפול בהזמנה ומתן שירות.</p>
            </label>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400"><ShieldCheck className="w-3.5 h-3.5 text-green-500" />תשלום מאובטח · SSL מוצפן</div>
        </div>
      </div>
    </div>
  )
}