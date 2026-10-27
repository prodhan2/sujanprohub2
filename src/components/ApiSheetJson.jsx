import React, { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

function ApiSheetJson() {
  const [searchParams] = useSearchParams()
  const sheetId = searchParams.get('id')
  const sheetTab = searchParams.get('sheet') || '1'

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    document.title = 'Sheet JSON API | SujanPro'

    if (!sheetId) {
      setLoading(false)
      setError({
        status: 'error',
        message: "Missing 'id' query parameter.",
        usage: "https://sujanpro.web.app/api/sheet-json?id=YOUR_GOOGLE_SHEET_ID&sheet=Sheet1",
        documentation: "https://sujanpro.web.app/sheet-to-json"
      })
      return
    }

    const fetchSheetData = async () => {
      setLoading(true)
      setError(null)

      try {
        let result = null

        // Primary Engine (High-speed JSON parser)
        try {
          const osUrl = `https://opensheet.elk.sh/${sheetId}/${encodeURIComponent(sheetTab)}`
          const osRes = await fetch(osUrl)
          if (osRes.ok) {
            const osJson = await osRes.json()
            if (Array.isArray(osJson)) {
              result = osJson
            }
          }
        } catch (osErr) {
          console.warn('Engine 1 fallback:', osErr)
        }

        // Secondary Fallback Engine (Google GViz)
        if (!result) {
          const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json${sheetTab ? `&sheet=${encodeURIComponent(sheetTab)}` : ''}`
          const gvizRes = await fetch(gvizUrl)
          if (!gvizRes.ok) {
            throw new Error(`Failed to load sheet (HTTP ${gvizRes.status}). Ensure the sheet is public with "Anyone with the link can view".`)
          }
          const text = await gvizRes.text()
          const start = text.indexOf('{')
          const end = text.lastIndexOf('}')
          if (start !== -1 && end !== -1) {
            const gvizJson = JSON.parse(text.substring(start, end + 1))
            const cols = gvizJson.table.cols || []
            const rows = gvizJson.table.rows || []
            let headers = cols.map((c, i) => (c && c.label && c.label.trim()) || `Col_${i + 1}`)

            const hasLabels = cols.some(c => c && c.label && c.label.trim())
            let dataRows = rows
            if (!hasLabels && rows.length > 0) {
              const firstCells = rows[0].c || []
              headers = firstCells.map((c, i) => (c && c.v !== null ? String(c.v) : `Col_${i + 1}`))
              dataRows = rows.slice(1)
            }

            result = dataRows.map(r => {
              const rowObj = {}
              const cells = r.c || []
              headers.forEach((h, i) => {
                const cell = cells[i]
                rowObj[h] = cell ? (cell.f !== undefined ? cell.f : (cell.v !== undefined ? cell.v : null)) : null
              })
              return rowObj
            })
          }
        }

        if (!result) {
          throw new Error('Unable to parse sheet data. Please check permissions.')
        }

        setData(result)
      } catch (err) {
        setError({
          status: 'error',
          message: err.message || 'Failed to fetch sheet data.',
          sheetId,
          sheetTab
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSheetData()
  }, [sheetId, sheetTab])

  const outputString = data ? JSON.stringify(data, null, 2) : error ? JSON.stringify(error, null, 2) : ''

  const handleCopy = () => {
    navigator.clipboard.writeText(outputString).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#090d16',
      color: '#38bdf8',
      fontFamily: 'Consolas, "SFMono-Regular", Menlo, Monaco, monospace',
      fontSize: '13px',
      lineHeight: 1.5,
      padding: '16px',
      position: 'relative'
    }}>
      {/* Floating Toolbar */}
      <div style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 100,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '6px 12px',
        borderRadius: '9999px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
      }}>
        <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>
          {loading ? 'Fetching...' : data ? `${data.length} items` : 'API Response'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            background: copied ? '#22c55e' : '#f9532d',
            color: 'white',
            border: 'none',
            borderRadius: '9999px',
            padding: '4px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            fontWeight: 700
          }}
        >
          {copied ? 'Copied!' : 'Copy JSON'}
        </button>
        <Link
          to="/sheet-to-json"
          style={{
            color: '#cbd5e1',
            textDecoration: 'none',
            fontSize: '11px',
            padding: '4px 8px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '9999px'
          }}
        >
          Visual Tool
        </Link>
      </div>

      {loading ? (
        <div style={{ color: '#94a3b8', padding: '20px' }}>Loading sheet JSON from SujanPro API...</div>
      ) : (
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          <code>{outputString}</code>
        </pre>
      )}
    </div>
  )
}

export default ApiSheetJson
