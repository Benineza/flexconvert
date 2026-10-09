import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ImageIcon, Film, ChevronRight } from 'lucide-react';
import DropZone from '../components/DropZone';
import ConversionQueue from '../components/ConversionQueue';
import { FORMATS } from '../constants/formats';
import './ConverterPage.css';

export default function ConverterPage({ category }) {
  const [queue, setQueue] = useState([]);
  const queueRef = useRef(queue);
  
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  // Clear preview URLs when route changes or component unmounts
  useEffect(() => {
    return () => {
      queueRef.current.forEach(item => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, [category]);

  const isImage = category === 'image';
  const pageTitle = isImage ? 'Image Converter' : 'Video Converter';
  const pageSub = isImage 
    ? 'Convert PNG, JPG, WebP, AVIF, TIFF, SVG, ICO, and GIF files securely in seconds.' 
    : 'Convert MP4, MOV, MKV, WebM, and AVI video streams without quality loss.';

  const supportedList = FORMATS[category] || [];

  const handleAddFiles = (newFiles) => {
    const newItems = newFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      previewUrl: file.type.startsWith('image/') || file.type.startsWith('video/')
        ? URL.createObjectURL(file)
        : null,
      targetFormat: '',
      status: 'idle',
      progress: 0,
      result: null,
      error: null
    }));

    setQueue(prev => [...prev, ...newItems]);
  };

  const handleRemoveFile = (id) => {
    setQueue(prev => {
      const target = prev.find(item => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(item => item.id !== id);
    });
  };

  const handleUpdateItem = (id, fields) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, ...fields } : item
    ));
  };

  const handleClearQueue = () => {
    queue.forEach(item => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setQueue([]);
  };

  return (
    <div className="converter-page-container animate-fade-in">
      {/* Breadcrumb Header */}
      <div className="converter-breadcrumb-bar">
        <div className="container">
          <nav className="breadcrumb-nav">
            <Link to="/">Home</Link>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <span className="breadcrumb-current">{pageTitle}</span>
          </nav>
        </div>
      </div>

      {/* Hero converter */}
      <section className="converter-hero-section">
        <div className="container converter-page-grid">
          <div className="converter-page-header">
            <div className="category-icon-header">
              {isImage ? <ImageIcon size={24} /> : <Film size={24} />}
            </div>
            <h1>Online {pageTitle}</h1>
            <p>{pageSub}</p>

            <div className="other-converters-nav">
              <span>Looking for other formats?</span>
              <Link 
                to={isImage ? '/video-converter' : '/image-converter'} 
                className="other-converter-link"
              >
                Go to {isImage ? 'Video Converter' : 'Image Converter'} &rarr;
              </Link>
            </div>
          </div>

          <div className="converter-page-card">
            {queue.length === 0 ? (
              <DropZone 
                onFilesAdded={handleAddFiles} 
                allowedCategory={category}
                queue={queue}
              />
            ) : (
              <ConversionQueue
                queue={queue}
                onRemove={handleRemoveFile}
                onUpdateItem={handleUpdateItem}
                onClear={handleClearQueue}
              />
            )}
          </div>
        </div>
      </section>

      {/* Info details about supported extensions */}
      <section className="converter-info-section">
        <div className="container">
          <h2 className="section-title">Supported {isImage ? 'Image' : 'Video'} Formats</h2>
          <p className="section-sub">We support high quality conversions across these popular extensions:</p>

          <div className="supported-formats-cards-grid">
            {supportedList.map(fmt => (
              <div key={fmt.id} className="format-info-card animate-slide-up">
                <div className="format-info-badge">{fmt.ext.toUpperCase()}</div>
                <h3>{fmt.label} Format</h3>
                <p className="format-description-text">
                  Standard {isImage ? 'graphic layout' : 'video container encoding'} used widely for web development and content distribution.
                </p>
                <div className="format-meta-row">
                  <span className="meta-label">Preview support:</span>
                  <span className={`meta-value ${fmt.preview ? 'text-success' : 'text-muted'}`}>
                    {fmt.preview ? 'Available' : 'Icon display'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
