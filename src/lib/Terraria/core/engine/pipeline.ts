

/**
 * 渲染管道
 * @class Pipeline
 * Pipeline
 * GPUBuffer
 * GPUTexture
 * BindGroup
 */
class Pipeline {
    
	// 创建渲染管道
	public static async createPipeline(
		device: GPUDevice, 
		shaderCode: string, 
		format: GPUTextureFormat = 'bgra8unorm', 
		topology: GPUPrimitiveTopology = 'triangle-list',
		label: string = 'render pipeline'
	): Promise<GPURenderPipeline> {
		const cellShaderModule = device.createShaderModule({
			label: 'Cell shader',
			code: shaderCode,
		});
  
		const pipeline = device.createRenderPipeline({
			label,
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
		});
		
		return pipeline;
	}

	// 创建渲染管道3d
	public static async createPipeline3d(
		device: GPUDevice, 
		shaderCode: string, 
		format: GPUTextureFormat = 'bgra8unorm', 
		topology: GPUPrimitiveTopology = 'triangle-list',
		label: string = 'render pipeline 3d'
	): Promise<GPURenderPipeline> {
		const cellShaderModule = device.createShaderModule({
			label: 'Cell shader',
			code: shaderCode,
		});
  
		const pipeline = device.createRenderPipeline({
			label,
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
			depthStencil: {
				depthWriteEnabled: true,
				depthCompare: 'less',
				format: 'depth24plus-stencil8',
			}
		});
		
		return pipeline;
	}
}

export default Pipeline;