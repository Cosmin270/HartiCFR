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

// Romanian counted nouns: "1 trecere", "5 treceri", "20 de treceri". From 20
// up, a number whose last two digits are 00 or 20–99 takes "de".
export function countOf(n: number, one: string, many: string): string {
    if (n === 1) return `1 ${one}`;
    const lastTwo = n % 100;
    const de = n >= 20 && (lastTwo === 0 || lastTwo >= 20);
    return `${formatNumber(n)} ${de ? "de " : ""}${many}`;
}
