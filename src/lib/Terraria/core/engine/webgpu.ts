import type { Layer, Point } from '../../types';
import { AffineOptions } from '../../types';
import pointWGSL from '../shader/point.wgsl';
import defaultWGSL from '../shader/default.wgsl';
import defaultWGSL3d from '../shader/default3d.wgsl';
import animationWGSL3To2 from '../shader/animation.wgsl';
import { mat4, vec3 } from 'gl-matrix';
import Pipeline from './pipeline';
import BindGroup from './bindgroup';
import Command from './command';

type pipelineList = {
	[key: string]: any;
	point: GPURenderPipeline;
	line: GPURenderPipeline;
	triangle: GPURenderPipeline;
}

class WebGPU {
    ctx?: GPUCanvasContext;
    device?: GPUDevice;

	// pipeline?: GPURenderPipeline;
	pipelineList?: pipelineList;
	pipelineList3d?: pipelineList;

	aspectRatio: number;
	depthTexture?: GPUTexture;

	matrixUniformBuffer?: GPUBuffer;
	pipelineList3d2d?: pipelineList;
	pipelineList2d3d?: pipelineList;


    constructor(aspectRatio: number) {
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

		const depthTexture = device.createTexture({
			size: [canvas.width, canvas.height],
			format: 'depth24plus-stencil8',
			usage: GPUTextureUsage.RENDER_ATTACHMENT,
		});

		this.depthTexture = depthTexture;

		if (options) {
			console.log(options);
		}
		
		const pointPipeline = await Pipeline.createPipeline(device, pointWGSL, canvasFormat, 'point-list', 'point pipeline');
		const linePipeline = await Pipeline.createPipeline(device, defaultWGSL, canvasFormat, 'line-list', 'line pipeline');
		const trianglePipeline = await Pipeline.createPipeline(device, defaultWGSL, canvasFormat, 'triangle-list', 'triangle pipeline');
		this.pipelineList = {
			point: pointPipeline,
			line: linePipeline,
			triangle: trianglePipeline,
		}

		const pointPipeline3d = await Pipeline.createPipeline3d(device, defaultWGSL3d, canvasFormat, 'point-list', 'point pipeline 3d');
		const linePipeline3d = await Pipeline.createPipeline3d(device, defaultWGSL3d, canvasFormat, 'line-list', 'line pipeline 3d');
		const trianglePipeline3d = await Pipeline.createPipeline3d(device, defaultWGSL3d, canvasFormat, 'triangle-list', 'triangle pipeline 3d');
		this.pipelineList3d = {
			point: pointPipeline3d,
			line: linePipeline3d,
			triangle: trianglePipeline3d,
		}


		const pointPipeline3d2d = await Pipeline.createPipeline3d(device, animationWGSL3To2, canvasFormat, 'point-list', 'point pipeline 3d2d');
		const linePipeline3d2d = await Pipeline.createPipeline3d(device, animationWGSL3To2, canvasFormat, 'line-list', 'line pipeline 3d2d');
		const trianglePipeline3d2d = await Pipeline.createPipeline3d(device, animationWGSL3To2, canvasFormat, 'triangle-list', 'triangle pipeline 3d2d');
		this.pipelineList3d2d = {
			point: pointPipeline3d2d,
			line: linePipeline3d2d,
			triangle: trianglePipeline3d2d,
		}
    }


	// // 创建顶点和索引缓冲区
	// createBuffers(device: GPUDevice, vertices: Float32Array, indices: Uint16Array): { verticesBuffer: GPUBuffer, indicesBuffer: GPUBuffer, indicesLength: number } {
	// 	const verticesBuffer = device.createBuffer({
	// 		size: vertices.byteLength,
	// 		usage: GPUBufferUsage.VERTEX,
	// 		mappedAtCreation: true,
	// 	});
	// 	new Float32Array(verticesBuffer.getMappedRange()).set(vertices);
	// 	verticesBuffer.unmap();

	// 	// 检查索引数量是否为偶数
	// 	let indicesLength = indices.length;
	// 	let paddedIndices = indices;
	// 	if (indicesLength % 2 !== 0) {
	// 		// 如果索引数量为奇数，添加一个额外的索引
	// 		paddedIndices = new Uint16Array(indicesLength + 1);
	// 		paddedIndices.set(indices);
	// 		paddedIndices[indicesLength] = 0; // 可以设置为一个已存在的顶点索引
	// 	}

	// 	const indicesBuffer = device.createBuffer({
	// 		size: paddedIndices.byteLength,
	// 		usage: GPUBufferUsage.INDEX,
	// 		mappedAtCreation: true,
	// 	});
	// 	new Uint16Array(indicesBuffer.getMappedRange()).set(paddedIndices);
	// 	indicesBuffer.unmap();

	// 	return { verticesBuffer, indicesBuffer, indicesLength };
	// }

	// // 创建顶点缓冲区
	// createPointBuffers(device: GPUDevice, vertices: Float32Array): { verticesBuffer: GPUBuffer, vertexCount: number } {
	// 	const verticesBuffer = device.createBuffer({
	// 		size: vertices.byteLength,
	// 		usage: GPUBufferUsage.VERTEX,
	// 		mappedAtCreation: true,
	// 	});
	// 	new Float32Array(verticesBuffer.getMappedRange()).set(vertices);
	// 	verticesBuffer.unmap();

	// 	// 顶点数量由数据长度除以每个顶点的分量数得出
	// 	// 如果每个顶点由2个浮点数组成（例如，2D坐标），则分量数为2
	// 	const vertexCount = vertices.length / 2;

	// 	return { verticesBuffer, vertexCount };
	// }


	// // 计算仿射矩阵
	// calculateAffineMatrix(
	// 	canvasWidth: number, 
	// 	canvasHeight: number, 
	// 	center: Point,
	// 	scale: number,
	// 	bearing: number,
	// 	pitch: number,
	// ): Float32Array {
	// 	// 计算画布的宽高比，并找到适合2:1宽高比的缩放因子
	// 	const aspectRatio = canvasWidth / canvasHeight;
	// 	const targetAspectRatio = this.aspectRatio; // 目标宽高比为2:1
	// 	let scaleX, scaleY;
	// 	if (aspectRatio >= targetAspectRatio) {
	// 		// 如果画布宽高比大于或等于2:1，则按高度缩放
	// 		scaleX = scale / 180;
	// 		scaleY = aspectRatio / targetAspectRatio * scale / 90;
	// 	} else {
	// 		// 如果画布宽高比小于2:1，则按宽度缩放
	// 		scaleX = targetAspectRatio / aspectRatio * scale / 180;
	// 		scaleY = scale / 90;
	// 	}

	// 	// 计算旋转角的余弦和正弦值
	// 	const cosBearing = Math.cos(bearing);
	// 	const sinBearing = Math.sin(bearing);
	
	// 	// // 计算俯仰角的余弦和正弦值
	// 	// const cosPitch = Math.cos(pitch);
	// 	// const sinPitch = Math.sin(pitch);
		
	// 	// 计算偏移量
	// 	const offsetX = -center[0] * scaleX
	// 	const offsetY = -center[1] * scaleY
		
	
	// 	// 构造仿射矩阵
	// 	return new Float32Array([
	// 		scaleX * cosBearing, scaleY * sinBearing, offsetX, 0,
	// 		-scaleX * sinBearing, scaleY * cosBearing, offsetY, 0,
	// 		0, 0, 1, 0,
	// 		0, 0, 0, 0
	// 	]);
	
	// 	// // 构造仿射矩阵
	// 	// return new Float32Array([
	// 	// 	scaleX * cosBearing, scaleY * sinBearing * cosPitch, scaleY * sinBearing * sinPitch, offsetX,
	// 	// 	-scaleX * sinBearing, scaleY * cosBearing * cosPitch, scaleY * cosBearing * sinPitch, offsetY,
	// 	// 	0, -scaleY * sinPitch, scaleY * cosPitch, 0,
	// 	// 	0, 0, 0, 1
	// 	// ]);
	// }

	// calculateAffineMatrix3d(
	// 	canvasWidth: number, 
	// 	canvasHeight: number, 
	// 	center: Point,
	// 	scale: number,
	// 	bearing: number,
	// 	pitch: number,
	// ): Float32Array {
	// 	const fov = 70;
	// 	const near = 0.1;
	// 	const far = 1000;
	
	// 	const radius = 1;
	
	// 	const centerVec3 = vec3.fromValues(0, 0, 0);

	// 	const cameraPosition = vec3.fromValues(
	// 		2 / scale * Math.sin(center[0] * Math.PI / 180) * Math.cos(center[1] * Math.PI / 180),
	// 		2 / scale * Math.sin(center[1] * Math.PI / 180),
	// 		2 / scale * Math.cos(center[0] * Math.PI / 180) * Math.cos(center[1] * Math.PI / 180),
	// 	);


	// 	const projectionMatrix = mat4.create();
	// 	mat4.perspective(projectionMatrix, fov, canvasWidth / canvasHeight, near, far);
	
	// 	const viewMatrix = mat4.create();
	// 	mat4.lookAt(viewMatrix, cameraPosition, centerVec3, [0, 1, 0]);
	
	// 	const modelMatrix = mat4.create();
	// 	mat4.scale(modelMatrix, modelMatrix, [radius, radius, radius]);
	
	// 	const finalMatrix = mat4.create();
	// 	mat4.multiply(finalMatrix, projectionMatrix, viewMatrix);
	// 	mat4.multiply(finalMatrix, finalMatrix, modelMatrix);
	
	// 	return new Float32Array(finalMatrix);
	// }





	// 执行绘制命令
	render(
		layer: Layer,
		style: string,
		center: Point,
		zoom: number,
		bearing: number,
		pitch: number,
		progress?: number,
	) {
		if (!this.ctx || !this.device) {
			console.log(this.ctx, this.device);
			throw new Error("WebGPU context could not be created.");
		}
		
		// const affineMatrix = this.createAffineMatrix(style, this.ctx.canvas.width, this.ctx.canvas.height, center, zoom, bearing, pitch);
		
		// // 在GPU显存上创建一个uniform数据缓冲区
		// let uniformBufferArray
		// if (typeof progress === 'number') {
		// 	uniformBufferArray = this.createUniformBuffer(affineMatrix, new Float32Array([progress]));
		// } else {
		// 	uniformBufferArray = this.createUniformBuffer(affineMatrix);
		// }
		

		// const entriesOfBindGroup: GPUBindGroupEntry[] = [];
		// for (let i = 0; i < uniformBufferArray.length; i++) {
		// 	entriesOfBindGroup.push({
		// 		binding: i,
		// 		resource: { buffer: uniformBufferArray[i] }
		// 	});
		// }
		// if (style == '3d-2d' && (entriesOfBindGroup.length !== 2)) {
		// 	console.log('err', entriesOfBindGroup, progress);
		// }
		

		const affineOptions: AffineOptions = {
			canvasWidth: this.ctx.canvas.width,
			canvasHeight: this.ctx.canvas.height,
			center,
			scale: zoom,
			bearing,
			pitch,
		}

		const pipelineList = this.createPipelineList(style);

		// const bindGroup = BindGroup.createBindGroup(this.device, pipeline, style, affineOptions, progress);
		const textureView = this.ctx!.getCurrentTexture().createView();
		const depthTextureView = this.depthTexture!.createView();
		
		const commandEncoder = new Command(this.device, textureView, depthTextureView, style);
		for (const primitive of layer.data) {
			if (!primitive.vertices.length) continue;
			const pipeline = pipelineList[primitive.type];
			
			if (!pipeline) continue;
			const bindGroup = BindGroup.createBindGroup(this.device, pipeline, style, affineOptions, progress);

			if (primitive.type === 'point')
				commandEncoder.setupRenderPassPoint(this.device, pipeline, bindGroup, primitive.vertices);
			else if (primitive.type === 'line')
				commandEncoder.setupRenderPassLine(this.device, pipeline, bindGroup, primitive.vertices, primitive.indices);
			else if (primitive.type === 'triangle')
				commandEncoder.setupRenderPassTriangle(this.device, pipeline, bindGroup, primitive.vertices, primitive.indices);
			else throw new Error('Unknown primitive type.');
		}
		commandEncoder.endRenderPass();
		this.device.queue.submit([commandEncoder.finish()]);


		// // 创建渲染通道
		// const commandEncoder = this.device.createCommandEncoder();
		// const renderPassDescriptor = this.createRenderPassDescriptor(style);
		// const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);

		// // 选择渲染管线
		// const pipelineList = this.createPipelineList(style);
		
		
		// for (const primitive of layer.data) {
		// 	if (!primitive.vertices.length) continue;

		// 	switch(primitive.type) {
		// 		case 'point':
		// 			this.setupRenderPassPoint(pipelineList.point, renderPass, entriesOfBindGroup, primitive.vertices);
		// 			break;
		// 		case 'line':
		// 			this.setupRenderPassLine(pipelineList.line,renderPass, entriesOfBindGroup, primitive.vertices, primitive.indices);
		// 			break;
		// 		case 'triangle':
		// 			this.setupRenderPassTriangle(pipelineList.triangle,renderPass, entriesOfBindGroup, primitive.vertices, primitive.indices);
		// 			break;	
		// 		default:
		// 			throw new Error('primitive type not supported')
		// 	}
		// }
		// renderPass.end();

		// 提交命令
		// this.device.queue.submit([commandEncoder.finish()]);
	};





	// // 创建仿射矩阵
	// createAffineMatrix(style: string,
	// 	canvasWidth: number, 
	// 	canvasHeight: number, 
	// 	center: Point,
	// 	scale: number,
	// 	bearing: number,
	// 	pitch: number
	// ) {
	// 	if (style === "3d" || style === "3d-2d") {
	// 		return this.calculateAffineMatrix3d(canvasWidth, canvasHeight, center, scale, bearing, pitch);
	// 	} else {
	// 		return this.calculateAffineMatrix(canvasWidth, canvasHeight, center, scale, bearing, pitch);
	// 	}
	// }

	// // 创建渲染通道描述符
	// createRenderPassDescriptor(style: string): GPURenderPassDescriptor {
	// 	const textureView = this.ctx!.getCurrentTexture().createView(); 
	// 	if (style === "3d" || style === "3d-2d") {
	// 		return {
	// 			label: 'canvas renderPass 3d',
	// 			colorAttachments: [{
	// 				view: textureView,
	// 				clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
	// 				loadOp: "clear",
	// 				storeOp: "store",
	// 			}],
	// 			depthStencilAttachment: {
	// 				view: this.depthTexture!.createView(),
	// 				depthClearValue: 1.0,
	// 				depthLoadOp: 'clear',
	// 				depthStoreOp: 'store',
	// 				stencilLoadOp: 'clear',
	// 				stencilStoreOp: 'store',
	// 				depthReadOnly: false,
	// 				stencilReadOnly: false,
	// 			},
	// 		}
	// 	}
	// 	else {
	// 		return {
	// 			label: 'canvas renderPass 2d',
	// 			colorAttachments: [{
	// 				view: textureView,
	// 				clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
	// 				loadOp: "load",
	// 				storeOp: "store",
	// 			}],
	// 		}
	// 	} 
	// }

	// 渲染管线选择
	createPipelineList(style: string): pipelineList {
		if (style === "3d") {
			return this.pipelineList3d!;
		} else if (style === "3d-2d") {
			return this.pipelineList3d2d!;
		} else if (style === "2d-3d") {
			return this.pipelineList2d3d!;
		} else {
			return this.pipelineList!;
		} 
	}

	// // 创建uniform数据缓冲区
	// createUniformBuffer(...args: Float32Array[]): GPUBuffer[] {
	// 	let uniformBufferArray: GPUBuffer[] = [];
	// 	for (let i = 0; i < args.length; i++) {
	// 		const uniformBufferSize = args[i].length * 4;
	// 		const uniformBuffer = this.device!.createBuffer({
	// 			label: `uniform ${i} ${uniformBufferSize}`,
	// 			size: uniformBufferSize,
	// 			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
	// 		});
	// 		this.device!.queue.writeBuffer(uniformBuffer, 0, args[i].buffer);
	// 		uniformBufferArray.push(uniformBuffer);
	// 	}
		
	// 	return uniformBufferArray;
	// }



	// // 渲染通道设置
	// setupRenderPassPoint(pipeline: GPURenderPipeline, renderPass: GPURenderPassEncoder, entries: GPUBindGroupEntry[], vertices: Float32Array) {
	// 	const { verticesBuffer, vertexCount } = this.createPointBuffers(this.device!, vertices);
	// 	const bindGroup = this.device!.createBindGroup({
	// 		layout: pipeline.getBindGroupLayout(0),
	// 		entries,
	// 	});


	// 	renderPass.setPipeline(pipeline);
	// 	renderPass.setBindGroup(0, bindGroup);
	// 	renderPass.setVertexBuffer(0, verticesBuffer);
	// 	renderPass.draw(vertexCount);
	// }
	// setupRenderPassLine(pipeline: GPURenderPipeline, renderPass: GPURenderPassEncoder, entries: GPUBindGroupEntry[], vertices: Float32Array, indices: Uint16Array) {
	// 	const { verticesBuffer, indicesBuffer, indicesLength } = this.createBuffers(this.device!, vertices, indices);
	// 	const bindGroup = this.device!.createBindGroup({
	// 		layout: pipeline.getBindGroupLayout(0),
	// 		entries,
	// 	});

	// 	renderPass.setPipeline(pipeline);
	// 	renderPass.setBindGroup(0, bindGroup);
	// 	renderPass.setVertexBuffer(0, verticesBuffer);
	// 	renderPass.setIndexBuffer(indicesBuffer, 'uint16');
	// 	renderPass.drawIndexed(indicesLength);
	// }
	// setupRenderPassTriangle(pipeline: GPURenderPipeline, renderPass: GPURenderPassEncoder, entries: GPUBindGroupEntry[], vertices: Float32Array, indices: Uint16Array) {
	// 	const { verticesBuffer, indicesBuffer, indicesLength } = this.createBuffers(this.device!, vertices, indices);
	// 	const bindGroup = this.device!.createBindGroup({
	// 		layout: pipeline.getBindGroupLayout(0),
	// 		entries,
	// 	});

	// 	renderPass.setPipeline(pipeline);
	// 	renderPass.setBindGroup(0, bindGroup);
	// 	renderPass.setVertexBuffer(0, verticesBuffer);
	// 	renderPass.setIndexBuffer(indicesBuffer, 'uint16');
	// 	renderPass.drawIndexed(indicesLength);
	// }



}

export default WebGPU;