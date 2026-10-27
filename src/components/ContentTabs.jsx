import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import './ContentTabs.css'
import './Projects.css'
import './Gallery.css'

function ContentTabs({ activeTab, setActiveTab }) {
  const [data, setData] = useState({
    projects: [],
    posts: [],
    research: [],
    resources: [],
    gallery: []
  })

  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)

  useEffect(() => {
    const tabs = ['projects', 'posts', 'research', 'resources', 'gallery']
    const unsubscribes = []
    
    tabs.forEach(tab => {
      const unsubscribe = onSnapshot(collection(db, tab), (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setData(prev => ({ ...prev, [tab]: items }))
      })
      unsubscribes.push(unsubscribe)
    })
    
    return () => unsubscribes.forEach(unsub => unsub())
  }, [])

  const openLightbox = (index) => {
    setCurrentImageIndex(index)
    setZoomLevel(1)
    setLightboxOpen(true)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? data.gallery.length - 1 : prev - 1))
    setZoomLevel(1)
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === data.gallery.length - 1 ? 0 : prev + 1))
    setZoomLevel(1)
  }

  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3))
  }

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 1))
  }

  const resetZoom = () => {
    setZoomLevel(1)
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen) return
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowLeft') prevImage()
      if (e.key === 'ArrowRight') nextImage()
      if (e.key === '+' || e.key === '=') zoomIn()
      if (e.key === '-') zoomOut()
      if (e.key === '0') resetZoom()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen, data.gallery.length])

  const [activeProjectCategory, setActiveProjectCategory] = useState('html')
  
  const categories = [
    { id: 'html', label: 'HTML/CSS/JS' },
    { id: 'flutter', label: 'Flutter' },
    { id: 'react', label: 'React' },
    { id: 'laravel', label: 'Laravel' },
    { id: 'django', label: 'Django' }
  ]

  const renderContent = () => {
    const items = data[activeTab]
    if (items.length === 0) return <p className="text-center py-5">No content available yet.</p>

    if (activeTab === 'gallery') {
          return (
            <>
              <div className="row g-3">
                {items.map((item, index) => (
                  <div key={item.id} className="col-3">
                    <img 
                      src={item.url} 
                      alt="Gallery" 
                      className="img-fluid rounded" 
                      style={{ width: '100%', height: '200px', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => openLightbox(index)}
                    />
                  </div>
                ))}
              </div>

              {/* Lightbox */}
              {lightboxOpen && data.gallery.length > 0 && (
                <div 
                  className="lightbox-overlay"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) closeLightbox()
                  }}
                >
                  <button className="lightbox-close" onClick={closeLightbox}>
                    <i className="bi bi-x-lg"></i>
                  </button>
                  
                  <button className="lightbox-nav lightbox-prev" onClick={prevImage}>
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  
                  <button className="lightbox-nav lightbox-next" onClick={nextImage}>
                    <i className="bi bi-chevron-right"></i>
                  </button>

                  <div className="lightbox-zoom-controls">
                    <button onClick={zoomOut} title="Zoom Out">
                      <i className="bi bi-zoom-out"></i>
                    </button>
                    <button onClick={resetZoom} title="Reset Zoom">
                      <i className="bi bi-arrows-fullscreen"></i>
                    </button>
                    <button onClick={zoomIn} title="Zoom In">
                      <i className="bi bi-zoom-in"></i>
                    </button>
                  </div>

                  <div className="lightbox-image-container">
                    <img 
                      src={data.gallery[currentImageIndex].url} 
                      alt="Gallery" 
                      className="lightbox-image"
                      style={{ transform: `scale(${zoomLevel})` }}
                    />
                  </div>
                </div>
              )}
            </>
          )
        }

    if (activeTab === 'projects') {
      const currentProjects = items.filter(project => project.category === activeProjectCategory)
      return (
        <>
          <div className="tabs-container mb-4">
            <div className="tabs-scroll">
              {categories.map((tab) => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeProjectCategory === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveProjectCategory(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="row g-4">
            {currentProjects.map((project) => (
              <div key={project.id} className="col-lg-4 col-md-6">
                <div className="card h-100">
                  {project.imageUrl && (
                    <img 
                      src={project.imageUrl} 
                      className="card-img-top" 
                      alt={project.title} 
                      style={{ height: '200px', objectFit: 'cover' }} 
                    />
                  )}
                  {!project.imageUrl && project.icon && (
                    <div 
                      className="card-img-top d-flex align-items-center justify-content-center"
                      style={{ height: '200px', backgroundColor: '#f8f9fa' }}
                    >
                      <i className={`bi ${project.icon} ${project.iconColor}`} style={{ fontSize: '4rem' }}></i>
                    </div>
                  )}
                  <div className="card-body">
                    <h5 className="card-title fw-bold">{project.title}</h5>
                    <p className="card-text">{project.description}</p>
                    <div className="d-flex flex-wrap gap-2">
                      {project.previewUrl && (
                        <a href={project.previewUrl} className="btn btn-outline-primary" target="_blank" rel="noopener noreferrer">
                          <i className="bi bi-eye me-1"></i> Preview
                        </a>
                      )}
                      {project.githubUrl && (
                        <a href={project.githubUrl} className="btn btn-outline-dark" target="_blank" rel="noopener noreferrer">
                          <i className="bi bi-github me-1"></i> GitHub
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {currentProjects.length === 0 && (
              <div className="col-12 text-center py-5">
                <p>No projects found in this category yet.</p>
              </div>
            )}
          </div>
        </>
      )
    }

    return (
      <div className="row g-4">
        {items.map(item => (
          <div key={item.id} className="col-md-6">
            <div className="card h-100">
              {item.imageUrl && (
                <img src={item.imageUrl} className="card-img-top" alt={item.title} style={{ height: '200px', objectFit: 'cover' }} />
              )}
              <div className="card-body">
                <h5 className="card-title">{item.title}</h5>
                {item.description && <p className="card-text">{item.description}</p>}
                {item.url && <a href={item.url} className="btn btn-primary" target="_blank" rel="noopener noreferrer">Learn More</a>}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <section id="content" className="content-tabs py-5 bg-light">
      <div className="container">
        <h2 className="text-center mb-4">My Content</h2>
        <ul className="nav nav-tabs justify-content-center mb-4" id="contentTabs" role="tablist">
          <li className="nav-item" role="presentation">
            <button 
              className={`nav-link ${activeTab === 'projects' ? 'active' : ''}`} 
              onClick={() => setActiveTab('projects')}
            >
              Projects
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button 
              className={`nav-link ${activeTab === 'posts' ? 'active' : ''}`} 
              onClick={() => setActiveTab('posts')}
            >
              Posts
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button 
              className={`nav-link ${activeTab === 'research' ? 'active' : ''}`} 
              onClick={() => setActiveTab('research')}
            >
              Research
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button 
              className={`nav-link ${activeTab === 'resources' ? 'active' : ''}`} 
              onClick={() => setActiveTab('resources')}
            >
              Resources
            </button>
          </li>
          <li className="nav-item" role="presentation">
            <button 
              className={`nav-link ${activeTab === 'gallery' ? 'active' : ''}`} 
              onClick={() => setActiveTab('gallery')}
            >
              Image Gallery
            </button>
          </li>
        </ul>
        <div className="tab-content">
          {renderContent()}
        </div>
      </div>
    </section>
  )
}

export default ContentTabs
