// map.ts
import lodash from 'lodash';
import WebGPU from './engine/webgpu';

import type { GeoJson } from '../types/geojson';

type MapOptions = {
    container: string;
    style?: string;
    center?: [number, number];
    zoom?: number;
    bearing?: number;
    pitch?: number;
    width?: number;
    height?: number;
}

type Point = [number, number]

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

    private _sources: Map<string, GeoJson>;
    private _layers: string[];
    private _lastMousePosition: Point | null;

    private aspectRatio: number = 2;

    private _WebGPU: WebGPU;


    constructor(options: MapOptions) {
        const container = document.getElementById(options.container)
        
        this._container = container || document.body;
        
        this._style = options?.style || "mapbox://styles/mapbox/streets-v11";
        this._center = options?.center || [0, 0];
        this._zoom = options?.zoom || 1;
        this._bearing = options?.bearing || 0;
        this._pitch = options?.pitch || 0;

        this._sources = new Map<string, GeoJson>();
        this._layers = [];

        const canvas = document.createElement('canvas');
        this._container.appendChild(canvas);
        this._canvas = canvas;

        const width = options.width || this.container.clientWidth;
        const height = options.height || this.container.clientHeight;
        this.setCanvasOptions(width, height);

        this._WebGPU = new WebGPU(canvas, this.aspectRatio);

        this._lastMousePosition = null;
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
        const mousePointBeforeZoom  = [
            this.center[0] + (event.offsetX / this.canvas.width - 0.5) / this.zoom * 360,
            this.center[1] - (event.offsetY / this.canvas.height - 0.5) / this.zoom * 180 
        ];
        // console.log(this.center);
        this.zoom = this.zoom * Math.pow(0.99, event.deltaY * 0.1);
        const mousePointAfterZoom = [
            this.center[0] + (event.offsetX / this.canvas.width - 0.5) / this.zoom * 360,
            this.center[1] - (event.offsetY / this.canvas.height - 0.5) / this.zoom * 180
        ];
        this.center[0] += (mousePointBeforeZoom[0] - mousePointAfterZoom[0]);
        this.center[1] += (mousePointBeforeZoom[1] - mousePointAfterZoom[1]);
        
        if (event.deltaY > 0 && !this.boundary_check(this.center[1])) {
            this.center = [this.center[0], this.center[1] > 0 ? this.getBoundary() : -this.getBoundary()];
        }
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

        const dx = (event.clientX - this._lastMousePosition[0]) / window.innerWidth * 360 / this.zoom;
        const dy = (event.clientY - this._lastMousePosition[1]) / window.innerHeight * 180 / this.zoom;
        this._lastMousePosition = [event.clientX, event.clientY]; // 更新 lastMousePosition 为当前鼠标位置
        

        // 检查是否超出范围 newOffsetY > 90 / zoom
        const newOffsetY = this.center[1] + dy;
        if (this.boundary_check(newOffsetY)){
            this.center = [this.center[0] - dx, newOffsetY];
        } else {
            this.center = [this.center[0] - dx, this.center[1]];
        }

        // this.center = [this.center[0] + dx, this.center[1] - dy];
        console.log(this.center);
    }, 10);

    boundary_check(y: number) {
        // const range_ = Math.min(90, (zoom - 1) / 9 * 90)
        const range_ = this.getBoundary();
        return y >= -range_ && y <= range_
    }

    getBoundary() {
        return 90 * (1 - 1 / this.zoom * this._canvas.height / this._canvas.width * this.aspectRatio);
    }

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
        this._center = center; 
        this.render();
    }

    // 缩放级别。
    get zoom() { return this._zoom; }
    set zoom(zoom: number) { 
        this._zoom = Math.min(Math.max(1, zoom), 10); 
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
    render() {
        for (const layer of this._layers) {
            const source = this._sources.get(layer);
            if (!source) continue;
            this._WebGPU.render(source, this.style, this.center, this.zoom, this.bearing, this.pitch);
        }
    }

    // 添加一个数据源到地图上。
    async addSource(id: string, source: {type: string, url: string}, success?: Function, fail?: Function) {
        if(!this._sources || this._sources.has(id)) return;
        try {
            const response = await fetch(source.url);
            const worldData: GeoJson = await response.json();
            this._sources.set(id, worldData);
            this._layers.push(id);
            this._WebGPU.render(worldData, this.style, this.center, this.zoom, this.bearing, this.pitch);
            if(success) success();
        } catch (error) {
            if(fail) fail(error);
        }
    }

    removeSource(id: string){ // 从地图中移除一个数据源。
        if(!this._sources || !this._sources.has(id)) return;
        this._sources.delete(id);
    }

    // 加载数据
    async load(){
    }
}

export default map;