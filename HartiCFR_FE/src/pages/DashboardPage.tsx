import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Log } from "../types/log";
import LogMap from "../components/LogMap";
import "./DashboardPage.scss";

type ColumnFilter = "text" | "select";

interface Column {
    key: string;
    label: string;
    filter: ColumnFilter;
    num?: boolean;
    get: (log: Log) => string | number | undefined;
}

const COLUMNS: Column[] = [
    { key: "id", label: "ID", filter: "text", num: true, get: (l) => l.id },
    { key: "srcf", label: "SRCF", filter: "text", get: (l) => l.srcf },
    { key: "ct", label: "Sectia CT", filter: "text", get: (l) => l.ct },
    { key: "tnPosition", label: "Km TN", filter: "text", num: true, get: (l) => l.tnPosition },
    { key: "locationType", label: "Tip", filter: "select", get: (l) => l.locationType },
    { key: "start", label: "De la", filter: "text", get: (l) => l.location?.start },
    { key: "end", label: "Pana la", filter: "text", get: (l) => l.location?.end },
    { key: "mainLine", label: "Magistrala", filter: "text", get: (l) => l.mainLine },
    { key: "electricType", label: "Instalatie", filter: "select", get: (l) => l.electricType },
    { key: "configType", label: "Config", filter: "select", get: (l) => l.configType },
    { key: "producer", label: "Producator", filter: "select", get: (l) => l.producer },
    { key: "operatingMode", label: "Regim", filter: "select", get: (l) => l.operatingMode },
    { key: "x", label: "Longitudine", filter: "text", num: true, get: (l) => l.position?.x },
    { key: "y", label: "Latitudine", filter: "text", num: true, get: (l) => l.position?.y },
];

const EMPTY_FILTERS: Record<string, string> = Object.fromEntries(
    COLUMNS.map((c) => [c.key, ""])
);

export default function DashboardPage() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [filters, setFilters] = useState<Record<string, string>>(EMPTY_FILTERS);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [rendered, setRendered] = useState<Log[]>([]);
    const [focusId, setFocusId] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const res = await fetch("http://localhost:5016/api/Log/logs", {
                    credentials: "include",
                });

                if (res.status === 401) {
                    navigate("/login");
                    return;
                }
                if (!res.ok) {
                    throw new Error(`Server responded with ${res.status}`);
                }

                const data: Log[] = await res.json();
                if (!cancelled) setLogs(data);
            } catch (err) {
                if (!cancelled) setError("Could not load logs. Is the server running?");
                console.error(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [navigate]);

    const selectOptions = useMemo(() => {
        const map: Record<string, string[]> = {};
        for (const col of COLUMNS) {
            if (col.filter !== "select") continue;
            const values = new Set<string>();
            for (const log of logs) {
                const v = col.get(log);
                if (v !== undefined && v !== null && v !== "") values.add(String(v));
            }
            map[col.key] = Array.from(values).sort();
        }
        return map;
    }, [logs]);

    const filtered = useMemo(() => {
        return logs.filter((log) =>
            COLUMNS.every((col) => {
                const q = filters[col.key];
                if (!q) return true;
                const raw = col.get(log);
                const val = raw === undefined || raw === null ? "" : String(raw);
                return col.filter === "select"
                    ? val === q
                    : val.toLowerCase().includes(q.toLowerCase());
            })
        );
    }, [logs, filters]);

    const anyFilterActive = Object.values(filters).some((v) => v !== "");
    const filteredIds = useMemo(() => filtered.map((l) => l.id), [filtered]);
    const allSelected =
        filtered.length > 0 && filteredIds.every((id) => selected.has(id));
    function setFilter(key: string, value: string) {
        setFilters((prev) => ({ ...prev, [key]: value }));
    }

    function toggleRow(id: number) {
        const wasSelected = selected.has(id);
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        setFocusId(wasSelected ? null : id);
    }

    function toggleAll() {
        setSelected((prev) => {
            const next = new Set(prev);
            if (allSelected) filteredIds.forEach((id) => next.delete(id));
            else filteredIds.forEach((id) => next.add(id));
            return next;
        });
    }

    function handleRender() {
        setRendered(logs.filter((l) => selected.has(l.id)));
    }

    async function handleLogout() {
        try {
            await fetch("http://localhost:5016/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });
        } catch {
            void 0;
        }
        navigate("/login");
    }

    return (
        <div className="dashboard">
            <header className="appbar">
                <div className="appbar__brand">
                    <img src="/logo.png" alt="" className="appbar__logo" />
                    <span className="appbar__wordmark">Harti CFR</span>
                </div>
                <button type="button" className="appbar__logout" onClick={handleLogout}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <path d="m16 17 5-5-5-5M21 12H9" />
                    </svg>
                    Log out
                </button>
            </header>

            <main className="dashboard__body">
                <div className="dashboard__head">
                    <h1 className="dashboard__title">Treceri la nivel</h1>
                    <div className="stat-row">
                        <div className="stat">
                            <span className="stat__value">{loading ? "—" : logs.length}</span>
                            <span className="stat__label">Records</span>
                        </div>
                        <div className="stat">
                            <span className="stat__value">{selected.size}</span>
                            <span className="stat__label">Selected</span>
                        </div>
                        <div className="stat stat--accent">
                            <span className="stat__value">{rendered.length}</span>
                            <span className="stat__label">Plotted</span>
                        </div>
                    </div>
                </div>

                {error && <p className="dashboard__error">{error}</p>}

                {!error && (
                    <div className="dashboard__grid">
                        <section className="panel panel--table">
                            <div className="panel__head">
                                <h2 className="panel__title">
                                    Crossings
                                    <span className="panel__meta">
                                        {loading
                                            ? "Loading…"
                                            : anyFilterActive
                                              ? `${filtered.length} of ${logs.length} rows`
                                              : `${logs.length} rows`}
                                    </span>
                                </h2>
                                <div className="panel__actions">
                                    {anyFilterActive && (
                                        <button
                                            type="button"
                                            className="btn-clear"
                                            onClick={() => setFilters(EMPTY_FILTERS)}
                                        >
                                            Clear filters
                                        </button>
                                    )}
                                    {selected.size > 0 && (
                                        <button
                                            type="button"
                                            className="btn-clear"
                                            onClick={() => setSelected(new Set())}
                                        >
                                            Clear selection
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="btn-render"
                                        onClick={handleRender}
                                        disabled={selected.size === 0}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                            <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" />
                                            <circle cx="12" cy="10" r="2.5" />
                                        </svg>
                                        Render {selected.size > 0 ? `(${selected.size})` : ""}
                                    </button>
                                </div>
                            </div>

                            <div className="log-table-wrap">
                                <table className="log-table">
                                    <thead>
                                        <tr className="head-labels">
                                            <th className="check" aria-hidden="true" />
                                            {COLUMNS.map((col) => (
                                                <th key={col.key} className={col.num ? "num" : undefined}>
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                        <tr className="head-filters">
                                            <th className="check">
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    onChange={toggleAll}
                                                    aria-label="Select all filtered rows"
                                                    disabled={loading || filtered.length === 0}
                                                />
                                            </th>
                                            {COLUMNS.map((col) => (
                                                <th key={col.key}>
                                                    {col.filter === "select" ? (
                                                        <select
                                                            value={filters[col.key]}
                                                            onChange={(e) => setFilter(col.key, e.target.value)}
                                                            aria-label={`Filter ${col.label}`}
                                                            disabled={loading}
                                                        >
                                                            <option value="">All</option>
                                                            {selectOptions[col.key]?.map((opt) => (
                                                                <option key={opt} value={opt}>
                                                                    {opt}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={filters[col.key]}
                                                            onChange={(e) => setFilter(col.key, e.target.value)}
                                                            placeholder="Filter…"
                                                            aria-label={`Filter ${col.label}`}
                                                            disabled={loading}
                                                        />
                                                    )}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading &&
                                            Array.from({ length: 12 }).map((_, i) => (
                                                <tr key={`sk-${i}`} className="skeleton-row">
                                                    <td className="check" />
                                                    {COLUMNS.map((col) => (
                                                        <td key={col.key}>
                                                            <span className="skeleton" />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}

                                        {!loading &&
                                            filtered.map((log) => {
                                                const isSel = selected.has(log.id);
                                                return (
                                                    <tr
                                                        key={log.id}
                                                        className={isSel ? "is-selected" : undefined}
                                                        onClick={() => toggleRow(log.id)}
                                                    >
                                                        <td className="check">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSel}
                                                                onChange={() => toggleRow(log.id)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                aria-label={`Select row ${log.id}`}
                                                            />
                                                        </td>
                                                        {COLUMNS.map((col) => (
                                                            <td key={col.key} className={col.num ? "num" : undefined}>
                                                                {col.get(log)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}

                                        {!loading && filtered.length === 0 && (
                                            <tr>
                                                <td colSpan={COLUMNS.length + 1} className="log-table__empty">
                                                    {logs.length === 0
                                                        ? "No records found."
                                                        : "No rows match the current filters."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="panel panel--map">
                            <div className="panel__head">
                                <h2 className="panel__title">
                                    Map
                                    <span className="panel__meta">
                                        {rendered.length > 0 ? `${rendered.length} plotted` : "empty"}
                                    </span>
                                </h2>
                            </div>

                            <div className="map-swap">
                                <div className={`map-swap__layer${rendered.length > 0 ? " is-hidden" : ""}`}>
                                    <div className="panel__empty">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                            <path d="M9 6 3 4v14l6 2 6-2 6 2V6l-6-2-6 2Z" />
                                            <path d="M9 4v14M15 6v14" />
                                        </svg>
                                        <p>
                                            Select rows and press <strong>Render</strong> to plot them here.
                                        </p>
                                    </div>
                                </div>
                                {rendered.length > 0 && (
                                    <div className="map-swap__layer map-swap__layer--in">
                                        <LogMap points={rendered} focusId={focusId} />
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}