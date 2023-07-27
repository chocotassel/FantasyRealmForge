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

// Component: MapCanvas
const MapCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<[number, number]>([0, 0]);

  const projection = ([longitude, latitude]: number[]): [number, number] => {
    const x = (longitude + offset[0]) / 180 * scale;
    const y = (latitude + offset[1]) / 90 * scale;
    return [x, y];
  };

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      console.warn('Canvas element is not available yet.');
      return;
    }

    const initializeWebGPU = async () => {
      // Check for WebGPU support
      if (!navigator.gpu) {
        throw new Error("WebGPU not supported on this browser.");
      }
  
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        throw new Error("No appropriate GPUAdapter found.");
      }
  
      const device = await adapter.requestDevice();
  
      const ctx = canvas.getContext("webgpu");
      if (!ctx) {
        throw new Error("WebGPU context could not be created.");
      }
      const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
      ctx.configure({
        device: device,
        format: canvasFormat,
      });


      // 获取顶点和索引数据
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


      // cell shader
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
      

      // 通过异步函数启动程序
      (async function main() {

        // 获取顶点和索引数据
        const { vertices, indices } = await fetchGeoJson();
        

        // 创建顶点缓冲区
        const verticesBuffer = device.createBuffer({
          size: vertices.byteLength,
          usage: GPUBufferUsage.VERTEX,
          mappedAtCreation: true,
        });
        new Float32Array(verticesBuffer.getMappedRange()).set(vertices);
        verticesBuffer.unmap();

        // 创建索引缓冲区
        const indicesBuffer = device.createBuffer({
          size: indices.byteLength,
          usage: GPUBufferUsage.INDEX,
          mappedAtCreation: true,
        });
        new Uint16Array(indicesBuffer.getMappedRange()).set(indices);
        indicesBuffer.unmap();


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
        renderPass.drawIndexed(indices.length);
        renderPass.end();

        // 提交命令
        device.queue.submit([commandEncoder.finish()]);
      })();
    };

    initializeWebGPU();
  }, []);



  
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      console.warn('Canvas element is not available yet.');
      return;
    }

    // Handle mouse wheel scroll for zooming
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      let newScale = scale - event.deltaY * 0.01;
      // Limit the scale within a range
      newScale = Math.min(Math.max(0.1, newScale), 10);
      setScale(newScale);
    };

    // Handle mouse drag for panning
    let isDragging = false;
    let lastMousePosition: [number, number] | null = null;

    const handleMouseDown = (event: MouseEvent) => {
      isDragging = true;
      lastMousePosition = [event.clientX, event.clientY];
    };

    const handleMouseUp = () => {
      isDragging = false;
      lastMousePosition = null;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging || !lastMousePosition) {
        return;
      }

      const dx = event.clientX - lastMousePosition[0];
      const dy = event.clientY - lastMousePosition[1];
      setOffset([offset[0] - dx, offset[1] - dy]);
      lastMousePosition = [event.clientX, event.clientY];
    };

    canvas.addEventListener('wheel', handleWheel);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [offset, scale]);
  

  return (
    <canvas ref={canvasRef} width="1024" height="512" style={{width: '100%', height: '100%'}} />
  );
};

export default MapCanvas;
