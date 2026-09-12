import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ toast, onClose }) => {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle size={18} className="text-emerald-400" />,
    error: <AlertCircle size={18} className="text-rose-400" />,
    info: <Info size={18} className="text-indigo-400" />
  };

  return (
    <div className="toast-container">
      <div className={`toast ${toast.type || 'info'}`}>
        {icons[toast.type] || icons.info}
        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast.message}</span>
        <button onClick={onClose} className="close-btn" style={{ marginLeft: '0.5rem' }}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
