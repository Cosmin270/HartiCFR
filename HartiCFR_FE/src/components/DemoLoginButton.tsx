import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAsDemo } from "@/lib/auth";

interface DemoLoginButtonProps {
    disabled?: boolean;
    onError: (message: string) => void;
}

export default function DemoLoginButton({ disabled = false, onError }: DemoLoginButtonProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    async function handleClick() {
        setLoading(true);
        const error = await loginAsDemo();
        setLoading(false);
        if (error) {
            onError(error);
            return;
        }
        navigate("/dashboard");
    }

    return (
        <button
            type="button"
            className="btn btn--demo"
            onClick={handleClick}
            disabled={disabled || loading}
        >
            {loading ? (
                <span className="btn__spinner" aria-hidden="true" />
            ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 3l14 9-14 9V3Z" />
                </svg>
            )}
            {loading ? "Se deschide…" : "Încearcă fără cont (demo)"}
        </button>
    );
}
