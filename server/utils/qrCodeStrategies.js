/**
 * QR Code Strategies - Industry Best Practices
 * Multiple approaches for certificate verification
 */

const crypto = require('crypto');

/**
 * Strategy 1: Self-Contained Data (RECOMMENDED)
 * QR code contains all certificate data directly
 * No internet required for basic verification
 */
function generateSelfContainedQR(certificate) {
  const qrData = {
    // Certificate identification
    id: certificate.certificateId,
    // Note: Removed verification code for security
    
    // Product information
    product: {
      name: certificate.jewelryDetails.name,
      material: certificate.jewelryDetails.material,
      karat: certificate.jewelryDetails.karat,
      weight: certificate.jewelryDetails.weight
    },
    
    // Certificate details
    certificate: {
      issueDate: certificate.certificateDetails.issueDate,
      status: certificate.certificateDetails.status
      // Note: Removed store information for privacy
    },
    
    // Purchase information
    purchase: {
      date: certificate.purchaseDetails.purchaseDate,
      price: certificate.purchaseDetails.purchasePrice,
      method: certificate.purchaseDetails.paymentMethod
      // Note: Removed customer information for privacy
    },
    
    // Verification
    verification: {
      hash: generateCertificateHash(certificate),
      timestamp: new Date().toISOString(),
      system: 'نظام نزار للتحقق من المجوهرات'
    }
    
    // Note: Removed onlineUrl to avoid localhost URLs
  };
  
  return qrData;
}

/**
 * Strategy 2: Encrypted Token
 * QR code contains encrypted token with all data
 * More secure, harder to tamper with
 */
function generateEncryptedTokenQR(certificate) {
  const secretKey = process.env.CERTIFICATE_SECRET || 'your-secret-key';
  
  const tokenData = {
    id: certificate.certificateId,
    code: certificate.certificateDetails.verificationCode,
    product: certificate.jewelryDetails.name,
    material: certificate.jewelryDetails.material,
    karat: certificate.jewelryDetails.karat,
    weight: certificate.jewelryDetails.weight,
    issueDate: certificate.certificateDetails.issueDate,
    status: certificate.certificateDetails.status,
    store: certificate.store?.username || 'نزار للمجوهرات',
    purchaseDate: certificate.purchaseDetails.purchaseDate,
    price: certificate.purchaseDetails.purchasePrice,
    customer: certificate.customer?.username || '',
    timestamp: Date.now()
  };
  
  // Encrypt the data
  const cipher = crypto.createCipher('aes-256-cbc', secretKey);
  let encrypted = cipher.update(JSON.stringify(tokenData), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    token: encrypted,
    version: '1.0',
    system: 'نزار للمجوهرات',
    // Fallback URL for online verification
    onlineUrl: `${process.env.FRONTEND_URL || 'http://localhost:3002'}/verify/${encrypted}`
  };
}

/**
 * Strategy 3: URL-based QR Code (SIMPLE & EFFECTIVE)
 * QR code contains URL that opens certificate page
 * Works like normal QR codes
 */
function generateHybridQR(certificate) {
  // Get the frontend URL
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
  
  // Return just the URL that opens the certificate page
  return `${frontendUrl}/certificate/${certificate.certificateId}`;
}

/**
 * Strategy 4: Blockchain-style Hash
 * Creates tamper-proof hash of certificate data
 */
function generateBlockchainStyleQR(certificate) {
  const dataString = [
    certificate.certificateId,
    certificate.certificateDetails.verificationCode,
    certificate.jewelryDetails.name,
    certificate.jewelryDetails.material,
    certificate.jewelryDetails.karat,
    certificate.jewelryDetails.weight,
    certificate.certificateDetails.issueDate,
    certificate.certificateDetails.status,
    certificate.store?.username || 'نزار للمجوهرات',
    certificate.purchaseDetails.purchaseDate,
    certificate.purchaseDetails.purchasePrice,
    certificate.customer?.username || ''
  ].join('|');
  
  const hash = crypto.createHash('sha256').update(dataString).digest('hex');
  
  return {
    id: certificate.certificateId,
    hash: hash,
    data: {
      product: certificate.jewelryDetails.name,
      material: certificate.jewelryDetails.material,
      karat: certificate.jewelryDetails.karat,
      weight: certificate.jewelryDetails.weight,
      issueDate: certificate.certificateDetails.issueDate,
      status: certificate.certificateDetails.status,
      store: certificate.store?.username || 'نزار للمجوهرات'
    },
    verification: {
      hash: hash,
      timestamp: new Date().toISOString(),
      system: 'نظام نزار للتحقق من المجوهرات'
    },
    // Online verification
    onlineUrl: `${process.env.FRONTEND_URL || 'http://localhost:3002'}/verify-hash/${hash}`
  };
}

/**
 * Generate certificate hash for tamper detection
 */
function generateCertificateHash(certificate) {
  const dataToHash = [
    certificate.certificateId,
    certificate.certificateDetails.verificationCode,
    certificate.jewelryDetails.name,
    certificate.jewelryDetails.material,
    certificate.jewelryDetails.karat,
    certificate.jewelryDetails.weight,
    certificate.certificateDetails.issueDate,
    certificate.certificateDetails.status,
    certificate.store?._id?.toString() || '',
    certificate.customer?._id?.toString() || ''
  ].join('|');
  
  return crypto.createHash('sha256').update(dataToHash).digest('hex');
}

/**
 * Verify certificate hash
 */
function verifyCertificateHash(certificate, providedHash) {
  const calculatedHash = generateCertificateHash(certificate);
  return calculatedHash === providedHash;
}

module.exports = {
  generateSelfContainedQR,
  generateEncryptedTokenQR,
  generateHybridQR,
  generateBlockchainStyleQR,
  generateCertificateHash,
  verifyCertificateHash
};
