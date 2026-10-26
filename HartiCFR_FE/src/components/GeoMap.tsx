import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L, { LatLngBounds, divIcon, type DivIcon, type LayerGroup } from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Log, Position } from "../types/log";
import type { Station } from "../types/station";
import { formatKm, hasPosition, nearestStation } from "@/lib/geo";
import {
    attributeDef,
    categoryColor,
    countCategories,
    locationTypeLabel,
    producerLabel,
    type CrossingAttribute,
} from "@/lib/categories";
import { formatNumber } from "@/lib/text";
import { useTheme } from "@/lib/theme";
import "./GeoMap.scss";

export type MapLayer = "crossings" | "stations";
export type MapFocus = { layer: MapLayer; id: number } | null;
export type BaseMap = "standard" | "satellite" | "terrain";

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface TileSource {
    label: string;
    url: string;
    attribution: string;
    // Zoom levels past this are upscaled from the last available tiles.
    maxNativeZoom: number;
}

const BASE_LAYERS: Record<BaseMap, TileSource> = {
    standard: {
        label: "Hartă",
        url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY ?? ""}`,
        attribution: `${OSM_ATTRIBUTION} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
        maxNativeZoom: 19,
    },
    satellite: {
        label: "Satelit",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: "Imagini &copy; Esri, Maxar, Earthstar Geographics",
        maxNativeZoom: 19,
    },
    terrain: {
        label: "Relief",
        url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        attribution: `${OSM_ATTRIBUTION}, SRTM &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)`,
        maxNativeZoom: 17,
    },
};

const DARK_STANDARD: TileSource = {
    ...BASE_LAYERS.standard,
    url: BASE_LAYERS.standard.url.replace("/voyager/", "/dark_all/"),
};

// Railway lines drawn over any base map, from the OpenRailwayMap project.
const RAILWAY_LAYER: TileSource = {
    label: "Căi ferate",
    url: "https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png",
    attribution: '<a href="https://www.openrailwaymap.org/">OpenRailwayMap</a> (CC-BY-SA)',
    maxNativeZoom: 19,
};

const LAYER_COLORS: Record<MapLayer, string> = {
    crossings: "#0d9488",
    stations: "#ea580c",
};

const FOCUS_COLOR = "#f59e0b";

function buildDotIcon(color: string, isFocused: boolean): DivIcon {
    const size = isFocused ? 20 : 14;
    const className = isFocused ? "map-marker map-marker--focused" : "map-marker";
    return divIcon({
        className: "",
        html: `<span class="${className}" style="
            display:block;
            width:${size}px;
            height:${size}px;
            border-radius:50%;
            background:${color};
            border:2px solid #fff;
            box-shadow:0 1px 3px rgba(0,0,0,0.35);
        "></span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

// Built once instead of allocating a fresh DivIcon per marker.
const DOT_ICONS: Record<MapLayer, DivIcon> = {
    crossings: buildDotIcon(LAYER_COLORS.crossings, false),
    stations: buildDotIcon(LAYER_COLORS.stations, false),
};
const FOCUS_ICON = buildDotIcon(FOCUS_COLOR, true);

function clusterIcon(layer: MapLayer) {
    return (cluster: { getChildCount: () => number }) => {
        const count = cluster.getChildCount();
        const size = count < 10 ? 32 : count < 100 ? 40 : 48;
        return divIcon({
            html: `<div style="
                display:flex;
                align-items:center;
                justify-content:center;
                width:${size}px;
                height:${size}px;
                border-radius:50%;
                background:${LAYER_COLORS[layer]};
                color:#fff;
                font-weight:600;
                font-family:var(--font-body, sans-serif);
                border:2px solid #fff;
                box-shadow:0 2px 6px rgba(0,0,0,0.35);
            ">${count}</div>`,
            className: "map-cluster",
            iconSize: [size, size],
        });
    };
}

const TOOLTIP_OPTIONS: L.TooltipOptions = { direction: "top", offset: [0, -6], opacity: 1 };

const HTML_ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

function esc(value: unknown): string {
    return String(value ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function tipHtml(layer: MapLayer, title: string, rows: [string, unknown][], footer = ""): string {
    const items = rows.map(([label, value]) => `<li><span>${label}</span>${esc(value)}</li>`).join("");
    return `<div class="geo-map__tip">
        <strong class="geo-map__tip-title">
            <span class="geo-map__tip-dot geo-map__tip-dot--${layer}"></span>${esc(title)}
        </strong>
        <ul>${items}</ul>
        ${footer}
        <p class="geo-map__tip-hint">Clic pentru a vedea rândul în tabel</p>
    </div>`;
}

function coordText(pos: Position): string {
    return `${pos.y.toFixed(5)}, ${pos.x.toFixed(5)}`;
}

function crossingTip(log: Log, stations: Station[]): string {
    const route = `${log.location?.start || "—"}${log.location?.end ? ` → ${log.location.end}` : ""}`;
    const nearest = nearestStation(log.position, stations);
    const footer = nearest
        ? `<p class="geo-map__tip-near">Cea mai apropiată stație: <b>${esc(nearest.station.name)}</b> · ${formatKm(nearest.km)}</p>`
        : "";
    return tipHtml(
        "crossings",
        `#${log.id} · ${route}`,
        [
            ["SRCF", log.srcf],
            ["Secția CT", log.ct],
            ["Km TN", log.tnPosition],
            ["Tip", locationTypeLabel(log.locationType)],
            ["Magistrală", log.mainLine || "—"],
            ["Instalație", log.electricType],
            ["Config", log.configType],
            ["Producător", producerLabel(log.producer)],
            ["Regim", log.operatingMode],
            ["Coordonate", coordText(log.position)],
        ],
        footer
    );
}

function stationTip(station: Station): string {
    return tipHtml("stations", station.name, [
        ["Tip", "Stație"],
        ["Cod", station.cod],
        ["Coordonate", coordText(station.position)],
    ]);
}

type Point = { id: number; position: Position };
type PickHandler = (layer: MapLayer, id: number) => void;

// One canvas renderer for every coloured-dot layer: drawing ~1,200 circles
// on a canvas is far cheaper than ~1,200 DOM markers.
const canvasRenderer = L.canvas({ padding: 0.5 });

// Markers are created directly on a Leaflet layer instead of as React
// <Marker>/<Tooltip> components. With thousands of points, the component
// version kept a tooltip DOM tree per marker and re-walked every one of them
// on each dashboard render; here a layer is rebuilt only when its data
// changes, and a tooltip is rendered only when it is opened.
//
// Without colorOf, points are clustered. With it, they are drawn as small
// coloured dots and left unclustered, since a cluster badge would hide the
// very categories the colouring is meant to show.
function PointLayerInner<T extends Point>({
    layer,
    items,
    tooltip,
    colorOf,
    onPick,
}: {
    layer: MapLayer;
    items: T[];
    tooltip: (item: T) => string;
    colorOf?: (item: T) => string;
    onPick: PickHandler;
}) {
    const map = useMap();
    const groupRef = useRef<LayerGroup | null>(null);
    const clustered = !colorOf;

    useEffect(() => {
        const group = clustered
            ? L.markerClusterGroup({
                  iconCreateFunction: clusterIcon(layer),
                  spiderfyOnMaxZoom: true,
                  showCoverageOnHover: false,
                  maxClusterRadius: 35,
                  disableClusteringAtZoom: 13,
                  chunkedLoading: true,
              })
            : L.layerGroup();
        map.addLayer(group);
        groupRef.current = group;
        return () => {
            map.removeLayer(group);
            groupRef.current = null;
        };
    }, [map, layer, clustered]);

    useEffect(() => {
        const group = groupRef.current;
        if (!group) return;
        group.clearLayers();
        const markers = items.map((item) => {
            const at: [number, number] = [item.position.y, item.position.x];
            const marker = colorOf
                ? L.circleMarker(at, {
                      renderer: canvasRenderer,
                      radius: 5,
                      color: "#ffffff",
                      weight: 1.5,
                      fillColor: colorOf(item),
                      fillOpacity: 1,
                  })
                : L.marker(at, { icon: DOT_ICONS[layer] });
            return marker
                .bindTooltip(() => tooltip(item), TOOLTIP_OPTIONS)
                .on("click", () => onPick(layer, item.id));
        });
        if (group instanceof L.MarkerClusterGroup) group.addLayers(markers);
        else markers.forEach((m) => group.addLayer(m));
    }, [items, layer, tooltip, colorOf, onPick, clustered]);

    return null;
}
const PointLayer = memo(PointLayerInner) as typeof PointLayerInner;

// The highlighted point is drawn as its own marker above the others, so
// moving the focus never touches the (possibly thousands of) other markers.
// It ignores the pointer, letting hover reach the regular marker underneath.
function FocusMarker({ target }: { target: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (!target) return;
        const marker = L.marker(target, {
            icon: FOCUS_ICON,
            interactive: false,
            keyboard: false,
            zIndexOffset: 1000,
        }).addTo(map);
        return () => {
            marker.remove();
        };
    }, [map, target]);
    return null;
}

// For a highlighted crossing: a dashed line to the closest station, labelled
// with the station name and distance.
function NearestLink({ crossing, stations }: { crossing: Log | null; stations: Station[] }) {
    const map = useMap();
    useEffect(() => {
        if (!crossing) return;
        const nearest = nearestStation(crossing.position, stations);
        if (!nearest) return;
        const from: [number, number] = [crossing.position.y, crossing.position.x];
        const to: [number, number] = [nearest.station.position.y, nearest.station.position.x];
        const group = L.layerGroup([
            L.polyline([from, to], {
                color: LAYER_COLORS.stations,
                weight: 2,
                dashArray: "6 6",
                interactive: false,
            }),
            L.circleMarker(to, {
                radius: 7,
                color: LAYER_COLORS.stations,
                weight: 3,
                fillColor: "#ffffff",
                fillOpacity: 1,
                interactive: false,
            }).bindTooltip(`${esc(nearest.station.name)} · ${formatKm(nearest.km)}`, {
                permanent: true,
                direction: "right",
                offset: [10, 0],
                className: "geo-map__near-label",
            }),
        ]).addTo(map);
        return () => {
            group.remove();
        };
    }, [map, crossing, stations]);
    return null;
}

function FitBounds({ coords }: { coords: [number, number][] }) {
    const map = useMap();
    useEffect(() => {
        if (coords.length === 0) return;
        map.fitBounds(new LatLngBounds(coords), { padding: [40, 40], maxZoom: 14 });
    }, [coords, map]);
    return null;
}

// Flies to the highlighted point only when the highlight itself changes
// (keyed by focusKey), not when a re-plot rebuilds the point lists; a new
// batch of points should get FitBounds' overview instead.
function FocusPoint({ target, focusKey }: { target: [number, number] | null; focusKey: string | null }) {
    const map = useMap();
    const targetRef = useRef(target);
    targetRef.current = target;
    useEffect(() => {
        const at = targetRef.current;
        if (!focusKey || !at) return;
        map.flyTo(at, Math.max(map.getZoom(), 13), { duration: 0.8 });
    }, [focusKey, map]);
    return null;
}

// Leaflet measures its container once; tell it when the container changes
// size (window resize, the panel being shown again after the statistics tab).
function SizeWatcher() {
    const map = useMap();
    useEffect(() => {
        const observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(map.getContainer());
        return () => observer.disconnect();
    }, [map]);
    return null;
}

interface GeoMapProps {
    baseMap: BaseMap;
    onBaseMapChange: (base: BaseMap) => void;
    railways: boolean;
    onRailwaysChange: (on: boolean) => void;
    fullscreen: boolean;
    onFullscreenChange: (on: boolean) => void;
    crossings: Log[];
    stations: Station[];
    // Every station, plotted or not, for the nearest-station lookup.
    allStations: Station[];
    colorBy: CrossingAttribute | null;
    focus?: MapFocus;
    onPick: PickHandler;
}

function GeoMap({
    baseMap,
    onBaseMapChange,
    railways,
    onRailwaysChange,
    fullscreen,
    onFullscreenChange,
    crossings,
    stations,
    allStations,
    colorBy,
    focus = null,
    onPick,
}: GeoMapProps) {
    const theme = useTheme();
    // The street map has a dark twin; satellite and relief look the same in both themes.
    const base = baseMap === "standard" && theme === "dark" ? DARK_STANDARD : BASE_LAYERS[baseMap];

    const validCrossings = useMemo(() => crossings.filter((c) => hasPosition(c.position)), [crossings]);
    const validStations = useMemo(() => stations.filter((s) => hasPosition(s.position)), [stations]);

    const coords = useMemo<[number, number][]>(
        () => [
            ...validCrossings.map((c): [number, number] => [c.position.y, c.position.x]),
            ...validStations.map((s): [number, number] => [s.position.y, s.position.x]),
        ],
        [validCrossings, validStations]
    );

    const focusLayer = focus?.layer ?? null;
    const focusId = focus?.id ?? null;
    const focusedCrossing = useMemo(
        () => (focusLayer === "crossings" ? validCrossings.find((c) => c.id === focusId) ?? null : null),
        [focusLayer, focusId, validCrossings]
    );
    const focusTarget = useMemo<[number, number] | null>(() => {
        const point =
            focusLayer === "crossings"
                ? focusedCrossing
                : focusLayer === "stations"
                  ? validStations.find((s) => s.id === focusId)
                  : null;
        return point ? [point.position.y, point.position.x] : null;
    }, [focusLayer, focusId, focusedCrossing, validStations]);

    // Keep the handler identity stable so the point layers are not rebuilt
    // whenever the parent re-renders.
    const pickRef = useRef(onPick);
    pickRef.current = onPick;
    const handlePick = useCallback<PickHandler>((layer, id) => pickRef.current(layer, id), []);

    const crossingTooltip = useCallback((log: Log) => crossingTip(log, allStations), [allStations]);

    const colorDef = colorBy ? attributeDef(colorBy) : null;
    const crossingColor = useMemo(
        () => (colorDef ? (log: Log) => categoryColor(colorDef, colorDef.get(log)) : undefined),
        [colorDef]
    );
    const legend = useMemo(
        () => (colorDef ? countCategories(colorDef, validCrossings) : []),
        [colorDef, validCrossings]
    );

    return (
        <div className="geo-map">
            <MapContainer
                className="geo-map__canvas"
                center={[45.9, 25.0]}
                zoom={6}
                scrollWheelZoom
                maxZoom={19}
            >
                {/* Keyed so switching remounts the layer and its attribution. */}
                <TileLayer
                    key={base.url}
                    url={base.url}
                    attribution={base.attribution}
                    maxNativeZoom={base.maxNativeZoom}
                    maxZoom={19}
                />
                {railways && (
                    <TileLayer
                        url={RAILWAY_LAYER.url}
                        attribution={RAILWAY_LAYER.attribution}
                        maxNativeZoom={RAILWAY_LAYER.maxNativeZoom}
                        maxZoom={19}
                        zIndex={2}
                    />
                )}

                <SizeWatcher />
                <FitBounds coords={coords} />
                <FocusPoint target={focusTarget} focusKey={focus ? `${focus.layer}-${focus.id}` : null} />

                <PointLayer
                    layer="crossings"
                    items={validCrossings}
                    tooltip={crossingTooltip}
                    colorOf={crossingColor}
                    onPick={handlePick}
                />
                <PointLayer layer="stations" items={validStations} tooltip={stationTip} onPick={handlePick} />
                <NearestLink crossing={focusedCrossing} stations={allStations} />
                <FocusMarker target={focusTarget} />
            </MapContainer>

            <div className="map-tools">
                <div className="map-tools__group" role="group" aria-label="Fundalul hărții">
                    {(Object.keys(BASE_LAYERS) as BaseMap[]).map((key) => (
                        <button
                            key={key}
                            type="button"
                            className={`map-tools__seg${key === baseMap ? " is-active" : ""}`}
                            aria-pressed={key === baseMap}
                            onClick={() => onBaseMapChange(key)}
                        >
                            {BASE_LAYERS[key].label}
                        </button>
                    ))}
                </div>
                <button
                    type="button"
                    className={`map-tools__btn${railways ? " is-active" : ""}`}
                    aria-pressed={railways}
                    onClick={() => onRailwaysChange(!railways)}
                    title="Arată liniile de cale ferată (OpenRailwayMap)"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M8 3 5 21M16 3l3 18M7 8h10M6 14h12" />
                    </svg>
                    {RAILWAY_LAYER.label}
                </button>
                <button
                    type="button"
                    className="map-tools__btn map-tools__btn--icon"
                    onClick={() => onFullscreenChange(!fullscreen)}
                    aria-label={fullscreen ? "Ieși din modul ecran complet" : "Hartă pe tot ecranul"}
                    title={fullscreen ? "Ieși din ecran complet (Esc)" : "Hartă pe tot ecranul"}
                >
                    {fullscreen ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                        </svg>
                    )}
                </button>
            </div>

            {colorDef && legend.length > 0 && (
                <div className="geo-map__legend" aria-label={`Legendă: ${colorDef.label}`}>
                    <span className="geo-map__legend-title">{colorDef.label}</span>
                    <ul>
                        {legend.map((c) => (
                            <li key={c.value}>
                                <span className="geo-map__legend-swatch" style={{ background: c.color }} />
                                <span className="geo-map__legend-label">{c.value}</span>
                                <span className="geo-map__legend-count">{formatNumber(c.count)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default memo(GeoMap);
