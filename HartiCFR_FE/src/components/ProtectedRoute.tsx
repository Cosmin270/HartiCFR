import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { apiUrl } from "@/lib/api";
import { useServerStatus, WakeScreen } from "./ServerStatus";

type AuthState = "checking" | "authed" | "unauthed";

export default function ProtectedRoute() {
    const { state: server } = useServerStatus();
    const [state, setState] = useState<AuthState>("checking");

    useEffect(() => {
        // Asking a sleeping server for the session would just hang; wait
        // until it has answered the health probe.
        if (server !== "ready") return;
        let cancelled = false;

        async function check() {
            try {
                const res = await fetch(apiUrl("/api/auth/me"), {
                    credentials: "include",
                });
                if (!cancelled) setState(res.ok ? "authed" : "unauthed");
            } catch {
                if (!cancelled) setState("unauthed");
            }
        }

        check();
        return () => {
            cancelled = true;
        };
    }, [server]);

    if (server !== "ready") {
        return <WakeScreen />;
    }

    if (state === "checking") {
        return (
            <div className="route-guard">
                <span className="route-guard__spinner" aria-hidden="true" />
                <span>Se verifică sesiunea…</span>
            </div>
        );
    }

    if (state === "unauthed") {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
