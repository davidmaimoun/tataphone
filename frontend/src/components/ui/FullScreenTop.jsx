'use client'
import { useRef, useEffect, useState } from 'react'
import CategoryBar from '@/components/ui/CategoryBar'
import HeroBanner from '@/components/ui/HeroBanner'

// Enveloppe CategoryBar + Hero et leur donne EXACTEMENT la hauteur restante
// de l'écran (viewport - position du haut du bloc). Mesure réelle → aucun débordement.
export default function FullScreenTop() {
  const ref = useRef(null)
  const [h, setH] = useState('auto')

  useEffect(() => {
    const measure = () => {
      if (!ref.current) return
      const top = ref.current.getBoundingClientRect().top + window.scrollY
      // hauteur visible restante sous le haut du bloc
      const avail = window.innerHeight - top
      setH(avail > 300 ? `${avail}px` : 'auto')
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  return (
    <div ref={ref} className="flex flex-col" style={{ height: h }}>
      <CategoryBar />
      <div className="flex-1 flex flex-col min-h-0">
        <HeroBanner fillHeight />
      </div>
    </div>
  )
}