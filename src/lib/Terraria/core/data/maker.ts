import { Primitive } from "../../types";


class Maker {
    static createSphere(radius: number, center: { x: number, y: number, z: number }, segments: number = 16): Primitive {
        const vertices: number[] = [];
        const indices: number[] = [];
        
        // 创建顶点
        for (let lat = 0; lat <= segments; lat++) {
            const theta = lat * Math.PI / segments;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
    
            for (let lon = 0; lon <= segments; lon++) {
                const phi = lon * 2 * Math.PI / segments;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
    
                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;
    
                vertices.push(radius * x + center.x);
                vertices.push(radius * y + center.y);
                vertices.push(radius * z + center.z);
            }
        }
    
        // 创建索引
        for (let lat = 0; lat < segments; lat++) {
            for (let lon = 0; lon < segments; lon++) {
                const first = (lat * (segments + 1)) + lon;
                const second = first + segments + 1;
    
                indices.push(first);
                indices.push(second);
                indices.push(first + 1);
    
                indices.push(second);
                indices.push(second + 1);
                indices.push(first + 1);
            }
        }
    
        return {
            type: 'block',
            color: [0, 0, 0, 1],
            vertices: new Float32Array(vertices),
            indices: new Uint16Array(indices)
        };
    }
 
    static createSphereWithLatLon(segments: number = 16) {
        const vertices: number[] = [];
        const indices: number[] = [];
    
        // 创建顶点
        for (let lat = 0; lat <= segments; lat++) {
            const theta = lat * Math.PI / segments;
    
            for (let lon = 0; lon <= segments; lon++) {
                const phi = lon * 2 * Math.PI / segments;
    
                // 将球体坐标转换为经纬度坐标
                const latitude = (theta - Math.PI / 2) * (180 / Math.PI);
                const longitude = (phi - Math.PI) * (180 / Math.PI);
    
                vertices.push(latitude, longitude );
            }
        }
    
        // 创建索引
        for (let lat = 0; lat < segments; lat++) {
            for (let lon = 0; lon < segments; lon++) {
                const first = (lat * (segments + 1)) + lon;
                const second = first + segments + 1;
    
                indices.push(first);
                indices.push(second);
                indices.push(first + 1);
    
                indices.push(second);
                indices.push(second + 1);
                indices.push(first + 1);
            }
        }
    
        return {
            type: 'block',
            color: [0, 0, 0, 1],
            vertices: new Float32Array(vertices),
            indices: new Uint16Array(indices)
        };
    }
    
}

export default Maker