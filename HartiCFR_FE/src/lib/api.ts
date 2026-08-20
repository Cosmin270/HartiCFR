const base = import.meta.env.VITE_API_URL ?? "http://localhost:5016";

export const API_BASE = base.replace(/\/$/, "");

export function apiUrl(path: string) {
    return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
