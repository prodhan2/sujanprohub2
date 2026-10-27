import { useState, useEffect, useRef } from 'react'
import './CircleProfile.css'
import { db } from '../firebase'
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore'

function CircleProfile() {
  const [orbitRadius, setOrbitRadius] = useState(200)
  const [rotationAngle, setRotationAngle] = useState(0)
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [socialIcons, setSocialIcons] = useState([])
  const [profileImageLoading, setProfileImageLoading] = useState(true)
  const [iconsLoading, setIconsLoading] = useState(true)
  const [iconLoadingStates, setIconLoadingStates] = useState({})
  const [isDragging, setIsDragging] = useState(false)
  const dragState = useRef({
    startAngle: 0,
    startRotation: 0,
    lastAngle: 0,
    lastTime: Date.now(),
    velocity: 0
  })
  const containerRef = useRef(null)

  // Calculate angle from center of container to mouse position
  const getAngleFromMouse = (e) => {
    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    let clientX, clientY

    // Handle both mouse and touch events
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const dx = clientX - centerX
    const dy = clientY - centerY
    return Math.atan2(dy, dx)
  }

  // Handle drag start
  const handleDragStart = (e) => {
    e.preventDefault()
    setIsDragging(true)
    const angle = getAngleFromMouse(e)
    dragState.current.startAngle = angle
    dragState.current.startRotation = rotationAngle
    dragState.current.lastAngle = angle
    dragState.current.lastTime = Date.now()
    dragState.current.velocity = 0
  }

  // Handle drag move
  const handleDragMove = (e) => {
    if (!isDragging) return
    e.preventDefault()

    const currentAngle = getAngleFromMouse(e)
    const deltaAngle = currentAngle - dragState.current.lastAngle
    const now = Date.now()
    const deltaTime = now - dragState.current.lastTime

    // Calculate velocity for inertia
    if (deltaTime > 0) {
      dragState.current.velocity = deltaAngle / (deltaTime / 16) // Normalize to ~60fps
    }

    setRotationAngle(prev => prev + deltaAngle)
    
    dragState.current.lastAngle = currentAngle
    dragState.current.lastTime = now
  }

  // Handle drag end with inertia
  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // Inertia effect after drag
  useEffect(() => {
    if (isDragging) return
    
    let animationId
    const applyInertia = () => {
      const { velocity } = dragState.current
      if (Math.abs(velocity) > 0.0001) {
        setRotationAngle(prev => prev + velocity)
        dragState.current.velocity *= 0.98 // Friction
        animationId = requestAnimationFrame(applyInertia)
      }
    }
    
    animationId = requestAnimationFrame(applyInertia)
    return () => cancelAnimationFrame(animationId)
  }, [isDragging])

  // Calculate icon positions using trigonometry with current rotation
  const getIconPosition = (index) => {
    const baseAngle = (index / socialIcons.length) * 2 * Math.PI - Math.PI / 2
    const angle = baseAngle + rotationAngle
    const x = Math.cos(angle) * orbitRadius
    const y = Math.sin(angle) * orbitRadius
    return { left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }
  }

  // Responsive orbit radius
  useEffect(() => {
    const updateRadius = () => {
      if (window.innerWidth < 576) {
        setOrbitRadius(120)
      } else if (window.innerWidth < 768) {
        setOrbitRadius(150)
      } else if (window.innerWidth < 992) {
        setOrbitRadius(180)
      } else {
        setOrbitRadius(200)
      }
    }
    updateRadius()
    window.addEventListener('resize', updateRadius)
    return () => window.removeEventListener('resize', updateRadius)
  }, [])

  // Auto-rotate the icons (only when not dragging)
  useEffect(() => {
    if (isDragging) return
    
    const interval = setInterval(() => {
      setRotationAngle(prev => prev + 0.005) // Slower auto-rotate
    }, 16) // ~60fps
    return () => clearInterval(interval)
  }, [isDragging])

  // Listen for profile image from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'portfolio', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const config = snapshot.data()
        setProfileImageUrl(config.profileImageUrl || '')
      }
      setProfileImageLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Listen for social icons from Firestore
  useEffect(() => {
    const q = query(collection(db, 'socialIcons'), orderBy('createdAt'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const icons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setSocialIcons(icons)
      // Initialize loading states
      const loadingStates = {}
      icons.forEach(icon => {
        loadingStates[icon.id] = true
      })
      setIconLoadingStates(loadingStates)
      setIconsLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // Image loading helper
  const handleIconLoad = (iconId) => {
    setIconLoadingStates(prev => ({
      ...prev,
      [iconId]: false
    }))
  }

  return (
    <div 
      className="circle-profile-container" 
      ref={containerRef}
      onMouseDown={handleDragStart}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchStart={handleDragStart}
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Orbit circle */}
      <div className="orbit-circle" style={{ width: orbitRadius * 2, height: orbitRadius * 2 }} />

      {/* Icons */}
      {!iconsLoading && socialIcons.map((icon, index) => {
        const pos = getIconPosition(index)
        const IconWrapper = icon.url ? 'a' : 'div'
        const wrapperProps = icon.url ? {
          href: icon.url,
          target: '_blank',
          rel: 'noopener noreferrer'
        } : {}

        return (
          <IconWrapper
            key={icon.id}
            {...wrapperProps}
          >
            <div
              className="social-icon-wrapper"
              style={{
                left: pos.left,
                top: pos.top,
                animationDelay: `-${index * 0.75}s`
              }}
            >
              {iconLoadingStates[icon.id] && (
                <div className="icon-shimmer shimmer" />
              )}
              <img 
                src={icon.image} 
                alt={icon.name} 
                onLoad={() => handleIconLoad(icon.id)}
                style={{ 
                  display: iconLoadingStates[icon.id] ? 'none' : 'block',
                  width: '50%',
                  height: '50%',
                  objectFit: 'contain'
                }}
              />
            </div>
          </IconWrapper>
        )
      })}

      {/* Center profile image - with shimmer */}
      <div className="profile-image-wrapper">
        {profileImageLoading && (
          <div className="profile-shimmer shimmer" />
        )}
        {!profileImageLoading && profileImageUrl && (
          <img 
            src={profileImageUrl} 
            alt="Profile" 
            onLoad={() => setProfileImageLoading(false)}
          />
        )}
      </div>

      {/* Shimmers for loading state (before Firestore data arrives) */}
      {iconsLoading && (
        // Show placeholder shimmer icons when loading from Firestore
        Array.from({ length: 5 }).map((_, index) => {
          const baseAngle = (index / 5) * 2 * Math.PI - Math.PI / 2
          const x = Math.cos(baseAngle) * orbitRadius
          const y = Math.sin(baseAngle) * orbitRadius
          const pos = { left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }
          
          return (
            <div 
              key={`placeholder-${index}`}
              className="social-icon-wrapper"
              style={{
                left: pos.left,
                top: pos.top,
                animationDelay: `-${index * 0.75}s`
              }}
            >
              <div className="icon-shimmer shimmer" />
            </div>
          )
        })
      )}
      {profileImageLoading && (
        <div className="profile-image-wrapper">
          <div className="profile-shimmer shimmer" />
        </div>
      )}
    </div>
  )
}

export default CircleProfile
