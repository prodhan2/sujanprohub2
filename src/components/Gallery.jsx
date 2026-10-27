import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import './Gallery.css'

function Gallery() {
  const navigate = useNavigate()
  const [gallery, setGallery] = useState([])

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'gallery'), (snapshot) => {
      const galleryList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setGallery(galleryList)
    })
    return unsubscribe
  }, [])

  return (
    <section id="gallery" className="gallery section py-3 py-md-4">
      <div className="container">
        <div className="section-title text-center mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h2 className="mb-0" style={{ fontSize: '1.75rem' }}>Image Gallery</h2>
          <button 
            className="btn btn-sm btn-outline-danger d-inline-flex align-items-center rounded-pill px-3 shadow-sm fw-bold"
            onClick={() => navigate('/gallery-3d')}
          >
            <i className="bi bi-box-seam me-2 text-danger"></i> Enter 3D View
          </button>
        </div>

        <div className="row g-2 g-md-3">
          {gallery.map((item, index) => (
            <div key={item.id || index} className="col-6 col-md-4 col-lg-3">
              <div 
                className="card h-100 shadow-sm border-0 overflow-hidden"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/gallery-3d')}
                title="View in 3D Carousel"
              >
                <img 
                  src={item.url} 
                  alt={`Gallery ${index + 1}`} 
                  className="card-img-top"
                  style={{ height: '160px', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />
              </div>
            </div>
          ))}
          {gallery.length === 0 && (
            <div className="col-12 text-center py-2">
              <div className="d-inline-flex align-items-center gap-2 px-3 py-2 bg-light rounded-pill text-muted small border shadow-sm">
                <i className="bi bi-images text-danger"></i>
                <span>No gallery images added yet. Click 'Enter 3D View' to explore the sample 3D showcase.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Gallery
