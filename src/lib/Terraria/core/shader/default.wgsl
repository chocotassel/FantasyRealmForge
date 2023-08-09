
@group(0) @binding(0) var<uniform> matrix: mat4x4<f32>;

const PI: f32 = 3.141592653589793;

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
    let mappedY = (y / f32(PI));

    return vec2<f32>(mappedX, mappedY);
}
@vertex
fn vs_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
    // var transformedPosition = matrix * vec4<f32>(position, 1.0, 0);
    var pos =  vec4<f32>(mercatorProjection(position), 0.0, 1.0);
    var transformedPosition = matrix * pos;
    return vec4<f32>(transformedPosition.xy, 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
    return vec4<f32>(1.0, 1.0, 1.0, 1.0);
}   
