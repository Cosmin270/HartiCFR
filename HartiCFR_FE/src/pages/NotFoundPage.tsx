import { useNavigate } from "react-router-dom";
import "./AuthForm.scss";

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="not-found">
            <div className="auth-card not-found__card">
                <span className="not-found__code" aria-hidden="true">404</span>
                <h1 className="auth-card__title">Pagina nu există</h1>
                <p className="auth-card__subtitle">
                    Adresa deschisă nu corespunde niciunei pagini din Harti CFR. Poate a fost
                    scrisă greșit sau linkul este vechi.
                </p>
                <div className="auth-choice not-found__actions">
                    <button type="button" className="btn btn--primary" onClick={() => navigate("/dashboard")}>
                        Mergi la dashboard
                    </button>
                    <button type="button" className="btn btn--outline" onClick={() => navigate("/")}>
                        Pagina de start
                    </button>
                </div>
            </div>
        </div>
    );
}
