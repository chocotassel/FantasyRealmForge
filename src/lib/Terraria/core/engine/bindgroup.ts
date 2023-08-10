import { vec3, mat4 } from "gl-matrix";
import { AffineOptions } from "../../types";


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
		if (style === "3d" || style === "3d-2d" || style === "2d-3d") {
			return this.calculateAffineMatrix3d(affineOptions);
		} else {
			return this.calculateAffineMatrix(affineOptions);
		}
	}


    static mercatorProjection(longitude: number, latitude: number): [number, number] {
        // 首先将经度和纬度转换为弧度
        const lonRad = (Math.PI / 180) * longitude;
        const latRad = (Math.PI / 180) * latitude;
      
        // 使用墨卡托投影公式进行转换
        const x = lonRad;
        const y = Math.log(Math.tan((Math.PI / 4) + (latRad / 2)));
      
        // 将原始的范围-π, π; -∞, +∞映射到-2, 2; -1, 1
        const mappedX = (x / Math.PI);
        const mappedY = (y / Math.PI); // 注意: y的范围在极限情况下是-∞, +∞，通常的纬度范围不会达到这些极值
      
        return [mappedX, mappedY];
	}

	static equidistantCylindricalProjection(longitude: number, latitude: number, R: number = 1, lambda0: number = 0, phi0: number = 0): [number, number] {
		const lambdaRad = (longitude - lambda0) * (Math.PI / 180);
		const phiRad = (latitude - phi0) * (Math.PI / 180);
	
		const x = R * lambdaRad;
		const y = R * phiRad;
	
		return [x, y];
	}
	


	// 计算仿射矩阵
	static calculateAffineMatrix(
        affineOptions: AffineOptions
	): Float32Array {
        const { canvasWidth, canvasHeight, center, scale, bearing } = affineOptions;
		// 计算画布的宽高比，并找到适合2:1宽高比的缩放因子
		const aspectRatio = canvasWidth / canvasHeight;
		// let scaleX, scaleY;
		// if (aspectRatio >= this.targetAspectRatio) {
		// 	// 如果画布宽高比大于或等于2:1，则按高度缩放
		// 	scaleX = scale / 180;
		// 	scaleY = aspectRatio / this.targetAspectRatio * scale / 90;
		// } else {
		// 	// 如果画布宽高比小于2:1，则按宽度缩放
		// 	scaleX = this.targetAspectRatio / aspectRatio * scale / 180;
		// 	scaleY = scale / 90;
		// }

		// // 计算旋转角的余弦和正弦值
		// const cosBearing = Math.cos(bearing);
		// const sinBearing = Math.sin(bearing);
	
		// // // 计算俯仰角的余弦和正弦值
		// // const cosPitch = Math.cos(pitch);
		// // const sinPitch = Math.sin(pitch);
		
		// // 计算偏移量
		// const offsetX = -center[0]
		// const offsetY = -center[1]
		
	
		// // 构造仿射矩阵
		// const matrix = mat4.fromValues(
		// 	scaleX * cosBearing, -scaleX * sinBearing, 0, 0,
		// 	scaleY * sinBearing, scaleY * cosBearing, 0, 0,
		// 	offsetX, offsetY, 1, 0,
		// 	0, 0, 0, 0
		// );
        // return new Float32Array(matrix);

        const pos = this.equidistantCylindricalProjection(-center[0], -center[1]);
        

        // 正交投影
        const outMatrix = mat4.create();
        mat4.translate(outMatrix, outMatrix, [pos[0], pos[1], 1]);
        mat4.scale(outMatrix, outMatrix, [scale / aspectRatio , scale, 1]);
        mat4.rotate(outMatrix, outMatrix, bearing, [0, 0, 1]);

        return new Float32Array(outMatrix);
	}




    // 计算仿射矩阵 3d
	static calculateAffineMatrix3d(
        affineOptions: AffineOptions
	): Float32Array {
        const { canvasWidth, canvasHeight, center, scale } = affineOptions;

		const fov = 70 * Math.PI / 180;
		const near = 0.0001;
		const far = 10000;
	
		const radius = 1;
	
		const centerVec3 = vec3.fromValues(0, 0, 0);

        // 相机位置
		const cameraPosition = vec3.fromValues(
			1 / scale * Math.sin(center[0] * Math.PI / 180) * Math.cos(center[1] * Math.PI / 180),
			1 / scale * Math.sin(center[1] * Math.PI / 180),
			1 / scale * Math.cos(center[0] * Math.PI / 180) * Math.cos(center[1] * Math.PI / 180),
		);
	
        // 投影矩阵
		const projectionMatrix = mat4.create();
		mat4.perspective(projectionMatrix, fov, canvasWidth / canvasHeight, near, far);
	
        // 视图矩阵
		const viewMatrix = mat4.create();
		mat4.lookAt(viewMatrix, cameraPosition, centerVec3, [0, 1, 0]);
	
        // 模型矩阵
		const modelMatrix = mat4.create();
		mat4.scale(modelMatrix, modelMatrix, [radius, radius, radius]);
	

		const finalMatrix = mat4.create();
		mat4.multiply(finalMatrix, projectionMatrix, viewMatrix);
		mat4.multiply(finalMatrix, finalMatrix, modelMatrix);
	
		return new Float32Array(finalMatrix);
	}
}

export default BindGroup;