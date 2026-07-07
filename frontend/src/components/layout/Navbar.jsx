'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Heart, User, LogOut, Package, ChevronDown, Menu, X, Flame, SlidersHorizontal } from 'lucide-react'
import useCartStore from '@/stores/cartStore'
import useAuthStore from '@/stores/authStore'
import useWishlistStore from '@/stores/wishlistStore'
import { motion, AnimatePresence } from 'framer-motion'
import SearchBar from '@/components/layout/SearchBar'

export default function Navbar() {
  const router = useRouter()
  const items = useCartStore(s => s.items)
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const wishlistIds = useWishlistStore(s => s.ids)
  const cartCount = items.reduce((s, i) => s + i.qty, 0)

  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => { useAuthStore.getState().init?.() }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e) => { if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => { logout(); setUserMenu(false); router.push('/') }

  // Ouvre la page produits avec le drawer filtre ouvert
  const openFilters = () => router.push('/products?openFilter=1')

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-[0_2px_20px_rgba(0,0,0,0.08)]' : 'bg-white border-b border-slate-100'}`}>
      <div className="max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex items-center gap-3 h-14">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center">
            <Image src="/logo.png" alt="טאטעפון" width={120} height={32} className="h-7 w-auto object-contain" priority />
          </Link>

          {/* Search bar + filtre — prend toute la place au centre */}
          <div className="flex-1 flex items-center gap-2 max-w-2xl mx-auto">
            <div className="flex-1">
              <SearchBar />
            </div>
            <button
              onClick={openFilters}
              className="flex-shrink-0 flex items-center gap-1.5 h-10 px-3 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
              title="סינון"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden lg:inline text-[13px] font-bold">סינון</span>
            </button>
          </div>

          {/* Liens rapides desktop (réduits : kosher + מבצעים) */}
          <nav className="hidden lg:flex items-center gap-2 flex-shrink-0 text-[14px] font-semibold text-slate-600">
            <Link href="/products?isKosher=true" className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold transition-all hover:opacity-90 whitespace-nowrap" style={{ background:'#D1FAE5', color:'#064E3B', border:'1px solid #6EE7B7' }}>
              <span style={{ fontSize:14 }}>✡</span>כשר
            </Link>
            <Link href="/products?sale=true" className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-white text-[14px] transition-all hover:scale-105 whitespace-nowrap"
              style={{ background:'linear-gradient(135deg,#EF4444,#DC2626)', boxShadow:'0 2px 10px rgba(239,68,68,0.4)' }}>
              <Flame className="w-3.5 h-3.5 fill-white" /><span>מבצעים</span>
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Link href="/wishlist" className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors">
              <Heart className="w-5 h-5 text-slate-500" />
              {wishlistIds.length > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{wishlistIds.length > 9 ? '9+' : wishlistIds.length}</span>}
            </Link>
            <Link href="/cart" className="relative flex items-center gap-2 h-9 ps-2 pe-3 rounded-full font-bold text-[13px] transition-all hover:-translate-y-0.5 hover:shadow-md"
              style={{ background:'var(--primary-pale)', border:'1.5px solid var(--primary-border)', color:'var(--primary-deep)' }}>
              <span className="flex items-center justify-center w-6 h-6 rounded-full" style={{ background:'linear-gradient(135deg,var(--primary),var(--primary-dark))', boxShadow:'0 2px 6px var(--primary-shadow)' }}>
                <ShoppingCart className="w-3.5 h-3.5 text-white" />
              </span>
              <span className="hidden sm:inline">עגלה</span>
              {cartCount > 0 && <span className="min-w-[18px] h-[18px] px-1 text-white text-[10px] font-black rounded-full flex items-center justify-center" style={{ background:'var(--primary)' }}>{cartCount > 99 ? '99+' : cartCount}</span>}
            </Link>

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenu(v => !v)} className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-primary-50 hover:bg-primary-100 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-[11px] font-black">{user.name?.charAt(0) || '?'}</div>
                  <span className="text-[13px] font-semibold text-primary-700 hidden md:block max-w-[70px] truncate">{user.name?.split(' ')[0]}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-primary-500 transition-transform ${userMenu ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {userMenu && (
                    <motion.div initial={{ opacity:0, y:8, scale:0.96 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:4, scale:0.97 }} transition={{ duration:0.15 }}
                      className="absolute left-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-100 overflow-hidden z-50 max-w-[calc(100vw-2rem)]">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <p className="font-bold text-[13px] text-slate-800 truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        {user.role === 'admin' && (
                          <Link href="/admin" onClick={() => setUserMenu(false)}>
                            <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-slate-700 hover:bg-primary-50 hover:text-primary-700 transition-colors text-right"><User className="w-4 h-4" />פאנל ניהול</button>
                          </Link>
                        )}
                        <Link href="/my-orders" onClick={() => setUserMenu(false)}>
                          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-slate-700 hover:bg-primary-50 hover:text-primary-700 transition-colors text-right"><Package className="w-4 h-4" />ההזמנות שלי</button>
                        </Link>
                        <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors text-right"><LogOut className="w-4 h-4" />התנתקות</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/login">
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-[13px] font-bold transition-colors">
                  <User className="w-4 h-4" /><span className="hidden md:inline">התחבר</span>
                </button>
              </Link>
            )}

            <button onClick={() => setMenuOpen(v => !v)} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors flex-shrink-0">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.2 }} className="lg:hidden border-t border-slate-100 overflow-hidden">
              <nav className="py-3 space-y-1">
                <Link href="/products" onClick={() => setMenuOpen(false)}><button className="w-full text-right px-3 py-2.5 rounded-xl text-[14px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors">כל המוצרים</button></Link>
                <Link href="/products?isKosher=true" onClick={() => setMenuOpen(false)}><button className="w-full text-right px-3 py-2.5 rounded-xl text-[14px] font-bold" style={{ color:'#064E3B', background:'#F0FDF4' }}>✡ מכשירים כשרים</button></Link>
                <Link href="/products?sale=true" onClick={() => setMenuOpen(false)}><button className="w-full flex items-center justify-start gap-2 px-3 py-2.5 rounded-xl text-[15px] text-white" style={{ background:'linear-gradient(135deg,#EF4444,#DC2626)' }}><Flame className="w-4 h-4 fill-white" />מבצעים</button></Link>
                <Link href="/contact" onClick={() => setMenuOpen(false)}><button className="w-full text-right px-3 py-2.5 rounded-xl text-[14px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors">💬 צור קשר</button></Link>
                {user && <Link href="/my-orders" onClick={() => setMenuOpen(false)}><button className="w-full text-right px-3 py-2.5 rounded-xl text-[14px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors">ההזמנות שלי</button></Link>}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}