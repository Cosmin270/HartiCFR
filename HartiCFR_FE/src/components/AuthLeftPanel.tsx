import './AuthLeftPanel.css';

export default function AuthLeftPanel() {
  return (
    <div className="auth-left">
      <img src="/logo.png" alt="Logo" className="auth-left__brand-logo" />
      <div className="auth-left__card auth-left__logo">
        <h1>Harti CFR</h1>
      </div>
      <div className="auth-left__card auth-left__content">
        <h2>Ceva</h2>
      </div>
    </div>
  );
}