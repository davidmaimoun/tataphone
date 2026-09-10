import Link from 'next/link'
import Image from 'next/image'

// Catégories affichées sur la page d'accueil (cercles avec photos).
// Tu peux remplacer les images Unsplash par tes propres photos/icônes.
const CATS = [
  { key: 'כל המוצרים',  href: '/products',                                             img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&h=300&fit=crop&q=80' },
  { key: 'סמארטפונים',  href: '/products?category=' + encodeURIComponent('סמארטפון'),   img: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=300&h=300&fit=crop&q=80' },
  { key: 'כשר',         href: '/products?subCategory=' + encodeURIComponent('כשר'),      img: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=300&h=300&fit=crop&q=80' },
  { key: 'תומך כשר',    href: '/products?subCategory=' + encodeURIComponent('תומך כשר'), img: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=300&h=300&fit=crop&q=80' },
  { key: 'רמקולים',     href: '/products?category=' + encodeURIComponent('רמקולים'),     img: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&h=300&fit=crop&q=80' },
  { key: 'אוזניות',     href: '/products?category=' + encodeURIComponent('אוזניות'),     img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop&q=80' },
  { key: 'מטענים',      href: '/products?category=' + encodeURIComponent('מטענים'),      img: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&h=300&fit=crop&q=80' },
  { key: 'מבצעים',      href: '/products?sale=true',                                     img: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=300&h=300&fit=crop&q=80' },
]

export default function CategoryBar() {
  return (
    <section className="py-7 bg-white border-b border-slate-100">
      <div className="w-full" style={{ paddingLeft: '5%', paddingRight: '5%' }}>
        <div className="flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-1 justify-start lg:justify-center">
          {CATS.map(({ key, href, img }) => (
            <Link key={key} href={href} className="group flex flex-col items-center gap-2 flex-shrink-0">
              <div className="relative rounded-full overflow-hidden border-2 border-slate-100 group-hover:border-primary-400 transition-all duration-300 group-hover:shadow-lg"
                   style={{ width: 'clamp(64px, 15vw, 88px)', height: 'clamp(64px, 15vw, 88px)' }}>
                <Image src={img} alt={key} fill sizes="88px" unoptimized className="object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <span className="text-[12px] sm:text-[13px] font-semibold text-slate-600 group-hover:text-primary-600 transition-colors whitespace-nowrap">{key}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}