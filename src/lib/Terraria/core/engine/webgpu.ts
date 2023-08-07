import type { Layer, Point } from '../../types';
import pointWGSL from '../shader/point.wgsl';
import triangleWGSL from '../shader/default.wgsl';
import { mat4 } from 'gl-matrix';

class WebGPU {
    ctx?: GPUCanvasContext;
    device?: GPUDevice;
	// pipeline?: GPURenderPipeline;
	pointPipeline?: GPURenderPipeline;
	linePipeline?: GPURenderPipeline;
	trianglePipeline?: GPURenderPipeline;

	aspectRatio: number;

	matrixUniformBuffer?: GPUBuffer;


    constructor(aspectRatio: number) {
        // if (!canvas) {
        //     throw new Error('canvas is null!');
        // }
        // this.initialize(canvas);
		this.aspectRatio = aspectRatio;
		// this.affineMatrix = this.calculateAffineMatrix(canvas.width, canvas.height, 1);
    }
    
	// 初始化GPU
    async initialize(canvas: HTMLCanvasElement, options?: any) {
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

		if (options) {
			console.log(options);
		}
		
		this.pointPipeline = await this.createPipeline(device, pointWGSL, canvasFormat, 'point-list');
		this.linePipeline = await this.createPipeline(device, triangleWGSL, canvasFormat, 'line-list');
		this.trianglePipeline = await this.createPipeline(device, triangleWGSL, canvasFormat, 'triangle-list');
    }


	// 创建渲染管道
	async createPipeline(
		device: GPUDevice, 
		shaderCode: string, 
		format: GPUTextureFormat = 'bgra8unorm', 
		topology: GPUPrimitiveTopology = 'triangle-list'
	): Promise<GPURenderPipeline> {
		const cellShaderModule = device.createShaderModule({
			label: 'Cell shader',
			code: shaderCode,
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
					format: format,
				}],
			},
			primitive: {
				topology,
			},
			// multisample: {
			// 	count: 2,
			// }
		});
		
		return pipeline;
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

		// 检查索引数量是否为偶数
		let indicesLength = indices.length;
		let paddedIndices = indices;
		if (indicesLength % 2 !== 0) {
		// 如果索引数量为奇数，添加一个额外的索引
		paddedIndices = new Uint16Array(indicesLength + 1);
		paddedIndices.set(indices);
		paddedIndices[indicesLength] = 0; // 可以设置为一个已存在的顶点索引
		}

		const indicesBuffer = device.createBuffer({
			size: paddedIndices.byteLength,
			usage: GPUBufferUsage.INDEX,
			mappedAtCreation: true,
		});
		new Uint16Array(indicesBuffer.getMappedRange()).set(paddedIndices);
		indicesBuffer.unmap();

		return { verticesBuffer, indicesBuffer, indicesLength };
	}

	// 创建顶点缓冲区
	createPointBuffers(device: GPUDevice, vertices: Float32Array): { verticesBuffer: GPUBuffer, vertexCount: number } {
		const verticesBuffer = device.createBuffer({
			size: vertices.byteLength,
			usage: GPUBufferUsage.VERTEX,
			mappedAtCreation: true,
		});
		new Float32Array(verticesBuffer.getMappedRange()).set(vertices);
		verticesBuffer.unmap();

		// 顶点数量由数据长度除以每个顶点的分量数得出
		// 如果每个顶点由2个浮点数组成（例如，2D坐标），则分量数为2
		const vertexCount = vertices.length / 2;

		return { verticesBuffer, vertexCount };
	}


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
		
	
		// 构造仿射矩阵
		return new Float32Array([
			scaleX * cosBearing, scaleY * sinBearing, offsetX, 0,
			-scaleX * sinBearing, scaleY * cosBearing, offsetY, 0,
			0, 0, 1, 0,
			0, 0, 0, 0
		]);
	}


	// 执行绘制命令
	render(
		layer: Layer,
		style: string,
		center: Point,
		zoom: number,
		bearing: number,
		pitch: number,
	) {
		if (!this.ctx || !this.device) {
			console.log(this.ctx, this.device);
			throw new Error("WebGPU context could not be created.");
		}

		const affineMatrix = this.calculateAffineMatrix(this.ctx.canvas.width, this.ctx.canvas.height, center, zoom, bearing, pitch);
		
		// 在GPU显存上创建一个uniform数据缓冲区
		const uniformBufferSize = 64 
		const mat4Buffer = this.device.createBuffer({
			label: 'affine matrix',
			size: uniformBufferSize,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
		});
		this.device.queue.writeBuffer(mat4Buffer, 0, affineMatrix)

		// 创建渲染通道
		const commandEncoder = this.device.createCommandEncoder();
		const textureView = this.ctx.getCurrentTexture().createView();
		const renderPass = commandEncoder.beginRenderPass({
			label: 'our basic canvas renderPass',
			colorAttachments: [{
				view: textureView,
				clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
				loadOp: "load",
				storeOp: "store",
			}]
		});
		
		
		for (const primitive of layer.data) {
			// const { verticesBuffer, indicesBuffer, indicesLength } = this.createBuffers(this.device, primitive.vertices, primitive.indices);
			if (!primitive.vertices.length) continue;
			
			const entries: GPUBindGroupEntry[] = [{
				binding: 0,
				resource: { buffer: mat4Buffer }
			}]
			switch(primitive.type) {
				case 'point':
					this.setupRenderPassPoint(renderPass, entries, primitive.vertices);
					break;
				case 'line':
					this.setupRenderPassLine(renderPass, entries, primitive.vertices, primitive.indices);
					break;
				case 'triangle':
					this.setupRenderPassTriangle(renderPass, entries, primitive.vertices, primitive.indices);
					break;	
				default:
					throw new Error('primitive type not supported')
			}
		}
		renderPass.end();

		// 提交命令
		this.device.queue.submit([commandEncoder.finish()]);
	};


	// 渲染通道设置
	setupRenderPassPoint(renderPass: GPURenderPassEncoder, entries: GPUBindGroupEntry[], vertices: Float32Array) {
		const { verticesBuffer, vertexCount } = this.createPointBuffers(this.device!, vertices);
		const bindGroup = this.device!.createBindGroup({
			layout: this.pointPipeline!.getBindGroupLayout(0),
			entries,
		})

		renderPass.setPipeline(this.pointPipeline!)
		renderPass.setBindGroup(0, bindGroup);;
		renderPass.setVertexBuffer(0, verticesBuffer);
		renderPass.draw(vertexCount);
	}
	setupRenderPassLine(renderPass: GPURenderPassEncoder, entries: GPUBindGroupEntry[], vertices: Float32Array, indices: Uint16Array) {
		const { verticesBuffer, indicesBuffer, indicesLength } = this.createBuffers(this.device!, vertices, indices);
		const bindGroup = this.device!.createBindGroup({
			layout: this.linePipeline!.getBindGroupLayout(0),
			entries,
		})

		renderPass.setPipeline(this.linePipeline!);
		renderPass.setBindGroup(0, bindGroup);
		renderPass.setVertexBuffer(0, verticesBuffer);
		renderPass.setIndexBuffer(indicesBuffer, 'uint16');
		renderPass.drawIndexed(indicesLength);
	}
	setupRenderPassTriangle(renderPass: GPURenderPassEncoder, entries: GPUBindGroupEntry[], vertices: Float32Array, indices: Uint16Array) {
		const { verticesBuffer, indicesBuffer, indicesLength } = this.createBuffers(this.device!, vertices, indices);
		const bindGroup = this.device!.createBindGroup({
			layout: this.trianglePipeline!.getBindGroupLayout(0),
			entries,
		})

		renderPass.setPipeline(this.trianglePipeline!);
		renderPass.setBindGroup(0, bindGroup);
		renderPass.setVertexBuffer(0, verticesBuffer);
		renderPass.setIndexBuffer(indicesBuffer, 'uint16');
		renderPass.drawIndexed(indicesLength);
	}



}

export default WebGPU;