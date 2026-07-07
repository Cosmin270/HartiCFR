import './AuthLeftPanel.css';

export default function AuthLeftPanel() {
  return (
    <aside className="auth-left">
      <svg
        className="auth-left__decor"
        viewBox="0 0 400 600"
        fill="none"
        aria-hidden="true"
      >
        <path d="M40 80 L40 300 L200 460 L200 560" className="line line--a" />
        <path d="M360 40 L360 220 L200 380 L60 380" className="line line--b" />
        <path d="M120 20 L120 200 L320 400 L320 580" className="line line--c" />
        <circle cx="40" cy="300" r="7" className="stop" />
        <circle cx="200" cy="380" r="7" className="stop" />
        <circle cx="320" cy="400" r="7" className="stop" />
        <circle cx="120" cy="200" r="7" className="stop" />
      </svg>

      <div className="auth-left__brand">
        <img src="/logo.png" alt="Harti CFR" className="auth-left__logo" />
        <span className="auth-left__wordmark">Harti CFR</span>
      </div>

      <div className="auth-left__content">
        <h1 className="auth-left__title">
          Every station,<br />on one map.
        </h1>
        <p className="auth-left__subtitle">
          Plan routes, explore the rail network and track connections across
          Romania — all in one place.
        </p>
      </div>
    </aside>
  );
}