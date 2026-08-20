import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Log } from "../types/log";
import type { Station } from "../types/station";
import DataPanel, { type ColumnDef } from "../components/DataPanel";
import GeoMap, { type MapFocus, type MapLayer } from "../components/GeoMap";
import "./DashboardPage.scss";
import { apiUrl } from "@/lib/api";

const LOG_COLUMNS: ColumnDef<Log>[] = [
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

const STATION_COLUMNS: ColumnDef<Station>[] = [
    { key: "id", label: "ID", filter: "text", num: true, get: (s) => s.id },
    { key: "cod", label: "Cod", filter: "text", num: true, get: (s) => s.cod },
    { key: "name", label: "Nume statie", filter: "text", get: (s) => s.name },
    { key: "x", label: "Longitudine", filter: "text", num: true, get: (s) => s.position?.x },
    { key: "y", label: "Latitudine", filter: "text", num: true, get: (s) => s.position?.y },
];

const TABS: { key: MapLayer; label: string }[] = [
    { key: "crossings", label: "Treceri la nivel" },
    { key: "stations", label: "Statii" },
];

function toggleInSet(prev: Set<number>, id: number): Set<number> {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
}

function setManyInSet(prev: Set<number>, ids: number[], select: boolean): Set<number> {
    const next = new Set(prev);
    ids.forEach((id) => (select ? next.add(id) : next.delete(id)));
    return next;
}

export default function DashboardPage() {
    const navigate = useNavigate();
    const [tab, setTab] = useState<MapLayer>("crossings");

    const [logs, setLogs] = useState<Log[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedLogs, setSelectedLogs] = useState<Set<number>>(new Set());
    const [selectedStations, setSelectedStations] = useState<Set<number>>(new Set());
    const [renderedLogs, setRenderedLogs] = useState<Log[]>([]);
    const [renderedStations, setRenderedStations] = useState<Station[]>([]);
    const [showCrossings, setShowCrossings] = useState(true);
    const [showStations, setShowStations] = useState(true);
    const [focus, setFocus] = useState<MapFocus>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const [logsRes, stationsRes] = await Promise.all([
                    fetch(apiUrl("/api/Log/logs"), { credentials: "include" }),
                    fetch(apiUrl("/api/Station/stations"), { credentials: "include" }),
                ]);

                if (logsRes.status === 401 || stationsRes.status === 401) {
                    navigate("/login");
                    return;
                }
                if (!logsRes.ok || !stationsRes.ok) {
                    throw new Error(`Server responded with ${logsRes.status}/${stationsRes.status}`);
                }

                const [logsData, stationsData]: [Log[], Station[]] = await Promise.all([
                    logsRes.json(),
                    stationsRes.json(),
                ]);
                if (!cancelled) {
                    setLogs(logsData);
                    setStations(stationsData);
                }
            } catch (err) {
                if (!cancelled) setError("Could not load data. Is the server running?");
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

    // Refs mirror the latest selection so the toggle callbacks below can stay
    // referentially stable (empty deps). Stable callbacks are what let the
    // memoized table rows skip re-rendering on every click.
    const selectedLogsRef = useRef(selectedLogs);
    selectedLogsRef.current = selectedLogs;
    const selectedStationsRef = useRef(selectedStations);
    selectedStationsRef.current = selectedStations;

    const toggleLogRow = useCallback((id: number) => {
        const wasSelected = selectedLogsRef.current.has(id);
        setSelectedLogs((prev) => toggleInSet(prev, id));
        setFocus(wasSelected ? null : { layer: "crossings", id });
    }, []);

    const toggleStationRow = useCallback((id: number) => {
        const wasSelected = selectedStationsRef.current.has(id);
        setSelectedStations((prev) => toggleInSet(prev, id));
        setFocus(wasSelected ? null : { layer: "stations", id });
    }, []);

    function renderAll() {
        setRenderedLogs(logs.filter((l) => selectedLogs.has(l.id)));
        setRenderedStations(stations.filter((s) => selectedStations.has(s.id)));
        setShowCrossings(true);
        setShowStations(true);
    }

    function clearLayer(layer: MapLayer) {
        if (layer === "crossings") setRenderedLogs([]);
        else setRenderedStations([]);
        setFocus(null);
    }

    async function handleLogout() {
        try {
            await fetch(apiUrl("/api/auth/logout"), {
                method: "POST",
                credentials: "include",
            });
        } catch {
            void 0;
        }
        navigate("/login");
    }

    const visibleCrossings = showCrossings ? renderedLogs : [];
    const visibleStations = showStations ? renderedStations : [];
    const plottedCount = renderedLogs.length + renderedStations.length;
    const activeRecords = tab === "crossings" ? logs.length : stations.length;
    const activeSelected = tab === "crossings" ? selectedLogs.size : selectedStations.size;
    const totalSelected = selectedLogs.size + selectedStations.size;

    return (
        <div className="dashboard">
            <header className="appbar">
                <div className="appbar__brand">
                    <img src="/logo.png" alt="" className="appbar__logo" />
                    <span className="appbar__wordmark">Harti CFR</span>
                </div>

                <nav className="appbar__tabs" role="tablist" aria-label="Datasets">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            role="tab"
                            aria-selected={tab === t.key}
                            className={`appbar__tab${tab === t.key ? " is-active" : ""}`}
                            onClick={() => setTab(t.key)}
                        >
                            {t.key === "crossings" ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M7 3v18M17 3v18M7 8h10M7 16h10" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M4 21V9l8-6 8 6v12" />
                                    <path d="M9 21v-6h6v6" />
                                </svg>
                            )}
                            {t.label}
                        </button>
                    ))}
                </nav>

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
                    <h1 className="dashboard__title">
                        {tab === "crossings" ? "Treceri la nivel" : "Statii"}
                    </h1>
                    <div className="stat-row">
                        <div className="stat">
                            <span className="stat__value">{loading ? "—" : activeRecords}</span>
                            <span className="stat__label">Records</span>
                        </div>
                        <div className="stat">
                            <span className="stat__value">{totalSelected}</span>
                            <span className="stat__label">
                                Selected{totalSelected > activeSelected ? ` (${activeSelected} here)` : ""}
                            </span>
                        </div>
                        <div className="stat stat--accent">
                            <span className="stat__value">{plottedCount}</span>
                            <span className="stat__label">Plotted</span>
                        </div>
                    </div>
                </div>

                {error && <p className="dashboard__error">{error}</p>}

                {!error && (
                    <div className="dashboard__grid">
                        <div className="dashboard__tables">
                            <DataPanel
                                title="Crossings"
                                columns={LOG_COLUMNS}
                                rows={logs}
                                loading={loading}
                                emptyText="No crossings found."
                                selected={selectedLogs}
                                focusedId={focus?.layer === "crossings" ? focus.id : null}
                                onToggleRow={toggleLogRow}
                                onSelectMany={(ids, select) =>
                                    setSelectedLogs((prev) => setManyInSet(prev, ids, select))
                                }
                                onClearSelection={() => setSelectedLogs(new Set())}
                                onRender={renderAll}
                                renderCount={totalSelected}
                                hidden={tab !== "crossings"}
                            />
                            <DataPanel
                                title="Stations"
                                columns={STATION_COLUMNS}
                                rows={stations}
                                loading={loading}
                                emptyText="No stations found."
                                selected={selectedStations}
                                focusedId={focus?.layer === "stations" ? focus.id : null}
                                onToggleRow={toggleStationRow}
                                onSelectMany={(ids, select) =>
                                    setSelectedStations((prev) => setManyInSet(prev, ids, select))
                                }
                                onClearSelection={() => setSelectedStations(new Set())}
                                onRender={renderAll}
                                renderCount={totalSelected}
                                hidden={tab !== "stations"}
                            />
                        </div>

                        <section className="panel panel--map">
                            <div className="panel__head">
                                <h2 className="panel__title">
                                    Map
                                    <span className="panel__meta">
                                        {plottedCount > 0 ? `${plottedCount} plotted` : "empty"}
                                    </span>
                                </h2>
                                <div className="layer-legend" aria-label="Map layers">
                                    <div className="layer-chip layer-chip--crossings">
                                        <button
                                            type="button"
                                            className={`layer-chip__toggle${showCrossings ? "" : " is-off"}`}
                                            onClick={() => setShowCrossings((v) => !v)}
                                            aria-pressed={showCrossings}
                                            title={showCrossings ? "Hide crossings layer" : "Show crossings layer"}
                                        >
                                            <span className="layer-chip__dot" />
                                            Treceri
                                            <span className="layer-chip__count">{renderedLogs.length}</span>
                                        </button>
                                        {renderedLogs.length > 0 && (
                                            <button
                                                type="button"
                                                className="layer-chip__clear"
                                                onClick={() => clearLayer("crossings")}
                                                aria-label="Remove crossings from map"
                                                title="Remove crossings from map"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                    <div className="layer-chip layer-chip--stations">
                                        <button
                                            type="button"
                                            className={`layer-chip__toggle${showStations ? "" : " is-off"}`}
                                            onClick={() => setShowStations((v) => !v)}
                                            aria-pressed={showStations}
                                            title={showStations ? "Hide stations layer" : "Show stations layer"}
                                        >
                                            <span className="layer-chip__dot" />
                                            Statii
                                            <span className="layer-chip__count">{renderedStations.length}</span>
                                        </button>
                                        {renderedStations.length > 0 && (
                                            <button
                                                type="button"
                                                className="layer-chip__clear"
                                                onClick={() => clearLayer("stations")}
                                                aria-label="Remove stations from map"
                                                title="Remove stations from map"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="map-swap">
                                <div className={`map-swap__layer${plottedCount > 0 ? " is-hidden" : ""}`}>
                                    <div className="panel__empty">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                            <path d="M9 6 3 4v14l6 2 6-2 6 2V6l-6-2-6 2Z" />
                                            <path d="M9 4v14M15 6v14" />
                                        </svg>
                                        <p>
                                            Select rows and press <strong>Render</strong> to plot them here.
                                            Crossings and stations can be plotted together.
                                        </p>
                                    </div>
                                </div>
                                {plottedCount > 0 && (
                                    <div className="map-swap__layer map-swap__layer--in">
                                        <GeoMap
                                            crossings={visibleCrossings}
                                            stations={visibleStations}
                                            focus={focus}
                                        />
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