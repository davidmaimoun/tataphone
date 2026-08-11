'use client'
import { useState, useEffect } from 'react'
import { Upload, FileJson, FileSpreadsheet, Check, Download, Database, Info, ChevronDown, ChevronUp, Plug, RefreshCw, Search, Loader2 } from 'lucide-react'
import { productAdmin } from '@/services/productService'
import api from '@/services/api'
import toast from 'react-hot-toast'

// Extensions et types acceptés par format
const FORMAT_EXT = { json: '.json', xlsx: '.xlsx / .xls', csv: '.csv', tsv: '.tsv' }
const FORMAT_ACCEPT = {
  json: '.json,application/json',
  xlsx: '.xlsx,.xls',
  csv:  '.csv,text/csv',
  tsv:  '.tsv,text/tab-separated-values',
}

// Parse un texte CSV/TSV en tableau d'objets (1re ligne = en-têtes).
// Gère les champs entre guillemets et les "" échappés.
function parseDelimited(text, delimiter) {
  const rows = []
  let field = '', row = [], inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i+1] === '"') { field += '"'; i++ }
      else if (c === '"') inQuotes = false
      else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === delimiter) { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); field = ''; row = [] }
      else if (c === '\r') { /* ignore */ }
      else field += c
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  if (rows.length < 2) return []
  const headers = rows[0].map(h => h.trim())
  return rows.slice(1).filter(r => r.some(c => c.trim())).map(r => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim() })
    // Reconvertir les champs structurés exportés par la sélection batch
    if (obj.tags != null && typeof obj.tags === 'string') obj.tags = obj.tags ? obj.tags.split('|') : []
    if (obj.specs != null && typeof obj.specs === 'string') { try { obj.specs = JSON.parse(obj.specs) } catch { obj.specs = {} } }
    return obj
  })
}

export default function AdminImport() {
  const [tab, setTab] = useState('files')        // 'api' | 'files' — défaut 'files' (l'API Priority n'est pas encore branchée)
  const [schema, setSchema] = useState(null)
  const [jsonText, setJsonText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [overwriteSku, setOverwriteSku] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [importFormat, setImportFormat] = useState('json')  // 'json' | 'xlsx' | 'csv' | 'tsv'
  const [fileName, setFileName] = useState('')

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

  // Route le fichier uploadé selon le format sélectionné.
  const handleFile = async (file) => {
    if (!file) return
    setFileName('')
    setResult(null)

    // JSON → on charge dans la textarea pour relecture avant import
    if (importFormat === 'json') {
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        if (!Array.isArray(parsed)) return toast.error('הקובץ חייב להכיל מערך של מוצרים')
        setJsonText(JSON.stringify(parsed, null, 2))
        setFileName(file.name)
        toast.success(`נטענו ${parsed.length} מוצרים — בדוק ולחץ על ייבוא`)
      } catch { toast.error('קובץ JSON לא תקין') }
      return
    }

    // Excel (.xlsx) → endpoint backend natif (openpyxl)
    if (importFormat === 'xlsx') {
      setFileName(file.name)
      setBusy(true)
      try {
        const fd = new FormData(); fd.append('file', file)
        const r = await productAdmin.importExcel(fd)
        setResult(r)
        toast.success(`הקובץ יובא! ${r.imported ? `(${r.imported} מוצרים)` : ''} 🎉`)
      } catch (e) { toast.error(e?.response?.data?.error || 'שגיאה בייבוא') } finally { setBusy(false) }
      return
    }

    // CSV / TSV → on parse côté client puis on envoie via le endpoint JSON
    // (qui gère overwriteSku / mise à jour par SKU, contrairement au endpoint Excel).
    try {
      const text = await file.text()
      const delimiter = importFormat === 'tsv' ? '\t' : ','
      const products = parseDelimited(text, delimiter)
      if (products.length === 0) return toast.error('הקובץ ריק או לא תקין')
      setFileName(file.name)
      setBusy(true)
      const r = await productAdmin.importJson(products, overwriteSku)
      setResult(r)
      toast.success(`יובאו ${r.imported ?? products.length} מוצרים! 🎉`)
    } catch (e) { toast.error(e?.response?.data?.error || 'שגיאה בקריאת הקובץ') } finally { setBusy(false) }
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
            {/* Choix du format d'import */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="font-bold text-slate-800 mb-3">בחר פורמט ייבוא</h2>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'json', label: 'JSON', icon: '📋' },
                  { id: 'xlsx', label: 'Excel', icon: '📊' },
                  { id: 'csv',  label: 'CSV',  icon: '📄' },
                  { id: 'tsv',  label: 'TSV',  icon: '📄' },
                ].map(f => (
                  <button key={f.id} type="button" onClick={() => setImportFormat(f.id)}
                    className={`py-3 rounded-xl text-[13px] font-bold border-2 transition-all ${importFormat === f.id ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-400 hover:border-primary-200'}`}>
                    <span className="block text-lg mb-0.5">{f.icon}</span>{f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Comportement si SKU déjà existant */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <p className="text-[13px] font-bold text-slate-700 mb-1">אם מק"ט (SKU) כבר קיים במאגר:</p>
              <p className="text-[11px] text-slate-400 mb-2">ההתאמה מתבצעת לפי המק"ט (SKU) — לכן חשוב שלכל מוצר יהיה מק"ט ייחודי.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setOverwriteSku(false)} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border-2 transition-all ${!overwriteSku ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-400'}`}>➕ צור חדש (דלג אם קיים)</button>
                <button type="button" onClick={() => setOverwriteSku(true)} className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold border-2 transition-all ${overwriteSku ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-400'}`}>🔄 עדכן מוצר קיים</button>
              </div>
            </div>

            {/* Zone d'import selon le format choisi */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-center gap-2 mb-3">
                {importFormat === 'json' ? <FileJson className="w-5 h-5 text-primary-600" /> : <FileSpreadsheet className="w-5 h-5 text-emerald-600" />}
                <h2 className="font-bold text-slate-800">ייבוא מקובץ {importFormat.toUpperCase()}</h2>
              </div>

              {/* Upload fichier (tous formats) */}
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-primary-300 transition-colors mb-3">
                <Upload className="w-7 h-7 text-slate-300" />
                <span className="text-[13px] text-slate-500">לחץ להעלאת קובץ {FORMAT_EXT[importFormat]}</span>
                {fileName && <span className="text-[12px] font-bold text-primary-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" />{fileName}</span>}
                <input type="file" accept={FORMAT_ACCEPT[importFormat]} className="hidden" onChange={e => handleFile(e.target.files[0])} disabled={busy} />
              </label>

              {/* Copy-paste : uniquement pour JSON */}
              {importFormat === 'json' && (
                <>
                  <p className="text-[11px] text-slate-400 mb-2">או הדבק את ה-JSON ישירות:</p>
                  <textarea value={jsonText} onChange={e => { setJsonText(e.target.value); setFileName('') }} rows={8} dir="ltr" placeholder={schema ? buildExample() : '[{"name":"...","price":100}]'} className="input font-mono text-[12px] resize-none w-full mb-3" />
                  <button onClick={importJson} disabled={busy || !jsonText.trim()} className="btn btn-primary px-6 py-2.5">{busy ? 'מייבא...' : 'ייבא JSON'}</button>
                </>
              )}

              {importFormat !== 'json' && (
                <p className="text-[11px] text-slate-400">השורה הראשונה = שמות העמודות (לפי השדות למעלה)</p>
              )}
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