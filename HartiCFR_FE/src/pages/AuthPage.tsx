import AuthLeftPanel from '../components/AuthLeftPanel';
import DemoLoginButton from '../components/DemoLoginButton';
import { ServerBanner, useServerStatus } from '../components/ServerStatus';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import './AuthForm.scss';

export default function AuthPage() {
    const navigate = useNavigate();
    const { state: server } = useServerStatus();
    const [error, setError] = useState('');

    return (
        <div className="auth-page">
            <AuthLeftPanel />

            <div className="auth-page__right">
                <div className="auth-card">
                    <div className="auth-card__header">
                        <h2 className="auth-card__title">Bun venit</h2>
                        <p className="auth-card__subtitle">
                            Autentifică-te sau creează un cont nou. Vrei doar să explorezi
                            aplicația? Intră cu contul demo, fără înregistrare.
                        </p>
                    </div>

                    <ServerBanner />

                    <div className="auth-choice">
                        <button
                            className="btn btn--primary"
                            onClick={() => navigate('/login')}
                        >
                            Autentificare
                        </button>
                        <button
                            className="btn btn--outline"
                            onClick={() => navigate('/signin')}
                        >
                            Creează un cont
                        </button>

                        <div className="auth-divider" aria-hidden="true">sau</div>

                        <DemoLoginButton disabled={server !== 'ready'} onError={setError} />

                        {error && (
                            <p className="auth-form__error" role="alert" aria-live="polite">
                                {error}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
