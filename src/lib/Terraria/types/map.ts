import { Color } from "./data";
import { Properties } from "./geojson";
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


export interface Layer {
    type: string;
    properties: Properties;
    data: Primitive[];
}

export interface Primitive {  // 点集、线集、面集
    type: string;
    color: Color;
    vertices: Float32Array;
    indices: Uint16Array;
}

// type pointPrimitiveType = "Buildings"
// type linePrimitiveType = "Roads" | "Railways" | "Rivers" | "Contours"