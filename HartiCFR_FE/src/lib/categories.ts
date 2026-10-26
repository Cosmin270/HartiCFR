import type { Log } from "../types/log";

// Display names for raw enum values coming from the API.
export const UNKNOWN = "Necunoscut";

export function producerLabel(value: string): string {
    if (value === "_" || !value) return UNKNOWN;
    if (value === "SPIACT_Cr") return "SPIACT Cr.";
    return value;
}

export function locationTypeLabel(value: string): string {
    return value === "Statie" ? "Stație" : value;
}

// Categorical colours, validated as a set (all pairs, light surface) for
// colour-vision deficiency. Only three hues: points on a map are compared
// all-against-all, and a fourth hue would not stay distinguishable. Unknown
// values always take the neutral gray rather than a hue.
export const CATEGORY_HUES = ["#2a78d6", "#eb6834", "#1baf7a"] as const;
export const NEUTRAL = "#98a2b3";

export type CrossingAttribute =
    | "electricType"
    | "configType"
    | "operatingMode"
    | "locationType"
    | "producer";

export interface AttributeDef {
    key: CrossingAttribute;
    label: string;
    // The column key in the crossings table, for click-through filtering.
    column: string;
    get: (log: Log) => string;
    // Known values in colour-slot order; anything else is drawn as neutral.
    order: string[];
}

export const CROSSING_ATTRIBUTES: AttributeDef[] = [
    {
        key: "electricType",
        label: "Instalație",
        column: "electricType",
        get: (l) => l.electricType,
        order: ["BAT", "SAT"],
    },
    {
        key: "configType",
        label: "Configurație",
        column: "configType",
        get: (l) => l.configType,
        order: ["Relee", "Electronic"],
    },
    {
        key: "operatingMode",
        label: "Regim",
        column: "operatingMode",
        get: (l) => l.operatingMode,
        order: ["Automat", "Manual"],
    },
    {
        key: "locationType",
        label: "Tip",
        column: "locationType",
        get: (l) => locationTypeLabel(l.locationType),
        order: ["LC", "Stație"],
    },
    {
        key: "producer",
        label: "Producător",
        column: "producer",
        get: (l) => producerLabel(l.producer),
        order: ["Aerofina", "Electromagnetica", "SPIACT Cr."],
    },
];

export function attributeDef(key: CrossingAttribute): AttributeDef {
    return CROSSING_ATTRIBUTES.find((a) => a.key === key)!;
}

export function categoryColor(def: AttributeDef, value: string): string {
    const index = def.order.indexOf(value);
    return index >= 0 && index < CATEGORY_HUES.length ? CATEGORY_HUES[index] : NEUTRAL;
}

export interface CategoryCount {
    value: string;
    count: number;
    color: string;
}

// Counts per category, known values first in slot order, unknowns last.
export function countCategories(def: AttributeDef, logs: Log[]): CategoryCount[] {
    const counts = new Map<string, number>();
    for (const log of logs) {
        const value = def.get(log) || UNKNOWN;
        counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const known = def.order.filter((v) => counts.has(v));
    const rest = [...counts.keys()].filter((v) => !def.order.includes(v)).sort();
    return [...known, ...rest].map((value) => ({
        value,
        count: counts.get(value)!,
        color: categoryColor(def, value),
    }));
}
