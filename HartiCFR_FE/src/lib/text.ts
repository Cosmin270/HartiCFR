// Lowercase and strip diacritics, so "statia" finds "Stația" and "brasov"
// finds "Brașov".
export function fold(value: unknown): string {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();
}

const numberFormat = new Intl.NumberFormat("ro-RO");

export function formatNumber(n: number): string {
    return numberFormat.format(n);
}

export function formatPercent(part: number, total: number): string {
    if (total === 0) return "0%";
    return `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 }).format((part / total) * 100)}%`;
}
