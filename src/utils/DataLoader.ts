// import { ViewportTransform } from './ViewportTransform';

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
    constructor() {}

    // 获取 GeoJson 数据
    async load(
        url: string, 
        success: (data: GeoJson) => any, 
        fail: (err: any) => any = () => {}
    ) {
        try {
            const response = await fetch(url);
            const worldData: GeoJson = await response.json();
            success(worldData);
        } catch (error) {
            fail(error);
        }
    }
}
