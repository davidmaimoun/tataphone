'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingCart, Trash2, ArrowLeft, Plus, Minus } from 'lucide-react'
import useCartStore from '@/stores/cartStore'
import useCartUiStore from '@/stores/cartUiStore'

export default function CartDrawer() {
  const open = useCartUiStore(s => s.open)
  const close = useCartUiStore(s => s.closeCart)
  const items = useCartStore(s => s.items)
  const removeItem = useCartStore(s => s.removeItem)
  const updateQty = useCartStore(s => s.updateQty)
  const lineKey = useCartStore(s => s.lineKey)

  const total = items.reduce((s, i) => s + i.price * i.qty, 0)
  const count = items.reduce((s, i) => s + i.qty, 0)

  // lock scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={close} className="fixed inset-0 bg-black/40 z-[60]" />
          {/* RTL: panel slides in from the LEFT */}
          <motion.aside initial={{ x:'-100%' }} animate={{ x:0 }} exit={{ x:'-100%' }}
            transition={{ type:'tween', duration:0.28, ease:[0.4,0,0.2,1] }}
            className="fixed top-0 left-0 h-full w-full max-w-[400px] bg-white z-[61] shadow-2xl flex flex-col" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary-600" />
                <h2 className="font-black text-slate-900 text-[17px]">העגלה שלך</h2>
                {count > 0 && <span className="text-[12px] font-bold text-white bg-primary-600 rounded-full px-2 py-0.5">{count}</span>}
              </div>
              <button onClick={close} className="icon-btn w-9 h-9"><X className="w-4 h-4" /></button>
            </div>

            {/* Items */}
            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center"><ShoppingCart className="w-7 h-7 text-slate-300" /></div>
                <p className="text-slate-400">העגלה ריקה</p>
                <button onClick={close} className="btn btn-primary px-6 py-2.5 mt-1">המשך לקנות</button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-2 overscroll-contain">
                  {items.map(item => (
                    <div key={item._id} className="flex gap-3 items-center bg-slate-50 rounded-2xl p-2.5">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-white flex-shrink-0">
                        {item.images?.[0] ? <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">📱</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 line-clamp-1">{item.name}</p>
                        <p className="price-num text-[14px] mt-0.5">₪{(item.price * item.qty).toLocaleString()}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
                            <button onClick={() => updateQty(lineKey(item), item.qty - 1)} className="px-2 py-0.5 text-slate-500 hover:bg-slate-50"><Minus className="w-3 h-3" /></button>
                            <span className="px-2 text-[13px] font-bold">{item.qty}</span>
                            <button onClick={() => updateQty(lineKey(item), item.qty + 1)} className="px-2 py-0.5 text-slate-500 hover:bg-slate-50"><Plus className="w-3 h-3" /></button>
                          </div>
                          <button onClick={() => removeItem(lineKey(item))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Footer */}
                <div className="border-t border-slate-100 p-4 space-y-2.5 flex-shrink-0" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-700">סה"כ</span>
                    <span className="price-num text-[22px]">₪{total.toLocaleString()}</span>
                  </div>
                  <Link href="/cart" onClick={close}><button className="btn btn-ghost w-full py-2.5">צפה בעגלה</button></Link>
                  <Link href="/checkout" onClick={close}><button className="btn btn-primary w-full py-3">לתשלום <ArrowLeft className="w-4 h-4" /></button></Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
