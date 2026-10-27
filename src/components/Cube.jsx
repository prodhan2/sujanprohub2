import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import "./Cube.css";

const Cube = forwardRef(({ 
  images = [], 
  autoSpeed = 0.25, 
  isAutoRotating = true, 
  direction = 1, // 1 for clockwise, -1 for counter-clockwise
  zoomLevel = 1.0, 
  theme = 'dark',
  dragMode = 'doubleClickHold', // 'doubleClickHold' or 'freeDrag'
  onRotateActiveChange,
  onImageClick 
}, ref) => {
  const boxRef = useRef(null);
  const rotXRef = useRef(-6); // slight tilt downward for dynamic 3D look
  const rotYRef = useRef(0);
  const velXRef = useRef(0);
  const velYRef = useRef(0);
  const isMouseDownRef = useRef(false);
  const isHoldRotatingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const lastClickTimeRef = useRef(0);
  const lastClickPosRef = useRef({ x: 0, y: 0 });
  const lastTouchTimeRef = useRef(0);
  const lastTouchPosRef = useRef({ x: 0, y: 0 });
  const singleClickTimerRef = useRef(null);
  const clickStartRef = useRef({ x: 0, y: 0, time: 0 });
  const animationIdRef = useRef(null);
  const [isRotatingActiveState, setIsRotatingActiveState] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1000);

  // Resize listener to adjust radius dynamically
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Expose imperative controls to parent
  useImperativeHandle(ref, () => ({
    reset: () => {
      rotXRef.current = -6;
      rotYRef.current = 0;
      velXRef.current = 0;
      velYRef.current = 0;
      if (boxRef.current) {
        boxRef.current.style.transform = `rotateX(-6deg) rotateY(0deg)`;
      }
    }
  }));

  const galleryImages = images && images.length > 0 
    ? images 
    : Array(10).fill('https://i.postimg.cc/R0L9b1Lr/image.png');

  const totalImages = galleryImages.length;
  const angleStep = 360 / totalImages;

  // Compute adaptive radius based on screen width & item width
  const isMobile = windowWidth < 768;
  const itemWidth = isMobile ? 135 : 190;
  // Apothem formula: r = w / (2 * tan(pi / n))
  const calculatedRadius = Math.round((itemWidth / 2) / Math.tan(Math.PI / Math.max(totalImages, 5)));
  // Constrain radius within comfortable viewport bounds
  const baseRadius = isMobile 
    ? Math.min(320, Math.max(240, calculatedRadius))
    : Math.min(520, Math.max(360, calculatedRadius));
  const finalRadius = Math.round(baseRadius * zoomLevel);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    /* ---------------- MOUSE CONTROLS (DOUBLE-CLICK & HOLD TO ROTATE) ---------------- */
    const onMouseDown = (e) => {
      // Ignore right click
      if (e.button !== 0) return;

      const now = Date.now();
      const timeSinceLast = now - lastClickTimeRef.current;
      const distFromLast = Math.hypot(e.clientX - lastClickPosRef.current.x, e.clientY - lastClickPosRef.current.y);

      isMouseDownRef.current = true;
      lastXRef.current = e.clientX;
      lastYRef.current = e.clientY;
      clickStartRef.current = { x: e.clientX, y: e.clientY, time: now };
      velXRef.current = 0;
      velYRef.current = 0;

      if (dragMode === 'doubleClickHold') {
        if (timeSinceLast < 400 && distFromLast < 60) {
          // Double-click detected! Hold down to rotate
          isHoldRotatingRef.current = true;
          setIsRotatingActiveState(true);
          onRotateActiveChange?.(true);
          if (singleClickTimerRef.current) {
            clearTimeout(singleClickTimerRef.current);
            singleClickTimerRef.current = null;
          }
          lastClickTimeRef.current = 0;
        } else {
          // 1st click
          isHoldRotatingRef.current = false;
          setIsRotatingActiveState(false);
          lastClickTimeRef.current = now;
          lastClickPosRef.current = { x: e.clientX, y: e.clientY };
        }
      } else {
        // Free drag mode
        isHoldRotatingRef.current = true;
        setIsRotatingActiveState(true);
        onRotateActiveChange?.(true);
      }
    };

    const onMouseMove = (e) => {
      if (!isMouseDownRef.current) return;
      if (!isHoldRotatingRef.current) return;

      const dx = e.clientX - lastXRef.current;
      const dy = e.clientY - lastYRef.current;

      rotYRef.current += dx * 0.45;
      rotXRef.current -= dy * 0.35;

      // Restrict vertical tilt so user doesn't flip upside down
      rotXRef.current = Math.max(-45, Math.min(45, rotXRef.current));

      velYRef.current = dx * 0.25;
      velXRef.current = dy * 0.25;

      lastXRef.current = e.clientX;
      lastYRef.current = e.clientY;
    };

    const onMouseUp = () => {
      isMouseDownRef.current = false;
      if (isHoldRotatingRef.current) {
        isHoldRotatingRef.current = false;
        setIsRotatingActiveState(false);
        onRotateActiveChange?.(false);
      }
    };

    /* ---------------- TOUCH CONTROLS (DOUBLE-TAP OR 2-FINGER TO ROTATE) ---------------- */
    const onTouchStart = (e) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const now = Date.now();
      const timeSinceLast = now - lastTouchTimeRef.current;
      const distFromLast = Math.hypot(touch.clientX - lastTouchPosRef.current.x, touch.clientY - lastTouchPosRef.current.y);

      isMouseDownRef.current = true;
      lastXRef.current = touch.clientX;
      lastYRef.current = touch.clientY;
      clickStartRef.current = { x: touch.clientX, y: touch.clientY, time: now };
      velXRef.current = 0;
      velYRef.current = 0;

      if (dragMode === 'doubleClickHold') {
        if (e.touches.length >= 2 || (timeSinceLast < 450 && distFromLast < 60)) {
          isHoldRotatingRef.current = true;
          setIsRotatingActiveState(true);
          onRotateActiveChange?.(true);
          if (singleClickTimerRef.current) {
            clearTimeout(singleClickTimerRef.current);
            singleClickTimerRef.current = null;
          }
          lastTouchTimeRef.current = 0;
        } else {
          isHoldRotatingRef.current = false;
          setIsRotatingActiveState(false);
          lastTouchTimeRef.current = now;
          lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
        }
      } else {
        isHoldRotatingRef.current = true;
        setIsRotatingActiveState(true);
        onRotateActiveChange?.(true);
      }
    };

    const onTouchMove = (e) => {
      if (!isMouseDownRef.current || e.touches.length === 0) return;
      if (!isHoldRotatingRef.current) return;

      const touch = e.touches[0];
      const dx = touch.clientX - lastXRef.current;
      const dy = touch.clientY - lastYRef.current;

      rotYRef.current += dx * 0.55;
      rotXRef.current -= dy * 0.45;
      rotXRef.current = Math.max(-45, Math.min(45, rotXRef.current));

      velYRef.current = dx * 0.3;
      velXRef.current = dy * 0.3;

      lastXRef.current = touch.clientX;
      lastYRef.current = touch.clientY;
    };

    const onTouchEnd = () => {
      isMouseDownRef.current = false;
      if (isHoldRotatingRef.current) {
        isHoldRotatingRef.current = false;
        setIsRotatingActiveState(false);
        onRotateActiveChange?.(false);
      }
    };

    /* ---------------- ATTACH GLOBAL LISTENERS ---------------- */
    const sceneElem = box.parentElement;
    sceneElem.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    sceneElem.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    /* ---------------- ANIMATION RENDER LOOP ---------------- */
    const animate = () => {
      if (!isMouseDownRef.current || !isHoldRotatingRef.current) {
        // Apply inertia friction
        rotYRef.current += velYRef.current;
        rotXRef.current -= velXRef.current * 0.4;
        rotXRef.current = Math.max(-45, Math.min(45, rotXRef.current));

        velXRef.current *= 0.94;
        velYRef.current *= 0.94;

        // Auto spin when user is not hold-rotating
        if (isAutoRotating) {
          rotYRef.current += (autoSpeed * direction);
        }
      }

      if (boxRef.current) {
        boxRef.current.style.transform = `rotateX(${rotXRef.current}deg) rotateY(${rotYRef.current}deg)`;
      }

      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      sceneElem.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      sceneElem.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);

      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (singleClickTimerRef.current) {
        clearTimeout(singleClickTimerRef.current);
      }
    };
  }, [autoSpeed, isAutoRotating, direction, dragMode, onRotateActiveChange]);

  const handleCardClick = (e, index, imgUrl) => {
    e.stopPropagation();
    if (isHoldRotatingRef.current) return;

    const timeDiff = Date.now() - clickStartRef.current.time;
    const dist = Math.hypot(
      (e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX) || 0) - clickStartRef.current.x,
      (e.clientY || (e.changedTouches && e.changedTouches[0]?.clientY) || 0) - clickStartRef.current.y
    );

    // If it was a clean click without significant drag
    if (dist < 15 && timeDiff < 300) {
      if (dragMode === 'doubleClickHold') {
        if (singleClickTimerRef.current) {
          clearTimeout(singleClickTimerRef.current);
        }
        singleClickTimerRef.current = setTimeout(() => {
          if (onImageClick && !isHoldRotatingRef.current) {
            onImageClick(index, imgUrl);
          }
        }, 260);
      } else {
        if (onImageClick) {
          onImageClick(index, imgUrl);
        }
      }
    }
  };

  return (
    <div className={`scene theme-${theme}`}>
      {/* 3D Floor Grid */}
      <div className="scene-grid-floor"></div>

      {/* 3D Box Carousel */}
      <div className={`box ${isRotatingActiveState ? 'dragging holding-rotate' : ''}`} ref={boxRef}>
        {/* Center Hologram Badge */}
        <div className="center-hologram-badge">
          <h2 className="center-hologram-text">Sujan Prodhan</h2>
          <span className="center-hologram-sub">Portfolio 3D Gallery</span>
        </div>

        {/* Dynamic 3D Cards */}
        {galleryImages.map((img, i) => {
          const cardAngle = i * angleStep;
          return (
            <span 
              key={i} 
              style={{ 
                transform: `rotateY(${cardAngle}deg) translateZ(${finalRadius}px)`
              }}
              onClick={(e) => handleCardClick(e, i, img)}
              title="Click to view fullscreen"
            >
              <img src={img} alt={`Gallery ${i + 1}`} loading="lazy" />
            </span>
          );
        })}
      </div>
    </div>
  );
});

export default Cube;
