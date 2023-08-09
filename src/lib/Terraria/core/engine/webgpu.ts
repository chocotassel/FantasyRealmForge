import type { Layer, Point } from '../../types';
import { AffineOptions } from '../../types';
import pointWGSL from '../shader/point.wgsl';
import defaultWGSL from '../shader/default.wgsl';
import defaultWGSL3d from '../shader/default3d.wgsl';
import animationWGSL3To2 from '../shader/animation.wgsl';
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

	pipelineList?: pipelineList;
	pipelineList3d?: pipelineList;

	aspectRatio: number;
	depthTexture?: GPUTexture;

	matrixUniformBuffer?: GPUBuffer;
	pipelineList3d2d?: pipelineList;
	pipelineList2d3d?: pipelineList;


    constructor(aspectRatio: number) {
		this.aspectRatio = aspectRatio;
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

		const affineOptions: AffineOptions = {
			canvasWidth: this.ctx.canvas.width,
			canvasHeight: this.ctx.canvas.height,
			center,
			scale: zoom,
			bearing,
			pitch,
		}

		// 选择pipeline
		const pipelineList = this.createPipelineList(style);

		// 纹理
		const textureView = this.ctx!.getCurrentTexture().createView();
		const depthTextureView = this.depthTexture!.createView();
		
		// 创建command
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

	};

}

export default WebGPU;