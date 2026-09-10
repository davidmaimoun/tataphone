import { Sparkles, TrendingUp, Star, Award, Shield, Truck, RotateCcw, BadgeCheck, Phone, Mail, Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import FullScreenTop from '@/components/ui/FullScreenTop'
import SectionHeader from '@/components/ui/SectionHeader'
import ProductCarousel from '@/components/ui/ProductCarousel'
import ProductCard from '@/components/product/ProductCard'
import PromoBanners from '@/components/ui/PromoBanners'
import WishlistSection from '@/components/ui/WishlistSection'
import RecommendedSection from '@/components/ui/RecommendedSection'
import productService from '@/services/productService'

export const revalidate = 120

const W = 'max-w-[1440px] mx-auto px-2 sm:px-6 lg:px-8'

export default async function HomePage() {
  // Fetch SERVEUR en parallèle (SEO + rapide)
  const [newP, kosherP, topP, bestP, saleP] = await Promise.all([
    productService.getAll({ sort:'-createdAt',   limit:10 }),
    productService.getAll({ isKosher:'true', sort:'-reviewCount', limit:12 }),
    productService.getTopRated(12),        // ← vraie route top-rated (featured + rating)
    productService.getBestsellers(10),     // ← vraie route bestsellers (featured + ventes)
    productService.getAll({ sale:'true',   limit:10 }),
  ])

  const newProducts    = newP?.products    || []
  const kosherProducts = kosherP?.products || []
  const topRated       = topP?.products    || []
  const bestSellers    = bestP?.products   || []
  const saleProducts   = saleP?.products   || []

  return (
    <div className="min-h-screen">
      <FullScreenTop />

      {/* New arrivals */}
      <section className="py-14">
        <div className={`${W} mb-6`}>
          <SectionHeader icon={Sparkles} iconColor="text-primary-500"
            label="מה חדש" title="מוצרים" gradientWord="חדשים"
            gradientColors="var(--primary-dark), var(--primary-light)"
            description="הגיעו עכשיו למחסן שלנו"
            linkTo="/products?sort=-createdAt" linkLabel="כל המוצרים" />
        </div>
        <div className={W}>
          <div className="products-grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 items-stretch">
            {newProducts.map((p,i) => <ProductCard key={p._id} product={p} index={i} forceNew />)}
          </div>
        </div>
      </section>

      {/* Kosher */}
      {kosherProducts.length > 0 && (
        <section className="py-14">
          <div className={`${W} mb-6`}>
            <SectionHeader icon={BadgeCheck} iconColor="text-emerald-600"
              label="מוצרים כשרים" title="הכל" gradientWord="כשר"
              gradientColors="#059669, #34D399"
              description="כל המוצרים מאושרים ומוסמכים — כשר לכתחילה"
              linkTo="/products?isKosher=true" linkLabel="כל הכשרים" />
          </div>
          <div className={W}><ProductCarousel products={kosherProducts} /></div>
        </section>
      )}

      {/* Promo — full width */}
      <div className="py-6"><PromoBanners /></div>

      {/* Best sellers */}
      {bestSellers.length > 0 && (
        <section className="py-14" style={{ background:'linear-gradient(to bottom,#FFFBF5,white)' }}>
          <div className={W}>
            <SectionHeader icon={Award} iconColor="text-orange-500"
              label="הנמכרים ביותר" title="רב" gradientWord="מכר"
              gradientColors="#F97316, #EF4444"
              description="המוצרים שהכי אוהבים לקנות"
              linkTo="/products?sort=-reviewCount" linkLabel="כל הרב-מכרים" />
            <div className="products-grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 items-stretch mt-6">
              {bestSellers.map((p,i) => <ProductCard key={p._id} product={p} index={i} rank={i+1} />)}
            </div>
          </div>
        </section>
      )}

      {/* Sale */}
      {saleProducts.length > 0 && (
        <section className="py-14" style={{ background:'linear-gradient(to bottom,#FFF5F5,white)' }}>
          <div className={`${W} mb-6`}>
            <SectionHeader icon={TrendingUp} iconColor="text-red-500"
              label="מבצעים חמים" title="מחיר" gradientWord="מיוחד 🔥"
              gradientColors="#EF4444, #F97316"
              description="הנחות גדולות לזמן מוגבל"
              linkTo="/products?sale=true" linkLabel="כל המבצעים" />
          </div>
          <div className={W}><ProductCarousel products={saleProducts} /></div>
        </section>
      )}

      {/* Top rated */}
      {topRated.length > 0 && (
        <section className="py-14">
          <div className={W}>
            <SectionHeader icon={Star} iconColor="text-amber-500"
              label="כל הזמנים" title="הכי" gradientWord="מדורגים"
              gradientColors="#FBBF24, #F97316"
              description="לפי ביקורות הלקוחות שלנו"
              linkTo="/products?sort=-rating" linkLabel="ראה עוד" />
          </div>
          <div className={W}><ProductCarousel products={topRated} showRank /></div>
        </section>
      )}

      {/* Recommended — CLIENT (localStorage visited) */}
      <RecommendedSection />

      {/* Wishlist — CLIENT (store) */}
      <WishlistSection />

      {/* Trust + Contact fused */}
      <section className="py-6">
        <div className={W}>
          <div className="rounded-3xl overflow-hidden" style={{ background:'linear-gradient(135deg,#1E3A8A 0%,var(--primary-dark) 60%,var(--primary) 100%)' }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-white/10">
              {[
                { icon:Truck,      title:'משלוח חינם',   sub:'מעל ₪500' },
                { icon:BadgeCheck, title:'כשרות מוסמכת', sub:'כל המוצרים' },
                { icon:Shield,     title:'תשלום מאובטח', sub:'SSL מוצפן' },
                { icon:RotateCcw,  title:'החזרה 14 יום', sub:'ללא שאלות' },
              ].map(({ icon:Icon, title, sub }, i) => (
                <div key={title} className={`flex items-center gap-3 px-4 py-4 ${i%2===0?'border-r border-white/10':''} ${i<2?'border-b lg:border-b-0 border-white/10':''}`}>
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-white" /></div>
                  <div><p className="font-black text-[12px] sm:text-[13px] text-white leading-tight">{title}</p><p className="text-[10px] text-primary-200 mt-0.5">{sub}</p></div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5">
              <div>
                <p className="font-black text-white text-[15px]">💬 צריכים עזרה?</p>
                <p className="text-primary-200 text-[12px] mt-0.5">צוות מומחים זמין לכל שאלה</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {[
                  { icon:Phone, label:'טלפון', val:'03-555-1234' },
                  { icon:Mail,  label:'אימייל', val:'info@tataphone.co.il' },
                  { icon:Clock, label:'שעות',   val:'א׳–ה׳ 9:00–18:00' },
                ].map(({ icon:Icon, label, val }) => (
                  <div key={label} className="flex items-center gap-2.5 bg-white/10 rounded-xl px-4 py-2.5 flex-1 sm:flex-initial">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0"><Icon className="w-3.5 h-3.5 text-white" /></div>
                    <div><p className="text-[9px] text-primary-200 font-bold uppercase tracking-wide">{label}</p><p className="text-[12px] font-bold text-white">{val}</p></div>
                  </div>
                ))}
              </div>
              <Link href="/contact" className="flex-shrink-0 w-full sm:w-auto">
                <button className="flex items-center justify-center gap-2 bg-white font-bold text-[13px] px-5 py-2.5 rounded-full hover:shadow-md hover:-translate-y-0.5 transition-all w-full sm:w-auto" style={{ color:'var(--primary-deep)' }}>
                  שלח הודעה <ArrowLeft className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}