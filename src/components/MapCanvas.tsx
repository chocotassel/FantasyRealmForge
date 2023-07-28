import React, { useEffect, useRef, useState } from 'react';
import { useWebGPUContext } from './WebGPUContext';
import { DataLoader } from '../utils/DataLoader';
import { BufferBuilder } from '../utils/BufferBuilder';
import { Renderer } from '../utils/Renderer';
import { ViewportTransform } from '../utils/ViewportTransform';


export const MapCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState<[number, number]>([0, 0]);

    const { device, pipeline, canvasFormat } = useWebGPUContext();

    const [features, setFeatures] = useState<any[]>([]);
    const [buffers, setBuffers] = useState<{
        verticesBuffer: GPUBuffer;
        indicesBuffer: GPUBuffer;
        indicesLength: number;
    } | null>(null);

    const mapRef = useRef<any>(null);


    const getBuffers = async () => {
        const viewportTransform = new ViewportTransform(scale, offset);
        const verticesAndIndices = viewportTransform.transform(features);

        const bufferBuilder = new BufferBuilder(device);
        const buffers = bufferBuilder.createBuffers(verticesAndIndices);
        setBuffers(buffers);
    };

    // Initialize
    useEffect(() => {
        if (!device || !pipeline || !canvasFormat) return;

        const canvas = canvasRef.current;
        if (!canvas) {
            console.warn('Canvas element is not available yet.');
            return;
        }
        const ctx = canvas.getContext('webgpu');
        if (!ctx) {
            throw new Error("WebGPU context could not be created.");
        }
        ctx.configure({
            device: device,
            format: canvasFormat,
        });
        const dataLoader = new DataLoader();
        dataLoader.load('src/assets/data/world-geojson.json', (data) => {
            setFeatures(data.features);
            if (mapRef.current) return;
            
        });
    }, [device, pipeline, canvasFormat]);

    
    useEffect(() => {
        if (features.length === 0) return;
        getBuffers();
    }, [device, pipeline, features, offset, scale]);

    useEffect(() => {
        if (!device || !pipeline || !buffers) return;

        const canvas = canvasRef.current;
        if (!canvas) {
            console.warn('Canvas element is not available yet.');
            return;
        }
        const ctx = canvas.getContext('webgpu');
        if (!ctx) {
            throw new Error("WebGPU context could not be created.");
        }

        if (!buffers.verticesBuffer || !buffers.indicesBuffer || !buffers.indicesLength) {
            throw new Error('Buffers are not ready yet.');
        }

        const renderer = new Renderer(ctx, device, pipeline, buffers);
        renderer.render();
    }, [device, pipeline, buffers]);




    // 鼠标事件
    // 滚轮
    const lastMousePosition = useRef<[number, number] | null>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        const map = mapRef.current;
        if (!canvas || !map) return;

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            // let newScale = scale * Math.pow(0.99, event.deltaY * 0.1);
            // newScale = Math.min(Math.max(0.1, newScale), 10);
            // setScale(newScale);
            let newZoom = map.zoom * Math.pow(0.99, event.deltaY * 0.1);
            map.setZoom(newZoom);
        };

        canvas.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
        }
    }, [scale, mapRef.current!.zoom]);

    const handleWheel = (event: React.WheelEvent) => {
        const map = mapRef.current;
        if (!map) return;

        event.preventDefault();
        let newZoom = map.zoom * Math.pow(0.99, event.deltaY * 0.1);
        map.setZoom(newZoom);
    };

    // 拖拽
    const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        lastMousePosition.current = [event.clientX, event.clientY];
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('mousemove', handleMouseMove);
    };

    const handleMouseUp = (_event: MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        lastMousePosition.current = null;
        canvas.removeEventListener('mouseup', handleMouseUp);
        canvas.removeEventListener('mousemove', handleMouseMove);
    };


    const handleMouseMove = (event: MouseEvent) => {
        if (!lastMousePosition.current) return;

        const dx = (event.clientX - lastMousePosition.current[0]) / window.innerWidth * 360 / scale;
        const dy = (event.clientY - lastMousePosition.current[1]) / window.innerHeight * 180 / scale;
        lastMousePosition.current = [event.clientX, event.clientY]; // 更新 lastMousePosition 为当前鼠标位置

        // const newOffsetX = offset[0] + dx;
        // const newOffsetY = offset[1] - dy;
    
        // 检查是否超出范围
        // if (newOffsetY >= -90 && newOffsetY <= 90) {
        //     setOffset([newOffsetX, newOffsetY]);
        // } else {
        //     setOffset([newOffsetX, offset[1]]);
        // }
        setOffset(prevOffset => {
            const newOffsetX = prevOffset[0] + dx;
            const newOffsetY = prevOffset[1] - dy;
            console.log(newOffsetX, newOffsetY, dx, dy);
            
            // 检查是否超出范围
            if (newOffsetY >= -90 && newOffsetY <= 90) {
                return [newOffsetX, newOffsetY];
            } else {
                return [newOffsetX, prevOffset[1]];
            }
        });
    };


    return (
        <canvas 
            ref={canvasRef} width="1024" height="512" style={{width: '100%', height: '100%'}} 
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
        />
    );
};
