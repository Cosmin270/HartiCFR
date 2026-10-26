import AuthLeftPanel from "../components/AuthLeftPanel";
import { ServerBanner, useServerStatus } from "../components/ServerStatus";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./AuthForm.scss";
import { apiUrl } from "@/lib/api";

const MIN_PASSWORD_LENGTH = 6;

export default function SignInPage() {
    const navigate = useNavigate();
    const { state: server } = useServerStatus();
    const serverReady = server === "ready";
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Catch the obvious mistakes before a round trip; the server repeats
        // these checks and has the final word.
        if (!username.trim()) {
            setError("Introdu un nume.");
            return;
        }
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            setError("Adresa de email nu este validă.");
            return;
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(`Parola trebuie să aibă cel puțin ${MIN_PASSWORD_LENGTH} caractere.`);
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(apiUrl("/api/auth/register"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ username, email, password }),
            });

            if (!res.ok) {
                const message = await res.text();
                setError(message || "Nu am putut crea contul. Încearcă din nou.");
                return;
            }

            navigate("/dashboard");
        } catch (err) {
            setError("Nu am putut contacta serverul. Încearcă din nou.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <AuthLeftPanel />

            <div className="auth-page__right">
                <div className="auth-card">
                    <div className="auth-card__header">
                        <h2 className="auth-card__title">Creează-ți contul</h2>
                        <p className="auth-card__subtitle">
                            Alătură-te Harti CFR și explorează rețeaua feroviară.
                        </p>
                    </div>

                    <ServerBanner />

                    <form className="auth-form" onSubmit={handleSignIn} noValidate>
                        <div className="auth-field">
                            <label className="auth-field__label" htmlFor="signin-name">Nume</label>
                            <div className="auth-field__control">
                                <svg className="auth-field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <circle cx="12" cy="8" r="4" />
                                    <path d="M4 21a8 8 0 0 1 16 0" />
                                </svg>
                                <input
                                    id="signin-name"
                                    type="text"
                                    placeholder="Numele tău"
                                    autoComplete="name"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="auth-field">
                            <label className="auth-field__label" htmlFor="signin-email">Email</label>
                            <div className="auth-field__control">
                                <svg className="auth-field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <rect x="3" y="5" width="18" height="14" rx="2" />
                                    <path d="m3 7 9 6 9-6" />
                                </svg>
                                <input
                                    id="signin-email"
                                    type="email"
                                    placeholder="nume@exemplu.ro"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="auth-field">
                            <label className="auth-field__label" htmlFor="signin-password">Parolă</label>
                            <div className="auth-field__control">
                                <svg className="auth-field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <rect x="4" y="11" width="16" height="9" rx="2" />
                                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                                </svg>
                                <input
                                    id="signin-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder={`Minimum ${MIN_PASSWORD_LENGTH} caractere`}
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="auth-field__toggle"
                                    onClick={() => setShowPassword((s) => !s)}
                                    aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
                                >
                                    {showPassword ? (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                            <path d="M3 3l18 18" />
                                            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                                            <path d="M9.4 5.2A9.5 9.5 0 0 1 12 5c5 0 9 4.5 9 7a12.3 12.3 0 0 1-2.2 2.9M6.3 6.3C3.9 7.8 2.5 10 2.5 12c0 2.5 4 7 9.5 7a10 10 0 0 0 3-.5" />
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                            <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="auth-form__error" role="alert" aria-live="polite">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M12 8v4M12 16h.01" />
                                </svg>
                                {error}
                            </p>
                        )}

                        <button type="submit" className="btn btn--primary" disabled={loading || !serverReady}>
                            {loading ? <span className="btn__spinner" aria-hidden="true" /> : null}
                            {loading
                                ? "Se creează contul…"
                                : serverReady
                                  ? "Creează contul"
                                  : "Se așteaptă serverul…"}
                        </button>
                    </form>

                    <p className="auth-switch">
                        Ai deja cont?
                        <button type="button" onClick={() => navigate("/login")}>
                            Autentifică-te
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}