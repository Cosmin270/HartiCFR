import { useRef } from "react";
import "./UserManual.scss";

const STEPS: { title: string; body: React.ReactNode }[] = [
    {
        title: "Alege datele",
        body: (
            <>
                Folosește filele din bara de sus: <strong>Treceri la nivel</strong>, <strong>Stații</strong> sau{" "}
                <strong>Statistici</strong>.
            </>
        ),
    },
    {
        title: "Filtrează și sortează",
        body: (
            <>
                Scrie în căsuțele de sub capul tabelului pentru a filtra o coloană. Apasă pe numele coloanei
                pentru a sorta. <strong>Șterge filtrele</strong> le resetează pe toate.
            </>
        ),
    },
    {
        title: "Selectează și afișează",
        body: (
            <>
                Bifează rândurile dorite (caseta din capul tabelului le bifează pe toate cele filtrate), apoi apasă{" "}
                <strong>Afișează pe hartă</strong>. Trecerile și stațiile pot fi afișate împreună; dacă pornești{" "}
                <strong>Golește harta când schimbi fila</strong> (în antetul hărții), harta se golește când treci
                între Treceri și Stații și arată doar rândurile din fila deschisă.
            </>
        ),
    },
    {
        title: "Folosește harta",
        body: (
            <>
                Apasă pe un punct ca să găsești rândul lui în tabel; la o trecere evidențiată apare și cea mai
                apropiată stație. Alege fundalul (<strong>Hartă</strong>, <strong>Satelit</strong>,{" "}
                <strong>Relief</strong>), pornește <strong>Căi ferate</strong>, colorează trecerile din{" "}
                <strong>Culoare treceri</strong> sau deschide harta pe tot ecranul.
            </>
        ),
    },
    {
        title: "Caută rapid",
        body: (
            <>
                Scrie numele unei stații sau al unei treceri în căsuța de căutare (tasta <kbd>/</kbd>). Rezultatul
                ales apare direct pe hartă.
            </>
        ),
    },
    {
        title: "Statistici și export",
        body: (
            <>
                În <strong>Statistici</strong>, apasă pe o bară ca să deschizi tabelul filtrat după acea valoare.
                Butonul <strong>CSV</strong> descarcă rândurile afișate în tabel.
            </>
        ),
    },
];

export default function UserManual() {
    const dialogRef = useRef<HTMLDialogElement>(null);

    function close() {
        dialogRef.current?.close();
    }

    return (
        <>
            <button
                type="button"
                className="manual-btn"
                onClick={() => dialogRef.current?.showModal()}
                aria-haspopup="dialog"
                title="Cum se folosește aplicația"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2Z" />
                    <path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7Z" />
                </svg>
                <span className="manual-btn__label">Manual</span>
            </button>

            {/* A click on the backdrop lands on the dialog itself, since the
                inner frame covers the whole visible box. */}
            <dialog
                ref={dialogRef}
                className="manual"
                aria-labelledby="manual-title"
                onClick={(e) => e.target === e.currentTarget && close()}
            >
                <div className="manual__frame">
                    <header className="manual__head">
                        <div>
                            <h2 id="manual-title" className="manual__title">
                                Manual de utilizare
                            </h2>
                            <p className="manual__subtitle">
                                Cum găsești și afișezi pe hartă trecerile la nivel și stațiile CFR.
                            </p>
                        </div>
                        <button type="button" className="manual__close" onClick={close} aria-label="Închide manualul">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <path d="M18 6 6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </header>

                    <div className="manual__body">
                        <ol className="manual__steps">
                            {STEPS.map((s) => (
                                <li key={s.title} className="manual__step">
                                    <h3 className="manual__step-title">{s.title}</h3>
                                    <p>{s.body}</p>
                                </li>
                            ))}
                        </ol>

                        <aside className="manual__tips">
                            <h3 className="manual__tips-title">Bine de știut</h3>
                            <ul>
                                <li>Selecțiile, filtrele și harta se păstrează când reîncarci pagina; deconectarea le șterge.</li>
                                <li>Dacă ai eliminat ceva din greșeală, apasă <strong>Anulează</strong> în notificarea care apare.</li>
                                <li>Butonul cu lună sau soare schimbă tema între luminoasă și întunecată.</li>
                            </ul>
                        </aside>
                    </div>

                    <footer className="manual__foot">
                        <button type="button" className="btn-render" onClick={close}>
                            Am înțeles
                        </button>
                    </footer>
                </div>
            </dialog>
        </>
    );
}
