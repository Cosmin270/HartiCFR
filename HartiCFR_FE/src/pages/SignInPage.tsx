import "./SignInPage.css";
import AuthLeftPanel from "../components/AuthLeftPanel";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "./AuthForm.css";

export default function SignInPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const res = await fetch("http://localhost:5016/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ username, email, password }),
            });

            if (!res.ok) {
                const message = await res.text();
                setError(message || "Failed to sign in. Please try again.");
                return;
            }

            navigate("/dashboard");
        } catch (err) {
            setError("Could not reach the server. Please try again.");
            console.error(err);
        }
    }
    return (
        <div className="auth-page">
            <AuthLeftPanel />
            
            <div className="auth-page__right">
                <form className="auth-form" onSubmit={handleSignIn}>
                    <input
                        type="text"
                        placeholder="Name"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                     <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {error && <p className="auth-page__error">{error}</p>}

                    <button type="submit" className="auth-page__button">Sign In</button>
                </form>
                <button type="button" className="auth-page__button2" onClick={() => navigate("/login")}>
                    LogIn
                </button>
            </div>
        </div>
    );
}