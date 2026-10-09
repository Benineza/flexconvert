import { useState, useRef } from 'react';
import { UploadCloud, FileWarning } from 'lucide-react';
import { validateFile } from '../utils/validation';
import './DropZone.css';

export default function DropZone({ onFilesAdded, allowedCategory = 'all', queue = [] }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const fileInputRef = useRef(null);

  // Filter format details based on category (image, video, document, or all)
  const getSubText = () => {
    if (allowedCategory === 'image') {
      return 'Supports PNG, JPG, JPEG, WebP, AVIF, TIFF, SVG, ICO, GIF';
    }
    if (allowedCategory === 'video') {
      return 'Supports MP4, MOV, MKV, WebM, AVI';
    }
    if (allowedCategory === 'document' || allowedCategory === 'pdf') {
      return 'Supports PDF, Word (DOCX), Text (TXT), PowerPoint (PPTX), and Images';
    }
    return 'Supports PDF, Word (DOCX), TXT, PPTX, Images (PNG, JPG, WebP...), and Videos (MP4, MOV...)';
  };

  const processFiles = (filesList) => {
    setErrorMsg(null);
    const addedFiles = [];
    let errorCount = 0;
    let lastError = null;

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      
      // Category level pre-filtering
      if (allowedCategory !== 'all') {
        const fileType = file.type || '';
        const isImage = fileType.startsWith('image/');
        const isVideo = fileType.startsWith('video/');
        
        if (allowedCategory === 'image' && !isImage && !file.name.match(/\.(png|jpg|jpeg|webp|avif|tiff|svg|ico|gif)$/i)) {
          errorCount++;
          lastError = `"${file.name}" is not an image file.`;
          continue;
        }
        if (allowedCategory === 'video' && !isVideo && !file.name.match(/\.(mp4|mov|mkv|webm|avi)$/i)) {
          errorCount++;
          lastError = `"${file.name}" is not a video file.`;
          continue;
        }
        if ((allowedCategory === 'document' || allowedCategory === 'pdf') && 
            !file.name.match(/\.(pdf|docx|txt|pptx|png|jpg|jpeg|webp|avif|tiff|svg|ico|gif)$/i)) {
          errorCount++;
          lastError = `"${file.name}" is not a supported document or image format.`;
          continue;
        }
      }

      const validation = validateFile(file, queue);
      if (validation.valid) {
        addedFiles.push(file);
      } else {
        errorCount++;
        lastError = validation.error;
      }
    }

    if (addedFiles.length > 0) {
      onFilesAdded(addedFiles);
    }

    if (errorCount > 0) {
      setErrorMsg(lastError || 'Some files could not be uploaded.');
      // Auto-clear error message after 6 seconds
      setTimeout(() => setErrorMsg(null), 6000);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  // Enable keyboard activation (Space/Enter) on the dropzone card itself
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onButtonClick();
    }
  };

  return (
    <div className="dropzone-container">
      <div 
        className={`dropzone-card ${isDragActive ? 'drag-active' : ''} ${errorMsg ? 'has-error' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label="Upload files by dragging and dropping here or clicking to browse"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="dropzone-file-input"
          multiple
          onChange={handleChange}
          accept={
            allowedCategory === 'image' 
              ? 'image/*' 
              : allowedCategory === 'video' 
                ? 'video/*' 
                : allowedCategory === 'document' || allowedCategory === 'pdf'
                  ? '.pdf,.docx,.txt,.pptx,image/*'
                  : 'image/*,video/*,.pdf,.docx,.txt,.pptx'
          }
        />
        
        <div className="dropzone-content animate-fade-in">
          <div className="dropzone-icon-wrapper">
            <UploadCloud className="dropzone-icon" />
          </div>
          <h3>
            Drag & drop files here or <span className="browse-link">browse</span>
          </h3>
          <p className="dropzone-subtext">{getSubText()}</p>
        </div>
      </div>

      {errorMsg && (
        <div className="dropzone-error-banner animate-slide-up">
          <FileWarning size={18} className="error-banner-icon" />
          <span className="error-banner-text">{errorMsg}</span>
          <button className="error-banner-close" onClick={() => setErrorMsg(null)} aria-label="Close error">&times;</button>
        </div>
      )}
    </div>
  );
}
