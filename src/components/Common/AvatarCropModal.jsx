import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, Check, RotateCw } from 'lucide-react';

export const AvatarCropModal = ({ isOpen, onClose, imageSrc, onCropComplete }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;
      img.onload = () => {
        imgRef.current = img;
        drawCanvas();
      };
    }
  }, [imageSrc, zoom, rotation]);

  if (!isOpen || !imageSrc) return null;

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    const size = 300;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);
    ctx.save();

    // Move to center
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Draw image centered
    const aspect = img.width / img.height;
    let drawW = size;
    let drawH = size;

    if (aspect > 1) {
      drawW = size * aspect;
    } else {
      drawH = size / aspect;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a circular cropped output canvas
    const outputCanvas = document.createElement('canvas');
    const outSize = 240;
    outputCanvas.width = outSize;
    outputCanvas.height = outSize;
    const outCtx = outputCanvas.getContext('2d');

    // Create circular clip mask
    outCtx.beginPath();
    outCtx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2, true);
    outCtx.closePath();
    outCtx.clip();

    // Draw the scaled canvas into circular output canvas
    outCtx.drawImage(canvas, 0, 0, outSize, outSize);

    const croppedBase64 = outputCanvas.toDataURL('image/jpeg', 0.92);
    onCropComplete(croppedBase64);
  };

  return (
    <div className="modal-overlay centered-modal-overlay" onClick={onClose} style={{ zIndex: 11000 }}>
      <div className="glass-panel modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', width: '92vw', padding: '1.5rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>Adjust Profile Photo</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Scale & position photo inside the circular frame
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Circular Crop Frame Area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '1rem 0' }}>
          <div 
            style={{ 
              width: '240px', 
              height: '240px', 
              borderRadius: '50%', 
              overflow: 'hidden', 
              border: '3px solid var(--primary)', 
              boxShadow: '0 0 25px rgba(99, 102, 241, 0.3)',
              background: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        </div>

        {/* Slider Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', background: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ZoomOut size={16} className="text-muted" />
            <input 
              type="range" 
              min="0.8" 
              max="2.5" 
              step="0.05" 
              value={zoom} 
              onChange={e => setZoom(parseFloat(e.target.value))} 
              style={{ flex: 1, accentColor: 'var(--primary)' }}
            />
            <ZoomIn size={16} className="text-muted" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem', gap: '6px' }}
              onClick={() => setRotation(prev => (prev + 90) % 360)}
            >
              <RotateCw size={14} />
              <span>Rotate 90°</span>
            </button>

            <button 
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem' }}
              onClick={() => { setZoom(1); setRotation(0); }}
            >
              Reset Scale
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '1.25rem' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>

          <button className="btn btn-primary" style={{ flex: 1, gap: '6px' }} onClick={handleApply}>
            <Check size={16} />
            <span>Apply & Save Photo</span>
          </button>
        </div>

      </div>
    </div>
  );
};
