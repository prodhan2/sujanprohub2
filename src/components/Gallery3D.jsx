import { useEffect, useRef, useState } from 'react'
import './Gallery3D.css'

function Gallery3D({ images, onClose }) {
  const boxRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [touchMode, setTouchMode] = useState(false)
  const [controlModeEnabled, setControlModeEnabled] = useState(false)
  const [isAutoRotating, setIsAutoRotating] = useState(true)
  const lastClickTimeRef = useRef(0)
  const rotXRef = useRef(0)
  const rotYRef = useRef(0)
  const lastXRef = useRef(0)
  const lastYRef = useRef(0)
  const autoSpeed = 0.2

  useEffect(() => {
    const box = boxRef.current
    if (!box) return

    let animationId

    const animate = () => {
      if (!isDragging && !touchMode && isAutoRotating) {
        rotYRef.current += autoSpeed
      }
      box.style.transform = `rotateX(${rotXRef.current}deg) rotateY(${rotYRef.current}deg)`
      animationId = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animationId)
  }, [isDragging, touchMode, isAutoRotating])

  const handleDoubleClick = () => {
    setControlModeEnabled(!controlModeEnabled)
  }

  const handleMouseDown = (e) => {
    const now = Date.now()
    const timeSinceLastClick = now - lastClickTimeRef.current
    
    if (timeSinceLastClick < 300) {
      handleDoubleClick()
    }
    lastClickTimeRef.current = now
    
    if (controlModeEnabled) {
      setIsDragging(true)
      setIsAutoRotating(false)
      lastXRef.current = e.clientX
      lastYRef.current = e.clientY
    }
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
      setIsAutoRotating(true)
    }
  }

  const handleMouseMove = (e) => {
    if (!isDragging || !controlModeEnabled) return
    const dx = e.clientX - lastXRef.current
    const dy = e.clientY - lastYRef.current
    rotYRef.current += dx * 0.5
    rotXRef.current -= dy * 0.5
    lastXRef.current = e.clientX
    lastYRef.current = e.clientY
  }

  const handleTouchStart = (e) => {
    const now = Date.now()
    const timeSinceLastTap = now - lastClickTimeRef.current
    
    if (timeSinceLastTap < 300) {
      handleDoubleClick()
    }
    lastClickTimeRef.current = now
    
    if (controlModeEnabled && e.touches.length === 2) {
      setTouchMode(true)
      setIsAutoRotating(false)
      lastXRef.current = (e.touches[0].clientX + e.touches[1].clientX) / 2
      lastYRef.current = (e.touches[0].clientY + e.touches[1].clientY) / 2
    }
  }

  const handleTouchEnd = () => {
    if (touchMode) {
      setTouchMode(false)
      setIsAutoRotating(true)
    }
  }

  const handleTouchMove = (e) => {
    if (!touchMode || !controlModeEnabled || e.touches.length !== 2) return
    const x = (e.touches[0].clientX + e.touches[1].clientX) / 2
    const y = (e.touches[0].clientY + e.touches[1].clientY) / 2
    const dx = x - lastXRef.current
    const dy = y - lastYRef.current
    rotYRef.current += dx * 0.5
    rotXRef.current -= dy * 0.5
    lastXRef.current = x
    lastYRef.current = y
  }

  const galleryImages = images.length > 0 ? images : Array(10).fill('https://i.postimg.cc/R0L9b1Lr/image.png')

  return (
    <div className="gallery3d-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <button className="gallery3d-close" onClick={onClose}>
        <i className="bi bi-x-lg"></i>
      </button>
      <div className="gallery3d-container">
        <div
          ref={boxRef}
          className="box"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          {galleryImages.map((img, index) => (
            <span key={index} style={{ '--i': index + 1 }}>
              <img src={img} alt={`3D Gallery ${index + 1}`} />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Gallery3D
