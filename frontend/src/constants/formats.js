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
  ]
};

// Global max file size limit (100 MB)
export const MAX_FILE_SIZE = 100 * 1024 * 1024;
export const MAX_FILE_SIZE_LABEL = '100 MB';
