
@group(0) @binding(0) var<uniform> matrix: mat4x4<f32>;
@group(0) @binding(1) var<uniform> progress: f32; // progress 取值范围 [0, 1]，0 表示完全展开，1 表示完全3D

@vertex
fn vs_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
    // 计算3D位置
    let position3D = vec4<f32>(
        sin(position.x * 3.14159265 / 180.0) * cos(position.y * 3.14159265 / 180.0), 
        sin(position.y * 3.14159265 / 180.0),
        cos(position.x * 3.14159265 / 180.0) * cos(position.y * 3.14159265 / 180.0), 
        1.0
    );
    let transformedPosition3D = matrix * position3D;

    // 计算2D位置
    var mat = mat3x3<f32>(
        matrix[0].x, matrix[1].x, matrix[2].x,
        matrix[0].y, matrix[1].y, matrix[2].y,
        matrix[0].z, matrix[1].z, matrix[2].z);
    var transformedPosition2D3 = mat * vec3<f32>(position, 1.0);
    let transformedPosition2D = vec4<f32>(transformedPosition2D3.xy, 0.0, 1.0);

    // 根据进度插值
    let finalPosition = mix(transformedPosition3D, transformedPosition2D, progress);

    return finalPosition;
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
    return vec4<f32>(1.0, 1.0, 1.0, 1.0);
}