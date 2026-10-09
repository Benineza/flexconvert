const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = (rawBaseUrl && rawBaseUrl.trim() !== '')
  ? rawBaseUrl.trim().replace(/\/+$/, '')
  : (import.meta.env.DEV ? 'http://localhost:8080' : '');

/**
 * Service to handle real file conversion through the Spring Boot REST API.
 * All mock/simulated delays and placeholder generators have been completely removed.
 */
export const conversionService = {
  /**
   * Convert a file or array of files to a target format using the real backend API.
   * @param {File|File[]} fileOrFiles - The file(s) to convert
   * @param {string} targetFormat - Target extension/format id (e.g. 'webp', 'pdf', 'docx')
   * @param {function} onProgress - Callback for progress updates (0 to 100)
   * @param {object} options - Conversion settings (quality, range, size, orientation, fit)
   * @returns {Promise<{ blob: Blob, filename: string, size: number, isMultiFile?: boolean }>}
   */
  async convert(fileOrFiles, targetFormat, onProgress = () => {}, options = {}) {
    onProgress(5);

    const formData = new FormData();
    formData.append('targetFormat', targetFormat);

    const isMultiInput = Array.isArray(fileOrFiles);
    if (isMultiInput) {
      fileOrFiles.forEach(file => {
        formData.append('files', file);
      });
    } else {
      formData.append('file', fileOrFiles);
    }

    // Append conversion settings if present
    if (options.pageSelection) formData.append('pageSelection', options.pageSelection);
    if (options.pageStart != null) formData.append('pageStart', options.pageStart);
    if (options.pageEnd != null) formData.append('pageEnd', options.pageEnd);
    if (options.quality != null) formData.append('quality', options.quality);
    if (options.dpi != null) formData.append('dpi', options.dpi);
    if (options.pageSize) formData.append('pageSize', options.pageSize);
    if (options.orientation) formData.append('orientation', options.orientation);
    if (options.imageFit) formData.append('imageFit', options.imageFit);

    onProgress(15);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/api/convert`, true);
      xhr.responseType = 'blob';

      // Authentic network upload progress (15% - 65%)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = 15 + Math.round((e.loaded / e.total) * 50);
          onProgress(Math.min(percent, 65));
        }
      };

      // Server is converting the file (65% - 90%)
      xhr.upload.onload = () => {
        onProgress(75);
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);

          const blob = xhr.response;
          let filename = 'converted-file.' + targetFormat;

          // Parse Content-Disposition header to get server's computed output filename
          const disposition = xhr.getResponseHeader('Content-Disposition');
          if (disposition) {
            const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1].replace(/['"]/g, '').trim();
            }
          } else {
            const originalName = isMultiInput ? fileOrFiles[0].name : fileOrFiles.name;
            const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
            filename = `${baseName}.${targetFormat}`;
          }

          resolve({
            blob,
            filename,
            size: blob.size,
            isMultiFile: filename.endsWith('.zip')
          });
        } else {
          // Parse JSON error response from backend
          try {
            const errorText = await xhr.response.text();
            const errorJson = JSON.parse(errorText);
            reject(new Error(errorJson.message || `Conversion failed (${xhr.status})`));
          } catch {
            reject(new Error(`Conversion failed with HTTP status ${xhr.status}: ${xhr.statusText}`));
          }
        }
      };

      xhr.onerror = () => {
        const targetDesc = API_BASE_URL ? `at ${API_BASE_URL}` : 'on the server';
        reject(new Error(`Network error: Unable to connect to backend server ${targetDesc}. Please check your connection and ensure the backend service is running.`));
      };

      xhr.ontimeout = () => {
        reject(new Error('Conversion request timed out.'));
      };

      xhr.send(formData);
    });
  },

  /**
   * Health check to test backend connectivity.
   */
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === 'UP';
    } catch {
      return false;
    }
  }
};
