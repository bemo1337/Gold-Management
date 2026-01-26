/**
 * URL Helper - Environment-aware URL generation
 * Handles both development and production environments
 */

/**
 * Get the base URL for the frontend application
 * @returns {string} The base URL for the frontend
 */
function getFrontendUrl() {
  // If FRONTEND_URL is explicitly set, use it
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }

  // In production, try to detect the domain automatically
  if (process.env.NODE_ENV === 'production') {
    // Check if we're running on Railway
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    }
    
    // Check if we're running on Vercel
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`;
    }
    
    // Check if we're running on Heroku
    if (process.env.HEROKU_APP_NAME) {
      return `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;
    }
    
    // Check if we're running on Netlify
    if (process.env.NETLIFY_URL) {
      return process.env.NETLIFY_URL;
    }
    
    // Fallback for production - you should set FRONTEND_URL in your environment
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      category: 'CONFIG',
      event: 'FRONTEND_URL_NOT_SET',
      details: { message: 'FRONTEND_URL not set in production. Using fallback URL.' }
    }));
    return 'https://your-production-domain.com'; // Replace with your actual domain
  }

  // Development fallback
  return 'http://localhost:3002';
}

/**
 * Generate a certificate URL
 * @param {string} certificateId - The certificate ID
 * @returns {string} The full certificate URL
 */
function getCertificateUrl(certificateId) {
  const baseUrl = getFrontendUrl();
  return `${baseUrl}/certificate/${certificateId}`;
}

/**
 * Generate a verification URL
 * @param {string} certificateId - The certificate ID
 * @returns {string} The full verification URL
 */
function getVerificationUrl(certificateId) {
  const baseUrl = getFrontendUrl();
  return `${baseUrl}/verify-certificate/${certificateId}`;
}

/**
 * Get the current environment info for debugging
 * @returns {object} Environment information
 */
function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    frontendUrl: process.env.FRONTEND_URL,
    railwayDomain: process.env.RAILWAY_PUBLIC_DOMAIN,
    vercelUrl: process.env.VERCEL_URL,
    herokuApp: process.env.HEROKU_APP_NAME,
    netlifyUrl: process.env.NETLIFY_URL,
    detectedUrl: getFrontendUrl()
  };
}

module.exports = {
  getFrontendUrl,
  getCertificateUrl,
  getVerificationUrl,
  getEnvironmentInfo
};
