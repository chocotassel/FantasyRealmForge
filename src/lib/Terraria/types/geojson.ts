
export interface GeoJson {
    type: string;
    properties: Properties;
    features: Feature[];
}

export interface Feature {
    type: string;
    id: string;
    properties: Properties;
    geometry: Geometry;
}

export interface Properties {
    name?: string;
    description?: string;
    resolution?: string;
    source?: string;
    contour_interval?: number;
}

export interface Geometry {
    type: string;   // Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon, GeometryCollection
    coordinates: number[] | number[][] | number[][][] | number[][][][];
    geometries?: Geometry[];
}
