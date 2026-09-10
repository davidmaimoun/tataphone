import { notFound } from 'next/navigation'
import productService from '@/services/productService'
import ProductDetailClient from './ProductDetailClient'
import ReviewSection from '@/components/product/ReviewSection'
import RelatedProducts from '@/components/product/RelatedProducts'
import ProductDetailTabs from '@/components/product/ProductDetailTabs'

// ════════════════════════════════════════════════════════════
// SERVER COMPONENT — s'exécute sur le serveur.
// Génère le HTML complet (titre, meta, contenu) AVANT envoi au
// navigateur → Google voit tout, partages WhatsApp voient tout.
// ════════════════════════════════════════════════════════════

// 1) ISR : régénère la page toutes les 5 min si le produit change
export const revalidate = 300

// 2) Génère les pages statiques pour TOUS les produits au build
//    (les 2000 pages deviennent du HTML statique ultra-rapide)
export async function generateStaticParams() {
  const ids = await productService.getAllIds()
  return ids.map((id) => ({ id }))
}

// 3) Metadata SEO PAR PRODUIT (titre, description, OG, Twitter)
export async function generateMetadata({ params }) {
  const product = await productService.getById(params.id)
  if (!product) return { title: 'מוצר לא נמצא' }

  const desc = product.description?.slice(0, 155)
    || `${product.name} מבית ${product.brand} — ₪${product.price?.toLocaleString()} בטאטעפון`

  return {
    title: product.name,
    description: desc,
    openGraph: {
      title: product.name,
      description: desc,
      type: 'website',
      url: `https://tataphone.co.il/products/${product._id}`,
      images: product.images?.[0] ? [{ url: product.images[0], width: 800, height: 800 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: desc,
      images: product.images?.[0] ? [product.images[0]] : [],
    },
    alternates: { canonical: `/products/${product._id}` },
  }
}

// 4) La page elle-même
export default async function ProductPage({ params }) {
  const product = await productService.getById(params.id)
  if (!product) notFound()

  // Rich snippet JSON-LD — fait apparaître étoiles/prix dans Google
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images || [],
    description: product.description || '',
    brand: { '@type': 'Brand', name: product.brand || '' },
    offers: {
      '@type': 'Offer',
      url: `https://tataphone.co.il/products/${product._id}`,
      priceCurrency: 'ILS',
      price: product.price,
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    ...(product.rating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount || 1,
      },
    } : {}),
  }

  return (
    <>
      {/* Rich snippet — invisible, lu par Google */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* La partie interactive (galerie, panier) = client component */}
      <ProductDetailClient product={product} />
      <div id="product-tabs" className="w-full mx-auto px-4 sm:px-6 lg:px-10 pb-16" style={{ paddingLeft: 12, paddingRight: 12 }}>
        <ProductDetailTabs details={product.details} specs={product.specs} />
        <SectionDivider />
        <ReviewSection productId={product._id} />
        <SectionDivider />
        <RelatedProducts productId={product._id} />
      </div>
    </>
  )
}

// Séparateur décoratif entre les grandes sections (trait dégradé + point terracotta)
function SectionDivider() {
  return (
    <div className="flex items-center gap-3 my-8" aria-hidden="true">
      <span className="flex-1 h-px" style={{ background:'linear-gradient(90deg, transparent, rgba(204,120,92,0.3))' }} />
      <span className="w-1.5 h-1.5 rounded-full" style={{ background:'#CC785C' }} />
      <span className="flex-1 h-px" style={{ background:'linear-gradient(90deg, rgba(204,120,92,0.3), transparent)' }} />
    </div>
  )
}