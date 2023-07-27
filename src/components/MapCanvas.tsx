import React, { useEffect, useRef, useState } from 'react';
import { useWebGPUContext } from './WebGPUContext';
import { DataLoader } from '../utils/DataLoader';
import { BufferBuilder } from '../utils/BufferBuilder';
import { Renderer } from '../utils/Renderer';

export const MapCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState<[number, number]>([0, 0]);

    const { device, pipeline, canvasFormat } = useWebGPUContext();

    const [buffers, setBuffers] = useState<{
        verticesBuffer: GPUBuffer;
        indicesBuffer: GPUBuffer;
        indicesLength: number;
    } | null>(null);

    // Other state variables and event handlers...

    const getBuffers = async () => {
        const dataLoader = new DataLoader('src/assets/data/world-geojson.json');
        const verticesAndIndices = await dataLoader.getVerticesAndIndices(scale, offset);

        const bufferBuilder = new BufferBuilder(device);
        const buffers = bufferBuilder.createBuffers(verticesAndIndices);
        setBuffers(buffers);
    };

    // Initialize WebGPU
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

        getBuffers();
    }, [device, pipeline, offset, scale]);

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
        if (!canvas) return;

        const handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        let newScale = scale * Math.pow(0.99, event.deltaY * 0.1);
        newScale = Math.min(Math.max(0.1, newScale), 10);
        setScale(newScale);
        };

        canvas.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
        canvas.removeEventListener('wheel', handleWheel);
        }
    }, [scale]);

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

        const newOffsetX = offset[0] + dx;
        const newOffsetY = offset[1] - dy;
    
        // 检查是否超出范围
        if (newOffsetY >= -90 && newOffsetY <= 90) {
            setOffset([newOffsetX, newOffsetY]);
        } else {
            setOffset([newOffsetX, offset[1]]);
        }
    };


    return (
        <canvas 
          ref={canvasRef} width="1024" height="512" style={{width: '100%', height: '100%'}} 
          onMouseDown={handleMouseDown}
        />
    );
};
