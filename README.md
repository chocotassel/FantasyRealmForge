# 地图生成器

map render engine -- Terraria
map create engine -- Stacia



## 1. 数据

### 1.1 数据类型

1. **地理数据**：
   - 地貌（Geography）：陆地、海洋
   - 地形特征（Landforms）：山脉、河流、湖泊、沙漠等。
   - 政治边界（Political）：国家、省/州、城市等的边界。
   - 道路和交通（Transportation）：公路、铁路、机场、港口等。
   - 土地利用（Landuse）：农田、森林、城市地区等。
   - 建筑物（Buildings）：房屋、商业区、学校、医院等。
2. **气候和环境数据**：
   - 气候区域：温度（Temperature）、湿度（Humidity）、降雨量（Rainfall）等。
   - 气候类型（Climate）：热带雨林气候、季风气候、热带大草原气候等。
   - 植被类型（Vegetation）：亚热带常绿阔叶林带、温带落叶阔叶林带等。
3. **人口和社会经济数据**：
   - 人口分布：人口密度（Population）、年龄（Age）、性别分布（Gender）等。
   - 经济指标：GDP、收入（Income）、就业率等。
   - 教育和卫生：学校分布（Education）、医疗设施（Medical）等。
   - 文化和宗教：语言（Languages）、信仰（Beliefs）等。
4. **其他特定用途的数据**：
   - 健康和疾病：疾病分布（Disease）、医疗资源等。
   - 法律和治安：犯罪率（Crime）、法院分布等。
   - 科研和调查：地质调查、植物分布等。

### 1.2 GeoJSON

1. **`Point`**：一个2D坐标（例如，[经度，纬度]）。1维数组，包含2个元素。
2. **`MultiPoint`**：多个点的集合。2维数组，每个子数组都是一个2D坐标。
3. **`LineString`**：由两个或多个点组成的线。2维数组，每个子数组都是一个2D坐标。
4. **`MultiLineString`**：多个线段的集合。3维数组，每个子数组都是一个2维的线段。
5. **`Polygon`**：由三个或多个点组成的封闭环。3维数组，每个子数组都是一个2维的环。
6. **`MultiPolygon`**：多个多边形的集合。4维数组，每个子数组都是一个3维的多边形。
7. **`GeometryCollection`**：包含任何类型几何体的集合。它不是一个固定维度的数组，而是一个对象，其中包括多个不同类型的几何体。

- 自定义：使用 `Polygon` 和 `MultiPolygon` 的第三维度来表示等高线。在 GeoJSON 标准中，`Polygon` 类型的第三维度通常用于表示洞口或内部边界，但您可以通过扩展这个维度来表示等高线或其他地形特征。

```json
// 主体
{
  "type": "FeatureCollection",
  "properties": { 
    "description": "This dataset contains terrain and national boundaries.",
    "type": "terrain",
    "resolution": "high", // flat
    "source": "National Geographic Agency",
    // 其他自定义属性...
  },
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [102.0, 0.5]
      },
      "properties": {
        "prop0": "value0"
      }
    },
    // 其他 Feature 对象...
  ]
}

{
  "type": "GeometryCollection",
  "geometries": [
    {
      "type": "Point",
      "coordinates": [100.0, 0.0]
    },
    {
      "type": "LineString",
      "coordinates": [[101.0, 0.0], [102.0, 1.0]]
    }
    // 其他几何体...
  ]
}

{
  "type": "Polygon",
  "coordinates": [
    [ [100, 0], [101, 0], [101, 1], [100, 1], [100, 0] ],  // 外部边界
    [ [100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2] ],  // 等高线1
    [ [100.4, 0.4], [100.6, 0.4], [100.6, 0.6], [100.4, 0.6], [100.4, 0.4] ]  // 等高线2
  ]
}

{
  "type": "MultiPolygon",
  "coordinates": [
    [
      [ [100, 0], [101, 0], [101, 1], [100, 1], [100, 0] ],  // 外部边界
      [ [100.2, 0.2], [100.8, 0.2], [100.8, 0.8], [100.2, 0.8], [100.2, 0.2] ]  // 等高线
    ],
    [
      [ [102, 0], [103, 0], [103, 1], [102, 1], [102, 0] ],  // 外部边界
      [ [102.2, 0.2], [102.8, 0.2], [102.8, 0.8], [102.2, 0.8], [102.2, 0.2] ]  // 等高线
    ]
  ]
}

```

### 1.3 图层 layer

1. **地貌（Physical Geography）图层**：
   - 陆地和海洋可以通过不同的颜色或纹理填充来表示。
2. **地形特征（Landforms or Topographical Features）图层**：
   - 山脉、河流、湖泊和沙漠可以通过线或面几何形状来表示，使用不同的符号、颜色和线型。
3. **政治边界（Political Boundaries）图层**：
   - 国家、省/州、城市等的边界可以用线或面来表示。
4. **道路和交通（Roads and Transportation）图层**：
   - 公路、铁路、机场、港口等可以通过特定的符号和线型来表示。
5. **土地利用（Land Use）图层**：
   - 农田、森林、城市地区等可以使用面几何形状，并通过不同的颜色和纹理来区分。
6. **建筑物（Buildings）图层**：
   - 房屋、商业区、学校、医院等可以通过点或面符号来表示。
7. **气候和环境数据（Climate and Environmental Data）图层**：
   - 温度、湿度、降雨量等可以通过等值线、颜色渐变或热力图来表示。
8. **人口和社会经济数据（Population and Socio-Economic Data）图层**：
   - 人口密度、经济指标等可以通过颜色渐变、符号大小或柱状图来表示。
9. **其他特定用途的数据（Other Specific Purpose Data）图层**：
   - 疾病分布、犯罪率等可以通过点、线、面符号，以及颜色、大小和形状来表示。



1. **自然资源图层**：
   - 矿产分布、渔业资源等。可以用点、线、面来表示不同类型和丰度的资源。
2. **气象图层**：
   - 风向、风力、气压等。可以用箭头符号和颜色渐变来表示。
3. **地质图层**：
   - 地震带、火山、岩层等。可以用线、点和不同颜色的面符号来表示。
4. **生态图层**：
   - 保护区、濒危物种分布等。可以用不同形状和颜色的面和点符号来表示。
5. **魔法和传说图层（如果适用于架空世界）**：
   - 魔法能量场、传说生物出没地等。可以用特殊符号和颜色来表示。
6. **历史和文化遗址图层**：
   - 古城堡、遗迹、纪念碑等。可以用特殊的点符号来表示。
7. **战略和军事图层**：
   - 要塞、军事基地等。可以用特殊的符号和颜色来表示。
8. **星象和天文图层**：
   - 星座、行星轨迹等。可以用点和线来表示，也可以用其他的空间数据格式来存储和处理三维数据。
9. **水文图层**：
   - 水温、洋流、潮汐等。可以用线和颜色渐变来表示。

```json
// 等高线层
{
    "type": "Geography",
    "source": GeoJSON,
    "properties": {
        "resolution": "high",
        "contour_interval": 50
    },
    "data": [
        {   // 单个等高面上的所有等高线
            color,
            vertices,
            indices
        },
        {
            color,
            vertices,
            indices
        }
    ]
}

// 政治边界层
{
    "type": "Politics",
    "source": GeoJSON,
    "properties": {
        "resolution": "flat"
    },
    "data": [
        {   // 国家、地区边界（只有一层，面）
            color,
            vertices,
            indices
        }
    ]
}

// 地形特征层
{
    "type": "Buildings",
    "source": GeoJSON,
    "properties": {
        "resolution": "flat"
    },
    "data": [
        {	// 河流
            color,
            vertices,
            indices
        },
        {   // 湖泊
            color,
            vertices,
            indices
        }
    ]
}

// 建筑物层
{
    "type": "Landforms",
    "source": GeoJSON,
    "properties": {
        "resolution": "flat"
    },
    "data": [
        {	// 医院
            color,
            vertices,
            indices
        },
        {   // 政府
            color,
            vertices,
            indices
        }
    ]
}
```

