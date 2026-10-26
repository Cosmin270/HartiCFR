// Per-browser memory of the dashboard (tab, filters, sort, what is on the
// map), so a refresh does not throw the user's work away. Storage can be
// unavailable (private mode, blocked site data), so every access is guarded
// and the app works the same without it.
const KEY = "harticfr:ui:v1";

export function loadUiState<T extends object>(): Partial<T> {
    try {
        const raw = window.localStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as Partial<T>) : {};
    } catch {
        return {};
    }
}

export function saveUiState<T extends object>(state: T): void {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
        // Quota exceeded or storage blocked: remembering is best effort.
    }
}

export function clearUiState(): void {
    try {
        window.localStorage.removeItem(KEY);
    } catch {
        // Nothing to clear.
    }
}
