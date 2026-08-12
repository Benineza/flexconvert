import { MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL } from '../constants/formats';
import { getFormatInfo } from './fileUtils';

/**
 * Validates an uploaded file.
 * Returns { valid: boolean, error: string | null }
 */
export function validateFile(file, queue = []) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  // Size limit validation
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `File "${file.name}" is too large. Max size limit is ${MAX_FILE_SIZE_LABEL}.` 
    };
  }

  // File type validation
  const info = getFormatInfo(file.name);
  if (!info) {
    return { 
      valid: false, 
      error: `File format for "${file.name}" isn't supported yet.` 
    };
  }

  // Duplicate checks in current conversion queue
  const isDuplicate = queue.some(
    item => item.file.name === file.name && item.file.size === file.size
  );
  if (isDuplicate) {
    return {
      valid: false,
      error: `"${file.name}" is already in your conversion queue.`
    };
  }

  return { valid: true, error: null };
}
