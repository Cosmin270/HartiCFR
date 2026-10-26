import { useMemo } from "react";
import type { Log } from "../types/log";
import type { Station } from "../types/station";
import { CROSSING_ATTRIBUTES, countCategories, producerLabel, type AttributeDef } from "@/lib/categories";
import { hasPosition } from "@/lib/geo";
import { formatNumber, formatPercent } from "@/lib/text";
import "./StatsPanel.scss";

const TOP_LINES = 10;

interface Bar {
    label: string;
    count: number;
}

function countBy(logs: Log[], get: (l: Log) => string): Bar[] {
    const counts = new Map<string, number>();
    for (const log of logs) {
        const key = get(log);
        if (!key) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ro", { numeric: true }));
}

// Pick the label colour inside a filled segment from the fill's luminance.
function textOn(hex: string): string {
    const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.25 ? "#101828" : "#ffffff";
}

type FilterHandler = (column: string, value: string) => void;

function BarChart({
    title,
    subtitle,
    bars,
    total,
    column,
    onFilter,
}: {
    title: string;
    subtitle: string;
    bars: Bar[];
    total: number;
    column: string;
    onFilter: FilterHandler;
}) {
    const max = Math.max(1, ...bars.map((b) => b.count));
    return (
        <section className="stats-card">
            <header className="stats-card__head">
                <h3 className="stats-card__title">{title}</h3>
                <p className="stats-card__subtitle">{subtitle}</p>
            </header>
            <ul className="bar-chart">
                {bars.map((bar) => (
                    <li key={bar.label}>
                        <button
                            type="button"
                            className="bar-chart__row"
                            onClick={() => onFilter(column, bar.label)}
                            title={`Vezi cele ${bar.count} treceri: ${bar.label}`}
                        >
                            <span className="bar-chart__label">{bar.label}</span>
                            <span className="bar-chart__track">
                                <span
                                    className="bar-chart__bar"
                                    // Every bar scales against the same width, which leaves room
                                    // for the value label after the longest one.
                                    style={{ width: `calc((100% - 92px) * ${bar.count / max})` }}
                                />
                                <span className="bar-chart__value">
                                    {formatNumber(bar.count)}
                                    <span className="bar-chart__share"> · {formatPercent(bar.count, total)}</span>
                                </span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function ShareBar({ def, logs, onFilter }: { def: AttributeDef; logs: Log[]; onFilter: FilterHandler }) {
    const parts = useMemo(() => countCategories(def, logs), [def, logs]);
    const total = logs.length;
    return (
        <div className="share">
            <span className="share__title">{def.label}</span>
            <div className="share__bar" role="presentation">
                {parts.map((p) => {
                    const pct = (p.count / total) * 100;
                    return (
                        <button
                            key={p.value}
                            type="button"
                            className="share__segment"
                            style={{ flexGrow: p.count, background: p.color, color: textOn(p.color) }}
                            onClick={() => onFilter(def.column, p.value)}
                            title={`${p.value}: ${formatNumber(p.count)} (${formatPercent(p.count, total)})`}
                            aria-label={`${p.value}: ${formatNumber(p.count)} treceri, ${formatPercent(p.count, total)}`}
                        >
                            {/* Only label segments wide enough to hold the text; the legend carries the rest. */}
                            {pct >= 14 && <span>{formatPercent(p.count, total)}</span>}
                        </button>
                    );
                })}
            </div>
            <ul className="share__legend">
                {parts.map((p) => (
                    <li key={p.value}>
                        <button type="button" onClick={() => onFilter(def.column, p.value)}>
                            <span className="share__swatch" style={{ background: p.color }} />
                            {p.value}
                            <span className="share__count">
                                {formatNumber(p.count)} · {formatPercent(p.count, total)}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

interface StatsPanelProps {
    logs: Log[];
    stations: Station[];
    loading: boolean;
    // Open the crossings table filtered to one value of a column.
    onFilter: FilterHandler;
}

export default function StatsPanel({ logs, stations, loading, onFilter }: StatsPanelProps) {
    const stats = useMemo(() => {
        const bySrcf = countBy(logs, (l) => l.srcf);
        const byProducer = countBy(logs, (l) => producerLabel(l.producer));
        const byLine = countBy(logs, (l) => l.mainLine);
        const withoutLine = logs.filter((l) => !l.mainLine).length;
        const automat = logs.filter((l) => l.operatingMode === "Automat").length;
        const unplaced = logs.filter((l) => !hasPosition(l.position)).length;
        return { bySrcf, byProducer, byLine, withoutLine, automat, unplaced };
    }, [logs]);

    if (loading) {
        return (
            <div className="stats stats--loading" aria-busy="true">
                <span className="route-guard__spinner" aria-hidden="true" />
                Se calculează statisticile…
            </div>
        );
    }

    const total = logs.length;

    return (
        <div className="stats">
            <div className="stats__kpis">
                <div className="kpi">
                    <span className="kpi__label">Treceri la nivel</span>
                    <span className="kpi__value">{formatNumber(total)}</span>
                    <span className="kpi__note">în {stats.bySrcf.length} sucursale regionale</span>
                </div>
                <div className="kpi">
                    <span className="kpi__label">Stații</span>
                    <span className="kpi__value">{formatNumber(stations.length)}</span>
                    <span className="kpi__note">în toată rețeaua CFR</span>
                </div>
                <div className="kpi">
                    <span className="kpi__label">Funcționează automat</span>
                    <span className="kpi__value">{formatPercent(stats.automat, total)}</span>
                    <span className="kpi__note">
                        {formatNumber(stats.automat)} din {formatNumber(total)} treceri
                    </span>
                </div>
                <div className="kpi">
                    <span className="kpi__label">Fără coordonate</span>
                    <span className="kpi__value">{formatNumber(stats.unplaced)}</span>
                    <span className="kpi__note">treceri care nu pot apărea pe hartă</span>
                </div>
            </div>

            <p className="stats__hint">
                Apasă pe o bară pentru a deschide tabelul trecerilor filtrat după valoarea respectivă.
            </p>

            <div className="stats__grid">
                <BarChart
                    title="Treceri pe sucursală"
                    subtitle="Sucursala regională de căi ferate (SRCF)"
                    bars={stats.bySrcf}
                    total={total}
                    column="srcf"
                    onFilter={onFilter}
                />
                <BarChart
                    title="Treceri pe producător"
                    subtitle="Producătorul instalației de semnalizare"
                    bars={stats.byProducer}
                    total={total}
                    column="producer"
                    onFilter={onFilter}
                />
                <BarChart
                    title={`Primele ${Math.min(TOP_LINES, stats.byLine.length)} magistrale`}
                    subtitle={
                        stats.withoutLine > 0
                            ? `După numărul de treceri; ${formatNumber(stats.withoutLine)} treceri nu au magistrală`
                            : "După numărul de treceri"
                    }
                    bars={stats.byLine.slice(0, TOP_LINES)}
                    total={total}
                    column="mainLine"
                    onFilter={onFilter}
                />
                <section className="stats-card">
                    <header className="stats-card__head">
                        <h3 className="stats-card__title">Tipuri de instalații</h3>
                        <p className="stats-card__subtitle">Ponderea fiecărei categorii din totalul trecerilor</p>
                    </header>
                    <div className="stats-card__shares">
                        {CROSSING_ATTRIBUTES.filter((a) => a.key !== "producer").map((def) => (
                            <ShareBar key={def.key} def={def} logs={logs} onFilter={onFilter} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
