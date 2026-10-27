import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './FloatingAIBtn.css'

function FloatingAIBtn() {
  const location = useLocation()
  const navigate = useNavigate()
  const [position, setPosition] = useState(() => {
    const isMobile = window.innerWidth <= 768
    return {
      x: window.innerWidth - (isMobile ? 68 : 240),
      y: 20
    }
  })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef(null)
  const offsetRef = useRef({ x: 0, y: 0 })

  const handleMouseDown = (e) => {
    setIsDragging(true)
    offsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    }
  }

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      const touch = e.touches[0]
      offsetRef.current = {
        x: touch.clientX - position.x,
        y: touch.clientY - position.y
      }
    }
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    const isMobile = window.innerWidth <= 768
    const buttonWidth = isMobile ? 48 : 240
    const buttonHeight = isMobile ? 48 : 60
    let newX = e.clientX - offsetRef.current.x
    let newY = e.clientY - offsetRef.current.y
    
    // Keep button within window bounds
    newX = Math.max(0, Math.min(newX, window.innerWidth - buttonWidth))
    newY = Math.max(0, Math.min(newY, window.innerHeight - buttonHeight))
    
    setPosition({ x: newX, y: newY })
  }

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return
    const isMobile = window.innerWidth <= 768
    const buttonWidth = isMobile ? 48 : 240
    const buttonHeight = isMobile ? 48 : 60
    const touch = e.touches[0]
    let newX = touch.clientX - offsetRef.current.x
    let newY = touch.clientY - offsetRef.current.y
    
    // Keep button within window bounds
    newX = Math.max(0, Math.min(newX, window.innerWidth - buttonWidth))
    newY = Math.max(0, Math.min(newY, window.innerHeight - buttonHeight))
    
    setPosition({ x: newX, y: newY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleTouchMove)
      window.addEventListener('touchend', handleTouchEnd)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, position])

  const handleClick = (e) => {
    if (!isDragging) {
      navigate('/chatbot')
    }
  }

  if (location.pathname === '/chatbot') {
    return null
  }

  return (
    <div
      ref={dragRef}
      className={`floating-ai-btn ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'pointer'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
    >
      <div className="ai-btn-icon">
        <i className="bi bi-robot"></i>
      </div>
      <span className="ai-btn-text">Prodhan AI</span>
    </div>
  )
}

export default FloatingAIBtn
