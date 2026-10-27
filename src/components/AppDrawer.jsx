import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import './AppDrawer.css'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

function AppDrawer({ isExpanded, setIsExpanded, mobileOpen, closeMobileMenu }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isHomePage = location.pathname === '/'
  const [activeHash, setActiveHash] = useState(location.hash || '#hero')
  const [userName, setUserName] = useState('Sujan Prodhan')

  const handleNavClick = (e, id) => {
    e.preventDefault()
    const hash = `#${id}`
    setActiveHash(hash)
    
    if (!isHomePage) {
      // If not on home page, navigate to home first with hash
      navigate(`/${hash}`)
      // Then scroll after navigation
      setTimeout(() => {
        const element = document.getElementById(id)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    } else {
      // Already on home page, update hash and scroll
      window.history.pushState(null, '', hash)
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    // Close mobile menu after click
    if (closeMobileMenu) {
      closeMobileMenu()
    }
  }

  // Scroll listener to update active state
  useEffect(() => {
    if (!isHomePage) return
    
    const sectionIds = ['hero', 'skills', 'resume', 'projects', 'posts', 'research', 'resources', 'gallery']
    
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100
      
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const section = document.getElementById(sectionIds[i])
        if (section && section.offsetTop <= scrollPosition) {
          const hash = `#${sectionIds[i]}`
          if (activeHash !== hash) {
            setActiveHash(hash)
          }
          break
        }
      }
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isHomePage, activeHash])

  // Fetch user name from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'portfolio', 'cv'), (snapshot) => {
      if (snapshot.exists() && snapshot.data().personalInfo?.name) {
        setUserName(snapshot.data().personalInfo.name)
      }
    })
    return unsubscribe
  }, [])

  // Check URL hash on page load and scroll to corresponding section
  useEffect(() => {
    if (isHomePage && location.hash) {
      setActiveHash(location.hash)
      const id = location.hash.replace('#', '')
      setTimeout(() => {
        const element = document.getElementById(id)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    } else if (isHomePage && !location.hash) {
      setActiveHash('#hero')
    }
  }, [location, isHomePage])

  return (
    <aside 
      id="app-drawer" 
      className={`app-drawer d-flex flex-column ${isExpanded || mobileOpen ? 'expanded' : 'collapsed'} ${mobileOpen ? 'mobile-open' : ''}`}
    >
      <button 
        className="app-drawer-toggle-btn"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <i className={`bi ${isExpanded ? 'bi-x' : 'bi-list'}`}></i>
      </button>

      {/* Mobile close button */}
      <button 
        className="mobile-close-btn"
        onClick={() => mobileOpen && closeMobileMenu()}
        style={{
          display: 'none',
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'none',
          border: 'none',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer'
        }}
      >
        <i className="bi bi-x-lg"></i>
      </button>

      {(isExpanded || mobileOpen) && (
        <div className="social-links text-center mt-2">
          <a href="#" className="social-btn twitter text-white me-2"><i className="bi bi-twitter"></i></a>
          <a href="#" className="social-btn facebook text-white me-2"><i className="bi bi-facebook"></i></a>
          <a href="#" className="social-btn instagram text-white me-2"><i className="bi bi-instagram"></i></a>
          <a href="#" className="social-btn google-plus text-white me-2"><i className="bi bi-skype"></i></a>
          <a href="#" className="social-btn linkedin text-white"><i className="bi bi-linkedin"></i></a>
        </div>
      )}

      {/* User name */}
      {(isExpanded || mobileOpen) && (
        <div className="text-center mt-3 mb-2">
          <h5 style={{ color: 'white', margin: 0 }}>{userName}</h5>
        </div>
      )}

      <nav id="navmenu" className="navmenu mt-2">
        <ul className="list-unstyled">
          <li className="mb-1">
            <a 
              href="#hero" 
              className={`text-white text-decoration-none ${activeHash === '#hero' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'hero')}
            >
              <i className="bi bi-house navicon"></i>{(isExpanded || mobileOpen) && <span className="nav-text">Home</span>}
            </a>
          </li>
          <li className="mb-1">
            <a 
              href="#skills" 
              className={`text-white text-decoration-none ${activeHash === '#skills' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'skills')}
            >
              <i className="bi bi-bar-chart navicon"></i>{(isExpanded || mobileOpen) && <span className="nav-text">Skills</span>}
            </a>
          </li>
          <li className="mb-1">
            <a 
              href="#resume" 
              className={`text-white text-decoration-none ${activeHash === '#resume' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'resume')}
            >
              <i className="bi bi-file-earmark-text navicon"></i>{(isExpanded || mobileOpen) && <span className="nav-text">Resume</span>}
            </a>
          </li>
          <li className="mb-1">
            <a 
              href="#projects" 
              className={`text-white text-decoration-none ${activeHash === '#projects' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'projects')}
            >
              <i className="bi bi-hdd-stack navicon"></i>{(isExpanded || mobileOpen) && <span className="nav-text">Projects</span>}
            </a>
          </li>
          <li className="mb-1">
            <a 
              href="#posts" 
              className={`text-white text-decoration-none ${activeHash === '#posts' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'posts')}
            >
              <i className="bi bi-sticky navicon"></i>{(isExpanded || mobileOpen) && <span className="nav-text">Posts</span>}
            </a>
          </li>
          <li className="mb-1">
            <a 
              href="#research" 
              className={`text-white text-decoration-none ${activeHash === '#research' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'research')}
            >
              <i className="bi bi-flask navicon"></i>{(isExpanded || mobileOpen) && <span className="nav-text">Research</span>}
            </a>
          </li>
          <li className="mb-1">
            <a 
              href="#resources" 
              className={`text-white text-decoration-none ${activeHash === '#resources' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'resources')}
            >
              <i className="bi bi-collection navicon"></i>{(isExpanded || mobileOpen) && <span className="nav-text">Resources</span>}
            </a>
          </li>
          <li className="mb-1">
            <a 
              href="#gallery" 
              className={`text-white text-decoration-none ${activeHash === '#gallery' ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, 'gallery')}
            >
              <i className="bi bi-images navicon"></i>{(isExpanded || mobileOpen) && <span className="nav-text">Image Gallery</span>}
            </a>
          </li>
          <li className="mb-1">
            <Link 
              to="/contact" 
              className={`text-white text-decoration-none ${location.pathname === '/contact' ? 'active' : ''}`}
            >
              <i className="bi bi-envelope navicon"></i>{(isExpanded || mobileOpen) && <span className="nav-text">Contact Me</span>}
            </Link>
          </li>
          <li className="mb-1">
            <Link 
              to="/admin" 
              className={`text-white text-decoration-none ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
            >
              <i className="bi bi-gear navicon"></i>{(isExpanded || mobileOpen) && <span className="nav-text">Admin Panel</span>}
            </Link>
          </li>
          <li className="mb-1">
            <Link 
              to="/pdf-to-image" 
              className={`text-white text-decoration-none ${location.pathname === '/pdf-to-image' || location.pathname === '/pdf-to-webp' ? 'active' : ''}`}
            >
              <i className="bi bi-file-earmark-pdf navicon text-danger"></i>{(isExpanded || mobileOpen) && <span className="nav-text">PDF to Image</span>}
            </Link>
          </li>
          <li className="mb-1">
            <Link 
              to="/image-converter" 
              className={`text-white text-decoration-none ${location.pathname === '/image-converter' ? 'active' : ''}`}
            >
              <i className="bi bi-image navicon"></i>{(isExpanded || mobileOpen) && <span className="nav-text">Image Converter</span>}
            </Link>
          </li>
          <li className="mb-1">
            <Link 
              to="/drive-to-json" 
              className={`text-white text-decoration-none ${location.pathname === '/drive-to-json' ? 'active' : ''}`}
            >
              <i className="bi bi-folder-symlink navicon"></i>{(isExpanded || mobileOpen) && <span className="nav-text">Drive to JSON</span>}
            </Link>
          </li>
          <li className="mb-1">
            <Link 
              to="/sheet-to-json" 
              className={`text-white text-decoration-none ${location.pathname === '/sheet-to-json' ? 'active' : ''}`}
            >
              <i className="bi bi-file-earmark-spreadsheet navicon"></i>{(isExpanded || mobileOpen) && <span className="nav-text">Sheet to JSON</span>}
            </Link>
          </li>
          <li className="mb-1">
            <Link 
              to="/json-to-sheet" 
              className={`text-white text-decoration-none ${location.pathname === '/json-to-sheet' || location.pathname === '/data-converter' ? 'active' : ''}`}
            >
              <i className="bi bi-filetype-json navicon text-warning"></i>{(isExpanded || mobileOpen) && <span className="nav-text">JSON to Sheet</span>}
            </Link>
          </li>
          <li className="mb-1">
            <Link 
              to="/transcription" 
              className={`text-white text-decoration-none ${location.pathname === '/transcription' || location.pathname === '/audio-transcriber' || location.pathname === '/multi-language-transcription' ? 'active' : ''}`}
            >
              <i className="bi bi-soundwave navicon text-info"></i>{(isExpanded || mobileOpen) && <span className="nav-text">Transcription Tool</span>}
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  )
}

export default AppDrawer
