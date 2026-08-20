import { getFileExtension, getFormatInfo } from '../utils/fileUtils';

/**
 * Service to handle file conversion (both client-side canvas conversions and simulated conversions).
 */
export const conversionService = {
  /**
   * Convert a file or array of files to a target format.
   * @param {File|File[]} fileOrFiles - The file(s) to convert
   * @param {string} targetFormat - Target extension/format id (e.g. 'webp', 'pdf')
   * @param {function} onProgress - Callback for progress updates (0 to 100)
   * @param {object} options - Conversion settings (quality, range, size, etc.)
   * @returns {Promise<{ blob?: Blob, files?: Array<{blob: Blob, filename: string, size: number}>, filename: string, size: number, isMultiFile?: boolean }>}
   */
  async convert(fileOrFiles, targetFormat, onProgress, options = {}) {
    const isMultiInput = Array.isArray(fileOrFiles);
    
    // 1. Image compilation to PDF (Multiple Images -> single PDF)
    if (targetFormat.toLowerCase() === 'pdf' && (isMultiInput || getFormatInfo(fileOrFiles.name)?.category === 'image')) {
      return this.compileImagesToPdf(fileOrFiles, onProgress, options);
    }

    // 2. Single PDF input to Image formats (PDF -> PNG/JPG/WebP...)
    if (!isMultiInput && getFileExtension(fileOrFiles.name) === 'pdf') {
      return this.convertPdfToImages(fileOrFiles, targetFormat, onProgress, options);
    }

    // 3. Fallback to existing standard image & video converter routines
    return this.performStandardConversion(fileOrFiles, targetFormat, onProgress);
  },

  /**
   * Real/Simulated image to PDF compiler.
   */
  compileImagesToPdf(fileOrFiles, onProgress, options) {
    return new Promise((resolve) => {
      onProgress(10);
      const files = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
      const { pageSize = 'A4', orientation = 'portrait', imageFit = 'fit' } = options;
      
      let progress = 10;
      const totalDuration = 1500 + files.length * 100;
      const step = 100;
      const increment = 90 / (totalDuration / step);

      const interval = setInterval(() => {
        progress += increment;
        if (progress >= 98) {
          clearInterval(interval);
          onProgress(100);

          // Generate simulated PDF containing layout info, image names, sizes, fits
          const fileLines = files.map((f, i) => `Page ${i + 1}: ${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join('\n');
          const textContent = `%PDF-1.4\n` +
                              `% FlexConvert Image to PDF Document Compiler\n` +
                              `%-----------------------------------------\n` +
                              `Document Options:\n` +
                              `- Page Size: ${pageSize.toUpperCase()}\n` +
                              `- Orientation: ${orientation.toUpperCase()}\n` +
                              `- Image Fit: ${imageFit.toUpperCase()}\n` +
                              `-----------------------------------------\n` +
                              `Compiled Images Info:\n` +
                              `${fileLines}\n` +
                              `-----------------------------------------\n` +
                              `Note: This is a simulated PDF file generated in the browser.\n` +
                              `In the production Spring Boot release, this stream will contain\n` +
                              `an Adobe-compliant PDF binary with embedded vector images.`;
          
          const blob = new Blob([textContent], { type: 'application/pdf' });
          const cleanName = files[0].name.substring(0, files[0].name.lastIndexOf('.')) || 'document';
          const filename = files.length > 1 ? `compiled-images.pdf` : `${cleanName}.pdf`;

          resolve({
            blob,
            filename,
            size: blob.size,
          });
        } else {
          onProgress(Math.round(progress));
        }
      }, step);
    });
  },

  /**
   * Real/Simulated PDF to Image splitter.
   */
  convertPdfToImages(file, targetFormat, onProgress, options) {
    return new Promise((resolve) => {
      onProgress(10);
      const { pageSelection = 'all', pageStart = 1, pageEnd = 1, totalPages = 5 } = options;

      const start = pageSelection === 'all' ? 1 : Math.max(1, parseInt(pageStart) || 1);
      const end = pageSelection === 'all' ? totalPages : Math.min(totalPages, Math.max(start, parseInt(pageEnd) || 1));
      const targetCount = end - start + 1;

      let progress = 10;
      // Duration scales with output pages count
      const totalDuration = 1000 + targetCount * 300;
      const step = 100;
      const increment = 90 / (totalDuration / step);

      const interval = setInterval(() => {
        progress += increment;
        if (progress >= 98) {
          clearInterval(interval);
          onProgress(100);

          const resultFiles = [];
          const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || 'document';

          // Generate PNG canvas cards for each page in range
          for (let p = start; p <= end; p++) {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 1100; // Letter/A4 aspect ratio
            const ctx = canvas.getContext('2d');
            
            // Draw clean page borders and gradient background
            const grad = ctx.createLinearGradient(0, 0, 800, 1100);
            grad.addColorStop(0, '#1e293b'); // Dark Slate
            grad.addColorStop(1, '#0f172a');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 800, 1100);

            // Frame accent border
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 10;
            ctx.strokeRect(20, 20, 760, 1060);

            // Render descriptive metadata text
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`PAGE ${p} OF PDF CONVERSION`, 400, 200);

            ctx.font = '20px sans-serif';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(`Source Document: ${file.name}`, 400, 280);
            ctx.fillText(`Output Format: ${targetFormat.toUpperCase()}`, 400, 320);
            ctx.fillText(`Quality Option: ${options.quality || 'High'}`, 400, 360);
            ctx.fillText(`Resolution DPI: ${options.dpi || 150}`, 400, 400);

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 40px sans-serif';
            ctx.fillText(`[ Page ${p} Canvas Graphics ]`, 400, 600);

            // Mock graphic details
            ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
            ctx.fillRect(100, 700, 600, 200);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '16px sans-serif';
            ctx.fillText('This visual canvas simulates a high-fidelity image export of your PDF.', 400, 780);
            ctx.fillText('Perfect for client-side sandbox testing.', 400, 810);

            // We export canvas to dataUrl or Blob
            // Canvas standard supports image/png or image/jpeg
            const mimeType = targetFormat.toLowerCase() === 'png' ? 'image/png' : 'image/jpeg';
            
            // To make it synchronous or simple, we create standard sync Blob representation or export
            const dataUrl = canvas.toDataURL(mimeType);
            const byteString = atob(dataUrl.split(',')[1]);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const pageBlob = new Blob([ab], { type: mimeType });

            resultFiles.push({
              blob: pageBlob,
              filename: `${cleanName}-page-${p}.${targetFormat}`,
              size: pageBlob.size
            });
          }

          resolve({
            files: resultFiles,
            filename: `${cleanName}-converted-pages`,
            size: resultFiles.reduce((acc, f) => acc + f.size, 0),
            isMultiFile: true
          });
        } else {
          onProgress(Math.round(progress));
        }
      }, step);
    });
  },

  /**
   * Original standard conversion routine.
   */
  async performStandardConversion(file, targetFormat, onProgress) {
    const inputExt = getFileExtension(file.name);
    const inputInfo = getFormatInfo(inputExt);
    const outputInfo = getFormatInfo(targetFormat);
    
    const targetLabel = outputInfo?.label || targetFormat.toUpperCase();
    const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const outputFilename = `${cleanName}.${targetFormat}`;

    const isInputImage = inputInfo?.category === 'image';
    const isOutputImage = outputInfo?.category === 'image';
    
    const canvasSupportedMimes = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };

    if (isInputImage && isOutputImage && canvasSupportedMimes[targetFormat.toLowerCase()]) {
      return new Promise((resolve, reject) => {
        onProgress(10);
        const reader = new FileReader();
        reader.onload = (e) => {
          onProgress(30);
          const img = new Image();
          img.onload = () => {
            onProgress(60);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas context failed'));
              return;
            }
            if (canvasSupportedMimes[targetFormat.toLowerCase()] === 'image/jpeg') {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, 0, 0);
            onProgress(85);
            canvas.toBlob((blob) => {
              if (blob) {
                onProgress(100);
                resolve({ blob, filename: outputFilename, size: blob.size });
              } else {
                reject(new Error('Canvas export failed'));
              }
            }, canvasSupportedMimes[targetFormat.toLowerCase()], 0.92);
          };
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(file);
      });
    }

    // Default simulation logic for video converters
    return new Promise((resolve) => {
      let progress = 0;
      const baseDuration = 1000;
      const sizeMultiplier = Math.min(3000, Math.floor(file.size / 1024 / 1024 * 100));
      const totalDuration = baseDuration + sizeMultiplier;
      const step = 100;
      const progressIncrement = 100 / (totalDuration / step);

      const interval = setInterval(() => {
        progress += progressIncrement;
        if (progress >= 95) {
          clearInterval(interval);
          onProgress(100);
          
          let blob;
          if (isOutputImage) {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');
            const grad = ctx.createLinearGradient(0, 0, 800, 600);
            grad.addColorStop(0, '#7C3AED');
            grad.addColorStop(1, '#3B82F6');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 800, 600);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(400, 300, 250, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('CONVERTED FILE PREVIEW', 400, 240);
            ctx.font = '20px sans-serif';
            ctx.fillStyle = '#E0E7FF';
            ctx.fillText(`Original: ${file.name}`, 400, 300);
            ctx.fillText(`Converted to: ${targetLabel}`, 400, 340);
            ctx.font = 'bold 28px sans-serif';
            ctx.fillStyle = '#F59E0B';
            ctx.fillText(`[ Mock ${targetLabel} Image ]`, 400, 420);

            canvas.toBlob((mockBlob) => {
              resolve({
                blob: mockBlob || new Blob(['mock'], { type: 'image/png' }),
                filename: outputFilename,
                size: mockBlob ? mockBlob.size : 1024,
                isMock: true
              });
            }, 'image/png');
          } else {
            const textContent = `-----------------------------------------\n` +
                                `UNIVERSAL FILE CONVERTER - SIMULATED DOWNLOAD\n` +
                                `-----------------------------------------\n` +
                                `Original File: ${file.name}\n` +
                                `Converted Format: ${targetLabel}\n` +
                                `Status: Success\n` +
                                `-----------------------------------------`;
            blob = new Blob([textContent], { type: 'text/plain' });
            resolve({
              blob,
              filename: outputFilename,
              size: Math.round(file.size * 0.82),
              isMock: true
            });
          }
        } else {
          onProgress(Math.min(95, Math.round(progress)));
        }
      }, step);
    });
  }
};
