# ============================================================
# CLAUDE.md — 繁荣昌盛 · 四季山水圆盘点云展陈页
# ============================================================

## 项目概述
深色展览风格的 3D 点云展陈页:加载预采样粒子数据,粒子聚合成一个
圆盘器物(中心"繁荣昌盛"金字 + 四季山水),模型持续自动旋转。

- 线上地址(GitHub Pages):https://2188195028-crypto.github.io/medallion-pointcloud/
- 本地运行:`python tools/serve_debug.py 8137` → http://127.0.0.1:8137/
- 本地一键启动:双击 `start.bat`
- 仓库:github.com/2188195028-crypto/medallion-pointcloud(分支 master,SSH push)

## 展示流程(用户最终确认的交互逻辑)
1. 进入页面:粒子自动缓缓升起成形(入场动画 ~2.2s)
2. 平时:模型保持旋转、成形展示不变(无计时、无自动循环)
3. **鼠标/触摸拖拽:模型左右旋转(按住暂停自转,松手 4s 无操作后从当前角度恢复自转)**
4. 滚轮滚一下 / 手指滑一下(>80px/60px 位移):粒子渐进消散(~2s,落地)
5. 反方向滚 / 反向滑:粒子缓慢回升
6. 点击/轻触:不触发任何效果(防误触)
7. 页面切走/关闭:消散;回到页面:重新升起
8. 重启按钮:重新升起

## 文件结构
- index.html — 页面骨架(文字区/底部栏/loading/error/file:// 检测)
- showcase.css — 深色展览主题 + 竖屏(手机)媒体查询
- showcase.js — 全部逻辑(着色器/粒子/流程控制/交互)
- showcase-config.js — 所有文案/颜色/模型/时间参数(改内容先改这里)
- assets/particles.bin — 18 万粒子预采样数据(3.96MB,data 模式加载;渲染前在浏览器端均匀抽取到 6 万)
- assets/three/ — 本地 three.js r184 全套(离线可用)
- assets/models/prosperity.glb — GLB 副本(111MB+,**不入库**,仅本地)
- assets/reference.jpg — 参考照片(232KB,**入库**,粒子取色源,必须随仓库部署)
- tools/serve_debug.py — 本地服务器 + /shot /diag 调试接口
- tools/prepare_particles.py — GLB → particles.bin 预采样脚本
- tools/verify.js — 多视口浏览器回归验证(Playwright)
- tools/final-check.js — 循环/重启验证
- tools/time-load.js — 加载耗时测量
- shots/ — 验证截图与报告(不入库)

## 核心机制

### 双模式加载(config.mode)
- mode="data"(默认):fetch particles.bin → 解码 → **均匀抽取到 config.particleCount(6万)**
  → 渲染。快(本地 0.9s)。bin 头部 count 校验用 config.binParticleCount(18万)。
- mode="glb":浏览器内加载 GLB 并采样(开发用,直接采 config.particleCount)。
  URL 加 ?mode=glb 可临时切换。

### 粒子精简与取色(showcase.js)
- `decimateToTarget()`:部分 Fisher-Yates 无放回抽取,保持 8 个属性数组对齐,
  表面/细节(85/15)比例统计不变。
- **照片取色(默认)**:`applyPhotoColors()` 按粒子盘面坐标 (x,y) 采样
  assets/reference.jpg(照片圆盘几何硬编码在 config.photoCenter/photoRadius,
  实测:1290×1315 图,圆心 (640,630),半径 ~545,正圆)。原因:模型贴图缺失
  照片的蓝色域(照片左侧黛蓝雪山/右上朱红秋山,模型贴图对应区域是绿/金),
  任何色板重映射都补不出蓝色,必须直接取照片像素。
- 照片加载失败时回退 `remapColorsToPalette()`(config.paletteRemap 13 色)。
- 照片需随仓库入库(GitHub Pages 部署时必须包含 assets/reference.jpg)。

### 拖拽旋转(showcase.js 的 dragRot)
- pointerdown 按下 → pointermove 累计 angle(dx × 0.006) → 按住时暂停自转
  (rotTotal 冻结,仅 dragRot.angle 生效)→ 松手 4s(ROT_IDLE_RESUME_MS)无操作
  把 angle 并入 rotTotal 恢复自转。
- 与滚轮/滑动手势正交,互不影响;点击(位移≈0)不旋转。

### 粒子数据格式(particles.bin,与 prepare_particles.py 严格对应)
```
header 40B: "PTCL" u32 | version u32 | count u32 | meshCount u32 | triCount u32
            totalArea f32 | bboxSize f32×3 | scale f32
targets: f32 × count × 3    (模型局部坐标,已归一化 ±1)
normals: u8  × count × 3    ((n+1)/2×255)
colors : u8  × count × 3
meta   : u8  × count × 4    [seed, delay, edge, size] 量化
```

### 着色器(uPhase 统一输入)
- uPhase: 0=散开 1=成形。rise = clamp(uPhase*1.8 - aDelay*0.8);
  dissolve = clamp((1-uPhase)*1.8 - (1-aEdge)*0.5);呼吸随 rise 缩放。
- uTime: 闪烁/漂移动画(连续相位累加器,跨状态不重置)。

### 流程控制(showcase.js 的 flow 对象)
- setPhase(target, speed):speed=0.45 入场/回升(约 2.2s),0.5 消散(约 2s)
- 滚轮:450ms 窗口累计 |deltaY|>80 触发一次;触摸:单次手势总位移 >60px 触发一次
  (重要:触摸用"手势起止总位移"判定,轻触/点击位移≈0 不会误触发)

### 布局与适配
- 桌面:左文右图(文字 7vw/9.5vh/32vw,模型中心 ~72% 视口,modelXFraction=0.505)
- 竖屏(手机):文字上移(7vw/5.5vh/86vw),模型居中缩小(portraitScale 0.55,
  portraitCenterY -0.12);layoutScale 竖屏按 max(0.45,min(1.1,w/700))
- 触屏设备:关 Bloom、DPR≤1.5

## 更新模型的完整流程(重要!)
1. 用户把新 GLB 放到 D:\BaiduNetdiskDownload\天空之城素材包\资产\幻想欧式天空建筑\
2. 修改 tools/prepare_particles.py 的 SRC 指向新文件
3. 运行 `python tools/prepare_particles.py`(生成新 assets/particles.bin)
4. 检查输出:粒子数=180000、归一化坐标约 ±1(注意 bbox 尺寸变化)
5. 浏览器验证(见下),必要时调整 config 的 modelRotation/stage
6. `git add -A && git commit && git push`(SSH remote),等 Pages 构建 ~2-3 分钟
7. 线上验证

### 模型已知问题
- 第三/四次 GLB 导出**丢失了主 mesh 的 UV**(只有 POSITION/NORMAL)!
  prepare_particles.py 用 planar 投影兜底(沿最薄轴投影贴图中央)。
  如果用户能重新导出带 UV 的版本,取色会更精确。
- 模型为薄圆盘面朝 ±X,modelRotation = [0, -π/2, 0]。
- 材质 0/1 的 baseColorTexture 带非法值 texCoord:-1(浏览器 GLB 模式可能受影响,
  data 模式不受影响)。

## 验证清单(改动后必须做)
1. `node --check showcase.js && node --check showcase-config.js`
2. 本地服务器跑起来,Playwright 打开验证:
   - `node tools/verify.js`(多视口布局回归,~3 分钟)
   - 交互流程:进入升起→稳定→滚轮消散→反向回升(对比像素分布)
3. 控制台零错误(pageerror 监听)
4. 粒子数 = 90000(console 日志"实际粒子数量";bin 校验 = 180000;
   6万偏稀,9万饱满且不杂乱,18万过密)
5. 视觉抽查:用 ai-router 的 Kimi 视觉模型看截图(Read 图片经常显示失败,
   用 mcp__ai-router__ai_router_chat 传图片路径)
6. 手机:Playwright isMobile+hasTouch 视口 390×844,长按/滑动/布局检查

## 调试工具
- `?t=5.2` 冻结相位(按原时间线映射,截图验证用)
- `?solid=1` 渲染实体模型(朝向验证)
- `?shot=1` 渲染稳定后 canvas 像素 POST /shot 存 shots/latest.png
  (toBlob 必须双 rAF 内抓取,否则全黑)
- `?debug=1` 输出模型矩阵(坐标系排查)
- `?mode=glb` 临时切 GLB 采样模式

## 部署(GitHub Pages)
```bash
git add -A && git commit -m "..." && git push origin master
# 等 2-3 分钟构建,验证 https://2188195028-crypto.github.io/medallion-pointcloud/
```
- HTTPS push 常超时(网络),已切 SSH:
  `git remote set-url origin git@github.com:2188195028-crypto/medallion-pointcloud.git`
- gh 已登录(2188195028-crypto,keyring),Pages 用 master 分支根目录

## 已知坑(踩过并修复的)
1. CSS `#error { display:flex }` 覆盖 hidden 属性 → 错误面板常驻遮屏。
   必须有 `#error[hidden] { display:none }`
2. `#palette/#tags` ul 初始 opacity:0,淡入目标必须是 ul 本身(不是外层 wrap)
3. canvas.toBlob 在 WebGL preserveDrawingBuffer=false 时,rAF 外抓取全黑
4. 归一化坐标系:必须顺序变换(居中→rotY(-π/2)→缩放),用 Minv 会放大 1.4×
4.5. 帧循环里"拖拽暂停自转"时,必须删除原 `rotTotal += dt * rotationSpeed`
     行(只留条件推进那一处),否则暂停失效且转速翻倍(实测踩过)
5. 无 UV 模型必须 planar 投影兜底,否则全部粒子 fallback 米白
6. 2560 宽屏正文 40em max-width 会限制行宽导致异常换行(已删)
7. 手机"点击"带几像素抖动,触摸触发必须用手势总位移判定(>60px)
8. 入场/消散缓动太快要区分:入场 0.45/s 慢速可见,消散 0.5/s 渐进
9. file:// 双击打开:模块被 CORS 拦截,页面加内联脚本检测并提示用 start.bat

## 文案/参数修改入口(showcase-config.js)
- 文案:categoryEn/titleZh/aliasEn/introZh/introSubZh/bodyZh/features/palette/craftTags
- 模型:mode/particleDataPath/modelPath/modelRotation
- 舞台:stage(fov/distance/modelXFraction/portraitScale 等)
- 竖屏/触屏参数也在 stage 与 showcase.js 的 TOUCH_DEVICE 逻辑中

## 版本
- v1.0-interactive(标签):进入升起/平时旋转/滚轮滑动渐进消散/手机适配
