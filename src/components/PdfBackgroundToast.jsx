import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePdfTools } from '../context/PdfToolsContext';
import './PdfBackgroundToast.css';

export default function PdfBackgroundToast() {
  const { backgroundNotification, setBackgroundNotification, isAnyTabProcessing } = usePdfTools();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show toast if user is already on the PDF tools page
  if (location.pathname === '/pdf-to-image' || location.pathname === '/pdf-to-webp' || location.pathname === '/pdf-tools') {
    return null;
  }

  if (!backgroundNotification && !isAnyTabProcessing) {
    return null;
  }

  return (
    <div 
      className={`pdf-bg-toast ${backgroundNotification?.type || 'info'}`}
      onClick={() => navigate('/pdf-to-image')}
      title="Click to view PDF Converter"
    >
      <div className="pdf-bg-toast-icon">
        {isAnyTabProcessing ? (
          <span className="spinner-border spinner-border-sm text-danger" role="status"></span>
        ) : (
          <i className="bi bi-file-earmark-check-fill text-success"></i>
        )}
      </div>

      <div className="pdf-bg-toast-content">
        <span className="pdf-bg-toast-title">
          {isAnyTabProcessing ? 'PDF Processing in Background...' : 'PDF Task Complete'}
        </span>
        <span className="pdf-bg-toast-sub">
          {backgroundNotification?.message || 'Click to view extracted pages & WebP'}
        </span>
      </div>

      <button 
        type="button" 
        className="pdf-bg-toast-close"
        onClick={(e) => {
          e.stopPropagation();
          setBackgroundNotification(null);
        }}
      >
        <i className="bi bi-x"></i>
      </button>
    </div>
  );
}
