import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import JSZip from 'jszip';

// Safely load PDF.js dynamically on demand
const getPdfLib = async () => {
  const pdfjsModule = await import('pdfjs-dist');
  const lib = pdfjsModule.default || pdfjsModule;
  const options = lib.GlobalWorkerOptions || pdfjsModule.GlobalWorkerOptions;
  if (options) {
    options.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version || '3.11.174'}/pdf.worker.min.js`;
  }
  return lib;
};

// Safely load jsPDF dynamically on demand
const getJsPdf = async () => {
  const mod = await import('jspdf');
  return mod.jsPDF || mod.default;
};

const PdfToolsContext = createContext(null);

// Helper: Create unique tab ID
const generateTabId = () => 'tab_' + Math.random().toString(36).substring(2, 9);

export function PdfToolsProvider({ children }) {
  const [tabs, setTabs] = useState([
    {
      id: 'tab_default',
      title: 'New PDF Tab',
      type: 'pdf', // 'pdf' | 'images'
      fileName: '',
      fileSize: 0,
      pages: [],
      images: [],
      status: 'idle', // 'idle' | 'loading' | 'processing' | 'ready' | 'error'
      errorMessage: '',
      progress: { current: 0, total: 0, text: '' },
      scale: 1.5,
      quality: 0.85,
      autoConvertToWebp: true
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab_default');

  // Background task notification toast
  const [backgroundNotification, setBackgroundNotification] = useState(null); // { message, type: 'info' | 'success', tabId }

  // Check if any tab is actively processing
  const isAnyTabProcessing = tabs.some(t => t.status === 'loading' || t.status === 'processing');

  // Update a single tab's state
  const updateTab = useCallback((tabId, updates) => {
    setTabs(prev => prev.map(tab => tab.id === tabId ? { ...tab, ...updates } : tab));
  }, []);

  // Add a new empty PDF or Image tab
  const addNewTab = useCallback((type = 'pdf') => {
    const newId = generateTabId();
    const newTab = {
      id: newId,
      title: type === 'pdf' ? `PDF Tab ${tabs.length + 1}` : `Images Tab ${tabs.length + 1}`,
      type,
      fileName: '',
      fileSize: 0,
      pages: [],
      images: [],
      status: 'idle',
      errorMessage: '',
      progress: { current: 0, total: 0, text: '' },
      scale: 1.5,
      quality: 0.85,
      autoConvertToWebp: true
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    return newId;
  }, [tabs.length]);

  // Close a tab
  const closeTab = useCallback((tabId) => {
    if (tabs.length === 1) {
      const resetId = generateTabId();
      setTabs([{
        id: resetId,
        title: 'New PDF Tab',
        type: 'pdf',
        fileName: '',
        fileSize: 0,
        pages: [],
        images: [],
        status: 'idle',
        errorMessage: '',
        progress: { current: 0, total: 0, text: '' },
        scale: 1.5,
        quality: 0.85,
        autoConvertToWebp: true
      }]);
      setActiveTabId(resetId);
      return;
    }

    const tabToClose = tabs.find(t => t.id === tabId);
    if (tabToClose) {
      tabToClose.pages?.forEach(p => {
        if (p.pngUrl) URL.revokeObjectURL(p.pngUrl);
        if (p.webpUrl) URL.revokeObjectURL(p.webpUrl);
      });
      tabToClose.images?.forEach(img => {
        if (img.webpUrl) URL.revokeObjectURL(img.webpUrl);
        if (img.originalUrl) URL.revokeObjectURL(img.originalUrl);
      });
    }

    const remaining = tabs.filter(t => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  }, [tabs, activeTabId]);

  // -------------------------------------------------------------
  // BACKGROUND PERSISTENT PDF PROCESSING
  // -------------------------------------------------------------
  const processPdfFile = useCallback(async (file, targetTabId, customScale = 1.5, customQuality = 0.85, autoWebp = true) => {
    const tabId = targetTabId || activeTabId;
    const scale = customScale || 1.5;
    const quality = customQuality || 0.85;
    const autoConvert = autoWebp !== undefined ? autoWebp : true;

    updateTab(tabId, {
      status: 'loading',
      fileName: file.name,
      fileSize: file.size,
      title: file.name.length > 20 ? file.name.substring(0, 18) + '...' : file.name,
      pages: [],
      errorMessage: '',
      progress: { current: 0, total: 0, text: 'Loading PDF document...' }
    });

    setBackgroundNotification({
      message: `Converting "${file.name}" in background...`,
      type: 'info',
      tabId
    });

    try {
      const pdfjsLib = await getPdfLib();
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      updateTab(tabId, {
        status: 'processing',
        progress: { current: 0, total: numPages, text: `Found ${numPages} pages. Starting extraction...` }
      });

      const extractedPages = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        updateTab(tabId, {
          progress: { 
            current: pageNum, 
            total: numPages, 
            text: `Processing page ${pageNum} of ${numPages} (${autoConvert ? 'Auto-converting to WebP' : 'Extracting PNG'})...` 
          }
        });

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d', { alpha: false });

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;

        const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const pngUrl = URL.createObjectURL(pngBlob);

        let webpBlob = null;
        let webpUrl = null;
        if (autoConvert) {
          webpBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
          webpUrl = URL.createObjectURL(webpBlob);
        }

        const pageData = {
          pageNumber: pageNum,
          width: canvas.width,
          height: canvas.height,
          pngBlob,
          pngUrl,
          pngSize: pngBlob ? pngBlob.size : 0,
          webpBlob,
          webpUrl,
          webpSize: webpBlob ? webpBlob.size : 0,
          selected: true
        };

        extractedPages.push(pageData);

        // Incremental state update so UI updates live
        setTabs(prev => prev.map(t => {
          if (t.id === tabId) {
            return {
              ...t,
              pages: [...extractedPages]
            };
          }
          return t;
        }));
      }

      updateTab(tabId, {
        status: 'ready',
        pages: extractedPages,
        progress: { current: numPages, total: numPages, text: `Successfully converted all ${numPages} pages!` }
      });

      setBackgroundNotification({
        message: `✅ "${file.name}" conversion complete! (${numPages} pages ready)`,
        type: 'success',
        tabId
      });

      // Clear notification after 6 seconds
      setTimeout(() => {
        setBackgroundNotification(null);
      }, 6000);

    } catch (err) {
      console.error('PDF background parsing error:', err);
      updateTab(tabId, {
        status: 'error',
        errorMessage: err.message || 'Failed to read PDF file. Please ensure it is a valid PDF.'
      });
      setBackgroundNotification({
        message: `⚠️ Error converting "${file.name}": ${err.message}`,
        type: 'error',
        tabId
      });
    }
  }, [activeTabId, tabs, updateTab]);

  // -------------------------------------------------------------
  // PDF COMPRESSION (CLIENT-SIDE WITH JSPDF)
  // -------------------------------------------------------------
  const compressPdfFile = useCallback(async (file, targetTabId, compressionPreset = 'medium') => {
    const tabId = targetTabId || activeTabId;
    
    // Preset configurations
    let quality = 0.65;
    let scale = 1.0;
    if (compressionPreset === 'extreme') {
      quality = 0.40;
      scale = 0.85;
    } else if (compressionPreset === 'highQuality') {
      quality = 0.82;
      scale = 1.25;
    } else if (typeof compressionPreset === 'number') {
      quality = compressionPreset;
      scale = 1.0;
    }

    updateTab(tabId, {
      status: 'processing',
      fileName: file.name,
      fileSize: file.size,
      title: file.name.length > 20 ? file.name.substring(0, 18) + '...' : file.name,
      errorMessage: '',
      progress: { current: 0, total: 0, text: 'Preparing PDF for compression...' }
    });

    setBackgroundNotification({
      message: `Compressing "${file.name}" in background...`,
      type: 'info',
      tabId
    });

    try {
      const [pdfjsLib, JsPDFClass] = await Promise.all([getPdfLib(), getJsPdf()]);
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;

      let doc = null;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        updateTab(tabId, {
          progress: {
            current: pageNum,
            total: numPages,
            text: `Compressing page ${pageNum} of ${numPages}...`
          }
        });

        const page = await pdf.getPage(pageNum);
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d', { alpha: false });

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;

        // Compress canvas to JPEG image data
        const imgData = canvas.toDataURL('image/jpeg', quality);

        const pageWidth = unscaledViewport.width;
        const pageHeight = unscaledViewport.height;
        const orientation = pageWidth > pageHeight ? 'landscape' : 'portrait';

        if (pageNum === 1) {
          doc = new JsPDFClass({
            orientation,
            unit: 'pt',
            format: [pageWidth, pageHeight],
            compress: true
          });
        } else {
          doc.addPage([pageWidth, pageHeight], orientation);
        }

        doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      }

      const compressedBlob = doc.output('blob');
      const compressedUrl = URL.createObjectURL(compressedBlob);
      const compressedSize = compressedBlob.size;
      const reductionPercent = Math.max(0, Math.round(((file.size - compressedSize) / file.size) * 100));

      updateTab(tabId, {
        status: 'ready',
        compressedData: {
          blob: compressedBlob,
          url: compressedUrl,
          size: compressedSize,
          originalSize: file.size,
          reductionPercent,
          numPages,
          preset: compressionPreset
        },
        progress: {
          current: numPages,
          total: numPages,
          text: `Compression complete! Saved ${reductionPercent}%`
        }
      });

      setBackgroundNotification({
        message: `✅ "${file.name}" compressed! (${reductionPercent}% smaller)`,
        type: 'success',
        tabId
      });

      setTimeout(() => setBackgroundNotification(null), 6000);

    } catch (err) {
      console.error('PDF compression error:', err);
      updateTab(tabId, {
        status: 'error',
        errorMessage: err.message || 'Failed to compress PDF file.'
      });
      setBackgroundNotification({
        message: `⚠️ Error compressing "${file.name}": ${err.message}`,
        type: 'error',
        tabId
      });
    }
  }, [activeTabId, updateTab]);

  // -------------------------------------------------------------
  // UPLOAD MULTIPLE PDFS AT ONCE (EACH OPENS IN ITS OWN TAB)
  // -------------------------------------------------------------
  const uploadMultiplePdfs = useCallback((pdfFiles, options = {}) => {
    if (!pdfFiles || pdfFiles.length === 0) return;
    const { scale = 1.5, quality = 0.85, autoConvert = true, mode = 'split', compressionPreset = 'medium' } = options;

    const newTabsToCreate = [];
    const filesToProcess = [];

    // Check if the current active tab is an idle, untouched PDF tab
    const isFirstTabIdle = tabs.length === 1 && tabs[0].status === 'idle' && tabs[0].type === 'pdf';

    pdfFiles.forEach((file, index) => {
      let tabId;
      if (index === 0 && isFirstTabIdle) {
        tabId = tabs[0].id;
      } else {
        tabId = generateTabId();
      }

      const tabTitle = file.name.length > 20 ? file.name.substring(0, 18) + '...' : file.name;

      newTabsToCreate.push({
        id: tabId,
        title: tabTitle,
        type: 'pdf',
        fileName: file.name,
        fileSize: file.size,
        pages: [],
        images: [],
        status: 'loading',
        errorMessage: '',
        progress: { current: 0, total: 0, text: 'Queued for processing...' },
        scale,
        quality,
        autoConvertToWebp: autoConvert
      });

      filesToProcess.push({ file, tabId });
    });

    // Update tabs state all at once!
    setTabs(prev => {
      if (isFirstTabIdle) {
        return [...newTabsToCreate];
      }
      return [...prev, ...newTabsToCreate];
    });

    // Set the first uploaded file's tab as active
    setActiveTabId(filesToProcess[0].tabId);

    // Process each PDF
    filesToProcess.forEach(({ file, tabId }) => {
      if (mode === 'compressor') {
        compressPdfFile(file, tabId, compressionPreset);
      } else {
        processPdfFile(file, tabId, scale, quality, autoConvert);
      }
    });
  }, [tabs, processPdfFile, compressPdfFile]);

  // -------------------------------------------------------------
  // RE-CONVERT PAGES TO WEBP
  // -------------------------------------------------------------
  const reConvertPagesToWebp = useCallback(async (tabId, newQuality) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || !tab.pages || tab.pages.length === 0) return;

    updateTab(tabId, { status: 'processing', progress: { current: 0, total: tab.pages.length, text: 'Re-compressing WebP...' } });

    try {
      const updatedPages = [];
      for (let i = 0; i < tab.pages.length; i++) {
        const p = tab.pages[i];
        const img = new Image();
        img.src = p.pngUrl;
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
        });

        const canvas = document.createElement('canvas');
        canvas.width = p.width;
        canvas.height = p.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const newWebpBlob = await new Promise(res => canvas.toBlob(res, 'image/webp', newQuality));
        if (p.webpUrl) URL.revokeObjectURL(p.webpUrl);
        const newWebpUrl = URL.createObjectURL(newWebpBlob);

        updatedPages.push({
          ...p,
          webpBlob: newWebpBlob,
          webpUrl: newWebpUrl,
          webpSize: newWebpBlob.size
        });
      }

      updateTab(tabId, {
        status: 'ready',
        quality: newQuality,
        pages: updatedPages,
        progress: { current: updatedPages.length, total: updatedPages.length, text: 'WebP updated!' }
      });
    } catch (e) {
      console.error('Re-convert error:', e);
      updateTab(tabId, { status: 'ready' });
    }
  }, [tabs, updateTab]);

  // -------------------------------------------------------------
  // DIRECT IMAGE TO WEBP CONVERTER
  // -------------------------------------------------------------
  const processImageFiles = useCallback(async (files, targetTabId) => {
    const tabId = targetTabId || activeTabId;
    const tab = tabs.find(t => t.id === tabId);
    const quality = tab ? tab.quality : 0.85;

    updateTab(tabId, {
      status: 'processing',
      progress: { current: 0, total: files.length, text: 'Converting images to WebP...' }
    });

    const convertedList = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const img = new Image();
        const originalUrl = URL.createObjectURL(file);
        img.src = originalUrl;
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const webpBlob = await new Promise(res => canvas.toBlob(res, 'image/webp', quality));
        const webpUrl = URL.createObjectURL(webpBlob);

        convertedList.push({
          id: 'img_' + i + '_' + Date.now(),
          name: file.name.replace(/\.[^/.]+$/, "") + '.webp',
          originalName: file.name,
          originalSize: file.size,
          originalUrl,
          webpBlob,
          webpUrl,
          webpSize: webpBlob.size,
          width: img.naturalWidth,
          height: img.naturalHeight,
          selected: true
        });

        updateTab(tabId, {
          images: [...convertedList],
          progress: { current: i + 1, total: files.length, text: `Converted ${i + 1} of ${files.length}` }
        });
      } catch (err) {
        console.error('Failed to convert image:', file.name, err);
      }
    }

    updateTab(tabId, {
      status: 'ready',
      images: convertedList,
      title: `Images (${convertedList.length})`,
      progress: { current: files.length, total: files.length, text: `Converted ${convertedList.length} images to WebP!` }
    });
  }, [activeTabId, tabs, updateTab]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      tabs.forEach(tab => {
        tab.pages?.forEach(p => {
          if (p.pngUrl) URL.revokeObjectURL(p.pngUrl);
          if (p.webpUrl) URL.revokeObjectURL(p.webpUrl);
        });
        tab.images?.forEach(img => {
          if (img.webpUrl) URL.revokeObjectURL(img.webpUrl);
          if (img.originalUrl) URL.revokeObjectURL(img.originalUrl);
        });
        if (tab.compressedData?.url) {
          URL.revokeObjectURL(tab.compressedData.url);
        }
      });
    };
  }, []);

  const value = {
    tabs,
    setTabs,
    activeTabId,
    setActiveTabId,
    updateTab,
    addNewTab,
    closeTab,
    processPdfFile,
    uploadMultiplePdfs,
    reConvertPagesToWebp,
    processImageFiles,
    compressPdfFile,
    backgroundNotification,
    setBackgroundNotification,
    isAnyTabProcessing
  };

  return (
    <PdfToolsContext.Provider value={value}>
      {children}
    </PdfToolsContext.Provider>
  );
}

export function usePdfTools() {
  const context = useContext(PdfToolsContext);
  if (!context) {
    throw new Error('usePdfTools must be used within a PdfToolsProvider');
  }
  return context;
}
