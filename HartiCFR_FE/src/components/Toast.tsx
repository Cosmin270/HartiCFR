import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import "./Toast.scss";

export type ToastTone = "info" | "success" | "warning";

export interface ToastOptions {
    message: string;
    tone?: ToastTone;
    // An undo-style action shown as a button in the toast.
    action?: { label: string; onClick: () => void };
    duration?: number;
}

interface ToastItem extends ToastOptions {
    id: number;
}

const DEFAULT_DURATION = 4500;
const ACTION_DURATION = 7000;
const MAX_VISIBLE = 3;

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

function ToastView({ item, onClose }: { item: ToastItem; onClose: (id: number) => void }) {
    const [paused, setPaused] = useState(false);
    const remaining = useRef(item.duration ?? (item.action ? ACTION_DURATION : DEFAULT_DURATION));

    // Count down only while the pointer is not over the toast, so a reader
    // reaching for "Anulează" does not lose it mid-move.
    useEffect(() => {
        if (paused) return;
        const started = Date.now();
        const timer = window.setTimeout(() => onClose(item.id), remaining.current);
        return () => {
            window.clearTimeout(timer);
            remaining.current -= Date.now() - started;
        };
    }, [paused, item.id, onClose]);

    return (
        <div
            className={`toast toast--${item.tone ?? "info"}`}
            role={item.tone === "warning" ? "alert" : "status"}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <span className="toast__icon" aria-hidden="true">
                {item.tone === "success" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="m5 12 5 5 9-10" />
                    </svg>
                ) : item.tone === "warning" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 8v5M12 17h.01" />
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 11v6M12 7h.01" />
                    </svg>
                )}
            </span>
            <p className="toast__message">{item.message}</p>
            {item.action && (
                <button
                    type="button"
                    className="toast__action"
                    onClick={() => {
                        item.action!.onClick();
                        onClose(item.id);
                    }}
                >
                    {item.action.label}
                </button>
            )}
            <button type="button" className="toast__close" onClick={() => onClose(item.id)} aria-label="Închide">
                ×
            </button>
        </div>
    );
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<ToastItem[]>([]);
    const nextId = useRef(1);

    const show = useCallback((options: ToastOptions) => {
        const id = nextId.current++;
        setItems((prev) => [...prev, { ...options, id }].slice(-MAX_VISIBLE));
    }, []);

    const close = useCallback((id: number) => {
        setItems((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={show}>
            {children}
            <div className="toast-stack">
                {items.map((item) => (
                    <ToastView key={item.id} item={item} onClose={close} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): (options: ToastOptions) => void {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used inside ToastProvider");
    return ctx;
}
