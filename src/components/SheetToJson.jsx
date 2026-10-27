import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import './SheetToJson.css'
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../firebase'

// Sample public sheet for 1-click testing
const SAMPLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing'

function SheetToJson() {
  const PUBLIC_BRAND_API = 'https://sujanpro.web.app/api/sheet-json'

  // Multi-tab management
  const createNewTab = (title = 'Sheet 1', url = '') => ({
    id: Date.now() + Math.random().toString(36).substr(2, 5),
    title,
    sheetUrl: url,
    tabName: '',
    loading: false,
    error: null,
    result: null, // { headers, rows, rawJson, objects, rowCount, colCount, sheetId }
    activeFormat: 'objects', // 'objects', 'matrix', 'schema'
    activeView: 'table', // 'table', 'json', 'api'
    searchFilter: ''
  })

  const [tabs, setTabs] = useState([createNewTab('Sheet 1')])
  const [activeTabId, setActiveTabId] = useState(tabs[0].id)
  const [copiedType, setCopiedType] = useState(null)

  // Firebase Saved Links State
  const [savedLinks, setSavedLinks] = useState([])
  const [showSavedModal, setShowSavedModal] = useState(false)
  const [savingToFirebase, setSavingToFirebase] = useState(false)
  const [firebaseSuccessMsg, setFirebaseSuccessMsg] = useState('')

  // Listen to saved sheets from Firestore
  useEffect(() => {
    try {
      const q = query(collection(db, 'sheet_saved_links'), orderBy('createdAt', 'desc'))
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }))
        setSavedLinks(items)
      }, (err) => {
        console.warn('Firestore listening error:', err)
      })
      return () => unsubscribe()
    } catch (err) {
      console.warn('Failed to bind Firestore listener:', err)
    }
  }, [])

  // Helper to get active tab object
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

  // Update specific fields of a tab
  const updateTab = (id, updates) => {
    setTabs(prevTabs =>
      prevTabs.map(tab => (tab.id === id ? { ...tab, ...updates } : tab))
    )
  }

  // Add new tab
  const handleAddTab = () => {
    const newTab = createNewTab(`Sheet ${tabs.length + 1}`)
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }

  // Close tab
  const handleCloseTab = (e, idToClose) => {
    e.stopPropagation()
    if (tabs.length === 1) {
      updateTab(idToClose, {
        title: 'Sheet 1',
        sheetUrl: '',
        tabName: '',
        loading: false,
        error: null,
        result: null,
        searchFilter: ''
      })
      return
    }

    const newTabs = tabs.filter(tab => tab.id !== idToClose)
    setTabs(newTabs)
    if (activeTabId === idToClose) {
      setActiveTabId(newTabs[0].id)
    }
  }

  // Extract Sheet ID and GID from any Google Sheet URL or ID
  const extractSheetParams = (inputUrl) => {
    if (!inputUrl) return { sheetId: null, gid: null }
    const trimmed = inputUrl.trim()

    // Match /d/{sheetId}
    const idMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    const sheetId = idMatch ? idMatch[1] : trimmed.match(/^[a-zA-Z0-9-_]{20,}$/) ? trimmed : null

    // Match gid=...
    const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/)
    const gid = gidMatch ? gidMatch[1] : null

    return { sheetId, gid }
  }

  // Convert Sheet to JSON
  const handleConvert = async (tabToConvert = activeTab) => {
    const { sheetId, gid } = extractSheetParams(tabToConvert.sheetUrl)

    if (!sheetId) {
      updateTab(tabToConvert.id, {
        error: 'Please provide a valid Google Sheet URL or Spreadsheet ID.'
      })
      return
    }

    updateTab(tabToConvert.id, {
      loading: true,
      error: null,
      result: null
    })

    try {
      let objects = null
      let headers = []
      let matrixRows = []
      let schemaData = null
      let fetchedSuccessfully = false

      // Engine 1: Opensheet Engine (High-speed JSON parser)
      try {
        const tabParam = tabToConvert.tabName && tabToConvert.tabName.trim() ? encodeURIComponent(tabToConvert.tabName.trim()) : '1'
        const osUrl = `https://opensheet.elk.sh/${sheetId}/${tabParam}`
        const osRes = await fetch(osUrl)
        if (osRes.ok) {
          const osJson = await osRes.json()
          if (Array.isArray(osJson) && osJson.length > 0) {
            objects = osJson
            headers = Object.keys(osJson[0])
            matrixRows = osJson.map(item => headers.map(h => (item[h] !== undefined ? item[h] : null)))
            schemaData = {
              sheetId,
              tabName: tabToConvert.tabName || (gid ? `gid=${gid}` : 'Sheet1'),
              totalRows: objects.length,
              totalCols: headers.length,
              columns: headers.map(h => ({
                key: h,
                type: typeof (objects[0]?.[h] || 'string')
              })),
              data: objects
            }
            fetchedSuccessfully = true
          }
        }
      } catch (osErr) {
        console.warn('Engine 1 fallback:', osErr)
      }

      // Engine 2: Google GViz Engine (Fallback)
      if (!fetchedSuccessfully) {
        let fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`
        if (tabToConvert.tabName && tabToConvert.tabName.trim()) {
          fetchUrl += `&sheet=${encodeURIComponent(tabToConvert.tabName.trim())}`
        } else if (gid) {
          fetchUrl += `&gid=${gid}`
        }

        const response = await fetch(fetchUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch sheet (HTTP ${response.status}). Make sure "Anyone with the link can view" permission is enabled.`)
        }

        const rawText = await response.text()
        const firstBrace = rawText.indexOf('{')
        const lastBrace = rawText.lastIndexOf('}')

        if (firstBrace === -1 || lastBrace === -1) {
          throw new Error('Invalid response received from Google Sheets. Ensure sheet permissions are public.')
        }

        const jsonString = rawText.substring(firstBrace, lastBrace + 1)
        const gvizData = JSON.parse(jsonString)

        if (gvizData.status === 'error') {
          const errorMsg = gvizData.errors && gvizData.errors[0] ? gvizData.errors[0].detailed_message || gvizData.errors[0].message : 'Google Sheets API error'
          throw new Error(errorMsg)
        }

        const table = gvizData.table
        if (!table || !table.cols) {
          throw new Error('Spreadsheet table structure not found. Check if the sheet has content.')
        }

        const rawCols = table.cols
        const rawRows = table.rows || []

        headers = rawCols.map((c, i) => (c && c.label && c.label.trim()) || `Col_${i + 1}`)

        const hasLabels = rawCols.some(c => c && c.label && c.label.trim())
        let dataRows = rawRows

        if (!hasLabels && rawRows.length > 0) {
          const firstRowCells = rawRows[0].c || []
          headers = firstRowCells.map((cell, i) => (cell && cell.v !== null && cell.v !== undefined ? String(cell.v) : `Col_${i + 1}`))
          dataRows = rawRows.slice(1)
        }

        matrixRows = dataRows.map(r => {
          const cells = r.c || []
          return headers.map((_, colIdx) => {
            const cell = cells[colIdx]
            if (!cell) return null
            return cell.f !== undefined && cell.f !== null ? cell.f : (cell.v !== undefined ? cell.v : null)
          })
        })

        objects = matrixRows.map(row => {
          const obj = {}
          headers.forEach((h, i) => {
            obj[h] = row[i]
          })
          return obj
        })

        schemaData = {
          sheetId,
          tabName: tabToConvert.tabName || (gid ? `gid=${gid}` : 'Sheet1'),
          totalRows: objects.length,
          totalCols: headers.length,
          columns: headers.map((h, i) => ({
            key: h,
            type: rawCols[i]?.type || 'string'
          })),
          data: objects
        }
      }

      updateTab(tabToConvert.id, {
        loading: false,
        error: null,
        title: tabToConvert.tabName ? tabToConvert.tabName : `Sheet (${objects.length} rows)`,
        result: {
          sheetId,
          gid,
          tabName: tabToConvert.tabName || '',
          headers,
          matrixRows,
          objects,
          schemaData,
          rowCount: objects.length,
          colCount: headers.length
        }
      })
    } catch (err) {
      console.error('Sheet conversion error:', err)
      updateTab(tabToConvert.id, {
        loading: false,
        error: err.message || 'Failed to convert Google Sheet. Please check URL and permissions.'
      })
    }
  }

  // Preload sample sheet
  const handleLoadSample = () => {
    updateTab(activeTab.id, {
      sheetUrl: SAMPLE_SHEET_URL,
      tabName: '',
      title: 'Sample Sheet'
    })
    handleConvert({
      ...activeTab,
      sheetUrl: SAMPLE_SHEET_URL,
      tabName: ''
    })
  }

  // Copy helper
  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(type)
      setTimeout(() => setCopiedType(null), 2000)
    }).catch(err => {
      console.error('Failed to copy text:', err)
    })
  }

  // Download JSON
  const handleDownloadJson = () => {
    if (!activeTab.result) return
    const content = getFormattedOutput()
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sheet_${activeTab.result.sheetId}_${activeTab.activeFormat}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Download CSV
  const handleDownloadCsv = () => {
    if (!activeTab.result) return
    const { headers, matrixRows } = activeTab.result
    const escapeCsv = val => {
      if (val === null || val === undefined) return ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csvContent = [
      headers.map(escapeCsv).join(','),
      ...matrixRows.map(row => row.map(escapeCsv).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sheet_${activeTab.result.sheetId}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Get JSON text according to selected activeFormat
  const getFormattedOutput = () => {
    if (!activeTab.result) return ''
    if (activeTab.activeFormat === 'objects') {
      return JSON.stringify(activeTab.result.objects, null, 2)
    } else if (activeTab.activeFormat === 'matrix') {
      return JSON.stringify([activeTab.result.headers, ...activeTab.result.matrixRows], null, 2)
    } else {
      return JSON.stringify(activeTab.result.schemaData, null, 2)
    }
  }

  // Filtered rows for table view
  const getFilteredRows = () => {
    if (!activeTab.result) return []
    const query = activeTab.searchFilter.toLowerCase().trim()
    if (!query) return activeTab.result.matrixRows

    return activeTab.result.matrixRows.filter(row =>
      row.some(cell => cell !== null && String(cell).toLowerCase().includes(query))
    )
  }

  // Save to Firebase Firestore
  const handleSaveToFirebase = async () => {
    if (!activeTab.sheetUrl) {
      alert('Please enter a Google Sheet URL first.')
      return
    }

    setSavingToFirebase(true)
    setFirebaseSuccessMsg('')
    try {
      const { sheetId } = extractSheetParams(activeTab.sheetUrl)
      await addDoc(collection(db, 'sheet_saved_links'), {
        title: activeTab.title || 'Untitled Sheet',
        sheetUrl: activeTab.sheetUrl,
        sheetId: sheetId || 'N/A',
        tabName: activeTab.tabName || '',
        rowCount: activeTab.result ? activeTab.result.rowCount : 0,
        colCount: activeTab.result ? activeTab.result.colCount : 0,
        createdAt: serverTimestamp()
      })
      setFirebaseSuccessMsg('Sheet saved to Firebase!')
      setTimeout(() => setFirebaseSuccessMsg(''), 3000)
    } catch (err) {
      console.error('Error saving to Firebase:', err)
      alert('Failed to save link to Firebase: ' + err.message)
    } finally {
      setSavingToFirebase(false)
    }
  }

  // Delete saved link
  const handleDeleteSaved = async (id, e) => {
    e.stopPropagation()
    if (window.confirm('Delete this saved sheet link?')) {
      try {
        await deleteDoc(doc(db, 'sheet_saved_links', id))
      } catch (err) {
        console.error('Error deleting:', err)
      }
    }
  }

  // Load saved link into current tab
  const handleLoadSavedSheet = (item) => {
    updateTab(activeTab.id, {
      title: item.title,
      sheetUrl: item.sheetUrl,
      tabName: item.tabName || ''
    })
    setShowSavedModal(false)
    handleConvert({
      ...activeTab,
      sheetUrl: item.sheetUrl,
      tabName: item.tabName || ''
    })
  }

  // Generated endpoint URL
  const currentSheetId = activeTab.result?.sheetId || extractSheetParams(activeTab.sheetUrl).sheetId || 'YOUR_SHEET_ID'
  const currentTabParam = activeTab.tabName ? `&sheet=${encodeURIComponent(activeTab.tabName)}` : ''
  const apiEndpointUrl = `${PUBLIC_BRAND_API}?id=${currentSheetId}${currentTabParam}`

  const filteredRows = getFilteredRows()

  return (
    <div className="sheet-to-json-page">
      {/* Top Banner */}
      <div className="sheet-hero">
        <div className="sheet-hero-content">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <div className="d-flex align-items-center gap-2">
              <span className="sheet-badge">
                <i className="bi bi-file-earmark-spreadsheet-fill text-success me-1"></i> Google Sheets API
              </span>
              <span className="sheet-badge-accent">Instant JSON Endpoint</span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button 
                type="button" 
                className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                onClick={() => setShowSavedModal(true)}
              >
                <i className="bi bi-bookmark-star-fill text-warning me-1"></i>
                Saved Sheets ({savedLinks.length})
              </button>
              <button 
                type="button" 
                className="btn btn-sm btn-light border rounded-pill px-3 shadow-sm"
                onClick={handleLoadSample}
              >
                <i className="bi bi-lightning-charge-fill text-warning me-1"></i>
                Try Sample Sheet
              </button>
            </div>
          </div>
          <h1 className="sheet-title">Google Sheet to JSON API Converter</h1>
          <p className="sheet-subtitle mb-0">
            Paste any public Google Sheets share link or Spreadsheet ID and turn it into a high-speed RESTful JSON API with live interactive table preview.
          </p>
        </div>
      </div>

      <div className="container-fluid px-3 px-md-4 py-3">
        {/* Tabs Bar */}
        <div className="sheet-tabs-bar">
          <div className="sheet-tabs-list">
            {tabs.map(tab => (
              <div 
                key={tab.id}
                className={`sheet-tab-item ${tab.id === activeTabId ? 'active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <i className="bi bi-table me-2 sheet-tab-icon"></i>
                <span className="sheet-tab-title">{tab.title}</span>
                {tab.result && (
                  <span className="badge bg-success ms-2 rounded-pill font-monospace" style={{ fontSize: '0.65rem' }}>
                    {tab.result.rowCount} rows
                  </span>
                )}
                <button 
                  type="button" 
                  className="sheet-tab-close"
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  title="Close tab"
                >
                  <i className="bi bi-x"></i>
                </button>
              </div>
            ))}
          </div>
          <button 
            type="button" 
            className="sheet-add-tab-btn"
            onClick={handleAddTab}
            title="Open new sheet tab"
          >
            <i className="bi bi-plus-lg"></i>
          </button>
        </div>

        {/* Main Card */}
        <div className="sheet-card">
          {/* Input Section */}
          <div className="sheet-input-section">
            <div className="row g-3 align-items-end">
              <div className="col-lg-7">
                <label className="sheet-label">
                  <i className="bi bi-link-45deg me-1 text-danger"></i> Google Sheet Share Link or Spreadsheet ID
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-google text-muted"></i>
                  </span>
                  <input 
                    type="text" 
                    className="form-control border-start-0 ps-0"
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit?usp=sharing"
                    value={activeTab.sheetUrl}
                    onChange={(e) => updateTab(activeTab.id, { sheetUrl: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConvert()
                    }}
                  />
                  {activeTab.sheetUrl && (
                    <button 
                      className="btn btn-outline-secondary border-start-0" 
                      type="button"
                      onClick={() => updateTab(activeTab.id, { sheetUrl: '', result: null })}
                    >
                      <i className="bi bi-x-circle"></i>
                    </button>
                  )}
                </div>
              </div>

              <div className="col-lg-3 col-sm-6">
                <label className="sheet-label">
                  <i className="bi bi-layers me-1 text-primary"></i> Sheet Tab Name (Optional)
                </label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="e.g. Sheet1 or Orders"
                  value={activeTab.tabName}
                  onChange={(e) => updateTab(activeTab.id, { tabName: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConvert()
                  }}
                />
              </div>

              <div className="col-lg-2 col-sm-6 d-flex gap-2">
                <button 
                  type="button" 
                  className="btn btn-danger w-100 fw-bold d-flex align-items-center justify-content-center gap-2 py-2"
                  onClick={() => handleConvert()}
                  disabled={activeTab.loading || !activeTab.sheetUrl.trim()}
                >
                  {activeTab.loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Converting...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-arrow-repeat"></i>
                      <span>Convert</span>
                    </>
                  )}
                </button>
                <button 
                  type="button"
                  className="btn btn-outline-secondary"
                  title="Save Sheet to Firebase"
                  onClick={handleSaveToFirebase}
                  disabled={savingToFirebase || !activeTab.sheetUrl.trim()}
                >
                  <i className="bi bi-bookmark-plus"></i>
                </button>
              </div>
            </div>

            {/* Helper notes */}
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-2 pt-1 border-top border-light">
              <div className="text-muted small d-flex align-items-center gap-2">
                <i className="bi bi-info-circle text-primary"></i>
                <span>Sheet permission must be set to <strong>"Anyone with the link can view"</strong>.</span>
              </div>
              {firebaseSuccessMsg && (
                <span className="badge bg-success-subtle text-success border border-success-subtle">
                  <i className="bi bi-check-circle me-1"></i> {firebaseSuccessMsg}
                </span>
              )}
            </div>

            {/* Error banner */}
            {activeTab.error && (
              <div className="alert alert-danger mt-3 mb-0 d-flex align-items-start gap-2 shadow-sm" role="alert">
                <i className="bi bi-exclamation-triangle-fill fs-5 mt-1 flex-shrink-0"></i>
                <div>
                  <strong>Error:</strong> {activeTab.error}
                  <div className="mt-1 small">
                    Make sure the Google Sheet is shared with "Anyone with the link can view" (or Public on web).
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Area */}
          {activeTab.result && (
            <div className="sheet-results-section">
              {/* Toolbar & Controls */}
              <div className="sheet-results-toolbar">
                {/* View Switcher */}
                <div className="sheet-view-switcher">
                  <button 
                    type="button" 
                    className={`sheet-view-btn ${activeTab.activeView === 'table' ? 'active' : ''}`}
                    onClick={() => updateTab(activeTab.id, { activeView: 'table' })}
                  >
                    <i className="bi bi-table me-1"></i> Interactive Table
                  </button>
                  <button 
                    type="button" 
                    className={`sheet-view-btn ${activeTab.activeView === 'json' ? 'active' : ''}`}
                    onClick={() => updateTab(activeTab.id, { activeView: 'json' })}
                  >
                    <i className="bi bi-filetype-json me-1"></i> JSON Output
                  </button>
                  <button 
                    type="button" 
                    className={`sheet-view-btn ${activeTab.activeView === 'api' ? 'active' : ''}`}
                    onClick={() => updateTab(activeTab.id, { activeView: 'api' })}
                  >
                    <i className="bi bi-code-slash me-1"></i> API Endpoints
                  </button>
                </div>

                {/* Actions */}
                <div className="d-flex align-items-center flex-wrap gap-2">
                  {/* Format selector when JSON view */}
                  {activeTab.activeView === 'json' && (
                    <div className="btn-group btn-group-sm">
                      <button 
                        type="button" 
                        className={`btn btn-outline-secondary ${activeTab.activeFormat === 'objects' ? 'active' : ''}`}
                        onClick={() => updateTab(activeTab.id, { activeFormat: 'objects' })}
                        title="Array of Objects"
                      >
                        Objects
                      </button>
                      <button 
                        type="button" 
                        className={`btn btn-outline-secondary ${activeTab.activeFormat === 'matrix' ? 'active' : ''}`}
                        onClick={() => updateTab(activeTab.id, { activeFormat: 'matrix' })}
                        title="2D Array Matrix"
                      >
                        Matrix
                      </button>
                      <button 
                        type="button" 
                        className={`btn btn-outline-secondary ${activeTab.activeFormat === 'schema' ? 'active' : ''}`}
                        onClick={() => updateTab(activeTab.id, { activeFormat: 'schema' })}
                        title="Full Schema & Types"
                      >
                        Schema
                      </button>
                    </div>
                  )}

                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-dark"
                    onClick={() => handleCopy(getFormattedOutput(), 'json')}
                  >
                    <i className={`bi ${copiedType === 'json' ? 'bi-check2 text-success' : 'bi-clipboard'} me-1`}></i>
                    {copiedType === 'json' ? 'Copied!' : 'Copy JSON'}
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-success"
                    onClick={handleDownloadJson}
                    title="Download JSON file"
                  >
                    <i className="bi bi-download me-1"></i> .json
                  </button>

                  <button 
                    type="button" 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={handleDownloadCsv}
                    title="Download CSV file"
                  >
                    <i className="bi bi-file-earmark-spreadsheet me-1"></i> .csv
                  </button>
                </div>
              </div>

              {/* View 1: Interactive Table */}
              {activeTab.activeView === 'table' && (
                <div className="sheet-table-view">
                  <div className="sheet-table-filter-bar">
                    <div className="input-group input-group-sm" style={{ maxWidth: '320px' }}>
                      <span className="input-group-text bg-white border-end-0">
                        <i className="bi bi-search text-muted"></i>
                      </span>
                      <input 
                        type="text" 
                        className="form-control border-start-0"
                        placeholder="Search table rows..."
                        value={activeTab.searchFilter}
                        onChange={(e) => updateTab(activeTab.id, { searchFilter: e.target.value })}
                      />
                      {activeTab.searchFilter && (
                        <button 
                          className="btn btn-outline-secondary border-start-0"
                          type="button"
                          onClick={() => updateTab(activeTab.id, { searchFilter: '' })}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      )}
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-light text-dark border">
                        {filteredRows.length} of {activeTab.result.rowCount} rows
                      </span>
                      <span className="badge bg-light text-dark border">
                        {activeTab.result.colCount} columns
                      </span>
                    </div>
                  </div>

                  <div className="sheet-table-scroll">
                    <table className="table table-hover table-striped align-middle mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: '45px' }} className="text-center">#</th>
                          {activeTab.result.headers.map((h, i) => (
                            <th key={i} className="text-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row, rowIdx) => (
                          <tr key={rowIdx}>
                            <td className="text-center text-muted small">{rowIdx + 1}</td>
                            {row.map((val, cellIdx) => (
                              <td key={cellIdx} className="text-nowrap">
                                {val !== null && val !== undefined ? String(val) : <span className="text-muted fst-italic">null</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {filteredRows.length === 0 && (
                          <tr>
                            <td colSpan={activeTab.result.headers.length + 1} className="text-center py-4 text-muted">
                              No rows match your search query.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* View 2: Raw JSON */}
              {activeTab.activeView === 'json' && (
                <div className="sheet-json-view">
                  <div className="sheet-json-header">
                    <span className="text-muted small">
                      Format: <strong>{activeTab.activeFormat}</strong> ({activeTab.result.rowCount} records)
                    </span>
                    <button 
                      className="btn btn-sm btn-link text-decoration-none p-0"
                      onClick={() => handleCopy(getFormattedOutput(), 'json_header')}
                    >
                      <i className={`bi ${copiedType === 'json_header' ? 'bi-check2 text-success' : 'bi-clipboard'} me-1`}></i>
                      {copiedType === 'json_header' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="sheet-code-block">
                    <code>{getFormattedOutput()}</code>
                  </pre>
                </div>
              )}

              {/* View 3: API Endpoints & Docs */}
              {activeTab.activeView === 'api' && (
                <div className="sheet-api-view">
                  <div className="sheet-api-card mb-4">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                      <span className="sheet-badge-api">SUJANPRO JSON REST API</span>
                      <div className="d-flex align-items-center gap-2">
                        <span className="badge bg-success-subtle text-success border border-success-subtle small">
                          <i className="bi bi-shield-check me-1"></i> Fast REST Engine
                        </span>
                        <button 
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleCopy(apiEndpointUrl, 'api_endpoint')}
                        >
                          <i className={`bi ${copiedType === 'api_endpoint' ? 'bi-check2' : 'bi-clipboard'} me-1`}></i>
                          {copiedType === 'api_endpoint' ? 'Copied API URL' : 'Copy API URL'}
                        </button>
                      </div>
                    </div>
                    <div className="input-group">
                      <span className="input-group-text bg-dark text-white font-monospace small">GET</span>
                      <input 
                        type="text" 
                        readOnly 
                        className="form-control font-monospace bg-light small" 
                        value={apiEndpointUrl} 
                      />
                    </div>
                    <p className="text-muted small mt-2 mb-0">
                      Use this endpoint in your React, Next.js, Flutter, Vue, Node.js, Python, or mobile apps. Returns clean, structured JSON directly.
                    </p>
                  </div>

                  {/* Code Examples */}
                  <div className="sheet-code-tabs">
                    <h6 className="fw-bold mb-3">
                      <i className="bi bi-terminal me-2 text-danger"></i> Quick Integration Examples
                    </h6>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="sheet-snippet-card">
                          <div className="sheet-snippet-title">JavaScript (Fetch / Axios)</div>
                          <pre>
{`// Fetch JSON data directly
fetch('${apiEndpointUrl}')
  .then(res => res.json())
  .then(data => {
    console.log('Sheet data:', data);
  });`}
                          </pre>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="sheet-snippet-card">
                          <div className="sheet-snippet-title">Python (Requests)</div>
                          <pre>
{`import requests

url = "${apiEndpointUrl}"
response = requests.get(url)
data = response.json()
print("Total rows:", len(data))`}
                          </pre>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="sheet-snippet-card">
                          <div className="sheet-snippet-title">cURL (Terminal / CLI)</div>
                          <pre>
{`curl -X GET "${apiEndpointUrl}"`}
                          </pre>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="sheet-snippet-card">
                          <div className="sheet-snippet-title">Flutter / Dart</div>
                          <pre>
{`import 'package:http/http.dart' as http;
import 'dart:convert';

final res = await http.get(Uri.parse('${apiEndpointUrl}'));
final List data = jsonDecode(res.body);`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty initial state */}
          {!activeTab.result && !activeTab.loading && (
            <div className="sheet-empty-placeholder">
              <div className="sheet-empty-icon">
                <i className="bi bi-file-earmark-spreadsheet"></i>
              </div>
              <h5 className="fw-bold mb-2">No Sheet Loaded Yet</h5>
              <p className="text-muted small mb-3" style={{ maxWidth: '480px' }}>
                Paste any Google Sheets link with viewing permissions enabled, or click the button below to test with a public sample sheet.
              </p>
              <button 
                type="button" 
                className="btn btn-outline-danger btn-sm rounded-pill px-4"
                onClick={handleLoadSample}
              >
                <i className="bi bi-lightning-charge-fill me-1"></i> Try Sample Google Sheet
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Saved Sheets Modal */}
      {showSavedModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowSavedModal(false)}>
          <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h6 className="mb-0 fw-bold">
                <i className="bi bi-bookmark-star-fill text-warning me-2"></i> Saved Google Sheets
              </h6>
              <button 
                type="button" 
                className="btn-close btn-sm" 
                onClick={() => setShowSavedModal(false)}
              ></button>
            </div>

            <div className="modal-body-custom">
              {savedLinks.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="bi bi-folder2-open fs-2 d-block mb-2"></i>
                  No saved sheets yet. Use the bookmark button next to Convert to save sheets to Firebase.
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {savedLinks.map(item => (
                    <div 
                      key={item.id} 
                      className="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-3"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleLoadSavedSheet(item)}
                    >
                      <div>
                        <h6 className="mb-1 text-dark fw-bold">{item.title}</h6>
                        <div className="text-muted small text-truncate" style={{ maxWidth: '350px' }}>
                          {item.sheetUrl}
                        </div>
                        <div className="d-flex align-items-center gap-2 mt-1">
                          <span className="badge bg-light text-dark border small">ID: {item.sheetId}</span>
                          {item.tabName && <span className="badge bg-primary-subtle text-primary border small">Tab: {item.tabName}</span>}
                          {item.rowCount > 0 && <span className="badge bg-success-subtle text-success border small">{item.rowCount} rows</span>}
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2">
                        <button 
                          type="button" 
                          className="btn btn-sm btn-outline-primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLoadSavedSheet(item)
                          }}
                        >
                          Load
                        </button>
                        <button 
                          type="button" 
                          className="btn btn-sm btn-outline-danger"
                          onClick={(e) => handleDeleteSaved(item.id, e)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SheetToJson
