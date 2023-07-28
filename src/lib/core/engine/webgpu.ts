import type { GeoJson } from '../../types/geojson';
import Parser from '../data/parser';

class WebGPU {
    ctx?: GPUCanvasContext;
    device?: GPUDevice;
	pipeline?: GPURenderPipeline;

    constructor(canvas: HTMLCanvasElement) {
        if (!canvas) {
            throw new Error('canvas is null!');
        }
        this.initialize(canvas);
    }
    
    async initialize(canvas: HTMLCanvasElement) {
		// 检查是否支持WebGPU
		if (!navigator.gpu) {
			throw new Error("WebGPU not supported on this browser.");
		}

		const adapter = await navigator.gpu.requestAdapter();

		if (!adapter) {
			throw new Error("No appropriate GPUAdapter found.");
		}
		const device = await adapter.requestDevice();
		this.device = device;


		const ctx = canvas.getContext("webgpu");
		if (!ctx) {
			throw new Error("WebGPU context could not be created.");
		}
		const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
		ctx.configure({
			device: device,
			format: canvasFormat,
		});
        this.ctx = ctx;

		const shaderCode = `
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
		this.createShaderModule(device, shaderCode, '', canvasFormat);
    }

	async createShaderModule(device: GPUDevice, shaderCode: string, shaderType: string, format: GPUTextureFormat = 'bgra8unorm') {
		
		const cellShaderModule = device.createShaderModule({
			label: 'Cell shader',
			code: shaderCode,
		});
		// 创建渲染管道
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
					format: format,
				}],
			},
			primitive: {
				topology: 'triangle-list',
			},
		});
		this.pipeline = pipeline;
	}


	// 创建顶点和索引缓冲区
	createBuffers(device: GPUDevice, vertices: Float32Array, indices: Uint16Array): { verticesBuffer: GPUBuffer, indicesBuffer: GPUBuffer, indicesLength: number } {
		
		const verticesBuffer = device.createBuffer({
			size: vertices.byteLength,
			usage: GPUBufferUsage.VERTEX,
			mappedAtCreation: true,
		});
		new Float32Array(verticesBuffer.getMappedRange()).set(vertices);
		verticesBuffer.unmap();

		const indicesBuffer = device.createBuffer({
			size: indices.byteLength,
			usage: GPUBufferUsage.INDEX,
			mappedAtCreation: true,
		});
		new Uint16Array(indicesBuffer.getMappedRange()).set(indices);
		indicesBuffer.unmap();

		return { verticesBuffer, indicesBuffer, indicesLength: indices.length };
	};



	// 执行绘制命令
	render(
		data: GeoJson, 
		style: string,
		center: [number, number],
		zoom: number,
		bearing: number,
		pitch: number,
	) {
		if (!this.ctx || !this.device || !this.pipeline) {
			console.log(this.ctx, this.device, this.pipeline);
			
			throw new Error("WebGPU context could not be created.");
		}

		const {vertices, indices} = Parser.parseGeoJSON(data, center, zoom, bearing, pitch);

		const { verticesBuffer, indicesBuffer, indicesLength } = this.createBuffers(this.device, vertices, indices);

		// 创建渲染通道
		const commandEncoder = this.device.createCommandEncoder();
		const textureView = this.ctx.getCurrentTexture().createView();
		const renderPass = commandEncoder.beginRenderPass({
			colorAttachments: [{
				view: textureView,
				loadOp: "clear",
				clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
				storeOp: "store",
			}]
		});

		// 执行绘制命令
		renderPass.setPipeline(this.pipeline);
		renderPass.setVertexBuffer(0, verticesBuffer);
		renderPass.setIndexBuffer(indicesBuffer, 'uint16');
		renderPass.drawIndexed(indicesLength);
		renderPass.end();

		// 提交命令
		this.device.queue.submit([commandEncoder.finish()]);
	};
}

export default WebGPU;