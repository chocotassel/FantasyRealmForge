
@group(0) @binding(0) var<uniform> matrix3: mat4x4<f32>;
@group(0) @binding(1) var<uniform> matrix2: mat4x4<f32>;
@group(0) @binding(2) var<uniform> progress: f32; // progress 取值范围 [0, 1]，0 表示完全展开，1 表示完全3D

const PI: f32 = 3.141592653589793;

fn equidistantCylindricalProjection(longitude: f32, latitude: f32, R: f32, lambda0: f32, phi0: f32) -> vec2<f32> {
    let lambdaRad = (longitude - lambda0) * PI / 180.0;
    let phiRad = (latitude - phi0) * PI / 180.0;

    let x = R * lambdaRad;
    let y = R * phiRad;

    return vec2<f32>(x, y);
}

fn mercatorProjection(coord : vec2<f32>) -> vec2<f32> {
    let longitude = coord.x;
    let latitude = coord.y;

    // 将角度转换为弧度
    let lonRad = radians(longitude);
    let latRad = radians(latitude);

    // 使用墨卡托投影公式进行转换
    let x = lonRad;
    let y = log(tan(0.25 * f32(PI) + 0.5 * latRad));

    let mappedX = (x / f32(PI)) * 2.0;
    let mappedY = (y / f32(PI)) * 2.0;

    return vec2<f32>(mappedX, mappedY);
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

    let transformedPosition3D = matrix3 * position3D;

    // 计算2D位置
    // var pos =  vec4<f32>(equidistantCylindricalProjection(position.x, position.y, 1, 0, 0), 0.0, 1.0);
    var pos = vec4<f32>(mercatorProjection(position), 0.0, 1.0);
    var transformedPosition2D = matrix2 * pos;

    // 根据进度插值
    let finalPosition = mix(transformedPosition3D, transformedPosition2D, progress);

    return finalPosition;
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
    return vec4<f32>(1.0, 1.0, 1.0, 1.0);
}