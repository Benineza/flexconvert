import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, FileText } from 'lucide-react';
import './PdfPreview.css';

export default function PdfPreview({ file, totalPages = 5, onPageChange }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef(null);

  // Sync page change callback
  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage);
    }
  }, [currentPage, onPageChange]);

  // Handle drawing mock visual pages onto local canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw document page background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Page shadows/borders inside canvas
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    // Page Header Block
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(40, 45, 520, 20);

    ctx.fillStyle = '#7c3aed'; // Brand Violet accent marker
    ctx.fillRect(40, 45, 60, 20);

    // Text details (document properties)
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(file.name.substring(0, 32) || 'PDF Document', 40, 110);

    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Size: ${(file.size / 1024 / 1024).toFixed(2)} MB  |  Total Pages: ${totalPages}`, 40, 135);

    // Page specific indicator
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(`PAGE ${currentPage}`, 40, 210);

    // Visual placeholder text streams (simulating page text blocks)
    const lines = [
      'This document represents a processed PDF format within the universal conversion system.',
      'In a production environment, this preview utilizes PDF.js to parse and render vector elements.',
      'All text blocks, images, fonts, and graphics are visual representations of local file inputs.',
      'We support direct exports to PNG, JPEG, WebP, AVIF, TIFF, and vector formats page-by-page.',
      'Use the Range selector to convert a subset of document contents or export all pages simultaneously.',
      'Conversions are performed asynchronously to prevent page freezes for extremely large PDFs.'
    ];

    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    
    // Draw paragraphs based on current page
    let yPos = 260;
    const startIndex = (currentPage - 1) % lines.length;
    
    for (let i = 0; i < 5; i++) {
      const lineText = lines[(startIndex + i) % lines.length];
      
      // Draw simulated text line block
      ctx.fillText(lineText, 40, yPos);
      
      // Draw graphic blocks to look like a report layout
      ctx.fillStyle = 'rgba(124, 58, 237, 0.05)';
      ctx.fillRect(40, yPos + 10, 520, 12);
      ctx.fillStyle = '#475569';
      
      yPos += 55;
    }

    // Page visual footer accent
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Page ${currentPage} of ${totalPages}  |  FlexConvert Document Engine`, 300, 570);
    ctx.textAlign = 'left';

  }, [currentPage, file, totalPages]);

  const handlePrev = () => {
    setCurrentPage(p => Math.max(1, p - 1));
  };

  const handleNext = () => {
    setCurrentPage(p => Math.min(totalPages, p + 1));
  };

  const handleZoomOut = () => {
    setZoom(z => Math.max(50, z - 10));
  };

  const handleZoomIn = () => {
    setZoom(z => Math.min(150, z + 10));
  };

  return (
    <div className="pdf-preview-box">
      {/* Top Pagination and Zoom Toolbar */}
      <div className="pdf-preview-toolbar">
        <div className="pdf-page-controls">
          <button 
            type="button" 
            className="btn btn-secondary btn-sm btn-icon-only" 
            onClick={handlePrev}
            disabled={currentPage === 1}
            aria-label="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>
          
          <span className="pdf-page-indicator">
            Page <strong>{currentPage}</strong> of {totalPages}
          </span>

          <button 
            type="button" 
            className="btn btn-secondary btn-sm btn-icon-only" 
            onClick={handleNext}
            disabled={currentPage === totalPages}
            aria-label="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="pdf-zoom-controls">
          <button 
            type="button" 
            className="btn btn-secondary btn-sm btn-icon-only" 
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            aria-label="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          
          <span className="pdf-zoom-label">{zoom}%</span>

          <button 
            type="button" 
            className="btn btn-secondary btn-sm btn-icon-only" 
            onClick={handleZoomIn}
            disabled={zoom >= 150}
            aria-label="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Main Viewer canvas page frame */}
      <div className="pdf-canvas-container">
        <div 
          className="pdf-canvas-wrapper" 
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        >
          <canvas 
            ref={canvasRef} 
            width={600} 
            height={600} 
            className="pdf-mock-canvas"
          />
        </div>
      </div>

      {/* Page thumbnails selection tray */}
      <div className="pdf-thumbnails-tray">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <div 
            key={page} 
            className={`pdf-thumbnail-item ${currentPage === page ? 'active' : ''}`}
            onClick={() => setCurrentPage(page)}
            role="button"
            aria-label={`Jump to page ${page}`}
          >
            <div className="thumbnail-frame">
              <FileText size={18} />
              <span>P. {page}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
