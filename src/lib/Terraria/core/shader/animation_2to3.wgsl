
@group(0) @binding(0) var<uniform> matrix: mat4x4<f32>;
@group(0) @binding(1) var<uniform> progress: f32; // progress 取值范围 [0, 1]，0 表示完全展开，1 表示完全3D

const PI: f32 = 3.141592653589793;

fn equidistantCylindricalProjection(longitude: f32, latitude: f32, R: f32, lambda0: f32, phi0: f32) -> vec2<f32> {
    let lambdaRad = (longitude - lambda0) * PI / 180.0;
    let phiRad = (latitude - phi0) * PI / 180.0;

    let x = R * lambdaRad;
    let y = R * phiRad;

    return vec2<f32>(x, y);
}

@vertex
fn vs_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
    // 计算3D位置
    let position3D = vec4<f32>(
        sin(position.x * PI / 180.0) * cos(position.y * PI / 180.0), 
        sin(position.y * PI / 180.0),
        cos(position.x * PI / 180.0) * cos(position.y * PI / 180.0), 
        1.0
    );

    let transformedPosition3D = matrix * position3D;

    // 计算2D位置
    var pos =  vec4<f32>(equidistantCylindricalProjection(position.x, position.y, 1, 0, 0), 0.0, 1.0);
    var transformedPosition2D = matrix * pos;

    // 根据进度插值
    let finalPosition = mix(transformedPosition2D, transformedPosition3D, progress);

    return finalPosition;
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
    return vec4<f32>(1.0, 1.0, 1.0, 1.0);
}