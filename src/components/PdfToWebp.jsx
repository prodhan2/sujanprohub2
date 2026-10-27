import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { Link } from 'react-router-dom';
import { usePdfTools } from '../context/PdfToolsContext';
import './PdfToWebp.css';

// Helper: Format bytes to KB / MB
const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function PdfToWebp() {
  const {
    tabs,
    activeTabId,
    setActiveTabId,
    updateTab,
    addNewTab,
    closeTab,
    processPdfFile,
    uploadMultiplePdfs,
    reConvertPagesToWebp,
    processImageFiles,
    compressPdfFile
  } = usePdfTools();

  // Local UI state for preview lightbox and copy status
  const [previewModal, setPreviewModal] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [activeMode, setActiveMode] = useState('split'); // 'split' | 'compressor'
  const [compressionPreset, setCompressionPreset] = useState('medium'); // 'extreme' | 'medium' | 'highQuality'

  const fileInputRef = useRef(null);
  const compressInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileCacheRef = useRef(new Map()); // Stores original File objects for re-processing / compressing
  
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Handle files dropped or selected from input
  const handleIncomingFiles = (fileList, forceCompress = false) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    // Cache original File objects for re-compressing
    pdfFiles.forEach(f => fileCacheRef.current.set(f.name, f));

    // Upload multiple PDFs all at once (each opens in its own tab)
    if (pdfFiles.length > 0) {
      uploadMultiplePdfs(pdfFiles, {
        mode: forceCompress || activeMode === 'compressor' ? 'compressor' : 'split',
        scale: activeTab.scale || 1.5,
        quality: activeTab.quality || 0.85,
        autoConvert: true,
        compressionPreset
      });
    } else if (imageFiles.length > 0) {
      let targetId = activeTab.type === 'images' ? activeTab.id : addNewTab('images');
      setActiveTabId(targetId);
      processImageFiles(imageFiles, targetId);
    }
  };

  const handleRecompress = (preset) => {
    setCompressionPreset(preset);
    const cachedFile = fileCacheRef.current.get(activeTab.id);
    if (cachedFile) {
      compressPdfFile(cachedFile, activeTab.id, preset);
    }
  };

  // -------------------------------------------------------------
  // DOWNLOAD UTILITIES
  // -------------------------------------------------------------
  const sanitizeWebpName = (name, fallback = 'image.webp') => {
    if (!name || !name.trim()) return fallback;
    let clean = name.trim();
    if (!clean.toLowerCase().endsWith('.webp')) {
      clean = `${clean}.webp`;
    }
    return clean;
  };

  const handleImageRename = (idx, newName) => {
    if (!activeTab || !activeTab.images) return;
    const updated = [...activeTab.images];
    updated[idx] = { ...updated[idx], name: newName };
    updateTab(activeTab.id, { images: updated });
  };

  const handleResetImageName = (idx) => {
    if (!activeTab || !activeTab.images) return;
    const updated = [...activeTab.images];
    const orig = updated[idx].originalName || `image-${idx + 1}`;
    const baseName = orig.replace(/\.[^/.]+$/, "") + '.webp';
    updated[idx] = { ...updated[idx], name: baseName };
    updateTab(activeTab.id, { images: updated });
  };

  const downloadSingleFile = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllZip = async (tab, format = 'webp') => {
    if (!tab || !tab.pages || tab.pages.length === 0) return;
    const zip = new JSZip();
    const baseName = (tab.fileName || 'document').replace(/\.[^/.]+$/, "");

    tab.pages.forEach(page => {
      const filename = `${baseName}-page-${page.pageNumber}.${format}`;
      const blob = format === 'webp' ? (page.webpBlob || page.pngBlob) : page.pngBlob;
      zip.file(filename, blob);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    downloadSingleFile(zipUrl, `${baseName}-${format}-all-pages.zip`);
    setTimeout(() => URL.revokeObjectURL(zipUrl), 5000);
  };

  const downloadImagesZip = async (tab) => {
    if (!tab || !tab.images || tab.images.length === 0) return;
    const zip = new JSZip();
    const used = new Map();
    tab.images.forEach((img, idx) => {
      let fileName = sanitizeWebpName(img.name, `image-${idx + 1}.webp`);
      if (used.has(fileName.toLowerCase())) {
        const count = used.get(fileName.toLowerCase()) + 1;
        used.set(fileName.toLowerCase(), count);
        const base = fileName.replace(/\.webp$/i, '');
        fileName = `${base}_(${count}).webp`;
      } else {
        used.set(fileName.toLowerCase(), 1);
      }
      zip.file(fileName, img.webpBlob);
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    downloadSingleFile(zipUrl, `converted-webp-images.zip`);
    setTimeout(() => URL.revokeObjectURL(zipUrl), 5000);
  };

  // Copy Image to Clipboard
  const copyImageToClipboard = async (blob, index) => {
    try {
      if (!blob) return;
      let pngBlob = blob;
      if (blob.type !== 'image/png') {
        const img = new Image();
        img.src = URL.createObjectURL(blob);
        await new Promise(r => img.onload = r);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        pngBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
      }
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': pngBlob })
      ]);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  const openToolInNewBrowserTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="pdf-tool-container">
      {/* Top Header Bar */}
      <div className="pdf-tool-header">
        <div className="d-flex align-items-center gap-2">
          <Link to="/" className="pdf-btn-glass back-btn" title="Back to Portfolio">
            <i className="bi bi-arrow-left"></i>
            <span className="d-none d-sm-inline">Back</span>
          </Link>
          <div className="pdf-tool-badge">
            <i className="bi bi-file-earmark-pdf text-danger"></i>
            <span className="fw-bold">PDF to Image & Compressor</span>
            <span className="badge bg-danger rounded-pill font-monospace" style={{ fontSize: '0.7rem' }}>v2.5</span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Open In New Browser Tab */}
          <button 
            type="button" 
            className="pdf-btn-glass"
            onClick={openToolInNewBrowserTab}
            title="Open duplicate in a new browser tab"
          >
            <i className="bi bi-box-arrow-up-right"></i>
            <span className="d-none d-md-inline">New Window</span>
          </button>

          {/* Quick Add Tab Menu */}
          <button 
            type="button" 
            className="pdf-btn-action"
            onClick={() => addNewTab('pdf')}
            title="Open another PDF document in a new tab"
          >
            <i className="bi bi-plus-lg"></i>
            <span>Add PDF Tab</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation Strip (Multiple Tabs Support) */}
      <div className="pdf-tab-strip">
        <div className="pdf-tab-list">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const pageCount = tab.pages ? tab.pages.length : (tab.images ? tab.images.length : 0);
            return (
              <div 
                key={tab.id} 
                className={`pdf-tab-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <i className={`bi ${tab.type === 'pdf' ? 'bi-file-earmark-pdf text-danger' : 'bi-images text-info'}`}></i>
                <span className="pdf-tab-label" title={tab.fileName || tab.title}>
                  {tab.title}
                </span>
                {pageCount > 0 && (
                  <span className="pdf-tab-count">
                    {pageCount}p
                  </span>
                )}
                {tab.compressedData && (
                  <span className="badge bg-success" style={{ fontSize: '0.62rem' }}>
                    -{tab.compressedData.reductionPercent}%
                  </span>
                )}
                <button 
                  type="button" 
                  className="pdf-tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  title="Close this tab"
                >
                  <i className="bi bi-x"></i>
                </button>
              </div>
            );
          })}
        </div>

        <div className="d-flex align-items-center gap-1">
          <button 
            type="button" 
            className="pdf-add-tab-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload multiple PDFs at once — each will open in its own separate tab"
            style={{ color: '#ff7a45', borderColor: 'rgba(255, 122, 69, 0.4)' }}
          >
            <i className="bi bi-folder-plus me-1"></i> Upload Multiple PDFs
          </button>
          <button 
            type="button" 
            className="pdf-add-tab-btn"
            onClick={() => addNewTab('pdf')}
            title="Open an empty PDF tab"
          >
            <i className="bi bi-plus"></i> Blank PDF
          </button>
          <button 
            type="button" 
            className="pdf-add-tab-btn"
            onClick={() => addNewTab('images')}
            title="Open an Image to WebP tab"
          >
            <i className="bi bi-plus"></i> Images
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="pdf-workspace">
        {/* Mode Switcher when a PDF tab is active */}
        {activeTab.type === 'pdf' && (
          <div className="d-flex justify-content-center mb-4">
            <div className="pdf-mode-switcher">
              <button 
                type="button" 
                className={`mode-tab-btn ${activeMode === 'split' ? 'active' : ''}`}
                onClick={() => setActiveMode('split')}
              >
                <i className="bi bi-images me-1"></i> Split to PNG & Auto-WebP
              </button>
              <button 
                type="button" 
                className={`mode-tab-btn ${activeMode === 'compressor' ? 'active' : ''}`}
                onClick={() => {
                  setActiveMode('compressor');
                  const cachedFile = fileCacheRef.current.get(activeTab.id);
                  if (cachedFile && !activeTab.compressedData && activeTab.status !== 'processing') {
                    compressPdfFile(cachedFile, activeTab.id, compressionPreset);
                  }
                }}
              >
                <i className="bi bi-file-earmark-zip me-1"></i> PDF Compressor
              </button>
            </div>
          </div>
        )}

        {/* If Active Tab is Idle (No file uploaded yet) */}
        {activeTab.status === 'idle' && (
          <div className="pdf-upload-card">
            <div 
              className="pdf-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleIncomingFiles(e.dataTransfer.files, activeMode === 'compressor');
              }}
              onClick={() => {
                if (activeTab.type === 'pdf') {
                  fileInputRef.current?.click();
                } else {
                  imageInputRef.current?.click();
                }
              }}
            >
              <div className="dropzone-icon">
                <i className={`bi ${activeMode === 'compressor' ? 'bi-file-earmark-zip text-warning' : (activeTab.type === 'pdf' ? 'bi-cloud-arrow-up text-danger' : 'bi-file-image text-info')}`}></i>
              </div>
              <h4 className="fw-bold mt-3 text-white">
                {activeMode === 'compressor' 
                  ? 'Drag & Drop PDF(s) to Compress' 
                  : (activeTab.type === 'pdf' ? 'Drag & Drop One or Multiple PDFs here' : 'Drag & Drop Images here')}
              </h4>
              <p className="text-secondary small mb-3">
                {activeMode === 'compressor'
                  ? 'Upload multiple PDFs at once — each file opens in its own tab for fast compression'
                  : (activeTab.type === 'pdf' 
                      ? 'Upload multiple PDFs at once — each document opens in its own tab, splits to PNG, and auto-converts to WebP' 
                      : 'Convert JPG, PNG, GIF, BMP images directly into high-efficiency WebP format')}
              </p>

              <button type="button" className="btn btn-danger rounded-pill px-4 py-2 fw-semibold">
                <i className="bi bi-folder2-open me-2"></i> Browse Computer (Select Multiple PDFs)
              </button>

              <div className="mt-4 pt-3 border-top border-secondary border-opacity-25 d-flex justify-content-center gap-4 text-secondary small flex-wrap">
                <span><i className="bi bi-check2-circle text-success me-1"></i> Multi-tab support</span>
                <span><i className="bi bi-check2-circle text-success me-1"></i> Background processing</span>
                <span><i className="bi bi-check2-circle text-success me-1"></i> Auto WebP conversion</span>
                <span><i className="bi bi-check2-circle text-success me-1"></i> High ratio compression</span>
              </div>
            </div>

            {/* Hidden file inputs */}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="application/pdf,.pdf" 
              multiple 
              onChange={(e) => handleIncomingFiles(e.target.files, activeMode === 'compressor')} 
            />
            <input 
              type="file" 
              ref={compressInputRef} 
              style={{ display: 'none' }} 
              accept="application/pdf,.pdf" 
              onChange={(e) => handleIncomingFiles(e.target.files, true)} 
            />
            <input 
              type="file" 
              ref={imageInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              multiple 
              onChange={(e) => handleIncomingFiles(e.target.files)} 
            />
          </div>
        )}

        {/* Loading / Processing State */}
        {(activeTab.status === 'loading' || activeTab.status === 'processing') && (
          <div className="pdf-processing-card">
            <div className="spinner-border text-danger mb-3" style={{ width: '3rem', height: '3rem' }} role="status"></div>
            <h5 className="text-white fw-bold">{activeTab.progress.text || 'Processing...'}</h5>
            {activeTab.progress.total > 0 && (
              <div className="progress w-50 mt-3" style={{ height: '8px', background: 'rgba(255,255,255,0.1)' }}>
                <div 
                  className="progress-bar progress-bar-striped progress-bar-animated bg-danger" 
                  role="progressbar" 
                  style={{ width: `${(activeTab.progress.current / activeTab.progress.total) * 100}%` }}
                ></div>
              </div>
            )}
            <p className="text-secondary small mt-2">
              Page {activeTab.progress.current} of {activeTab.progress.total}
            </p>
            <p className="text-muted small">
              <i className="bi bi-shield-check text-success me-1"></i>
              You can navigate to other pages anytime — processing will continue uninterrupted!
            </p>
          </div>
        )}

        {/* Error State */}
        {activeTab.status === 'error' && (
          <div className="pdf-error-card">
            <i className="bi bi-exclamation-triangle-fill text-danger fs-1 mb-2"></i>
            <h5 className="text-white fw-bold">Conversion Error</h5>
            <p className="text-secondary">{activeTab.errorMessage}</p>
            <button 
              type="button" 
              className="btn btn-outline-danger btn-sm rounded-pill"
              onClick={() => updateTab(activeTab.id, { status: 'idle' })}
            >
              Try Another File
            </button>
          </div>
        )}

        {/* READY STATE: PDF COMPRESSOR VIEW */}
        {activeTab.status === 'ready' && activeTab.type === 'pdf' && activeMode === 'compressor' && (
          <div className="pdf-compressor-view">
            <div className="pdf-control-bar mb-3">
              <h5 className="text-white fw-bold m-0 d-flex align-items-center gap-2">
                <span>{activeTab.fileName}</span>
                <span className="badge bg-dark border border-secondary text-secondary">
                  Original: {formatBytes(activeTab.fileSize)}
                </span>
              </h5>

              <div className="d-flex align-items-center gap-2">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary btn-sm rounded-pill"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="bi bi-arrow-repeat me-1"></i> Choose Another PDF
                </button>
              </div>
            </div>

            {/* Compressor Preset Selection Card */}
            <div className="compressor-card">
              <h5 className="text-white fw-bold mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-sliders text-danger"></i> Choose Compression Level
              </h5>

              <div className="compressor-presets-grid">
                {/* Extreme */}
                <div 
                  className={`compress-preset-box ${compressionPreset === 'extreme' ? 'active' : ''}`}
                  onClick={() => handleRecompress('extreme')}
                >
                  <div className="preset-icon">⚡</div>
                  <h6 className="fw-bold text-white mb-1">Extreme Compression</h6>
                  <p className="small text-secondary mb-2">Smallest possible file size. Ideal for strict email/web upload limits.</p>
                  <span className="badge bg-warning text-dark font-monospace">~70% - 85% Saved</span>
                </div>

                {/* Medium (Recommended) */}
                <div 
                  className={`compress-preset-box ${compressionPreset === 'medium' ? 'active' : ''}`}
                  onClick={() => handleRecompress('medium')}
                >
                  <div className="preset-icon">🎯</div>
                  <h6 className="fw-bold text-white mb-1">Recommended</h6>
                  <p className="small text-secondary mb-2">Optimal balance between file size and image/text sharpness.</p>
                  <span className="badge bg-success font-monospace">~50% - 70% Saved</span>
                </div>

                {/* High Quality */}
                <div 
                  className={`compress-preset-box ${compressionPreset === 'highQuality' ? 'active' : ''}`}
                  onClick={() => handleRecompress('highQuality')}
                >
                  <div className="preset-icon">💎</div>
                  <h6 className="fw-bold text-white mb-1">High Quality</h6>
                  <p className="small text-secondary mb-2">Retains crisp high-resolution graphics and print-quality sharpness.</p>
                  <span className="badge bg-info text-dark font-monospace">~30% - 50% Saved</span>
                </div>
              </div>

              {/* Compressed Results Banner */}
              {activeTab.compressedData && (
                <div className="compression-result-card mt-4">
                  <div className="result-metric-group">
                    <div className="metric-box">
                      <span className="text-secondary small">Original Size</span>
                      <h4 className="text-white fw-bold mb-0">{formatBytes(activeTab.compressedData.originalSize)}</h4>
                    </div>
                    <div className="metric-arrow">
                      <i className="bi bi-arrow-right text-danger fs-3"></i>
                    </div>
                    <div className="metric-box">
                      <span className="text-secondary small">Compressed Size</span>
                      <h4 className="text-success fw-bold mb-0">{formatBytes(activeTab.compressedData.size)}</h4>
                    </div>
                    <div className="metric-badge">
                      <span className="badge bg-success rounded-pill fs-6 px-3 py-2 font-monospace">
                        -{activeTab.compressedData.reductionPercent}% Reduced!
                      </span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3 mt-3 flex-wrap">
                    <button 
                      type="button" 
                      className="btn btn-danger rounded-pill px-4 py-2 fw-bold d-flex align-items-center gap-2 shadow"
                      onClick={() => downloadSingleFile(activeTab.compressedData.url, `${activeTab.fileName.replace(/\.[^/.]+$/, "")}-compressed.pdf`)}
                    >
                      <i className="bi bi-download fs-5"></i> Download Compressed PDF
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-outline-light rounded-pill px-3 py-2"
                      onClick={() => window.open(activeTab.compressedData.url, '_blank')}
                    >
                      <i className="bi bi-eye me-1"></i> Preview PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* READY STATE: SPLIT PAGES & AUTO-WEBP VIEW */}
        {activeTab.status === 'ready' && activeTab.type === 'pdf' && activeMode === 'split' && (
          <div className="pdf-results-layout">
            {/* Control Panel Bar */}
            <div className="pdf-control-bar">
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div>
                  <h5 className="text-white fw-bold m-0 d-flex align-items-center gap-2">
                    <span>{activeTab.fileName}</span>
                    <span className="badge bg-danger rounded-pill font-monospace">
                      {activeTab.pages.length} Pages
                    </span>
                    <span className="badge bg-dark border border-secondary text-secondary">
                      {formatBytes(activeTab.fileSize)}
                    </span>
                  </h5>
                </div>

                {/* Quality Slider */}
                <div className="d-flex align-items-center gap-2 bg-dark px-3 py-1 rounded-pill border border-secondary border-opacity-25">
                  <label className="text-secondary small m-0 text-nowrap">
                    <i className="bi bi-sliders text-danger me-1"></i> WebP Quality:
                  </label>
                  <input 
                    type="range" 
                    min="0.4" 
                    max="1.0" 
                    step="0.05"
                    value={activeTab.quality}
                    onChange={(e) => {
                      const newQ = parseFloat(e.target.value);
                      updateTab(activeTab.id, { quality: newQ });
                    }}
                    onMouseUp={(e) => reConvertPagesToWebp(activeTab.id, parseFloat(e.target.value))}
                    onTouchEnd={(e) => reConvertPagesToWebp(activeTab.id, parseFloat(e.target.value))}
                    className="form-range"
                    style={{ width: '90px' }}
                  />
                  <span className="text-white font-monospace small">
                    {Math.round(activeTab.quality * 100)}%
                  </span>
                </div>

                {/* Scale / DPI Selector */}
                <div className="d-flex align-items-center gap-2 bg-dark px-3 py-1 rounded-pill border border-secondary border-opacity-25">
                  <label className="text-secondary small m-0 text-nowrap">
                    <i className="bi bi-aspect-ratio text-info me-1"></i> Clarity:
                  </label>
                  <select 
                    className="form-select form-select-sm bg-transparent text-white border-0 py-0"
                    style={{ width: '105px', fontSize: '0.8rem' }}
                    value={activeTab.scale}
                    onChange={(e) => {
                      const newScale = parseFloat(e.target.value);
                      updateTab(activeTab.id, { scale: newScale });
                      const cachedFile = fileCacheRef.current.get(activeTab.id);
                      if (cachedFile) processPdfFile(cachedFile, activeTab.id, newScale, activeTab.quality, true);
                    }}
                  >
                    <option value="1.0" className="bg-dark">1x (Standard)</option>
                    <option value="1.5" className="bg-dark">1.5x (HD)</option>
                    <option value="2.0" className="bg-dark">2x (Ultra 300DPI)</option>
                  </select>
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {/* Download All WebP ZIP */}
                <button 
                  type="button" 
                  className="btn btn-danger btn-sm rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1 shadow-sm"
                  onClick={() => downloadAllZip(activeTab, 'webp')}
                  title="Download all pages compressed in a ZIP archive as modern WebP"
                >
                  <i className="bi bi-file-earmark-zip"></i>
                  <span>Download All WebP (.zip)</span>
                </button>

                {/* Download All PNG ZIP */}
                <button 
                  type="button" 
                  className="btn btn-outline-light btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1"
                  onClick={() => downloadAllZip(activeTab, 'png')}
                  title="Download all pages in original PNG format as ZIP"
                >
                  <i className="bi bi-download"></i>
                  <span>Download PNGs (.zip)</span>
                </button>

                {/* Switch to Compress PDF */}
                <button 
                  type="button" 
                  className="btn btn-outline-warning btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1"
                  onClick={() => {
                    setActiveMode('compressor');
                    const cachedFile = fileCacheRef.current.get(activeTab.id);
                    if (cachedFile && !activeTab.compressedData) {
                      compressPdfFile(cachedFile, activeTab.id, compressionPreset);
                    }
                  }}
                  title="Compress and reduce size of this PDF"
                >
                  <i className="bi bi-file-earmark-zip-fill"></i>
                  <span>Compress PDF</span>
                </button>
              </div>
            </div>

            {/* Grid of Extracted & Converted Pages */}
            <div className="pdf-pages-grid">
              {activeTab.pages.map((page, idx) => {
                const reductionPercent = page.pngSize && page.webpSize 
                  ? Math.round(((page.pngSize - page.webpSize) / page.pngSize) * 100) 
                  : 0;

                return (
                  <div key={idx} className="pdf-page-card">
                    {/* Card Top Badges */}
                    <div className="pdf-page-card-header">
                      <span className="badge bg-danger rounded-pill">
                        Page {page.pageNumber}
                      </span>
                      {reductionPercent > 0 && (
                        <span className="badge bg-success rounded-pill font-monospace">
                          -{reductionPercent}% WebP
                        </span>
                      )}
                    </div>

                    {/* Thumbnail Image */}
                    <div 
                      className="pdf-page-thumb-wrapper"
                      onClick={() => setPreviewModal({
                        url: page.webpUrl || page.pngUrl,
                        pngUrl: page.pngUrl,
                        webpUrl: page.webpUrl,
                        title: `${activeTab.fileName} - Page ${page.pageNumber}`,
                        pageNumber: page.pageNumber,
                        width: page.width,
                        height: page.height,
                        pngSize: page.pngSize,
                        webpSize: page.webpSize
                      })}
                      title="Click to view full-size page"
                    >
                      <img 
                        src={page.webpUrl || page.pngUrl} 
                        alt={`Page ${page.pageNumber}`} 
                        loading="lazy"
                        className="pdf-page-thumb"
                      />
                      <div className="thumb-hover-overlay">
                        <i className="bi bi-zoom-in"></i>
                        <span>Click to Preview</span>
                      </div>
                    </div>

                    {/* Card Details & File Sizes */}
                    <div className="pdf-page-card-body">
                      <div className="d-flex justify-content-between align-items-center small text-secondary mb-2">
                        <span>
                          <i className="bi bi-aspect-ratio me-1"></i>
                          {page.width} × {page.height} px
                        </span>
                        <span>
                          <strong className="text-white">{formatBytes(page.webpSize)}</strong>
                          <span className="text-muted ms-1 text-decoration-line-through">
                            {formatBytes(page.pngSize)}
                          </span>
                        </span>
                      </div>

                      {/* Download & Action Buttons */}
                      <div className="d-flex align-items-center gap-1">
                        {/* Download WebP */}
                        <button 
                          type="button" 
                          className="btn btn-sm btn-danger flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                          onClick={() => downloadSingleFile(page.webpUrl, `page-${page.pageNumber}.webp`)}
                          title="Download this page as WebP"
                        >
                          <i className="bi bi-download"></i> WebP
                        </button>

                        {/* Download PNG */}
                        <button 
                          type="button" 
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => downloadSingleFile(page.pngUrl, `page-${page.pageNumber}.png`)}
                          title="Download this page as lossless PNG"
                        >
                          PNG
                        </button>

                        {/* Copy to Clipboard */}
                        <button 
                          type="button" 
                          className={`btn btn-sm ${copiedIndex === idx ? 'btn-success' : 'btn-outline-secondary'}`}
                          onClick={() => copyImageToClipboard(page.pngBlob, idx)}
                          title="Copy image to clipboard"
                        >
                          <i className={`bi ${copiedIndex === idx ? 'bi-check-lg' : 'bi-clipboard'}`}></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ready State: Direct Image to WebP Tab */}
        {activeTab.status === 'ready' && activeTab.type === 'images' && (
          <div className="pdf-results-layout">
            <div className="pdf-control-bar">
              <div className="d-flex align-items-center gap-2">
                <h5 className="text-white fw-bold m-0">
                  <span>Image Batch Converter</span>
                  <span className="badge bg-info ms-2 font-monospace">{activeTab.images.length} Images</span>
                </h5>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button 
                  type="button" 
                  className="btn btn-danger btn-sm rounded-pill px-3 fw-semibold"
                  onClick={() => downloadImagesZip(activeTab)}
                >
                  <i className="bi bi-file-earmark-zip me-1"></i> Download All WebP (.zip)
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline-secondary btn-sm rounded-pill"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <i className="bi bi-plus-lg me-1"></i> Add More Images
                </button>
              </div>
            </div>

            <div className="pdf-pages-grid">
              {activeTab.images.map((img, idx) => (
                <div key={idx} className="pdf-page-card">
                  <div className="pdf-page-thumb-wrapper">
                    <img src={img.webpUrl} alt={img.name} className="pdf-page-thumb" />
                  </div>
                  <div className="pdf-page-card-body">
                    <div className="mb-2">
                      <label className="form-label text-secondary small mb-1 d-flex justify-content-between align-items-center" style={{ fontSize: '0.72rem' }}>
                        <span>Image Name</span>
                        <span className="badge bg-secondary bg-opacity-25 text-info border border-secondary" style={{ fontSize: '0.65rem' }}>
                          <i className="bi bi-pencil me-1"></i>Editable
                        </span>
                      </label>
                      <div className="input-group input-group-sm">
                        <input
                          type="text"
                          className="form-control form-control-sm bg-dark text-white border-secondary"
                          value={img.name}
                          onChange={(e) => handleImageRename(idx, e.target.value)}
                          placeholder="image.webp"
                          title="Edit image file name"
                          style={{ fontSize: '0.8rem' }}
                        />
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          type="button"
                          title="Reset original name"
                          onClick={() => handleResetImageName(idx)}
                        >
                          <i className="bi bi-arrow-counterclockwise"></i>
                        </button>
                      </div>
                    </div>
                    <div className="d-flex justify-content-between small text-secondary mb-2">
                      <span>{img.width} × {img.height}</span>
                      <span>
                        <strong className="text-success">{formatBytes(img.webpSize)}</strong> 
                        <span className="text-muted ms-1 text-decoration-line-through">{formatBytes(img.originalSize)}</span>
                      </span>
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-danger w-100"
                      onClick={() => downloadSingleFile(img.webpUrl, sanitizeWebpName(img.name, `image-${idx + 1}.webp`))}
                    >
                      <i className="bi bi-download me-1"></i> Download WebP
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full-Page Lightbox Modal */}
      {previewModal && (
        <div className="pdf-modal-backdrop" onClick={() => setPreviewModal(null)}>
          <div className="pdf-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-modal-header">
              <div>
                <h6 className="text-white fw-bold mb-0">{previewModal.title}</h6>
                <span className="text-secondary small">
                  Dimensions: {previewModal.width} × {previewModal.height} px • WebP: {formatBytes(previewModal.webpSize)} (PNG: {formatBytes(previewModal.pngSize)})
                </span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button 
                  type="button" 
                  className="btn btn-sm btn-danger rounded-pill px-3"
                  onClick={() => downloadSingleFile(previewModal.webpUrl || previewModal.url, `page-${previewModal.pageNumber}.webp`)}
                >
                  <i className="bi bi-download me-1"></i> Download WebP
                </button>
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-light rounded-pill px-3"
                  onClick={() => downloadSingleFile(previewModal.pngUrl || previewModal.url, `page-${previewModal.pageNumber}.png`)}
                >
                  Download PNG
                </button>
                <button 
                  type="button" 
                  className="btn btn-close btn-close-white ms-2"
                  onClick={() => setPreviewModal(null)}
                ></button>
              </div>
            </div>

            <div className="pdf-modal-body">
              <img 
                src={previewModal.url} 
                alt="Full Preview" 
                className="pdf-modal-image"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
