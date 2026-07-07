import AuthLeftPanel from '../components/AuthLeftPanel';
import { useNavigate } from 'react-router-dom';
import './AuthForm.scss';

export default function AuthPage() {
    const navigate = useNavigate();

    return (
        <div className="auth-page">
            <AuthLeftPanel />

            <div className="auth-page__right">
                <div className="auth-card">
                    <div className="auth-card__header">
                        <h2 className="auth-card__title">Welcome aboard</h2>
                        <p className="auth-card__subtitle">
                            Sign in to continue, or create an account to get started.
                        </p>
                    </div>

                    <div className="auth-choice">
                        <button
                            className="btn btn--primary"
                            onClick={() => navigate('/login')}
                        >
                            Log in
                        </button>
                        <button
                            className="btn btn--outline"
                            onClick={() => navigate('/signin')}
                        >
                            Create an account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}