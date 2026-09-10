import Link from 'next/link'
import Image from 'next/image'

// Catégories affichées sur la page d'accueil (cercles avec photos, style KSP).
// Remplace les images Unsplash par tes propres photos/icônes quand tu les auras.
const CATS = [
  { key: 'סמארטפונים',        href: '/products?category=' + encodeURIComponent('סמארטפון'),        img: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=300&h=300&fit=crop&q=80' },
  { key: 'מכשירים כשרים',     href: '/products?subCategory=' + encodeURIComponent('כשר'),           img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=300&h=300&fit=crop&q=80' },
  { key: 'תומך כשר',          href: '/products?subCategory=' + encodeURIComponent('תומך כשר'),      img: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=300&h=300&fit=crop&q=80' },
  { key: 'טלפונים',           href: '/products?category=' + encodeURIComponent('טלפון סלולרי'),     img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop&q=80' },
  { key: 'נגני MP3',          href: '/products?category=' + encodeURIComponent('נגני MP3'),         img: 'https://images.unsplash.com/photo-1445985543470-41fba5c3144a?w=300&h=300&fit=crop&q=80' },
  { key: 'מצלמות',            href: '/products?category=' + encodeURIComponent('מצלמות'),           img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300&h=300&fit=crop&q=80' },
  { key: 'רמקולים',           href: '/products?category=' + encodeURIComponent('רמקולים'),          img: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&h=300&fit=crop&q=80' },
  { key: 'אוזניות',           href: '/products?category=' + encodeURIComponent('אוזניות'),          img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop&q=80' },
  { key: 'שעונים',            href: '/products?category=' + encodeURIComponent('שעונים'),           img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop&q=80' },
  { key: 'טאבלטים',           href: '/products?category=' + encodeURIComponent('טאבלטים'),          img: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=300&h=300&fit=crop&q=80' },
  { key: 'סוללות',            href: '/products?category=' + encodeURIComponent('סוללות'),           img: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=300&h=300&fit=crop&q=80' },
  { key: 'מטענים',            href: '/products?category=' + encodeURIComponent('מטענים'),           img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&h=300&fit=crop&q=80' },
  { key: 'כיסויים',           href: '/products?category=' + encodeURIComponent('כיסויים'),          img: 'https://images.unsplash.com/photo-1601593346740-925612772716?w=300&h=300&fit=crop&q=80' },
]

export default function CategoryBar() {
  return (
    <section className="py-6 bg-white border-b border-slate-100">
      <div className="w-full" style={{ paddingLeft: '5%', paddingRight: '5%' }}>
        <div className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar pb-1 justify-start lg:justify-center">
          {CATS.map(({ key, href, img }) => (
            <Link key={key} href={href} className="group flex flex-col items-center gap-2 flex-shrink-0" style={{ width: 'clamp(64px, 10vw, 84px)' }}>
              <div className="relative rounded-full overflow-hidden border-2 border-slate-100 group-hover:border-primary-400 transition-all duration-300 group-hover:shadow-lg w-full aspect-square">
                <Image src={img} alt={key} fill sizes="84px" unoptimized className="object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <span className="text-[11px] sm:text-[12px] font-semibold text-slate-600 group-hover:text-primary-600 transition-colors text-center leading-tight">{key}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}