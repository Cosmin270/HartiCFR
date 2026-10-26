import { useSyncExternalStore } from "react";

// Light or dark colours. Until the user picks one the app follows the
// system setting; a pick is remembered per browser. index.html applies the
// same rule before the first paint, so a dark page never flashes white.
export type Theme = "light" | "dark";

const KEY = "harticfr:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const listeners = new Set<() => void>();

function storedTheme(): Theme | null {
    try {
        const value = window.localStorage.getItem(KEY);
        return value === "light" || value === "dark" ? value : null;
    } catch {
        return null;
    }
}

function resolveTheme(): Theme {
    return storedTheme() ?? (window.matchMedia(DARK_QUERY).matches ? "dark" : "light");
}

function apply() {
    document.documentElement.dataset.theme = resolveTheme();
    listeners.forEach((notify) => notify());
}

// Follow the system while nothing is stored, and picks made in other tabs.
window.matchMedia(DARK_QUERY).addEventListener("change", apply);
window.addEventListener("storage", (e) => {
    if (e.key === KEY) apply();
});

function subscribe(onChange: () => void) {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
}

function snapshot(): Theme {
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function useTheme(): Theme {
    return useSyncExternalStore(subscribe, snapshot);
}

export function setTheme(theme: Theme): void {
    try {
        window.localStorage.setItem(KEY, theme);
    } catch {
        // Storage blocked: the choice still holds until the page is closed.
        document.documentElement.dataset.theme = theme;
        listeners.forEach((notify) => notify());
        return;
    }
    apply();
}
