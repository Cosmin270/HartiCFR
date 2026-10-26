import type { Position } from "../types/log";
import type { Station } from "../types/station";

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

// Great-circle distance between two points given as { x: lon, y: lat }.
export function distanceKm(a: Position, b: Position): number {
    const dLat = toRad(b.y - a.y);
    const dLon = toRad(b.x - a.x);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(a.y)) * Math.cos(toRad(b.y)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function hasPosition(pos: Position | undefined): pos is Position {
    if (!pos) return false;
    const { x, y } = pos;
    return (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        !(x === 0 && y === 0) &&
        Math.abs(y) <= 90 &&
        Math.abs(x) <= 180
    );
}

export interface NearestStation {
    station: Station;
    km: number;
}

// A linear scan is plenty here: ~2,300 stations, and it only runs for the
// crossing being hovered or highlighted.
export function nearestStation(pos: Position, stations: Station[]): NearestStation | null {
    let best: NearestStation | null = null;
    for (const station of stations) {
        if (!hasPosition(station.position)) continue;
        const km = distanceKm(pos, station.position);
        if (!best || km < best.km) best = { station, km };
    }
    return best;
}

export function formatKm(km: number): string {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 }).format(km)} km`;
}
