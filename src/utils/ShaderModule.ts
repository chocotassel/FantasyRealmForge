export class ShaderModule {
    constructor(private device: GPUDevice | null) {}

    createPipeline(): GPURenderPipeline {
        // Create pipeline...

        return pipeline;
    }
}
