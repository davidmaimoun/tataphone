'use client'
import { useState } from 'react'

export default function ProductDetailTabs({ details = [], specs = {} }) {
  // Toutes les sections remplies (y compris תיאור, qui devient un onglet a part entiere)
  const sections = (Array.isArray(details) ? details : [])
    .filter(s => s && (s.title || s.body))

  const specsObj = specs && typeof specs === 'object' && !Array.isArray(specs) ? specs : {}
  const hasSpecs = Object.keys(specsObj).length > 0

  // Onglets : d'abord תיאור (si presente), puis les autres sections, puis מפרט טכני en dernier.
  const descSection = sections.find(s => String(s.title).trim() === 'תיאור' && s.body?.trim())
  const otherSections = sections.filter(s => String(s.title).trim() !== 'תיאור' && s.body?.trim())

  const tabs = []
  if (descSection) tabs.push({ title: descSection.title || 'תיאור', type: 'text', body: descSection.body })
  otherSections.forEach(s => tabs.push({ title: s.title || 'מקטע', type: 'text', body: s.body }))
  if (hasSpecs) tabs.push({ title: 'מפרט טכני', type: 'specs' })

  const [active, setActive] = useState(0)
  if (tabs.length === 0) return null

  return (
    <div className="mt-10 pt-2">
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto" role="tablist">
        {tabs.map((t, i) => (
          <button key={i} role="tab" onClick={() => setActive(i)}
            className={`relative px-5 py-3 text-[14px] font-bold whitespace-nowrap transition-colors ${active === i ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}>
            {t.title}
            {active === i && <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-primary-600 rounded-full" />}
          </button>
        ))}
      </div>

      <div className="py-6 px-1">
        {tabs[active]?.type === 'specs' ? (
          <div className="max-w-2xl">
            {Object.entries(specsObj).map(([k, v]) => (
              <div key={k} className="flex justify-between text-[14px] py-2.5 border-b border-slate-50">
                <span className="text-slate-400 font-medium">{k}</span>
                <span className="text-slate-700 font-semibold">{v}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[15px] text-slate-600 leading-8 whitespace-pre-wrap">{tabs[active]?.body}</p>
        )}
      </div>
    </div>
  )
}