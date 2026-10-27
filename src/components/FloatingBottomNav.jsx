import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import './FloatingBottomNav.css'

function FloatingBottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const isHomePage = location.pathname === '/'
  const [activeHash, setActiveHash] = useState(location.hash || '#hero')
  
  // Dragging & menu state
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: null, y: null })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const navRef = useRef(null)
  const clickStart = useRef({ x: 0, y: 0, time: 0 })

  const handleNavClick = (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    const hash = `#${id}`
    setActiveHash(hash)
    setIsOpen(false)
    
    if (!isHomePage) {
      navigate(`/${hash}`)
      setTimeout(() => {
        const element = document.getElementById(id)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 150)
    } else {
      window.history.pushState(null, '', hash)
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  const handleLinkMouseDown = (e) => {
    clickStart.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now()
    }
  }

  const handleLinkTouchStart = (e) => {
    const touch = e.touches[0]
    clickStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }
  }

  useEffect(() => {
    if (!isHomePage) return
    
    const sectionIds = ['hero', 'skills', 'resume', 'projects', 'contact']
    
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

  useEffect(() => {
    if (isHomePage && location.hash) {
      setActiveHash(location.hash)
    } else if (isHomePage && !location.hash) {
      setActiveHash('#hero')
    }
  }, [location, isHomePage])

  // Drag handlers
  const onMouseDown = (e) => {
    // Always allow drag, even on links - we'll handle click vs drag later
    setIsDragging(true)
    const rect = navRef.current.getBoundingClientRect()
    const currentX = position.x !== null ? position.x : rect.left + rect.width / 2
    const currentY = position.y !== null ? position.y : rect.top + rect.height / 2

    setDragOffset({
      x: e.clientX - currentX,
      y: e.clientY - currentY
    })
  }

  const onTouchStart = (e) => {
    setIsDragging(true)
    const touch = e.touches[0]
    const rect = navRef.current.getBoundingClientRect()
    const currentX = position.x !== null ? position.x : rect.left + rect.width / 2
    const currentY = position.y !== null ? position.y : rect.top + rect.height / 2

    setDragOffset({
      x: touch.clientX - currentX,
      y: touch.clientY - currentY
    })
  }

  const onMouseMove = (e) => {
    if (!isDragging) return

    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y
    
    // Keep within viewport bounds
    const rect = navRef.current.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width / 2
    const minX = rect.width / 2
    const maxY = window.innerHeight - rect.height / 2
    const minY = rect.height / 2

    setPosition({
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY))
    })
  }

  const onTouchMove = (e) => {
    if (!isDragging) return
    e.preventDefault() // Prevent scrolling while dragging

    const touch = e.touches[0]
    const newX = touch.clientX - dragOffset.x
    const newY = touch.clientY - dragOffset.y
    
    // Keep within viewport bounds
    const rect = navRef.current.getBoundingClientRect()
    const maxX = window.innerWidth - rect.width / 2
    const minX = rect.width / 2
    const maxY = window.innerHeight - rect.height / 2
    const minY = rect.height / 2

    setPosition({
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY))
    })
  }

  const onMouseUp = () => {
    setIsDragging(false)
  }

  const onTouchEnd = () => {
    setIsDragging(false)
  }

  // Add global event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      window.addEventListener('touchmove', onTouchMove, { passive: false })
      window.addEventListener('touchend', onTouchEnd)
      window.addEventListener('touchcancel', onTouchEnd)
    }
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [isDragging, dragOffset, position])

  const navItems = [
    { type: 'hash', id: 'hero', label: 'Home', icon: 'bi-house' },
    { type: 'hash', id: 'skills', label: 'Skills', icon: 'bi-bar-chart' },
    { type: 'hash', id: 'resume', label: 'Resume', icon: 'bi-file-earmark-text' },
    { type: 'hash', id: 'projects', label: 'Projects', icon: 'bi-hdd-stack' },
    { type: 'hash', id: 'posts', label: 'Posts', icon: 'bi-sticky' },
    { type: 'hash', id: 'research', label: 'Research', icon: 'bi-flask' },
    { type: 'hash', id: 'resources', label: 'Resources', icon: 'bi-collection' },
    { type: 'hash', id: 'gallery', label: 'Gallery', icon: 'bi-images' },
    { type: 'route', path: '/contact', label: 'Contact', icon: 'bi-envelope' },
    { type: 'route', path: '/pdf-to-image', label: 'PDF to Image', icon: 'bi-file-earmark-pdf' },
    { type: 'route', path: '/image-converter', label: 'Converter', icon: 'bi-image' },
    { type: 'route', path: '/drive-to-json', label: 'Drive JSON', icon: 'bi-folder-symlink' },
    { type: 'route', path: '/sheet-to-json', label: 'Sheet JSON', icon: 'bi-file-earmark-spreadsheet' },
    { type: 'route', path: '/admin', label: 'Admin', icon: 'bi-gear' }
  ]

  // Close grid when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  const handleButtonClick = (e) => {
    const timeDiff = Date.now() - clickStart.current.time
    const dist = Math.sqrt(
      Math.pow(e.clientX - clickStart.current.x, 2) + 
      Math.pow(e.clientY - clickStart.current.y, 2)
    )
    if (isDragging || dist > 10 || timeDiff > 300) {
      e.preventDefault()
      return
    }
    setIsOpen(prev => !prev)
  }

  // Calculate style based on position
  const navStyle = {}
  if (position.x !== null && position.y !== null) {
    navStyle.left = `${position.x}px`
    navStyle.top = `${position.y}px`
    navStyle.bottom = 'auto'
    navStyle.transform = 'translate(-50%, -50%)'
  }

  return (
    <div 
      ref={navRef}
      className="floating-bottom-nav"
      style={navStyle}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* Expanded Grid Table Modal */}
      {isOpen && (
        <div 
          className="floating-nav-grid-modal"
          onMouseDown={(e) => {
            e.stopPropagation()
            setIsDragging(false)
          }}
          onTouchStart={(e) => {
            e.stopPropagation()
            setIsDragging(false)
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="floating-nav-grid-header">
            <h6>
              <i className="bi bi-compass text-danger"></i> Navigation Menu
            </h6>
            <button 
              className="floating-nav-grid-close"
              onClick={() => setIsOpen(false)}
              title="Close menu"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className="floating-nav-grid">
            {navItems.map((item, idx) => {
              if (item.type === 'hash') {
                const isActive = isHomePage && activeHash === `#${item.id}`
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`floating-nav-grid-item ${isActive ? 'active' : ''}`}
                    onClick={(e) => handleNavClick(e, item.id)}
                  >
                    <i className={`bi ${item.icon} floating-nav-grid-icon`}></i>
                    <span className="floating-nav-grid-label">{item.label}</span>
                  </button>
                )
              } else {
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={idx}
                    to={item.path}
                    className={`floating-nav-grid-item ${isActive ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsOpen(false)
                    }}
                  >
                    <i className={`bi ${item.icon} floating-nav-grid-icon`}></i>
                    <span className="floating-nav-grid-label">{item.label}</span>
                  </Link>
                )
              }
            })}
          </div>
        </div>
      )}

      {/* Ring Wave Animation Button */}
      <div className="ring-wave-btn-wrapper">
        <span className="ring-wave-ring"></span>
        <span className="ring-wave-ring delay-1"></span>
        <span className="ring-wave-ring delay-2"></span>

        <button
          type="button"
          className={`ring-wave-btn ${isOpen ? 'open' : ''}`}
          onMouseDown={handleLinkMouseDown}
          onTouchStart={handleLinkTouchStart}
          onClick={handleButtonClick}
          title={isOpen ? "Close Navigation" : "Quick Navigation"}
          aria-label="Toggle navigation menu"
        >
          <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-grid-fill'}`}></i>
        </button>
      </div>
    </div>
  )
}

export default FloatingBottomNav
