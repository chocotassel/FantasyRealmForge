import { ViewportTransform } from './ViewportTransform';

interface GeoJson {
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


export class DataLoader {
    constructor(private url: string) {
        this.url = url
    }

    // 获取 GeoJson 数据
    async fetchGeoJson(): Promise<GeoJson> {
        try {
            const response = await fetch(this.url);
            const worldData: GeoJson = await response.json();
            return worldData
        } catch (error) {
            throw new Error(`Failed to fetch GeoJson: ${error}`);
        }
    }

    // 转换顶点和索引数据
    async getVerticesAndIndices(scale: number, offset: [number, number]): Promise<{ vertices: Float32Array; indices: Uint16Array; }> {
        const worldData = await this.fetchGeoJson();
        const features = worldData.features;

        const viewportTransform = new ViewportTransform(scale, offset);
        const verticesAndIndices = viewportTransform.transform(features);

        return verticesAndIndices;
    }
}
