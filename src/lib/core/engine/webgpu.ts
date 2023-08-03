import type { GeoJson, Point, Source } from '../../types';
import Parser from '../data/parser';

class WebGPU {
    ctx?: GPUCanvasContext;
    device?: GPUDevice;
	pipeline?: GPURenderPipeline;

	aspectRatio: number;

	matrixUniformBuffer?: GPUBuffer;

    constructor(canvas: HTMLCanvasElement, aspectRatio: number) {
        if (!canvas) {
            throw new Error('canvas is null!');
        }
        this.initialize(canvas);
		this.aspectRatio = aspectRatio;
		// this.affineMatrix = this.calculateAffineMatrix(canvas.width, canvas.height, 1);
    }
    
	// 初始化GPU
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
		
		// 
		const shaderCode = `
			@group(0) @binding(0) var<uniform> matrix: mat4x4<f32>;
		
			@vertex
			fn vs_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
				var mat = mat3x3<f32>(
					matrix[0].x, matrix[1].x, matrix[2].x,
					matrix[0].y, matrix[1].y, matrix[2].y,
					matrix[0].z, matrix[1].z, matrix[2].z);
				var transformedPosition3 = mat * vec3<f32>(position, 1.0);
				var transformedPosition: vec2<f32> = transformedPosition3.xy;
				return vec4<f32>(transformedPosition, 0.0, 1.0);
			}
		
			@fragment
			fn fs_main() -> @location(0) vec4<f32> {
				return vec4<f32>(1.0, 1.0, 1.0, 1.0);
			}
		`
		this.createShaderModule(device, shaderCode, '', canvasFormat);
    }


	// 创建着色器模块
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

	loadData(data: GeoJson) {
		return Parser.parseGeoJSONToLonLat(data);
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

	calculateAffineMatrix(
		canvasWidth: number, 
		canvasHeight: number, 
		center: Point,
		scale: number,
		bearing: number,
		pitch: number,
	): Float32Array {
		// 计算画布的宽高比，并找到适合2:1宽高比的缩放因子
		const aspectRatio = canvasWidth / canvasHeight;
		const targetAspectRatio = this.aspectRatio; // 目标宽高比为2:1
		let scaleX, scaleY;
		if (aspectRatio >= targetAspectRatio) {
			// 如果画布宽高比大于或等于2:1，则按高度缩放
			scaleX = scale / 180;
			scaleY = aspectRatio / targetAspectRatio * scale / 90;
		} else {
			// 如果画布宽高比小于2:1，则按宽度缩放
			scaleX = targetAspectRatio / aspectRatio * scale / 180;
			scaleY = scale / 90;
		}

		// 计算旋转角的余弦和正弦值
		const cosBearing = Math.cos(bearing);
		const sinBearing = Math.sin(bearing);
	
		// 计算中心点的墨卡托坐标
		// const centerX = center[0];
		// const centerY = Math.log(Math.tan(Math.PI / 4 + center[1] / 2));
		
		//
		const offsetX = -center[0] * scaleX
		const offsetY = -center[1] * scaleY

		console.log(offsetX, offsetY);
		
	
		// 构造仿射矩阵
		return new Float32Array([
			scaleX * cosBearing, scaleY * sinBearing, offsetX, 0,
			-scaleX * sinBearing, scaleY * cosBearing, offsetY, 0,
			0, 0, 1, 0,
			0, 0, 0, 0
		]);

		// 仿射矩阵
		return new Float32Array([
			scaleX, 0, 0, 0,
			0, scaleY, 0, 0,
			0, 0, 0, 0
		]);
	}


	// 执行绘制命令
	render(
		source: Source,
		style: string,
		center: Point,
		zoom: number,
		bearing: number,
		pitch: number,
	) {
		if (!this.ctx || !this.device || !this.pipeline) {
			console.log(this.ctx, this.device, this.pipeline);
			throw new Error("WebGPU context could not be created.");
		}

		if (!source.vertices || !source.indices) {
			throw new Error("Data is not loaded.");
		}

		// const {vertices, indices} = Parser.parseGeoJSON(data, center, zoom, bearing, pitch);
		const affineMatrix = this.calculateAffineMatrix(this.ctx.canvas.width, this.ctx.canvas.height, center, zoom, bearing, pitch);

		const { verticesBuffer, indicesBuffer, indicesLength } = this.createBuffers(this.device, source.vertices, source.indices);

		
		// 在GPU显存上创建一个uniform数据缓冲区
		const uniformBufferSize = 64 
		const mat4Buffer = this.device.createBuffer({
			label: 'affine matrix',
			size: uniformBufferSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
		const bindGroup = this.device.createBindGroup({
			layout: this.pipeline.getBindGroupLayout(0),
			entries: [{
				binding: 0,
				resource: { buffer: mat4Buffer },
			}],
		})
		this.device.queue.writeBuffer(mat4Buffer, 0, affineMatrix)


		// 创建渲染通道
		const commandEncoder = this.device.createCommandEncoder();
		const textureView = this.ctx.getCurrentTexture().createView();
		const renderPass = commandEncoder.beginRenderPass({
			label: 'our basic canvas renderPass',
			colorAttachments: [{
				view: textureView,
				clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
				loadOp: "clear",
				storeOp: "store",
			}]
		});


		// 执行绘制命令
		renderPass.setPipeline(this.pipeline);
		renderPass.setBindGroup(0, bindGroup);
		renderPass.setVertexBuffer(0, verticesBuffer);
		renderPass.setIndexBuffer(indicesBuffer, 'uint16');
		renderPass.drawIndexed(indicesLength);
		renderPass.end();

		// 提交命令
		this.device.queue.submit([commandEncoder.finish()]);
	};
}

export default WebGPU;