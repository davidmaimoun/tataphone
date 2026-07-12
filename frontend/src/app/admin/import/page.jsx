'use client'
import { useState, useEffect } from 'react'
import { Upload, FileJson, FileSpreadsheet, Check, Download, Database, Info, ChevronDown, ChevronUp, Plug, RefreshCw, Search, Loader2 } from 'lucide-react'
import { productAdmin } from '@/services/productService'
import api from '@/services/api'
import toast from 'react-hot-toast'

export default function AdminImport() {
  const [tab, setTab] = useState('api')          // 'api' | 'files'
  const [schema, setSchema] = useState(null)
  const [jsonText, setJsonText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [overwriteSku, setOverwriteSku] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [jsonFileName, setJsonFileName] = useState('')

  // ── État du tab API (Priority) ──
  const [priorityStatus, setPriorityStatus] = useState(null)
  const [priorityBusy, setPriorityBusy] = useState(false)
  const [preview, setPreview] = useState([])
  const [previewBusy, setPreviewBusy] = useState(false)

  useEffect(() => { productAdmin.getImportSchema().then(setSchema).catch(() => {}) }, [])

  const buildExample = () => {
    if (!schema) return '[]'
    const obj = {}
    schema.fields.forEach(f => { if (f.example !== undefined) obj[f.key] = f.example })
    return JSON.stringify([obj], null, 2)
  }
  const downloadExample = () => {
    const blob = new Blob([buildExample()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'tataphone-import-example.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async () => {
    let products
    try { products = JSON.parse(jsonText) } catch { return toast.error('JSON לא תקין') }
    if (!Array.isArray(products)) return toast.error('צריך מערך של מוצרים')
    setBusy(true)
    try { const r = await productAdmin.importJson(products, overwriteSku); setResult(r); toast.success(`יובאו ${r.imported ?? products.length} מוצרים! 🎉`) }
    catch (e) { toast.error(e?.response?.data?.error || 'שגיאה בייבוא') } finally { setBusy(false) }
  }
  const importExcel = async (file) => {
    if (!file) return
    setBusy(true)
    try { const fd = new FormData(); fd.append('file', file); const r = await productAdmin.importExcel(fd); setResult(r); toast.success(`הקובץ יובא! ${r.imported ? `(${r.imported} מוצרים)` : ''} 🎉`) }
    catch (e) { toast.error(e?.response?.data?.error || 'שגיאה בייבוא') } finally { setBusy(false) }
  }

  // Charge un fichier .json depuis le disque dans la zone de texte (relecture avant import)
  const loadJsonFile = async (file) => {
    if (!file) return
    setJsonFileName('')
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)              // valide le JSON avant de l'afficher
      if (!Array.isArray(parsed)) return toast.error('הקובץ חייב להכיל מערך של מוצרים')
      setJsonText(JSON.stringify(parsed, null, 2))
      setJsonFileName(file.name)
      toast.success(`נטענו ${parsed.length} מוצרים — בדוק ולחץ על ייבוא`)
    } catch {
      toast.error('קובץ JSON לא תקין')
    }
  }

  // ── Priority API (placeholder — branché plus tard sur le backend) ──
  const testPriority = async () => {
    setPriorityBusy(true); setPriorityStatus(null)
    try {
      const { data } = await api.get('/integrations/priority/status')
      setPriorityStatus(data?.connected ? 'ok' : 'error')
      toast[data?.connected ? 'success' : 'error'](data?.connected ? 'מחובר ל-Priority ✅' : 'אין חיבור')
    } catch {
      setPriorityStatus('error')
      toast.error('החיבור ל-Priority עדיין לא מוגדר בשרת')
    } finally { setPriorityBusy(false) }
  }
  const loadPreview = async () => {
    setPreviewBusy(true)
    try {
      const { data } = await api.get('/integrations/priority/products?preview=true')
      setPreview(data?.products || [])
      if (!data?.products?.length) toast('לא התקבלו מוצרים', { icon: 'ℹ️' })
    } catch {
      toast.error('לא ניתן לטעון מוצרים מ-Priority (השרת עדיין לא מחובר)')
    } finally { setPreviewBusy(false) }
  }

  const required = schema?.fields.filter(f => f.required) || []
  const optional = schema?.fields.filter(f => !f.required) || []

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <h1 className="text-2xl font-black text-slate-900 mb-1">ייבוא מוצרים</h1>
      {schema && <p className="text-[13px] text-slate-400 mb-5">כרגע במאגר: <strong className="text-slate-600">{schema.totalProducts}</strong> מוצרים</p>}

      {/* ── Tabs API / Files ── */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('api')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all ${tab==='api' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-200'}`}>
          <Plug className="w-4 h-4" />חיבור API (Priority)
        </button>
        <button onClick={() => setTab('files')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-bold transition-all ${tab==='files' ? 'bg-primary-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-primary-200'}`}>
          <FileSpreadsheet className="w-4 h-4" />קבצים (Excel / JSON)
        </button>
      </div>

      {/* ════════ TAB API (Priority) ════════ */}
      {tab === 'api' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-2"><Plug className="w-5 h-5 text-primary-600" /><h2 className="font-bold text-slate-800">חיבור ישיר ל-Priority</h2></div>
            <p className="text-[13px] text-slate-500 leading-6 mb-4">
              משיכת מוצרים ומחירים ישירות ממערכת Priority דרך ה-API, ללא צורך בקובץ. בשלב ראשון נציג את המוצרים והמחירים; בהמשך נחליט על עדכון אוטומטי או אישור ידני.
            </p>

            <div className="flex flex-wrap gap-3">
              <button onClick={testPriority} disabled={priorityBusy}
                className="btn btn-secondary px-5 py-2.5 gap-2 disabled:opacity-50">
                {priorityBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}בדוק חיבור
              </button>
              <button onClick={loadPreview} disabled={previewBusy}
                className="btn btn-primary px-5 py-2.5 gap-2 disabled:opacity-50">
                {previewBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}טען מוצרים לתצוגה
              </button>
            </div>

            {priorityStatus && (
              <div className={`mt-4 text-[13px] font-bold flex items-center gap-2 ${priorityStatus==='ok' ? 'text-green-600' : 'text-amber-600'}`}>
                {priorityStatus==='ok' ? <><Check className="w-4 h-4" />מחובר</> : <>⚠ החיבור עדיין לא מוגדר בשרת</>}
              </div>
            )}
          </div>

          {/* Aperçu produits (lecture seule pour l'instant) */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-[14px]">תצוגה מקדימה — מוצרים מ-Priority</h3>
              {preview.length > 0 && <span className="text-[12px] text-slate-400">{preview.length} מוצרים</span>}
            </div>
            {preview.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-[13px]">
                לחץ על "טען מוצרים לתצוגה" כדי לראות את המוצרים והמחירים מ-Priority.
                <br />(בשלב זה תצוגה בלבד — לא נשמר במאגר)
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-[13px] min-w-[480px]">
                  <thead className="bg-slate-50 text-[11px] text-slate-400 uppercase">
                    <tr><th className="py-2.5 px-4">שם</th><th className="py-2.5 px-4">מק"ט</th><th className="py-2.5 px-4">מחיר</th><th className="py-2.5 px-4">מלאי</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {preview.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-4 font-semibold text-slate-800">{p.name}</td>
                        <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]" dir="ltr">{p.sku || '—'}</td>
                        <td className="py-2.5 px-4 font-bold text-primary-600">₪{Number(p.price || 0).toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-slate-500">{p.stock ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[13px] text-amber-700 leading-6">
            💡 שלב ראשון: רק תצוגת מוצרים ומחירים. בהמשך נחליט יחד —
            עדכון אוטומטי של המאגר, או הצגה לאישור המנהל לפני שמירה.
          </div>
        </div>
      )}

      {/* ════════ TAB FILES (Excel / JSON) ════════ */}
      {tab === 'files' && (
        <>
          {schema && (
            <div className="bg-white rounded-2xl border border-slate-100 mb-6 overflow-hidden">
              <button onClick={() => setGuideOpen(v => !v)} className="w-full flex items-center justify-between p-5">
                <div className="flex items-center gap-2"><Info className="w-5 h-5 text-primary-600" /><h2 className="font-bold text-slate-800">מבנה הקובץ — שדות נדרשים</h2></div>
                {guideOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {guideOpen && <div className="px-6 pb-6 border-t border-slate-50 pt-4">
                <p className="text-[12px] font-black text-red-500 uppercase tracking-wide mb-2">חובה</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {required.map(f => (
                    <div key={f.key} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                      <code className="text-[12px] font-mono font-bold text-red-700" dir="ltr">{f.key}</code>
                      <span className="text-[11px] text-slate-500">{f.label} · {f.type}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[12px] font-black text-slate-400 uppercase tracking-wide mb-2">אופציונלי</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-[13px]">
                    <thead className="text-[11px] text-slate-400 uppercase">
                      <tr><th className="py-2 px-2">שדה</th><th className="py-2 px-2">תיאור</th><th className="py-2 px-2">סוג</th><th className="py-2 px-2">דוגמה</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {optional.map(f => (
                        <tr key={f.key}>
                          <td className="py-2 px-2"><code className="font-mono font-bold text-slate-700" dir="ltr">{f.key}</code></td>
                          <td className="py-2 px-2 text-slate-500">{f.label}{f.note && <span className="block text-[11px] text-amber-600">⚠ {f.note}</span>}</td>
                          <td className="py-2 px-2"><span className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">{f.type}</span></td>
                          <td className="py-2 px-2 text-slate-400 font-mono text-[11px]" dir="ltr">{Array.isArray(f.example) || typeof f.example === 'object' ? JSON.stringify(f.example) : String(f.example ?? '')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button onClick={downloadExample} className="mt-4 flex items-center gap-2 text-[13px] font-bold text-primary-600 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-xl transition-colors">
                  <Download className="w-4 h-4" />הורד קובץ JSON לדוגמה
                </button>
              </div>}
            </div>
          )}

          {schema && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-6">
              <div className="flex items-center gap-2 mb-3"><Database className="w-4 h-4 text-slate-500" /><h3 className="font-bold text-[14px] text-slate-700">ערכים קיימים במאגר — מומלץ לעקביות</h3></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[['קטגוריות', schema.existingCategories, '#CC785C'], ['מותגים', schema.existingBrands, '#7C3AED'], ['תגיות', schema.existingTags, '#059669']].map(([label, items, color]) => (
                  <div key={label}>
                    <p className="text-[12px] font-bold mb-1.5" style={{ color }}>{label} ({items.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {items.length ? items.map(i => <span key={i} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>{i}</span>) : <span className="text-[11px] text-slate-300">—</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-3"><FileSpreadsheet className="w-5 h-5 text-emerald-600" /><h2 className="font-bold text-slate-800">ייבוא מ-Excel</h2></div>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-8 cursor-pointer hover:border-primary-300 transition-colors">
                <Upload className="w-8 h-8 text-slate-300" /><span className="text-[13px] text-slate-500">לחץ להעלאת קובץ .xlsx</span>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => importExcel(e.target.files[0])} disabled={busy} />
              </label>
              <p className="text-[11px] text-slate-400 mt-2">השורה הראשונה = שמות העמודות (לפי השדות למעלה)</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-[13px] font-bold text-slate-700 mb-2">אם מק"ט כבר קיים:</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setOverwriteSku(false)} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border-2 transition-all ${!overwriteSku ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-400'}`}>➕ צור חדש (דלג אם קיים)</button>
                <button type="button" onClick={() => setOverwriteSku(true)} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border-2 transition-all ${overwriteSku ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-400'}`}>🔄 עדכן מוצר קיים</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-3"><FileJson className="w-5 h-5 text-primary-600" /><h2 className="font-bold text-slate-800">ייבוא מ-JSON</h2></div>
              {/* Upload d'un fichier .json (alternative au copier-coller) */}
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-primary-300 transition-colors mb-3">
                <Upload className="w-7 h-7 text-slate-300" />
                <span className="text-[13px] text-slate-500">לחץ להעלאת קובץ .json</span>
                {jsonFileName && <span className="text-[12px] font-bold text-primary-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" />{jsonFileName}</span>}
                <input type="file" accept=".json,application/json" className="hidden" onChange={e => loadJsonFile(e.target.files[0])} disabled={busy} />
              </label>

              <p className="text-[11px] text-slate-400 mb-2">או הדבק את ה-JSON ישירות:</p>
              <textarea value={jsonText} onChange={e => { setJsonText(e.target.value); setJsonFileName('') }} rows={8} dir="ltr" placeholder={schema ? buildExample() : '[{"name":"...","price":100}]'} className="input font-mono text-[12px] resize-none w-full mb-3" />
              <button onClick={importJson} disabled={busy || !jsonText.trim()} className="btn btn-primary px-6 py-2.5">{busy ? 'מייבא...' : 'ייבא JSON'}</button>
            </div>

            {result && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-green-700 mb-1"><Check className="w-5 h-5" /><span className="text-[14px] font-bold">הייבוא הושלם — {result.imported} נוספו{result.updated ? `, ${result.updated} עודכנו` : ''}</span></div>
                {result.errors?.length > 0 && <p className="text-[12px] text-amber-600">{result.errors.length} שגיאות (שורות שדולגו)</p>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}