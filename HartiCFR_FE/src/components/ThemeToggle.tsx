import { setTheme, useTheme } from "@/lib/theme";
import "./ThemeToggle.scss";

export default function ThemeToggle({ className = "" }: { className?: string }) {
    const theme = useTheme();
    const next = theme === "dark" ? "light" : "dark";
    const label = next === "dark" ? "Activează tema întunecată" : "Activează tema luminoasă";

    return (
        <button
            type="button"
            className={`theme-toggle ${className}`.trim()}
            onClick={() => setTheme(next)}
            aria-label={label}
            title={label}
        >
            {/* Shows the theme a click switches to. */}
            {next === "dark" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
                </svg>
            ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
            )}
        </button>
    );
}
