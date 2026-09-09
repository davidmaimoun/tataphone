'use client'
import { useState, useEffect } from 'react'
import { Database, Layers, Building2, Tag } from 'lucide-react'
import { productAdmin } from '@/services/productService'

export default function AdminDatabase() {
  const [schema, setSchema] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    productAdmin.getImportSchema().then(setSchema).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const SECTIONS = schema ? [
    { key: 'cat',   label: 'קטגוריות', icon: Layers,     items: schema.existingCategories || [], color: '#CC785C' },
    { key: 'brand', label: 'מותגים',   icon: Building2,   items: schema.existingBrands || [],     color: '#7C3AED' },
    { key: 'tags',  label: 'תגיות',    icon: Tag,        items: schema.existingTags || [],       color: '#059669' },
  ] : []

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-1.5 h-9 rounded-full flex-shrink-0" style={{ background:'linear-gradient(180deg,#E8A882,#CC785C,#9D4B2E)' }} />
        <h1 className="text-2xl font-black text-slate-900">מסד נתונים</h1>
      </div>
      <p className="text-[13px] text-slate-400 mb-6 pr-4">
        {schema ? <>סה"כ במאגר: <strong className="text-slate-600">{schema.totalProducts}</strong> מוצרים</> : 'טוען...'}
      </p>

      <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5 text-primary-600" />
          <h2 className="font-bold text-slate-800">ערכים קיימים במאגר</h2>
        </div>
        <p className="text-[12px] text-slate-400 mb-5">מומלץ להשתמש בערכים קיימים לעקביות (בעת ייבוא או הוספת מוצר).</p>

        {loading ? (
          <p className="text-slate-400 text-[13px]">טוען...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {SECTIONS.map(({ key, label, icon: Icon, items, color }) => (
              <div key={key} className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <p className="text-[13px] font-bold" style={{ color }}>{label}</p>
                  <span className="text-[11px] text-slate-400 mr-auto">{items.length}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.length ? items.map(i => (
                    <span key={i} className="text-[11px] px-2 py-1 rounded-full" style={{ background: `${color}15`, color }}>{i}</span>
                  )) : <span className="text-[11px] text-slate-300">אין ערכים עדיין</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}