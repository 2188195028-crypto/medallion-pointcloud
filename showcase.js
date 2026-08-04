/* ============================================================
   showcase.js — 繁荣昌盛 · 四季山水圆盘点云展陈
   GLB → 180,000 表面粒子（面积加权 + 细节补偿）→ GPU 动画
   10 秒完整时间线 + 分辨率自适应 + 运行诊断
   调试：URL 加 ?t=5.2 可把时间线冻结在指定秒数（截图验证用）
   作者：Ligong-Wenchang  日期：2026-08-03
   ============================================================ */
import * as THREE from "three";
// GLTF/DRACO 加载器仅 GLB 模式使用,动态 import 节省 ~400KB 解析(data 模式主路径)
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import config from "./showcase-config.js";

// ---------- 常量 ----------
const RV = config.referenceViewport; // 1280×720 基准
const REF = config.referencePointSize;
const STAGE = config.stage;
const TL = config.timeline;
const DURATION = config.duration; // 10 秒
const FOV_RAD = (STAGE.fov * Math.PI) / 360;
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

// 调试参数：?t=5.2 冻结时间线（多分辨率稳定画面验证用）
const FIX_T = (() => {
  const v = new URLSearchParams(location.search).get("t");
  const n = v === null ? NaN : parseFloat(v);
  return isFinite(n) ? n : null;
})();
// 调试参数：?solid=1 渲染实体贴图模型，用于验证朝向与构图（不采样粒子）
const SOLID = new URLSearchParams(location.search).get("solid") === "1";
// 调试参数：?debug=1 输出模型矩阵与坐标变换细节（坐标系排查）
const DEBUG_MATRIX = new URLSearchParams(location.search).get("debug") === "1";
// 调试参数：?shot=1 渲染稳定后把 canvas 像素 POST 到 /shot 落盘（配合 ?t= 冻结）
const SHOT = new URLSearchParams(location.search).get("shot") === "1";
const SHOT_FIRED = { v: false };
function fireShotOnce() {
  if (SHOT_FIRED.v) return;
  SHOT_FIRED.v = true;
  // WebGL canvas 默认 preserveDrawingBuffer=false，必须在 rAF 渲染完成后抓取，
  // 否则 toBlob 拿到的是空缓冲（全黑）。
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      canvas.toBlob((b) => {
        if (!b) return;
        fetch("/shot", { method: "POST", body: b }).then(() => {
          console.log("[showcase] 截图已上报 /shot");
        }).catch((e) => console.warn("[showcase] 截图上报失败", e));
      }, "image/png");
    });
  });
}

// ---------- DOM ----------
const canvas = document.getElementById("scene");
const textPanel = document.getElementById("text-panel");
const bodyEl = document.getElementById("body");
const bodyWrap = document.getElementById("body-wrap");
const cursorEl = document.getElementById("cursor");
const featuresEl = document.getElementById("features");
const paletteEl = document.getElementById("palette");
const tagsEl = document.getElementById("tags");
const restartBtn = document.getElementById("restart");
const loadingEl = document.getElementById("loading");
const errorEl = document.getElementById("error");
const errorMsg = document.getElementById("error-msg");

const els = {
  category: document.getElementById("category"),
  title: document.getElementById("title"),
  alias: document.getElementById("alias"),
  intro: document.getElementById("intro"),
  introSub: document.getElementById("intro-sub"),
};

function showError(msg) {
  errorMsg.textContent = msg;
  errorEl.hidden = false;
  loadingEl.style.opacity = "0";
  console.error("[showcase] 错误:", msg);
}

// ---------- 文案注入（textContent，禁止拼接 innerHTML） ----------
els.category.textContent = config.categoryEn;
els.title.textContent = config.titleZh;
els.alias.textContent = config.aliasEn;
els.intro.textContent = config.introZh;
if (els.introSub) els.introSub.textContent = config.introSubZh || "";
config.features.forEach((f) => {
  const li = document.createElement("li");
  li.textContent = f;
  featuresEl.appendChild(li);
});
config.palette.forEach((c) => {
  const li = document.createElement("li");
  li.textContent = c.name;
  li.style.setProperty("--chip", c.hex);
  li.setAttribute("aria-label", `颜色 ${c.name} ${c.hex}`);
  paletteEl.appendChild(li);
});
config.craftTags.forEach((tag) => {
  const li = document.createElement("li");
  li.textContent = tag;
  tagsEl.appendChild(li);
});

// ---------- 场景 ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
} catch (e) {
  showError("浏览器不支持 WebGL，无法显示点云展陈。");
  throw e;
}
// 触屏设备(手机/平板)性能降档:DPR 上限 1.5、关闭 Bloom
const TOUCH_DEVICE = window.matchMedia("(pointer: coarse)").matches;
const pixelRatio = Math.min(window.devicePixelRatio || 1, TOUCH_DEVICE ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(config.theme.bg);

const camera = new THREE.PerspectiveCamera(
  STAGE.fov,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, STAGE.elevation, STAGE.distance);
camera.lookAt(0, STAGE.lookY, 0);

const group = new THREE.Group();
scene.add(group);

// 深度参考：相机到模型中心距离（用于点尺寸深度修正）
const depthRef = camera.position.clone().setY(camera.position.y - STAGE.lookY).length();

// 克制 Bloom：低强度 + 半分辨率采样（配置统一管理，不吞细节）
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(STAGE.bloomResolution, STAGE.bloomResolution),
  STAGE.bloomStrength,
  STAGE.bloomRadius,
  STAGE.bloomThreshold
);
if (TOUCH_DEVICE) bloomPass.enabled = false; // 移动端关 Bloom 保帧率
composer.addPass(bloomPass);

// ---------- 着色器 ----------
const vertexShader = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aNormal;
  attribute vec3 aColor;
  attribute float aSeed;
  attribute float aDelay;
  attribute float aEdge;
  attribute float aSize;

  uniform float uTime;
  uniform float uPhase;   // 0=散开 1=成形（自动时间线或鼠标/触摸交互统一输入）
  uniform float uPhaseFade; // 全场淡出（自动循环尾段；交互模式恒 1）
  uniform float uPixelRatio;
  uniform float uViewportScale;
  uniform float uDepthRef;
  uniform float uSize;
  uniform float uReduced;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vEdge;

  float smoothstep01(float a, float b, float x) {
    float t = clamp((x - a) / (b - a), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  void main() {
    float t = uTime;

    // 聚合：全局 phase + 粒子延迟错峰（外轮廓/高曲率粒子优先）
    // uPhase=1 时全部 rise=1；中间值按 aDelay 拉开先后
    float rise = clamp(uPhase * 1.8 - aDelay * 0.8, 0.0, 1.0);
    rise = mix(rise, 1.0, uReduced); // 减少动态模式：快速聚合

    // 溶解：边缘粒子优先（aEdge 高者先散）
    float dissolve = clamp((1.0 - uPhase) * 1.8 - (1.0 - aEdge) * 0.5, 0.0, 1.0);
    dissolve = mix(dissolve, 0.0, uReduced);

    float fade = uPhaseFade;

    // 表面法线方向的极小呼吸波动（仅成形后）
    float breath = sin(t * 3.0 + aSeed * 40.0) * 0.006 * rise * (1.0 - uReduced);
    vec3 target = position + aNormal * breath;

    // 散开位置：模型下方地面区域，带少量漂移
    vec3 scat = aStart;
    scat.x += sin(t * 2.2 + aSeed * 50.0) * 0.04 * (1.0 - uReduced);
    scat.z += cos(t * 1.7 + aSeed * 30.0) * 0.04 * (1.0 - uReduced);

    vec3 pos = mix(scat, target, rise);

    // 退场：沿法线向外溶解 + 随机散射
    float dd = dissolve;
    pos += aNormal * dd * 0.5
         + vec3(
             (aSeed - 0.5) * dd * 1.4,
             dd * 0.25,
             (fract(aSeed * 7.13) - 0.5) * dd * 1.1);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;

    float edgeBoost = 1.0 + aEdge * 0.18;
    gl_PointSize = uSize * uPixelRatio * uViewportScale * aSize * edgeBoost
                 * (uDepthRef / max(-mv.z, 0.001));
    gl_PointSize = min(gl_PointSize, 64.0);

    // 轻微明暗差异 + 边缘闪烁（下限 0.94，避免中心金字偏暗）
    float shimmer = 0.94 + 0.06 * sin(t * 6.0 + aSeed * 90.0) * (1.0 - uReduced);
    vColor = aColor * shimmer;
    vAlpha = (0.25 + 0.75 * rise) * (1.0 - dissolve) * fade;
    vEdge = aEdge;
  }
`;

const fragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vEdge;

  void main() {
    // 圆形软边点精灵
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    float a = smoothstep(1.0, 0.45, d);
    a = pow(a, 1.7);
    if (a < 0.012) discard;
    vec3 col = vColor * (1.0 + vEdge * 0.18);
    gl_FragColor = vec4(col, a * vAlpha);
  }
`;

const uniforms = {
  uTime: { value: 0 },
  uPhase: { value: 0 }, // 0=散开 1=成形（自动时间线或交互输入）
  uPhaseFade: { value: 1 },
  uPixelRatio: { value: pixelRatio },
  uViewportScale: { value: 1 },
  uDepthRef: { value: depthRef },
  uSize: { value: REF },
  uReduced: { value: REDUCED ? 1 : 0 },
};

// ---------- 展示流程控制 ----------
// 进入页面:粒子自动升起成形(慢速入场动画);平时模型保持旋转、成形展示不变;
// 消散/升起由"一次明确的滑动动作"触发(滚轮滚一下 / 上下滑一次),
// 不做连续累计控制,点击/轻触不会误触发。
const flow = {
  phase: 0, // 0=散开 1=成形
  target: 1, // 进入默认升起
  easing: true,
  speed: 0.45, // 当前缓动速度(入场动画约 2.2s)
};
const IS_PORTRAIT = () => window.innerHeight > window.innerWidth;

function setPhase(target, speed) {
  flow.target = Math.min(1, Math.max(0, target));
  flow.speed = speed ?? 3.0;
  flow.easing = true;
}

// 每帧推进相位缓动(入场慢速 ~0.9s 动画;触发消散/升起快速 0.33s)
function updateFlow(dt) {
  if (!flow.easing) return;
  const diff = flow.target - flow.phase;
  const step = dt * flow.speed;
  if (Math.abs(diff) <= step) {
    flow.phase = flow.target;
    flow.easing = false;
  } else {
    flow.phase += Math.sign(diff) * step;
  }
}

// 单次手势触发:滚轮在 450ms 窗口内累计位移超过阈值 → 触发一次
const GESTURE_THRESHOLD = 80;
let gestureAccum = 0;
let gestureTimer = null;

function handleGesture(d) {
  gestureAccum += d;
  if (Math.abs(gestureAccum) >= GESTURE_THRESHOLD) {
    if (gestureAccum > 0) setPhase(0, 0.5); // 下滑/前翻 → 消散
    else setPhase(1, 0.45); // 上滑/回翻 → 升起
    gestureAccum = 0;
  }
  clearTimeout(gestureTimer);
  gestureTimer = setTimeout(() => { gestureAccum = 0; }, 450);
}

window.addEventListener("wheel", (e) => handleGesture(e.deltaY), { passive: true });

// 触摸:一次手势(开始→结束)的总位移判定,点击(位移≈0)不会误触发
let touchStartY = null;
let touchAccum = 0;
window.addEventListener("touchstart", (e) => {
  touchStartY = e.touches[0].clientY;
  touchAccum = 0;
}, { passive: true });
window.addEventListener("touchmove", (e) => {
  if (touchStartY === null) return;
  touchAccum = touchStartY - e.touches[0].clientY; // 只记录,不触发
}, { passive: true });
window.addEventListener("touchend", () => {
  if (touchStartY === null) return;
  if (Math.abs(touchAccum) >= 60) {
    if (touchAccum > 0) setPhase(0, 0.5); // 手指上滑 → 消散
    else setPhase(1, 0.45); // 手指下滑 → 升起
  }
  touchStartY = null;
});

// ---------- 鼠标/触摸拖拽旋转(左右展示) ----------
// 拖拽时暂停自动旋转,角度由用户控制;松手后保持该角度,
// 超过 ROT_IDLE_RESUME_MS 无操作再从当前角度恢复自动旋转。
// 与滚轮/滑动"消散/升起"手势互不冲突(方向正交,位移各自独立判定)。
const dragRot = {
  active: false,
  pointerId: null,
  lastX: 0,
  angle: 0, // 用户拖拽累计角度(叠加在自动旋转基准之上)
  resumeTimer: null,
};
const ROT_DRAG_K = 0.006; // 每像素旋转弧度(灵敏度)
const ROT_IDLE_RESUME_MS = 4000;

canvas.style.cursor = "grab";
canvas.addEventListener("pointerdown", (e) => {
  if (dragRot.active) return;
  dragRot.active = true;
  dragRot.pointerId = e.pointerId;
  dragRot.lastX = e.clientX;
  clearTimeout(dragRot.resumeTimer); // 拖拽中不恢复自动旋转
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
  canvas.style.cursor = "grabbing";
});
window.addEventListener("pointermove", (e) => {
  if (!dragRot.active || e.pointerId !== dragRot.pointerId) return;
  const dx = e.clientX - dragRot.lastX;
  dragRot.lastX = e.clientX;
  dragRot.angle += dx * ROT_DRAG_K;
});
const endDragRot = (e) => {
  if (!dragRot.active || e.pointerId !== dragRot.pointerId) return;
  dragRot.active = false;
  dragRot.pointerId = null;
  try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
  canvas.style.cursor = "grab";
  clearTimeout(dragRot.resumeTimer);
  dragRot.resumeTimer = setTimeout(() => {
    // 用户角度并入自动旋转基准,从当前朝向平滑续转
    rotTotal += dragRot.angle;
    dragRot.angle = 0;
  }, ROT_IDLE_RESUME_MS);
};
window.addEventListener("pointerup", endDragRot);
window.addEventListener("pointercancel", endDragRot);

// 页面切走/关闭 → 消散;回到页面 → 慢速重新升起(入场动画)
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    setPhase(0, 0.5);
  } else {
    setPhase(1, 0.45);
  }
});
window.addEventListener("beforeunload", () => setPhase(0, 0.5));

function makeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
  });
}

// ---------- 粒子采样 ----------
function collectMeshes(model) {
  // 遍历所有 Mesh，采样到模型根节点局部空间
  const meshes = [];
  model.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().invert(model.matrixWorld);
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  model.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const g = o.geometry;
    const pos = g.attributes.position;
    if (!pos) return;
    const idx = g.index;
    const uvAttr = g.attributes.uv;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    const local = new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld);
    if (DEBUG_MATRIX) {
      console.log("[debug] mesh", o.name,
        "| model.scale", model.scale.toArray().map((v) => +v.toFixed(4)),
        "| model.matrixWorld[0..3]", model.matrixWorld.elements.slice(0, 4).map((v) => +v.toFixed(4)),
        "| o.matrixWorld[12..15]", o.matrixWorld.elements.slice(12, 16).map((v) => +v.toFixed(4)),
        "| local[12..15]", local.elements.slice(12, 16).map((v) => +v.toFixed(4)),
        "| 顶点0:", pos.getX(0).toFixed(3), pos.getY(0).toFixed(3), pos.getZ(0).toFixed(3),
        "→ 采样后:", new THREE.Vector3(pos.getX(0), pos.getY(0), pos.getZ(0)).applyMatrix4(local).toArray().map((v) => +v.toFixed(3)));
    }
    const triCount = Math.floor((idx ? idx.count : pos.count) / 3);
    if (triCount === 0) return;
    const areas = new Float32Array(triCount);
    const detailW = new Float32Array(triCount);
    let areaSum = 0, detailSum = 0;
    for (let i = 0; i < triCount; i++) {
      const ia = idx ? idx.getX(i * 3) : i * 3;
      const ib = idx ? idx.getX(i * 3 + 1) : i * 3 + 1;
      const ic = idx ? idx.getX(i * 3 + 2) : i * 3 + 2;
      vA.fromBufferAttribute(pos, ia).applyMatrix4(local);
      vB.fromBufferAttribute(pos, ib).applyMatrix4(local);
      vC.fromBufferAttribute(pos, ic).applyMatrix4(local);
      e1.subVectors(vB, vA);
      e2.subVectors(vC, vA);
      tmp.crossVectors(e1, e2);
      const area = tmp.length() * 0.5;
      areas[i] = area;
      areaSum += area;
      // 高曲率权重：最大内角用余弦定理直接算（免 acos，提速约 2 倍）。
      // 最大边对应最大角：cosMax∈[0.5,-1] ⟺ maxAng∈[60°,180°]，
      // angleF = clamp((0.5-cosMax)/1.5) 与原 (maxAng-60)/120 端点一致、单调相同。
      const l1 = e1.length(), l2 = e2.length();
      const l3 = vB.distanceTo(vC);
      const lMax = Math.max(l1, l2, l3);
      let cosMax = 1;
      if (lMax === l1) { const d = 2 * l2 * l3; if (d > 0) cosMax = (l2 * l2 + l3 * l3 - l1 * l1) / d; }
      else if (lMax === l2) { const d = 2 * l1 * l3; if (d > 0) cosMax = (l1 * l1 + l3 * l3 - l2 * l2) / d; }
      else { const d = 2 * l1 * l2; if (d > 0) cosMax = (l1 * l1 + l2 * l2 - l3 * l3) / d; }
      cosMax = Math.min(1, Math.max(-1, cosMax));
      const angleF = Math.min(1, Math.max(0, (0.5 - cosMax) / 1.5));
      detailW[i] = area * (0.3 + 0.7 * angleF);
      detailSum += detailW[i];
    }
    meshes.push({ pos, idx, uvAttr, mat, local, triCount, areas, areaSum, detailW, detailSum });
  });
  return meshes;
}

function buildCumulative(arr) {
  const cum = new Float32Array(arr.length);
  let acc = 0;
  for (let i = 0; i < arr.length; i++) { acc += arr[i]; cum[i] = acc; }
  return cum;
}

function pickIndex(cum, total) {
  const r = Math.random() * total;
  let lo = 0, hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < r) lo = mid + 1; else hi = mid;
  }
  return lo;
}

// 读取贴图像素（UV 采样用）。glTF 约定 v=0 在图像顶部。
// 降采样到 ≤1024：粒子取色精度足够（点径 1.35px），解码/取色快约 16 倍。
function prepareTextureData(tex) {
  if (!tex || !tex.image || !tex.image.width) return null;
  try {
    const img = tex.image;
    const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    return { data: d, w, h };
  } catch (e) {
    return null;
  }
}

function linearToSrgbByte(v) {
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, s)) * 255);
}

function sampleParticles(model, N, detailRatio) {
  const meshes = collectMeshes(model);
  const totalArea = meshes.reduce((s, m) => s + m.areaSum, 0);
  if (!(totalArea > 0) || meshes.length === 0) {
    throw new Error("模型没有有效三角形，无法采样。");
  }
  // 预读每个 Mesh 的贴图数据
  for (const m of meshes) {
    m.texData = m.mat && m.mat.map ? prepareTextureData(m.mat.map) : null;
    m.cum = buildCumulative(m.areas);
    m.detailCum = buildCumulative(m.detailW);
    m.fallback = [255, 239, 230, 207]; // 页面主题米白兜底
    if (m.mat && m.mat.color) {
      m.fallback = [
        linearToSrgbByte(m.mat.color.r),
        linearToSrgbByte(m.mat.color.g),
        linearToSrgbByte(m.mat.color.b),
      ];
    }
  }

  const detailN = Math.round(N * detailRatio);
  const surfaceN = N - detailN;
  const totalDetail = meshes.reduce((s, mm) => s + mm.detailSum, 0);

  const targets = new Float32Array(N * 3);
  const starts = new Float32Array(N * 3);
  const normals = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const seeds = new Float32Array(N);
  const delays = new Float32Array(N);
  const edges = new Float32Array(N);
  const sizes = new Float32Array(N);

  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
  const uvA = new THREE.Vector2(), uvB = new THREE.Vector2(), uvC = new THREE.Vector2();
  const nrm = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();

  const sampleColor = (m, u, v) => {
    if (m.texData && u >= 0 && u <= 1 && v >= 0 && v <= 1) {
      const x = Math.min(m.texData.w - 1, Math.max(0, Math.round(u * (m.texData.w - 1))));
      const y = Math.min(m.texData.h - 1, Math.max(0, Math.round(v * (m.texData.h - 1))));
      const o = (y * m.texData.w + x) * 4;
      return [m.texData.data[o], m.texData.data[o + 1], m.texData.data[o + 2]];
    }
    return m.fallback;
  };

  let p = 0;
  const write = (m, i, s, t) => {
    const ia = m.idx ? m.idx.getX(i * 3) : i * 3;
    const ib = m.idx ? m.idx.getX(i * 3 + 1) : i * 3 + 1;
    const ic = m.idx ? m.idx.getX(i * 3 + 2) : i * 3 + 2;
    vA.fromBufferAttribute(m.pos, ia).applyMatrix4(m.local);
    vB.fromBufferAttribute(m.pos, ib).applyMatrix4(m.local);
    vC.fromBufferAttribute(m.pos, ic).applyMatrix4(m.local);
    let u = 0, v = 0;
    if (m.uvAttr) {
      uvA.fromBufferAttribute(m.uvAttr, ia);
      uvB.fromBufferAttribute(m.uvAttr, ib);
      uvC.fromBufferAttribute(m.uvAttr, ic);
      u = (1 - s - t) * uvA.x + s * uvB.x + t * uvC.x;
      v = (1 - s - t) * uvA.y + s * uvB.y + t * uvC.y;
    }
    const col = sampleColor(m, u, v);
    e1.subVectors(vB, vA);
    e2.subVectors(vC, vA);
    nrm.crossVectors(e1, e2).normalize();
    targets[p * 3] = vA.x + s * e1.x + t * e2.x;
    targets[p * 3 + 1] = vA.y + s * e1.y + t * e2.y;
    targets[p * 3 + 2] = vA.z + s * e1.z + t * e2.z;
    normals[p * 3] = nrm.x;
    normals[p * 3 + 1] = nrm.y;
    normals[p * 3 + 2] = nrm.z;
    colors[p * 3] = col[0] / 255;
    colors[p * 3 + 1] = col[1] / 255;
    colors[p * 3 + 2] = col[2] / 255;
  };

  const scatter = (k) => {
    starts[k * 3] = targets[k * 3] + (Math.random() - 0.5) * 2.4;
    starts[k * 3 + 1] = targets[k * 3 + 1] - (0.55 + Math.random() * 1.5) * 2;
    starts[k * 3 + 2] = targets[k * 3 + 2] + (Math.random() - 0.5) * 2.4;
  };

  // 表面粒子（面积加权均匀采样）——每 mesh 比例分配后把差额补到最大 mesh，
  // 保证 position.count 精确等于 N（规范：不允许靠复制同位置点虚增数量）
  const surfaceCounts = meshes.map((m) =>
    Math.max(0, Math.round(surfaceN * (m.areaSum / totalArea)))
  );
  const surfSum = surfaceCounts.reduce((s, c) => s + c, 0);
  if (surfSum !== surfaceN && meshes.length) {
    surfaceCounts[surfaceCounts.indexOf(Math.max(...surfaceCounts))] +=
      surfaceN - surfSum;
  }
  meshes.forEach((m, mi) => {
    const count = surfaceCounts[mi];
    for (let k = 0; k < count; k++) {
      const i = pickIndex(m.cum, m.areaSum);
      const r1 = Math.sqrt(Math.random()), r2 = Math.random();
      const s = r1 * (1 - r2), t = r1 * r2;
      write(m, i, s, t);
      seeds[p] = Math.random();
      delays[p] = 0.7 + seeds[p] * 0.3; // 表面粒子稍晚升起
      edges[p] = Math.random() * 0.25;
      sizes[p] = 0.95 + Math.random() * 0.1;
      scatter(p);
      p++;
    }
  });

  // 细节粒子（高曲率/轮廓/纹样边缘，倾向三角形边）——同样补差保证总数精确
  const detailCounts = meshes.map((m) =>
    Math.max(0, Math.round(detailN * (m.detailSum / totalDetail)))
  );
  const detSum = detailCounts.reduce((s, c) => s + c, 0);
  if (detSum !== detailN && meshes.length) {
    detailCounts[detailCounts.indexOf(Math.max(...detailCounts))] +=
      detailN - detSum;
  }
  meshes.forEach((m, mi) => {
    const count = detailCounts[mi];
    for (let k = 0; k < count; k++) {
      const i = pickIndex(m.detailCum, m.detailSum);
      const e = Math.floor(Math.random() * 3); // 随机选一条边
      const f = Math.random();
      const s = e === 0 ? 1 - f : e === 1 ? 1 - f : 0;
      const t = e === 0 ? 0 : e === 1 ? f : 1 - f;
      write(m, i, s, t);
      seeds[p] = Math.random();
      delays[p] = 0.2 * 0.7 + seeds[p] * 0.3; // 轮廓优先升起
      edges[p] = 0.7 + Math.random() * 0.3;
      sizes[p] = 1.05 + Math.random() * 0.15;
      scatter(p);
      p++;
    }
  });

  return {
    targets, starts, normals, colors, seeds, delays, edges, sizes,
    meshes, totalArea,
    uvMeshCount: meshes.filter((m) => m.uvAttr).length, // 有 UV 的 mesh 数
    texMeshCount: meshes.filter((m) => m.texData).length, // 成功读取贴图的 mesh 数
  };
}

// ---------- 初始化 ----------
let pointsMain, bboxSize, meshStats;
const T_START = performance.now(); // 页面脚本启动时刻(测量加载耗时)

// ---------- 初始化 ----------
// mode="data"：加载预采样粒子数据(快,GitHub Pages 部署用);
// mode="glb" ：浏览器内加载 GLB 并采样(开发/验证用)
// URL 参数 ?mode=glb 可临时覆盖(调试坐标系用)
const MODE = new URLSearchParams(location.search).get("mode") || config.mode;
// 参考照片取色与粒子数据并行加载
const photoReady = loadPhotoTexture();
if (MODE === "data") {
  Promise.all([loadParticleData(), photoReady])
    .then(([d]) => {
      bboxSize = d.stats.bboxSize;
      buildPoints(d, {
        meshCount: d.stats.meshCount,
        triCount: d.stats.triCount,
        uvMeshes: 4,
        texMeshes: 4,
      });
    })
    .catch((e) => showError("粒子数据加载失败：" + e.message));
} else {
  // GLB 模式:动态加载加载器(不拖累 data 模式主路径)
  Promise.all([
    import("three/addons/loaders/GLTFLoader.js"),
    import("three/addons/loaders/DRACOLoader.js"),
    photoReady,
  ]).then(([gltfMod, dracoMod]) => {
    const loader = new gltfMod.GLTFLoader();
    // 检查并配置 Draco（模型未压缩时不会触发解码器下载）
    const draco = new dracoMod.DRACOLoader().setDecoderPath("assets/three/libs/draco/");
    loader.setDRACOLoader(draco);
    loader.load(
      config.modelPath,
      (gltf) => {
        try {
          buildShowcase(gltf.scene || gltf.scenes[0]);
        } catch (e) {
          showError("点云采样失败：" + e.message);
        }
      },
      undefined,
      (err) => showError("模型加载失败，请检查 assets/models/prosperity.glb 是否存在。（" + (err && err.message ? err.message : "网络错误") + "）")
    );
  }).catch((e) => showError("3D 加载器初始化失败：" + e.message));
}

// ---------- 粒子精简(无放回均匀抽取) ----------
// bin 内 18 万粒子在浏览器端抽取到 config.particleCount(6 万),
// 保持表面/细节比例统计一致,视觉密度足够但不杂乱。
// 部分 Fisher-Yates 洗牌:前 target 个位置由随机抽取填充,随后截断。
function decimateToTarget(data, target) {
  const n = data.targets.length / 3;
  if (n <= target) return data;
  const swap3 = (arr, a, b) => {
    if (a === b) return;
    const oa = a * 3, ob = b * 3;
    for (let q = 0; q < 3; q++) {
      const t = arr[oa + q]; arr[oa + q] = arr[ob + q]; arr[ob + q] = t;
    }
  };
  const swap1 = (arr, a, b) => {
    if (a === b) return;
    const t = arr[a]; arr[a] = arr[b]; arr[b] = t;
  };
  for (let k = 0; k < target; k++) {
    const j = k + Math.floor(Math.random() * (n - k));
    swap3(data.targets, k, j);
    swap3(data.starts, k, j);
    swap3(data.normals, k, j);
    swap3(data.colors, k, j);
    swap1(data.seeds, k, j);
    swap1(data.delays, k, j);
    swap1(data.edges, k, j);
    swap1(data.sizes, k, j);
  }
  data.targets = data.targets.slice(0, target * 3);
  data.starts = data.starts.slice(0, target * 3);
  data.normals = data.normals.slice(0, target * 3);
  data.colors = data.colors.slice(0, target * 3);
  data.seeds = data.seeds.slice(0, target);
  data.delays = data.delays.slice(0, target);
  data.edges = data.edges.slice(0, target);
  data.sizes = data.sizes.slice(0, target);
  return data;
}

// ---------- 预采样粒子数据模式 ----------
// 二进制格式(与 tools/prepare_particles.py 输出一致):
// header: "PTCL" u32 | version u32 | count u32 | meshCount u32 | triCount u32
//         totalArea f32 | bboxSize f32×3 | scale f32(共 40 字节)
// 后接: targets f32×count×3 | normals u8×count×3 | colors u8×count×3 | meta u8×count×4
async function loadParticleData() {
  // CDN 优先(国内快,热缓存 ~2s),超时/失败回退同源(慢但可用)。
  // 15s 容忍 jsDelivr 推新 commit 后的冷缓存回源(实测冷缓存 ~6s)。
  let buf = null;
  if (config.cdnBase) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(config.cdnBase + config.particleDataPath, { signal: ctrl.signal });
      if (res.ok) buf = await res.arrayBuffer();
    } catch (e) {
      console.warn("[showcase] CDN 加载失败,回退本地粒子数据", e.message || e);
    } finally {
      clearTimeout(timer);
    }
  }
  if (!buf) {
    const res = await fetch(config.particleDataPath);
    if (!res.ok) throw new Error("HTTP " + res.status);
    buf = await res.arrayBuffer();
  }
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x4c435450) throw new Error("粒子数据格式错误"); // "PTCL"
  const count = dv.getUint32(8, true);
  if (count !== config.binParticleCount) {
    throw new Error("粒子数量不匹配: " + count + " ≠ " + config.binParticleCount);
  }
  const stats = {
    meshCount: dv.getUint32(12, true),
    triCount: dv.getUint32(16, true),
    totalArea: dv.getFloat32(20, true),
    bboxSize: [
      dv.getFloat32(24, true),
      dv.getFloat32(28, true),
      dv.getFloat32(32, true),
    ],
    scale: dv.getFloat32(36, true),
  };
  let off = 40;
  const targets = new Float32Array(buf, off, count * 3);
  off += count * 12;
  const normalsU8 = new Uint8Array(buf, off, count * 3);
  off += count * 3;
  const colors = new Uint8Array(buf, off, count * 3);
  off += count * 3;
  const meta = new Uint8Array(buf, off, count * 4);

  // 解码量化属性
  const normals = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const delays = new Float32Array(count);
  const edges = new Float32Array(count);
  const sizes = new Float32Array(count);
  for (let k = 0; k < count; k++) {
    normals[k * 3] = normalsU8[k * 3] / 127.5 - 1;
    normals[k * 3 + 1] = normalsU8[k * 3 + 1] / 127.5 - 1;
    normals[k * 3 + 2] = normalsU8[k * 3 + 2] / 127.5 - 1;
    seeds[k] = meta[k * 4] / 255;
    delays[k] = meta[k * 4 + 1] / 255;
    edges[k] = meta[k * 4 + 2] / 255;
    sizes[k] = 0.9 + (meta[k * 4 + 3] / 255) * 0.35;
  }
  const colorsF = new Float32Array(count * 3);
  for (let k = 0; k < count; k++) {
    colorsF[k * 3] = colors[k * 3] / 255;
    colorsF[k * 3 + 1] = colors[k * 3 + 1] / 255;
    colorsF[k * 3 + 2] = colors[k * 3 + 2] / 255;
  }

  // 散开位置(与 GLB 模式采样一致的分布:模型下方地面区域 + 漂移)
  const starts = new Float32Array(count * 3);
  for (let k = 0; k < count; k++) {
    starts[k * 3] = targets[k * 3] + (Math.random() - 0.5) * 2.4;
    starts[k * 3 + 1] = targets[k * 3 + 1] - (0.55 + Math.random() * 1.5) * 2;
    starts[k * 3 + 2] = targets[k * 3 + 2] + (Math.random() - 0.5) * 2.4;
  }

  console.log("[showcase] 阶段计时 粒子数据加载+解码: " + (performance.now() - T_START).toFixed(0) + "ms");
  return decimateToTarget({ targets, starts, normals, colors: colorsF, seeds, delays, edges, sizes, stats }, config.particleCount);
}

function buildShowcase(model) {
  const t0 = performance.now();
  console.log("[showcase] 阶段计时 GLB加载+解析: " + (t0 - T_START).toFixed(0) + "ms");
  // 模型统计
  let meshCount = 0, triCount = 0;
  model.traverse((o) => {
    if (o.isMesh) {
      meshCount++;
      const idx = o.geometry && o.geometry.index;
      triCount += Math.floor((idx ? idx.count : o.geometry.attributes.position.count) / 3);
    }
  });

  // 包围盒 → 归一化（统一尺寸、居中）
  group.add(model);
  const box = new THREE.Box3().setFromObject(model);
  bboxSize = box.getSize(new THREE.Vector3());
  const scale = 2 / Math.max(bboxSize.x, bboxSize.y, bboxSize.z, 1e-6);
  model.scale.setScalar(scale);
  model.position.sub(box.getCenter(new THREE.Vector3()).multiplyScalar(scale));

  // 原始朝向修正（配置项，不交换坐标轴）
  if (Array.isArray(config.modelRotation)) {
    model.rotation.set(...config.modelRotation);
  }

  // ?solid=1：渲染实体贴图模型验证朝向（调试用，不采样粒子）
  if (SOLID) {
    model.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const src = Array.isArray(o.material) ? o.material[0] : o.material;
      o.material = new THREE.MeshBasicMaterial({
        map: src.map || null,
        color: src.map ? 0xffffff : 0xdca852,
        side: THREE.DoubleSide,
      });
    });
    model.visible = true;
    meshStats = { meshCount, triCount, actualParticles: 0 };
    applyLayout();
    loadingEl.style.opacity = "0";
    setTimeout(() => { loadingEl.style.display = "none"; }, 600);
    if (SHOT) setTimeout(fireShotOnce, 1200);
    requestAnimationFrame(frame);
    console.log("[showcase] solid 调试模式：模型朝向验证（不采样粒子）");
    return;
  }

  console.log("[showcase] 阶段计时 归一化/朝向: " + (performance.now() - t0).toFixed(0) + "ms");

  // 采样 180,000 粒子
  const N = config.particleCount;
  const tS = performance.now();
  const data = sampleParticles(model, N, config.detailSamplingRatio);
  console.log("[showcase] 阶段计时 采样: " + (performance.now() - tS).toFixed(0) + "ms");

  // 实体模型只用于采样，不渲染（点云展陈，不用实体冒充效果）
  model.visible = false;

  buildPoints(data, {
    meshCount,
    triCount,
    uvMeshes: data.uvMeshCount,
    texMeshes: data.texMeshCount,
  });
}

// ---------- 参考照片取色(照片即色板) ----------
// 模型贴图与参考照片的四季布局不一致(照片左侧黛蓝雪山/右上朱红秋山,
// 模型贴图缺失蓝色域),因此直接按粒子在盘面 (x,y) 的位置采样照片像素,
// 保证渲染颜色布局与照片一致:中心金字/暗金回纹/右上红枫/左侧黛蓝/底部青绿。
// 照片加载失败时回退到最近色板重映射(config.paletteRemap)。
let photoTex = null; // { data, w, h, cx, cy, radius }

function loadPhotoTexture() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        // 保持原尺寸加载(1290×1315,圆盘几何硬编码在 config,不缩放避免坐标换算)
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        photoTex = {
          data: ctx.getImageData(0, 0, img.width, img.height).data,
          w: img.width,
          h: img.height,
          cx: config.photoCenter[0],
          cy: config.photoCenter[1],
          radius: config.photoRadius,
        };
        console.log("[showcase] 参考照片取色启用: 圆盘中心(" +
          photoTex.cx + "," + photoTex.cy + ") 半径 " + photoTex.radius);
      } catch (e) {
        console.warn("[showcase] 照片取色初始化失败,回退色板重映射", e);
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = config.photoPath;
  });
}

// 按盘面坐标 (x,y ∈ [-1,1]) 采样照片(模型 +y 向上 ↔ 图像 y 向下;×0.97 内缩防白边)
function applyPhotoColors(targets, colors) {
  const n = targets.length / 3;
  const r = photoTex.radius * 0.97;
  for (let k = 0; k < n; k++) {
    const px = Math.round(photoTex.cx + targets[k * 3] * r);
    const py = Math.round(photoTex.cy - targets[k * 3 + 1] * r);
    const x = Math.min(photoTex.w - 1, Math.max(0, px));
    const y = Math.min(photoTex.h - 1, Math.max(0, py));
    const o = (y * photoTex.w + x) * 4;
    colors[k * 3] = photoTex.data[o] / 255;
    colors[k * 3 + 1] = photoTex.data[o + 1] / 255;
    colors[k * 3 + 2] = photoTex.data[o + 2] / 255;
  }
}

// 回退方案:最近色板重映射(config.paletteRemap,13 色,含红/蓝/绿鲜艳系)
const paletteRgb = config.paletteRemap.map((c) => {
  const h = parseInt(c.hex.slice(1), 16);
  return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
});

function remapColorsToPalette(colors) {
  const n = colors.length / 3;
  for (let k = 0; k < n; k++) {
    const r = colors[k * 3], g = colors[k * 3 + 1], b = colors[k * 3 + 2];
    let best = 0, bestD = Infinity;
    for (let pi = 0; pi < paletteRgb.length; pi++) {
      const dr = r - paletteRgb[pi][0];
      const dg = g - paletteRgb[pi][1];
      const db = b - paletteRgb[pi][2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) { bestD = d; best = pi; }
    }
    colors[k * 3] = paletteRgb[best][0];
    colors[k * 3 + 1] = paletteRgb[best][1];
    colors[k * 3 + 2] = paletteRgb[best][2];
  }
}

// 两种模式共用的收尾：创建 BufferGeometry → 粒子 → 布局 → 启动时间线
function buildPoints(data, stats) {
  if (photoTex) applyPhotoColors(data.targets, data.colors); // 照片取色(优先)
  else remapColorsToPalette(data.colors); // 回退:色板重映射
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(data.targets, 3));
  geometry.setAttribute("aStart", new THREE.BufferAttribute(data.starts, 3));
  geometry.setAttribute("aNormal", new THREE.BufferAttribute(data.normals, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(data.colors, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(data.seeds, 1));
  geometry.setAttribute("aDelay", new THREE.BufferAttribute(data.delays, 1));
  geometry.setAttribute("aEdge", new THREE.BufferAttribute(data.edges, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(data.sizes, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);

  // 单层主粒子（边缘增亮在着色器中完成，辉光由后处理 Bloom 提供）
  pointsMain = new THREE.Points(geometry, makeMaterial());
  pointsMain.frustumCulled = false;
  group.add(pointsMain);

  meshStats = {
    meshCount: stats.meshCount,
    triCount: stats.triCount,
    actualParticles: geometry.attributes.position.count,
    uvMeshes: stats.uvMeshes ?? 0,
    texMeshes: stats.texMeshes ?? 0,
  };
  window.__showcaseReady = true; // 喂饱 index.html 的加载看门狗
  console.log("[showcase] 实际粒子数量 =", geometry.attributes.position.count);

  // 初始化布局并启动
  applyLayout();
  loadingEl.style.opacity = "0";
  setTimeout(() => { loadingEl.style.display = "none"; }, 600);
  textElapsed = 0; // 开始文字淡入与打字
  reportDiagnostics();
  setTimeout(reportDiagnostics, 6000); // 6 秒后补充含帧率的完整诊断
  if (SHOT) setTimeout(fireShotOnce, 1500); // ?t= 冻结模式下渲染稳定后上报
  requestAnimationFrame(frame);
}

// ---------- 布局与分辨率自适应 ----------
function applyLayout() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  composer.setSize(w, h); // 后处理随分辨率更新（Bloom 保持半分辨率比例）

  // 粒子缩放：模型屏幕高度严格跟随 Canvas 高度（固定 FOV + 归一化模型）
  uniforms.uViewportScale.value = h / RV.height;
  uniforms.uPixelRatio.value = renderer.getPixelRatio();

  // 整页连续布局缩放：桌面以 1280×720 为基准；竖屏以宽度 700px 为基准(手机字号)
  const layoutScale = IS_PORTRAIT()
    ? Math.max(0.45, Math.min(1.1, w / 700))
    : Math.min(w / RV.width, h / RV.height);
  const root = document.documentElement.style;
  root.setProperty("--layout-scale", layoutScale.toFixed(4));
  root.setProperty("--text-left", config.referenceTextLayout.left);
  root.setProperty("--text-top", config.referenceTextLayout.top);
  root.setProperty("--text-width", config.referenceTextLayout.width);
  root.setProperty("--bottom-margin", config.referenceTextLayout.bottomMargin);
  root.setProperty("--gap-title", config.referenceTextLayout.gapTitle + "px");
  root.setProperty("--gap-block", config.referenceTextLayout.gapBlock + "px");
  const T = config.referenceTypography;
  root.setProperty("--fs-category", T.category + "px");
  root.setProperty("--fs-title", T.title + "px");
  root.setProperty("--fs-alias", T.alias + "px");
  root.setProperty("--fs-intro", T.intro + "px");
  root.setProperty("--fs-body", T.body + "px");
  root.setProperty("--fs-feature", T.feature + "px");
  root.setProperty("--fs-label", T.label + "px");

  // 模型屏幕位置：桌面左文右图(中心 ~72%)；竖屏(手机)居中并整体缩小
  if (IS_PORTRAIT()) {
    baseX = 0;
    group.scale.setScalar(STAGE.portraitScale);
  } else {
    baseX = Math.tan(FOV_RAD) * (w / h) * STAGE.modelXFraction * STAGE.distance;
    group.scale.setScalar(1);
  }
  group.position.x = baseX;
}

let baseX = 0;
window.addEventListener("resize", applyLayout);

// ---------- 10 秒时间线 ----------
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// 文字元素(加载完成后依次淡入,常驻不退场)
const featureItems = Array.from(featuresEl.children);
let textElapsed = -1; // <0 表示尚未开始;加载完成后从 0 计时

function updateText(dt) {
  if (textElapsed < 0) return;
  textElapsed += dt;
  const e = textElapsed;

  const fadeIn = (el, delay) => {
    if (!el) return;
    const p = smooth(0.25 + delay, 0.95 + delay, e); // 入场从下方 18px 回位
    el.style.opacity = p.toFixed(3);
    el.style.transform = `translateY(${((1 - p) * 18).toFixed(2)}px)`;
  };
  fadeIn(els.category, 0);
  fadeIn(els.title, 0.08);
  fadeIn(els.alias, 0.15);
  fadeIn(els.intro, 0.24);
  fadeIn(els.introSub, 0.32);
  fadeIn(bodyWrap, 0.4);
  // #palette/#tags 的 ul 初始 opacity 为 0,必须淡入 ul 本身
  fadeIn(paletteEl, 0.9);
  fadeIn(tagsEl, 0.95);
  Array.from(paletteEl.children).forEach((li, i) => fadeIn(li, 1.0 + i * 0.08));
  Array.from(tagsEl.children).forEach((li, i) => fadeIn(li, 1.05 + i * 0.08));
  featureItems.forEach((li, i) => fadeIn(li, 1.2 + i * 0.3));

  // 打字机:加载完成后 0.6s 开始,常驻
  const len = config.bodyZh.length;
  const typed = REDUCED ? len : Math.min(len, Math.max(0, Math.floor((e - 0.6) * TL.typeRate)));
  bodyEl.textContent = config.bodyZh.slice(0, typed);
  cursorEl.style.opacity = REDUCED || typed < len ? "1" : "0";
}

// （底部计时进度条已按用户要求移除）

// ---------- 主循环 ----------
let rotTotal = 0; // 连续旋转相位（不重置，避免衔接瞬跳）
let phaseTotal = 0; // 连续浮动相位
let last = performance.now();
let fpsSum = 0, fpsN = 0;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;

  updateFlow(dt);

  // 粒子相位由展示流程控制;模型自动旋转在下方按拖拽状态推进
  phaseTotal += dt;
  uniforms.uTime.value = phaseTotal; // 粒子闪烁/漂移动画继续

  if (FIX_T !== null) {
    // 调试冻结(?t=5.2):phase 按原时间线映射,便于截图验证
    const tt = FIX_T;
    uniforms.uPhase.value = smooth(0.08, 3.73, tt) * (1 - smooth(7.4, 9.9, tt));
    uniforms.uPhaseFade.value = 1 - smooth(8.8, 9.75, tt);
  } else if (REDUCED) {
    // 减少动态:成形稳定展示
    uniforms.uPhase.value = 1;
    uniforms.uPhaseFade.value = 1;
  } else {
    // 进入自动升起;翻页(滚动/切走)时消散;平时成形旋转不变
    uniforms.uPhase.value = flow.phase;
    uniforms.uPhaseFade.value = 1;
  }

  // 模型:自动旋转(拖拽时暂停)+ 极轻微浮动,固定在展示位
  if (!dragRot.active) rotTotal += dt * STAGE.rotationSpeed;
  group.rotation.y = rotTotal + dragRot.angle;
  const baseY = IS_PORTRAIT() ? STAGE.portraitCenterY : 0; // 竖屏模型下移
  group.position.y = baseY + Math.sin(phaseTotal * 0.6) * STAGE.floatAmp;
  group.position.x = baseX;

  updateText(dt);

  composer.render();
  fpsSum += dt; fpsN++;
  requestAnimationFrame(frame);
}

restartBtn.addEventListener("click", () => {
  // 重新升起(慢速入场动画;模型继续旋转)
  setPhase(1, 0.45);
});
document.getElementById("reload").addEventListener("click", () => location.reload());

// 页面卸载时释放 GPU 资源（Geometry / Material / RenderTarget / 纹理）
window.addEventListener("beforeunload", () => {
  try {
    if (pointsMain) {
      pointsMain.geometry.dispose();
      pointsMain.material.dispose();
    }
    bloomPass.dispose();
    composer.dispose();
    renderer.dispose();
  } catch (e) { /* 卸载路径忽略释放异常 */ }
});

// ---------- 运行诊断 ----------
function reportDiagnostics() {
  if (!pointsMain) return;
  const w = window.innerWidth, h = window.innerHeight;
  const g = pointsMain.geometry;
  const diagLayoutScale = IS_PORTRAIT()
    ? Math.max(0.45, Math.min(1.1, w / 700))
    : Math.min(w / RV.width, h / RV.height);
  // 粒子坐标范围(验证 GLB/data 两种模式坐标系一致)
  let pMin = [1e9, 1e9, 1e9], pMax = [-1e9, -1e9, -1e9];
  const posAttr = g.attributes.position;
  const posArr = posAttr.array;
  for (let i = 0; i < posAttr.count; i++) {
    for (let k = 0; k < 3; k++) {
      const v = posArr[i * 3 + k];
      if (v < pMin[k]) pMin[k] = v;
      if (v > pMax[k]) pMax[k] = v;
    }
  }
  const coordRange = pMin.map((v, k) => [+v.toFixed(3), +pMax[k].toFixed(3)]);
  const layoutScale = diagLayoutScale;
  const cssPoint = REF * (h / RV.height);
  const physPoint = cssPoint * renderer.getPixelRatio();
  // 模型屏幕包围盒与文字安全间距
  const box = new THREE.Box3().setFromObject(group);
  const projMin = box.min.clone().project(camera);
  const projMax = box.max.clone().project(camera);
  const sx = (projMin.x + 1) / 2 * w, sx2 = (projMax.x + 1) / 2 * w;
  const sy = (1 - projMin.y) / 2 * h, sy2 = (1 - projMax.y) / 2 * h;
  const textRect = textPanel.getBoundingClientRect();
  const gapPx = Math.max(0, textRect.right < sx ? sx - textRect.right : textRect.right - sx);
  console.log("[showcase] 运行诊断", JSON.stringify({
    实际粒子数量: g.attributes.position.count,
    GLB网格数量: meshStats.meshCount,
    三角形数量: meshStats.triCount,
    模型包围盒: bboxSize ? (bboxSize.toArray ? bboxSize.toArray() : bboxSize) : null,
    粒子坐标范围: coordRange,
    Draco: "已配置（模型未压缩，未触发）",
    贴图UV采样: meshStats.texMeshes > 0 ? `已启用（${meshStats.texMeshes}/${meshStats.uvMeshes} 个 mesh 成功读取贴图/UV）` : "未读取到贴图，已回退到材质色",
    基准视口: RV,
    当前Canvas: [w, h],
    layoutScale: +layoutScale.toFixed(4),
    particleViewportScale: +(h / RV.height).toFixed(4),
    基础点尺寸: REF,
    有效CSS点尺寸: +cssPoint.toFixed(3),
    有效物理点尺寸: +physPoint.toFixed(3),
    渲染器像素比: renderer.getPixelRatio(),
    "页面scrollWidth/Height": [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    正文行数: bodyEl.getClientRects ? bodyEl.getClientRects().length : "-",
    模型屏幕包围盒: [+sx.toFixed(1), +sy.toFixed(1), +sx2.toFixed(1), +sy2.toFixed(1)],
    文字模型最小间距px: +gapPx.toFixed(1),
    平均帧率: fpsN ? (fpsN / fpsSum).toFixed(1) : "-",
    减少动态模式: REDUCED,
    冻结时间: FIX_T,
  }, null, 2));
}
