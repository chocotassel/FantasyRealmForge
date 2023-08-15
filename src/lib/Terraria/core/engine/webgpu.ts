import type { Layer, Point } from '../../types';
import { AffineOptions } from '../../types';
import pointWGSL from '../shader/point.wgsl';
import defaultWGSL from '../shader/default.wgsl';
import defaultWGSL3d from '../shader/default3d.wgsl';
import animationWGSL3To2 from '../shader/animation_3to2.wgsl';
import animationWGSL2To3 from '../shader/animation_2to3.wgsl';
import blockWGSL from '../shader/block.wgsl';

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
	pipelineList3to2?: pipelineList;
	pipelineList2to3?: pipelineList;
	blockPipeline?: GPURenderPipeline;


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


		const pointPipeline3to2 = await Pipeline.createPipeline3d(device, animationWGSL3To2, canvasFormat, 'point-list', 'point pipeline 3to2');
		const linePipeline3to2 = await Pipeline.createPipeline3d(device, animationWGSL3To2, canvasFormat, 'line-list', 'line pipeline 3to2');
		const trianglePipeline3to2 = await Pipeline.createPipeline3d(device, animationWGSL3To2, canvasFormat, 'triangle-list', 'triangle pipeline 3to2');
		this.pipelineList3to2 = {
			point: pointPipeline3to2,
			line: linePipeline3to2,
			triangle: trianglePipeline3to2,
		}
		const pointPipeline2to3 = await Pipeline.createPipeline3d(device, animationWGSL2To3, canvasFormat, 'point-list', 'point pipeline 2to3');
		const linePipeline2to3 = await Pipeline.createPipeline3d(device, animationWGSL2To3, canvasFormat, 'line-list', 'line pipeline 2to3');
		const trianglePipeline2to3 = await Pipeline.createPipeline3d(device, animationWGSL2To3, canvasFormat, 'triangle-list', 'triangle pipeline 2to3');
		this.pipelineList2to3 = {
			point: pointPipeline2to3,
			line: linePipeline2to3,
			triangle: trianglePipeline2to3,
		}

		this.blockPipeline = await Pipeline.createPipeline(device, blockWGSL, canvasFormat, 'triangle-list', 'block pipeline');
    }


	// 渲染管线选择
	createPipelineList(style: string): pipelineList {
		if (style === "3d") {
			return this.pipelineList3d!;
		} else if (style === "3d-2d") {
			return this.pipelineList3to2!;
		} else if (style === "2d-3d") {
			return this.pipelineList2to3!;
		} else {
			return this.pipelineList!;
		} 
	}




	// 执行绘制命令
	render(
		layers: Layer[],
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
		for (const layer of layers) {
			for (const primitive of layer.data) {
				if (!primitive.vertices.length) continue;
				const pipeline = primitive.type !== 'block' ? pipelineList[primitive.type] : this.blockPipeline;
				
				
				if (!pipeline && primitive.type !== 'block') continue;
				const bindGroup = BindGroup.createBindGroup(this.device, pipeline, style, affineOptions, primitive.color, progress);

				if (primitive.type === 'point')
					commandEncoder.setupRenderPassPoint(this.device, pipeline, bindGroup, primitive.vertices);
				else if (primitive.type === 'line')
					commandEncoder.setupRenderPassLine(this.device, pipeline, bindGroup, primitive.vertices, primitive.indices);
				else if (primitive.type === 'triangle')
					commandEncoder.setupRenderPassTriangle(this.device, pipeline, bindGroup, primitive.vertices, primitive.indices);
				else if (primitive.type === 'block')
					commandEncoder.setupRenderPassTriangle(this.device, pipeline, bindGroup, primitive.vertices, primitive.indices);
				else throw new Error('Unknown primitive type.');
			}
		}
		commandEncoder.endRenderPass();
		this.device.queue.submit([commandEncoder.finish()]);

	};

}

export default WebGPU;