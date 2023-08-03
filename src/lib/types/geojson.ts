
export interface GeoJson {
    type: string;
    features: Feature[];
}

interface Feature {
    type: string;
    id: string;
    properties: Properties;
    geometry: Geometry;
}

interface Properties {
    name: string;
}

interface Geometry {
    type: string;
    coordinates: number[][][] | number[][][][];
}