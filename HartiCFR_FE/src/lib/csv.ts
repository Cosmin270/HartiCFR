// Semicolon-separated with a UTF-8 BOM: what Excel expects on Romanian
// systems, where the comma is the decimal separator, and the BOM keeps
// diacritics intact.
const SEPARATOR = ";";

function cell(value: unknown): string {
    const text = value === undefined || value === null ? "" : String(value);
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
    return [headers, ...rows].map((r) => r.map(cell).join(SEPARATOR)).join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
    const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export function todayStamp(): string {
    return new Date().toISOString().slice(0, 10);
}
