
@group(0) @binding(0) var<uniform> matrix: mat4x4<f32>;

@vertex
fn vs_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
    var mat = mat3x3<f32>(
        matrix[0].x, matrix[1].x, matrix[2].x,
        matrix[0].y, matrix[1].y, matrix[2].y,
        matrix[0].z, matrix[1].z, matrix[2].z);
    var transformedPosition3 = mat * vec3<f32>(position, 1.0);
    var transformedPosition: vec2<f32> = transformedPosition3.xy;
    return vec4<f32>(transformedPosition, 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
    return vec4<f32>(1.0, 1.0, 1.0, 1.0);
}