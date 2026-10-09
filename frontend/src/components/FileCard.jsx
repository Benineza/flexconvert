import { useState } from 'react';
import { Trash2, Download, CheckCircle2, AlertCircle, Film, FileText, Eye, EyeOff } from 'lucide-react';
import { formatBytes, getFormatInfo } from '../utils/fileUtils';
import FormatDropdown from './FormatDropdown';
import PdfPreview from './PdfPreview';
import PdfSettings from './PdfSettings';
import './FileCard.css';

export default function FileCard({ item, onRemove, onSelectFormat, onDownload, onUpdateItem }) {
  const { file, previewUrl, targetFormat, status, progress, error, result, pdfSettings } = item;
  const [showPreview, setShowPreview] = useState(false);
  
  const info = getFormatInfo(file.name);
  const fileExt = info?.ext || 'Unknown';
  const category = info?.category || 'unknown';

  const isPdf = fileExt.toLowerCase() === 'pdf';

  // Toggle visual page viewer
  const handleTogglePreview = (e) => {
    e.stopPropagation();
    setShowPreview(!showPreview);
  };

  // Preview renderer based on file type
  const renderPreviewThumbnail = () => {
    if (isPdf) {
      return (
        <div className="file-card-preview-fallback pdf-thumbnail-icon-box">
          <FileText size={40} className="pdf-brand-icon" />
          <span className="pdf-badge-label">PDF</span>
        </div>
      );
    }

    if (fileExt === 'docx') {
      return (
        <div className="file-card-preview-fallback docx-thumbnail-icon-box">
          <FileText size={40} className="docx-brand-icon" />
          <span className="docx-badge-label">DOCX</span>
        </div>
      );
    }

    if (fileExt === 'pptx') {
      return (
        <div className="file-card-preview-fallback pptx-thumbnail-icon-box">
          <FileText size={40} className="pptx-brand-icon" />
          <span className="pptx-badge-label">PPTX</span>
        </div>
      );
    }

    if (fileExt === 'txt') {
      return (
        <div className="file-card-preview-fallback txt-thumbnail-icon-box">
          <FileText size={40} className="txt-brand-icon" />
          <span className="txt-badge-label">TXT</span>
        </div>
      );
    }

    if (!previewUrl) {
      return (
        <div className="file-card-preview-fallback">
          {category === 'video' ? <Film size={32} /> : <FileText size={32} />}
        </div>
      );
    }

    if (category === 'image') {
      return (
        <div className="file-card-preview-image">
          <img src={previewUrl} alt={file.name} />
        </div>
      );
    }

    if (category === 'video') {
      return (
        <div className="file-card-preview-video">
          <video src={previewUrl} muted playsInline autoPlay loop />
          <div className="video-badge">
            <Film size={12} /> Video
          </div>
        </div>
      );
    }

    return (
      <div className="file-card-preview-fallback">
        <FileText size={32} />
      </div>
    );
  };

  const getStatusOverlay = () => {
    switch (status) {
      case 'converting':
        return (
          <div className="status-overlay status-converting">
            <div className="progress-ring-wrapper">
              <div className="spinner" />
              <span className="progress-text">{progress}%</span>
            </div>
            <span className="status-label">Converting...</span>
          </div>
        );
      case 'completed':
        return (
          <div className="status-overlay status-completed">
            <CheckCircle2 size={36} className="success-icon animate-bounce-in" />
            <span className="status-label">Finished</span>
          </div>
        );
      case 'failed':
        return (
          <div className="status-overlay status-failed">
            <AlertCircle size={36} className="error-icon" />
            <span className="status-label">Failed</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`file-card-wrapper animate-slide-up`}>
      <div className={`file-card ${status !== 'idle' ? `card-status-${status}` : ''}`}>
        {renderPreviewThumbnail()}

        <div className="file-card-details">
          <div className="file-card-header">
            <div className="file-card-title-group">
              <span className="file-card-name" title={file.name}>
                {file.name}
              </span>
              <span className="file-card-meta">
                {fileExt.toUpperCase()} &bull; {formatBytes(file.size)}
                {isPdf && pdfSettings && ` • ${pdfSettings.totalPages} pages`}
              </span>
            </div>
            
            <div className="card-header-actions">
              {isPdf && status === 'idle' && (
                <button 
                  type="button"
                  className={`btn btn-secondary btn-sm preview-toggle-btn ${showPreview ? 'active' : ''}`}
                  onClick={handleTogglePreview}
                  title="Toggle Preview"
                >
                  {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{showPreview ? 'Hide Preview' : 'Preview'}</span>
                </button>
              )}
              
              {status === 'idle' && (
                <button 
                  className="file-card-remove-btn" 
                  onClick={() => onRemove(item.id)}
                  aria-label={`Remove file ${file.name}`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="file-card-error">
              <AlertCircle size={12} />
              <span>{error}</span>
            </div>
          )}

          {/* Render PDF to Image Settings directly in card if output format is selected */}
          {isPdf && targetFormat && status === 'idle' && pdfSettings && onUpdateItem && (
            <PdfSettings
              mode="pdf-to-image"
              settings={pdfSettings}
              onUpdateSettings={(newSettings) => onUpdateItem(item.id, { pdfSettings: newSettings })}
            />
          )}

          <div className="file-card-footer">
            {status === 'completed' && result ? (
              <div className="file-card-result-actions">
                <div className="result-size-info">
                  {result.isMultiFile && result.files ? (
                    <span>Generated <strong>{result.files.length}</strong> pages ({formatBytes(result.size)})</span>
                  ) : (
                    <>
                      <span>Compressed size: </span>
                      <strong>{formatBytes(result.size)}</strong>
                      {result.size < file.size && (
                        <span className="savings-tag">
                          -{Math.round(((file.size - result.size) / file.size) * 100)}%
                        </span>
                      )}
                    </>
                  )}
                </div>
                <button 
                  className="btn btn-success btn-sm btn-download-card"
                  onClick={() => onDownload(item)}
                >
                  <Download size={14} /> Download
                </button>
              </div>
            ) : (
              <div className="file-card-selector-actions">
                <span className="convert-to-text">Convert to:</span>
                <div className="dropdown-wrapper-inline">
                  <FormatDropdown
                    selectedFormat={targetFormat}
                    onSelectFormat={(fmt) => onSelectFormat(item.id, fmt)}
                    fileCategory={category}
                    excludeFormat={fileExt}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {getStatusOverlay()}
      </div>

      {/* Expandable Preview Drawer */}
      {isPdf && showPreview && status === 'idle' && (
        <div className="file-card-preview-drawer animate-slide-up">
          <PdfPreview 
            file={file} 
            totalPages={pdfSettings?.totalPages || 5} 
            onPageChange={() => {
              // Optionally track current view page
            }}
          />
        </div>
      )}
    </div>
  );
}
