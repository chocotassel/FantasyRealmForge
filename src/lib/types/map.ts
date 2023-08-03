
export type MapOptions = {
    container: string;
    style?: string;
    center?: Point;
    zoom?: number;
    bearing?: number;
    pitch?: number;
    width?: number;
    height?: number;
    aspectRatio?: number;
}

export type Point = [number, number]

export type Source = {
    type: string;
    vertices: Float32Array;
    indices: Uint16Array;
}