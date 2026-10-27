import React, { useState, useEffect } from 'react'
import './DriveToJson.css'
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

function DriveToJson() {
  const SCRIPT_ENGINE_URL = 'https://script.google.com/macros/s/AKfycbzXPTAniFsixG52cJ8j7eujRu3cQaDmfgh93b0F1255K-BTf8Yovtotc0XIKPJfeJfi/exec'
  const PUBLIC_BRAND_API = 'https://sujanpro.web.app/api/drive-json'
  
  // State for API endpoint
  const [displayApiUrl, setDisplayApiUrl] = useState(PUBLIC_BRAND_API)
  const [apiUrl, setApiUrl] = useState(SCRIPT_ENGINE_URL)
  const [showSettings, setShowSettings] = useState(false)

  // Firebase Saved Links State
  const [savedLinks, setSavedLinks] = useState([])
  const [showSavedModal, setShowSavedModal] = useState(false)
  const [savingToFirebase, setSavingToFirebase] = useState(false)
  const [firebaseSuccessMsg, setFirebaseSuccessMsg] = useState('')

  // Multi-tab state management
  const createNewTab = (title = 'Tab 1', url = '') => ({
    id: Date.now() + Math.random().toString(36).substr(2, 5),
    title,
    driveUrl: url,
    loading: false,
    error: null,
    result: null,
    activeView: 'tree', // 'tree', 'json', 'api'
    searchFilter: '',
    collapsedFolders: {}
  })

  const [tabs, setTabs] = useState([createNewTab('Folder 1')])
  const [activeTabId, setActiveTabId] = useState(tabs[0].id)
  const [copiedType, setCopiedType] = useState(null)

  // Listen to saved links from Firebase Firestore
  useEffect(() => {
    try {
      const q = query(collection(db, 'drive_saved_links'), orderBy('createdAt', 'desc'))
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

  // Add a new Tab
  const handleAddTab = () => {
    const newTab = createNewTab(`Folder ${tabs.length + 1}`)
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
  }

  // Close a Tab
  const handleCloseTab = (e, idToClose) => {
    e.stopPropagation()
    if (tabs.length === 1) {
      // Don't close if only 1 tab remains, just reset it
      updateTab(idToClose, {
        title: 'Folder 1',
        driveUrl: '',
        loading: false,
        error: null,
        result: null,
        searchFilter: '',
        collapsedFolders: {}
      })
      return
    }

    const newTabs = tabs.filter(tab => tab.id !== idToClose)
    setTabs(newTabs)
    if (activeTabId === idToClose) {
      setActiveTabId(newTabs[newTabs.length - 1].id)
    }
  }

  // Fetch logic for an individual tab
  const fetchTabData = async (tabToFetch) => {
    const trimmedUrl = (tabToFetch.driveUrl || '').trim()
    if (!trimmedUrl) {
      updateTab(tabToFetch.id, {
        error: 'অনুগ্রহ করে একটি Google Drive ফোল্ডার লিঙ্ক অথবা Folder ID প্রদান করুন।'
      })
      return
    }

    updateTab(tabToFetch.id, { loading: true, error: null })

    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      let data = null
      let lastError = null

      // 1. If running locally, use Vite proxy middleware (bypasses browser CORS & 302 redirect limits)
      if (isLocal) {
        try {
          const proxyEndpoint = `/api/drive-proxy?url=${encodeURIComponent(trimmedUrl)}&script=${encodeURIComponent(apiUrl)}`
          const res = await fetch(proxyEndpoint)
          if (res.ok) {
            data = await res.json()
          }
        } catch (proxyErr) {
          console.warn('Local proxy attempt failed, falling back to direct fetch...', proxyErr)
        }
      }

      // 2. Direct fetch (simple GET, no headers to avoid preflight)
      if (!data) {
        try {
          const directEndpoint = `${apiUrl}?url=${encodeURIComponent(trimmedUrl)}`
          const res = await fetch(directEndpoint)
          if (res.ok) {
            data = await res.json()
          }
        } catch (directErr) {
          console.warn('Direct fetch failed (likely browser CORS redirect):', directErr)
          lastError = directErr
        }
      }

      // 3. Fallback for production if browser blocks cross-origin redirect
      if (!data) {
        try {
          const targetUrl = `${apiUrl}?url=${encodeURIComponent(trimmedUrl)}`
          const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
          const res = await fetch(corsProxyUrl)
          if (res.ok) {
            data = await res.json()
          }
        } catch (corsErr) {
          console.error('All fetch strategies failed:', corsErr)
          throw lastError || corsErr
        }
      }

      if (!data) {
        throw new Error('Failed to fetch data from Google Drive API.')
      }

      if (data.status === 'error') {
        throw new Error(data.message || 'Failed to fetch folder data.')
      }

      // Auto update tab title to folder name
      const folderName = data.data?.name || tabToFetch.title

      updateTab(tabToFetch.id, {
        result: data,
        title: folderName,
        activeView: 'tree',
        loading: false
      })
    } catch (err) {
      console.error('Fetch error:', err)
      updateTab(tabToFetch.id, {
        error: err.message || 'গুগল ড্রাইভ ফোল্ডার লোড করা যায়নি। নিশ্চিত করুন ফোল্ডারটির শেয়ার পারমিশন "Anyone with the link can view" দেওয়া আছে।',
        loading: false
      })
    }
  }

  // Run all tabs concurrently
  const handleRunAllTabs = () => {
    tabs.forEach(tab => {
      if (tab.driveUrl.trim()) {
        fetchTabData(tab)
      }
    })
  }

  // Save Link & Summary to Firebase Firestore
  const handleSaveToFirebase = async () => {
    if (!activeTab.result || !activeTab.driveUrl) return

    setSavingToFirebase(true)
    setFirebaseSuccessMsg('')

    try {
      const folderData = activeTab.result.data || {}
      const summaryData = activeTab.result.summary || {}

      await addDoc(collection(db, 'drive_saved_links'), {
        title: folderData.name || activeTab.title || 'Untitled Folder',
        driveUrl: activeTab.driveUrl.trim(),
        folderId: activeTab.result.folderId || folderData.id || '',
        apiUrl: `${displayApiUrl}?url=${encodeURIComponent(activeTab.driveUrl.trim())}`,
        summary: {
          totalFolders: summaryData.totalFolders || 0,
          totalFiles: summaryData.totalFiles || 0,
          totalSize: summaryData.totalSize || '0 Bytes'
        },
        createdAt: serverTimestamp(),
        dateFormatted: new Date().toLocaleDateString('bn-BD', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      })

      setFirebaseSuccessMsg('Firebase-এ সফলভাবে সংরক্ষিত হয়েছে!')
      setTimeout(() => setFirebaseSuccessMsg(''), 3500)
    } catch (err) {
      console.error('Error saving to Firebase:', err)
      alert('Firebase এ সেভ করা সম্ভব হয়নি: ' + err.message)
    } finally {
      setSavingToFirebase(false)
    }
  }

  // Delete link from Firebase
  const handleDeleteSaved = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('আপনি কি সত্যিই এই ফোল্ডার লিঙ্কটি Firebase থেকে মুছে ফেলতে চান?')) return

    try {
      await deleteDoc(doc(db, 'drive_saved_links', id))
    } catch (err) {
      console.error('Error deleting document:', err)
      alert('মুছে ফেলা সম্ভব হয়নি: ' + err.message)
    }
  }

  // Load a saved link into tab
  const handleLoadSavedLink = (savedItem) => {
    updateTab(activeTab.id, {
      title: savedItem.title || 'Drive Folder',
      driveUrl: savedItem.driveUrl || '',
      error: null
    })
    setShowSavedModal(false)

    setTimeout(() => {
      fetchTabData({
        ...activeTab,
        title: savedItem.title || 'Drive Folder',
        driveUrl: savedItem.driveUrl || ''
      })
    }, 100)
  }

  // Toggle folder open/close state in Tree View for active tab
  const toggleFolder = (folderId) => {
    const currentCollapsed = activeTab.collapsedFolders || {}
    updateTab(activeTab.id, {
      collapsedFolders: {
        ...currentCollapsed,
        [folderId]: !currentCollapsed[folderId]
      }
    })
  }

  // Helper to copy text to clipboard
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedType(type)
      setTimeout(() => setCopiedType(null), 2000)
    })
  }

  // Download JSON as a .json file
  const downloadJsonFile = () => {
    if (!activeTab.result) return
    const blob = new Blob([JSON.stringify(activeTab.result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const fileName = (activeTab.result.data?.name || 'drive_data').replace(/[^a-z0-9_-]/gi, '_') + '.json'
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Icon selector based on mimeType
  const getFileIcon = (mimeType = '') => {
    if (mimeType.includes('pdf')) return 'bi-file-earmark-pdf text-danger'
    if (mimeType.includes('image')) return 'bi-file-earmark-image text-primary'
    if (mimeType.includes('video')) return 'bi-file-earmark-play text-warning'
    if (mimeType.includes('audio')) return 'bi-file-earmark-music text-info'
    if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('tar') || mimeType.includes('rar')) return 'bi-file-earmark-zip text-secondary'
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('html') || mimeType.includes('python')) return 'bi-file-earmark-code text-success'
    if (mimeType.includes('spreadsheet') || mimeType.includes('sheet') || mimeType.includes('excel')) return 'bi-file-earmark-excel text-success'
    if (mimeType.includes('document') || mimeType.includes('word')) return 'bi-file-earmark-word text-primary'
    return 'bi-file-earmark text-muted'
  }

  // Recursive Tree Component
  const RenderTree = ({ folder, level = 0 }) => {
    if (!folder) return null
    const isCollapsed = !!(activeTab.collapsedFolders && activeTab.collapsedFolders[folder.id])
    const matchesSearch = (text) => (text || '').toLowerCase().includes((activeTab.searchFilter || '').toLowerCase())

    const filteredFiles = activeTab.searchFilter 
      ? (folder.files || []).filter(f => matchesSearch(f.name) || matchesSearch(f.mimeType))
      : (folder.files || [])

    const filteredSubfolders = folder.folders || []

    return (
      <div className="tree-folder" style={{ marginLeft: level === 0 ? 0 : '0.5rem' }}>
        <div 
          className="tree-folder-header" 
          onClick={() => toggleFolder(folder.id)}
          title="Click to expand/collapse"
        >
          <div className="d-flex align-items-center gap-2 text-truncate">
            <i className={`bi ${isCollapsed ? 'bi-folder-fill text-warning' : 'bi-folder2-open text-warning'} fs-5`}></i>
            <span className="fw-bold text-dark text-truncate">{folder.name}</span>
            <span className="badge bg-light text-secondary border">
              {(folder.files?.length || 0)} files
            </span>
            {folder.folders?.length > 0 && (
              <span className="badge bg-light text-secondary border">
                {folder.folders.length} subfolders
              </span>
            )}
          </div>
          <div className="d-flex align-items-center gap-2">
            <a 
              href={folder.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="file-action-btn"
              onClick={(e) => e.stopPropagation()}
              title="Open folder in Google Drive"
            >
              <i className="bi bi-box-arrow-up-right"></i> Drive
            </a>
            <i className={`bi ${isCollapsed ? 'bi-chevron-down' : 'bi-chevron-up'} text-muted`}></i>
          </div>
        </div>

        {!isCollapsed && (
          <div className="tree-folder-children">
            {filteredSubfolders.map(sub => (
              <RenderTree key={sub.id} folder={sub} level={level + 1} />
            ))}

            {filteredFiles.map(file => (
              <div key={file.id} className="tree-file-row border-bottom">
                <div className="d-flex align-items-center gap-2 text-truncate me-2" style={{ maxWidth: '65%' }}>
                  <i className={`bi ${getFileIcon(file.mimeType)} fs-5`}></i>
                  <div className="text-truncate">
                    <div className="fw-semibold text-truncate" title={file.name}>
                      {file.name}
                    </div>
                    <small className="text-muted">
                      {file.size} &bull; {(file.mimeType || '').split('/').pop() || 'file'}
                    </small>
                  </div>
                </div>

                <div className="file-actions">
                  <a 
                    href={file.previewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="file-action-btn"
                    title="Preview in Google Drive"
                  >
                    <i className="bi bi-eye"></i> View
                  </a>
                  <a 
                    href={file.downloadUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="file-action-btn primary"
                    title="Download Direct"
                  >
                    <i className="bi bi-download"></i> Download
                  </a>
                  <button 
                    className="file-action-btn"
                    onClick={() => copyToClipboard(file.downloadUrl, `file-${file.id}`)}
                    title="Copy direct download link"
                  >
                    <i className={`bi ${copiedType === `file-${file.id}` ? 'bi-check-lg text-success' : 'bi-clipboard'}`}></i>
                    {copiedType === `file-${file.id}` ? 'Copied' : 'Link'}
                  </button>
                </div>
              </div>
            ))}

            {filteredFiles.length === 0 && filteredSubfolders.length === 0 && (
              <div className="text-muted small py-2 fst-italic">
                {activeTab.searchFilter ? 'No matching files found.' : 'Folder is empty.'}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="drive-to-json-page">
      {/* Hero Header (Simple & Compact) */}
      <div className="hero-banner text-center">
        <div className="container">
          <h1 className="hero-title">Google Drive to JSON API</h1>
          <p className="hero-subtitle">
            গুগল ড্রাইভ ফোল্ডারের শেয়ার লিঙ্ক দিন এবং নিমেষেই JSON API তৈরি করুন
          </p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '1150px' }}>
        {/* Saved Firebase Folders Modal / Drawer View */}
        {showSavedModal && (
          <div className="custom-card mb-4 border-warning shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
              <h5 className="fw-bold mb-0 text-dark d-flex align-items-center gap-2">
                <i className="bi bi-fire text-warning fs-4"></i> Saved Folders in Firebase ({savedLinks.length})
              </h5>
              <button 
                className="btn btn-sm btn-close"
                onClick={() => setShowSavedModal(false)}
              />
            </div>

            {savedLinks.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-folder-x fs-1 text-secondary mb-2 d-block"></i>
                <p className="mb-0">এখনো কোনো ড্রাইভ ফোল্ডার লিঙ্ক Firebase এ সেভ করা হয়নি।</p>
                <small>যেকোনো লিঙ্ক কনভার্ট করে <strong>"Save to Firebase"</strong> বাটনে ক্লিক করে সংরক্ষণ করুন।</small>
              </div>
            ) : (
              <div className="row g-2" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {savedLinks.map((item) => (
                  <div key={item.id} className="col-12 col-md-6">
                    <div className="saved-link-card">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="saved-item-title text-truncate" title={item.title}>
                          <i className="bi bi-folder2 text-warning"></i>
                          <span className="text-truncate">{item.title}</span>
                        </div>
                        <button 
                          className="btn btn-sm text-danger p-0 ms-2"
                          onClick={(e) => handleDeleteSaved(e, item.id)}
                          title="Delete from Firebase"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>

                      <div className="saved-item-url text-truncate" title={item.driveUrl}>
                        {item.driveUrl}
                      </div>

                      <div className="saved-item-meta">
                        <span className="badge bg-light text-secondary border">
                          <i className="bi bi-files me-1"></i>{item.summary?.totalFiles || 0} Files
                        </span>
                        <span className="badge bg-light text-secondary border">
                          <i className="bi bi-hdd me-1"></i>{item.summary?.totalSize || '0 B'}
                        </span>
                        {item.dateFormatted && (
                          <span className="text-muted ms-auto">{item.dateFormatted}</span>
                        )}
                      </div>

                      <div className="saved-item-actions">
                        <button 
                          className="btn btn-sm btn-primary py-1 px-2"
                          onClick={() => handleLoadSavedLink(item)}
                          title="Load this link into active tab"
                        >
                          <i className="bi bi-box-arrow-in-down-right me-1"></i> Load in Tab
                        </button>
                        <button 
                          className="btn btn-sm btn-outline-secondary py-1 px-2"
                          onClick={() => copyToClipboard(item.apiUrl || `${displayApiUrl}?url=${encodeURIComponent(item.driveUrl)}`, `saved-api-${item.id}`)}
                          title="Copy API URL"
                        >
                          <i className={`bi ${copiedType === `saved-api-${item.id}` ? 'bi-check-lg text-success' : 'bi-clipboard'} me-1`}></i>
                          {copiedType === `saved-api-${item.id}` ? 'Copied' : 'API Link'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Multi-Tab Bar */}
        <div className="drive-tabs-bar">
          {tabs.map((tab, idx) => (
            <div
              key={tab.id}
              className={`drive-tab-item ${tab.id === activeTabId ? 'active' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
              title={tab.title}
            >
              {tab.loading ? (
                <span className="spinner-border spinner-border-sm text-primary" style={{ width: '12px', height: '12px' }}></span>
              ) : tab.result ? (
                <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '0.8rem' }}></i>
              ) : tab.error ? (
                <i className="bi bi-exclamation-circle-fill text-danger" style={{ fontSize: '0.8rem' }}></i>
              ) : (
                <i className="bi bi-folder2 text-secondary" style={{ fontSize: '0.85rem' }}></i>
              )}

              <span className="drive-tab-title">{tab.title || `Tab ${idx + 1}`}</span>

              <button
                type="button"
                className="drive-tab-close"
                onClick={(e) => handleCloseTab(e, tab.id)}
                title="Close Tab"
              >
                &times;
              </button>
            </div>
          ))}

          <button
            type="button"
            className="btn-add-tab"
            onClick={handleAddTab}
            title="Open a new folder tab"
          >
            <i className="bi bi-plus-lg"></i> New Tab
          </button>

          {tabs.length > 1 && (
            <button
              type="button"
              className="btn-run-all"
              onClick={handleRunAllTabs}
              title="Run all tabs at once"
            >
              <i className="bi bi-play-fill fs-6"></i> Run All Tabs ({tabs.length})
            </button>
          )}
        </div>

        {/* Active Tab's Input Card */}
        <div className="custom-card" style={{ borderTopLeftRadius: 0 }}>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center gap-2">
              <h5 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                <i className="bi bi-link-45deg text-primary fs-4"></i> Drive Folder Link
              </h5>
              <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                {activeTab.title}
              </span>
            </div>

            <div className="d-flex align-items-center gap-2">
              <button 
                className="btn btn-sm btn-outline-warning"
                onClick={() => setShowSavedModal(!showSavedModal)}
                title="View Firebase saved folders"
              >
                <i className="bi bi-fire me-1"></i> Saved ({savedLinks.length})
              </button>
              <button 
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowSettings(!showSettings)}
                title="Toggle API Endpoint info"
              >
                <i className="bi bi-code-slash me-1"></i>
                {showSettings ? 'Hide API Info' : 'API Info'}
              </button>
            </div>
          </div>

          {/* Branded API Endpoint Info (Script URL hidden) */}
          {showSettings && (
            <div className="p-3 mb-3 bg-light rounded-3 border">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label small fw-bold text-secondary mb-0">
                  Public API Endpoint:
                </label>
                <span className="badge bg-success-subtle text-success border border-success-subtle">
                  Active
                </span>
              </div>
              <div className="input-group input-group-sm mb-2">
                <input 
                  type="text" 
                  className="form-control font-monospace bg-white" 
                  value={displayApiUrl} 
                  readOnly
                />
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => copyToClipboard(displayApiUrl, 'branded-endpoint')}
                >
                  <i className={`bi ${copiedType === 'branded-endpoint' ? 'bi-check-lg text-success' : 'bi-clipboard'} me-1`}></i>
                  {copiedType === 'branded-endpoint' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <small className="text-muted">
                গুগল ড্রাইভ ডেটা সরাসরি ফেচ করতে এই ব্র্যান্ডেড API এন্ডপয়েন্টটি ব্যবহার করুন।
              </small>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); fetchTabData(activeTab); }}>
            <div className="input-group-custom">
              <i className="bi bi-folder2-open text-muted ms-3 fs-5"></i>
              <input 
                type="text"
                className="form-control"
                placeholder="Paste Google Drive share link for this tab..."
                value={activeTab.driveUrl}
                onChange={(e) => updateTab(activeTab.id, { driveUrl: e.target.value })}
                disabled={activeTab.loading}
              />
              {activeTab.driveUrl && (
                <button 
                  type="button" 
                  className="btn btn-sm text-muted me-2"
                  onClick={() => updateTab(activeTab.id, { driveUrl: '' })}
                  title="Clear input"
                >
                  <i className="bi bi-x-circle-fill"></i>
                </button>
              )}
              <button 
                type="submit" 
                className="btn-fetch"
                disabled={activeTab.loading || !activeTab.driveUrl.trim()}
              >
                {activeTab.loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Scanning Drive...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-lightning-charge-fill"></i>
                    <span>Convert to JSON</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="d-flex flex-wrap align-items-center justify-content-between mt-3 text-muted small">
            <div className="d-flex align-items-center gap-1">
              <i className="bi bi-info-circle text-primary"></i>
              <span>ফোল্ডার পারমিশন অবশ্যই <strong>"Anyone with the link can view"</strong> হতে হবে।</span>
            </div>
            <div className="text-muted">
              ট্যাব তৈরি করতে উপরে <strong>+ New Tab</strong> বাটনে ক্লিক করুন।
            </div>
          </div>
        </div>

        {/* Error Alert for Active Tab */}
        {activeTab.error && (
          <div className="alert alert-danger d-flex align-items-center gap-3 rounded-3 shadow-sm mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill fs-4 flex-shrink-0"></i>
            <div>
              <strong>ব্যর্থ হয়েছে:</strong> {activeTab.error}
            </div>
          </div>
        )}

        {/* Results Area for Active Tab */}
        {activeTab.result && activeTab.result.status === 'success' && (
          <div>
            {/* Summary Metrics */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <div className="stat-box">
                  <div className="stat-icon blue">
                    <i className="bi bi-folder-check"></i>
                  </div>
                  <div>
                    <div className="stat-value">{activeTab.result.summary?.totalFolders || 1}</div>
                    <div className="stat-label">Folders</div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="stat-box">
                  <div className="stat-icon green">
                    <i className="bi bi-files"></i>
                  </div>
                  <div>
                    <div className="stat-value">{activeTab.result.summary?.totalFiles || 0}</div>
                    <div className="stat-label">Total Files</div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="stat-box">
                  <div className="stat-icon purple">
                    <i className="bi bi-hdd-network"></i>
                  </div>
                  <div>
                    <div className="stat-value">{activeTab.result.summary?.totalSize || '0 Bytes'}</div>
                    <div className="stat-label">Total Size</div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="stat-box">
                  <div className="stat-icon amber">
                    <i className="bi bi-diagram-3"></i>
                  </div>
                  <div className="text-truncate">
                    <div className="stat-value text-truncate" title={activeTab.result.data?.name}>
                      {activeTab.result.data?.name || 'Folder'}
                    </div>
                    <div className="stat-label">Root Folder</div>
                  </div>
                </div>
              </div>
            </div>

            {/* View Tabs & Actions Bar */}
            <div className="custom-card">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 pb-3 border-bottom">
                <div className="nav-pills-custom">
                  <button 
                    className={`tab-btn ${activeTab.activeView === 'tree' ? 'active' : ''}`}
                    onClick={() => updateTab(activeTab.id, { activeView: 'tree' })}
                  >
                    <i className="bi bi-diagram-2"></i> Folder Tree
                  </button>
                  <button 
                    className={`tab-btn ${activeTab.activeView === 'json' ? 'active' : ''}`}
                    onClick={() => updateTab(activeTab.id, { activeView: 'json' })}
                  >
                    <i className="bi bi-filetype-json"></i> Raw JSON
                  </button>
                  <button 
                    className={`tab-btn ${activeTab.activeView === 'api' ? 'active' : ''}`}
                    onClick={() => updateTab(activeTab.id, { activeView: 'api' })}
                  >
                    <i className="bi bi-code-slash"></i> API Endpoint
                  </button>
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <button 
                    className="btn-save-firebase"
                    onClick={handleSaveToFirebase}
                    disabled={savingToFirebase}
                    title="Save this link and metadata to Firebase"
                  >
                    {savingToFirebase ? (
                      <>
                        <span className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px' }}></span>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-arrow-up-fill"></i>
                        <span>Save to Firebase</span>
                      </>
                    )}
                  </button>

                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => copyToClipboard(JSON.stringify(activeTab.result, null, 2), 'all-json')}
                  >
                    <i className={`bi ${copiedType === 'all-json' ? 'bi-check-lg text-success' : 'bi-clipboard'} me-1`}></i>
                    {copiedType === 'all-json' ? 'Copied JSON!' : 'Copy JSON'}
                  </button>

                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={downloadJsonFile}
                  >
                    <i className="bi bi-download me-1"></i> Download .json
                  </button>
                </div>
              </div>

              {/* Firebase Save Feedback Banner */}
              {firebaseSuccessMsg && (
                <div className="alert alert-success alert-dismissible fade show py-2 mb-3 small d-flex align-items-center gap-2">
                  <i className="bi bi-check-circle-fill text-success fs-5"></i>
                  <span>{firebaseSuccessMsg}</span>
                  <button type="button" className="btn-close py-2" onClick={() => setFirebaseSuccessMsg('')}></button>
                </div>
              )}

              {/* TAB 1: Tree View */}
              {activeTab.activeView === 'tree' && (
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="input-group input-group-sm" style={{ maxWidth: '320px' }}>
                      <span className="input-group-text bg-light border-end-0">
                        <i className="bi bi-search text-muted"></i>
                      </span>
                      <input 
                        type="text" 
                        className="form-control border-start-0" 
                        placeholder="Filter files by name or type..."
                        value={activeTab.searchFilter || ''}
                        onChange={(e) => updateTab(activeTab.id, { searchFilter: e.target.value })}
                      />
                      {activeTab.searchFilter && (
                        <button 
                          className="btn btn-outline-secondary"
                          onClick={() => updateTab(activeTab.id, { searchFilter: '' })}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      )}
                    </div>

                    <div className="text-muted small">
                      {activeTab.result.data?.id && <span>Folder ID: <code>{activeTab.result.data.id}</code></span>}
                    </div>
                  </div>

                  <div className="tree-container">
                    <RenderTree folder={activeTab.result.data} level={0} />
                  </div>
                </div>
              )}

              {/* TAB 2: JSON Code Viewer */}
              {activeTab.activeView === 'json' && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small className="text-muted">Pretty Formatted JSON Output:</small>
                    <button 
                      className="btn btn-sm btn-link text-decoration-none"
                      onClick={() => copyToClipboard(JSON.stringify(activeTab.result, null, 2), 'all-json-2')}
                    >
                      <i className="bi bi-clipboard me-1"></i>
                      {copiedType === 'all-json-2' ? 'Copied!' : 'Copy Code'}
                    </button>
                  </div>
                  <div className="json-viewer-box">
                    <pre>{JSON.stringify(activeTab.result, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* TAB 3: API Integration Guide */}
              {activeTab.activeView === 'api' && (
                <div>
                  <h6 className="fw-bold mb-2 text-dark">Public API Endpoint (Branded)</h6>
                  <p className="text-muted small mb-2">
                    আপনার ব্র্যান্ডেড API URL ব্যবহার করে যেকোনো ফ্রন্টএন্ড বা ব্যাকএন্ডে ড্রাইভ ডেটা ফেচ করতে পারেন:
                  </p>
                  <div className="d-flex gap-2 mb-4">
                    <input 
                      type="text" 
                      className="form-control font-monospace form-control-sm bg-light" 
                      readOnly 
                      value={`${displayApiUrl}?url=${encodeURIComponent(activeTab.result.query || activeTab.driveUrl)}`} 
                    />
                    <button 
                      className="btn btn-sm btn-dark flex-shrink-0"
                      onClick={() => copyToClipboard(`${displayApiUrl}?url=${encodeURIComponent(activeTab.result.query || activeTab.driveUrl)}`, 'live-api-url')}
                    >
                      <i className={`bi ${copiedType === 'live-api-url' ? 'bi-check-lg text-success' : 'bi-clipboard'} me-1`}></i>
                      {copiedType === 'live-api-url' ? 'Copied!' : 'Copy URL'}
                    </button>
                  </div>

                  <h6 className="fw-bold mb-2 text-dark">Code Examples</h6>

                  <div className="mb-3">
                    <div className="small fw-semibold text-secondary mb-1">JavaScript (Fetch):</div>
                    <div className="code-block">
{`fetch("${displayApiUrl}?url=${encodeURIComponent(activeTab.result.query || activeTab.driveUrl)}")
  .then(res => res.json())
  .then(data => {
    console.log("Drive JSON:", data);
  })
  .catch(err => console.error(err));`}
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="small fw-semibold text-secondary mb-1">cURL (Terminal):</div>
                    <div className="code-block">
{`curl -L "${displayApiUrl}?url=${encodeURIComponent(activeTab.result.query || activeTab.driveUrl)}"`}
                    </div>
                  </div>

                  <div>
                    <div className="small fw-semibold text-secondary mb-1">Python (Requests):</div>
                    <div className="code-block">
{`import requests

url = "${displayApiUrl}"
params = {"url": "${activeTab.result.query || activeTab.driveUrl}"}
response = requests.get(url, params=params)
data = response.json()
print(data)`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DriveToJson
