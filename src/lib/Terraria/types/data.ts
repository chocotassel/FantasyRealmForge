import { Point } from "./map";

export interface AffineOptions {
    canvasWidth: number,
    canvasHeight: number,
    center: Point,
    scale: number,
    bearing: number,
    pitch: number
}

export type Color = [number, number, number, number]