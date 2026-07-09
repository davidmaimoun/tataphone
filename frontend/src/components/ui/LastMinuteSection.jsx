'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShoppingCart, Check, Zap, ArrowLeft } from 'lucide-react'
import useCartStore from '@/stores/cartStore'
import productService from '@/services/productService'
import toast from 'react-hot-toast'

function scoreAccessory(acc, cartItems) {
  if (!acc.tags?.length) return 1
  const cartTags = new Set(cartItems.flatMap(i => i.tags || []))
  const overlap = acc.tags.filter(t => cartTags.has(t)).length
  return overlap > 0 ? overlap + 10 : 1
}

function MiniCard({ product, index }) {
  const addItem = useCartStore(s => s.addItem)
  const [added, setAdded] = useState(false)
  const { _id, name, brand, price, originalPrice, images = [] } = product
  const img = images[0]
  const discPct = originalPrice > price ? Math.round((1 - price/originalPrice)*100) : 0
  const handleAdd = (e) => { e.preventDefault(); e.stopPropagation(); addItem(product); toast.success(`${name} נוסף! 🛒`); setAdded(true); setTimeout(() => setAdded(false), 1600) }
  return (
    <motion.div initial={{opacity:0,x:8}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:index*0.04}}>
      <Link href={`/products/${_id}`} className="group block">
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-3 p-3" style={{direction:'rtl'}}>
          <div className="relative flex-shrink-0 bg-slate-50 rounded-lg overflow-hidden" style={{width:64,height:64}}>
            {img ? <img src={img} alt={name} loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200"><span className="font-rubik font-black text-slate-300 text-[10px] text-center leading-tight">טאטע<br/>פון</span></div>}
            {discPct > 0 && <span className="absolute top-0.5 left-0.5 text-[8px] font-black px-1 py-0.5 rounded-full text-white leading-none" style={{background:'#DC2626'}}>−{discPct}%</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-primary-500 mb-0.5">{brand}</p>
            <p className="text-[12px] font-semibold text-slate-800 line-clamp-2 leading-snug mb-1">{name}</p>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-primary-600 text-[14px]">₪{price?.toLocaleString()}</span>
              {originalPrice > price && <span className="text-[10px] text-slate-400 line-through">₪{originalPrice?.toLocaleString()}</span>}
            </div>
          </div>
          <button type="button" onClick={handleAdd} className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all hover:scale-110" style={{background: added ? '#059669' : 'linear-gradient(135deg,var(--primary),var(--primary-dark))'}}>
            {added ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <ShoppingCart className="w-3.5 h-3.5" />}
          </button>
        </div>
      </Link>
    </motion.div>
  )
}

const VISIBLE = 9

export default function LastMinuteSection({ compact = false }) {
  const cartItems = useCartStore(s => s.items)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    productService.getAll({ isAccessory: 'true', limit: 30 }).then(d => {
      let maxPrice = 200
      try { maxPrice = parseInt(localStorage.getItem('lm_maxPrice') || '200') } catch {}
      const cartIds = new Set(cartItems.map(i => i._id))
      let list = (d.products || []).filter(p => p.price <= maxPrice && !cartIds.has(p._id))
      const cartIsKosher = cartItems.some(i => i.isKosher === true)
      list.sort((a, b) => {
        const sa = scoreAccessory(a, cartItems) + (cartIsKosher && a.isKosher ? 5 : 0)
        const sb = scoreAccessory(b, cartItems) + (cartIsKosher && b.isKosher ? 5 : 0)
        if (sb !== sa) return sb - sa
        return a.price - b.price
      })
      setProducts(list)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [cartItems.length])

  if (!loading && products.length === 0) return null
  const visible = products.slice(0, VISIBLE)
  const hidden = products.slice(VISIBLE)

  return (
    <section className={compact ? "mt-5 mb-2" : "py-10"}>
      <div className={compact ? "" : "max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8"}>
        <div className="rounded-3xl p-5 sm:p-7" style={{ background:'linear-gradient(135deg,var(--primary-pale) 0%,#F0FDF4 100%)', border:'1px solid var(--primary-border)', boxShadow:'0 4px 24px var(--primary-glow)' }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{background:'linear-gradient(135deg,#F59E0B,#D97706)',boxShadow:'0 4px 12px rgba(245,158,11,0.35)'}}><Zap className="w-5 h-5 text-white fill-white" /></div>
              <div>
                <h2 className="font-black text-slate-900 text-lg leading-none">ברגע האחרון</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">{cartItems.length > 0 ? 'אביזרים שמתאימים לסל שלך ✨' : 'אביזרים עד ₪200'}</p>
              </div>
            </div>
            <Link href="/products?isAccessory=true"><button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-primary-600 bg-white border border-primary-200 hover:bg-primary-50 transition-colors">הכל <ArrowLeft className="w-3 h-3" /></button></Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{Array.from({length:6}).map((_,i) => <div key={i} className="bg-white/60 rounded-xl animate-pulse" style={{height:90}} />)}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 max-h-[60vw] sm:max-h-none overflow-y-auto sm:overflow-visible pr-1 sm:pr-0">{visible.map((p,i) => <MiniCard key={p._id} product={p} index={i} />)}</div>
              {hidden.length > 0 && showMore && <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">{hidden.map((p,i) => <MiniCard key={p._id} product={p} index={i} />)}</div>}
              {hidden.length > 0 && <div className="text-center mt-4"><button onClick={() => setShowMore(v => !v)} className="flex items-center gap-2 mx-auto px-5 py-2 rounded-xl text-[12px] font-bold text-slate-600 bg-white border border-slate-200 hover:border-primary-300 hover:text-primary-600 transition-all">{showMore ? 'הסתר ↑' : `עוד ${hidden.length} אביזרים ↓`}</button></div>}
            </>
          )}
        </div>
      </div>
    </section>
  )
}