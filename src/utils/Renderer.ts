export class Renderer {
    constructor(
		private ctx: GPUCanvasContext | null,
		private device: GPUDevice | null, 
		private pipeline: GPURenderPipeline | null, 
		private buffers: {verticesBuffer: GPUBuffer, indicesBuffer: GPUBuffer, indicesLength: number}
	) {
		if (!ctx || !device || !pipeline || !buffers) {
			throw new Error('ctx, Device, pipeline or buffers is null!');
		}

		this.ctx = ctx;
		this.device = device;
		this.pipeline = pipeline;
		this.buffers = buffers;
	}

    render(): void {
		const ctx = this.ctx;
		const device = this.device;
		const pipeline = this.pipeline;
		const { verticesBuffer, indicesBuffer, indicesLength } = this.buffers;

		if (!ctx || !device || !pipeline || !verticesBuffer || !indicesBuffer || indicesLength === null) {
		  return;
		}
	
		// 创建渲染通道
		const commandEncoder = device.createCommandEncoder();
		const textureView = ctx.getCurrentTexture().createView();
		const renderPass = commandEncoder.beginRenderPass({
		  colorAttachments: [{
			view: textureView,
			loadOp: "clear",
			clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
			storeOp: "store",
		  }]
		});
	
		// 执行绘制命令
		renderPass.setPipeline(pipeline);
		renderPass.setVertexBuffer(0, verticesBuffer);
		renderPass.setIndexBuffer(indicesBuffer, 'uint16');
		renderPass.drawIndexed(indicesLength);
		renderPass.end();
	
		// 提交命令
		device.queue.submit([commandEncoder.finish()]);
    }
}
