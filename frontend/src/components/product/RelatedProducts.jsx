import productService from '@/services/productService'
import ProductCard from './ProductCard'

// SERVER COMPONENT — fetch related products
export default async function RelatedProducts({ productId }) {
  let related = []
  try {
    const data = await productService.getRelated(productId)
    related = data?.products || data || []
  } catch {}
  if (!related.length) return null

  return (
    <div className="mt-4 rounded-3xl p-6 sm:p-8" style={{ background:'radial-gradient(ellipse 80% 100% at 100% 0%, rgba(204,120,92,0.06), transparent 70%)' }}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-[5px] h-11 rounded-full" style={{ background:'linear-gradient(180deg,#E8A882,#CC785C,#9D4B2E)' }} />
        <div>
          <h2 className="font-black text-2xl text-slate-900">מוצרים דומים</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">אולי יעניין אותך גם</p>
        </div>
      </div>
      <div className="products-grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
        {related.slice(0, 4).map(p => <ProductCard key={p._id} product={p} />)}
      </div>
    </div>
  )
}