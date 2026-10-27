import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import Cube from "./Cube";
import "./Gallery3D.css";

export default function Gallery3DPage() {
  const navigate = useNavigate();
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Interactive 3D controls state
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(0.25);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [direction, setDirection] = useState(1); // 1 = clockwise, -1 = counter-clockwise
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [theme, setTheme] = useState('dark');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsOpen, setIsControlsOpen] = useState(true);
  const [dragMode, setDragMode] = useState('doubleClickHold'); // 'doubleClickHold' | 'freeDrag'
  const [isRotatingActive, setIsRotatingActive] = useState(false);
  
  // Lightbox Modal state
  const [lightboxIndex, setLightboxIndex] = useState(null);
  
  const cubeRef = useRef(null);

  // Fetch gallery images from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'gallery'), (snapshot) => {
      const galleryList = snapshot.docs
        .map(doc => doc.data().url)
        .filter(url => url && typeof url === 'string');
      setGallery(galleryList);
      setLoading(false);
    }, (err) => {
      console.warn("Firestore gallery load error:", err);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (lightboxIndex !== null) {
        if (e.key === 'ArrowRight') handleNextLightbox();
        if (e.key === 'ArrowLeft') handlePrevLightbox();
        if (e.key === 'Escape') setLightboxIndex(null);
      } else {
        if (e.key === ' ') {
          e.preventDefault();
          setIsAutoRotating(prev => !prev);
        }
        if (e.key === 'r' || e.key === 'R') {
          handleReset();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, gallery]);

  const handleReset = () => {
    if (cubeRef.current) {
      cubeRef.current.reset();
    }
    setZoomLevel(1.0);
    setDirection(1);
    setAutoRotateSpeed(0.25);
    setIsAutoRotating(true);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleImageClick = (index) => {
    setLightboxIndex(index);
  };

  const handlePrevLightbox = () => {
    setLightboxIndex(prev => (prev > 0 ? prev - 1 : galleryImages.length - 1));
  };

  const handleNextLightbox = () => {
    setLightboxIndex(prev => (prev < galleryImages.length - 1 ? prev + 1 : 0));
  };

  const handleDownloadActiveImage = () => {
    if (lightboxIndex === null) return;
    const currentUrl = galleryImages[lightboxIndex];
    const link = document.createElement('a');
    link.href = currentUrl;
    link.download = `gallery_photo_${lightboxIndex + 1}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fallback images if no images yet in Firestore
  const sampleImages = [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534972195531-a756b1126f24?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&auto=format&fit=crop&q=80'
  ];

  const galleryImages = gallery.length > 0 ? gallery : sampleImages;

  return (
    <div className="gallery3d-viewport">
      {/* Top Navigation Bar */}
      <div className="gallery3d-topbar">
        <button 
          className="gallery3d-glass-btn"
          onClick={() => navigate('/')}
          title="Return to portfolio home"
        >
          <i className="bi bi-arrow-left"></i>
          <span>Back</span>
        </button>

        <div className="gallery3d-title-badge">
          <i className="bi bi-box-seam text-danger"></i>
          <span>3D Gallery</span>
          <span className="badge bg-danger rounded-pill font-monospace" style={{ fontSize: '0.7rem' }}>
            {galleryImages.length}
          </span>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Theme Switcher */}
          <button 
            className="gallery3d-glass-btn"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? "Switch to Light theme" : "Switch to Dark theme"}
          >
            <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-warning' : 'bi-moon-stars-fill text-info'}`}></i>
          </button>

          {/* Fullscreen Mode */}
          <button 
            className="gallery3d-glass-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen mode"}
          >
            <i className={`bi ${isFullscreen ? 'bi-fullscreen-exit' : 'bi-fullscreen'}`}></i>
          </button>
        </div>
      </div>

      {/* 3D Scene Component */}
      <Cube 
        ref={cubeRef} 
        images={galleryImages} 
        autoSpeed={autoRotateSpeed}
        isAutoRotating={isAutoRotating}
        direction={direction}
        zoomLevel={zoomLevel}
        theme={theme}
        dragMode={dragMode}
        onRotateActiveChange={setIsRotatingActive}
        onImageClick={handleImageClick}
      />

      {/* Floating Active Rotation Indicator */}
      {isRotatingActive && (
        <div className="gallery3d-rotating-indicator">
          <i className="bi bi-arrow-repeat spin"></i>
          <span>Holding & Rotating...</span>
        </div>
      )}

      {/* Floating Interaction Hint */}
      <div className="gallery3d-hint">
        <i className={`bi ${dragMode === 'doubleClickHold' ? 'bi-mouse2' : 'bi-arrows-move'}`}></i>
        <span>
          {dragMode === 'doubleClickHold' 
            ? "Double-click & hold to rotate • Click image to zoom" 
            : "Drag to rotate • Click image to zoom"}
        </span>
      </div>

      {/* Left Side Control Panel */}
      <div className={`gallery3d-left-deck ${isControlsOpen ? 'open' : 'collapsed'}`}>
        <div 
          className="left-deck-header" 
          onClick={() => setIsControlsOpen(prev => !prev)}
          title={isControlsOpen ? "Collapse control panel" : "Expand control panel"}
        >
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-sliders text-danger"></i>
            {isControlsOpen && <span className="left-deck-title">Controls</span>}
          </div>
          <button type="button" className="left-deck-toggle-btn">
            <i className={`bi ${isControlsOpen ? 'bi-chevron-left' : 'bi-chevron-right'}`}></i>
          </button>
        </div>

        {isControlsOpen && (
          <div className="left-deck-body">
            {/* Play/Pause */}
            <button 
              type="button"
              className={`deck-btn w-100 ${isAutoRotating ? 'active' : ''}`}
              onClick={() => setIsAutoRotating(prev => !prev)}
              title={isAutoRotating ? "Pause auto-rotation" : "Play auto-rotation"}
            >
              <i className={`bi ${isAutoRotating ? 'bi-pause-fill' : 'bi-play-fill'}`}></i>
              <span>{isAutoRotating ? 'Pause' : 'Play'}</span>
            </button>

            {/* Direction Toggle */}
            <button 
              type="button"
              className="deck-btn w-100"
              onClick={() => setDirection(d => -d)}
              title="Toggle Rotation Direction"
            >
              <i className={`bi ${direction > 0 ? 'bi-arrow-clockwise' : 'bi-arrow-counterclockwise'}`}></i>
              <span>{direction > 0 ? 'Clockwise' : 'Counter'}</span>
            </button>

            {/* Gesture Mode Toggle */}
            <button 
              type="button"
              className={`deck-btn w-100 ${dragMode === 'doubleClickHold' ? 'active' : ''}`}
              onClick={() => setDragMode(m => m === 'doubleClickHold' ? 'freeDrag' : 'doubleClickHold')}
              title={dragMode === 'doubleClickHold' ? "Mode: Double-Click & Hold (Click to switch to Free Drag)" : "Mode: Free Drag (Click to switch to Double-Click & Hold)"}
            >
              <i className={`bi ${dragMode === 'doubleClickHold' ? 'bi-mouse2' : 'bi-arrows-move'}`}></i>
              <span>{dragMode === 'doubleClickHold' ? '2x Click Hold' : 'Free Drag'}</span>
            </button>

            {/* Speed Slider */}
            <div className="deck-control-group">
              <div className="d-flex justify-content-between align-items-center w-100">
                <label htmlFor="speed-range">
                  <i className="bi bi-speedometer2"></i> Speed
                </label>
                <span className="font-monospace small text-white">
                  {autoRotateSpeed.toFixed(2)}x
                </span>
              </div>
              <input
                id="speed-range"
                type="range"
                className="deck-slider"
                min="0.05"
                max="1.2"
                step="0.05"
                value={autoRotateSpeed}
                onChange={(e) => setAutoRotateSpeed(parseFloat(e.target.value))}
              />
            </div>

            {/* Zoom / Distance Slider */}
            <div className="deck-control-group">
              <div className="d-flex justify-content-between align-items-center w-100">
                <label htmlFor="zoom-range">
                  <i className="bi bi-zoom-in"></i> Zoom
                </label>
                <span className="font-monospace small text-white">
                  {Math.round(zoomLevel * 100)}%
                </span>
              </div>
              <input
                id="zoom-range"
                type="range"
                className="deck-slider"
                min="0.75"
                max="1.35"
                step="0.05"
                value={zoomLevel}
                onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              />
            </div>

            {/* Reset Camera */}
            <button 
              type="button"
              className="deck-btn w-100 mt-1"
              onClick={handleReset}
              title="Reset camera and controls"
            >
              <i className="bi bi-arrow-counterclockwise"></i>
              <span>Reset View</span>
            </button>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && (
        <div className="gallery3d-lightbox" onClick={() => setLightboxIndex(null)}>
          <button 
            className="lightbox-close-btn"
            onClick={() => setLightboxIndex(null)}
            title="Close Lightbox (Esc)"
          >
            <i className="bi bi-x-lg"></i>
          </button>

          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img 
              src={galleryImages[lightboxIndex]} 
              alt={`Photo ${lightboxIndex + 1}`} 
              className="lightbox-img"
            />

            <div className="lightbox-controls">
              <button 
                className="lightbox-nav-btn"
                onClick={handlePrevLightbox}
                title="Previous photo (Left Arrow)"
              >
                <i className="bi bi-chevron-left"></i>
              </button>

              <span className="badge bg-dark border border-secondary px-3 py-2 rounded-pill font-monospace">
                {lightboxIndex + 1} / {galleryImages.length}
              </span>

              <button 
                className="lightbox-nav-btn"
                onClick={handleNextLightbox}
                title="Next photo (Right Arrow)"
              >
                <i className="bi bi-chevron-right"></i>
              </button>

              <button 
                className="lightbox-nav-btn"
                onClick={handleDownloadActiveImage}
                title="Open / Download photo"
              >
                <i className="bi bi-download"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
