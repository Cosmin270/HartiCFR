import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { apiUrl } from "@/lib/api";

type AuthState = "checking" | "authed" | "unauthed";

export default function ProtectedRoute() {
    const [state, setState] = useState<AuthState>("checking");

    useEffect(() => {
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
    }, []);

    if (state === "checking") {
        return (
            <div className="route-guard">
                <span className="route-guard__spinner" aria-hidden="true" />
                <span>Checking session…</span>
            </div>
        );
    }

    if (state === "unauthed") {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
