import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ChevronRight, Sparkles, Layers, ShieldCheck, Zap, ChevronDown } from 'lucide-react';
import DropZone from '../components/DropZone';
import ConversionQueue from '../components/ConversionQueue';
import PdfSettings from '../components/PdfSettings';
import { FORMATS } from '../constants/formats';
import './PdfConverterPage.css';

export default function PdfConverterPage() {
  const [queue, setQueue] = useState([]);
  const [faqOpen, setFaqOpen] = useState({});
  
  // Page level compilation settings (for Images to PDF)
  const [pdfCompileSettings, setPdfCompileSettings] = useState({
    pageSize: 'a4',
    orientation: 'portrait',
    imageFit: 'fit'
  });

  useEffect(() => {
    return () => {
      queue.forEach(item => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    };
  }, []);

  // Queue state handlers
  const handleAddFiles = (newFiles) => {
    const newItems = newFiles.map(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      const isPdf = ext === 'pdf';
      return {
        id: Math.random().toString(36).substring(2, 11),
        file,
        previewUrl: file.type.startsWith('image/') || file.type.startsWith('video/')
          ? URL.createObjectURL(file)
          : null,
        targetFormat: isPdf ? 'png' : 'pdf', // Autofill standard paths
        status: 'idle',
        progress: 0,
        result: null,
        error: null,
        pdfSettings: isPdf ? {
          pageSelection: 'all',
          pageStart: 1,
          pageEnd: 5,
          totalPages: 5, // Mock page count
          quality: 90,
          dpi: 150
        } : null
      };
    });

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

  // Drag-and-drop / arrow reordering helpers for image-to-PDF compilation
  const handleMoveImage = (id, direction) => {
    setQueue(prev => {
      const index = prev.findIndex(item => item.id === id);
      if (index === -1) return prev;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newQueue = [...prev];
      const [movedItem] = newQueue.splice(index, 1);
      newQueue.splice(newIndex, 0, movedItem);
      return newQueue;
    });
  };

  // Determine if we are doing a compilation (multiple images -> single PDF)
  const isImageToPdfCompilation = queue.length > 0 && queue.every(item => {
    const info = FORMATS.image.find(f => f.ext === item.file.name.split('.').pop().toLowerCase());
    return !!info && item.targetFormat === 'pdf';
  });

  // Watch queue conversions to apply PDF compilation settings
  useEffect(() => {
    if (isImageToPdfCompilation) {
      queue.forEach(item => {
        // Feed the global compile settings into the individual item pdfSettings 
        // so that conversionService receives them during execution
        if (JSON.stringify(item.pdfSettings) !== JSON.stringify(pdfCompileSettings)) {
          handleUpdateItem(item.id, { pdfSettings: pdfCompileSettings });
        }
      });
    }
  }, [isImageToPdfCompilation, pdfCompileSettings, queue]);

  const toggleFaq = (index) => {
    setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const faqs = [
    {
      q: "Can I convert Word (DOCX), PowerPoint (PPTX), or Text (TXT) files to PDF?",
      a: "Yes! Upload your DOCX, PPTX, or TXT file to the PDF Converter, select PDF as the output format, and our backend engine will produce a valid PDF with formatted typography and layout."
    },
    {
      q: "Can I convert a PDF into Word (DOCX) or PowerPoint (PPTX)?",
      a: "Yes! Choose DOCX or PPTX as your output format when uploading a PDF. The backend extracts structure, paragraphs, and slide views into editable documents or presentation slides."
    },
    {
      q: "Can I convert multi-page PDF files into separate image pages?",
      a: "Yes! When converting PDF to PNG/JPG/WebP/AVIF/TIFF, every page is rendered in high resolution. For multi-page documents, all pages are cleanly packaged into a ZIP archive for one-click download."
    },
    {
      q: "Can I select specific pages of a PDF to convert?",
      a: "Absolutely! After dropping a PDF, select 'Select range' under the PDF settings, then configure your 'From' and 'To' pages. Only that range will be processed."
    }
  ];

  return (
    <div className="converter-page-container pdf-page-view animate-fade-in">
      {/* Breadcrumbs */}
      <div className="converter-breadcrumb-bar">
        <div className="container">
          <nav className="breadcrumb-nav">
            <Link to="/">Home</Link>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <span className="breadcrumb-current">PDF Converter</span>
          </nav>
        </div>
      </div>

      {/* Hero Widget Section */}
      <section className="converter-hero-section">
        <div className="container converter-page-grid">
          <div className="converter-page-header">
            <div className="category-icon-header pdf-icon-accent-box">
              <FileText size={24} />
            </div>
            <h1>Universal PDF Converter</h1>
            <p>Convert PDF files to images, Word (DOCX), PowerPoint (PPTX), and TXT, or convert documents and images into clean PDF files.</p>

            <div className="other-converters-nav">
              <span>Looking for other formats?</span>
              <div className="quick-nav-links">
                <Link to="/image-converter" className="other-converter-link">Image Converter &rarr;</Link>
                <Link to="/video-converter" className="other-converter-link">Video Converter &rarr;</Link>
              </div>
            </div>
          </div>

          <div className="converter-page-card">
            {queue.length === 0 ? (
              <DropZone 
                onFilesAdded={handleAddFiles} 
                allowedCategory="pdf" // Allow PDF, DOCX, TXT, PPTX, and image inputs
                queue={queue}
              />
            ) : (
              <div className="pdf-queue-wrapper">
                {/* Render global compilation options if converting multiple images to PDF */}
                {isImageToPdfCompilation && (
                  <div className="pdf-global-settings-card animate-slide-up">
                    <PdfSettings
                      mode="image-to-pdf"
                      settings={pdfCompileSettings}
                      onUpdateSettings={setPdfCompileSettings}
                      images={queue}
                      onMoveImage={handleMoveImage}
                      onRemoveImage={handleRemoveFile}
                    />
                  </div>
                )}
                
                <ConversionQueue
                  queue={queue}
                  onRemove={handleRemoveFile}
                  onUpdateItem={handleUpdateItem}
                  onClear={handleClearQueue}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features layout */}
      <section className="converter-info-section pdf-features-list">
        <div className="container">
          <h2 className="section-title">Powerful PDF Processing</h2>
          <p className="section-sub">A complete set of tools to compile, split, and re-format document pages.</p>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <h3>PDF to Images & Docs</h3>
              <p>Convert PDF pages to PNG, JPG, WebP, Word DOCX, PowerPoint PPTX, or extract TXT text.</p>
            </div>
            <div className="step-card">
              <div className="step-number">02</div>
              <h3>Documents to PDF</h3>
              <p>Convert Word DOCX, PowerPoint PPTX, TXT files, and images into clean PDF documents.</p>
            </div>
            <div className="step-card">
              <div className="step-number">03</div>
              <h3>Page Customization</h3>
              <p>Organize page order visually, set page size & orientation, and configure page ranges.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ section */}
      <section className="faq-section" id="faq">
        <div className="container">
          <h2 className="section-title">PDF Conversion FAQs</h2>
          <div className="faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className={`faq-item ${faqOpen[i] ? 'open' : ''}`}>
                <button className="faq-question" onClick={() => toggleFaq(i)}>
                  <span className="faq-q-text">{faq.q}</span>
                  <ChevronDown size={18} className="faq-chevron" />
                </button>
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
