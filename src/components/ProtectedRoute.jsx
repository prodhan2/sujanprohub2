import { Navigate, useLocation } from 'react-router-dom'

function ProtectedRoute({ children }) {
  const location = useLocation()
  const savedPassword = sessionStorage.getItem('adminPassword')
  
  if (savedPassword === 'M2nalisa24@') {
    return children
  } else {
    // Redirect to login, saving the intended destination in state
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }
}

export default ProtectedRoute
