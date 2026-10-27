import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../firebase'
import './Research.css'

function Research() {
  const [research, setResearch] = useState([])

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'research'), (snapshot) => {
      const researchList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setResearch(researchList)
    })
    return unsubscribe
  }, [])

  const truncateText = (text, maxLength = 100) => {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  return (
    <section id="research" className="research section py-3 py-md-4">
      <div className="container">
        <div className="section-title text-center mb-3">
          <h2 className="mb-1" style={{ fontSize: '1.75rem' }}>Research</h2>
        </div>

        <div className="row g-3">
          {research.map((item) => (
            <div key={item.id} className="col-lg-4 col-md-6">
              <div className="card h-100 shadow-sm border-0" style={{ background: '#f8fafc' }}>
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.title} className="card-img-top" style={{ height: '150px', objectFit: 'cover' }} />
                )}
                <div className="card-body p-3">
                  <h5 className="card-title fw-bold fs-6 mb-2">{item.title}</h5>
                  {item.description && (
                    <p className="card-text text-muted small mb-2">
                      {truncateText(item.description, 90)}
                    </p>
                  )}
                  <Link to={`/research/${item.id}`} className="btn btn-outline-danger btn-sm py-1 px-3">
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
          {research.length === 0 && (
            <div className="col-12 text-center py-2">
              <div className="d-inline-flex align-items-center gap-2 px-3 py-2 bg-light rounded-pill text-muted small border shadow-sm">
                <i className="bi bi-flask text-danger"></i>
                <span>No research publications yet. Publications will appear here soon.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Research
