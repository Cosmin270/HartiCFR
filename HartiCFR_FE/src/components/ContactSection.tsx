import { useEffect, useState } from "react";
import { useToast } from "./Toast";
import { apiUrl } from "@/lib/api";
import "./ContactSection.scss";

// Matches ContactController.MaxMessageLength on the server.
const MAX_LENGTH = 2000;

const CATEGORIES = ["Bug", "Sugestie"] as const;

// Bug reports and suggestions, mailed to the site owner by the API. The
// sender's address comes from their session; it is only shown here so they
// know where an answer will arrive.
export default function ContactSection() {
    const toast = useToast();
    const [email, setEmail] = useState("");
    const [category, setCategory] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch(apiUrl("/api/auth/me"), { credentials: "include" })
            .then((res) => (res.ok ? res.json() : null))
            .then((me: { email?: string } | null) => {
                if (!cancelled && me?.email) setEmail(me.email);
            })
            .catch(() => void 0);
        return () => {
            cancelled = true;
        };
    }, []);

    const canSend = category !== "" && message.trim() !== "" && !sending;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canSend) return;
        setSending(true);
        try {
            const res = await fetch(apiUrl("/api/Contact"), {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category, message }),
            });
            if (res.ok) {
                toast({ tone: "success", message: "Mesajul a fost trimis. Mulțumim!" });
                setCategory("");
                setMessage("");
                return;
            }
            const reason =
                res.status === 429
                    ? "Ai trimis prea multe mesaje. Încearcă din nou peste câteva minute."
                    : res.status === 401
                      ? "Sesiunea a expirat. Conectează-te din nou pentru a trimite mesajul."
                      : (await res.text()) || "Nu am putut trimite mesajul.";
            toast({ tone: "warning", message: reason });
        } catch {
            toast({ tone: "warning", message: "Nu am putut contacta serverul. Verifică conexiunea și încearcă din nou." });
        } finally {
            setSending(false);
        }
    }

    return (
        <section className="contact" id="contact" aria-labelledby="contact-title">
            <div className="contact__intro">
                <h2 id="contact-title" className="contact__title">
                    Contact / Suport
                </h2>
                <p className="contact__text">
                    Ai găsit o problemă sau ai o idee pentru aplicație? Scrie-ne aici și mesajul ajunge direct la
                    echipa Harti CFR.
                </p>
                {email && (
                    <p className="contact__from">
                        Răspunsul va veni pe <strong>{email}</strong>
                    </p>
                )}
            </div>

            <form className="contact__form" onSubmit={handleSubmit}>
                <label className="contact__field">
                    <span className="contact__label">Categorie</span>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} required>
                        <option value="" disabled>
                            Alege categoria…
                        </option>
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="contact__field contact__field--grow">
                    <span className="contact__label">
                        Mesaj
                        <span className="contact__count" aria-hidden="true">
                            {message.length}/{MAX_LENGTH}
                        </span>
                    </span>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        maxLength={MAX_LENGTH}
                        rows={4}
                        placeholder={
                            category === "Bug"
                                ? "Ce s-a întâmplat și ce te așteptai să se întâmple?"
                                : "Scrie sugestia ta…"
                        }
                        required
                    />
                </label>

                <div className="contact__actions">
                    <button type="submit" className="btn-render" disabled={!canSend}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="m22 2-7 20-4-9-9-4Z" />
                            <path d="M22 2 11 13" />
                        </svg>
                        {sending ? "Se trimite…" : "Trimite"}
                    </button>
                </div>
            </form>
        </section>
    );
}
