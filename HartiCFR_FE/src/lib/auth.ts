import { apiUrl } from "./api";

// Signs in with the shared demo account. Resolves to an error message, or
// null on success.
export async function loginAsDemo(): Promise<string | null> {
    try {
        const res = await fetch(apiUrl("/api/auth/demo"), {
            method: "POST",
            credentials: "include",
        });
        if (!res.ok) return "Contul demo nu este disponibil momentan.";
        return null;
    } catch (err) {
        console.error(err);
        return "Nu am putut contacta serverul. Încearcă din nou.";
    }
}
