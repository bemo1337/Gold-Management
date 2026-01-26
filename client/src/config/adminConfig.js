// Admin configuration for security
// This file centralizes admin-related settings, especially for route obfuscation

// Get admin login path from environment variable or use unpredictable default
// Default: admin-nizarjewellery (harder to guess than /admin)
// In production, set REACT_APP_ADMIN_PATH to a custom path for additional security
export const ADMIN_PATH = process.env.REACT_APP_ADMIN_PATH || '/admin-nizarjewellery';

// Get owner/admin dashboard base path from environment variable or use unpredictable default
// Default: owner-nizarjewellery (harder to guess than /owner)
// In production, set REACT_APP_OWNER_BASE_PATH to a custom path for additional security
// This obfuscates all admin routes like /owner/dashboard, /owner/products, etc.
export const OWNER_BASE_PATH = process.env.REACT_APP_OWNER_BASE_PATH || '/owner-nizarjewellery';

/**
 * Helper function to build owner paths
 * @param {string} subPath - The sub-path (e.g., 'dashboard', 'products/add')
 * @returns {string} Full path (e.g., '/owner-nizarjewellery/dashboard')
 */
export const getOwnerPath = (subPath = '') => {
  const base = OWNER_BASE_PATH.replace(/\/$/, ''); // Remove trailing slash
  const path = subPath.replace(/^\//, ''); // Remove leading slash
  return path ? `${base}/${path}` : base;
};

