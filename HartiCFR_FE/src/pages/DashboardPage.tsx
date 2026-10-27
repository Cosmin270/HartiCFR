import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Log } from "../types/log";
import type { Station } from "../types/station";
import DataPanel, { type ColumnDef, type Filters, type Sort } from "../components/DataPanel";
import GeoMap, { type BaseMap, type MapFocus, type MapLayer } from "../components/GeoMap";
import { useToast } from "../components/Toast";
import GlobalSearch from "../components/GlobalSearch";
import StatsPanel from "../components/StatsPanel";
import ThemeToggle from "../components/ThemeToggle";
import UserManual from "../components/UserManual";
import "./DashboardPage.scss";
import { apiUrl } from "@/lib/api";
import { hasPosition } from "@/lib/geo";
import { clearUiState, loadUiState, saveUiState } from "@/lib/storage";
import { countOf } from "@/lib/text";
import {
    CROSSING_ATTRIBUTES,
    locationTypeLabel,
    producerLabel,
    type CrossingAttribute,
} from "@/lib/categories";

const LOG_COLUMNS: ColumnDef<Log>[] = [
    { key: "id", label: "ID", filter: "text", num: true, get: (l) => l.id },
    { key: "srcf", label: "SRCF", filter: "select", get: (l) => l.srcf },
    { key: "ct", label: "Secția CT", filter: "text", get: (l) => l.ct },
    { key: "tnPosition", label: "Km TN", filter: "text", num: true, get: (l) => l.tnPosition },
    { key: "locationType", label: "Tip", filter: "select", get: (l) => locationTypeLabel(l.locationType) },
    { key: "start", label: "De la", filter: "text", get: (l) => l.location?.start },
    { key: "end", label: "Până la", filter: "text", get: (l) => l.location?.end },
    { key: "mainLine", label: "Magistrală", filter: "select", get: (l) => l.mainLine },
    { key: "electricType", label: "Instalație", filter: "select", get: (l) => l.electricType },
    { key: "configType", label: "Config", filter: "select", get: (l) => l.configType },
    { key: "producer", label: "Producător", filter: "select", get: (l) => producerLabel(l.producer) },
    { key: "operatingMode", label: "Regim", filter: "select", get: (l) => l.operatingMode },
    { key: "x", label: "Longitudine", filter: "text", num: true, get: (l) => l.position?.x },
    { key: "y", label: "Latitudine", filter: "text", num: true, get: (l) => l.position?.y },
];

const STATION_COLUMNS: ColumnDef<Station>[] = [
    { key: "id", label: "ID", filter: "text", num: true, get: (s) => s.id },
    { key: "cod", label: "Cod", filter: "text", num: true, get: (s) => s.cod },
    { key: "name", label: "Nume stație", filter: "text", get: (s) => s.name },
    { key: "x", label: "Longitudine", filter: "text", num: true, get: (s) => s.position?.x },
    { key: "y", label: "Latitudine", filter: "text", num: true, get: (s) => s.position?.y },
];

type Tab = MapLayer | "stats";

const TABS: { key: Tab; label: string; short: string; title: string; icon: React.ReactNode }[] = [
    {
        key: "crossings",
        label: "Treceri la nivel",
        short: "Treceri",
        title: "Treceri la nivel",
        icon: <path d="M7 3v18M17 3v18M7 8h10M7 16h10" />,
    },
    {
        key: "stations",
        label: "Stații",
        short: "Stații",
        title: "Stații",
        icon: (
            <>
                <path d="M4 21V9l8-6 8 6v12" />
                <path d="M9 21v-6h6v6" />
            </>
        ),
    },
    {
        key: "stats",
        label: "Statistici",
        short: "Statistici",
        title: "Statistici",
        icon: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    },
];

const NO_FILTERS: Filters = {};

const BASE_MAPS: BaseMap[] = ["standard", "satellite", "terrain"];

// What the dashboard remembers across a refresh (see lib/storage.ts).
// Records are stored by id and matched against the data once it loads.
interface SavedUi {
    tab: Tab;
    logFilters: Filters;
    stationFilters: Filters;
    logSort: Sort | null;
    stationSort: Sort | null;
    colorBy: CrossingAttribute | null;
    baseMap: BaseMap;
    railways: boolean;
    selectedLogs: number[];
    selectedStations: number[];
    renderedLogs: number[];
    renderedStations: number[];
    showCrossings: boolean;
    showStations: boolean;
}

function readSavedUi(): Partial<SavedUi> {
    const saved = loadUiState<SavedUi>();
    // Drop anything that no longer matches what the app understands.
    if (saved.tab && !TABS.some((t) => t.key === saved.tab)) delete saved.tab;
    if (saved.baseMap && !BASE_MAPS.includes(saved.baseMap)) delete saved.baseMap;
    if (saved.colorBy && !CROSSING_ATTRIBUTES.some((a) => a.key === saved.colorBy)) delete saved.colorBy;
    return saved;
}

// Shared empty lists for hidden map layers, so hiding a layer does not hand
// the memoized map a new array on every render.
const NO_LOGS: Log[] = [];
const NO_STATIONS: Station[] = [];

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
    const toast = useToast();
    const [saved] = useState(readSavedUi);
    const [tab, setTab] = useState<Tab>(saved.tab ?? "crossings");

    const [logs, setLogs] = useState<Log[]>([]);
    const [stations, setStations] = useState<Station[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    const [selectedLogs, setSelectedLogs] = useState<Set<number>>(() => new Set(saved.selectedLogs));
    const [selectedStations, setSelectedStations] = useState<Set<number>>(() => new Set(saved.selectedStations));
    const [renderedLogs, setRenderedLogs] = useState<Log[]>([]);
    const [renderedStations, setRenderedStations] = useState<Station[]>([]);
    const [showCrossings, setShowCrossings] = useState(saved.showCrossings ?? true);
    const [showStations, setShowStations] = useState(saved.showStations ?? true);
    const [focus, setFocus] = useState<MapFocus>(null);
    const [logFilters, setLogFilters] = useState<Filters>(saved.logFilters ?? NO_FILTERS);
    const [stationFilters, setStationFilters] = useState<Filters>(saved.stationFilters ?? NO_FILTERS);
    const [logSort, setLogSort] = useState<Sort | null>(saved.logSort ?? null);
    const [stationSort, setStationSort] = useState<Sort | null>(saved.stationSort ?? null);
    const [colorBy, setColorBy] = useState<CrossingAttribute | null>(saved.colorBy ?? null);
    const [baseMap, setBaseMap] = useState<BaseMap>(saved.baseMap ?? "standard");
    const [railways, setRailways] = useState(saved.railways ?? false);
    const [mapFull, setMapFull] = useState(false);
    const mapPanelRef = useRef<HTMLElement>(null);
    // Set once the saved map contents have been matched against loaded data;
    // until then, saving would overwrite them with the empty initial state.
    const restoredRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError("");
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
                    throw new Error(`Serverul a răspuns cu ${logsRes.status}/${stationsRes.status}`);
                }

                const [logsData, stationsData]: [Log[], Station[]] = await Promise.all([
                    logsRes.json(),
                    stationsRes.json(),
                ]);
                if (!cancelled) {
                    setLogs(logsData);
                    setStations(stationsData);
                    if (!restoredRef.current) {
                        restoredRef.current = true;
                        const logIds = new Set(logsData.map((l) => l.id));
                        const stationIds = new Set(stationsData.map((s) => s.id));
                        const plottedLogs = new Set(saved.renderedLogs);
                        const plottedStations = new Set(saved.renderedStations);
                        setSelectedLogs((prev) => new Set([...prev].filter((id) => logIds.has(id))));
                        setSelectedStations((prev) => new Set([...prev].filter((id) => stationIds.has(id))));
                        setRenderedLogs(logsData.filter((l) => plottedLogs.has(l.id)));
                        setRenderedStations(stationsData.filter((s) => plottedStations.has(s.id)));
                    }
                }
            } catch (err) {
                if (!cancelled) setError("Nu am putut încărca datele de pe server.");
                console.error(err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [navigate, reloadKey, saved]);

    useEffect(() => {
        if (!restoredRef.current) return;
        saveUiState<SavedUi>({
            tab,
            logFilters,
            stationFilters,
            logSort,
            stationSort,
            colorBy,
            baseMap,
            railways,
            selectedLogs: [...selectedLogs],
            selectedStations: [...selectedStations],
            renderedLogs: renderedLogs.map((l) => l.id),
            renderedStations: renderedStations.map((s) => s.id),
            showCrossings,
            showStations,
        });
    }, [
        tab,
        logFilters,
        stationFilters,
        logSort,
        stationSort,
        colorBy,
        baseMap,
        railways,
        selectedLogs,
        selectedStations,
        renderedLogs,
        renderedStations,
        showCrossings,
        showStations,
    ]);

    const plottedCount = renderedLogs.length + renderedStations.length;

    // Fullscreen map: Escape leaves it, and the page behind must not scroll.
    useEffect(() => {
        if (!mapFull || plottedCount === 0) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setMapFull(false);
        }
        window.addEventListener("keydown", onKey);
        document.body.classList.add("is-map-fullscreen");
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.classList.remove("is-map-fullscreen");
        };
    }, [mapFull, plottedCount]);

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
        const nextLogs = logs.filter((l) => selectedLogs.has(l.id));
        const nextStations = stations.filter((s) => selectedStations.has(s.id));
        setRenderedLogs(nextLogs);
        setRenderedStations(nextStations);
        setShowCrossings(true);
        setShowStations(true);

        // Records without coordinates cannot be placed; say so instead of
        // leaving the user to wonder why the map shows fewer points.
        const unplaced =
            nextLogs.filter((l) => !hasPosition(l.position)).length +
            nextStations.filter((s) => !hasPosition(s.position)).length;
        if (unplaced > 0) {
            toast({
                tone: "warning",
                message: `${countOf(unplaced, "înregistrare selectată nu are", "înregistrări selectate nu au")} coordonate, deci nu ${unplaced === 1 ? "apare" : "apar"} pe hartă.`,
            });
        }

        // Stacked layout: the map lives below the table and is off-screen, so
        // rendering would look like nothing happened. Bring it into view.
        if (window.matchMedia("(max-width: 1024px)").matches) {
            const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            requestAnimationFrame(() => {
                mapPanelRef.current?.scrollIntoView({
                    behavior: reduceMotion ? "auto" : "smooth",
                    block: "start",
                });
            });
        }
    }

    // A search result goes straight onto the map: selected, plotted and
    // highlighted, with its table open on the matching row. Table filters
    // are cleared so they cannot hide the row that was asked for.
    const showOnMap = useCallback(
        (layer: MapLayer, id: number) => {
            if (layer === "crossings") {
                const log = logs.find((l) => l.id === id);
                if (!log) return;
                setSelectedLogs((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
                setRenderedLogs((prev) => (prev.some((l) => l.id === id) ? prev : [...prev, log]));
                setShowCrossings(true);
                setLogFilters(NO_FILTERS);
            } else {
                const station = stations.find((s) => s.id === id);
                if (!station) return;
                setSelectedStations((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
                setRenderedStations((prev) => (prev.some((s) => s.id === id) ? prev : [...prev, station]));
                setShowStations(true);
                setStationFilters(NO_FILTERS);
            }
            setTab(layer);
            setFocus({ layer, id });
        },
        [logs, stations]
    );

    // Clicking a point on the map opens its table and highlights its row.
    const pickOnMap = useCallback((layer: MapLayer, id: number) => {
        setTab(layer);
        setFocus({ layer, id });
    }, []);

    // From the statistics tab: open the crossings table filtered to one value.
    const openFiltered = useCallback((column: string, value: string) => {
        setLogFilters({ [column]: value });
        setTab("crossings");
        window.scrollTo({ top: 0 });
    }, []);

    function clearLayer(layer: MapLayer) {
        const previous = layer === "crossings" ? renderedLogs : renderedStations;
        if (layer === "crossings") setRenderedLogs([]);
        else setRenderedStations([]);
        setFocus(null);
        toast({
            message: `Am eliminat de pe hartă ${
                layer === "crossings"
                    ? countOf(previous.length, "trecere", "treceri")
                    : countOf(previous.length, "stație", "stații")
            }.`,
            action: {
                label: "Anulează",
                onClick: () =>
                    layer === "crossings"
                        ? setRenderedLogs(previous as Log[])
                        : setRenderedStations(previous as Station[]),
            },
        });
    }

    function clearSelection(layer: MapLayer) {
        const previous = layer === "crossings" ? selectedLogs : selectedStations;
        if (layer === "crossings") setSelectedLogs(new Set());
        else setSelectedStations(new Set());
        toast({
            message: `Am deselectat ${
                layer === "crossings"
                    ? countOf(previous.size, "trecere", "treceri")
                    : countOf(previous.size, "stație", "stații")
            }.`,
            action: {
                label: "Anulează",
                onClick: () => (layer === "crossings" ? setSelectedLogs(previous) : setSelectedStations(previous)),
            },
        });
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
        // The next person on this browser starts from a clean dashboard.
        clearUiState();
        navigate("/login");
    }

    const visibleCrossings = showCrossings ? renderedLogs : NO_LOGS;
    const visibleStations = showStations ? renderedStations : NO_STATIONS;
    const activeRecords = tab === "stations" ? stations.length : logs.length;
    const activeSelected = tab === "crossings" ? selectedLogs.size : selectedStations.size;
    const totalSelected = selectedLogs.size + selectedStations.size;

    return (
        <div className="dashboard">
            <header className="appbar">
                <div className="appbar__brand">
                    <img src="/logo.png" alt="" className="appbar__logo" />
                    <span className="appbar__wordmark">Harti CFR</span>
                </div>

                <nav className="appbar__tabs" role="tablist" aria-label="Seturi de date">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            role="tab"
                            aria-selected={tab === t.key}
                            className={`appbar__tab${tab === t.key ? " is-active" : ""}`}
                            onClick={() => setTab(t.key)}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                {t.icon}
                            </svg>
                            <span className="appbar__tab-label">{t.label}</span>
                            <span className="appbar__tab-short" aria-hidden="true">{t.short}</span>
                        </button>
                    ))}
                </nav>

                <div className="appbar__end">
                    <GlobalSearch logs={logs} stations={stations} onPick={showOnMap} />
                    <UserManual />
                    <ThemeToggle />

                    <button
                        type="button"
                        className="appbar__logout"
                        onClick={handleLogout}
                        aria-label="Deconectare"
                        title="Deconectare"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <path d="m16 17 5-5-5-5M21 12H9" />
                        </svg>
                        <span className="appbar__logout-label">Deconectare</span>
                    </button>
                </div>
            </header>

            <main className="dashboard__body">
                <div className="dashboard__head">
                    <h1 className="dashboard__title">
                        {TABS.find((t) => t.key === tab)?.title}
                    </h1>
                    <div className={`stat-row${tab === "stats" ? " is-hidden" : ""}`}>
                        <div className="stat">
                            <span className="stat__value">{loading ? "—" : activeRecords}</span>
                            <span className="stat__label">Înregistrări</span>
                        </div>
                        <div className="stat">
                            <span className="stat__value">{totalSelected}</span>
                            <span className="stat__label">
                                Selectate{totalSelected > activeSelected ? ` (${activeSelected} aici)` : ""}
                            </span>
                        </div>
                        <div className="stat stat--accent">
                            <span className="stat__value">{plottedCount}</span>
                            <span className="stat__label">Pe hartă</span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="dashboard__error" role="alert">
                        <span>{error}</span>
                        <button
                            type="button"
                            className="btn-clear"
                            onClick={() => setReloadKey((k) => k + 1)}
                        >
                            Reîncearcă
                        </button>
                    </div>
                )}

                {!error && tab === "stats" && (
                    <StatsPanel logs={logs} stations={stations} loading={loading} onFilter={openFiltered} />
                )}

                {/* Kept mounted on the statistics tab so selections, filters
                    and the map survive the round trip. */}
                {!error && (
                    <div className={`dashboard__grid${tab === "stats" ? " is-hidden" : ""}`}>
                        <div className="dashboard__tables">
                            <DataPanel
                                title="Treceri la nivel"
                                exportName="treceri-la-nivel"
                                columns={LOG_COLUMNS}
                                rows={logs}
                                loading={loading}
                                emptyText="Nu există treceri la nivel."
                                selected={selectedLogs}
                                filters={logFilters}
                                onFiltersChange={setLogFilters}
                                sort={logSort}
                                onSortChange={setLogSort}
                                focusedId={focus?.layer === "crossings" ? focus.id : null}
                                onToggleRow={toggleLogRow}
                                onSelectMany={(ids, select) =>
                                    setSelectedLogs((prev) => setManyInSet(prev, ids, select))
                                }
                                onClearSelection={() => clearSelection("crossings")}
                                onRender={renderAll}
                                renderCount={totalSelected}
                                hidden={tab !== "crossings"}
                            />
                            <DataPanel
                                title="Stații"
                                exportName="statii"
                                columns={STATION_COLUMNS}
                                rows={stations}
                                loading={loading}
                                emptyText="Nu există stații."
                                selected={selectedStations}
                                filters={stationFilters}
                                onFiltersChange={setStationFilters}
                                sort={stationSort}
                                onSortChange={setStationSort}
                                focusedId={focus?.layer === "stations" ? focus.id : null}
                                onToggleRow={toggleStationRow}
                                onSelectMany={(ids, select) =>
                                    setSelectedStations((prev) => setManyInSet(prev, ids, select))
                                }
                                onClearSelection={() => clearSelection("stations")}
                                onRender={renderAll}
                                renderCount={totalSelected}
                                hidden={tab !== "stations"}
                            />
                        </div>

                        <section
                            className={`panel panel--map${mapFull && plottedCount > 0 ? " is-fullscreen" : ""}`}
                            ref={mapPanelRef}
                            aria-label={mapFull ? "Hartă pe tot ecranul" : undefined}
                        >
                            <div className="panel__head">
                                <h2 className="panel__title">
                                    Hartă
                                    <span className="panel__meta">
                                        {plottedCount > 0 ? `${plottedCount} pe hartă` : "goală"}
                                    </span>
                                </h2>
                                <label className="color-by">
                                    <span>Culoare treceri</span>
                                    <select
                                        value={colorBy ?? ""}
                                        onChange={(e) =>
                                            setColorBy((e.target.value || null) as CrossingAttribute | null)
                                        }
                                    >
                                        <option value="">Uniformă</option>
                                        {CROSSING_ATTRIBUTES.map((a) => (
                                            <option key={a.key} value={a.key}>
                                                După {a.label.toLowerCase()}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <div className="layer-legend" aria-label="Straturi hartă">
                                    <div className="layer-chip layer-chip--crossings">
                                        <button
                                            type="button"
                                            className={`layer-chip__toggle${showCrossings ? "" : " is-off"}`}
                                            onClick={() => setShowCrossings((v) => !v)}
                                            aria-pressed={showCrossings}
                                            title={showCrossings ? "Ascunde trecerile la nivel" : "Arată trecerile la nivel"}
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
                                                aria-label="Elimină trecerile de pe hartă"
                                                title="Elimină trecerile de pe hartă"
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
                                            title={showStations ? "Ascunde stațiile" : "Arată stațiile"}
                                        >
                                            <span className="layer-chip__dot" />
                                            Stații
                                            <span className="layer-chip__count">{renderedStations.length}</span>
                                        </button>
                                        {renderedStations.length > 0 && (
                                            <button
                                                type="button"
                                                className="layer-chip__clear"
                                                onClick={() => clearLayer("stations")}
                                                aria-label="Elimină stațiile de pe hartă"
                                                title="Elimină stațiile de pe hartă"
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
                                            Bifează rânduri din tabel și apasă <strong>Afișează pe hartă</strong>.
                                            Trecerile la nivel și stațiile pot fi afișate împreună.
                                        </p>
                                    </div>
                                </div>
                                {plottedCount > 0 && (
                                    <div className="map-swap__layer map-swap__layer--in">
                                        <GeoMap
                                            crossings={visibleCrossings}
                                            stations={visibleStations}
                                            allStations={stations}
                                            colorBy={colorBy}
                                            focus={focus}
                                            onPick={pickOnMap}
                                            baseMap={baseMap}
                                            onBaseMapChange={setBaseMap}
                                            railways={railways}
                                            onRailwaysChange={setRailways}
                                            fullscreen={mapFull}
                                            onFullscreenChange={setMapFull}
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