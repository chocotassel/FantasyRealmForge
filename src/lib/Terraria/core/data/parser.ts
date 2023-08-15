import { GeoJson, Point, Layer, Primitive, Geometry, Feature } from "../../types";
import earcut from 'earcut';

import { getArrayDimensions } from '../../utils';


class parser {

	static projection ([longitude, latitude]: Point, offset: Point, scale: number): Point {
		const x = (longitude - offset[0]) / 180 * scale;
		const y = (latitude - offset[1]) / 90 * scale;
		return [x, y];
	};

    static parseGeoJSON(
        geojson: GeoJson, 
        options?: any
    ): Layer | void {
        if (Array.isArray(geojson)) {
            for (const item of geojson) {
                this.parseGeoJSON(item, options);
            }
        }

        if (!geojson.properties) {
            throw new Error('未定义地图属性。');
        }

        // if (geojson.properties.resolution === 'high') {
        //     return this.generateContourLines(geojson, options.contourInterval);
        // }


        const data: Primitive[] = [];
        
        const [points, lines, polygons] = this.classifyGeometries(geojson.features);


        const pp = this.parsePoint(points)
        const pl = this.parseLine(lines);
        let pg: Primitive;

        if (options.type === 'polygon2line') {
            pg = this.parsePolygonToLine(polygons);
        } else {
            pg = this.parsePolygon(polygons);
        }

        data.push(pp, pl, pg);
        
        return {
            type: 'flat',
            properties: geojson.properties,
            data
        }
    }

    static classifyGeometries(features: Feature[]): [Geometry[], Geometry[], Geometry[]] {
        let points: Geometry[] = [];
        let lines: Geometry[] = [];
        let polygons: Geometry[] = [];
    
        features.forEach(feature => {
            const geometry = feature.geometry;
    
            switch (geometry.type) {
                case 'Point':
                case 'MultiPoint':
                    points.push(geometry);
                    break;
                case 'LineString':
                case 'MultiLineString':
                    lines.push(geometry);
                    break;
                case 'Polygon':
                case 'MultiPolygon':
                    polygons.push(geometry);
                    break;
                case 'GeometryCollection':
                    if (geometry.geometries) {
                        const [childPoints, childLines, childPolygons] = this.classifyGeometries(geometry.geometries.map(g => ({type: '', id: '', properties: {}, geometry: g})));
                        points = points.concat(childPoints);
                        lines = lines.concat(childLines);
                        polygons = polygons.concat(childPolygons);
                    }
                    break;
            }
        });
    
        return [points, lines, polygons];

    }


    static parsePoint(
        geometries: Geometry[],
    ): Primitive {
        const indices = new Uint16Array([0]);
        const vertices: number[] = [];
    
        geometries.forEach((geometry) => {
            if (geometry.type === 'Point') {
                vertices.push(geometry.coordinates[0] as number, geometry.coordinates[1]as number);
            } else if (geometry.type === 'MultiPoint') {
                (geometry.coordinates as number[][]).forEach(point => {
                    vertices.push(point[0], point[1]);
                });
            }
        });
    
        return {
            type: 'point',
            color: [0.5, 0.5, 0.5, 1],
            vertices: new Float32Array(vertices),
            indices,
        };
    }

    static parseLine(geometries: Geometry[]): Primitive {
        const vertices: number[] = [];
        const indices: number[] = [];
    
        let currentIndex = 0;
        geometries.forEach((geometry) => {
            if (geometry.type === 'LineString') {
                const path = (geometry.coordinates as number[][]).flatMap(point => [point[0], point[1]]);
                vertices.push(...path);
                for (let i = 0; i < path.length / 2 - 1; i++) {
                    indices.push(currentIndex + i, currentIndex + i + 1);
                }
                currentIndex += path.length / 2;
            } else if (geometry.type === 'MultiLineString') {
                (geometry.coordinates as number[][][]).forEach(line => {
                    const path = line.flatMap(point => [point[0], point[1]]);
                    vertices.push(...path);
                    for (let i = 0; i < line.length - 1; i++) {
                        indices.push(currentIndex + i, currentIndex + i + 1);
                    }
                    currentIndex += line.length;
                });
            }
        });
    
        return {
            type: 'line',
            color: [0.5, 0.5, 1, 1],
            vertices: new Float32Array(vertices),
            indices: new Uint16Array(indices)
        };
    }
    

    static parsePolygon(
        geometries: Geometry[],
    ): Primitive {
        const vertices: number[] = [];
        const indices: number[] = [];

        let currentIndex = 0;
        geometries.forEach((geometry) => {
            if(geometry.type === 'MultiPolygon') {
                const coordinates = geometry.coordinates;
                if(coordinates) {
                    (coordinates as number[][][][]).forEach((contours) => {
                        contours.forEach((contour) => {
                            const path = contour.flatMap(point => [point[0], point[1]]);
                            vertices.push(...path);
                            const pathIndices = earcut(path, [], 2);
                            indices.push(...pathIndices.map(i => i + currentIndex));
                            currentIndex += contour.length;
                        });
                    });
                }
            } else if(geometry.type === 'Polygon') {
                const contours = geometry.coordinates as number[][][];
                const path = contours[0].flatMap(point => [point[0], point[1]]);
                vertices.push(...path);
                const pathIndices = earcut(path, [], 2);
                indices.push(...pathIndices.map(i => i + currentIndex));
                currentIndex += contours[0].length;
            }
        });

        return {
            type: 'triangle',
            color: [1, 1, 1, 1],
            vertices: new Float32Array(vertices),
            indices: new Uint16Array(indices),
        };
    }


    static parsePolygonToLine(
        geometries: Geometry[]
    ): Primitive {
        const vertices: number[] = [];
        const indices: number[] = [];
    
        
        let currentIndex = 0;
        geometries.forEach((geometry) => {
            if(geometry.type === 'Polygon') {
                const contours = geometry.coordinates as number[][][];
                contours.forEach((contour) => {
                    const path = contour.flatMap(point => [point[0], point[1]]);
                    vertices.push(...path);

                    for (let i = 0; i < contour.length - 1; i++) {
                        indices.push(currentIndex + i, currentIndex + i + 1);
                    }
                    // 连接闭环的最后一条边
                    indices.push(currentIndex + contour.length - 1, currentIndex);

                    currentIndex += contour.length;
                });
            } else if(geometry.type === 'MultiPolygon') {
                const coordinates = geometry.coordinates as number[][][][];
                if(coordinates) {
                    (coordinates as number[][][][]).forEach((contours) => {
                        contours.forEach((contour) => {
                            const path = contour.flatMap(point => [point[0], point[1]]);
                            vertices.push(...path);
                            for (let i = 0; i < contour.length - 1; i++) {
                                indices.push(currentIndex + i, currentIndex + i + 1);
                            }
                            // 连接闭环的最后一条边
                            indices.push(currentIndex + contour.length - 1, currentIndex);

                            currentIndex += contour.length;
                        });
                    });
                }
            }
        });
    
        return {
            type: 'line',
            color: [0, 0, 0, 1],
            vertices: new Float32Array(vertices),
            indices: new Uint16Array(indices),
        };
    }
    


    

    // static parseGeoJSONToLonLat(
    //     geojson: GeoJson, 
    // ): Layer {
    //     const features = geojson.features;

    //     const vertices: number[] = [];
    //     const indices: number[] = [];

    //     let currentIndex = 0;
    //     features.forEach(({geometry}) => {
    //         if(geometry.type === 'MultiPolygon') {
    //             const coordinates = geometry.coordinates;
    //             if(coordinates) {
    //                 (coordinates as number[][][][]).forEach((contours) => {
    //                     contours.forEach((contour) => {
    //                         const path = contour.flatMap(point => [point[0], point[1]]);
    //                         vertices.push(...path);
    //                         const pathIndices = earcut(path, [], 2);
    //                         indices.push(...pathIndices.map(i => i + currentIndex));
    //                         currentIndex += contour.length;
    //                     });
    //                 });
    //             }
    //         } else if(geometry.type === 'Polygon') {
    //             const contours = geometry.coordinates as number[][][];
    //             const path = contours[0].flatMap(point => [point[0], point[1]]);
    //             vertices.push(...path);
    //             const pathIndices = earcut(path, [], 2);
    //             indices.push(...pathIndices.map(i => i + currentIndex));
    //             currentIndex += contours[0].length;
    //         }
    //     });

    //     return {
    //         type: 'FeatureCollection',
    //         properties: geojson.properties,
    //         data: [
    //             {
    //                 type: 'triangle',
    //                 color: [0.5, 0.5, 0.5, 1],
    //                 vertices: new Float32Array(vertices),
    //                 indices: new Uint16Array(indices),
    //             }
    //         ]
    //     };
    // }

    /**
     * 
     * @param geojson 
     * @returns
     * {
     *     vertices: Float32Array,
     *    indices: Uint16Array,
     * }
     */
    static generateContourLines(
        data: GeoJson, 
        contourInterval: number
    ): Layer {
        const arr: Layer = {
            type: 'FeatureCollection',
            properties: data.properties,
            data: []
        };
    
        for (const feature of data.features) {
            const elevationPoints: number[][] = [];
            const flattenedPoints: number[] = [];
            if (feature.geometry.type !== 'GeometryCollection') continue
            if (!feature.geometry.geometries) continue
            for (const geometry of feature.geometry.geometries) {
                if (geometry.type === 'MultiPoint' && getArrayDimensions(geometry.coordinates) === 3) {
                    elevationPoints.push(...geometry.coordinates as number[][]);
                    flattenedPoints.push(...(geometry.coordinates as number[][]).flat());
                } else if (geometry.type === 'Polygon') {
                    elevationPoints.push(...geometry.coordinates[0] as number[][]);
                    flattenedPoints.push(...(geometry.coordinates[0] as number[][]).flat());
                } else {
                    throw new Error(`Unsupported geometry type: ${geometry.type}`);
                }
            }
    
            // 高度范围
            const heights = elevationPoints.map(point => point[2] ? point[2] : 0);
            const minHeight = Math.min(...heights);
            const maxHeight = Math.max(...heights);
    
            // Triangulate the points using earcut
            const triangles = earcut(flattenedPoints, [], 3);

            // Generate contour lines
            for (let height = minHeight; height <= maxHeight; height += contourInterval) {
                const vertices: number[] = [];
                const indices: number[] = [];
                let index = 0;

                // Iterate through the triangles and find segments that intersect with the contour height
                for (let i = 0; i < triangles.length; i += 3) {
                    const trianglePoints = [
                        elevationPoints[triangles[i]],
                        elevationPoints[triangles[i + 1]],
                        elevationPoints[triangles[i + 2]]
                    ];

                    // Find the segments that intersect with the contour height
                    const segment: number[] = [];
                    for (let j = 0; j < 3; j++) {
                        const p1 = trianglePoints[j];
                        const p2 = trianglePoints[(j + 1) % 3];
                        if ((p1[2] < height && p2[2] > height) || (p1[2] > height && p2[2] < height)) {
                            const t = (height - p1[2]) / (p2[2] - p1[2]);
                            const x = p1[0] + t * (p2[0] - p1[0]);
                            const y = p1[1] + t * (p2[1] - p1[1]);
                            segment.push(x, y);
                        }
                    }

                    if (segment.length === 4) {
                        vertices.push(...segment);
                        indices.push(index, index + 1);
                        index += 2;
                    }
                }
    
                const primitive: Primitive = {
                    type: 'line',
                    color: [1.0, 1.0, 1.0, 1.0],
                    vertices: new Float32Array(vertices.flat()),
                    indices: new Uint16Array(indices)
                };
    
                arr.data.push(primitive);
            }
        }
    
        return arr;
    }
}


export default parser;