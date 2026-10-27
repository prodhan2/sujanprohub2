import './MobileAppBar.css'

function MobileAppBar({ onMenuClick }) {
  return (
    <div className="mobile-app-bar">
      <button 
        className="mobile-menu-btn"
        onClick={onMenuClick}
      >
        <i className="bi bi-list"></i>
      </button>
      <div className="mobile-app-bar-title">Sujan Prodhan</div>
    </div>
  )
}

export default MobileAppBar
