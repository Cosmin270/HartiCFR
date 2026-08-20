import type { Position } from "./log";

export interface Station {
    id: number;
    cod: number;
    name: string;
    position: Position;
}