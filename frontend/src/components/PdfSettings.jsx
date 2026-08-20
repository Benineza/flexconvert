import { ArrowUp, ArrowDown, Trash2, Settings, ChevronDown } from 'lucide-react';
import { formatBytes } from '../utils/fileUtils';
import './PdfSettings.css';

export default function PdfSettings({ 
  mode, // 'pdf-to-image' or 'image-to-pdf'
  settings, 
  onUpdateSettings,
  images = [], // For image-to-pdf reordering
  onMoveImage, // (id, 'up'|'down') => void
  onRemoveImage // (id) => void
}) {
  
  const handleSettingChange = (key, value) => {
    onUpdateSettings({
      ...settings,
      [key]: value
    });
  };

  if (mode === 'pdf-to-image') {
    const { pageSelection = 'all', pageStart = 1, pageEnd = 1, quality = 90, dpi = 150, totalPages = 5 } = settings;

    return (
      <div className="pdf-settings-panel">
        <h4 className="settings-section-title">PDF Page Settings</h4>
        
        {/* Page range inputs */}
        <div className="settings-group">
          <label className="settings-label">Pages to Convert</label>
          <div className="radio-group">
            <label className="radio-label">
              <input 
                type="radio" 
                name="pageSelection" 
                value="all" 
                checked={pageSelection === 'all'}
                onChange={() => handleSettingChange('pageSelection', 'all')}
              />
              <span>All pages ({totalPages})</span>
            </label>
            <label className="radio-label">
              <input 
                type="radio" 
                name="pageSelection" 
                value="range" 
                checked={pageSelection === 'range'}
                onChange={() => handleSettingChange('pageSelection', 'range')}
              />
              <span>Select range</span>
            </label>
          </div>

          {pageSelection === 'range' && (
            <div className="range-inputs-row animate-slide-up">
              <div className="range-field">
                <span className="field-prefix">From</span>
                <input 
                  type="number" 
                  min={1} 
                  max={totalPages}
                  className="input input-sm range-num-input" 
                  value={pageStart}
                  onChange={(e) => handleSettingChange('pageStart', Math.min(totalPages, Math.max(1, parseInt(e.target.value) || 1)))}
                />
              </div>
              <div className="range-field">
                <span className="field-prefix">To</span>
                <input 
                  type="number" 
                  min={pageStart} 
                  max={totalPages}
                  className="input input-sm range-num-input" 
                  value={pageEnd}
                  onChange={(e) => handleSettingChange('pageEnd', Math.min(totalPages, Math.max(pageStart, parseInt(e.target.value) || 1)))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Expandable Advanced options */}
        <details className="advanced-settings-details">
          <summary className="advanced-settings-summary">
            <div className="summary-title-wrapper">
              <Settings size={14} className="settings-summary-icon" />
              <span>Advanced Settings</span>
            </div>
            <ChevronDown size={14} className="details-chevron" />
          </summary>
          
          <div className="advanced-settings-content animate-slide-up">
            {/* Quality selection slider */}
            <div className="settings-group">
              <div className="slider-header">
                <label className="settings-label">Image Quality</label>
                <span className="slider-value">{quality}%</span>
              </div>
              <input 
                type="range" 
                min={10} 
                max={100} 
                step={5}
                className="quality-slider"
                value={quality}
                onChange={(e) => handleSettingChange('quality', parseInt(e.target.value))}
              />
            </div>

            {/* DPI settings */}
            <div className="settings-group">
              <label className="settings-label">Resolution (DPI)</label>
              <select 
                className="input select-input"
                value={dpi}
                onChange={(e) => handleSettingChange('dpi', parseInt(e.target.value))}
              >
                <option value={72}>72 DPI (Web optimization)</option>
                <option value={150}>150 DPI (Standard)</option>
                <option value={300}>300 DPI (High Resolution / Print)</option>
              </select>
            </div>
          </div>
        </details>
      </div>
    );
  }

  if (mode === 'image-to-pdf') {
    const { pageSize = 'a4', orientation = 'portrait', imageFit = 'fit' } = settings;

    return (
      <div className="pdf-settings-panel">
        <h4 className="settings-section-title">PDF Layout Options</h4>
        
        <div className="settings-row-grid">
          {/* Page size */}
          <div className="settings-group">
            <label className="settings-label">Page Size</label>
            <select 
              className="input select-input"
              value={pageSize}
              onChange={(e) => handleSettingChange('pageSize', e.target.value)}
            >
              <option value="a4">A4</option>
              <option value="letter">US Letter</option>
            </select>
          </div>

          {/* Orientation */}
          <div className="settings-group">
            <label className="settings-label">Orientation</label>
            <div className="toggle-group-buttons">
              <button
                type="button"
                className={`toggle-btn ${orientation === 'portrait' ? 'active' : ''}`}
                onClick={() => handleSettingChange('orientation', 'portrait')}
              >
                Portrait
              </button>
              <button
                type="button"
                className={`toggle-btn ${orientation === 'landscape' ? 'active' : ''}`}
                onClick={() => handleSettingChange('orientation', 'landscape')}
              >
                Landscape
              </button>
            </div>
          </div>

          {/* Image fit */}
          <div className="settings-group">
            <label className="settings-label">Image Fit</label>
            <select 
              className="input select-input"
              value={imageFit}
              onChange={(e) => handleSettingChange('imageFit', e.target.value)}
            >
              <option value="fit">Fit to page (Maintain aspect ratio)</option>
              <option value="stretch">Stretch to fill page</option>
              <option value="original">Original size (Keep canvas DPI)</option>
            </select>
          </div>
        </div>

        {/* Reordering images list */}
        {images.length > 0 && (
          <div className="images-reorder-section">
            <label className="settings-label">Images Order ({images.length})</label>
            <p className="reorder-instructions">Use arrows to arrange page sequences in the output document.</p>
            
            <div className="reorder-list-container">
              {images.map((item, index) => (
                <div key={item.id} className="reorder-item-card animate-slide-up">
                  {item.previewUrl ? (
                    <img src={item.previewUrl} className="reorder-item-thumb" alt="" />
                  ) : (
                    <div className="reorder-item-thumb-fallback">🖼️</div>
                  )}
                  
                  <div className="reorder-item-details">
                    <span className="reorder-item-name" title={item.file.name}>{item.file.name}</span>
                    <span className="reorder-item-size">Page {index + 1} &bull; {formatBytes(item.file.size)}</span>
                  </div>

                  <div className="reorder-item-actions">
                    <button 
                      type="button"
                      className="btn btn-secondary btn-sm btn-icon-only reorder-btn"
                      onClick={() => onMoveImage(item.id, 'up')}
                      disabled={index === 0}
                      title="Move Page Up"
                      aria-label={`Move ${item.file.name} up`}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button 
                      type="button"
                      className="btn btn-secondary btn-sm btn-icon-only reorder-btn"
                      onClick={() => onMoveImage(item.id, 'down')}
                      disabled={index === images.length - 1}
                      title="Move Page Down"
                      aria-label={`Move ${item.file.name} down`}
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button 
                      type="button"
                      className="btn btn-danger btn-sm btn-icon-only reorder-remove-btn"
                      onClick={() => onRemoveImage(item.id)}
                      title="Remove Page"
                      aria-label={`Remove page ${item.file.name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
