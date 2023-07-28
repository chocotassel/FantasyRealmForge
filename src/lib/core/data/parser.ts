import { GeoJson } from "../../types/geojson";
import earcut from 'earcut';

type Point = [number, number]

class parser {

	static projection ([longitude, latitude]: Point, offset: Point, scale: number): Point {
		const x = (longitude + offset[0]) / 180 * scale;
		const y = (latitude + offset[1]) / 90 * scale;
		return [x, y];
	};

    static parseGeoJSON(
        geojson: GeoJson, 
        offset: Point, 
        scale: number,
		bearing: number,
		pitch: number,
    ): {vertices: Float32Array, indices: Uint16Array} {
        const features = geojson.features;

        const vertices: number[] = [];
        const indices: number[] = [];

        let currentIndex = 0;
        features.forEach(({geometry}) => {
            if(geometry.type === 'MultiPolygon') {
                const coordinates = geometry.coordinates;
                if(coordinates) {
                    (coordinates as number[][][][]).forEach((contours) => {
                        contours.forEach((contour) => {
                            const path = contour.flatMap(point => this.projection([point[0], point[1]], offset, scale));
                            vertices.push(...path);
                            const pathIndices = earcut(path, [], 2);
                            indices.push(...pathIndices.map(i => i + currentIndex));
                            currentIndex += contour.length;
                        });
                    });
                }
            } else if(geometry.type === 'Polygon') {
                const contours = geometry.coordinates as number[][][];
                const path = contours[0].flatMap(point => this.projection([point[0], point[1]], offset, scale));
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
    };
}


export default parser;