

class Command {
    commandEncoder: GPUCommandEncoder;
    renderPass: GPURenderPassEncoder;
    
    
    constructor(
        device: GPUDevice,
        textureView: GPUTextureView,
        depthTextureView: GPUTextureView,
        style: string,
    ) {
		this.commandEncoder = device.createCommandEncoder();

		const renderPassDescriptor = this.createRenderPassDescriptor(style, textureView, depthTextureView);

		this.renderPass = this.commandEncoder.beginRenderPass(renderPassDescriptor);
    }

    endRenderPass() {
        this.renderPass.end();
    }

    finish() {
        return this.commandEncoder.finish();
    }
    
    // public static createCommandEncoder(
    //     device: GPUDevice,
    //     style: string,
    // ) {
	// 	const commandEncoder = device.createCommandEncoder();
	// 	const renderPassDescriptor = this.createRenderPassDescriptor(style);
	// 	const renderPass = commandEncoder.beginRenderPass(renderPassDescriptor);

    //     return commandEncoder;
    // }

	// 创建渲染通道描述符
	createRenderPassDescriptor(
        style: string,
        textureView: GPUTextureView,
        depthTextureView: GPUTextureView
    ): GPURenderPassDescriptor {
		if (style === "3d" || style === "3d-2d") {
			return {
				label: 'canvas renderPass 3d',
				colorAttachments: [{
					view: textureView,
					clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
					loadOp: "clear",
					storeOp: "store",
				}],
				depthStencilAttachment: {
					view: depthTextureView,
					depthClearValue: 1.0,
					depthLoadOp: 'clear',
					depthStoreOp: 'store',
					stencilLoadOp: 'clear',
					stencilStoreOp: 'store',
					depthReadOnly: false,
					stencilReadOnly: false,
				},
			}
		}
		else {
			return {
				label: 'canvas renderPass 2d',
				colorAttachments: [{
					view: textureView,
					clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
					loadOp: "load",
					storeOp: "store",
				}],
			}
		} 
	}


	// 渲染通道设置
	setupRenderPassPoint(device: GPUDevice, pipeline: GPURenderPipeline, bindGroup: GPUBindGroup, vertices: Float32Array) {
		const { verticesBuffer, vertexCount } = this.createPointBuffers(device, vertices);
		this.renderPass.setPipeline(pipeline);
		this.renderPass.setBindGroup(0, bindGroup);
		this.renderPass.setVertexBuffer(0, verticesBuffer);
		this.renderPass.draw(vertexCount);
	}
	setupRenderPassLine(device: GPUDevice, pipeline: GPURenderPipeline, bindGroup: GPUBindGroup, vertices: Float32Array, indices: Uint16Array) {
		const { verticesBuffer, indicesBuffer, indicesLength } = this.createBuffers(device, vertices, indices);

		this.renderPass.setPipeline(pipeline);
		this.renderPass.setBindGroup(0, bindGroup);
		this.renderPass.setVertexBuffer(0, verticesBuffer);
		this.renderPass.setIndexBuffer(indicesBuffer, 'uint16');
		this.renderPass.drawIndexed(indicesLength);
	}
	setupRenderPassTriangle(device: GPUDevice, pipeline: GPURenderPipeline, bindGroup: GPUBindGroup, vertices: Float32Array, indices: Uint16Array) {
		const { verticesBuffer, indicesBuffer, indicesLength } = this.createBuffers(device, vertices, indices);

		this.renderPass.setPipeline(pipeline);
		this.renderPass.setBindGroup(0, bindGroup);
		this.renderPass.setVertexBuffer(0, verticesBuffer);
		this.renderPass.setIndexBuffer(indicesBuffer, 'uint16');
		this.renderPass.drawIndexed(indicesLength);
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
}

export default Command;