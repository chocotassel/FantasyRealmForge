import React, { useRef, useEffect, useState } from 'react';
import earcut from 'earcut';


interface GeoJson {
  type: string;
  features: Feature[];
}

interface Feature {
  type: string;
  id: string;
  properties: Properties;
  geometry: Geometry;
}

interface Properties {
  name: string;
}

interface Geometry {
  type: string;
  coordinates: number[][][] | number[][][][];
}


// 画布组件
const MapCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<[number, number]>([0, 0]);
  // const [lastMousePosition, setLastMousePosition] = useState<[number, number] | null>(null);
  const lastMousePosition = useRef<[number, number] | null>(null);

  const [device, setDevice] = useState<GPUDevice | null>(null);
  const [verticesBuffer, setVerticesBuffer] = useState<GPUBuffer | null>(null);
  const [indicesBuffer, setIndicesBuffer] = useState<GPUBuffer | null>(null);
  const [pipeline, setPipeline] = useState<GPURenderPipeline | null>(null);
  const [indicesLength, setIndicesLength] = useState<number | null>(null);

  const projection = ([longitude, latitude]: number[]): [number, number] => {
    const x = (longitude + offset[0]) / 180 * scale;
    const y = (latitude + offset[1]) / 90 * scale;
    return [x, y];
  };

  // 初始化WebGPU
  const initializeWebGPU = async () => {
    const canvas = canvasRef.current;

    if (!canvas) {
      console.warn('Canvas element is not available yet.');
      return;
    }

    // 检查是否支持WebGPU
    if (!navigator.gpu) {
      throw new Error("WebGPU not supported on this browser.");
    }

    const adapter = await navigator.gpu.requestAdapter();

    if (!adapter) {
      throw new Error("No appropriate GPUAdapter found.");
    }
    const device = await adapter.requestDevice();
    setDevice(device);


    const ctx = canvas.getContext("webgpu");
    if (!ctx) {
      throw new Error("WebGPU context could not be created.");
    }
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({
      device: device,
      format: canvasFormat,
    });

    
    const cellShaderModule = device.createShaderModule({
      label: 'Cell shader',
      code: `
        // Vertex shader
        @vertex
        fn vs_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
            return vec4<f32>(position, 0.0, 1.0);
        }

        // Fragment shader
        @fragment
        fn fs_main() -> @location(0) vec4<f32> {
            return vec4<f32>(1.0, 1.0, 1.0, 1.0); 
        }
      `
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
          format: canvasFormat,
        }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
    setPipeline(pipeline);
  };



  // 从GeoJSON中获取顶点和索引数据
  const fetchGeoJson = async (): Promise<{vertices: Float32Array, indices: Uint16Array}> => {
    const response = await fetch('src/assets/data/world-geojson.json');
    const worldData: GeoJson = await response.json();
    const features = worldData.features;

    const vertices: number[] = [];
    const indices: number[] = [];

    let currentIndex = 0;
    features.forEach(({geometry}) => {
      if(geometry.type === 'MultiPolygon') {
        const coordinates = geometry.coordinates;
        if(coordinates) {
          (coordinates as number[][][][]).forEach((contours) => {
            contours.forEach((contour) => {
              const path = contour.flatMap(point => projection(point));
              vertices.push(...path);
              const pathIndices = earcut(path, [], 2);
              indices.push(...pathIndices.map(i => i + currentIndex));
              currentIndex += contour.length;
            });
          });
        }
      } else if(geometry.type === 'Polygon') {
        const contours = geometry.coordinates as number[][][];
        const path = contours[0].flatMap(point => projection(point));
        vertices.push(...path);
        const pathIndices = earcut(path, [], 2);
        indices.push(...pathIndices.map(i => i + currentIndex));
        currentIndex += contours[0].length;
      }
    });

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
    };
  };



  // 创建顶点和索引缓冲区
  const createBuffers = async () => {
    const { vertices, indices } = await fetchGeoJson();
    if (!device) {
      return;
    }
    
    const verticesBuffer = device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX,
      mappedAtCreation: true,
    });
    new Float32Array(verticesBuffer.getMappedRange()).set(vertices);
    verticesBuffer.unmap();
    setVerticesBuffer(verticesBuffer);

    const indicesBuffer = device.createBuffer({
      size: indices.byteLength,
      usage: GPUBufferUsage.INDEX,
      mappedAtCreation: true,
    });
    new Uint16Array(indicesBuffer.getMappedRange()).set(indices);
    indicesBuffer.unmap();
    setIndicesBuffer(indicesBuffer);
    setIndicesLength(indices.length);
  };



  // 执行绘制命令
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas || !device || !pipeline || !verticesBuffer || !indicesBuffer || indicesLength === null) {
      return;
    }
    const ctx = canvas.getContext("webgpu");
    if (!ctx) {
      throw new Error("WebGPU context could not be created.");
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
  };


  // 初始化WebGPU
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn('Canvas element is not available yet.');
      return;
    }
    initializeWebGPU();
  }, []);

  useEffect(() => {
    createBuffers();
  }, [device, offset, scale]);

  useEffect(() => {
    render();
  }, [device, verticesBuffer, indicesBuffer, pipeline, indicesLength]);




  // 鼠标事件
  // 滚轮
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      let newScale = scale * Math.pow(0.99, event.deltaY * 0.1);
      newScale = Math.min(Math.max(0.1, newScale), 10);
      setScale(newScale);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    }
  }, [scale]);

  // 拖拽
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    lastMousePosition.current = [event.clientX, event.clientY];
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
  };

  const handleMouseUp = (_event: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    lastMousePosition.current = null;
    canvas.removeEventListener('mouseup', handleMouseUp);
    canvas.removeEventListener('mousemove', handleMouseMove);
  };


  const handleMouseMove = (event: MouseEvent) => {
    if (!lastMousePosition.current) return;

    const dx = (event.clientX - lastMousePosition.current[0]) / window.innerWidth * 360 / scale;
    const dy = (event.clientY - lastMousePosition.current[1]) / window.innerHeight * 180 / scale;

    const newOffsetX = offset[0] + dx;
    const newOffsetY = offset[1] - dy;
  
    // 检查是否超出范围
    if (newOffsetY >= -90 && newOffsetY <= 90) {
      setOffset([newOffsetX, newOffsetY]);
    } else {
      setOffset([newOffsetX, offset[1]]);
    }
  };


  return (
    <canvas 
      ref={canvasRef} width="1024" height="512" style={{width: '100%', height: '100%'}} 
      onMouseDown={handleMouseDown}
    />
  );
};

export default MapCanvas;
