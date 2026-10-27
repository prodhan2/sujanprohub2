import { useState, useRef, useEffect } from 'react'

const ClickSpark = ({
  sparkColor = '#EF4444',
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = 'ease-out',
  extraScale = 1,
  children
}) => {
  const containerRef = useRef(null)
  const [sparks, setSparks] = useState([])

  const handleClick = (e) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const newSparks = Array.from({ length: sparkCount }).map((_, i) => ({
      id: Date.now() + i,
      x,
      y,
      angle: (i / sparkCount) * Math.PI * 2
    }))

    setSparks(prev => [...prev, ...newSparks])
    setTimeout(() => {
      setSparks(prev => prev.filter(spark => !newSparks.find(ns => ns.id === spark.id)))
    }, duration)
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%' }}
      onClick={handleClick}
    >
      {children}
      {sparks.map(spark => (
        <Spark
          key={spark.id}
          x={spark.x}
          y={spark.y}
          angle={spark.angle}
          color={sparkColor}
          size={sparkSize}
          radius={sparkRadius}
          duration={duration}
          easing={easing}
          extraScale={extraScale}
        />
      ))}
    </div>
  )
}

const Spark = ({ x, y, angle, color, size, radius, duration, easing, extraScale }) => {
  const style = {
    position: 'absolute',
    left: x - size / 2,
    top: y - size / 2,
    width: size,
    height: size,
    backgroundColor: color,
    borderRadius: '50%',
    pointerEvents: 'none',
    animation: `spark ${duration}ms ${easing} forwards`,
    transformOrigin: 'center',
    '--tx': `${Math.cos(angle) * radius}px`,
    '--ty': `${Math.sin(angle) * radius}px`,
    '--scale': extraScale
  }

  return <div style={style} />
}

// Add the keyframes to the document
const addKeyframes = () => {
  const existingStyle = document.getElementById('click-spark-keyframes')
  if (existingStyle) return

  const style = document.createElement('style')
  style.id = 'click-spark-keyframes'
  style.textContent = `
    @keyframes spark {
      0% {
        transform: translate(0, 0) scale(var(--scale, 1));
        opacity: 1;
      }
      100% {
        transform: translate(var(--tx), var(--ty)) scale(0);
        opacity: 0;
      }
    }
  `
  document.head.appendChild(style)
}

addKeyframes()

export default ClickSpark
