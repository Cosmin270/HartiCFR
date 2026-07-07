export interface Position {
    x: number;
    y: number;
}

export interface LocationPair {
    start: string;
    end: string;
}

export interface Log {
    id: number;
    srcf: string;
    ct: string;
    tnPosition: number;
    locationType: string;
    location: LocationPair;
    mainLine: string;
    electricType: string;
    configType: string;
    producer: string;
    operatingMode: string;
    position: Position;
}