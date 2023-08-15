
@group(0) @binding(0) var<uniform> matrix: mat4x4<f32>;
@group(0) @binding(1) var<uniform> color: vec4<f32>;
// @group(0) @binding(1) var<uniform> center: vec2<f32>;

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
    let mappedY = (y / f32(PI)) * 2.0;

    return vec2<f32>(mappedX, mappedY);
}

fn equidistantCylindricalProjection(longitude: f32, latitude: f32, R: f32, lambda0: f32, phi0: f32) -> vec2<f32> {
    let lambdaRad = radians(longitude - lambda0);
    let phiRad = radians(latitude - phi0);

    let x = R * lambdaRad;
    let y = R * phiRad;

    return vec2<f32>(x, y);
}

fn obliqueCylindricalProjection(longitude: f32, latitude: f32, R: f32, tiltLongitude: f32, tiltLatitude: f32) -> vec2<f32> {
    var lon = radians(longitude) - tiltLongitude;
    var lat = radians(latitude);

    let x = R * cos(tiltLatitude) * lon;
    let y = R * (sin(tiltLatitude) * sin(lat) + cos(tiltLatitude) * cos(lat));

    return vec2<f32>(x, y);
}


const center: vec2<f32> = vec2<f32>(0.0, 0.0);

// 经纬度转笛卡尔坐标
fn latLongToCartesian(latLong: vec2<f32>) -> vec3<f32> {
  let latitude: f32 = radians(latLong.y);
  let longitude: f32 = radians(latLong.x);
  let x: f32 = cos(latitude) * cos(longitude);
  let y: f32 = cos(latitude) * sin(longitude);
  let z: f32 = sin(latitude);
  return vec3(x, y, z);
}

// 笛卡尔坐标转经纬度
fn cartesianToLatLong(cartesian: vec3<f32>) -> vec2<f32> {
  let longitude: f32 = atan2(cartesian.y, cartesian.x);
  let latitude: f32 = asin(cartesian.z);
  return vec2(degrees(longitude), degrees(latitude));
}

// 旋转函数
fn rotate(cartesian: vec3<f32>, center: vec2<f32>) -> vec3<f32> {
  let yRotation: mat3x3<f32> = mat3x3<f32>(
    cos(radians(center.x)), 0.0, sin(radians(center.x)),
    0.0, 1.0, 0.0,
    -sin(radians(center.x)), 0.0, cos(radians(center.x))
  );
  
  let xRotation: mat3x3<f32> = mat3x3<f32>(
    1.0, 0.0, 0.0,
    0.0, cos(radians(center.y)), -sin(radians(center.y)),
    0.0, sin(radians(center.y)), cos(radians(center.y))
  );
  
  return yRotation * xRotation * cartesian;
}
fn transform(position: vec2<f32>) -> vec2<f32> {
  var pos: vec3<f32> = latLongToCartesian(position); // 转换为笛卡尔坐标
  pos = rotate(pos, center); // 沿y轴旋转center.x度，再沿x轴旋转center.y度
  let finalPos: vec2<f32> = cartesianToLatLong(pos); // 转换回经纬度坐标

  return finalPos;
}

@vertex
fn vs_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
    // 返回新坐标作为位置
    // var lonlat =  mercatorProjection(transform(position));
    // var pos = vec4<f32>(lonlat.xy, 1 - sqrt(lonlat.x * lonlat.x + lonlat.y * lonlat.y), 1.0);
    var pos =  vec4<f32>(mercatorProjection(position), 0.0, 1.0);
    // var pos =  vec4<f32>(equidistantCylindricalProjection(position.x, position.y, 1, 0, 0), 0.0, 1.0);
    // var pos =  vec4<f32>(obliqueCylindricalProjection(position.x, position.y, 1, 0, 0), 0.0, 1.0);
    var transformedPosition = matrix * pos;

    return vec4<f32>(transformedPosition.xy, 0.0, 1.0);
}


@fragment
fn fs_main() -> @location(0) vec4<f32> {
    return color;
}   
