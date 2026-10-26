import './AuthLeftPanel.css';

const FEATURES = [
  {
    title: 'Treceri la nivel',
    text: 'Tipul instalației de semnalizare, producătorul și regimul de funcționare pentru fiecare trecere.',
    icon: <path d="M7 3v18M17 3v18M7 8h10M7 16h10" />,
  },
  {
    title: 'Stații CFR',
    text: 'Stațiile din rețeaua feroviară, cu cod și coordonate.',
    icon: (
      <>
        <path d="M4 21V9l8-6 8 6v12" />
        <path d="M9 21v-6h6v6" />
      </>
    ),
  },
  {
    title: 'Hartă interactivă',
    text: 'Filtrezi tabelele, alegi rândurile și le vezi pe hartă, grupate automat pe zone.',
    icon: (
      <>
        <path d="M9 6 3 4v14l6 2 6-2 6 2V6l-6-2-6 2Z" />
        <path d="M9 4v14M15 6v14" />
      </>
    ),
  },
];

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
          Rețeaua CFR,<br />pe o singură hartă.
        </h1>
        <p className="auth-left__subtitle">
          Trecerile la nivel cu instalații de semnalizare și stațiile de cale
          ferată din România, într-un singur loc: le cauți, le filtrezi și le
          vezi pe hartă.
        </p>

        <ul className="auth-left__features">
          {FEATURES.map((f) => (
            <li key={f.title} className="auth-left__feature">
              <span className="auth-left__feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  {f.icon}
                </svg>
              </span>
              <span>
                <strong>{f.title}</strong>
                {f.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
