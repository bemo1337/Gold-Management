// Lightweight toast notification system for Railway deployment
// Railway captures stdout/stderr, so we use console for logging errors server-side
// Client-side uses simple DOM-based toasts

let toastContainer = null;

const createToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
};

const removeToast = (toastElement) => {
  toastElement.style.opacity = '0';
  toastElement.style.transform = 'translateX(100%)';
  setTimeout(() => {
    if (toastElement.parentNode) {
      toastElement.parentNode.removeChild(toastElement);
    }
  }, 300);
};

const showToast = (message, type = 'info', duration = 4000) => {
  const container = createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `pointer-events-auto min-w-[300px] max-w-[500px] p-4 rounded-lg shadow-lg border transform transition-all duration-300 translate-x-0 opacity-100 ${
    type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
    type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
    type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
    'bg-blue-50 border-blue-200 text-blue-800'
  }`;
  
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
  
  toast.innerHTML = `
    <div class="flex items-start gap-3">
      <span class="text-lg font-semibold">${icon}</span>
      <div class="flex-1">
        <p class="text-sm font-medium">${message}</p>
      </div>
      <button onclick="this.parentElement.parentElement.style.opacity='0'; setTimeout(() => this.parentElement.parentElement.remove(), 300)" 
              class="text-current opacity-50 hover:opacity-100">
        <span>×</span>
      </button>
    </div>
  `;
  
  container.appendChild(toast);
  
  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }
  
  return toast;
};

// Log errors to console for Railway logging (Railway captures stdout/stderr)
export const logError = (error, context = '') => {
  const errorMessage = error?.message || String(error);
  const errorStack = error?.stack;
  
  // Railway logs stdout/stderr, so console.error is captured
  if (process.env.NODE_ENV === 'production') {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      context,
      message: errorMessage,
      stack: errorStack
    }));
  } else {
    console.error(`[${context}]`, error);
  }
};

export const toast = {
  success: (message, duration) => showToast(message, 'success', duration),
  error: (message, duration) => {
    showToast(message, 'error', duration);
    // In production, errors are logged to Railway via console
    if (process.env.NODE_ENV === 'production') {
      logError(new Error(message), 'Toast Error');
    }
  },
  warning: (message, duration) => showToast(message, 'warning', duration),
  info: (message, duration) => showToast(message, 'info', duration),
};

export default toast;

