export const FORMATS = {
  image: [
    { id: 'png', ext: 'png', mime: 'image/png', label: 'PNG', preview: true, isInput: true, isOutput: true },
    { id: 'jpg', ext: 'jpg', mime: 'image/jpeg', label: 'JPG', preview: true, isInput: true, isOutput: true },
    { id: 'jpeg', ext: 'jpeg', mime: 'image/jpeg', label: 'JPEG', preview: true, isInput: true, isOutput: true },
    { id: 'webp', ext: 'webp', mime: 'image/webp', label: 'WebP', preview: true, isInput: true, isOutput: true },
    { id: 'avif', ext: 'avif', mime: 'image/avif', label: 'AVIF', preview: true, isInput: true, isOutput: true },
    { id: 'tiff', ext: 'tiff', mime: 'image/tiff', label: 'TIFF', preview: false, isInput: true, isOutput: true },
    { id: 'svg', ext: 'svg', mime: 'image/svg+xml', label: 'SVG', preview: true, isInput: true, isOutput: true },
    { id: 'ico', ext: 'ico', mime: 'image/x-icon', label: 'ICO', preview: true, isInput: true, isOutput: true },
    { id: 'gif', ext: 'gif', mime: 'image/gif', label: 'GIF', preview: true, isInput: true, isOutput: true },
  ],
  video: [
    { id: 'mp4', ext: 'mp4', mime: 'video/mp4', label: 'MP4', preview: true, isInput: true, isOutput: true },
    { id: 'mov', ext: 'mov', mime: 'video/quicktime', label: 'MOV', preview: true, isInput: true, isOutput: true },
    { id: 'mkv', ext: 'mkv', mime: 'video/x-matroska', label: 'MKV', preview: false, isInput: true, isOutput: true },
    { id: 'webm', ext: 'webm', mime: 'video/webm', label: 'WebM', preview: true, isInput: true, isOutput: true },
    { id: 'avi', ext: 'avi', mime: 'video/x-msvideo', label: 'AVI', preview: false, isInput: true, isOutput: true },
  ],
  document: [
    { id: 'pdf', ext: 'pdf', mime: 'application/pdf', label: 'PDF', preview: true, isInput: true, isOutput: true },
    { id: 'docx', ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'DOCX', preview: false, isInput: true, isOutput: true },
    { id: 'txt', ext: 'txt', mime: 'text/plain', label: 'TXT', preview: true, isInput: true, isOutput: true },
    { id: 'pptx', ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', label: 'PPTX', preview: false, isInput: true, isOutput: true },
  ]
};

// Global max file size limit (100 MB)
export const MAX_FILE_SIZE = 100 * 1024 * 1024;
export const MAX_FILE_SIZE_LABEL = '100 MB';

/**
 * Gets format details (ext, category, label) by file extension or name.
 * Placed here to avoid circular imports.
 */
export function getFormatDetails(filenameOrExt) {
  const ext = filenameOrExt.includes('.') 
    ? filenameOrExt.split('.').pop().toLowerCase() 
    : filenameOrExt.toLowerCase();
  
  for (const cat of ['image', 'video', 'document']) {
    const item = FORMATS[cat].find(f => f.ext === ext);
    if (item) {
      return { ...item, category: cat };
    }
  }
  return null;
}

/**
 * Get list of available output formats based on input extension.
 * Drives dynamic dropdown content.
 */
export function getAvailableOutputs(inputExt) {
  const info = getFormatDetails(inputExt);
  if (!info) return [];

  const imageOutputs = FORMATS.image.map(f => f.ext);

  if (info.category === 'image') {
    // Images convert to other image formats, plus PDF
    return [...imageOutputs, 'pdf'].filter(ext => ext !== inputExt);
  }

  if (info.category === 'video') {
    // Videos convert to other video formats
    return FORMATS.video.map(f => f.ext).filter(ext => ext !== inputExt);
  }

  if (inputExt === 'pdf') {
    // PDF converts to image formats plus document formats (DOCX, PPTX, TXT)
    return [...imageOutputs, 'docx', 'pptx', 'txt'];
  }

  if (inputExt === 'docx' || inputExt === 'txt' || inputExt === 'pptx') {
    // Word, Text, Presentation convert to PDF
    return ['pdf'];
  }

  return [];
}
