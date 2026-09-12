# ============================================================
# CLAUDE.md — 繁荣昌盛 · 四季山水圆盘点云展陈页
# ============================================================

## 项目概述
深色展览风格的 3D 点云展陈页:加载预采样粒子数据,粒子聚合成一个
圆盘器物(中心"繁荣昌盛"金字 + 四季山水),模型持续自动旋转。

- 线上地址(GitHub Pages):https://2188195028-crypto.github.io/medallion-pointcloud/
- **双击 index.html 直接可用(file://)**:全部静态资源走 jsDelivr CDN 绝对地址,
  无需本地服务器(2026-08-04 v1.4 起)。离线开发仍可用
  `python tools/serve_debug.py 8137` 或双击 `start.bat`
- **CDN 分两个主机(v1.9 起)**:three 模块走 `cdn.jsdelivr.net`(index.html importmap),
  bin/照片/实景图走 **`gcore.jsdelivr.net`**(config.cdnBase)——图片走 cdn 会被 301 到
  国内不可达的 raw.githubusercontent.com(已知坑 22)。**别为了"统一主机"把这俩合并**
- 加载时长:CDN 热缓存 ~10s(冷缓存首次 ~28s,看门狗 45s 覆盖)
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
- index.html — 页面骨架(文字区/底部栏/loading/error/importmap + CDN 引导脚本 + 45s 加载看门狗)
- showcase.css — 深色展览主题 + 竖屏(手机)媒体查询
- showcase.js — 全部逻辑(着色器/粒子/流程控制/交互)
- showcase-config.js — 所有文案/颜色/模型/时间参数(改内容先改这里)
- assets/particles.bin — 9 万粒子预采样数据(1.98MB,data 模式加载;与渲染数一致,无需抽取)
- assets/three/ — 本地 three.js r184 全套(离线可用)
- assets/models/prosperity.glb — GLB 副本(111MB+,**不入库**,仅本地)
- assets/reference.jpg — 参考照片(232KB,**入库**,粒子取色源,必须随仓库部署)
- assets/wall-before.webp / wall-after.webp — 落地实景照片(店面前后对比,**入库**)
- tools/serve_debug.py — 本地服务器 + /shot /diag 调试接口
- tools/prepare_particles.py — GLB → particles.bin 预采样脚本
- tools/verify.js — 多视口浏览器回归验证(Playwright + 系统 Edge 的 msedge 通道;
  含每视口开一次擦除舞台的几何断言:两图加载/mask 生效/补偿落到布局/舞台不溢出)
- tools/shot-realwall.js — 落地实景「擦除对比」全流程交互验证(两入口/滚轮/键盘/
  触摸/Esc/背景/两图加载/粒子守卫+对照组;桌面 1600×900 + 手机 390×844)
- **两个测试脚本都支持 RW_LOCAL=1**:发布前新 tag 未推出时,由测试侧拦截 CDN 用工作区
  文件应答(importmap 无法表达回退,否则 three 404 → 整页起不来,verify 直接超时)。
  不设该变量走真实链路,发布后的线上回归用默认模式。
- PROJECT_STATUS.md — 项目状态与执行记录(需求/资产/验收/问题-修复-复测表)
- shots/ — 验证截图与报告(不入库)
- (tools/final-check.js、time-load.js 已删:验证对象与职责已被 verify.js 吸收)

## 核心机制

### 双模式加载(config.mode)
- mode="data"(默认):fetch particles.bin(CDN 优先,15s 超时回退本地) → 解码
  → 渲染。bin 与渲染数一致(9 万),`decimateToTarget()` 为 no-op(保留兼容)。
  bin 头部 count 校验用 config.binParticleCount。
- mode="glb":浏览器内加载 GLB 并采样(开发用,直接采 config.particleCount)。
  URL 加 ?mode=glb 可临时切换。**GLTF/DRACO 加载器是动态 import 的,仅在
  glb 模式加载**(省 ~400KB 解析,data 模式主路径不加载)。

### 粒子精简与取色(showcase.js)
- `decimateToTarget()`:部分 Fisher-Yates 无放回抽取(18万→6万时期遗留;
  现 bin 即 9 万,调用为 no-op)。若未来 bin 大于渲染数,可改 config 复用。
- 粒子数量经验:6万偏稀(覆盖 13.2%),9万饱满不杂乱(16.9%),18万过密。
- **照片取色(默认)**:`applyPhotoColors()` 按粒子盘面坐标 (x,y) 采样
  assets/reference.jpg(照片圆盘几何硬编码在 config.photoCenter/photoRadius,
  实测:1290×1315 图,圆心 (640,630),半径 ~545,正圆)。原因:模型贴图缺失
  照片的蓝色域(照片左侧黛蓝雪山/右上朱红秋山,模型贴图对应区域是绿/金),
  任何色板重映射都补不出蓝色,必须直接取照片像素。
- 照片加载失败时回退 `remapColorsToPalette()`(config.paletteRemap 13 色)。
- 照片需随仓库入库(GitHub Pages 部署时必须包含 assets/reference.jpg)。
- **CDN "挂起"超时兜底(8s)**:jsDelivr 对不存在的 tag / 资源偶发"挂起"
  (请求不成功也不失败、onerror 永不触发,本项目多次实测)→ 8s 未成功则换本地
  相对路径重试(clearTimeout 于 onload/onerror;本地再失败才回退色板)。

### 落地实景(realwall,店面前后「擦除对比」,v1.8 起)
- config.realwall 是**对象**{before, after, align, feather, wheelStep, touchDistance}
  → 缩略图 button(.realwall-thumb,aria-label)仍注入 #realwall-thumbs;
  index.html 静态写好 #realwall-overlay(单张 .realwall-stage,内嵌 .realwall-frame
  叠放 #realwall-before/#realwall-after 两图)。**v1.7 的 .realwall-fig 双图结构已废弃。**
- 擦除对比:before 在文档流撑开画框,after 绝对定位叠上层,靠 mask 横向渐变揭示。
  `--wipe-edge` 0→1;擦除进度写在 overlay 的 **dataset.wipe**(供测试读,别去解析
  mask 字符串)。三驱动:滚轮(deltaY×wheelStep)/触摸(竖向位移映射横向)/
  键盘(←→ 各 0.08、Esc 关闭、Tab 焦点圈定)。缩略图两个入口:点「改造前」从
  wipe=0 进,点「落地后」从 wipe=1 进。
- **对齐补偿必须走 config,不在 CSS 里改**:JS 把 align 折算成 --rw-scale /
  --rw-offset-y / --rw-feather 注入 overlay 的 CSS 变量(CSS 内 var() 默认值只是兜底)。
  源图宽高比不同(before 912×1148 / after 1000×1275),scale 定义在"渲染宽之比"上,
  **改 before/after 源图必须重新量 align**,详见 showcase-config.js 的 realwall.align 注释。
- **羽化带是承重结构不是装饰**:硬接缝处仍留 1-4px 残余错位(before 横线自身还有
  ~1.9° 倾斜,scale+offset 校正不了旋转),靠 6% 羽化盖掉;换 clip-path / 调小 feather
  会把残余暴露成可见镶边。
- **交互守卫**:overlay 打开期间(realwallIsOpen)滚轮/触摸手势不得触发粒子消散。
  这条由 shot-realwall.js 断言(读 window.__flow.phase),且配了对照组(关掉 overlay
  后同样滚轮必须能消散/回升)防假绿。
- CDN 失败回退与照片同构:error 事件 + 8s 挂起超时,dataset 标记防死循环
  (attachRealwallFallback,缩略图与大图共用)。
- **要加/换实景图**:改 config.realwall 的 before/after(两张需同机位)→ 重新测 align
  → 复跑 shot-realwall.js 与 verify.js(两图加载、mask 生效、舞台不溢出、尺寸比断言)。

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
- 桌面:左文右图(文字位置由 JS 从 config.referenceTextLayout 注入
  --text-left/--text-top/--text-width=7vw/7vh/32vw,CSS 内 var() 默认值只是兜底——
  改文字位置改 config 而非 CSS;模型中心 ~72% 视口,modelXFraction=0.505)
- 竖屏(手机):文字上移(text-panel top 1.6vh,CSS portrait 块字面值盖过变量),
  模型居中缩小(portraitScale 0.55,portraitCenterY -0.12);layoutScale 竖屏按
  max(0.45,min(1.1,w/700))
- **竖屏文字顺序(v1.6)**:#text-panel 在 portrait 媒体查询内改为 flex 纵向,
  用 order 把 #meta(主要颜色/工艺线索)移到 #body-wrap(正文/四季山水)上方,
  避免被模型遮挡。桌面端不受影响(order 只在竖屏生效)。
- **竖屏压缩(v1.6 tag)**:realwall 缩略图上架后把 #meta 撑高,正文末行与特征词
  会被压入粒子稠密盘面 → portrait 块内:panel top 3.5vh、缩略图 21vw→13vw、
  #features 改横排 flex-wrap、#counter 最小字号 12px(layout-scale 会缩到 ~7px)。
  改 portrait 布局后必须复跑 verify D 组(几何:features 底须高于盘面稠密区顶)。
- **桌面静止态收容(v1.7 tag)**:独立审核 BLOCKER——静止态(打字完成)实景缩略图
  压进底栏(0-3px 可见,2560 档重叠达 188px)。修复:text-panel top 9.5→7vh
  (config)、realwall label+缩略图改横向一行、缩略图 76×95→56×66、#body
  line-height 1.9→1.8、features/meta/palette/tags 的 li 与 .meta-label 显式
  line-height(继承 1.9 时 19px 字会变成 36px 行,是溢出主因)、区块间距按
  0.2-0.4×gapBlock 收紧。改文字区任何尺寸/行高后,静止态收容断言(缩略图底
  ≥ barTop−8)必须全绿。
- **手机字号下限(v1.7 tag)**:layout-scale≈0.557 会把 12px 参考字号缩到 6.7px
  (审核 HIGH),正文/特征词/标签/图注加 max(calc(Npx×scale), 11/12/10/10px)
  地板;配合 portrait 收紧(panel 1.6vh、meta gap 6px 等)把 features 底抬到
  364.2(稠密盘上缘 378,留 13.8px)。
- 触屏设备:关 Bloom、DPR≤1.5

## 更新模型的完整流程(重要!)
1. 用户把新 GLB 放到 D:\BaiduNetdiskDownload\天空之城素材包\资产\幻想欧式天空建筑\
2. 修改 tools/prepare_particles.py 的 SRC 指向新文件(N_PARTICLES 保持 90000)
3. 运行 `python tools/prepare_particles.py`(生成新 assets/particles.bin,~2MB)
4. 检查输出:粒子数=90000、归一化坐标约 ±1(注意 bbox 尺寸变化)
5. 浏览器验证(见下),必要时调整 config 的 modelRotation/stage
6. 按"部署"流程发布(commit → tag → push → 预热 CDN → 线上验证)

### 模型已知问题
- 第三/四次 GLB 导出**丢失了主 mesh 的 UV**(只有 POSITION/NORMAL)!
  prepare_particles.py 用 planar 投影兜底(沿最薄轴投影贴图中央)。
  如果用户能重新导出带 UV 的版本,取色会更精确。
- 模型为薄圆盘面朝 ±X,modelRotation = [0, -π/2, 0]。
- 材质 0/1 的 baseColorTexture 带非法值 texCoord:-1(浏览器 GLB 模式可能受影响,
  data 模式不受影响)。

## 验证清单(改动后必须做)
1. `node --check showcase.js && node --check showcase-config.js`
2. 本地服务器跑起来(`python tools/serve_debug.py 8137`),Playwright 打开验证
   (**发布前**先加 `RW_LOCAL=1`,否则新 tag 未推出 → three 404 → 整页起不来):
   - `RW_LOCAL=1 node tools/shot-realwall.js`(擦除对比全流程 + 粒子守卫/对照组)
   - `RW_LOCAL=1 node tools/verify.js`(多视口布局回归,~2 分钟;内含 errorVisible
     断言——看门狗 error 面板出现即判失败,杜绝"面板后假绿";v1.7 起静止态
     契约:waitBody 等打字机 103 字打满再采集,收容断言=桌面缩略图底
     ≥ barTop−8、meta 底 ≤ 视口高、手机 features 底 ≤ 376 且字号 ≥ 11/10/12;
     v1.8 起每个视口开一次擦除舞台,断言 after 宽 = before×1.015、纵向偏移
     = 0.6969%×before 高、舞台整体不溢出视口)
   - 交互流程:进入升起→稳定→滚轮消散→反向回升(由 shot-realwall.js 对照组覆盖)
3. 控制台零错误(pageerror 监听)
4. 粒子数 = 90000(console 日志"实际粒子数量";bin 校验 = 90000)
5. 视觉抽查:用 ai-router 的 Kimi 视觉模型看截图(Read 图片经常显示失败,
   用 mcp__ai-router__ai_router_chat 传图片路径)
6. 手机:Playwright isMobile+hasTouch 视口 390×844,长按/滑动/布局检查
7. file:// 双击本地 index.html(无需服务器),~10s 内"实际粒子数量"出现
8. 线上加载 <15s(CDN 热缓存),控制台无 "CDN 加载失败" 警告

## 调试工具
- `?t=5.2` 冻结相位(按原时间线映射,截图验证用)
- `?solid=1` 渲染实体模型(朝向验证)
- `?shot=1` 渲染稳定后 canvas 像素 POST /shot 存 shots/latest.png
  (toBlob 必须双 rAF 内抓取,否则全黑)
- `?debug=1` 输出模型矩阵(坐标系排查)
- `?mode=glb` 临时切 GLB 采样模式
- `?nowatchdog=1` 跳过 45s 加载看门狗(见部署段)
- `?v=<任意>` 页面忽略、仅作缓存破除(verify 每组带不同值防同 URL 缓存)

## 部署(GitHub Pages + jsDelivr CDN)
**国内网络下 GitHub Pages 下载大文件极慢(实测 27-45KB/s),全部静态资源走 jsDelivr CDN:**

- index.html(2.8KB)来自 Pages;showcase.js/CSS 由 index.html 引导脚本动态 import
  jsDelivr(失败回退本地);three 模块走 importmap → **cdn.jsdelivr.net**;bin/照片/
  实景图走 cdnBase → **gcore.jsdelivr.net** 优先(15s/8s 超时或失败回退本地)。
  两个主机不是随意选的,理由见项目概述与已知坑 22。
- **每次发布必须递增 tag**(jsDelivr tag URL 不可变缓存,重复 tag 会永久缓存旧内容)。
  **发布顺序(重要,顺序错了页面会挂):**
```bash
# 1. 先改 index.html / showcase-config.js 里的 @v1.x 引用为新 tag(v1.5 → v1.6 …)
# 2. commit(此时本地页面引用的 tag 尚不存在,属正常)
git add -A && git commit -m "..."
# 3. 打 tag 并推送:先 push tag,再 push master
git tag v1.6 && git push origin v1.6 && git push origin master
# 4. 立即预热 jsDelivr(否则用户首次打开撞冷缓存 ~21s+解析 7s ≈ 28s):
#    curl 逐个拉,404 串行重试(并发预热可能被限流)。**两个主机分开预热**:
#    cdn.jsdelivr.net(data 模式实际会拉的模块):
#      showcase.js / showcase-config.js /
#      assets/three/three.module.js / assets/three/three.core.js(1.4MB,最大件)/
#      assets/three/postprocessing/{EffectComposer,RenderPass,UnrealBloomPass,Pass,ShaderPass,MaskPass}.js /
#      assets/three/shaders/{CopyShader,LuminosityHighPassShader}.js
#      (assets/three/loaders/{GLTFLoader,DRACOLoader}.js 仅 glb 模式用,预热无妨)
#    gcore.jsdelivr.net(config.cdnBase):
#      assets/particles.bin / assets/reference.jpg /
#      assets/wall-before.webp / assets/wall-after.webp
#    (注意:importmap "three/addons/" 是前缀映射,剩余部分直接拼在
#    assets/three/ 后——仓库没有 addons/ 子目录,别按 addons/postprocessing/ 拼)
# 5. 等 Pages 构建(~2-3 分钟),验证线上 + 本地 file:// 双击
```
- 常见坑:照片 CDN 加载必须 `img.crossOrigin="anonymous"`(否则 canvas tainted,
  getImageData 抛 SecurityError → 静默回退色板)。**加了 crossOrigin 之后,file:// 下
  只有真带 CORS 头的 CDN 图能取色**:本地相对路径回退在 file:// 必被 null origin 拦掉
  (实测 `from origin 'null' has been blocked by CORS policy`),所以"双击打开颜色是否
  正确"完全取决于 cdnBase 那台主机可达且不被重定向(见已知坑 22)。
- 加载看门狗:45s 未初始化显示错误提示(避免 HR 卡转圈;25s 会误报——
  冷缓存 21s+解析 7s ≈ 28s)。URL 加 ?nowatchdog=1 可跳过看门狗(调试/自动化
  测试用:发布前 CDN 挂起漂移可把加载拖到 45s+,error 面板会遮屏拦点击)。
- **CDN 挂起三种表现**:对不存在的 tag,jsDelivr 行为逐次不定——快速 404、
  重定向 raw.githubusercontent 后 ERR_BLOCKED_BY_ORB、或干脆挂起不返回
  (error 永不触发)。验证脚本按 host 归因(jsDelivr + githubusercontent 的
  404/失败 = 发布前预期;本地 host 出现 4xx 才是真问题)。
- **备用 CDN 可达性会变,换主机前必须重新 curl 验证**(旧结论会过期):
  2026-09 早期一轮实测 fastly/gcore/testingcf.jsdelivr.net 与 statically.io 全部超时;
  **2026-09-12 复测 gcore 全通**——showcase.js / particles.bin / reference.jpg 各 3 次
  全 200(0.7-2.8s),且带 `ACAO:*`,是唯一不被图片 301 影响的镜像,v1.9 的 cdnBase
  因此定在 gcore。**别拿这一行当"gcore 不可用"的依据**(当时的实测是真的,现在不成立)。
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
9. file:// 双击打开:资源全走 CDN 后可直开;但本地相对路径回退
   (./showcase.js)在 file:// 下会被 CORS 拦截,该回退仅服务器场景有效。
   离线时 file:// 无法加载(看门狗 45s 提示)
10. 看门狗 25s 误报事故:jsDelivr 冷缓存 ~21s + 模块解析 ~7s ≈ 28s 超过 25s,
    页面正常加载却被判"超时"。教训:冷缓存场景给足余量(45s),发布后必预热
11. jsDelivr tag 未推送前页面必挂:本地引用 @v1.x 而 tag 不存在 → 模块 404。
    发布顺序必须是 commit → tag → push tag → push master → 预热
12. 分析参考照片颜色时,PIL 量化被大面积低饱和底色骗了(误判"象牙白+金")。
    真实是浓艳工笔重彩(右上朱红/左侧黛蓝)。教训:量化 + 视觉模型 + 空间分布
    三路交叉验证;色相取模公式有边缘 bug(蓝紫被算成品红),通道比较法更可靠
13. 参考照片/实景图 CDN "挂起"无兜底 → 页面停在 loading 直到看门狗弹错误面板。
    所有 CDN 资源回退必须配超时(实景图/照片 8s、bin 15s abort),不能只靠
    onerror——jsDelivr 挂起时 onerror 永不触发
14. 竖屏 layout-scale≈0.55 会把 12px 参考字号缩到 ~7px(counter/标签不可读)。
    功能状态类文字(编号)需 max(calc(), 下限)保护;正文/特征词靠竖屏压缩
    (features 横排等)抬出粒子稠密区,不能只缩字号
15. verify.js 报"本地资源 4xx"含 raw.githubusercontent.com 时,先确认是
    jsDelivr 302 重定向目标(发布前预期链路)还是真本地资源失败——归因按 host
16. #body line-height 1.9 会被 features/meta/palette/tags 的 li、.meta-label、
    实景缩略图 figcaption 继承(19px 特征词变 36px 行,桌面静止态溢出主因)——这
    类元素必须显式设自己的 line-height
17. tag 已发布后,本地页面加载的是 CDN released 版 config(jsDelivr @v1.x 命中),
    工作区改动测不到。要测本地新代码,先把 index.html/showcase-config.js 的引用
    bump 到下一 tag(如 @v1.7),CDN 404 → 回退本地文件才生效(发布前 404 属设计)
18. 回退链给 img.src 重新赋值(CDN→本地)会 abort 旧请求,其迟到的 error 事件
    仍会触发——新资源的 onerror 要防"旧请求迟到 error 误判新资源失败"
    (errCount 首错忽略/比对 src)
19. **测试里别按秒断言粒子缓动**:帧循环 `dt = Math.min(0.1, ...)` 有 100ms 上限,
   而 headless 软件渲染(--disable-gpu)跑 9 万粒子 <10fps 时 dt 帧帧触顶 →
    实测消散 2.6s 只走完 0.8、回升 2.8s 只走完 0.66,**是测试环境产物不是产品缺陷**
    (真机 30fps+ 不触顶,标称 0.45/0.5 每秒成立)。一律用 waitForFunction 等状态,
    别用 waitForTimeout 等时间
20. **发布前跑测试必须 RW_LOCAL=1**:index.html 的 importmap 把 three 指向 CDN 版本
    tag,而 importmap **无法表达回退**(showcase.js/config/图片都有本地回退,唯独
    它没有)→ 新 tag 未推出时 three 404,整页起不来,verify.js 只表现为 waitForReady
    超时 180s,看不出根因。兜底放测试侧(拦截 CDN 用工作区文件应答),不改生产代码
21. 实景图对齐补偿**不能靠自动化测量复核**:before/after 是"毛坯墙 → 满墙彩绘",
    共同结构太少——梯度 MAE 全网格只差 ±0.4%(不可分辨)、SAD 与 1D 剖面搜索的
    最优解都钉在搜索边界、NCC 峰值弱且各带乱跳(0.22-0.60)。视觉模型也只对相对
    判断可靠(本轮它把故意错位的对照图判成"最自然",不能当基准)。结论:保持
    config 里那组实测值不动,残余错位由羽化盖住;**要改必须先有新的可靠测量方法**
22. **jsDelivr 自 2024 年起把"图片类"资源 301 重定向到 raw.githubusercontent.com**
    (jsdelivr/jsdelivr#18420),国内大概率不可达;而 cdnBase 同时供 reference.jpg
    与两张实景 webp 使用。此问题至少影响 v1.6-v1.8,2026-09-12 发 v1.8 做线上验证时
    才发现。301 是**恒定**的,之后能否拿到图取决于 raw 域名可达性(国内时通时断)。
    实际后果:① file:// 双击照片取色**大概率失效**——raw 慢/不通时回退本地,而本地
    回退的 img 带 crossOrigin=anonymous,撞 file:// 的 null origin CORS 被拦 → 粒子
    静默退回色板重映射(颜色布局就错了);② 该图片请求在国内不是快速失败而是
    **挂起 >60s**(实测),只靠 8s 兜底救回,线上首屏白等 8s(桌面 11.9s vs 手机
    4.8s 的差就是这个)。
    修法:cdnBase 换 **gcore.jsdelivr.net**(不参与该重定向;实测 200 + ACAO:* +
    crossOrigin 取色 1.5s 通过)。**three 模块在 cdn.jsdelivr.net 上是 .js,不受影响,
    不要"顺手统一"到 gcore**(两主机各有理由,见项目概述)。测试侧配套:两个脚本的
    CDN 拦截通配是 `**/*.jsdelivr.net/**`(覆盖两个 host),新增 CDN 主机时要同步放宽

## 文案/参数修改入口(showcase-config.js)
- 文案:categoryEn/titleZh/aliasEn/introZh/introSubZh/bodyZh/features/palette/craftTags
- 模型:mode/particleDataPath/modelPath/modelRotation
- 舞台:stage(fov/distance/modelXFraction/portraitScale 等)
- 竖屏/触屏参数也在 stage 与 showcase.js 的 TOUCH_DEVICE 逻辑中

## 版本
- v1.0-interactive(标签):进入升起/平时旋转/滚轮滑动渐进消散/手机适配
- v1.1:颜色按参考照片取色(照片即色板,几何硬编码)+ 粒子精简 9 万 + 拖拽旋转
- v1.2:CDN 加速(bin 走 jsDelivr,15s 超时回退本地)
- v1.3:three 模块 + 主模块走 CDN;修复照片跨域污染(crossOrigin);看门狗
- v1.4:看门狗 25s→45s(防冷缓存误报)+ 模块加载自动重试;file:// 双击直开
- v1.5(标签):移除右下角"重启"按钮(index.html 删 button,showcase.js 删监听)
- v1.6(标签 a229998,2026-09-05):竖屏 order 重排 + **落地实景 realwall**
  (前后对比大图 overlay + CDN error/8s 挂起回退)+ 竖屏压缩(缩略图 13vw/
  features 横排/counter 最小字号)+ 参考照片 8s 挂起兜底 + 看门狗 nowatchdog
  调试参数 + verify.js 重写(msedge 通道/errorVisible 断言/settle 等待)。
  纯 CSS 改动走 Pages 直出**不需要递增 tag**(仅改 index.html/showcase-config.js/
  showcase.js 等 CDN 引用资源才需 tag);CDN 引用资源改动需 tag 递增为 v1.7 等。
- v1.7(tag,2026-09-05):独立审核修复轮——桌面静止态收容(缩略图压底栏
  BLOCKER:text-panel top 7vh/realwall label+缩略图横排 56×66/行高间距收紧)
  + 手机字号下限(11/12/10px 地板)+ 照片 8s 看门狗竞态(errCount 防迟到 abort
  error)+ 打字完成光标停闪 + --body-subtle 对比 4.7:1 + 死代码清理。verify.js
  静止态契约(waitBody 103 字 + 收容/字号断言)。发布:tag v1.7,push tag →
  master,预热后线上验证全绿。
- v1.8(tag,2026-09-12):落地实景从「双图并排大图查看器」改造为**滚动擦除前后
  对比**——单舞台两图叠放 + mask 羽化揭示(feather 6% 承重,盖掉 1-4px 残余错位)、
  三驱动(滚轮/触摸竖向映射/键盘 ←→)、两个入口(「改造前」=0 / 「落地后」=1)、
  实测对齐补偿(config.realwall.align,见该处注释)、prefers-reduced-motion。
  测试:v1.7 遗留的 verify.js 从来看不出这次改动(它只断言缩略图 2/2),本轮补
  **每视口舞台几何断言**(实测宽比 1.0150/纵向偏移 = 0.6969%×h,五视口全中)+
  **RW_LOCAL 发布前模式**(此前发布前根本跑不了 verify,importmap 无回退);
  shot-realwall.js 重写为擦除全流程(24 项)并新增 **粒子消散守卫 + 对照组**
  (读 window.__flow.phase 钩子;对照组的必要性见已知坑 19)。
  发布:tag v1.8,push tag → master,预热后线上 + file:// 验证 —— 正是在这一步发现
  图片 301(已知坑 22),于是紧接着发 v1.9。
- v1.9(tag,2026-09-12):修复 jsDelivr 图片 301(已知坑 22)——`cdnBase` 由
  cdn.jsdelivr.net 换到 **gcore.jsdelivr.net**,恢复 file:// 双击的照片取色,并去掉
  线上首屏那 8s 兜底白等。测试侧同步:两个脚本的 CDN 拦截通配由
  `**/cdn.jsdelivr.net/**` 放宽为 `**/*.jsdelivr.net/**`,verify 的 isCdnHost 与
  缩略图 settle 判定同改(否则 bin/图片的新 host 既拦不到也不算"CDN 上游")。
  three 模块链路未动(照旧 cdn.jsdelivr.net)。
