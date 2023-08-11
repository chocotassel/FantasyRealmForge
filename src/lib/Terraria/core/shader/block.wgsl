
@group(0) @binding(0) var<uniform> matrix: mat4x4<f32>;

const PI: f32 = 3.141592653589793;

@vertex
fn vs_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
    let position3D = vec4<f32>(
        sin(position.x * PI / 180.0) * cos(position.y * PI / 180.0), 
        sin(position.y * PI / 180.0),
        cos(position.x * PI / 180.0) * cos(position.y * PI / 180.0), 
        1.0
    );

    let transformedPosition = matrix * position3D;

    return transformedPosition;
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
    return vec4<f32>(0.0, 0.0, 1.0, 1.0);
}