'use client'
import { useState, useEffect } from 'react'
import settingsService from '@/services/settingsService'

export default function PromoBanner() {
  const [banner, setBanner] = useState(null)

  useEffect(() => {
    settingsService.get()
      .then(s => { if (s?.promoBanner?.enabled && s.promoBanner.text) setBanner(s.promoBanner.text) })
      .catch(() => {})
  }, [])

  if (!banner) return null

  // On répète le texte pour un défilement continu sans "trou"
  const repeated = Array(6).fill(banner)

  return (
    <div className="promo-banner-wrap">
      <div className="promo-banner-track">
        {repeated.map((t, i) => (
          <span key={i} className="promo-banner-item">
            <span className="promo-banner-spark">✦</span>
            {t}
          </span>
        ))}
        {/* duplication pour boucle infinie fluide */}
        {repeated.map((t, i) => (
          <span key={`dup-${i}`} className="promo-banner-item">
            <span className="promo-banner-spark">✦</span>
            {t}
          </span>
        ))}
      </div>

      <style jsx>{`
        .promo-banner-wrap {
          width: 100%;
          overflow: hidden;
          background: linear-gradient(90deg, var(--primary-deep), var(--primary), var(--primary-deep));
          background-size: 200% 100%;
          animation: promo-bg 30s linear infinite;
          padding: 5px 0;
          position: relative;
        }
        .promo-banner-track {
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
          animation: promo-scroll 70s linear infinite;
        }
        .promo-banner-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 26px;
          font-size: 12px;
          font-weight: 500;
          color: rgba(255,255,255,0.95);
          letter-spacing: 0.2px;
        }
        .promo-banner-spark {
          font-size: 10px;
          opacity: 0.7;
        }
        @keyframes promo-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes promo-bg {
          0%   { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .promo-banner-wrap:hover .promo-banner-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .promo-banner-track, .promo-banner-wrap { animation: none; }
        }
      `}</style>
    </div>
  )
}