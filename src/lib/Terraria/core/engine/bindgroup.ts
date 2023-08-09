import { vec3, mat4 } from "gl-matrix";
import { AffineOptions, Point } from "../../types";



class BindGroup {

    static targetAspectRatio: number = 2;

    public static createBindGroup(
        device: GPUDevice,
        pipeline: GPURenderPipeline,
        style: string,
        affineOptions: AffineOptions,
        progress?: number
    ): GPUBindGroup {
        
		const affineMatrix = this.createAffineMatrix(style, affineOptions);

		// 在GPU显存上创建一个uniform数据缓冲区
		let uniformBufferArray
		if (typeof progress === 'number') {
			uniformBufferArray = this.createUniformBuffer(device, affineMatrix, new Float32Array([progress]));
		} else {
			uniformBufferArray = this.createUniformBuffer(device, affineMatrix);
		}
		
        // 创建一个绑定组
		const entriesOfBindGroup: GPUBindGroupEntry[] = [];
		for (let i = 0; i < uniformBufferArray.length; i++) {
			entriesOfBindGroup.push({
				binding: i,
				resource: { buffer: uniformBufferArray[i] }
			});
		}
		if (style == '3d-2d' && (entriesOfBindGroup.length !== 2)) {
			console.log('err', entriesOfBindGroup, progress);
		}

        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: entriesOfBindGroup
        });
		
        return bindGroup;
    }


	// 创建uniform数据缓冲区
	static createUniformBuffer(device: GPUDevice, ...args: Float32Array[]): GPUBuffer[] {
		let uniformBufferArray: GPUBuffer[] = [];
		for (let i = 0; i < args.length; i++) {
			const uniformBufferSize = args[i].length * 4;
			const uniformBuffer = device!.createBuffer({
				label: `uniform ${i} ${uniformBufferSize}`,
				size: uniformBufferSize,
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
			});
			device!.queue.writeBuffer(uniformBuffer, 0, args[i].buffer);
			uniformBufferArray.push(uniformBuffer);
		}
		
		return uniformBufferArray;
	}


    
	// 创建仿射矩阵
	static createAffineMatrix(
        style: string,
        affineOptions: AffineOptions
	) {
		if (style === "3d" || style === "3d-2d") {
			return this.calculateAffineMatrix3d(affineOptions);
		} else {
			return this.calculateAffineMatrix(affineOptions);
		}
	}


	// 计算仿射矩阵
	static calculateAffineMatrix(
        affineOptions: AffineOptions
	): Float32Array {
        const { canvasWidth, canvasHeight, center, scale, bearing, pitch } = affineOptions;
		// 计算画布的宽高比，并找到适合2:1宽高比的缩放因子
		const aspectRatio = canvasWidth / canvasHeight;
		let scaleX, scaleY;
		if (aspectRatio >= this.targetAspectRatio) {
			// 如果画布宽高比大于或等于2:1，则按高度缩放
			scaleX = scale / 180;
			scaleY = aspectRatio / this.targetAspectRatio * scale / 90;
		} else {
			// 如果画布宽高比小于2:1，则按宽度缩放
			scaleX = this.targetAspectRatio / aspectRatio * scale / 180;
			scaleY = scale / 90;
		}

		// 计算旋转角的余弦和正弦值
		const cosBearing = Math.cos(bearing);
		const sinBearing = Math.sin(bearing);
	
		// // 计算俯仰角的余弦和正弦值
		// const cosPitch = Math.cos(pitch);
		// const sinPitch = Math.sin(pitch);
		
		// 计算偏移量
		const offsetX = -center[0] * scaleX
		const offsetY = -center[1] * scaleY
		
	
		// 构造仿射矩阵
		return new Float32Array([
			scaleX * cosBearing, scaleY * sinBearing, offsetX, 0,
			-scaleX * sinBearing, scaleY * cosBearing, offsetY, 0,
			0, 0, 1, 0,
			0, 0, 0, 0
		]);
	
		// // 构造仿射矩阵
		// return new Float32Array([
		// 	scaleX * cosBearing, scaleY * sinBearing * cosPitch, scaleY * sinBearing * sinPitch, offsetX,
		// 	-scaleX * sinBearing, scaleY * cosBearing * cosPitch, scaleY * cosBearing * sinPitch, offsetY,
		// 	0, -scaleY * sinPitch, scaleY * cosPitch, 0,
		// 	0, 0, 0, 1
		// ]);
	}

	static calculateAffineMatrix3d(
        affineOptions: AffineOptions
	): Float32Array {
        const { canvasWidth, canvasHeight, center, scale, bearing, pitch } = affineOptions;

		const fov = 70;
		const near = 0.1;
		const far = 1000;
	
		const radius = 1;
	
		const centerVec3 = vec3.fromValues(0, 0, 0);

		const cameraPosition = vec3.fromValues(
			2 / scale * Math.sin(center[0] * Math.PI / 180) * Math.cos(center[1] * Math.PI / 180),
			2 / scale * Math.sin(center[1] * Math.PI / 180),
			2 / scale * Math.cos(center[0] * Math.PI / 180) * Math.cos(center[1] * Math.PI / 180),
		);


		const projectionMatrix = mat4.create();
		mat4.perspective(projectionMatrix, fov, canvasWidth / canvasHeight, near, far);
	
		const viewMatrix = mat4.create();
		mat4.lookAt(viewMatrix, cameraPosition, centerVec3, [0, 1, 0]);
	
		const modelMatrix = mat4.create();
		mat4.scale(modelMatrix, modelMatrix, [radius, radius, radius]);
	
		const finalMatrix = mat4.create();
		mat4.multiply(finalMatrix, projectionMatrix, viewMatrix);
		mat4.multiply(finalMatrix, finalMatrix, modelMatrix);
	
		return new Float32Array(finalMatrix);
	}
}

export default BindGroup;