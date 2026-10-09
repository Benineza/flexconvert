import { useState, useRef } from 'react';
import { Sparkles, Layers, ShieldCheck, Zap, ChevronDown } from 'lucide-react';
import DropZone from '../components/DropZone';
import ConversionQueue from '../components/ConversionQueue';
import { FORMATS } from '../constants/formats';
import './Home.css';

export default function Home() {
  const [queue, setQueue] = useState([]);
  const [faqOpen, setFaqOpen] = useState({});
  const converterRef = useRef(null);

  // Queue state management
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
        targetFormat: '',
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

  const scrollToConverter = () => {
    converterRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleFaq = (index) => {
    setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const faqs = [
    {
      q: "What formats are supported?",
      a: "For images, we support PNG, JPG, JPEG, WebP, AVIF, TIFF, SVG, ICO, and GIF. For videos, we support MP4, MOV, MKV, WebM, and AVI."
    },
    {
      q: "Is there a file-size limit?",
      a: "Yes, files up to 100 MB can be processed. This is a configurable threshold in the frontend codebase."
    },
    {
      q: "Can I convert multiple files at the same time?",
      a: "Absolutely! FlexConvert supports batch conversions. You can drag and drop multiple files, select individual formats or a global target format, and convert them in batch."
    },
    {
      q: "Are my files stored on your servers?",
      a: "No! Files are processed on-the-fly in safe temporary storage and immediately cleaned up after conversion. We never permanently store or view your files."
    },
    {
      q: "Does this require complex software installation?",
      a: "No installation is required. Everything runs directly in standard web browsers on desktops, tablets, and smartphones."
    }
  ];

  return (
    <main className="home-page animate-fade-in">
      {/* Hero Converter Dashboard Section */}
      <section className="hero-section" ref={converterRef}>
        <div className="hero-container container">
          <div className="hero-info animate-slide-up">
            <div className="hero-badge">
              <Sparkles size={12} className="badge-icon" /> <span>Universal Online Converter</span>
            </div>
            <h1>Convert Any File. <br />Simply.</h1>
            <p className="hero-subtext">
              Fast, secure, and modern online converter. Change formats for images, videos, Word, and PDF documents with real end-to-end processing.
            </p>
          </div>

          <div className="converter-card animate-slide-up">
            {queue.length === 0 ? (
              <DropZone 
                onFilesAdded={handleAddFiles} 
                allowedCategory="all"
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

      {/* Showcase Formats */}
      <section className="formats-section" id="formats">
        <div className="container">
          <h2 className="section-title">Supported Media Formats</h2>
          <p className="section-sub">We support wide ranges of audio, image, and video extensions.</p>
          
          <div className="formats-grid">
            <div className="format-type-card">
              <h3>Images</h3>
              <div className="format-badges">
                {FORMATS.image.map(f => (
                  <span key={f.id} className="format-pill">{f.label}</span>
                ))}
              </div>
            </div>
            <div className="format-type-card">
              <h3>Videos</h3>
              <div className="format-badges">
                {FORMATS.video.map(f => (
                  <span key={f.id} className="format-pill">{f.label}</span>
                ))}
              </div>
            </div>
            <div className="format-type-card">
              <h3>Documents</h3>
              <div className="format-badges">
                {FORMATS.document.map(f => (
                  <span key={f.id} className="format-pill">{f.label}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="how-it-works-section" id="how-it-works">
        <div className="container">
          <h2 className="section-title">Convert in 3 Simple Steps</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <h3>Upload File</h3>
              <p>Drag and drop or click browse to choose files from your device.</p>
            </div>
            <div className="step-card">
              <div className="step-number">02</div>
              <h3>Select Format</h3>
              <p>Pick output extensions like WebP, PNG, MP4, or WebM.</p>
            </div>
            <div className="step-card">
              <div className="step-number">03</div>
              <h3>Download Result</h3>
              <p>Start the conversion and download the processed media file instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="features-section" id="features">
        <div className="container">
          <h2 className="section-title">Why Use FlexConvert?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper"><Zap /></div>
              <h3>Ultra Fast</h3>
              <p>Instant conversions powered by client-side browser processors and optimized transcode cycles.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><Layers /></div>
              <h3>Batch Conversion</h3>
              <p>Queue dozens of files, customize formatting targets for each, and transcode all with one click.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper"><ShieldCheck /></div>
              <h3>Secure & Private</h3>
              <p>No backend uploads for standard images. Everything resides in local sandbox memory.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Accordion FAQ */}
      <section className="faq-section" id="faq">
        <div className="container">
          <h2 className="section-title">Frequently Asked Questions</h2>
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

      {/* Call to Action CTA */}
      <section className="cta-section">
        <div className="cta-container container">
          <h2>Ready to convert your files?</h2>
          <p>No sign-ups, no installation. Just secure file transcoding on the fly.</p>
          <button className="btn btn-primary btn-lg btn-glow" onClick={scrollToConverter}>
            Start Converting Now
          </button>
        </div>
      </section>
    </main>
  );
}
