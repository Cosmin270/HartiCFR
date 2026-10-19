import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { LatLngBounds, divIcon, type DivIcon } from "leaflet";
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
    stations: "#7c3aed",
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

export default function GeoMap({ crossings, stations, focus = null }: GeoMapProps) {
    const validCrossings = useMemo(() => crossings.filter((c) => isValid(c.position)), [crossings]);
    const validStations = useMemo(() => stations.filter((s) => isValid(s.position)), [stations]);

    const coords = useMemo<[number, number][]>(
        () => [
            ...validCrossings.map((c): [number, number] => [c.position.y, c.position.x]),
            ...validStations.map((s): [number, number] => [s.position.y, s.position.x]),
        ],
        [validCrossings, validStations]
    );

    const focusTarget = useMemo<[number, number] | null>(() => {
        if (!focus) return null;
        const point =
            focus.layer === "crossings"
                ? validCrossings.find((c) => c.id === focus.id)
                : validStations.find((s) => s.id === focus.id);
        return point ? [point.position.y, point.position.x] : null;
    }, [focus, validCrossings, validStations]);

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

                <MarkerClusterGroup
                    key="crossings"
                    iconCreateFunction={clusterIcon("crossings")}
                    spiderfyOnMaxZoom
                    showCoverageOnHover={false}
                    maxClusterRadius={35}
                    disableClusteringAtZoom={13}
                >
                    {validCrossings.map((log) => {
                        const isFocused = focus?.layer === "crossings" && focus.id === log.id;
                        return (
                            <Marker
                                key={`c-${log.id}`}
                                position={[log.position.y, log.position.x]}
                                icon={dotIcon("crossings", isFocused)}
                                zIndexOffset={isFocused ? 1000 : 0}
                            >
                                <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                                    <div className="geo-map__tip">
                                        <strong className="geo-map__tip-title">
                                            <span className="geo-map__tip-dot geo-map__tip-dot--crossings" />
                                            #{log.id} · {log.location?.start || "—"}
                                            {log.location?.end ? ` → ${log.location.end}` : ""}
                                        </strong>
                                        <ul>
                                            <li><span>SRCF</span>{log.srcf}</li>
                                            <li><span>Sectia CT</span>{log.ct}</li>
                                            <li><span>Km TN</span>{log.tnPosition}</li>
                                            <li><span>Tip</span>{log.locationType}</li>
                                            <li><span>Magistrala</span>{log.mainLine || "—"}</li>
                                            <li><span>Instalatie</span>{log.electricType}</li>
                                            <li><span>Config</span>{log.configType}</li>
                                            <li><span>Producator</span>{log.producer}</li>
                                            <li><span>Regim</span>{log.operatingMode}</li>
                                            <li><span>Coord</span>{log.position.y.toFixed(5)}, {log.position.x.toFixed(5)}</li>
                                        </ul>
                                    </div>
                                </Tooltip>
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>

                <MarkerClusterGroup
                    key="stations"
                    iconCreateFunction={clusterIcon("stations")}
                    spiderfyOnMaxZoom
                    showCoverageOnHover={false}
                    maxClusterRadius={35}
                    disableClusteringAtZoom={13}
                >
                    {validStations.map((station) => {
                        const isFocused = focus?.layer === "stations" && focus.id === station.id;
                        return (
                            <Marker
                                key={`s-${station.id}`}
                                position={[station.position.y, station.position.x]}
                                icon={dotIcon("stations", isFocused)}
                                zIndexOffset={isFocused ? 1000 : 0}
                            >
                                <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                                    <div className="geo-map__tip">
                                        <strong className="geo-map__tip-title">
                                            <span className="geo-map__tip-dot geo-map__tip-dot--stations" />
                                            {station.name}
                                        </strong>
                                        <ul>
                                            <li><span>Tip</span>Statie</li>
                                            <li><span>Cod</span>{station.cod}</li>
                                            <li><span>Coord</span>{station.position.y.toFixed(5)}, {station.position.x.toFixed(5)}</li>
                                        </ul>
                                    </div>
                                </Tooltip>
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>
            </MapContainer>
        </div>
    );
}