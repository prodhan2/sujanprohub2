import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import './Projects.css'

function Projects() {
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState('grid')
  const [projects, setProjects] = useState([])

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'projects'), (snapshot) => {
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setProjects(projectsList)
    })
    return unsubscribe
  }, [])

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'html', label: 'HTML/CSS/JS' },
    { id: 'flutter', label: 'Flutter' },
    { id: 'react', label: 'React' },
    { id: 'laravel', label: 'Laravel' },
    { id: 'django', label: 'Django' }
  ]

  const currentProjects = activeTab === 'all' 
    ? projects 
    : projects.filter(project => project.category === activeTab)
  
  const displayProjects = currentProjects.slice(0, 5)
  const hasMore = currentProjects.length > 5

  return (
    <section id="projects" className="projects section py-3 py-md-4">
      <div className="container">
        <div className="section-title text-center mb-3">
          <h2 className="mb-1" style={{ fontSize: '1.75rem' }}>Projects</h2>
        </div>

        {/* Horizontal Scrollable Tabs */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="tabs-container">
            <div className="tabs-scroll">
              {categories.map((tab) => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* View Toggle */}
          <div className="btn-group" role="group">
            <button 
              type="button" 
              className={`btn btn-sm btn-outline-secondary ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <i className="bi bi-grid-3x3-gap"></i>
            </button>
            <button 
              type="button" 
              className={`btn btn-sm btn-outline-secondary ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <i className="bi bi-list-ul"></i>
            </button>
          </div>
        </div>

        {/* Projects List */}
        {viewMode === 'grid' ? (
          <div className="row g-2 g-md-3">
            {displayProjects.map((project) => (
              <div key={project.id} className="col-6 col-md-6 col-lg-4">
                <Link to={`/project/${project.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card h-100 shadow-sm border-0" style={{ cursor: 'pointer', background: '#ffffff' }}>
                    {project.imageUrl && (
                      <img 
                        src={project.imageUrl} 
                        alt={project.title}
                        className="card-img-top"
                        style={{ height: '150px', objectFit: 'cover' }}
                      />
                    )}
                    {!project.imageUrl && project.icon && (
                      <div 
                        className="card-img-top d-flex align-items-center justify-content-center"
                        style={{ height: '150px', backgroundColor: '#f8f9fa' }}
                        id="project-icon-container"
                      >
                        <i className={`bi ${project.icon} ${project.iconColor || 'text-primary'}`} style={{ fontSize: '3rem' }} id="project-icon"></i>
                      </div>
                    )}
                    <div className="card-body p-3">
                      <h5 className="card-title text-dark fw-bold fs-6 mb-1 text-truncate">{project.title}</h5>
                      <p className="card-text description mb-2 small text-muted" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        height: '2.4em'
                      }}>
                        {project.description}
                      </p>
                      <div className="d-flex flex-wrap gap-1">
                        {project.previewUrl && (
                          <a href={project.previewUrl} className="btn btn-sm btn-outline-primary py-0 px-2" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <i className="bi bi-eye me-1"></i> Preview
                          </a>
                        )}
                        {project.githubUrl && (
                          <a href={project.githubUrl} className="btn btn-sm btn-outline-dark py-0 px-2" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            <i className="bi bi-github me-1"></i> GitHub
                          </a>
                        )}
                        <button 
                          className="btn btn-sm btn-outline-success py-0 px-2" 
                          title="Share"
                          onClick={(e) => {
                            e.stopPropagation()
                            const shareUrl = project.previewUrl || window.location.href
                            const shareText = `Check out this project: ${project.title}`
                            if (navigator.share) {
                              navigator.share({
                                title: project.title,
                                text: shareText,
                                url: shareUrl
                              }).catch(err => console.log('Share cancelled', err))
                            } else {
                              navigator.clipboard.writeText(shareUrl)
                              alert('Link copied to clipboard!')
                            }
                          }}
                        >
                          <i className="bi bi-share me-1"></i> Share
                        </button>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
            {displayProjects.length === 0 && (
              <div className="col-12 text-center py-2">
                <div className="d-inline-flex align-items-center gap-2 px-3 py-2 bg-light rounded-pill text-muted small border shadow-sm">
                  <i className="bi bi-info-circle text-secondary"></i>
                  <span>No projects found in this category yet.</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="row">
            {displayProjects.map((project) => (
              <div key={project.id} className="col-12 mb-3">
                <Link to={`/project/${project.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card shadow-sm" style={{ cursor: 'pointer' }}>
                    <div className="card-body">
                      <div className="d-flex align-items-start">
                        {project.imageUrl && (
                          <img 
                            src={project.imageUrl} 
                            alt={project.title}
                            className="rounded me-3"
                            style={{ width: '120px', height: '120px', objectFit: 'cover', flexShrink: 0 }}
                          />
                        )}
                        {!project.imageUrl && project.icon && (
                          <div 
                            className="rounded me-3 d-flex align-items-center justify-content-center"
                            style={{ width: '120px', height: '120px', backgroundColor: '#f8f9fa', flexShrink: 0 }}
                          >
                            <i className={`bi ${project.icon} ${project.iconColor || 'text-primary'}`} style={{ fontSize: '3rem' }}></i>
                          </div>
                        )}
                        <div className="flex-grow-1">
                          <h5 className="card-title text-dark fw-bold mb-2">{project.title}</h5>
                          <p className="card-text text-muted small mb-3">{project.description}</p>
                          <div className="d-flex flex-wrap gap-2">
                            {project.previewUrl && (
                              <a href={project.previewUrl} className="btn btn-sm btn-outline-primary" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                <i className="bi bi-eye me-1"></i> Preview
                              </a>
                            )}
                            {project.githubUrl && (
                              <a href={project.githubUrl} className="btn btn-sm btn-outline-dark" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                <i className="bi bi-github me-1"></i> GitHub
                              </a>
                            )}
                            <button 
                              className="btn btn-sm btn-outline-success" 
                              title="Share"
                              onClick={(e) => {
                                e.stopPropagation()
                                const shareUrl = project.previewUrl || window.location.href
                                const shareText = `Check out this project: ${project.title}`
                                if (navigator.share) {
                                  navigator.share({
                                    title: project.title,
                                    text: shareText,
                                    url: shareUrl
                                  }).catch(err => console.log('Share cancelled', err))
                                } else {
                                  navigator.clipboard.writeText(shareUrl)
                                  alert('Link copied to clipboard!')
                                }
                              }}
                            >
                              <i className="bi bi-share me-1"></i> Share
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
            {displayProjects.length === 0 && (
              <div className="col-12 text-center py-2">
                <div className="d-inline-flex align-items-center gap-2 px-3 py-2 bg-light rounded-pill text-muted small border shadow-sm">
                  <i className="bi bi-info-circle text-secondary"></i>
                  <span>No projects found in this category yet.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* More Button */}
        {hasMore && (
          <div className="text-center mt-3">
            <Link to={`/projects/${activeTab}`} className="btn btn-outline-primary btn-sm py-2 px-4 rounded-pill">
              <i className="bi bi-arrow-right me-2"></i> View All {currentProjects.length} Projects
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

export default Projects
