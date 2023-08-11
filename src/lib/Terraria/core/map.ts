// map.ts
import lodash from 'lodash';
import WebGPU from './engine/webgpu';
import Parser from './data/parser';
// import Maker from './data/maker'

import type { GeoJson, MapOptions, Point, Layer } from '../types';


/**
 * 地图类
 * @param {HTMLElement} container - 地图的容器。
 * @param {string} style - 地图的样式。
 * @param {Array} center - 地图的中心点。
 * @param {number} zoom - 地图的缩放级别。
 * @param {number} bearing - 地图的方位。
 * @param {number} pitch - 地图的倾斜角度。
 * @constructor
 */
class map {
    private _container: HTMLElement;
    private _canvas: HTMLCanvasElement;

    private _style: string;
    private _center: Point;
    private _zoom: number;
    private _bearing: number;
    private _pitch: number;

    // private _sources: Map<string, Source>;
    private _layers: Map<string, Layer>;
    private _activeLayer: Set<string>;
    private _lastMousePosition: Point | null;

    private _WebGPU: WebGPU;


    constructor(options: MapOptions) {
        const container = document.getElementById(options.container)
        
        this._container = container || document.body;
        
        this._style = options?.style || "2d";
        this._center = options?.center || [0, 0];
        this._zoom = options?.zoom || 0.5;
        this._bearing = options?.bearing || 0;
        this._pitch = options?.pitch || 0;

        this._layers = new Map<string, Layer>();
        this._activeLayer = new Set<string>();

        const canvas = document.createElement('canvas');
        this._container.appendChild(canvas);
        this._canvas = canvas;

        const width = options.width || this.container.clientWidth;
        const height = options.height || this.container.clientHeight;
        this.setCanvasOptions(width, height);

        this._WebGPU = new WebGPU(options?.aspectRatio || 2);

        this._lastMousePosition = null;
    }

    async initGPU(options?: any): Promise<void>{
        try {
            await this._WebGPU.initialize(this._canvas, options);
            return 
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    // canvas设置
    setCanvasOptions(width: number, height: number) {
        this._canvas.width = width;
        this._canvas.height = height;
        this._canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        this._canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    }
    
    // 设置地图交互
    handleWheel = lodash.throttle( (event: WheelEvent) => {
        event.preventDefault();
        // 缩放因子，趋近于0或1时
        const reducingFactor = 1 - Math.abs(this.zoom * 2 - 1);

        this.zoom -= event.deltaY * 0.001 * reducingFactor;
    }, 10);

    handleMouseDown (event: MouseEvent) {
        this._lastMousePosition = [event.clientX, event.clientY];
        this._canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this._canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    };

    handleMouseUp (_event: MouseEvent) {
        this._lastMousePosition = null;
        this._canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
        this._canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    };


    handleMouseMove = lodash.throttle((event: MouseEvent) => {
        if (!this._lastMousePosition) return;

        const dx = (event.clientX - this._lastMousePosition[0]) / window.innerWidth  * 180 / this.zoom;
        const dy = (event.clientY - this._lastMousePosition[1]) / window.innerHeight * 180 / this.zoom;
        this._lastMousePosition = [event.clientX, event.clientY]; // 更新 lastMousePosition 为当前鼠标位置
        

        // 检查是否超出范围 newOffsetY > 90 / zoom
        // const newOffsetY = this.center[1] + dy;
        // if (this.boundary_check(newOffsetY)){
        //     this.center = [this.center[0] - dx, newOffsetY];
        // } else {
        //     this.center = [this.center[0] - dx, this.center[1]];
        // }

        // this.center = [this.center[0] + dx, this.center[1] - dy];
        // console.log(this.center);

        // this.center = [this.center[0] - dx, this.center[1] + dy];
            
        let x = this.center[0]
        let y = this.center[1]

        // 对经度的处理
        if (this.center[0] - dx > 180) {
            x = this.center[0] - dx - 360
        } else if (this.center[0] - dx < -180) {
            x = this.center[0] - dx + 360
        } else {
            x = this.center[0] - dx
        }

        // 对纬度的处理，平滑地靠近极点
        const poleProximity = Math.abs(90 - Math.abs(y + dy));
        if (poleProximity < 10) { // 当距离极点小于10度时
            const scaleFactor = poleProximity / 10;
            y += dy * scaleFactor; // 减小纬度的变化量
        } else {
            y += dy;
        }

        this.center = [x, y];
    }, 10);

    // boundary_check(y: number) {
    //     const range_ = this.getBoundary();
    //     return y >= -range_ && y <= range_
    // }

    // getBoundary() {
    //     return 90 * (1 - 1 / this.zoom);
    // }

    // updateCenter = lodash.throttle((x: number, y: number) => this.center = [x, y], 100);
      
      

    // get set
    get container() { return this._container; }
    set container(container: HTMLElement) { this._container = container; }

    get canvas() { return this._canvas; }
    set canvas(canvas: HTMLCanvasElement) { this._canvas = canvas; }


    // 地图的样式。
    get style() { return this._style; }
    set style(style: string) { 
        this._style = style; 
        // this.render();
    }

    // 中心点。
    get center() { return this._center; }
    set center(center: [number, number]) {
        center = [Math.min(Math.max(-180, center[0]), 180), Math.min(Math.max(-90, center[1]), 90)];
        this._center = center;
        this.render();
    }

    // 缩放级别。
    get zoom() { return this._zoom; }
    set zoom(zoom: number) { 
        this._zoom = Math.min(Math.max(0.0001, zoom), 0.9999); 
        this.render();
    }

    // 方位。
    get bearing() { return this._bearing; }
    set bearing(bearing: number) { 
        this._bearing = bearing; 
        this.render();
    }

    // 倾斜角度。
    get pitch() { return this._pitch; }
    set pitch(pitch: number) { 
        this._pitch = pitch; 
        this.render();
    }


    // flyTo(options){ // 平滑地移动到一个位置。
    // }

    // jumpTo(point: Point){  // 瞬间移动到一个位置。
    //     this.center = point;
    // }

    // easeTo(options){ // 平滑地移动到一个位置，但可以更详细地控制动画。
    // }


    // fitBounds(bounds, options){ // 调整地图的视角和缩放级别，使得一个地理范围可以完全显示在视口中。
    // }

    // addControl(control, position){ // 添加一个控件到地图上。
    // }

    // removeControl(control){ // 从地图中移除一个控件。
    // }

    // addLayer(layer, before){ // 添加一个图层到地图上。
    // }

    // removeLayer(id: Symbol){ // 从地图中移除一个图层。
    // }

    // 渲染
    render(progress?: number) {
        for (const layerId of this._activeLayer) {
            const layer = this._layers.get(layerId);
            if (!layer) continue;
            this._WebGPU.render(layer, this.style, this.center, this.zoom, this.bearing, this.pitch, progress);
        }
    }

    // 添加一个数据源到地图上。
    async addSource(id: string, url: string, options?: any, success?: Function, fail?: Function) {
        if(!this._layers || this._layers.has(id)) return;
        try {
            const response = await fetch(url);
            const data: GeoJson = await response.json();
            const layer = Parser.parseGeoJSON(data, options);
            // const layer = Parser.parseGeoJSONToLonLat(data);

            if(!layer) throw new Error('数据源解析失败');
            // layer.data.push(Maker.createSphereWithLatLon())
            this._activeLayer.add(id);
            this._layers.set(id, layer);
            
            this.render();
            if(success) success();
        } catch (error) {
            if(fail) fail(error);
        }
    }

    // 从地图中移除一个数据源。
    removeSource(id: string){ 
        if(!this._layers || !this._layers.has(id)) return;
        this._layers.delete(id);
    }



    // 动画
    transform() {
        let startTime: number | null = null;
        console.log(this.style);

        const animate = (timestamp: number) => {
            if (startTime === null) startTime = timestamp;
            const progress = (timestamp - startTime) / 1000; // 一秒内完成动画
        
            if (progress < 1) {
                // 更新动画
                updateAnimation(progress);
                // 请求下一帧
                requestAnimationFrame(animate);
            } else {
                // 动画完成，确保最终状态被设置
                this.style = this.style.split('-')[1];
                updateAnimation(1);
            }
        }
        
        const updateAnimation = (progress: number) => {
            if (this.style === "3d-2d" || this.style === "2d-3d") {
                this.render(progress);
            }
        }

        // 开始动画
        if(this.style === "3d") this.style = "3d-2d";
        else if (this.style === "2d") this.style = "2d-3d";
        else return 
        requestAnimationFrame(animate);
    }

}

export default map;