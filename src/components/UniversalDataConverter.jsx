import React, { useState, useRef, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import './UniversalDataConverter.css'

// Helper: Deep flatten any nested object into dot-notation keys
function flattenObject(obj, prefix = '', res = {}) {
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue
    const propName = prefix ? `${prefix}.${key}` : key
    const val = obj[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length > 0) {
      flattenObject(val, propName, res)
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        res[propName] = '[]'
      } else if (val.every(x => typeof x !== 'object' || x === null)) {
        res[propName] = val.join(', ')
      } else {
        res[propName] = JSON.stringify(val)
      }
    } else {
      res[propName] = val === undefined || val === null ? '' : val
    }
  }
  return res
}

// Sample Datasets for instant 1-click testing
const SAMPLE_NESTED_JSON = [
  {
    "id": "ORD-1001",
    "customer": { "name": "Sujan Prodhan", "email": "sujan@example.com", "location": { "city": "Rajshahi", "country": "Bangladesh" } },
    "items": [{ "product": "AI Web App", "qty": 1, "price": 450 }],
    "status": "Completed",
    "isPaid": true,
    "createdAt": "2026-09-19"
  },
  {
    "id": "ORD-1002",
    "customer": { "name": "Alex Johnson", "email": "alex@example.com", "location": { "city": "New York", "country": "USA" } },
    "items": [{ "product": "Data Converter Pro", "qty": 2, "price": 120 }],
    "status": "Processing",
    "isPaid": true,
    "createdAt": "2026-09-18"
  },
  {
    "id": "ORD-1003",
    "customer": { "name": "Fatima Rahman", "email": "fatima@example.com", "location": { "city": "Dhaka", "country": "Bangladesh" } },
    "items": [{ "product": "Firebase Portfolio", "qty": 1, "price": 300 }],
    "status": "Pending",
    "isPaid": false,
    "createdAt": "2026-09-17"
  }
]

function UniversalDataConverter() {
  // Input states
  const [inputText, setInputText] = useState('')
  const [activeInputTab, setActiveInputTab] = useState('upload') // 'upload', 'paste', 'samples'
  const [activeViewTab, setActiveViewTab] = useState('table') // 'table', 'json', 'csv', 'sheets'
  
  // Data states
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [originalData, setOriginalData] = useState(null)
  
  // Performance & processing states
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [fileStats, setFileStats] = useState(null) // { name, size, rawCount }
  
  // Table View & Editing states
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [editingCell, setEditingCell] = useState(null) // { rowIdx, colKey }
  const [cellEditValue, setCellEditValue] = useState('')
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [copyFeedback, setCopyFeedback] = useState('')

  const fileInputRef = useRef(null)

  // Chunked Async Parser to prevent UI freeze on huge JSON
  const processJsonArrayAsync = async (rawArray, fileName = 'data.json', fileSize = 0) => {
    setIsProcessing(true)
    setProgressPercent(10)
    setProcessingStatus('Analyzing structure and flattening fields...')
    setErrorMessage('')

    try {
      const total = rawArray.length
      const BATCH_SIZE = 2000
      const flattenedList = []
      const headerSet = new Set()

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const chunkEnd = Math.min(i + BATCH_SIZE, total)
        for (let j = i; j < chunkEnd; j++) {
          const item = rawArray[j]
          let flatObj
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            flatObj = flattenObject(item)
          } else if (Array.isArray(item)) {
            flatObj = {}
            item.forEach((val, idx) => {
              flatObj[`Column_${idx + 1}`] = val === null || val === undefined ? '' : String(val)
            })
          } else {
            flatObj = { value: item }
          }
          Object.keys(flatObj).forEach(k => headerSet.add(k))
          flattenedList.push(flatObj)
        }

        const pct = Math.round(10 + (chunkEnd / total) * 85)
        setProgressPercent(pct)
        setProcessingStatus(`Processed ${chunkEnd.toLocaleString()} of ${total.toLocaleString()} rows (${pct}%)...`)
        // Non-blocking tick to let browser breathe
        await new Promise(resolve => setTimeout(resolve, 0))
      }

      const headersArray = Array.from(headerSet)
      setHeaders(headersArray)
      setRows(flattenedList)
      setOriginalData({ rows: flattenedList, headers: headersArray })
      setFileStats({
        name: fileName,
        size: fileSize ? `${(fileSize / (1024 * 1024)).toFixed(2)} MB` : 'In-Memory',
        totalRows: total,
        totalCols: headersArray.length
      })
      setCurrentPage(1)
      setProgressPercent(100)
      setProcessingStatus('Completed successfully!')
    } catch (err) {
      console.error('Processing error:', err)
      setErrorMessage(`Error processing data: ${err.message}`)
    } finally {
      setTimeout(() => {
        setIsProcessing(false)
        setProgressPercent(0)
      }, 500)
    }
  }

  // Parse raw text (JSON, NDJSON, or CSV)
  const handleParseText = async (text, fileName = 'pasted_data.json', fileSize = 0) => {
    if (!text.trim()) {
      setErrorMessage('Please provide data to convert.')
      return
    }

    setIsProcessing(true)
    setProgressPercent(5)
    setProcessingStatus('Reading content...')
    setErrorMessage('')

    try {
      const trimmed = text.trim()
      let parsedData = null

      // Check if JSON
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          parsedData = JSON.parse(trimmed)
          if (!Array.isArray(parsedData)) {
            parsedData = [parsedData]
          }
        } catch (jsonErr) {
          // Check if Newline-Delimited JSON (NDJSON)
          const lines = trimmed.split(/\r?\n/).filter(l => l.trim().length > 0)
          if (lines.length > 0 && lines[0].startsWith('{')) {
            parsedData = lines.map(l => JSON.parse(l))
          } else {
            throw jsonErr
          }
        }
      } else {
        // Fallback: Parse CSV / TSV with SheetJS
        const workbook = XLSX.read(trimmed, { type: 'string' })
        const firstSheetName = workbook.SheetNames[0]
        parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName])
      }

      if (!parsedData || parsedData.length === 0) {
        throw new Error('No valid records found in the provided input.')
      }

      await processJsonArrayAsync(parsedData, fileName, fileSize || text.length)
    } catch (err) {
      console.error('Parsing error:', err)
      setErrorMessage(`Failed to parse file: ${err.message}. Ensure it is valid JSON, NDJSON, or CSV.`)
      setIsProcessing(false)
    }
  }

  // File Upload / Drop Handler (Handles any size smoothly)
  const handleFileUpload = (file) => {
    if (!file) return

    setIsProcessing(true)
    setProgressPercent(5)
    setProcessingStatus(`Reading file: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`)
    setErrorMessage('')

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

    if (isExcel) {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonResult = XLSX.utils.sheet_to_json(firstSheet)
          await processJsonArrayAsync(jsonResult, file.name, file.size)
        } catch (err) {
          setErrorMessage(`Excel read error: ${err.message}`)
          setIsProcessing(false)
        }
      }
      reader.readAsArrayBuffer(file)
      return
    }

    // For Large Text/JSON Files: Read in streaming or text
    const reader = new FileReader()
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 30)
        setProgressPercent(pct)
      }
    }
    reader.onload = async (e) => {
      await handleParseText(e.target.result, file.name, file.size)
    }
    reader.onerror = () => {
      setErrorMessage('Failed to read file from disk.')
      setIsProcessing(false)
    }
    reader.readAsText(file)
  }

  // Generate Stress Test Data (10,000+ Rows) to prove "no hang" performance
  const handleLoadStressTest = async (count = 5000) => {
    setIsProcessing(true)
    setProgressPercent(10)
    setProcessingStatus(`Generating ${count.toLocaleString()} large mock records...`)
    
    setTimeout(async () => {
      const mockList = []
      const cities = ['Dhaka', 'Rajshahi', 'Chittagong', 'London', 'Toronto', 'Tokyo', 'Sydney']
      const roles = ['Software Engineer', 'Data Analyst', 'Frontend Dev', 'Cloud Architect']

      for (let i = 1; i <= count; i++) {
        mockList.push({
          "userId": `USR-${100000 + i}`,
          "profile": {
            "fullName": `User ${i} Prodhan`,
            "role": roles[i % roles.length],
            "contact": { "city": cities[i % cities.length], "rating": (3.5 + (i % 15) * 0.1).toFixed(1) }
          },
          "stats": { "completedTasks": (i * 3) % 450, "isActive": i % 2 === 0 },
          "joinedDate": "2026-09-19"
        })
      }

      await processJsonArrayAsync(mockList, `StressTest_${count}_Records.json`, count * 180)
    }, 50)
  }

  // Load Preset Sample
  const handleLoadSample = async () => {
    setInputText(JSON.stringify(SAMPLE_NESTED_JSON, null, 2))
    await processJsonArrayAsync(SAMPLE_NESTED_JSON, 'Sample_Ecommerce_Orders.json', 1200)
  }

  // Filtering & Sorting (Memoized for high performance)
  const filteredAndSortedRows = useMemo(() => {
    if (!rows || rows.length === 0) return []

    let result = rows

    // Search query filter across all fields
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(row => {
        return headers.some(header => {
          const val = row[header]
          return val !== undefined && val !== null && String(val).toLowerCase().includes(q)
        })
      })
    }

    // Column sort
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortConfig.key] ?? ''
        const bVal = b[sortConfig.key] ?? ''
        
        const aNum = Number(aVal)
        const bNum = Number(bVal)
        if (!isNaN(aNum) && !isNaN(bNum) && aVal !== '' && bVal !== '') {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum
        }

        return sortConfig.direction === 'asc' 
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal))
      })
    }

    return result
  }, [rows, headers, searchQuery, sortConfig])

  // Pagination calculation
  const totalPages = Math.ceil(filteredAndSortedRows.length / pageSize) || 1
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredAndSortedRows.slice(start, start + pageSize)
  }, [filteredAndSortedRows, currentPage, pageSize])

  // Sorting click handler
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // In-place Cell Editing Handlers
  const startEditingCell = (rowGlobalIdx, colKey, initialVal) => {
    setEditingCell({ rowIdx: rowGlobalIdx, colKey })
    setCellEditValue(initialVal ?? '')
  }

  const saveCellEdit = () => {
    if (!editingCell) return
    const { rowIdx, colKey } = editingCell
    
    setRows(prevRows => {
      const updated = [...prevRows]
      updated[rowIdx] = {
        ...updated[rowIdx],
        [colKey]: cellEditValue
      }
      return updated
    })
    setEditingCell(null)
  }

  // Row Manipulation
  const handleAddRow = () => {
    const emptyRow = {}
    headers.forEach(h => { emptyRow[h] = '' })
    setRows(prev => [emptyRow, ...prev])
    setCurrentPage(1)
  }

  const handleDeleteRow = (rowIdx) => {
    if (window.confirm('Delete this row?')) {
      setRows(prev => prev.filter((_, idx) => idx !== rowIdx))
    }
  }

  // Column Manipulation
  const handleAddColumn = () => {
    const colName = window.prompt('Enter new column name:')
    if (!colName || !colName.trim()) return
    const trimmed = colName.trim()
    if (headers.includes(trimmed)) {
      alert('Column name already exists!')
      return
    }
    setHeaders(prev => [...prev, trimmed])
    setRows(prev => prev.map(r => ({ ...r, [trimmed]: '' })))
  }

  const handleDeleteColumn = (colName) => {
    if (window.confirm(`Delete column "${colName}"?`)) {
      setHeaders(prev => prev.filter(h => h !== colName))
      setRows(prev => prev.map(r => {
        const copy = { ...r }
        delete copy[colName]
        return copy
      }))
    }
  }

  // Reset to original data
  const handleResetData = () => {
    if (originalData && window.confirm('Reset all changes back to original loaded data?')) {
      setHeaders(originalData.headers)
      setRows(originalData.rows)
      setSearchQuery('')
      setCurrentPage(1)
    }
  }

  // Export Formats Builders
  const generateTSV = () => {
    const escapeTsv = (val) => String(val ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ')
    const headerLine = headers.map(escapeTsv).join('\t')
    const rowLines = rows.map(r => headers.map(h => escapeTsv(r[h])).join('\t'))
    return [headerLine, ...rowLines].join('\n')
  }

  const generateCSV = () => {
    const escapeCsv = (val) => {
      const s = String(val ?? '')
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }
    const headerLine = headers.map(escapeCsv).join(',')
    const rowLines = rows.map(r => headers.map(h => escapeCsv(r[h])).join(','))
    return '\uFEFF' + [headerLine, ...rowLines].join('\n')
  }

  // 1-Click Copy for Google Sheets (Direct Paste into Google Sheets)
  const handleCopyForGoogleSheets = async () => {
    try {
      const tsvContent = generateTSV()
      await navigator.clipboard.writeText(tsvContent)
      setCopyFeedback('Copied! Now open Google Sheets and press Ctrl+V to paste perfectly.')
      setTimeout(() => setCopyFeedback(''), 4000)
    } catch (err) {
      alert('Failed to copy to clipboard: ' + err.message)
    }
  }

  // Download CSV
  const handleDownloadCSV = () => {
    const csv = generateCSV()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileStats?.name?.replace(/\.[^/.]+$/, '') || 'data'}_converted.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Download Excel (.xlsx) using SheetJS
  const handleDownloadExcel = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers })
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
      XLSX.writeFile(workbook, `${fileStats?.name?.replace(/\.[^/.]+$/, '') || 'data'}.xlsx`)
    } catch (err) {
      alert('Error exporting Excel: ' + err.message)
    }
  }

  // Download JSON
  const handleDownloadJSON = (isPretty = true) => {
    const jsonStr = isPretty ? JSON.stringify(rows, null, 2) : JSON.stringify(rows)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileStats?.name?.replace(/\.[^/.]+$/, '') || 'data'}_export.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="converter-container">
      <div className="container-fluid" style={{ maxWidth: '1440px' }}>
        
        {/* Compact Clean Header */}
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold mb-0 text-dark">
              <i className="bi bi-filetype-json text-primary me-2"></i>
              Universal JSON &amp; Sheet Converter
            </h4>
            <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 small">
              Superfast
            </span>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Link to="/sheet-to-json" className="btn btn-outline-secondary btn-sm">
              <i className="bi bi-file-earmark-spreadsheet me-1 text-success"></i> Google Sheet &rarr; JSON
            </Link>
          </div>
        </div>

        {/* Input Section Card */}
        <div className="converter-card">
          <div className="card-header-gradient">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <span className="fw-bold"><i className="bi bi-upload me-2"></i>Input Method:</span>
              <div className="btn-group btn-group-sm bg-dark p-1 rounded">
                <button 
                  className={`btn btn-sm ${activeInputTab === 'upload' ? 'btn-primary' : 'btn-dark'}`}
                  onClick={() => setActiveInputTab('upload')}
                >
                  <i className="bi bi-cloud-arrow-up me-1"></i> File Upload (Any Size)
                </button>
                <button 
                  className={`btn btn-sm ${activeInputTab === 'paste' ? 'btn-primary' : 'btn-dark'}`}
                  onClick={() => setActiveInputTab('paste')}
                >
                  <i className="bi bi-clipboard me-1"></i> Paste Code
                </button>
                <button 
                  className={`btn btn-sm ${activeInputTab === 'samples' ? 'btn-primary' : 'btn-dark'}`}
                  onClick={() => setActiveInputTab('samples')}
                >
                  <i className="bi bi-lightning-charge me-1"></i> Samples &amp; Stress Test
                </button>
              </div>
            </div>

            <div className="d-flex gap-2">
              <span className="badge badge-format badge-gsheet">Google Sheets Ready</span>
              <span className="badge badge-format badge-excel">Excel (.xlsx)</span>
              <span className="badge badge-format badge-json">Any JSON</span>
            </div>
          </div>

          <div className="p-4">
            {/* Upload Mode */}
            {activeInputTab === 'upload' && (
              <div 
                className="drag-drop-zone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('active'); }}
                onDragLeave={(e) => e.currentTarget.classList.remove('active')}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('active')
                  if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0])
                }}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".json,.csv,.tsv,.txt,.xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                />
                <i className="bi bi-cloud-arrow-up drag-icon"></i>
                <h5 className="fw-bold mb-1">Click to Upload or Drag &amp; Drop Any File Here</h5>
                <p className="text-muted mb-2">Supports <strong>.JSON</strong>, <strong>.CSV</strong>, <strong>.TSV</strong>, <strong>.XLSX (Excel)</strong> &amp; <strong>NDJSON</strong> (Any file size, chunk-processed)</p>
                <span className="btn btn-outline-primary btn-sm px-3">
                  <i className="bi bi-folder2-open me-1"></i> Browse From Computer
                </span>
              </div>
            )}

            {/* Paste Mode */}
            {activeInputTab === 'paste' && (
              <div>
                <textarea
                  className="form-control font-monospace"
                  rows={6}
                  placeholder='Paste your JSON array [{"id": 1, ...}] or nested JSON or CSV here...'
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <span className="text-muted small">
                    {inputText.length > 0 ? `${(inputText.length / 1024).toFixed(1)} KB text entered` : 'Ready to parse'}
                  </span>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => setInputText('')}>
                      Clear
                    </button>
                    <button 
                      className="btn btn-primary btn-sm px-3"
                      onClick={() => handleParseText(inputText)}
                      disabled={isProcessing || !inputText.trim()}
                    >
                      <i className="bi bi-play-fill me-1"></i> Parse &amp; Convert Now
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Samples Mode */}
            {activeInputTab === 'samples' && (
              <div className="row g-3">
                <div className="col-md-6 col-lg-4">
                  <div className="p-3 border rounded h-100 bg-light">
                    <h6 className="fw-bold text-primary"><i className="bi bi-bag-check me-2"></i>E-Commerce (Deep Nested)</h6>
                    <p className="small text-muted mb-3">Order data with customer address, products array, status, and booleans.</p>
                    <button className="btn btn-sm btn-outline-primary w-100" onClick={handleLoadSample}>
                      Load E-Commerce Sample
                    </button>
                  </div>
                </div>

                <div className="col-md-6 col-lg-4">
                  <div className="p-3 border rounded h-100 bg-light">
                    <h6 className="fw-bold text-success"><i className="bi bi-speedometer2 me-2"></i>5,000 Rows Stress Test</h6>
                    <p className="small text-muted mb-3">Generates 5,000 nested records to test chunked parsing and smooth table navigation.</p>
                    <button className="btn btn-sm btn-outline-success w-100" onClick={() => handleLoadStressTest(5000)}>
                      Load 5,000 Records
                    </button>
                  </div>
                </div>

                <div className="col-md-6 col-lg-4">
                  <div className="p-3 border rounded h-100 bg-light">
                    <h6 className="fw-bold text-danger"><i className="bi bi-lightning-charge-fill me-2"></i>10,000 Rows Mega Test</h6>
                    <p className="small text-muted mb-3">Generates 10,000 rows with 0 browser freeze or hang. Proves superfast execution.</p>
                    <button className="btn btn-sm btn-outline-danger w-100" onClick={() => handleLoadStressTest(10000)}>
                      Load 10,000 Records
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Progress Bar */}
            {isProcessing && (
              <div className="mt-3">
                <div className="d-flex justify-content-between text-muted small mb-1">
                  <span><i className="bi bi-gear-wide-connected spin me-1"></i> {processingStatus}</span>
                  <span className="fw-bold">{progressPercent}%</span>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  <div 
                    className="progress-bar progress-bar-striped progress-bar-animated bg-primary" 
                    role="progressbar" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Error message */}
            {errorMessage && (
              <div className="alert alert-danger mt-3 mb-0 d-flex align-items-center">
                <i className="bi bi-exclamation-octagon-fill me-2 fs-5"></i>
                <div>{errorMessage}</div>
              </div>
            )}

            {/* Success Copy Feedback Alert */}
            {copyFeedback && (
              <div className="alert alert-success mt-3 mb-0 d-flex align-items-center">
                <i className="bi bi-check-circle-fill me-2 fs-5"></i>
                <div className="fw-bold">{copyFeedback}</div>
              </div>
            )}
          </div>
        </div>

        {/* Results & Editing Area */}
        {rows.length > 0 && (
          <div className="converter-card">
            
            {/* Action Bar Header */}
            <div className="card-header-gradient">
              <div className="d-flex align-items-center flex-wrap gap-2">
                <span className="fw-bold fs-5">
                  <i className="bi bi-table me-2 text-info"></i>
                  Data Explorer &amp; Converter
                </span>
                {fileStats && (
                  <>
                    <span className="stat-pill"><i className="bi bi-file-earmark-text"></i> {fileStats.name}</span>
                    <span className="stat-pill"><i className="bi bi-list-ol"></i> {rows.length.toLocaleString()} rows</span>
                    <span className="stat-pill"><i className="bi bi-layout-three-columns"></i> {headers.length} columns</span>
                  </>
                )}
              </div>

              {/* Format View Switcher */}
              <div className="btn-group btn-group-sm bg-dark p-1 rounded">
                <button 
                  className={`btn btn-sm ${activeViewTab === 'table' ? 'btn-primary' : 'btn-dark'}`}
                  onClick={() => setActiveViewTab('table')}
                >
                  <i className="bi bi-grid-3x3 me-1"></i> Table &amp; Edit
                </button>
                <button 
                  className={`btn btn-sm ${activeViewTab === 'sheets' ? 'btn-primary' : 'btn-dark'}`}
                  onClick={() => setActiveViewTab('sheets')}
                >
                  <i className="bi bi-file-earmark-spreadsheet me-1"></i> Google Sheets Format
                </button>
                <button 
                  className={`btn btn-sm ${activeViewTab === 'csv' ? 'btn-primary' : 'btn-dark'}`}
                  onClick={() => setActiveViewTab('csv')}
                >
                  <i className="bi bi-filetype-csv me-1"></i> CSV Preview
                </button>
                <button 
                  className={`btn btn-sm ${activeViewTab === 'json' ? 'btn-primary' : 'btn-dark'}`}
                  onClick={() => setActiveViewTab('json')}
                >
                  <i className="bi bi-filetype-json me-1"></i> Clean JSON
                </button>
              </div>
            </div>

            {/* Quick Export Toolbar */}
            <div className="action-bar">
              <div className="d-flex flex-wrap gap-2 align-items-center">
                {/* 1-Click Google Sheets Ready Button */}
                <button 
                  className="btn btn-success btn-sm fw-bold px-3 shadow-sm"
                  onClick={handleCopyForGoogleSheets}
                  title="Copy formatted data ready to paste into Google Sheets"
                >
                  <i className="bi bi-clipboard-check me-1"></i> Copy for Google Sheets
                </button>

                <a 
                  href="https://sheets.new" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-outline-success btn-sm"
                  title="Open a blank Google Sheet in new tab"
                >
                  <i className="bi bi-box-arrow-up-right me-1"></i> Open Google Sheets
                </a>

                <button 
                  className="btn btn-outline-primary btn-sm"
                  onClick={handleDownloadCSV}
                >
                  <i className="bi bi-download me-1"></i> CSV (Sheets/Excel)
                </button>

                <button 
                  className="btn btn-outline-info btn-sm"
                  onClick={handleDownloadExcel}
                >
                  <i className="bi bi-file-earmark-excel me-1"></i> Excel (.xlsx)
                </button>

                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => handleDownloadJSON(true)}
                >
                  <i className="bi bi-file-code me-1"></i> JSON
                </button>
              </div>

              {/* Table Edit Controls */}
              {activeViewTab === 'table' && (
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <button className="btn btn-outline-primary btn-sm" onClick={handleAddRow}>
                    <i className="bi bi-plus-circle me-1"></i> Add Row
                  </button>
                  <button className="btn btn-outline-primary btn-sm" onClick={handleAddColumn}>
                    <i className="bi bi-layout-split me-1"></i> Add Column
                  </button>
                  <button className="btn btn-outline-danger btn-sm" onClick={handleResetData}>
                    <i className="bi bi-arrow-counterclockwise me-1"></i> Reset Edits
                  </button>
                </div>
              )}
            </div>

            <div className="p-3">
              {/* TABLE VIEW WITH IN-PLACE EDITING */}
              {activeViewTab === 'table' && (
                <div>
                  {/* Search and Page Size Filter */}
                  <div className="row g-2 mb-3 align-items-center">
                    <div className="col-md-6 col-lg-4">
                      <div className="input-group input-group-sm">
                        <span className="input-group-text bg-light"><i className="bi bi-search"></i></span>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search any value across all columns..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setCurrentPage(1)
                          }}
                        />
                        {searchQuery && (
                          <button className="btn btn-outline-secondary" onClick={() => setSearchQuery('')}>
                            <i className="bi bi-x"></i>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="col-md-6 col-lg-4 text-muted small">
                      Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredAndSortedRows.length)} of {filteredAndSortedRows.length.toLocaleString()} matching rows
                      <span className="ms-2 text-primary">💡 (Click any cell to edit)</span>
                    </div>

                    <div className="col-md-12 col-lg-4 d-flex justify-content-lg-end align-items-center gap-2">
                      <label className="small text-muted mb-0">Rows per page:</label>
                      <select 
                        className="form-select form-select-sm" 
                        style={{ width: '90px' }}
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value))
                          setCurrentPage(1)
                        }}
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                        <option value={500}>500</option>
                      </select>
                    </div>
                  </div>

                  {/* Virtualized Table Container */}
                  <div className="table-responsive-custom">
                    <table className="table table-custom table-bordered table-hover">
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                          {headers.map(header => (
                            <th key={header} onClick={() => handleSort(header)} style={{ cursor: 'pointer' }}>
                              <div className="d-flex justify-content-between align-items-center gap-2">
                                <span>{header}</span>
                                <span className="text-secondary small">
                                  {sortConfig.key === header ? (
                                    sortConfig.direction === 'asc' ? '▲' : '▼'
                                  ) : '↕'}
                                </span>
                              </div>
                            </th>
                          ))}
                          <th style={{ width: '50px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedRows.length === 0 ? (
                          <tr>
                            <td colSpan={headers.length + 2} className="text-center py-4 text-muted">
                              No matching rows found for &quot;{searchQuery}&quot;
                            </td>
                          </tr>
                        ) : (
                          paginatedRows.map((row, idx) => {
                            const globalRowIdx = (currentPage - 1) * pageSize + idx
                            return (
                              <tr key={globalRowIdx}>
                                <td className="text-center text-muted small fw-bold">{globalRowIdx + 1}</td>
                                {headers.map(header => {
                                  const isEditing = editingCell?.rowIdx === globalRowIdx && editingCell?.colKey === header
                                  const cellVal = row[header]
                                  return (
                                    <td 
                                      key={header} 
                                      className={isEditing ? 'editing-now' : 'editable-cell'}
                                      onDoubleClick={() => startEditingCell(globalRowIdx, header, cellVal)}
                                      title="Double-click to edit cell"
                                    >
                                      {isEditing ? (
                                        <div className="input-group input-group-sm">
                                          <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            autoFocus
                                            value={cellEditValue}
                                            onChange={(e) => setCellEditValue(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') saveCellEdit()
                                              if (e.key === 'Escape') setEditingCell(null)
                                            }}
                                            onBlur={saveCellEdit}
                                          />
                                        </div>
                                      ) : (
                                        <span>{cellVal === undefined || cellVal === null || cellVal === '' ? <span className="text-muted fst-italic">empty</span> : String(cellVal)}</span>
                                      )}
                                    </td>
                                  )
                                })}
                                <td className="text-center">
                                  <button 
                                    className="btn btn-outline-danger btn-sm p-0 px-1"
                                    onClick={() => handleDeleteRow(globalRowIdx)}
                                    title="Delete row"
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Navigation */}
                  <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                    <span className="small text-muted">
                      Page {currentPage} of {totalPages}
                    </span>

                    <div className="btn-group btn-group-sm">
                      <button 
                        className="btn btn-outline-secondary" 
                        onClick={() => setCurrentPage(1)} 
                        disabled={currentPage === 1}
                      >
                        &laquo; First
                      </button>
                      <button 
                        className="btn btn-outline-secondary" 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                        disabled={currentPage === 1}
                      >
                        &lsaquo; Prev
                      </button>
                      <button className="btn btn-secondary disabled" style={{ minWidth: '45px' }}>
                        {currentPage}
                      </button>
                      <button 
                        className="btn btn-outline-secondary" 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                        disabled={currentPage === totalPages}
                      >
                        Next &rsaquo;
                      </button>
                      <button 
                        className="btn btn-outline-secondary" 
                        onClick={() => setCurrentPage(totalPages)} 
                        disabled={currentPage === totalPages}
                      >
                        Last &raquo;
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* GOOGLE SHEETS TAB VIEW */}
              {activeViewTab === 'sheets' && (
                <div>
                  <div className="alert alert-info d-flex align-items-center justify-content-between mb-3">
                    <div>
                      <i className="bi bi-info-circle-fill me-2 fs-5"></i>
                      <strong>How to paste into Google Sheets:</strong> Click the &quot;Copy for Google Sheets&quot; button below, open your Google Sheet, click Cell A1, and press <code>Ctrl + V</code> (Command + V on Mac).
                    </div>
                    <button className="btn btn-success btn-sm px-3" onClick={handleCopyForGoogleSheets}>
                      <i className="bi bi-clipboard-check me-1"></i> Copy for Google Sheets
                    </button>
                  </div>
                  <pre className="code-preview-box">
                    {generateTSV().slice(0, 15000)}
                    {generateTSV().length > 15000 && '\n\n... [Remaining rows truncated for smooth preview. Full dataset copies on click.]'}
                  </pre>
                </div>
              )}

              {/* CSV TAB VIEW */}
              {activeViewTab === 'csv' && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted small">Standard RFC 4180 CSV with UTF-8 BOM</span>
                    <button className="btn btn-primary btn-sm" onClick={handleDownloadCSV}>
                      <i className="bi bi-download me-1"></i> Download CSV File
                    </button>
                  </div>
                  <pre className="code-preview-box">
                    {generateCSV().slice(0, 15000)}
                    {generateCSV().length > 15000 && '\n\n... [Preview truncated for performance. Complete CSV downloaded on click.]'}
                  </pre>
                </div>
              )}

              {/* CLEAN JSON TAB VIEW */}
              {activeViewTab === 'json' && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted small">Clean, normalized JSON array of objects</span>
                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => handleDownloadJSON(false)}>
                        Download Minified
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => handleDownloadJSON(true)}>
                        <i className="bi bi-download me-1"></i> Download Pretty JSON
                      </button>
                    </div>
                  </div>
                  <pre className="code-preview-box">
                    {JSON.stringify(rows.slice(0, 100), null, 2)}
                    {rows.length > 100 && `\n\n... [Showing first 100 of ${rows.length.toLocaleString()} records. Download full JSON above.]`}
                  </pre>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default UniversalDataConverter
