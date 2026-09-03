'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import useCartStore from '@/stores/cartStore'
import useCartUiStore from '@/stores/cartUiStore'
import toast from 'react-hot-toast'

export default function AddToCartButton({ product }) {
  const addItem = useCartStore(s => s.addItem)
  const openCart = useCartUiStore(s => s.openCart)
  const router = useRouter()
  const [added, setAdded] = useState(false)

  // Un vrai choix n'existe que s'il y a PLUSIEURS variantes.
  // Une seule variante = pas d'option à choisir → on ajoute directement.
  const variantCount = Array.isArray(product.variants) ? product.variants.length : 0
  const needsChoice = product.hasVariants && variantCount > 1

  const handleAdd = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Plusieurs variantes : le choix se fait sur la page produit
    if (needsChoice) {
      router.push(`/products/${product._id}`)
      return
    }
    // Sinon : produit simple OU produit à variante unique → ajout direct.
    // Si variante unique, on ajoute le produit avec cette variante pré-sélectionnée.
    if (product.hasVariants && variantCount === 1) {
      const v = product.variants[0]
      addItem({ ...product, price: v.price ?? product.price, selectedVariant: v, variantSku: v.sku })
    } else {
      addItem(product)
    }
    openCart()
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <button onClick={handleAdd}
      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-[12px] text-white transition-all duration-200 mt-1.5"
      style={{
        background: added ? 'linear-gradient(135deg,#059669,#10B981)' : 'linear-gradient(135deg,var(--primary),var(--primary-dark))',
        boxShadow: added ? '0 2px 8px rgba(16,185,129,0.3)' : '0 2px 8px var(--primary-shadow)',
      }}>
      <AnimatePresence mode="wait" initial={false}>
        {added
          ? <motion.span key="c" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1"><Check className="w-3.5 h-3.5" strokeWidth={2.5} />הוסף!</motion.span>
          : <motion.span key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1"><ShoppingCart className="w-3.5 h-3.5" />{needsChoice ? 'בחר אפשרויות' : 'הוסף לסל'}</motion.span>}
      </AnimatePresence>
    </button>
  )

  
}