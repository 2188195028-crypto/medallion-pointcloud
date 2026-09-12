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

  // ---- 落地实景(汉中福地茶业店面墙绘:滚动擦除前后对比) ----
  // 一对**同机位**照片:before 打底,after 叠在上层,由 --wipe-edge 控制横向揭示宽度。
  // 两张缩略图都保留:点「改造前」从 wipe=0 进门(空墙),点「落地后」从 wipe=1 进门,
  // 之后滚轮 / 上滑 / 方向键任意擦除。照片需随仓库入库(与 reference.jpg 同理)。
  realwall: {
    before: { path: "assets/wall-before.webp", caption: "改造前 · 店面原始墙面" },
    after: { path: "assets/wall-after.webp", caption: "落地后 · 上墙效果" },
    // 对齐补偿(**实测值,不是估算;不得凭感觉改**)——两张为手持拍摄,after 需放大
    // 并下移才与 before 咬合,否则擦除时线条会跳。首轮测量:梯度幅值图在 scale×offset
    // 网格上搜索,最优解 scale=1.015 / dx=0 / dy=8px(912×1148 基准),MAE 3.08→2.49。
    // dx=0(水平天然对齐)是横向擦除可行的前提;dy 折算为 before 高度的比例。
    //
    // **两个源图宽高比不同**(before 912×1148=1.2588,after 1000×1275=1.2750):
    // scale 定义在"after 渲染宽 / before 渲染宽"上,height:auto → after 整体等比缩放
    // 1.015(相对 before 宽度);相对 before **高度**的等效纵向比例是
    // 1.015×1.2750/1.2588 = 1.0281,这是宽高比差异的**结果**,不是额外拉伸。
    // 改 before/after 源图尺寸时这两个数会一起变,别只改 scale。
    //
    // 残余错位:硬接缝下横向腰线在接缝处仍有竖向错位(before 自身横线还有 ~1.9° 倾斜,
    // scale+offset 校不了旋转)。**羽化(见下)就是用来盖掉这段残余的**——去掉羽化或
    // 换 clip-path 会把它暴露成一条可见镶边。(实测那 1.9° 是量出来的;残余错位的
    // 具体像素数只有视觉模型给过 1-4px 的估计,该数字不可靠,只取"存在且方向偏纵向"。)
    // 2026-09-12 独立复测:梯度 MAE 全网格仅 7.118-7.145(±0.4%,不可分辨)、
    // SAD/1D 剖面/NCC 三种方法的最优解都钉在搜索边界 —— 该图对"涂装前后内容全变、
    // 无共同可追踪结构",**自动化方法无法独立确认也无法推翻本组数值**,故保持原值不动。
    align: {
      scale: 1.015,
      offsetYRatio: 8 / 1148, // = 0.00697
    },
    // 擦除边缘羽化带宽度(舞台宽度的比例)。用 mask 渐变而非 clip-path 的理由:
    // 货架边缘残留 2-3px 错位镶边,只有羽化能把它藏掉。
    feather: 0.06,
    // 滚轮灵敏度:每 1px deltaY 推进的揭示进度(一格滚轮 ≈ deltaY 100 → 约 0.18)
    wheelStep: 0.0018,
    // 触摸:整段滑动距离 = 视口高度的这个比例时,推进满进度
    touchDistance: 0.5,
  },

  // ---- 模型 ----
  // mode="data"：加载预采样粒子数据(assets/particles.bin，1.98MB/90000 粒子，秒开，GitHub Pages 部署用)
  // mode="glb" ：浏览器内加载 GLB 并采样(需 111MB 模型，开发/验证用)
  mode: "data",
  particleDataPath: "assets/particles.bin",
  modelPath: "assets/models/prosperity.glb",
  // 粒子数据 CDN 镜像:GitHub Pages 在国内网络下载 bin 极慢(实测 27-45KB/s,
  // 1.98MB 需 70s+),jsDelivr 国内节点 ~2s。15s 超时失败自动回退本地。
  // 用版本 tag(v1.1)而非 @master:不可变 URL 缓存永久生效,推送新 commit 不失效。
  //
  // **必须是 gcore 镜像,不能改回 cdn.jsdelivr.net**(2026-09-12 实测):jsDelivr 自
  // 2024 年起把**图片类**资源 301 重定向到 raw.githubusercontent.com(jsdelivr#18420),
  // 国内大概率不可达;而 cdnBase 同时供 reference.jpg 和两张实景 webp 使用。301 是
  // 恒定的,能否拿到图取决于 raw 域名可达性(国内时通时断)。后果实测:
  // ① file:// 双击照片取色**大概率失效**——raw 慢/不通时回退本地,而本地回退的 img
  //    带 crossOrigin="anonymous",撞 file:// 的 null origin CORS 被拦,粒子静默退回
  //    色板重映射(颜色布局就错了);
  // ② 该 CDN 图片请求在国内不是快速失败而是**挂起 >60s**,只靠 8s 兜底救回,线上首屏
  //    因此白等 8s(实测桌面 11.9s vs 手机 4.8s 的差就是这个)。
  // gcore 镜像不参与该重定向:实测 200 + ACAO:* + crossOrigin 取色可用(1.5s)。
  // three 模块仍走 cdn.jsdelivr.net(URL 写在 index.html importmap 里),那是 .js,
  // 不受图片重定向影响,**不要为了"统一主机"把它们一起改过来或把这里改回去**。
  cdnBase: "https://gcore.jsdelivr.net/gh/2188195028-crypto/medallion-pointcloud@v1.9/",
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

  // ---- 粒子 ----
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
  // top 7vh 为 v1.7 收容值:9.5vh 时静止态 meta 压入底栏(独立审核实测 5 档桌面视口),
  // 收容后逐档收紧至此——底部空距最大的一档仍有 ≥10px 余量
  referenceTextLayout: {
    left: "7vw",
    top: "7vh",
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

  // ---- 文字动画节奏(纯交互模式) ----
  // 曾含 10s 时间线的 textIn/textOut/paletteIn/featureIn 等字段,改版后未用已清理;
  // 文本淡入延迟现在直接内联在 showcase.js(0.9s 起依次入场)
  timeline: {
    typeRate: 28, // 字符/秒
  },
};
