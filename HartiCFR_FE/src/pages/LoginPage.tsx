import { useNavigate } from "react-router-dom";
import "./LoginPage.css";
import { useState } from "react";
import AuthLeftPanel from "../components/AuthLeftPanel";
import "./AuthForm.css";

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setError('');

        const res = await fetch('http://localhost:5016/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
        });

        if(!res.ok){
            setError('Invalid email or password');
        }
        
        navigate("/dashboard");
    }

    return (
        <div className="auth-page">
            <AuthLeftPanel />

            <div className="auth-page__right">
                <form className="auth-form" onSubmit={handleSubmit}>
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

                    {error && <p className="auth-form__error">{error}</p>}

                    <button type="submit" className="auth-page__button">Log In</button>
                </form>
            </div>
        </div>
    );
}