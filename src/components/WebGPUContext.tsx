import React, { createContext, useContext, useEffect, useState } from 'react';

interface WebGPUContextValue {
	device: GPUDevice | null;
	pipeline: GPURenderPipeline | null;
	canvasFormat: GPUTextureFormat | null
}

export const WebGPUContext = createContext<WebGPUContextValue>({ device: null, pipeline: null, canvasFormat: null });

export const WebGPUContextProvider: React.FC<{
  children: React.ReactNode
}>  = ({ children }) => {
	const [device, setDevice] = useState<GPUDevice | null>(null);
	const [canvasFormat, setCanvasFormat] = useState<GPUTextureFormat | null>(null);
	const [pipeline, setPipeline] = useState<GPURenderPipeline | null>(null);

	const initializeWebGPU = async () => {
		// 检查是否支持WebGPU
		if (!navigator.gpu) {
			throw new Error("WebGPU not supported on this browser.");
		}

		const adapter = await navigator.gpu.requestAdapter();

		if (!adapter) {
			throw new Error("No appropriate GPUAdapter found.");
		}
		
		// 创建设备
		const device = await adapter.requestDevice();
		setDevice(device);
		const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
		setCanvasFormat(canvasFormat);
		
		
		// 创建渲染管道
		const cellShaderModule = device.createShaderModule({
			label: 'Cell shader',
			code: `
			// Vertex shader
			@vertex
			fn vs_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
				return vec4<f32>(position, 0.0, 1.0);
			}

			// Fragment shader
			@fragment
			fn fs_main() -> @location(0) vec4<f32> {
				return vec4<f32>(1.0, 1.0, 1.0, 1.0); 
			}
			`
		});
		const pipeline = device.createRenderPipeline({
			label: 'render pipeline',
			layout: 'auto',
			vertex: {
			module: cellShaderModule,
			entryPoint: 'vs_main',
			buffers: [{
				arrayStride: 2 * 4,  // size of float32 is 4 bytes
				attributes: [{
				// position
				shaderLocation: 0,
				offset: 0,
				format: 'float32x2'
				}],
			}],
			},
			fragment: {
				module: cellShaderModule,
				entryPoint: 'fs_main',
				targets: [{
					format: canvasFormat,
				}],
			},
			primitive: {
			topology: 'triangle-list',
			},
		});
        
        setPipeline(pipeline);
	};

    useEffect(() => {
		initializeWebGPU();
    }, []);

    return (
        <WebGPUContext.Provider value={{ device, pipeline, canvasFormat }}>
            {children}
        </WebGPUContext.Provider>
    );
};

export const useWebGPUContext = (): WebGPUContextValue => {
    const context = useContext(WebGPUContext);
    if (!context) {
        throw new Error('useWebGPUContext must be used within a WebGPUContextProvider');
    }
    return context;
};
