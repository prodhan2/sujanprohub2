import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './AdminLogin.css'

function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get the intended destination from location state (e.g., /admin/projects)
  const from = location.state?.from?.pathname || '/admin/projects'
  
  const handleSubmit = (e) => {
    e.preventDefault()
    if (password === 'M2nalisa24@') {
      // Store password in sessionStorage so it persists across page reloads
      sessionStorage.setItem('adminPassword', password)
      // Redirect to the intended page
      navigate(from, { replace: true })
    } else {
      setError('Wrong password! Try again.')
    }
  }
  
  return (
    <div className="admin-login-container">
      <div className="admin-login-box">
        <h2>Admin Login</h2>
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="login-btn">
            Login
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminLogin
