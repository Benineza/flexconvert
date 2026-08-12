import { FORMATS } from '../constants/formats';

/**
 * Format bytes to a human readable string.
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get file extension (lowercase, without dot).
 */
export function getFileExtension(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Get format details (ext, category, label) by file extension or name.
 */
export function getFormatInfo(filenameOrExt) {
  const ext = filenameOrExt.includes('.') ? getFileExtension(filenameOrExt) : filenameOrExt.toLowerCase();
  
  for (const cat of ['image', 'video']) {
    const item = FORMATS[cat].find(f => f.ext === ext);
    if (item) {
      return { ...item, category: cat };
    }
  }
  return null;
}

/**
 * Download a blob/url as a file in the browser.
 */
export function downloadFile(blobOrUrl, filename) {
  const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (typeof blobOrUrl !== 'string') {
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}
