import AuthLeftPanel from '../components/AuthLeftPanel';
import './AuthPage.css';
import { useNavigate } from 'react-router-dom';

export default function AuthPage() {
    const navigate = useNavigate();

    return (
        <div className="auth-page">
            <AuthLeftPanel />

            <div className="auth-page__right">
                <button className="auth-page__button" onClick={() => navigate("/login")}>LogIn</button>
                <button className="auth-page__button" onClick={() => navigate("/signin")}>SignIn</button>
            </div>
        </div>
    );
}