import { Trash2, Download, CheckCircle2, AlertCircle, Film, Image as ImageIcon, FileText } from 'lucide-react';
import { formatBytes, getFormatInfo } from '../utils/fileUtils';
import FormatDropdown from './FormatDropdown';
import './FileCard.css';

export default function FileCard({ item, onRemove, onSelectFormat, onDownload }) {
  const { file, previewUrl, targetFormat, status, progress, error, result } = item;
  const info = getFormatInfo(file.name);
  const fileExt = info?.ext || 'Unknown';
  const category = info?.category || 'unknown';

  // Preview renderer based on file type
  const renderPreview = () => {
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
          <img src={previewUrl} alt={file.name} onLoad={() => {}} />
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
    <div className={`file-card ${status !== 'idle' ? `card-status-${status}` : ''} animate-slide-up`}>
      {renderPreview()}

      <div className="file-card-details">
        <div className="file-card-header">
          <div className="file-card-title-group">
            <span className="file-card-name" title={file.name}>
              {file.name}
            </span>
            <span className="file-card-meta">
              {fileExt.toUpperCase()} &bull; {formatBytes(file.size)}
            </span>
          </div>
          
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

        {error && (
          <div className="file-card-error">
            <AlertCircle size={12} />
            <span>{error}</span>
          </div>
        )}

        <div className="file-card-footer">
          {status === 'completed' && result ? (
            <div className="file-card-result-actions">
              <div className="result-size-info">
                <span>Compressed size: </span>
                <strong>{formatBytes(result.size)}</strong>
                {result.size < file.size && (
                  <span className="savings-tag">
                    -{Math.round(((file.size - result.size) / file.size) * 100)}%
                  </span>
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
  );
}
