/**
 * assetHelper.js — Shared asset URL resolver
 *
 * Priority: VITE_API_BASE_URL env var → window.location.origin (same-origin fallback)
 * Handles: /api/asset/:id paths, /uploads/ legacy paths, absolute URLs, data URIs, raw base64.
 */

const DEBUG_ASSETS = import.meta.env.DEV;

/**
 * Resolves a raw asset path to an absolute URL.
 * @param {string} rawPath
 * @param {{ download?: boolean }} opts
 */
export const resolveAssetUrl = (rawPath, opts = {}) => {
    if (!rawPath) return rawPath;
    if (rawPath.startsWith('http') || rawPath.startsWith('data:')) return rawPath;

    if (rawPath.startsWith('/api/') || rawPath.startsWith('/uploads/')) {
        const vBase = import.meta.env.VITE_API_BASE_URL;
        
        // If VITE_API_BASE_URL is explicitly set, use it
        if (vBase) {
            const qs = opts.download ? '?download=1' : '';
            return `${vBase}${rawPath}${qs}`;
        }

        // Production fallback for sub-path awareness (proxied environments)
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        const isDev = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';

        if (!isDev) {
            // In production, we assume a HashRouter-like environment where './' is the app root.
            // This is safer for sub-path deployments (e.g. /stride/ or /staging/).
            const appBase = import.meta.env.BASE_URL || './';
            const cleanBase = appBase.endsWith('/') ? appBase : `${appBase}/`;
            const cleanPath = rawPath.startsWith('/') ? rawPath.substring(1) : rawPath;
            const qs = opts.download ? '?download=1' : '';
            return `${cleanBase}${cleanPath}${qs}`;
        }

        // Development fallback
        const origin = window.location.origin;
        const qs = opts.download ? '?download=1' : '';
        return `${origin}${rawPath}${qs}`;
    }

    return rawPath;
};

/**
 * Resolves a document field (path, data URI, or raw base64) to a usable href.
 * @param {string} value
 * @param {{ download?: boolean }} opts
 */
export const resolveDocUrl = (value, opts = {}) => {
    if (!value) return '#';
    if (value.startsWith('data:') || value.startsWith('http')) return value;
    if (value.startsWith('/')) return resolveAssetUrl(value, opts);
    // Legacy: raw base64 string
    return `data:application/pdf;base64,${value}`;
};
