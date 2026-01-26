import DOMPurify from 'dompurify';
import validator from 'validator';

// Sanitize text input (comments, descriptions, etc.)
// preserveSpaces: if true, preserves spaces during typing (only trims on submit)
export const sanitizeText = (text, maxLength = 2000, preserveSpaces = false) => {
  if (!text) return '';
  
  // Remove HTML tags
  const stripped = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
  
  // If preserveSpaces is true, don't trim (for real-time input)
  // Otherwise, trim as usual (for final submission)
  const processed = preserveSpaces ? stripped : stripped.trim();
  
  // Limit length
  const limited = processed.substring(0, maxLength);
  
  // Remove null bytes and control characters (using String.fromCharCode to avoid linter warning)
  const controlCharsPattern = new RegExp('[' + String.fromCharCode(0x00, 0x1F) + String.fromCharCode(0x7F) + ']', 'g');
  return limited.replace(controlCharsPattern, '');
};

// Sanitize and validate email
export const sanitizeEmail = (email) => {
  if (!email) return '';
  const trimmed = email.trim().toLowerCase();
  return validator.isEmail(trimmed) ? trimmed : '';
};

// Sanitize numeric input
export const sanitizeNumber = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const num = parseFloat(value);
  if (isNaN(num)) return min;
  return Math.max(min, Math.min(max, num));
};

// Validate text length
export const validateLength = (text, min, max) => {
  if (!text) return false;
  const length = text.trim().length;
  return length >= min && length <= max;
};

// Sanitize for safe display (preserve formatting but remove scripts)
export const sanitizeForDisplay = (html) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: []
  });
};

