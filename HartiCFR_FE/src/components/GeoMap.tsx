import { memo, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L, { LatLngBounds, divIcon, type DivIcon, type MarkerClusterGroup } from "leaflet";
import "leaflet.markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Log, Position } from "../types/log";
import type { Station } from "../types/station";
import "./GeoMap.scss";

export type MapLayer = "crossings" | "stations";
export type MapFocus = { layer: MapLayer; id: number } | null;

const LAYER_COLORS: Record<MapLayer, string> = {
    crossings: "#0d9488",
    stations: "#ea580c",
};

const FOCUS_COLOR = "#f59e0b";

function isValid(pos: Position | undefined): boolean {
    const { x, y } = pos ?? { x: 0, y: 0 };
    return (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        !(x === 0 && y === 0) &&
        Math.abs(y) <= 90 &&
        Math.abs(x) <= 180
    );
}

function buildDotIcon(layer: MapLayer, isFocused: boolean): DivIcon {
    const size = isFocused ? 20 : 14;
    const color = isFocused ? FOCUS_COLOR : LAYER_COLORS[layer];
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

// Only 4 combinations exist (2 layers x focused/unfocused) — build them once
// instead of allocating a fresh DivIcon per marker on every render.
const DOT_ICONS: Record<MapLayer, { plain: DivIcon; focused: DivIcon }> = {
    crossings: { plain: buildDotIcon("crossings", false), focused: buildDotIcon("crossings", true) },
    stations: { plain: buildDotIcon("stations", false), focused: buildDotIcon("stations", true) },
};

function dotIcon(layer: MapLayer, isFocused: boolean): DivIcon {
    return isFocused ? DOT_ICONS[layer].focused : DOT_ICONS[layer].plain;
}

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

function tipHtml(layer: MapLayer, title: string, rows: [string, unknown][]): string {
    const items = rows.map(([label, value]) => `<li><span>${label}</span>${esc(value)}</li>`).join("");
    return `<div class="geo-map__tip">
        <strong class="geo-map__tip-title">
            <span class="geo-map__tip-dot geo-map__tip-dot--${layer}"></span>${esc(title)}
        </strong>
        <ul>${items}</ul>
    </div>`;
}

function coordText(pos: Position): string {
    return `${pos.y.toFixed(5)}, ${pos.x.toFixed(5)}`;
}

function crossingTip(log: Log): string {
    const route = `${log.location?.start || "—"}${log.location?.end ? ` → ${log.location.end}` : ""}`;
    return tipHtml("crossings", `#${log.id} · ${route}`, [
        ["SRCF", log.srcf],
        ["Secția CT", log.ct],
        ["Km TN", log.tnPosition],
        ["Tip", log.locationType],
        ["Magistrală", log.mainLine || "—"],
        ["Instalație", log.electricType],
        ["Config", log.configType],
        ["Producător", log.producer],
        ["Regim", log.operatingMode],
        ["Coordonate", coordText(log.position)],
    ]);
}

function stationTip(station: Station): string {
    return tipHtml("stations", station.name, [
        ["Tip", "Stație"],
        ["Cod", station.cod],
        ["Coordonate", coordText(station.position)],
    ]);
}

// Markers are created directly on the cluster group instead of as React
// <Marker>/<Tooltip> components. With thousands of points, the component
// version kept a tooltip DOM tree per marker and re-walked every one of them
// on each dashboard render; here a layer is rebuilt only when its data
// changes, and a tooltip is rendered only when it is opened.
function ClusterLayerInner<T extends { id: number; position: Position }>({
    layer,
    items,
    tooltip,
}: {
    layer: MapLayer;
    items: T[];
    tooltip: (item: T) => string;
}) {
    const map = useMap();
    const groupRef = useRef<MarkerClusterGroup | null>(null);

    useEffect(() => {
        const group = L.markerClusterGroup({
            iconCreateFunction: clusterIcon(layer),
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            maxClusterRadius: 35,
            disableClusteringAtZoom: 13,
            chunkedLoading: true,
        });
        map.addLayer(group);
        groupRef.current = group;
        return () => {
            map.removeLayer(group);
            groupRef.current = null;
        };
    }, [map, layer]);

    useEffect(() => {
        const group = groupRef.current;
        if (!group) return;
        group.clearLayers();
        group.addLayers(
            items.map((item) =>
                L.marker([item.position.y, item.position.x], { icon: dotIcon(layer, false) })
                    .bindTooltip(() => tooltip(item), TOOLTIP_OPTIONS)
            )
        );
    }, [items, layer, tooltip]);

    return null;
}
const ClusterLayer = memo(ClusterLayerInner) as typeof ClusterLayerInner;

// The highlighted point is drawn as its own marker above the clusters, so
// moving the focus never touches the (possibly thousands of) clustered ones.
// It ignores the pointer, letting hover reach the regular marker underneath.
function FocusMarker({ layer, target }: { layer: MapLayer; target: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (!target) return;
        const marker = L.marker(target, {
            icon: dotIcon(layer, true),
            interactive: false,
            keyboard: false,
            zIndexOffset: 1000,
        }).addTo(map);
        return () => {
            marker.remove();
        };
    }, [map, layer, target]);
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

function FocusPoint({ target }: { target: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (!target) return;
        map.flyTo(target, Math.max(map.getZoom(), 13), { duration: 0.8 });
    }, [target, map]);
    return null;
}

interface GeoMapProps {
    crossings: Log[];
    stations: Station[];
    focus?: MapFocus;
}

function GeoMap({ crossings, stations, focus = null }: GeoMapProps) {
    const validCrossings = useMemo(() => crossings.filter((c) => isValid(c.position)), [crossings]);
    const validStations = useMemo(() => stations.filter((s) => isValid(s.position)), [stations]);

    const coords = useMemo<[number, number][]>(
        () => [
            ...validCrossings.map((c): [number, number] => [c.position.y, c.position.x]),
            ...validStations.map((s): [number, number] => [s.position.y, s.position.x]),
        ],
        [validCrossings, validStations]
    );

    const focusLayer = focus?.layer ?? null;
    const focusId = focus?.id ?? null;
    const focusTarget = useMemo<[number, number] | null>(() => {
        if (focusLayer === null) return null;
        const point =
            focusLayer === "crossings"
                ? validCrossings.find((c) => c.id === focusId)
                : validStations.find((s) => s.id === focusId);
        return point ? [point.position.y, point.position.x] : null;
    }, [focusLayer, focusId, validCrossings, validStations]);

    return (
        <div className="geo-map">
            <MapContainer
                className="geo-map__canvas"
                center={[45.9, 25.0]}
                zoom={6}
                scrollWheelZoom
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY ?? ""}`}
                />

                <FitBounds coords={coords} />
                <FocusPoint target={focusTarget} />

                <ClusterLayer layer="crossings" items={validCrossings} tooltip={crossingTip} />
                <ClusterLayer layer="stations" items={validStations} tooltip={stationTip} />
                {focusLayer && <FocusMarker layer={focusLayer} target={focusTarget} />}
            </MapContainer>
        </div>
    );
}

export default memo(GeoMap);
