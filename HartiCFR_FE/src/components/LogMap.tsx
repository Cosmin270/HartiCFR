import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Log } from "../types/log";
import "./LogMap.scss";

function isValid(log: Log): boolean {
    const { x, y } = log.position ?? { x: 0, y: 0 };
    return (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        !(x === 0 && y === 0) &&
        Math.abs(y) <= 90 &&
        Math.abs(x) <= 180
    );
}

function FitBounds({ points }: { points: Log[] }) {
    const map = useMap();
    useEffect(() => {
        if (points.length === 0) return;
        const bounds = new LatLngBounds(points.map((p) => [p.position.y, p.position.x]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }, [points, map]);
    return null;
}

function FocusPoint({ points, focusId }: { points: Log[]; focusId: number | null }) {
    const map = useMap();
    useEffect(() => {
        if (focusId == null) return;
        const target = points.find((p) => p.id === focusId);
        if (!target) return;
        map.flyTo(
            [target.position.y, target.position.x],
            Math.max(map.getZoom(), 13),
            { duration: 0.8 }
        );
    }, [focusId, points, map]);
    return null;
}

interface LogMapProps {
    points: Log[];
    focusId?: number | null;
}

export default function LogMap({ points, focusId = null }: LogMapProps) {
    const valid = points.filter(isValid);
    const skipped = points.length - valid.length;

    return (
        <div className="log-map">
            {skipped > 0 && (
                <p className="log-map__note">
                    {skipped} selected {skipped === 1 ? "row has" : "rows have"} no coordinates and{" "}
                    {skipped === 1 ? "was" : "were"} skipped.
                </p>
            )}

            <MapContainer
                className="log-map__canvas"
                center={[45.9, 25.0]}
                zoom={6}
                scrollWheelZoom
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <FitBounds points={valid} />
                <FocusPoint points={valid} focusId={focusId} />

                {valid.map((log) => {
                    const isFocused = log.id === focusId;
                    return (
                    <CircleMarker
                        key={log.id}
                        center={[log.position.y, log.position.x]}
                        radius={isFocused ? 10 : 7}
                        pathOptions={{
                            color: "#ffffff",
                            weight: isFocused ? 3 : 2,
                            fillColor: isFocused ? "#f97316" : "#00adb5",
                            fillOpacity: isFocused ? 1 : 0.9,
                            className: isFocused ? "map-marker map-marker--focused" : "map-marker",
                        }}
                    >
                        <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                            <div className="log-map__tip">
                                <strong className="log-map__tip-title">
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
                    </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
}