/**
 * UI Helpers — Toast notifications and navigation
 *
 * Separated from app.js to avoid circular imports.
 */

/**
 * Show a toast notification
 */
export function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Navigate to a hash route
 */
export function navigateTo(hash) {
    window.location.hash = hash;
}
