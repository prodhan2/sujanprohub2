import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom'
import './App.css'
import AppDrawer from './components/AppDrawer'
import MobileAppBar from './components/MobileAppBar'
import Hero from './components/Hero'
import Skills from './components/Skills'
import Resume from './components/Resume'
import Projects from './components/Projects'
import ProjectsList from './components/ProjectsList'
import Posts from './components/Posts'
import Research from './components/Research'
import Resources from './components/Resources'
import Gallery from './components/Gallery'
import Gallery3DPage from './components/Gallery3DPage'
import AdminPanel from './components/AdminPanel'
import Contact from './components/Contact'
import ClickSpark from './components/ClickSpark'
import FloatingAIBtn from './components/FloatingAIBtn'
import ProdhanAIFullPage from './components/ProdhanAIFullPage'
import FloatingBottomNav from './components/FloatingBottomNav'
import AdminLogin from './components/AdminLogin'
import ProtectedRoute from './components/ProtectedRoute'
import ImageConverter from './components/ImageConverter'
import DriveToJson from './components/DriveToJson'
import SheetToJson from './components/SheetToJson'
import UniversalDataConverter from './components/UniversalDataConverter'
import ApiSheetJson from './components/ApiSheetJson'
import PdfToWebp from './components/PdfToWebp'
import { PdfToolsProvider } from './context/PdfToolsContext'
import PdfBackgroundToast from './components/PdfBackgroundToast'
import ReactMarkdown from 'react-markdown'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const fetchPost = async () => {
      try {
        console.log('Fetching post with ID:', id)
        const docRef = doc(db, 'posts', id)
        const docSnap = await getDoc(docRef)
        console.log('Doc snapshot exists:', docSnap.exists())
        if (docSnap.exists()) {
          const postData = { id: docSnap.id, ...docSnap.data() }
          console.log('Post data:', postData)
          setPost(postData)
          
          // Update page title
          document.title = `${postData.title} | Sujan Prodhan`
          
          // Update meta tags for social sharing
          updateMetaTag('og:title', postData.title)
          updateMetaTag('og:description', postData.description || 'Check out this post!')
          updateMetaTag('og:url', window.location.href)
          if (postData.imageUrl) {
            updateMetaTag('og:image', postData.imageUrl)
          }
          
          updateMetaTag('twitter:title', postData.title)
          updateMetaTag('twitter:description', postData.description || 'Check out this post!')
          if (postData.imageUrl) {
            updateMetaTag('twitter:image', postData.imageUrl)
          }
        } else {
          setError('Post not found')
        }
      } catch (err) {
        console.error('Error fetching post:', err)
        setError('Failed to load post')
      } finally {
        setLoading(false)
      }
    }
    fetchPost()
    
    // Cleanup: reset meta tags when component unmounts
    return () => {
      document.title = 'Sujan Prodhan Portfolio'
      updateMetaTag('og:title', 'Sujan Prodhan Portfolio')
      updateMetaTag('og:description', 'Portfolio of Sujan Prodhan - Computer Science and Engineering student at University of Rajshahi')
      updateMetaTag('og:image', 'https://i.postimg.cc/Jhym7G37/photo-2024-04-28-06-27-27-modified.png')
      updateMetaTag('twitter:title', 'Sujan Prodhan Portfolio')
      updateMetaTag('twitter:description', 'Portfolio of Sujan Prodhan - Computer Science and Engineering student at University of Rajshahi')
      updateMetaTag('twitter:image', 'https://i.postimg.cc/Jhym7G37/photo-2024-04-28-06-27-27-modified.png')
    }
  }, [id])
  
  const updateMetaTag = (property, content) => {
    let tag = document.querySelector(`meta[property="${property}"]`)
    if (!tag) {
      tag = document.querySelector(`meta[name="${property}"]`)
    }
    if (tag) {
      tag.setAttribute('content', content)
    } else {
      // Create tag if it doesn't exist
      const newTag = document.createElement('meta')
      newTag.setAttribute('property', property)
      newTag.setAttribute('content', content)
      document.head.appendChild(newTag)
    }
  }

  const handleShare = async () => {
    const shareUrl = window.location.href
    const shareData = {
      title: post.title,
      text: post.description || 'Check out this post!',
      url: shareUrl
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareUrl)
        alert('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  const handleImageClick = (index) => {
    setCurrentImageIndex(index)
    setLightboxOpen(true)
  }

  const handleNextImage = () => {
    const images = post.imageUrls || (post.imageUrl ? [post.imageUrl] : [])
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const handlePrevImage = () => {
    const images = post.imageUrls || (post.imageUrl ? [post.imageUrl] : [])
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const handleKeyDown = (e) => {
    if (!lightboxOpen) return
    if (e.key === 'ArrowRight') handleNextImage()
    if (e.key === 'ArrowLeft') handlePrevImage()
    if (e.key === 'Escape') setLightboxOpen(false)
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen])

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="container py-5 text-center">
        <p className="text-muted">{error || 'Post not found'}</p>
        <button className="btn btn-primary mt-3" onClick={() => navigate('/')}>
          Go Home
        </button>
      </div>
    )
  }

  const images = post.imageUrls || (post.imageUrl ? [post.imageUrl] : [])

  return (
    <div className="container py-5" style={{ background: '#ffffff', minHeight: '100vh' }}>
      {/* Header with back button */}
      <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
        <button 
          className="btn btn-outline-secondary btn-sm me-3" 
          onClick={() => navigate(-1)}
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
        >
          <i className="bi bi-arrow-left me-1"></i>Back
        </button>
        <h6 className="mb-0 text-muted">Post Details</h6>
      </div>
      
      <article>
        {/* Image Grid */}
        {images.length > 0 && (
          <div className="mb-4">
            {images.length === 1 ? (
              <img
                src={images[0]}
                alt={post.title}
                className="img-fluid rounded w-100"
                style={{ maxHeight: '500px', objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => handleImageClick(0)}
              />
            ) : (
              <div className="row g-2">
                {images.map((imageUrl, index) => (
                  <div key={index} className="col-6 col-md-4">
                    <img
                      src={imageUrl}
                      alt={`${post.title} ${index + 1}`}
                      className="img-fluid rounded w-100"
                      style={{ 
                        height: '200px', 
                        objectFit: 'cover', 
                        cursor: 'pointer',
                        transition: 'transform 0.3s ease'
                      }}
                      onClick={() => handleImageClick(index)}
                      onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                      onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="mb-0">{post.title}</h1>
          <button
            className="btn btn-outline-primary"
            onClick={handleShare}
            title="Share this post"
          >
            <i className="bi bi-share-fill me-2"></i>Share
          </button>
        </div>
        {post.description && (
          <div className="mb-4">
            <p className="lead">{post.description}</p>
          </div>
        )}
        {post.content && (
          <div className="mb-4">
            {post.content.split('\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        )}
        {post.url && (
          <a href={post.url} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
            <i className="bi bi-book me-2"></i>Read More
          </a>
        )}
      </article>

      {/* Lightbox Modal */}
      {lightboxOpen && images.length > 0 && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.9)', 
            zIndex: 9999,
            cursor: 'zoom-out'
          }}
          onClick={() => setLightboxOpen(false)}
        >
          <button 
            className="position-absolute top-0 end-0 m-3 btn btn-close btn-close-white"
            onClick={() => setLightboxOpen(false)}
            style={{ zIndex: 10001 }}
          />
          
          {images.length > 1 && (
            <>
              <button
                className="position-absolute start-0 top-50 translate-middle-y btn btn-dark btn-lg rounded-circle mx-3"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePrevImage()
                }}
                style={{ zIndex: 10001 }}
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              <button
                className="position-absolute end-0 top-50 translate-middle-y btn btn-dark btn-lg rounded-circle mx-3"
                onClick={(e) => {
                  e.stopPropagation()
                  handleNextImage()
                }}
                style={{ zIndex: 10001 }}
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </>
          )}

          <img
            src={images[currentImageIndex]}
            alt={`${post.title} ${currentImageIndex + 1}`}
            className="img-fluid"
            style={{ 
              maxHeight: '90vh', 
              maxWidth: '90vw',
              objectFit: 'contain',
              cursor: 'zoom-in'
            }}
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <div className="position-absolute bottom-0 start-50 translate-middle-x mb-3 text-white">
              <span className="badge bg-dark">
                {currentImageIndex + 1} / {images.length}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const docRef = doc(db, 'projects', id)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const projectData = { id: docSnap.id, ...docSnap.data() }
          setProject(projectData)
          
          // Update page title
          document.title = `${projectData.title} | Sujan Prodhan`
          
          // Update meta tags for social sharing
          updateMetaTag('og:title', projectData.title)
          updateMetaTag('og:description', projectData.description || 'Check out this project!')
          updateMetaTag('og:url', window.location.href)
          if (projectData.imageUrl) {
            updateMetaTag('og:image', projectData.imageUrl)
          }
          
          updateMetaTag('twitter:title', projectData.title)
          updateMetaTag('twitter:description', projectData.description || 'Check out this project!')
          if (projectData.imageUrl) {
            updateMetaTag('twitter:image', projectData.imageUrl)
          }
        } else {
          setError('Project not found')
        }
      } catch (err) {
        console.error('Error fetching project:', err)
        setError('Failed to load project')
      } finally {
        setLoading(false)
      }
    }
    fetchProject()
    
    // Cleanup: reset meta tags when component unmounts
    return () => {
      document.title = 'Sujan Prodhan Portfolio'
      updateMetaTag('og:title', 'Sujan Prodhan Portfolio')
      updateMetaTag('og:description', 'Portfolio of Sujan Prodhan - Computer Science and Engineering student at University of Rajshahi')
      updateMetaTag('og:image', 'https://i.postimg.cc/Jhym7G37/photo-2024-04-28-06-27-27-modified.png')
      updateMetaTag('twitter:title', 'Sujan Prodhan Portfolio')
      updateMetaTag('twitter:description', 'Portfolio of Sujan Prodhan - Computer Science and Engineering student at University of Rajshahi')
      updateMetaTag('twitter:image', 'https://i.postimg.cc/Jhym7G37/photo-2024-04-28-06-27-27-modified.png')
    }
  }, [id])
  
  const updateMetaTag = (property, content) => {
    let tag = document.querySelector(`meta[property="${property}"]`)
    if (!tag) {
      tag = document.querySelector(`meta[name="${property}"]`)
    }
    if (tag) {
      tag.setAttribute('content', content)
    } else {
      // Create tag if it doesn't exist
      const newTag = document.createElement('meta')
      newTag.setAttribute('property', property)
      newTag.setAttribute('content', content)
      document.head.appendChild(newTag)
    }
  }

  const handleShare = async () => {
    const shareUrl = window.location.href
    const shareData = {
      title: project.title,
      text: project.description || 'Check out this project!',
      url: shareUrl
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(shareUrl)
        alert('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="container py-5 text-center">
        <p className="text-muted">{error || 'Project not found'}</p>
        <button className="btn btn-primary mt-3" onClick={() => navigate('/')}>
          Go Home
        </button>
      </div>
    )
  }

  return (
    <div className="container py-5">
      {/* Header with back button */}
      <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
        <button 
          className="btn btn-outline-secondary btn-sm me-3" 
          onClick={() => navigate(-1)}
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
        >
          <i className="bi bi-arrow-left me-1"></i>Back
        </button>
        <h6 className="mb-0 text-muted">Project Details</h6>
      </div>
      
      <article>
        {project.imageUrl && (
          <img
            src={project.imageUrl}
            alt={project.title}
            className="img-fluid rounded mb-4 w-100"
            style={{ maxHeight: '400px', objectFit: 'cover' }}
          />
        )}
        {!project.imageUrl && project.icon && (
          <div 
            className="text-center mb-4 py-5 rounded"
            style={{ backgroundColor: '#f8f9fa' }}
          >
            <i className={`bi ${project.icon} ${project.iconColor || 'text-primary'}`} style={{ fontSize: '6rem' }}></i>
          </div>
        )}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="mb-0">{project.title}</h1>
          <button
            className="btn btn-outline-primary"
            onClick={handleShare}
            title="Share this project"
          >
            <i className="bi bi-share-fill me-2"></i>Share
          </button>
        </div>
        {project.description && (
          <div className="mb-4">
            <ReactMarkdown className="lead">{project.description}</ReactMarkdown>
          </div>
        )}
        <div className="d-flex flex-wrap gap-3 mb-4">
          {project.previewUrl && (
            <a href={project.previewUrl} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
              <i className="bi bi-eye me-2"></i>Preview
            </a>
          )}
          {project.githubUrl && (
            <a href={project.githubUrl} className="btn btn-outline-dark" target="_blank" rel="noopener noreferrer">
              <i className="bi bi-github me-2"></i>GitHub
            </a>
          )}
        </div>
      </article>
    </div>
  )
}

function ResearchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [research, setResearch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchResearch = async () => {
      try {
        const docRef = doc(db, 'research', id)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const researchData = { id: docSnap.id, ...docSnap.data() }
          setResearch(researchData)
          document.title = `${researchData.title} | Sujan Prodhan`
        } else {
          setError('Research not found')
        }
      } catch (err) {
        console.error('Error fetching research:', err)
        setError('Failed to load research')
      } finally {
        setLoading(false)
      }
    }
    fetchResearch()
    
    return () => {
      document.title = 'Sujan Prodhan Portfolio'
    }
  }, [id])

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (error || !research) {
    return (
      <div className="container py-5 text-center">
        <p className="text-muted">{error || 'Research not found'}</p>
        <button className="btn btn-primary mt-3" onClick={() => navigate('/')}>
          Go Home
        </button>
      </div>
    )
  }

  return (
    <div className="container py-5">
      {/* Header with back button */}
      <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
        <button 
          className="btn btn-outline-secondary btn-sm me-3" 
          onClick={() => navigate(-1)}
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
        >
          <i className="bi bi-arrow-left me-1"></i>Back
        </button>
        <h6 className="mb-0 text-muted">Research Details</h6>
      </div>
      
      <article>
        {research.imageUrl && (
          <img
            src={research.imageUrl}
            alt={research.title}
            className="img-fluid rounded mb-4 w-100"
            style={{ maxHeight: '400px', objectFit: 'cover' }}
          />
        )}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="mb-0">{research.title}</h1>
        </div>
        {research.description && (
          <div className="mb-4">
            <ReactMarkdown className="lead">{research.description}</ReactMarkdown>
          </div>
        )}
        {research.content && (
          <div className="mb-4">
            <ReactMarkdown>{research.content}</ReactMarkdown>
          </div>
        )}
        {research.url && (
          <a href={research.url} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
            <i className="bi bi-book me-2"></i>Read More
          </a>
        )}
      </article>
    </div>
  )
}

function ResourcesDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [resource, setResource] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchResource = async () => {
      try {
        const docRef = doc(db, 'resources', id)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const resourceData = { id: docSnap.id, ...docSnap.data() }
          setResource(resourceData)
          document.title = `${resourceData.title} | Sujan Prodhan`
        } else {
          setError('Resource not found')
        }
      } catch (err) {
        console.error('Error fetching resource:', err)
        setError('Failed to load resource')
      } finally {
        setLoading(false)
      }
    }
    fetchResource()
    
    return () => {
      document.title = 'Sujan Prodhan Portfolio'
    }
  }, [id])

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (error || !resource) {
    return (
      <div className="container py-5 text-center">
        <p className="text-muted">{error || 'Resource not found'}</p>
        <button className="btn btn-primary mt-3" onClick={() => navigate('/')}>
          Go Home
        </button>
      </div>
    )
  }

  return (
    <div className="container py-5">
      {/* Header with back button */}
      <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
        <button 
          className="btn btn-outline-secondary btn-sm me-3" 
          onClick={() => navigate(-1)}
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
        >
          <i className="bi bi-arrow-left me-1"></i>Back
        </button>
        <h6 className="mb-0 text-muted">Resource Details</h6>
      </div>
      
      <article>
        {resource.imageUrl && (
          <img
            src={resource.imageUrl}
            alt={resource.title}
            className="img-fluid rounded mb-4 w-100"
            style={{ maxHeight: '400px', objectFit: 'cover' }}
          />
        )}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="mb-0">{resource.title}</h1>
        </div>
        {resource.description && (
          <div className="mb-4">
            <ReactMarkdown className="lead">{resource.description}</ReactMarkdown>
          </div>
        )}
        {resource.content && (
          <div className="mb-4">
            <ReactMarkdown>{resource.content}</ReactMarkdown>
          </div>
        )}
        {resource.url && (
          <a href={resource.url} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
            <i className="bi bi-book me-2"></i>View Resource
          </a>
        )}
      </article>
    </div>
  )
}

function App() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleMobileMenuClick = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  // Render layout with mobile support
  const renderLayout = (content) => (
    <div className="App" style={{ width: '100%', minHeight: '100vh' }}>
      <MobileAppBar onMenuClick={handleMobileMenuClick} />
      {/* Overlay for mobile drawer */}
      {mobileMenuOpen && (
        <div 
          className="app-drawer-overlay mobile-open"
          onClick={closeMobileMenu}
        />
      )}
      <AppDrawer 
        isExpanded={isExpanded} 
        setIsExpanded={setIsExpanded} 
        mobileOpen={mobileMenuOpen}
        closeMobileMenu={closeMobileMenu}
      />
      <main 
        className={`${isExpanded ? 'main' : 'main collapsed'} main-mobile-padding`}
      >
        {content}
      </main>
    </div>
  )

  return (
    <ClickSpark 
      sparkColor="#F9532D" 
      sparkSize={10} 
      sparkRadius={15} 
      sparkCount={8} 
      duration={400} 
      easing="ease-out" 
      extraScale={1}
    >
      <PdfToolsProvider>
        <Router>
          <FloatingAIBtn />
          <FloatingBottomNav />
          <PdfBackgroundToast />
          <Routes>
            <Route path="/admin">
              <Route index element={<Navigate to="/admin/projects" replace />} />
              <Route path="login" element={<AdminLogin />} />
              <Route path="*" element={
                <ProtectedRoute>
                  {renderLayout(
                    <Routes>
                      <Route path="projects" element={<AdminPanel activeTab="projects" />} />
                      <Route path="skills" element={<AdminPanel activeTab="skills" />} />
                      <Route path="posts" element={<AdminPanel activeTab="posts" />} />
                      <Route path="research" element={<AdminPanel activeTab="research" />} />
                      <Route path="resources" element={<AdminPanel activeTab="resources" />} />
                      <Route path="gallery" element={<AdminPanel activeTab="gallery" />} />
                      <Route path="messages" element={<AdminPanel activeTab="contactMessages" />} />
                      <Route path="cv" element={<AdminPanel activeTab="cv" />} />
                      <Route path="profile" element={<AdminPanel activeTab="profile" />} />
                      <Route path="social-icons" element={<AdminPanel activeTab="socialIcons" />} />
                      <Route path="ai-settings" element={<AdminPanel activeTab="aiSettings" />} />
                    </Routes>
                  )}
                </ProtectedRoute>
              } />
            </Route>
            <Route path="/contact" element={
              renderLayout(<Contact />)
            } />
            <Route path="/post/:id" element={
              renderLayout(<PostDetail />)
            } />
            <Route path="/project/:id" element={
              renderLayout(<ProjectDetail />)
            } />
            <Route path="/research/:id" element={
              renderLayout(<ResearchDetail />)
            } />
            <Route path="/resource/:id" element={
              renderLayout(<ResourcesDetail />)
            } />
            <Route path="/projects/:category" element={
              renderLayout(<ProjectsList />)
            } />
            <Route path="/image-converter" element={
              renderLayout(<ImageConverter />)
            } />
            <Route path="/pdf-to-image" element={
              renderLayout(<PdfToWebp />)
            } />
            <Route path="/pdf-to-webp" element={
              renderLayout(<PdfToWebp />)
            } />
            <Route path="/pdf-tools" element={
              renderLayout(<PdfToWebp />)
            } />
            <Route path="/drive-to-json" element={
              renderLayout(<DriveToJson />)
            } />
            <Route path="/sheet-to-json" element={
              renderLayout(<SheetToJson />)
            } />
            <Route path="/json-to-sheet" element={
              renderLayout(<UniversalDataConverter />)
            } />
            <Route path="/data-converter" element={
              renderLayout(<UniversalDataConverter />)
            } />
            <Route path="/api/sheet-json" element={<ApiSheetJson />} />
            <Route path="/chatbot" element={<ProdhanAIFullPage />} />
            <Route path="/gallery-3d" element={<Gallery3DPage />} />
            <Route path="/" element={
              renderLayout(
                <>
                  <Hero />
                  <Skills />
                  <Resume />
                  <Projects />
                  <Posts />
                  <Research />
                  <Resources />
                  <Gallery />
                </>
              )
            } />
          </Routes>
        </Router>
      </PdfToolsProvider>
    </ClickSpark>
  )
}

export default App
