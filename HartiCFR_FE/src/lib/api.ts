// In production the API is proxied under the site's own origin (see the
// /api rewrite in render.yaml). Same-origin requests keep the auth cookie
// first-party, which Safari requires: it blocks third-party cookies, so a
// cross-site API subdomain silently drops the login session.
const base = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:5016" : "");

export const API_BASE = base.replace(/\/$/, "");

export function apiUrl(path: string) {
    return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
