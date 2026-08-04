// ============================================================
// showcase-config.js — 全部文案、主题、模型与粒子参数统一管理
// 主题：国潮四季山水圆盘点云展陈（深色展览页）
// 模型：第二次精简.glb（Blender 5.2.39 导出，薄圆盘，主体面朝 ±X，
//       无 Draco；4 mesh / 约 381 万三角 / 2 张 4096² JPEG 贴图）
//       绕 Y 旋转 ±90° 把盘面转到 +Z 朝向相机，方向由截图验证决定
// 作者：Ligong-Wenchang  日期：2026-08-04
// ============================================================

export default {
  // ---- 展陈文案 ----
  categoryEn: "FOUR SEASONS MEDALLION",
  titleZh: "繁荣昌盛",
  aliasEn: "FAN RONG CHANG SHENG",
  introZh: "又称“四季山水圆盘”",
  introSubZh: "汉中福地茶业墙绘",
  bodyZh:
    "圆形满构图，中心“繁荣昌盛”四字作鎏金大字，外环以回纹边框。" +
    "四周环布四季山水：春山牡丹、宝塔祥云，秋山红枫、银杏点缀，" +
    "冬岭积雪、冰河蜿蜒，夏亭流水、青峰叠翠。" +
    "四季流转、生生不息，寄寓国泰民安、岁岁繁荣昌盛。",
  features: ["四季山水", "回纹边框", "鎏金大字"],
  // 色板取自参考照片(照片文件夹 fa59803c...jpg,工笔重彩浓艳风格):
  // 金色底 + 朱红(右上秋山红枫) + 黛蓝/浅蓝(左侧雪山冰河) + 青绿/深绿(底部夏景) + 米白(留白积雪)。
  // palette:页面"主要颜色"列表(8 个代表色)。
  // paletteRemap:粒子颜色重映射全色板(13 色,showcase.js 使用,含明暗层次)。
  palette: [
    { name: "鎏金", hex: "#E5A91F" },
    { name: "米金", hex: "#DCC89E" },
    { name: "朱红", hex: "#C0392B" },
    { name: "黛蓝", hex: "#2E4057" },
    { name: "浅蓝", hex: "#8FBCD4" },
    { name: "青绿", hex: "#8FA876" },
    { name: "赭石", hex: "#E67E22" },
    { name: "米白", hex: "#F5F0E1" },
  ],
  paletteRemap: [
    { name: "亮金", hex: "#E5A91F" },
    { name: "暗金", hex: "#C9A44E" },
    { name: "米金", hex: "#DCC89E" },
    { name: "朱红", hex: "#C0392B" },
    { name: "橙红", hex: "#D35400" },
    { name: "深红", hex: "#8E2A1E" },
    { name: "赭石", hex: "#E67E22" },
    { name: "棕褐", hex: "#8B5A2B" },
    { name: "黛蓝", hex: "#2E4057" },
    { name: "浅蓝", hex: "#8FBCD4" },
    { name: "青绿", hex: "#8FA876" },
    { name: "深绿", hex: "#314A2F" },
    { name: "米白", hex: "#F5F0E1" },
  ],
  craftTags: ["描金", "回纹", "工笔", "重彩"],

  // ---- 模型 ----
  // mode="data"：加载预采样粒子数据(assets/particles.bin，~4MB，秒开，GitHub Pages 部署用)
  // mode="glb" ：浏览器内加载 GLB 并采样(需 111MB 模型，开发/验证用)
  mode: "data",
  particleDataPath: "assets/particles.bin",
  modelPath: "assets/models/prosperity.glb",
  // 粒子数据 CDN 镜像:GitHub Pages 在国内网络下载 bin 极慢(实测 27-45KB/s,
  // 1.98MB 需 70s+),jsDelivr 国内节点 ~2s。15s 超时失败自动回退本地。
  // 用版本 tag(v1.1)而非 @master:不可变 URL 缓存永久生效,推送新 commit 不失效。
  cdnBase: "https://cdn.jsdelivr.net/gh/2188195028-crypto/medallion-pointcloud@v1.3/",
  // 参考照片(粒子取色源):模型贴图与照片四季布局不一致(照片左侧为黛蓝雪山、
  // 右上为朱红秋山,模型贴图缺失这些色域),按粒子盘面位置采样照片像素,
  // 保证渲染颜色布局与照片一致。照片 232KB,需随仓库入库(GitHub Pages)。
  photoPath: "assets/reference.jpg",
  // 照片圆盘几何(实测校准:照片 1290×1315,圆盘为正圆,中心 (640,630),半径 ~545;
  // 视觉模型定位 + 72 方向边界扫描交叉验证,采样时 ×0.97 内缩防采到白边)
  photoCenter: [640, 630],
  photoRadius: 540,
  // 新模型为薄圆盘、面朝 ±X。绕 Y 旋转 ±90° 把盘面转到 +Z 面向相机。
  // 初始取 -90°，浏览器截图验证正反面与上下方向后微调（可换 +π/2）。
  modelRotation: [0, -Math.PI / 2, 0],

  // ---- 主题 ----
  theme: {
    bg: "#101917",
    gold: "#DCA852",
    body: "#EFE6CF",
    bodySecondary: "rgba(239, 230, 207, 0.68)",
    bodySubtle: "rgba(239, 230, 207, 0.38)",
    accent: "#61B89F",
  },

  // ---- 时间线与粒子 ----
  duration: 10, // 秒，固定
  binParticleCount: 90000, // particles.bin 粒子数(与渲染数一致,加载校验用)
  particleCount: 90000, // 实际渲染粒子数(加载后均匀无放回抽取;6万偏稀,9万饱满且不杂乱)
  detailSamplingRatio: 0.15,

  // ---- 分辨率基准（1280×720）----
  referenceViewport: { width: 1280, height: 720 },
  referencePointSize: 1.35, // 1280×720 下基础粒子直径（CSS 逻辑像素）

  // ---- 整页布局连续缩放 ----
  layoutScaleMode: "min-scale", // min(vw/1280, vh/720)

  // ---- 参考文字尺寸（1280×720）----
  referenceTypography: {
    category: 20, // 英文类别
    title: 54, // 中文主标题
    alias: 22, // 英文别名
    intro: 26, // 中文引言
    body: 14, // 正文
    feature: 19, // 特征词
    label: 12, // 元数据标签
  },

  // ---- 参考文字布局（1280×720）----
  referenceTextLayout: {
    left: "7vw",
    top: "9.5vh",
    width: "32vw",
    bodyLineHeight: 1.9,
    gapTitle: 10, // 标题区内部间距（px，随 layoutScale 缩放）
    gapBlock: 26, // 区块间距（标题/正文/特征/元数据之间）
    bottomMargin: "6vw",
  },

  // ---- 舞台（相机与构图）----
  stage: {
    fov: 38,
    distance: 3.55, // 相机到模型的距离
    elevation: 0.42, // 相机仰角
    lookY: 0.05, // 注视点高度
    modelXFraction: 0.505, // 模型中心位于视口 ~72%（实测校准：0.22→57.6%、0.434→68.4%、0.64→78.9%，增益 0.507）
    modelHeightRatio: 0.82, // 模型高度占视口比例（78%-86% 区间）
    floatAmp: 0.03, // 上下浮动幅度
    rotationSpeed: 0.12, // Y 轴慢速旋转 rad/s
    enterSlide: 0.8, // 入场时从更右侧滑入的世界距离
    exitSlide: 0.9, // 退场向左下方退出的世界距离
    // 竖屏(手机)适配：模型居中、缩小并下移，文字区移至上端
    portraitScale: 0.55,
    portraitCenterY: -0.12,
    // 克制 Bloom：低强度 + 半分辨率采样，不吞回纹边框与山水纹饰
    bloomStrength: 0.18,
    bloomRadius: 0.5,
    bloomThreshold: 0.82,
    bloomResolution: 0.5,
  },

  // ---- 文字动画节奏 ----
  timeline: {
    bodyTypeStart: 1.55,
    typeRate: 28, // 字符/秒
    textInStart: 0.75,
    textInEnd: 1.7,
    textOutStart: 7.2,
    textOutEnd: 8.0,
    paletteIn: 2.75,
    featureIn: [3.25, 3.6, 3.95],
  },
};
