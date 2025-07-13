import React, { useEffect } from 'react';

function Toast({ message, show, onClose, type = 'success', autoHide = true, duration = 2000 }) {
  useEffect(() => {
    if (show && autoHide) {
      const timer = setTimeout(() => {
        onClose && onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, autoHide, duration, onClose]);

  if (!show) return null;
  // Giao diện Toast hiện đại, nổi bật, icon động
  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, minWidth: 320 }}>
      <div className={`toast show shadow border-0 toast-${type}`} style={{ background: type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff', color: '#fff', borderRadius: 8, padding: '12px 20px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 22, marginRight: 12 }}>
          {type === 'success' ? <i className="fas fa-check-circle"></i> : type === 'error' ? <i className="fas fa-times-circle"></i> : <i className="fas fa-info-circle"></i>}
        </span>
        <div style={{ flex: 1, fontWeight: 500, fontSize: 16 }}>{message}</div>
        <button type="button" className="ml-3 close text-white" style={{ fontSize: 22, opacity: 0.8 }} onClick={onClose}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>
  );
}

export default Toast;
