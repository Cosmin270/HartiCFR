import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { apiUrl } from "@/lib/api";
import "./ServerStatus.scss";

// The API runs on a free instance that sleeps when idle, so the first request
// after a quiet spell can take up to a minute. We probe it up front and tell
// the user what is going on instead of letting requests hang silently.
export type ServerState = "checking" | "waking" | "ready" | "down";

const SLOW_AFTER_MS = 1500;
const PROBE_TIMEOUT_MS = 10000;
const RETRY_EVERY_MS = 3000;
const GIVE_UP_AFTER_MS = 120000;

interface ServerStatus {
    state: ServerState;
    startedAt: number;
    retry: () => void;
}

const ServerStatusContext = createContext<ServerStatus | null>(null);

async function probe(): Promise<boolean> {
    try {
        const res = await fetch(apiUrl("/api/health"), {
            cache: "no-store",
            signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        });
        return res.ok;
    } catch {
        return false;
    }
}

export function ServerStatusProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<ServerState>("checking");
    const [startedAt, setStartedAt] = useState(() => Date.now());
    const [attempt, setAttempt] = useState(0);
    const stateRef = useRef(state);
    stateRef.current = state;

    useEffect(() => {
        let cancelled = false;
        const start = Date.now();
        setStartedAt(start);
        setState("checking");

        // Only call it "waking" once the probe is visibly slow, so a warm
        // server never flashes the notice.
        const slowTimer = window.setTimeout(() => {
            if (!cancelled && stateRef.current === "checking") setState("waking");
        }, SLOW_AFTER_MS);

        async function loop() {
            while (!cancelled) {
                if (await probe()) {
                    if (!cancelled) setState("ready");
                    return;
                }
                if (cancelled) return;
                if (Date.now() - start > GIVE_UP_AFTER_MS) {
                    setState("down");
                    return;
                }
                setState("waking");
                await new Promise((r) => window.setTimeout(r, RETRY_EVERY_MS));
            }
        }

        loop();
        return () => {
            cancelled = true;
            window.clearTimeout(slowTimer);
        };
    }, [attempt]);

    const retry = useCallback(() => setAttempt((a) => a + 1), []);

    return (
        <ServerStatusContext.Provider value={{ state, startedAt, retry }}>
            {children}
        </ServerStatusContext.Provider>
    );
}

export function useServerStatus(): ServerStatus {
    const ctx = useContext(ServerStatusContext);
    if (!ctx) throw new Error("useServerStatus must be used inside ServerStatusProvider");
    return ctx;
}

function useElapsedSeconds(startedAt: number, running: boolean): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!running) return;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [running]);
    return Math.max(0, Math.floor((now - startedAt) / 1000));
}

// Inline notice for the auth pages, where the form is still worth showing.
export function ServerBanner() {
    const { state, startedAt, retry } = useServerStatus();
    const elapsed = useElapsedSeconds(startedAt, state === "waking");

    if (state === "waking") {
        return (
            <div className="server-banner" role="status" aria-live="polite">
                <span className="server-banner__spinner" aria-hidden="true" />
                <div>
                    <strong>Serverul pornește… {elapsed}s</strong>
                    <p>
                        Serverul intră în repaus când nu este folosit. Prima pornire durează
                        de obicei 30–60 de secunde.
                    </p>
                </div>
            </div>
        );
    }

    if (state === "down") {
        return (
            <div className="server-banner server-banner--down" role="alert">
                <div>
                    <strong>Serverul nu răspunde</strong>
                    <p>Verifică conexiunea la internet și încearcă din nou.</p>
                </div>
                <button type="button" className="server-banner__retry" onClick={retry}>
                    Reîncearcă
                </button>
            </div>
        );
    }

    return null;
}

// Full-page version for routes that cannot show anything until the API is up.
export function WakeScreen() {
    const { state, startedAt, retry } = useServerStatus();
    const elapsed = useElapsedSeconds(startedAt, state !== "down");

    if (state === "checking") {
        return (
            <div className="route-guard">
                <span className="route-guard__spinner" aria-hidden="true" />
                <span>Se conectează la server…</span>
            </div>
        );
    }

    const down = state === "down";

    return (
        <div className="wake-screen">
            <div className="wake-screen__card" role={down ? "alert" : "status"} aria-live="polite">
                <img src="/logo.png" alt="" className="wake-screen__logo" />
                <h1 className="wake-screen__title">
                    {down ? "Serverul nu răspunde" : "Serverul pornește"}
                </h1>
                <p className="wake-screen__text">
                    {down
                        ? "Nu am reușit să ne conectăm la server. Verifică conexiunea și încearcă din nou."
                        : "Aplicația rulează pe un server care intră în repaus când nu este folosit. Prima pornire durează de obicei 30–60 de secunde; pagina se deschide singură când serverul este gata."}
                </p>
                {down ? (
                    <button type="button" className="btn btn--primary wake-screen__retry" onClick={retry}>
                        Reîncearcă
                    </button>
                ) : (
                    <>
                        <div className="wake-screen__track" aria-hidden="true">
                            <span className="wake-screen__bar" />
                        </div>
                        <span className="wake-screen__elapsed">{elapsed}s</span>
                    </>
                )}
            </div>
        </div>
    );
}
