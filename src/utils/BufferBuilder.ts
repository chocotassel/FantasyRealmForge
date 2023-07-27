export class BufferBuilder {
    constructor(private device: GPUDevice | null) {
        if (!device) {
            throw new Error('Device is null!');
        }

        this.device = device;
    }


  // 创建顶点和索引缓冲区
    createBuffers(verticesAndIndices: {vertices: Float32Array, indices: Uint16Array}): {verticesBuffer: GPUBuffer, indicesBuffer: GPUBuffer, indicesLength: number} {
        if (!this.device) {
            throw new Error('Device is null!');
        }

        const { vertices, indices } = verticesAndIndices;
        const verticesBuffer = this.device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
        new Float32Array(verticesBuffer.getMappedRange()).set(vertices);
        verticesBuffer.unmap();

        const indicesBuffer = this.device.createBuffer({
            size: indices.byteLength,
            usage: GPUBufferUsage.INDEX,
            mappedAtCreation: true,
        });
        new Uint16Array(indicesBuffer.getMappedRange()).set(indices);
        indicesBuffer.unmap();

        const indicesLength = indices.length;

        return { verticesBuffer, indicesBuffer, indicesLength };
    }
}
