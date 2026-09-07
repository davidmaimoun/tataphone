'use client'
import { usePathname } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import CartDrawer from '@/components/ui/CartDrawer'
import PromoBanner from '@/components/layout/PromoBanner'
export default function PublicChrome({ children }) {
  const pathname = usePathname()
  const isBare = pathname?.startsWith('/admin') || pathname === '/login' || pathname === '/register' || pathname?.startsWith('/auth/')
  if (isBare) return <>{children}</>
  return (
    <>
      <div className="public-scale">
        <PromoBanner />
        <Navbar />
        <main className="flex-1" style={{ minHeight: '60vh' }}>{children}</main>
        <Footer />
      </div>
      <CartDrawer />
    </>
  )
}