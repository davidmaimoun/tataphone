'use client'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'

const SLIDES = [
  {
    tag: '✦ חדש בחנות', title: 'הטלפון', highlight: 'הכשר', end: '\nשחיפשת',
    sub: 'מגוון מכשירים מאושרים במחירים הטובים ביותר',
    cta: 'גלה סמארטפונים', cta2: '🔥 מבצעים',
    ctaTo: '/products?category=סמארטפונים', cta2To: '/products?sale=true',
    bg: 'from-primary-50 via-white to-orange-50',
    accent: 'var(--primary-dark)', accentLight: 'var(--primary-border)',
    products: [
      { img:'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&h=500&fit=crop', name:'iPhone 15 Pro', price:'₪4,990', badge:'חדש!' },
      { img:'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400&h=500&fit=crop', name:'Galaxy S24', price:'₪3,990', badge:null },
      { img:'https://images.unsplash.com/photo-1663499482523-1c0c1bae4ce1?w=400&h=500&fit=crop', name:'iPhone 14', price:'₪2,990', badge:'-14%' },
    ],
  },
  {
    tag: '📷 מצלמות מקצועיות', title: 'צלם', highlight: 'רגעים', end: '\nבלתי נשכחים',
    sub: 'Canon, Sony, GoPro — כל המצלמות המובילות',
    cta: 'גלה מצלמות', cta2: 'ראה מבצעים',
    ctaTo: '/products?category=מצלמות', cta2To: '/products?sale=true',
    bg: 'from-orange-50 via-white to-primary-50',
    accent: 'var(--primary)', accentLight: 'var(--primary-border)',
    products: [
      { img:'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=500&fit=crop', name:'Canon EOS R50', price:'₪2,290', badge:'-18%' },
      { img:'https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=400&h=500&fit=crop', name:'Sony Alpha A7', price:'₪4,490', badge:'חדש!' },
      { img:'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=500&fit=crop', name:'GoPro 12', price:'₪1,490', badge:null },
    ],
  },
  {
    tag: '🎧 אוזניות פרמיום', title: 'סאונד', highlight: 'שמשנה', end: '\nהכל',
    sub: 'ביטול רעשים מתקדם. קול נקי. חוויה אחרת לגמרי.',
    cta: 'גלה אוזניות', cta2: 'TOP 10',
    ctaTo: '/products?category=אוזניות', cta2To: '/products?sort=-rating',
    bg: 'from-primary-50 via-white to-orange-50',
    accent: 'var(--primary-deep)', accentLight: 'var(--primary-border)',
    products: [
      { img:'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=500&fit=crop', name:'Sony XM5', price:'₪1,190', badge:'-20%' },
      { img:'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=500&fit=crop', name:'AirPods Pro 2', price:'₪990', badge:'TOP' },
      { img:'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&h=500&fit=crop', name:'Bose QC45', price:'₪1,090', badge:'-22%' },
    ],
  },
]
const N = SLIDES.length

export default function HeroBanner() {
  const [cur, setCur] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setCur(c => (c + 1) % N), 6500)
    return () => clearInterval(t)
  }, [])
  const prev = () => setCur(c => (c - 1 + N) % N)
  const next = () => setCur(c => (c + 1) % N)
  const s = SLIDES[cur]

  return (
    <section className="hero-animated-bg relative overflow-hidden transition-all duration-700">
      <style>{`
        .hero-animated-bg {
          background: linear-gradient(90deg, #FDF9F6, #F4DFD0, #F6E6D5, #FDFAF7, #F4DFD0);
          background-size: 300% 100%;
          animation: heroGradientDrift 14s ease-in-out infinite;
        }
        @keyframes heroGradientDrift {
          0%, 100% { background-position: 0% 50%; }
          50%      { background-position: 100% 50%; }
        }
        /* Respecte le confort visuel : pas d'animation si l'utilisateur l'a désactivée */
        @media (prefers-reduced-motion: reduce) {
          .hero-animated-bg { animation: none; }
        }
      `}</style>
      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage:'linear-gradient(#000 1px,transparent 1px),linear-gradient(90deg,#000 1px,transparent 1px)', backgroundSize:'52px 52px' }} />
      <div className="absolute pointer-events-none transition-all duration-700" style={{ width:600, height:600, top:-180, right:-120, borderRadius:'50%', background:`radial-gradient(circle, ${s.accent}20 0%, transparent 65%)` }} />

      <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-8 py-12 lg:py-20">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-14 lg:min-h-[420px]">
          {/* Text */}
          <div className="flex-1 text-right w-full lg:max-w-lg z-10">
            <AnimatePresence mode="wait">
              <motion.div key={`text-${cur}`} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }} transition={{ duration:0.38, ease:[0.22,1,0.36,1] }}>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-4 text-xs font-bold" style={{ background:`${s.accent}12`, color:s.accent, border:`1px solid ${s.accentLight}` }}>
                  <Zap className="w-3.5 h-3.5" />{s.tag}
                </div>
                <h1 className="font-black leading-[1.04] tracking-tight mb-4 text-slate-900 whitespace-pre-line" style={{ fontSize:'clamp(34px,5vw,62px)' }}>
                  {s.title}{' '}
                  <span style={{ WebkitTextFillColor:'transparent', WebkitBackgroundClip:'text', backgroundClip:'text', backgroundImage:`linear-gradient(135deg,${s.accent},${s.accent}88)` }}>{s.highlight}</span>
                  {s.end}
                </h1>
                <p className="text-base lg:text-lg text-slate-500 mb-6 leading-7 lg:min-h-[56px]">{s.sub}</p>
                <div className="flex gap-3 flex-wrap">
                  <Link href={s.ctaTo}>
                    <button className="btn btn-primary text-[14px] lg:text-[15px] px-6 py-3 rounded-xl gap-2 text-white"
                            style={{ background:'linear-gradient(135deg, var(--primary), var(--primary-dark))', boxShadow:'0 4px 16px var(--primary-shadow)' }}>
                      {s.cta} <ArrowLeft className="w-4 h-4" />
                    </button>
                  </Link>
                  <Link href={s.cta2To}>
                    <button className="btn text-[14px] lg:text-[15px] px-6 py-3 rounded-xl gap-2 text-white" style={{ background:'var(--primary)' }}>{s.cta2}</button>
                  </Link>
                </div>
                <div className="flex gap-6 mt-8">
                  {[['500+','מוצרים'],['10K+','לקוחות'],['4.9★','דירוג']].map(([n,l]) => (
                    <div key={l}>
                      <div className="text-lg font-black" style={{ color:s.accent }}>{n}</div>
                      <div className="text-xs text-slate-400 font-medium">{l}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Mobile single card */}
          <div className="flex lg:hidden justify-center w-full">
            <AnimatePresence mode="wait">
              <motion.div key={`mob-${cur}`} initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.97 }} transition={{ duration:0.3 }}
                className="rounded-2xl overflow-hidden bg-white" style={{ width:260, boxShadow:'0 12px 40px rgba(0,0,0,0.14)', border:'1px solid rgba(0,0,0,0.06)' }}>
                {s.products[1].badge && <div className="text-center py-2 text-[11px] font-black text-white" style={{ background:`linear-gradient(135deg,${s.accent},${s.accent}cc)` }}>{s.products[1].badge}</div>}
                <div className="overflow-hidden" style={{ height:280 }}><img src={s.products[1].img} alt={s.products[1].name} className="w-full h-full object-cover" /></div>
                <div className="p-4"><p className="text-[13px] font-semibold text-slate-700 truncate">{s.products[1].name}</p><p className="price-num mt-1" style={{ fontSize:18 }}>{s.products[1].price}</p></div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Desktop 3 cards */}
          <div className="hidden lg:block shrink-0" style={{ minWidth:600 }}>
            <AnimatePresence mode="wait">
              <motion.div key={`cards-${cur}`} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:20 }} transition={{ duration:0.35, ease:[0.22,1,0.36,1] }} className="flex items-end gap-4">
                {s.products.map((p, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden bg-white cursor-pointer group hover:-translate-y-2 transition-transform duration-300"
                    style={{ width: i===1?220:185, flexShrink:0, boxShadow: i===1?'0 16px 48px rgba(0,0,0,0.14)':'0 8px 32px rgba(0,0,0,0.09)', border: i===1?`2px solid ${s.accentLight}`:'1px solid rgba(0,0,0,0.06)', marginBottom: i===1?24:0 }}>
                    {p.badge && <div className="text-center py-1.5 text-[11px] font-black text-white" style={{ background:`linear-gradient(135deg,${s.accent},${s.accent}cc)` }}>{p.badge}</div>}
                    <div className="overflow-hidden" style={{ height: i===1?260:210 }}><img src={p.img} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /></div>
                    <div className="p-3.5"><p className="text-[12px] font-semibold text-slate-700 truncate">{p.name}</p><p className="price-num mt-1" style={{ fontSize: i===1?17:15 }}>{p.price}</p></div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Arrows — RTL: ChevronRight=prev(right), ChevronLeft=next(left) */}
      {[{ fn:prev, icon:ChevronRight, pos:'right-3' }, { fn:next, icon:ChevronLeft, pos:'left-3' }].map(({ fn, icon:Icon, pos }, idx) => (
        <button key={idx} onClick={fn} className={`absolute ${pos} top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 hover:bg-white rounded-full shadow border border-slate-200 flex items-center justify-center transition-all z-20`}>
          <Icon className="w-4 h-4 text-slate-600" />
        </button>
      ))}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {SLIDES.map((_,i) => (
          <button key={i} onClick={() => setCur(i)} className="rounded-full transition-all duration-300" style={{ width:i===cur?24:8, height:8, background:i===cur?s.accent:'#CBD5E1' }} />
        ))}
      </div>
    </section>
  )
}