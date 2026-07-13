'use client'
import { useState } from 'react'
import { Wallet, Loader2, FlaskConical, ShieldCheck } from 'lucide-react'
import orderService from '@/services/orderService'
import paymentService from '@/services/paymentService'
import toast from 'react-hot-toast'

const IS_TEST = process.env.NEXT_PUBLIC_TEST_MODE === 'true'

export default function PaymentSection({ form, totalTTC, subtotal, vatAmount, shipping = 0, items, agreed, validatePhone, onSuccess }) {
  const [loading, setLoading] = useState(null)

  const validate = () => {
    if (!form.firstName || !form.lastName || !form.email || !form.address || !form.city) { toast.error('יש למלא את כל השדות'); return false }
    if (!validatePhone(form.phone)) { toast.error('מספר טלפון לא תקין'); return false }
    if (!agreed) { toast.error('יש לאשר את תנאי השימוש'); return false }
    return true
  }

  const createOrder = async (paymentMethod, paymentStatus = 'paid') => orderService.create({
    customer: form,
    items: items.map(i => ({ product: i._id, qty: i.qty, price: i.price, name: i.name })),
    subtotal, vat: vatAmount, shipping, total: totalTTC, paymentMethod, paymentStatus,
  })

  const handlePayPal = async () => {
    if (!validate()) return
    setLoading('paypal')
    try {
      sessionStorage.setItem('pending_order', JSON.stringify({ form, totalTTC, subtotal, vatAmount, shipping, items }))
      const data = await paymentService.paypalCreate(
        totalTTC,
        `${window.location.origin}/order-success?payment=paypal`,
        `${window.location.origin}/checkout`
      )
      if (data.approvalUrl) window.location.href = data.approvalUrl
      else { toast.error('שגיאה ביצירת תשלום PayPal'); setLoading(null) }
    } catch { toast.error('שגיאה בחיבור ל-PayPal'); setLoading(null) }
  }

  const handleGrow = async () => {
    if (!validate()) return
    setLoading('grow')
    try {
      // 1) commande pending → orderId (OBLIGATOIRE avant Grow)
      const order = await createOrder('grow', 'pending')
      // 2) lien Grow avec le total COMPLET (produits + livraison)
      const data = await paymentService.growCreate(order._id, totalTTC, form)
      // 3) redirection
      if (data.paymentUrl) window.location.href = data.paymentUrl
      else { toast.error('שגיאה ביצירת דף תשלום'); setLoading(null) }
    } catch { toast.error('שגיאה בחיבור לסליקה'); setLoading(null) }
  }

  const handleTest = async () => {
    if (!validate()) return
    setLoading('test')
    try { await new Promise(r => setTimeout(r, 1000)); await createOrder('test'); toast.success('✅ תשלום בדיקה הצליח!'); onSuccess() }
    catch { toast.error('שגיאה') } finally { setLoading(null) }
  }

  const Spin = ({ col }) => <Loader2 className="w-4 h-4 animate-spin" style={col?{color:col}:{}} />

  return (
    <div className="space-y-2.5">
      {(loading === 'grow' || loading === 'paypal') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-7 w-full max-w-[320px] text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background:'var(--primary-pale)' }}>
              <Loader2 className="w-6 h-6 sm:w-7 sm:h-7 animate-spin" style={{ color:'var(--primary)' }} />
            </div>
            <h3 className="font-black text-slate-800 text-[15px] sm:text-[16px] mb-1.5">מעבירים אותך לתשלום מאובטח</h3>
            <p className="text-[12px] sm:text-[13px] text-slate-500 leading-relaxed">עוד רגע… אנחנו מכינים את דף התשלום שלך. אל תסגור את החלון.</p>
            <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />תשלום מוצפן ומאובטח
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">בחר אמצעי תשלום</p>
      <button onClick={handlePayPal} disabled={!!loading} type="button" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] transition-all hover:opacity-90 hover:shadow-md disabled:opacity-40" style={{ background:'#FFC439', color:'#003087' }}>
        {loading==='paypal' ? <Spin col="#003087" /> : <><svg viewBox="0 0 24 24" className="h-4 w-4" fill="#003087"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z"/></svg>PayPal</>}
      </button>
      <button onClick={handleGrow} disabled={!!loading} type="button" className="w-full flex flex-col items-center justify-center gap-0.5 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 hover:shadow-md disabled:opacity-40" style={{ background:'linear-gradient(135deg,var(--primary),var(--primary-deep))' }}>
        {loading==='grow' ? <Spin /> : (
          <>
            <span className="flex items-center gap-2 text-[14px]"><Wallet className="w-4 h-4" />המשך לתשלום מאובטח</span>
            <span className="text-[10px] font-medium opacity-90">אשראי · Bit · Google Pay · Apple Pay</span>
          </>
        )}
      </button>
      {!loading && (
        <p className="text-[10px] text-slate-400 text-center leading-4">בעמוד הבא תוכל לבחור את אמצעי התשלום המועדף עליך</p>
      )}
      {IS_TEST && (
        <button onClick={handleTest} disabled={!!loading} type="button" className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[12px] bg-amber-50 border-2 border-dashed border-amber-300 text-amber-700 hover:bg-amber-100 transition-all disabled:opacity-40">
          {loading==='test' ? <Spin col="#B45309" /> : <><FlaskConical className="w-3.5 h-3.5" />בדיקה — ללא תשלום</>}
        </button>
      )}
    </div>
  )
}