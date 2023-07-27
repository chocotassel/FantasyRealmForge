import earcut from 'earcut';


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

export class ViewportTransform {
    constructor(private scale: number, private offset: [number, number]) {
        this.scale = scale;
        this.offset = offset;
    }

    projection([longitude, latitude]: number[]): [number, number] {
        const x = (longitude + this.offset[0]) / 180 * this.scale;
        const y = (latitude + this.offset[1]) / 90 * this.scale;
        return [x, y];
    };


    transform(features: Feature[]): {vertices: Float32Array, indices: Uint16Array} {
        // Transform coordinates...
        const vertices: number[] = [];
        const indices: number[] = [];

        let currentIndex = 0;
        features.forEach(({geometry}) => {
        if(geometry.type === 'MultiPolygon') {
            const coordinates = geometry.coordinates;
            if(coordinates) {
            (coordinates as number[][][][]).forEach((contours) => {
                contours.forEach((contour) => {
                const path = contour.flatMap(point => this.projection(point));
                vertices.push(...path);
                const pathIndices = earcut(path, [], 2);
                indices.push(...pathIndices.map(i => i + currentIndex));
                currentIndex += contour.length;
                });
            });
            }
        } else if(geometry.type === 'Polygon') {
            const contours = geometry.coordinates as number[][][];
            const path = contours[0].flatMap(point => this.projection(point));
            vertices.push(...path);
            const pathIndices = earcut(path, [], 2);
            indices.push(...pathIndices.map(i => i + currentIndex));
            currentIndex += contours[0].length;
        }
        });

        return {
            vertices: new Float32Array(vertices),
            indices: new Uint16Array(indices),
        };
    }
}
