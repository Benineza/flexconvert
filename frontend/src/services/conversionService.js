import { getFileExtension, getFormatInfo } from '../utils/fileUtils';

/**
 * Service to handle file conversion (both client-side canvas conversions and simulated conversions).
 */
export const conversionService = {
  /**
   * Convert a file to a target format.
   * @param {File} file - The file to convert
   * @param {string} targetFormat - Target extension/format id (e.g. 'webp')
   * @param {function} onProgress - Callback for progress updates (0 to 100)
   * @returns {Promise<{ blob: Blob, filename: string, size: number }>}
   */
  async convert(file, targetFormat, onProgress) {
    const inputExt = getFileExtension(file.name);
    const inputInfo = getFormatInfo(inputExt);
    const outputInfo = getFormatInfo(targetFormat);
    
    const targetLabel = outputInfo?.label || targetFormat.toUpperCase();
    const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const outputFilename = `${cleanName}.${targetFormat}`;

    // 1. Determine if we can do a real browser-side image conversion
    const isInputImage = inputInfo?.category === 'image';
    const isOutputImage = outputInfo?.category === 'image';
    
    // Supported canvas export MIME types
    const canvasSupportedMimes = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };

    if (isInputImage && isOutputImage && canvasSupportedMimes[targetFormat.toLowerCase()]) {
      return this.performCanvasImageConversion(file, targetFormat, outputFilename, canvasSupportedMimes[targetFormat.toLowerCase()], onProgress);
    }

    // 2. Otherwise, run simulated conversion for videos and advanced images
    return this.performSimulatedConversion(file, targetFormat, outputFilename, isOutputImage, targetLabel, onProgress);
  },

  /**
   * Real browser-side image conversion using Canvas.
   */
  performCanvasImageConversion(file, targetFormat, outputFilename, mimeType, onProgress) {
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
            reject(new Error('Canvas context could not be created'));
            return;
          }

          // Handle transparency for JPEG conversion by drawing a white background
          if (mimeType === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          ctx.drawImage(img, 0, 0);
          onProgress(85);

          canvas.toBlob((blob) => {
            if (blob) {
              onProgress(100);
              resolve({
                blob,
                filename: outputFilename,
                size: blob.size,
              });
            } else {
              reject(new Error('Canvas export failed'));
            }
          }, mimeType, 0.92); // 92% quality for jpeg/webp
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image file'));
        };
        
        img.src = e.target.result;
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  },

  /**
   * Simulated conversion workflow. Generates a download asset with the appropriate content.
   */
  performSimulatedConversion(file, targetFormat, outputFilename, isOutputImage, targetLabel, onProgress) {
    return new Promise((resolve) => {
      let progress = 0;
      // Adjust duration based on size: larger files take longer (min 1s, max 4s)
      const baseDuration = 1000;
      const sizeMultiplier = Math.min(3000, Math.floor(file.size / 1024 / 1024 * 100)); // 100ms per MB
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
            // Generate a real visual canvas image stating it's converted
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');
            
            // Draw gradient background
            const grad = ctx.createLinearGradient(0, 0, 800, 600);
            grad.addColorStop(0, '#7C3AED'); // Violet
            grad.addColorStop(1, '#3B82F6'); // Blue
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 800, 600);
            
            // Add styling details
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.arc(400, 300, 250, 0, Math.PI * 2);
            ctx.fill();

            // Draw text
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

            // Export canvas as image blob
            canvas.toBlob((mockBlob) => {
              resolve({
                blob: mockBlob || new Blob(['mock'], { type: 'image/png' }),
                filename: outputFilename,
                size: mockBlob ? mockBlob.size : 1024,
                isMock: true
              });
            }, 'image/png');

          } else {
            // Video or other non-image formats
            const textContent = `------------------------------------------------------\n` +
                                `UNIVERSAL FILE CONVERTER - SIMULATED DOWNLOAD\n` +
                                `------------------------------------------------------\n` +
                                `Original File: ${file.name}\n` +
                                `Original Size: ${(file.size / 1024 / 1024).toFixed(2)} MB\n` +
                                `Converted Format: ${targetLabel}\n` +
                                `Status: Simulated Conversion Success\n\n` +
                                `Note: In the production release, this file will be\n` +
                                `processed on our Java Spring Boot backend using FFmpeg\n` +
                                `and return the actual transcoded video stream.\n` +
                                `------------------------------------------------------`;
            blob = new Blob([textContent], { type: 'text/plain' });
            resolve({
              blob,
              filename: outputFilename,
              // Simulate a slightly compressed size (e.g. 80% of original)
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
