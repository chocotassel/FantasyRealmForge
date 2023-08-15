
@group(0) @binding(0) var<uniform> matrix: mat4x4<f32>;
@group(0) @binding(1) var<uniform> color: vec4<f32>;

struct VertexOutput {
    @builtin(position) fargCoord: vec4<f32>,
    @location(0) centerRadius: vec3<f32>,
}

@vertex
fn vs_main(@location(0) position: vec2<f32>) -> VertexOutput {
    var mat = mat3x3<f32>(
        matrix[0].x, matrix[1].x, matrix[2].x,
        matrix[0].y, matrix[1].y, matrix[2].y,
        matrix[0].z, matrix[1].z, matrix[2].z);
    var transformedPosition3 = mat * vec3<f32>(position, 1.0);
    var transformedPosition: vec2<f32> = transformedPosition3.xy;
    // return vec4<f32>(transformedPosition, 0.0, 1.0);
    return VertexOutput(vec4<f32>(transformedPosition, 0.0, 1.0), vec3<f32>(position, 0.0));
}

@fragment
fn fs_main(@builtin(position) fargCoord: vec4<f32>, @location(0) centerRadius: vec3<f32>) -> @location(0) vec4<f32> {
    let radius: f32 = 0.05;
    let distance = distance(fargCoord.xy, centerRadius.xy);

    if (distance < radius) {
        return vec4<f32>(0.0, 1.0, 0.0, 1.0);
    }
    return color;
}
