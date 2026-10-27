import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { Link } from 'react-router-dom'
import './Posts.css'
import './Projects.css'

function PostCarousel({ images }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [images.length])

  return (
    <div className="position-relative" style={{ height: '160px', overflow: 'hidden' }}>
      {images.map((img, index) => (
        <img
          key={index}
          src={img}
          alt="Post image"
          className={`card-img-top position-absolute top-0 start-0 w-100 h-100 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            objectFit: 'cover',
            transition: 'opacity 0.5s ease-in-out'
          }}
        />
      ))}
      <div className="position-absolute bottom-0 start-0 w-100 p-2 d-flex justify-content-center gap-1">
        {images.map((_, index) => (
          <span
            key={index}
            className={`rounded-circle ${index === currentIndex ? 'bg-white' : 'bg-white bg-opacity-50'}`}
            style={{
              width: '8px',
              height: '8px',
              cursor: 'pointer'
            }}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  )
}

function Posts() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'posts'), (snapshot) => {
      const postsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setPosts(postsList)
    })
    return unsubscribe
  }, [])

  const handleShare = async (post) => {
    const shareUrl = `${window.location.origin}/post/${post.id}`
    const shareData = {
      title: post.title,
      text: post.description || 'Check out this post!',
      url: shareUrl
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        // Fallback to copying link
        await navigator.clipboard.writeText(shareUrl)
        alert('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing:', error)
      // Copy link as last resort
      try {
        await navigator.clipboard.writeText(shareUrl)
        alert('Link copied to clipboard!')
      } catch (copyError) {
        console.error('Error copying link:', copyError)
        alert('Could not share. Please copy the link manually.')
      }
    }
  }

  return (
    <section id="posts" className="posts section py-3 py-md-4 bg-light">
      <div className="container">
        <div className="section-title text-center mb-3">
          <h2 className="mb-1" style={{ fontSize: '1.75rem' }}>Posts</h2>
        </div>

        <div className="row g-3">
          {posts.map((post) => {
            const images = post.imageUrls || (post.imageUrl ? [post.imageUrl] : [])
            return (
              <div key={post.id} className="col-lg-6 col-xl-4">
                <div className="card h-100 shadow-sm border-0">
                  <Link to={`/post/${post.id}`} className="position-relative text-decoration-none">
                    {images.length > 1 ? (
                      <PostCarousel images={images} />
                    ) : images.length === 1 ? (
                      <img 
                        src={images[0]} 
                        alt={post.title} 
                        className="card-img-top" 
                        style={{ height: '160px', objectFit: 'cover' }} 
                      />
                    ) : null}
                  </Link>
                  <div className="card-body p-3">
                    <div className="d-flex align-items-center justify-content-between">
                      <Link to={`/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                        <h5 className="card-title fw-bold fs-6 mb-1 text-truncate">{post.title}</h5>
                        {post.description && <p className="card-text text-muted mb-0 small text-truncate">{post.description}</p>}
                      </Link>
                      <div className="d-flex gap-1 flex-shrink-0 ms-2">
                        <Link to={`/post/${post.id}`} className="btn btn-sm btn-primary" title="View Post">
                          <i className="bi bi-eye"></i>
                        </Link>
                        {post.url && (
                          <a href={post.url} className="btn btn-sm btn-outline-primary" target="_blank" rel="noopener noreferrer" title="External Link">
                            <i className="bi bi-link-45deg"></i>
                          </a>
                        )}
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleShare(post)
                          }}
                          title="Share this post"
                        >
                          <i className="bi bi-share-fill"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {posts.length === 0 && (
            <div className="col-12 text-center py-2">
              <div className="d-inline-flex align-items-center gap-2 px-3 py-2 bg-white rounded-pill text-muted small border shadow-sm">
                <i className="bi bi-sticky text-warning"></i>
                <span>No posts yet. Articles and updates will be posted here soon.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Posts
