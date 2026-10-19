// ============================================================
// showcase-config.js — 全部文案、主题、模型与粒子参数统一管理
// 主题：国潮四季山水圆盘点云展陈（墨夜点云首幕 / 宣纸展墙 / 暖灰纸档案页 / 米白同机位对比）
// 模型：第二次精简.glb（Blender 5.2.39 导出，薄圆盘，主体面朝 ±X，
//       无 Draco；4 mesh / 约 381 万三角 / 2 张 4096² JPEG 贴图）
//       绕 Y 旋转 ±90° 把盘面转到 +Z 朝向相机，方向由截图验证决定
// 作者：Ligong-Wenchang  日期：2026-10-18
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

  // ---- 落地实景（汉中福地茶业店面墙绘） ----
  // 页面结构：首幕点云 → 落地实景分栏 → 项目档案（前期规划/材料工序）→ 同机位对比。
  // 照片需随仓库入库（与 reference.jpg 同理）。
  realwall: {
    before: { path: "assets/wall-before.webp", caption: "改造前 · 店面原始墙面" },
    after: { path: "assets/wall-after.webp", caption: "落地后 · 上墙效果" },

    // 第二幕：编辑式分栏（左文右图）
    // 标题逐行拆开，每行独立做 blur(8px)→0 与 32px 上移动画；
    // 文案由 showcase.js 注入，改文案改这里。
    feature: {
      kicker: "02 · 落地实景",
      titleLines: ["九万颗粒子，", "落在一面墙上"],
      lead:
        "汉中福地茶业的店面，茶柜之间原本是一面白墙。" +
        "圆盘画上去以后，四季山水成了进店第一眼看到的东西。",
      facts: [
        { label: "客户", value: "汉中福地茶业" },
        { label: "位置", value: "店面茶柜之间" },
        { label: "形式", value: "墙面彩绘" },
        { label: "状态", value: "已上墙" },
      ],
      cta: "看项目档案",
      caption: "改造后 · 汉中福地茶业店面",
    },

    // 项目档案：前期规划 + 施工材料与工序。
    // 这是一个小体量商业墙绘；数字只用用户确认的三项（2026-10-18：
    // 圆盘直径 2m、现场 7 天、现场 4 人），面积、材料用量等仍未核实，不写。
    dossier: {
      kicker: "03 · 项目档案",
      titleLines: ["一面墙的", "前期与施工"],
      lead:
        "这是个小体量的商业墙绘：一面墙、一个圆盘、一次现场施工。规模不大，流程没有省。" +
        "先定墙面与观看关系，再出等比稿，最后上墙。",
      stats: [
        { value: "2", unit: "m", label: "圆盘直径" },
        { value: "7", unit: "天", label: "现场工期" },
        { value: "4", unit: "人", label: "现场人数" },
      ],
      planTitle: "前期规划",
      steps: [
        {
          title: "现场勘测",
          text:
            "量墙面，记下茶柜位置、室内光线和进店的第一眼落点，" +
            "确定圆盘的观看距离与中心高度。",
        },
        {
          title: "构图定稿",
          text:
            "把四季山水、回纹边框和「繁荣昌盛」四字收进圆形构图，" +
            "先定黑白灰关系，再排工笔重彩的色序。",
        },
        {
          title: "等比放大",
          text:
            "按墙面实际尺寸出等比稿，分格定位，" +
            "核对圆盘边缘与茶柜、踢脚线之间的留白。",
        },
        {
          title: "现场绘制",
          text:
            "起稿、铺底色、分遍罩染，山水与花木逐层加深，" +
            "最后用金线收住回纹和中心四字。",
        },
        {
          title: "收尾验收",
          text:
            "远看整体气势，近看线条与金边；避开营业高峰分段施工，" +
            "完成后做表面保护。",
        },
      ],
      ledgerTitle: "施工材料与工序",
      materials: [
        { label: "基层", value: "墙面找平、清洁、底漆封闭" },
        { label: "起稿", value: "等比稿分格，墨线定位" },
        { label: "设色", value: "工笔重彩，分遍罩染" },
        { label: "金色", value: "描金收边，回纹与中心四字" },
        { label: "保护", value: "表面罩面，防潮可擦拭" },
        { label: "现场", value: "避开营业高峰，分段施工" },
      ],
      note: "体量小，按完整流程做。",
      cta: "看同一机位的前后对比",
    },

    // 第四幕：同机位前后对比
    comparison: {
      kicker: "04 · 同一机位",
      title: "改造前后，叠在一起看",
      lead: "两张照片在同机位拍摄。分隔线左边是白墙，右边是上墙后的圆盘。",
      specs: [{ label: "拍摄", value: "同一机位 · 手持拍摄" }],
      hint: "拖动分隔线，或聚焦后按 ← →",
      caption: "左：改造前 · 右：落地后",
      // 初始分隔位置（0 = 全改造前，1 = 全落地后）
      start: 0.5,
      // 接缝羽化带宽度（画框宽度的比例）。两图为手持拍摄，残余 2-3px 错位；
      // 羽化用来盖掉这条硬边——不是装饰。改用 clip-path 会把它暴露成镶边。
      feather: 0.022,
    },

    // 对齐补偿(**实测值,不是估算;不得凭感觉改**)——两张为手持拍摄,after 需放大
    // 并下移才与 before 咬合,否则擦除/滑杆的接缝处线条会跳。首轮测量:梯度幅值图在
    // scale×offset 网格上搜索,最优解 scale=1.015 / dx=0 / dy=8px(912×1148 基准),
    // MAE 3.08→2.49。dx=0(水平天然对齐)是横向对比可行的前提;dy 折算为 before 高度的比例。
    //
    // **两个源图宽高比不同**(before 912×1148=1.2588,after 1000×1275=1.2750):
    // scale 定义在"after 渲染宽 / before 渲染宽"上,height:auto → after 整体等比缩放
    // 1.015(相对 before 宽度);相对 before **高度**的等效纵向比例是
    // 1.015×1.2750/1.2588 = 1.0281,这是宽高比差异的**结果**,不是额外拉伸。
    // 改 before/after 源图尺寸时这两个数会一起变,别只改 scale。
    //
    // 残余错位:硬接缝下横向腰线在接缝处仍有竖向错位(before 自身横线还有 ~1.9° 倾斜,
    // scale+offset 校不了旋转)。**羽化(见 comparison.feather)就是用来盖掉这段残余的**。
    // 2026-09-12 独立复测:梯度 MAE 全网格仅 7.118-7.145(±0.4%,不可分辨)、
    // SAD/1D 剖面/NCC 三种方法的最优解都钉在搜索边界 —— 该图对"涂装前后内容全变、
    // 无共同可追踪结构",**自动化方法无法独立确认也无法推翻本组数值**,故保持原值不动。
    align: {
      scale: 1.015,
      offsetYRatio: 8 / 1148, // = 0.00697
    },
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
  cdnBase: "https://gcore.jsdelivr.net/gh/2188195028-crypto/medallion-pointcloud@v2.2/",
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
  // 墨夜纯色（2026-10-19）：四幕统一沿用首幕 #141311，
  // 不再有各自的纸面背景，也不叠加条纹/纹理。
  // 朱砂只做指引（小标题短线、CTA、滑杆），石绿与金作辅色。
  // 完整令牌在 showcase.css 顶部。
  // bg 同时写入 WebGL 场景背景，必须与 CSS --bg 一致，否则滚到章节边缘会露色差。
  theme: {
    bg: "#141311",
    ink: "#1f1b16",
    paper: "#f4efe6",
    cinnabar: "#a5452f",
    celadon: "#5e7a63",
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
  // 收容后逐档收紧至此。底栏已移除,但静止态仍需给首屏提示留出底部呼吸。
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
    // 克制 Bloom：低强度 + 半分辨率采样，不吞回纹边框与山水纹饰。
    // 墨夜 #141311 底上 0.18/0.82 只轻轻托亮鎏金与米白粒子，不会糊成白雾。
    bloomStrength: 0.18,
    bloomRadius: 0.5,
    bloomThreshold: 0.82,
    bloomResolution: 0.5,
  },

  // ---- 文字动画节奏(纯交互模式) ----
  timeline: {
    typeRate: 28, // 字符/秒
  },
};
