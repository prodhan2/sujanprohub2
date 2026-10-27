import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import './Projects.css'

function ProjectsList() {
  const { category } = useParams()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'html', label: 'HTML/CSS/JS' },
    { id: 'flutter', label: 'Flutter' },
    { id: 'react', label: 'React' },
    { id: 'laravel', label: 'Laravel' },
    { id: 'django', label: 'Django' }
  ]

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

  const currentProjects = category === 'all' 
    ? projects 
    : projects.filter(project => project.category === category)

  const categoryLabel = categories.find(c => c.id === category)?.label || category

  return (
    <section className="projects section py-5">
      <div className="container">
        <div className="section-title text-center mb-5">
          <h2>{categoryLabel} Projects</h2>
          <Link to="/#projects" className="btn btn-outline-primary mt-3">
            <i className="bi bi-arrow-left me-2"></i> Back to Home
          </Link>
        </div>

        <div className="tabs-container mb-5">
          <div className="tabs-scroll">
            {categories.map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn ${category === tab.id ? 'active' : ''}`}
                onClick={() => navigate(`/projects/${tab.id}`)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="row g-2 g-md-4">
          {currentProjects.map((project) => (
            <div key={project.id} className="col-6 col-md-6 col-lg-4">
              <Link to={`/project/${project.id}`} style={{ textDecoration: 'none' }}>
                <div className="card h-100 shadow-sm" style={{ cursor: 'pointer' }}>
                  {project.imageUrl && (
                    <img 
                      src={project.imageUrl} 
                      alt={project.title}
                      className="card-img-top"
                      style={{ height: '200px', objectFit: 'cover' }}
                    />
                  )}
                  {!project.imageUrl && project.icon && (
                    <div 
                      className="card-img-top d-flex align-items-center justify-content-center"
                      style={{ height: '200px', backgroundColor: '#f8f9fa' }}
                    >
                      <i className={`bi ${project.icon} ${project.iconColor || 'text-primary'}`} style={{ fontSize: '4rem' }}></i>
                    </div>
                  )}
                  <div className="card-body">
                    <h5 className="card-title text-dark fw-bold">{project.title}</h5>
                    <p className="card-text description mb-3">{project.description}</p>
                    <div className="d-flex flex-wrap gap-2">
                      {project.previewUrl && (
                        <a href={project.previewUrl} className="btn btn-outline-primary" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <i className="bi bi-eye me-1"></i> Preview
                        </a>
                      )}
                      {project.githubUrl && (
                        <a href={project.githubUrl} className="btn btn-outline-dark" target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          <i className="bi bi-github me-1"></i> GitHub
                        </a>
                      )}
                      <button 
                        className="btn btn-outline-success" 
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
          {currentProjects.length === 0 && (
            <div className="col-12 text-center py-5">
              <p>No projects found in this category yet.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default ProjectsList
