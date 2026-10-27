import { Link } from 'react-router-dom'
import './Header.css'

function Header({ isExpanded, setIsExpanded }) {
  return (
    <>
      <button 
        className="header-toggle d-xl-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <i className={`bi ${isExpanded ? 'bi-x' : 'bi-list'}`}></i>
      </button>
      
      <header id="header" className={`header d-flex flex-column ${isExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="profile-img text-center">
          {/* Placeholder for profile image */}
          <img src="https://i.postimg.cc/Jhym7G37/photo-2024-04-28-06-27-27-modified.png" alt="Profile Image" className="img-fluid rounded-circle" style={{ width: isExpanded ? '120px' : '45px', height: isExpanded ? '120px' : '45px', objectFit: 'cover' }} />
        </div>

        {isExpanded && (
          <Link className='logo d-flex align-items-center justify-content-center mt-3' to='/'>
            <h1 className="sitename text-white">Sujan Prodhan</h1>
          </Link>
        )}

        {isExpanded && (
          <div className="social-links text-center mt-3">
            <a href="#" className="social-btn twitter text-white me-2"><i className="bi bi-twitter"></i></a>
            <a href="#" className="social-btn facebook text-white me-2"><i className="bi bi-facebook"></i></a>
            <a href="#" className="social-btn instagram text-white me-2"><i className="bi bi-instagram"></i></a>
            <a href="#" className="social-btn google-plus text-white me-2"><i className="bi bi-skype"></i></a>
            <a href="#" className="social-btn linkedin text-white"><i className="bi bi-linkedin"></i></a>
          </div>
        )}

        <nav id="navmenu" className="navmenu mt-4">
          <ul className="list-unstyled">
            <li className="mb-2"><a href="#hero" className="text-white text-decoration-none active"><i className="bi bi-house navicon"></i>{isExpanded && <span className="nav-text">Home</span>}</a></li>
            <li className="mb-2"><a href="#about" className="text-white text-decoration-none"><i className="bi bi-person navicon"></i>{isExpanded && <span className="nav-text">About</span>}</a></li>
            <li className="mb-2"><a href="#resume" className="text-white text-decoration-none"><i className="bi bi-file-earmark-text navicon"></i>{isExpanded && <span className="nav-text">Resume</span>}</a></li>

            <li className="mb-2"><a href="#services" className="text-white text-decoration-none"><i className="bi bi-hdd-stack navicon"></i>{isExpanded && <span className="nav-text">Projects</span>}</a></li>
            <li className="mb-2"><Link to="/contact" className="text-white text-decoration-none"><i className="bi bi-envelope navicon"></i>{isExpanded && <span className="nav-text">Contact Me</span>}</Link></li>
            <li className="mb-2"><Link to="/admin" className="text-white text-decoration-none"><i className="bi bi-gear navicon"></i>{isExpanded && <span className="nav-text">Admin Panel</span>}</Link></li>
          </ul>
        </nav>
      </header>
    </>
  )
}

export default Header
