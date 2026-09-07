'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react'
import useCartStore from '@/stores/cartStore'
import LastMinuteSection from '@/components/ui/LastMinuteSection'
import settingsService, { computeShipping } from '@/services/settingsService'

export default function CartPage() {
  const items = useCartStore(s => s.items)
  const removeItem = useCartStore(s => s.removeItem)
  const updateQty = useCartStore(s => s.updateQty)
  const lineKey = useCartStore(s => s.lineKey)
  const [settings, setSettings] = useState(null)

  useEffect(() => { settingsService.get().then(setSettings).catch(() => {}) }, [])

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const shipping = settings ? computeShipping(total, settings) : (total >= 500 || total === 0 ? 0 : 30)
  const grandTotal = total + shipping
  const threshold = settings ? Number(settings.freeShippingThreshold) : 500
  const freeEnabled = settings ? settings.freeShippingEnabled : true

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5 text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
          <ShoppingBag className="w-9 h-9 text-slate-300" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">העגלה ריקה</h2>
        <p className="text-slate-400">עדיין לא הוספת מוצרים לעגלה.</p>
        <Link href="/products"><button className="btn btn-primary px-6 py-3">התחל לקנות ←</button></Link>
      </div>
    )
  }

  return (
    <main className="min-h-screen max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 py-8">
      {/* Titre panier mis en valeur */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-9 rounded-full" style={{ background:'linear-gradient(180deg,#E8A882,#CC785C,#9D4B2E)' }} />
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">עגלת קניות <span className="text-primary-600">({items.length})</span></h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {items.map(item => (
            <div key={lineKey(item)} className="bg-white rounded-2xl border border-slate-100 p-3 sm:p-4 flex gap-3 sm:gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0">
                {item.images?.[0]
                  ? <Image src={item.images[0]} alt={item.name} fill sizes="80px" unoptimized className="object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-2xl">📱</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-primary-500 uppercase">{item.brand}</p>
                <Link href={`/products/${item._id}`} className="font-semibold text-slate-800 text-[14px] line-clamp-1 hover:text-primary-600">{item.name}</Link>
                {item.variantLabel && <p className="text-[11px] text-slate-400 mt-0.5">{item.variantLabel}</p>}
                <p className="price-num text-[16px] mt-1">₪{item.price?.toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button onClick={() => removeItem(lineKey(item))} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                  <button onClick={() => updateQty(lineKey(item), item.qty - 1)} className="px-2 py-1 hover:bg-slate-50"><Minus className="w-3 h-3" /></button>
                  <span className="px-3 text-[14px] font-bold">{item.qty}</span>
                  <button onClick={() => updateQty(lineKey(item), item.qty + 1)} className="px-2 py-1 hover:bg-slate-50"><Plus className="w-3 h-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm sticky top-20">
            <h2 className="font-black text-slate-900 mb-4">סיכום הזמנה</h2>
            <div className="space-y-2 text-[14px]">
              <div className="flex justify-between"><span className="text-slate-500">סכום ביניים</span><span className="font-bold">₪{total.toLocaleString()}</span></div>
              <div className="flex justify-between">
                <span className="text-slate-500">משלוח</span>
                <span className="font-bold">{shipping === 0 ? <span className="text-green-600">חינם</span> : `₪${shipping.toLocaleString()}`}</span>
              </div>
              {freeEnabled && shipping > 0 && total < threshold && <p className="text-[12px] text-slate-400">הוסף ₪{(threshold - total).toLocaleString()} למשלוח חינם</p>}
              <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between items-baseline text-[16px]">
                <span className="font-black">סה״כ</span>
                <span className="price-num text-[22px]">₪{grandTotal.toLocaleString()}</span>
              </div>
            </div>
            <Link href="/checkout" className="block mt-6">
              <button className="btn btn-primary w-full py-3.5 justify-center text-[15px]">לתשלום <ArrowLeft className="w-4 h-4" /></button>
            </Link>
            <Link href="/products" className="block mt-2">
              <button className="btn btn-ghost w-full py-2.5 justify-center text-[13px]">המשך בקנייה</button>
            </Link>
          </div>
        </div>
      </div>

      {/* Séparateur + accessoires de dernière minute (après le panier) */}
      <div className="mt-10">
        <LastMinuteSection compact />
      </div>
    </main>
  )
}