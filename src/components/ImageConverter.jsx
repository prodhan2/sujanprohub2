import { useState } from 'react'
import JSZip from 'jszip'
import './ImageConverter.css'

function ImageConverter() {
  const [selectedFiles, setSelectedFiles] = useState([])
  const [convertedImages, setConvertedImages] = useState([])
  const [converting, setConverting] = useState(false)
  const [quality, setQuality] = useState(0.8)
  const [maxDimension, setMaxDimension] = useState(1920)
  const [showApiDocs, setShowApiDocs] = useState(false)
  const [useApi, setUseApi] = useState(false)
  const [apiUrl, setApiUrl] = useState('https://sujanpro.web.app')

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'))
    setSelectedFiles(files)
    setConvertedImages([])
  }

  const getBaseNameWithoutExt = (filename) => {
    if (!filename) return 'image'
    return filename.replace(/\.[^/.]+$/, '')
  }

  const formatWebpName = (filename) => {
    const base = getBaseNameWithoutExt(filename)
    return `${base}.webp`
  }

  const sanitizeFileName = (name, fallback = 'image.webp') => {
    if (!name || !name.trim()) return fallback
    let clean = name.trim()
    if (!clean.toLowerCase().endsWith('.webp')) {
      clean = `${clean}.webp`
    }
    return clean
  }

  const convertToWebP = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          
          let width = img.width
          let height = img.height
          
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension
              width = maxDimension
            } else {
              width = (width / height) * maxDimension
              height = maxDimension
            }
          }
          
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({
                originalFile: file,
                fileName: formatWebpName(file.name),
                convertedBlob: blob,
                originalSize: file.size,
                convertedSize: blob.size,
                originalDimensions: { width: img.width, height: img.height },
                convertedDimensions: { width, height },
                url: URL.createObjectURL(blob)
              })
            } else {
              reject(new Error('Failed to convert to WebP'))
            }
          }, 'image/webp', quality)
        }
        img.onerror = reject
        img.src = e.target.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleConvert = async () => {
    if (selectedFiles.length === 0) return
    
    setConverting(true)
    try {
      if (useApi) {
        // Use API for conversion
        const formData = new FormData()
        selectedFiles.forEach(file => formData.append('files', file))
        formData.append('quality', quality)
        if (maxDimension > 0) {
          formData.append('maxWidth', maxDimension)
          formData.append('maxHeight', maxDimension)
        }

        const response = await fetch(`${apiUrl}/api/convert-multiple`, {
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          throw new Error('API request failed')
        }

        const data = await response.json()
        
        const results = data.images.map((img, index) => {
          const original = selectedFiles[index]
          return {
            originalFile: original,
            fileName: formatWebpName(original?.name || `image-${index + 1}`),
            convertedBlob: base64ToBlob(img.image, 'image/webp'),
            originalSize: original ? original.size : 0,
            convertedSize: base64ToBlob(img.image, 'image/webp').size,
            originalDimensions: { width: 0, height: 0 },
            convertedDimensions: { width: 0, height: 0 },
            url: `data:${img.mimeType};base64,${img.image}`
          }
        })
        
        setConvertedImages(results)
      } else {
        // Use local conversion
        const conversions = selectedFiles.map(file => convertToWebP(file))
        const results = await Promise.all(conversions)
        setConvertedImages(results)
      }
    } catch (error) {
      console.error('Conversion error:', error)
      alert('Error converting images: ' + error.message)
    } finally {
      setConverting(false)
    }
  }

  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  const handleFileNameChange = (index, newName) => {
    setConvertedImages(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], fileName: newName }
      return updated
    })
  }

  const handleResetFileName = (index) => {
    setConvertedImages(prev => {
      const updated = [...prev]
      const original = updated[index]?.originalFile?.name
      updated[index] = {
        ...updated[index],
        fileName: formatWebpName(original || `image-${index + 1}`)
      }
      return updated
    })
  }

  const handleDownloadAll = () => {
    convertedImages.forEach((image, index) => {
      const fallback = formatWebpName(image.originalFile?.name || `image-${index + 1}`)
      const downloadName = sanitizeFileName(image.fileName, fallback)
      const link = document.createElement('a')
      link.href = image.url
      link.download = downloadName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    })
  }

  const handleDownloadAsZip = async () => {
    if (convertedImages.length === 0) return
    
    const zip = new JSZip()
    const folder = zip.folder('converted-images')
    const usedNames = new Map()
    
    convertedImages.forEach((image, index) => {
      const fallback = formatWebpName(image.originalFile?.name || `image-${index + 1}`)
      let fileName = sanitizeFileName(image.fileName, fallback)
      
      // Prevent duplicate names in ZIP
      if (usedNames.has(fileName.toLowerCase())) {
        const count = usedNames.get(fileName.toLowerCase()) + 1
        usedNames.set(fileName.toLowerCase(), count)
        const base = fileName.replace(/\.webp$/i, '')
        fileName = `${base}_(${count}).webp`
      } else {
        usedNames.set(fileName.toLowerCase(), 1)
      }
      
      folder.file(fileName, image.convertedBlob)
    })
    
    const content = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(content)
    link.download = 'converted-images.zip'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDownloadSingle = (image, index) => {
    const fallback = formatWebpName(image.originalFile?.name || `image-${index + 1}`)
    const downloadName = sanitizeFileName(image.fileName, fallback)
    const link = document.createElement('a')
    link.href = image.url
    link.download = downloadName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const calculateSavings = (original, converted) => {
    const savings = ((1 - converted / original) * 100).toFixed(1)
    return savings > 0 ? `${savings}% smaller` : `${Math.abs(savings)}% larger`
  }

  return (
    <div className="image-converter">
      <div className="container py-5">
        <h1 className="mb-4">Offline Image to WebP Converter</h1>
        
        {/* Settings */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="card-title mb-0">Conversion Settings</h5>
              <button
                className="btn btn-outline-info btn-sm"
                onClick={() => setShowApiDocs(!showApiDocs)}
              >
                <i className="bi bi-code-square me-1"></i>
                {showApiDocs ? 'Hide' : 'Show'} API Docs
              </button>
            </div>
            
            {/* API Settings */}
            <div className="alert alert-info mb-3">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="useApiSwitch"
                  checked={useApi}
                  onChange={(e) => setUseApi(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="useApiSwitch">
                  Use API Server for Conversion
                </label>
              </div>
              {useApi && (
                <div className="mt-2">
                  <label className="form-label">API URL</label>
                  <input
                    type="text"
                    className="form-control"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="http://localhost:3001"
                  />
                  <small className="text-muted">
                    Make sure the API server is running at this URL
                  </small>
                </div>
              )}
            </div>
            
            {/* API Documentation */}
            {showApiDocs && (
              <div className="alert alert-secondary mb-3">
                <h6 className="alert-heading">API Documentation</h6>
                <hr />
                <p><strong>Base URL:</strong> {apiUrl}</p>
                <p><strong>Endpoints:</strong></p>
                <ul className="mb-0">
                  <li><code>POST /api/convert</code> - Convert single image</li>
                  <li><code>POST /api/convert-multiple</code> - Convert multiple images</li>
                  <li><code>GET /api/health</code> - Health check</li>
                </ul>
                
                <p className="mt-3 mb-2"><strong>JSON API Response:</strong></p>
                <pre className="bg-light p-2 rounded mb-2" style={{ fontSize: '0.85rem' }}>
{`{
  "success": true,
  "originalSize": "2.5 MB",
  "convertedSize": "500 KB",
  "savings": "80% smaller",
  "image": "base64_encoded_webp_image",
  "mimeType": "image/webp"
}`}
                </pre>
                
                <p className="mt-3 mb-2"><strong>Flutter Usage Example:</strong></p>
                <pre className="bg-light p-2 rounded mb-2" style={{ fontSize: '0.85rem' }}>
{`import 'package:http/http.dart' as http;
import 'dart:convert';

Future<void> convertImage(String imagePath) async {
  var request = http.MultipartRequest(
    'POST',
    Uri.parse('${apiUrl}/api/convert'),
  );
  
  request.files.add(await http.MultipartFile.fromPath(
    'file',
    imagePath,
  ));
  request.fields['quality'] = '0.8';
  
  var response = await request.send();
  var responseData = await response.stream.bytesToString();
  var data = json.decode(responseData);
  
  if (data['success']) {
    print('Original: \${data['originalSize']}');
    print('Converted: \${data['convertedSize']}');
    print('Savings: \${data['savings']}');
    
    // Save converted image
    var imageBytes = base64Decode(data['image']);
    // Save imageBytes to file...
  }
}`}
                </pre>
                
                <p className="mb-0 mt-2">
                  <strong>cURL Example:</strong>
                  <code className="d-block mt-1 p-2 bg-light rounded">
                    curl -X POST {apiUrl}/api/convert -F "file=@image.jpg" -F "quality=0.8"
                  </code>
                </p>
              </div>
            )}
            
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Quality (0.1 - 1.0)</label>
                <input
                  type="range"
                  className="form-range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                />
                <div className="text-muted">Current: {quality}</div>
              </div>
              <div className="col-md-6">
                <label className="form-label">Max Dimension (px)</label>
                <input
                  type="number"
                  className="form-control"
                  min="100"
                  max="4096"
                  value={maxDimension}
                  onChange={(e) => setMaxDimension(parseInt(e.target.value))}
                />
                <div className="text-muted">0 = no resize limit</div>
              </div>
            </div>
          </div>
        </div>

        {/* File Selection */}
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title mb-3">Select Images</h5>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="form-control"
            />
            {selectedFiles.length > 0 && (
              <div className="mt-3">
                <p className="mb-0">{selectedFiles.length} file(s) selected</p>
              </div>
            )}
          </div>
        </div>

        {/* Convert Button */}
        {selectedFiles.length > 0 && (
          <div className="mb-4">
            <button
              className="btn btn-primary btn-lg"
              onClick={handleConvert}
              disabled={converting}
            >
              {converting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Converting...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-repeat me-2"></i>
                  Convert to WebP
                </>
              )}
            </button>
          </div>
        )}

        {/* Results */}
        {convertedImages.length > 0 && (
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="card-title mb-0">Converted Images ({convertedImages.length})</h5>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-success"
                    onClick={handleDownloadAll}
                  >
                    <i className="bi bi-download me-2"></i>
                    Download All
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleDownloadAsZip}
                  >
                    <i className="bi bi-file-earmark-zip me-2"></i>
                    Download as ZIP
                  </button>
                </div>
              </div>
              
              {/* Total Size Summary */}
              <div className="alert alert-info mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Total Original Size:</strong> {formatFileSize(convertedImages.reduce((sum, img) => sum + img.originalSize, 0))}
                  </div>
                  <div>
                    <strong>Total Compressed Size:</strong> {formatFileSize(convertedImages.reduce((sum, img) => sum + img.convertedSize, 0))}
                  </div>
                  <div>
                    <strong>Total Savings:</strong> {calculateSavings(
                      convertedImages.reduce((sum, img) => sum + img.originalSize, 0),
                      convertedImages.reduce((sum, img) => sum + img.convertedSize, 0)
                    )}
                  </div>
                </div>
              </div>
              
              <div className="row g-3">
                {convertedImages.map((image, index) => (
                  <div key={index} className="col-md-6 col-lg-4">
                    <div className="card">
                      <img
                        src={image.url}
                        alt={image.originalFile.name}
                        className="card-img-top"
                        style={{ height: '200px', objectFit: 'cover' }}
                      />
                      <div className="card-body">
                        <div className="mb-2">
                          <label className="form-label small text-muted mb-1 d-flex justify-content-between align-items-center">
                            <span>Image Name:</span>
                            <span className="badge bg-light text-primary border" style={{ fontSize: '0.7rem' }}>
                              <i className="bi bi-pencil me-1"></i>Editable
                            </span>
                          </label>
                          <div className="input-group input-group-sm">
                            <input
                              type="text"
                              className="form-control"
                              value={image.fileName || ''}
                              onChange={(e) => handleFileNameChange(index, e.target.value)}
                              placeholder="Filename.webp"
                              title="Edit file name"
                            />
                            <button
                              className="btn btn-outline-secondary"
                              type="button"
                              title="Reset to original name"
                              onClick={() => handleResetFileName(index)}
                            >
                              <i className="bi bi-arrow-counterclockwise"></i>
                            </button>
                          </div>
                        </div>
                        <div className="mb-2">
                          <small className="text-muted d-block text-truncate" title={image.originalFile?.name}>
                            Original: {image.originalFile?.name}
                          </small>
                          <small className="text-muted d-block">
                            {formatFileSize(image.originalSize)} | {image.originalDimensions.width} × {image.originalDimensions.height}px
                          </small>
                        </div>
                        <div className="mb-2">
                          <small className="text-success d-block">
                            Converted: {formatFileSize(image.convertedSize)} | {image.convertedDimensions.width} × {image.convertedDimensions.height}px
                          </small>
                        </div>
                        <div className="mb-3">
                          <span className="badge bg-info">
                            {calculateSavings(image.originalSize, image.convertedSize)}
                          </span>
                        </div>
                        <button
                          className="btn btn-outline-primary btn-sm w-100"
                          onClick={() => handleDownloadSingle(image, index)}
                        >
                          <i className="bi bi-download me-1"></i>
                          Download WebP
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <footer className="text-center py-4 mt-5">
          <p className="text-muted mb-0">
            Powered by <strong>Sujan Prodhan</strong> | CSE, University of Rajshahi
          </p>
        </footer>
      </div>
    </div>
  )
}

export default ImageConverter
