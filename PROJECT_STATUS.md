# PROJECT_STATUS.md — 繁荣昌盛·四季山水圆盘点云展陈页

> 按《无人值守迭代创作使用说明（含提示词）.docx》§二 建立的项目状态与需求覆盖清单。
> 配套规范：《无人值守迭代创作执行规范（繁荣昌盛点云展陈页专用版）.docx》（桌面）+ 本仓库 CLAUDE.md（权威操作规范，冲突时以 CLAUDE.md 为准）。
> 最后更新：2026-09-05（v1.7 独立审核修复轮 + 发布）

## 1. Brief 覆盖清单（《点云文物提示词.txt》514 行已全读）

| Brief 条目（第一代规范） | 覆盖状态 | 现状（冲突处以此列为准） |
|---|---|---|
| 180,000 粒子固定 | 已推翻（实测） | **90000**，bin 头校验与渲染数一致 |
| 10s 自动循环时间线 | 已推翻（用户确认） | **纯交互模式**：入场升起→平时旋转→拖拽/滚轮/滑动交互；`?t=` 仅作冻结调试 |
| 面积加权采样+细节补偿 | 沿用 | prepare_particles.py：detailSamplingRatio 0.15、金字 mesh 加权 ×2、planar 投影兜底（3/4 次 GLB 丢 UV） |
| UV/顶点色/材质回退链取色 | 演进 | 现为**照片取色**（reference.jpg，photoCenter (640,630) r=540 ×0.97 内缩，双路线实测定案）；失败回退 13 色板 remapColorsToPalette |
| 1280×720 基准连续缩放 | 沿用 | referenceViewport + layoutScale；文字区连续缩放，禁离散档位 |
| 布局：左文右器、大负空间 | 沿用 | 桌面 modelXFraction 0.505（中心 72.1% 实测）；竖屏文字上移/模型居中缩小 |
| 底部"01/01"+进度线+重启 | v1.5 起移除 | 仅保留 counter；重启按钮与进度条已删（代码已清） |
| 32 条验收清单 | 沿用并演进 | 见 CLAUDE.md 验证清单 + 本文件 §4 |
| 模式限定桌面 | 已推翻 | 桌面+竖屏手机（390×844 触屏降档） |

**明确不做的**：不用图片/占位几何/预渲染冒充点云；不擅自改粒子数（90000 定档依据：60k 覆盖 13.2% 偏稀 / 90k 16.9% 饱满 / 180k 过密杂乱）。

## 2. 资产清单

| 资产 | 位置 | 状态 |
|---|---|---|
| particles.bin（90000，1.98MB） | assets/（入库） | 与渲染数一致，无需抽取 |
| reference.jpg（1290×1315 取色源） | assets/（入库） | 部署必含 |
| wall-before.webp（912×1148） | assets/（入库 v1.6） | 源 E:\ClaudeProjects\照片\_g1.png |
| wall-after.webp（1000×1275） | assets/（入库 v1.6） | 源 E:\ClaudeProjects\照片\bf258….jpg（等比缩 ×0.781） |
| prosperity.glb（111MB 第四次导出，无 UV 主 mesh） | assets/models/（仅本地，gitignore） | 源 D:\BaiduNetdiskDownload\天空之城素材包\资产\幻想欧式天空建筑\第四次.glb |
| three.js r184 全套 | assets/three/（入库） | importmap 指向 |
| 材质贴图导出副本 | ~~tools/tex_*.jpg~~ | **v1.6 已 git rm**（误入库，git 历史可恢复） |

## 3. 项目限制与验收标准清单

**限制（违反=事故）**
- GLB(111MB) 永不入库；发布必须递增 tag（jsDelivr 不可变缓存）；发布顺序 commit→tag→push tag→push master→预热 不得颠倒
- HTTPS push 不可用，remote 用 SSH；备用 CDN（fastly/gcore/testingcf/statically）全部不可达
- 粒子 90000 与 bin 校验数一致；photoCenter/photoRadius 为实测校准值，不得凭感觉改
- 验证浏览器必须 `channel:"msedge"`（chromium-1223 缓存已失效）；CSS `[hidden]` 必须显式 display:none
- 作品集（E:\ClaudeProjects\作品集）的未提交改动不得动；"墙绘项目"= 本仓库本身

**验收标准（核心，全绿才算完成）**
1. 粒子数日志 = 90000；控制台零 pageerror；无 "CDN 加载失败"
2. 四视口（1280/1366/1920/2560）布局一致（文字中心、无溢出）；390×844 竖屏触屏正常
3. realwall（v1.8 擦除对比）：缩略图 2 张加载成功（naturalWidth>0，含 CDN 404 回退路径）；两入口开门进度（改造前=0 / 落地后=1）；滚轮/键盘/触摸三驱动与两端钳位；Esc/背景关闭 + Tab 焦点圈定；**粒子消散守卫（擦除期间滚轮/触摸不得驱动消散）+ 对照组**；五视口舞台几何（after 宽=before×1.015、纵向偏移=0.6969%×before 高、舞台不溢出视口）
4. 交互：升起→旋转→拖拽→滚轮消散/回升；点击不误触
5. file:// 双击 ≤10s 出粒子；线上加载 <15s（热缓存）
6. 视觉抽查（Kimi）：构图、实景大图、文字可读

## 4. 执行记录（2026-09-05 v1.6 轮）

| 阶段 | 状态 | 结果 |
|---|---|---|
| 审计（代码/资产/工具/文档） | ✅ | 见会话记录：realwall 未实测未提交；verify.js 双失效；图片无 CDN 回退；CLAUDE.md 落后 |
| 修复 | ✅ | realwall 回退/死代码/CDN bump v1.6/verify.js 重写/仓库清理 |
| 实测 | ✅ | shot-realwall.js + verify.js + Kimi + file:// |
| 独立审核 | ✅ | 报告 1 阻断/1 高/3 中+低 → v1.7 轮全部修复复测（见下方 v1.7 独立审核轮表） |
| 发布 v1.6 | ✅ | 顺序：commit → tag → push → 预热 → 线上验证 |
| 交付 | ⏳ | CLAUDE.md 同步 + 本文件定稿 |

> 问题-修复-复测表：每轮审核发现的问题按 严重度/描述/修复/复测结果 四列追加到下方。

### 问题-修复-复测表(v1.6 实测轮追加)

| # | 严重度 | 问题(现象/根因) | 修复 | 复测结果 |
|---|---|---|---|---|
| 1 | 高 | 390×844:realwall 缩略图把 #meta 撑高,正文末行与特征词被压入粒子盘稠密区(旧布局特征词底 457.8;盘面稠密区自 ~378 起,左山体剪影至 ~219) | showcase.css portrait 压缩:panel top 5.5vh→3.5vh;缩略图 21vw/26vw→13vw/16vw;#meta margin-top 0.5×gap;#features 改横排 wrap(order3,row,0.4×gap) | 几何:features 358.3–369.3 单行、底 369.3 高出稠密盘顶 ~9px;body-wrap 287.1–352.5;打字稳定后像素色度分析+视觉复核(Qwen VL)确认文字完整、特征词在盘面边缘之上,修复前后盘面轮廓逐列扫描完全一致(证实 CSS 不动 3D 舞台) |
| 2 | 高 | 间歇整页卡死(实测约 1/4~1/5 概率,5 连跑复现 2 次):reference.jpg 的 CDN 请求被 jsDelivr"挂起"(对未发布 tag 的 ORB 行为,不成功也不失败)时,loadPhotoTexture 只有 onerror 无超时 → Promise.all 永不落定 → build 不执行 → 45s 看门狗弹错误面板;同帧 CSS 变量未注入(--layout-scale 默认 1)曾让几何探针误判为"CSS 修复失效" | showcase.js loadPhotoTexture 增加 8s 超时兜底换本地路径(与实景图 8s / 粒子数据 15s 同构;onload/onerror 均 clearTimeout;guard 防与 onerror 双触发) | 补丁后 5 连跑全部成形(粒子 90000 + layoutScale 0.5571);命中挂起的 2 次 8s watchdog 换本地后 ~11.7s 完成 build,零 45s 卡死;verify.js 五视口全绿、0 console error、0 netLocal、realwall 2/2、竖屏 order 正确 |

| 3 | 中 | 竖屏 counter("01 / 01")被 layout-scale≈0.55 缩到 ~7px 不可读(Kimi 视觉复核点名;DOM 证实文本完整只是字号过小) | showcase.css portrait 块 #counter 加最小字号下限 max(calc(12px×scale), 12px) | verify D 组全绿 + Kimi 复核 final-mobile-done.png 确认清晰可读;仅竖屏生效,桌面不受影响 |
| 4 | 高(同源 #2,不同修复点) | 实景图 webp 的 CDN 请求同样会"挂起"(verify A 组 20s 不触发 error、无回退、loaded=false),缩略图/大图共用注入路径 | showcase.js attachRealwallFallback 加 8s 超时兜底(与 photo 同构;dataset 防死循环,成功/已回退则跳过) | verify 复跑全绿(A/B/D 组 loaded=true);shot-realwall.js 桌面开/Esc/背景/大图 + 手机全 true |
| 5 | 低(工具) | verify.js 把 jsDelivr 302 重定向到 raw.githubusercontent 的预期 404 误归"本地资源 4xx"(16→15 条误报);看门狗 45s 弹 error 面板时 verify 断言照常通过(假绿风险,shot-realwall 点击被面板拦截暴露) | verify.js 按 host 归因(isCdnHost 含 githubusercontent)+ collect 加 errorVisible 断言 + 缩略图 settle 条件等待;index.html 加 ?nowatchdog=1 调试参数跳过看门狗,verify/shot-realwall 统一携带 | 复跑全绿:errors 0 / netLocal 0 / 五视口 errorVisible=false(真绿,非面板后假绿);shot-realwall exit 0 |

**探针纪律(本轮教训)**:手机态 --layout-scale 由 buildPoints→applyLayout 注入;build 未完成前为默认 1(整页字号放大、内容下移)。凡测量手机布局,必须先断言 console 出现"实际粒子数量 = 90000"或 html 内联 --layout-scale="0.5571",否则数据无效。


> 发布轮补记(2026-09-05):commit a229998 + tag v1.6 + push 完成;jsDelivr 6 条 @v1.6 URL 预热全 200;Pages 构建后验证——线上桌面热载 6.19s / 手机 390×844 全绿(layoutScale 0.5571、features 358.3-369.3、order true)/ file:// 双击 4.96s,均零 4xx、零 pageerror。注意:tag 推出后最初几分钟 jsDelivr 边缘回源未稳时,首载可能撞 45s 看门狗(实测 46s,无任何 404/error,纯慢),预热扩散后 ~6s 稳态;该场景由看门狗+重新加载按钮兜底,属预期降级路径。CLAUDE.md 文档同步与交付定稿待主会话。

### 问题-修复-复测表（v1.7 独立审核轮，主会话）

| # | 严重度 | 问题（现象/根因） | 修复 | 复测结果 |
|---|---|---|---|---|
| 6 | 阻断 | 桌面静止态实景缩略图压/裁进底栏：5 档桌面视口仅 0-3px 可见，2560 档与底栏重叠最大 ~188px。根因：#body line-height 1.9 被 features/meta/palette/tags 的 li 与 .meta-label 继承（19px 特征词=36px 行，静止态溢出主驱动）+ 文字区整体过松 | 收容：text-panel top 9.5→7vh（config referenceTextLayout，JS 注入变量盖过 CSS 默认——只改 CSS 无效）；realwall label+缩略图改横向一行；缩略图 76×95→56×66；正文 lh 1.9→1.8；各 li/.meta-label 显式 line-height（1.25-1.3）；区块 margin 按 0.2-0.4×gapBlock 收紧 | 静止态收容断言全绿：桌面 4 档缩略图底 vs 底栏空距 10.7 / 12.8 / 23.8 / 31.9px（≥8 要求），meta 底全部 ≤ 视口高 |
| 7 | 高 | 手机正文/标签/特征词被 layout-scale≈0.557 缩至 7.8 / 6.7 / 10.6px 不可读；加字号下限后 features 底下探 ~400，越入粒子稠密盘（上缘实测 378px@390×844） | 字号地板：正文 max(calc(14px×scale), 11px)、特征词 12px、标签/图注 10px（全在 showcase.css portrait 块，不改 config）；portrait 两轮收紧：panel top 2vh→1.6vh、meta margin 0.25→0.2×gapBlock、meta gap 8→6px、body lh 1.75→1.7、body-wrap 0.3→0.25、features 0.25→0.2 | verify D 组全绿：features 底 364.2（距稠密盘上缘 378 留 13.8px）；字号 11/10/12 达下限；两轮视觉复核（mobile 间隙 + 2560 宽）均通过 |
| 8 | 中×5 | (a) 照片 8s 看门狗竞态：重赋 img.src 会 abort 旧 CDN 请求，其迟到 error 早 resolve → palette 回退误触发；(b) 打字完成光标永久闪烁；(c) verify.js 冻结组 ?t=5.2 停在 85/103 字、无收容断言（假绿窗口）；(d) --body-subtle 0.38 对比 3.2:1 不达标；(e) 死代码（--gold-deep / DURATION / config.duration / timeline 未用字段） | (a) watchdog 重写：errCount 首错忽略 + 1.5s 幂等兜底（附 audit 注释）；(b) 完成态 cursor inline opacity 0 + animation:none（REDUCED 分支兼容）；(c) verify.js 静止态契约 waitBody（103 字打满）+ 收容/字号下限断言；(d) 0.52 → 对比 4.7:1；(e) 清理 | verify 5 组全绿：0 pageerror / 0 console.error / 0 netLocal / errorVisible=false（真绿）/ 粒子 90000 / realwall 2/2 / C 组冻结照常；Kimi 两轮复核通过 |

**静止态契约（本轮教训）**：布局断言与截图必须落在打字机打满（#body ≥103 字）后，否则几何偏小、截图被误读为截断；?t= 冻结会停在打满前一刻，冻结组（C）不能等 103 字——waitBody 只用于非冻结组。配合 v1.6 探针纪律（layoutScale 注入前数据无效）。

### v1.7 轮执行记录（独立审核修复 + 发布，2026-09-05）

| 阶段 | 状态 | 结果 |
|---|---|---|
| 独立审核 | ✅ | 只读 Agent 报告 → #6-#8 修复表 |
| 修复复测 | ✅ | verify 全绿（见 #6-#8 复测列）；measure-static 临时探针已删（断言并入 verify.js） |
| 视觉复核 | ✅ | Kimi 两轮：mobile 间隙确认 + 2560 宽屏通过 |
| 发布 v1.7 | ✅ | 顺序 commit → tag v1.7 → push tag → push master → 预热 @v1.7 → 线上验证（见下） |
| 交付 | ✅ | CLAUDE.md/PROJECT_STATUS 同步 + 记忆更新 + 汇报 |

> v1.7 发布轮补记（2026-09-05）：commit 24eee99 + tag v1.7 + push 完成；jsDelivr 12 条 @v1.7 URL 预热全 200（addons 实际路径在 assets/three/{postprocessing,loaders}/，importmap 前缀映射无 addons/ 子目录——预热清单已写入 CLAUDE.md 部署段防再踩）。Pages 构建后线上验证：桌面热载 6.1s / 手机 390×844 6.6s（layoutScale 0.5571、打字 103 字打满、缩略图 2/2 走 CDN、零横向溢出）；二次加载 0 4xx/0 console.error；file:// 双击 10.8s 出全（打字打满 + 缩略图 + 零错误）。与 v1.6 同款现象：tag 推出后最初 ~15 分钟内 jsDelivr 边缘回源未稳，file:// 场景实测 2/4 次撞 bin/照片 CDN 挂起 → 15s 超时走本地回退 → file:// CORS 拦截 → 45s 看门狗提示（该降级路径有重新加载按钮兜底，预热扩散后消失）。
> **该归因已被 v1.9 轮修正（2026-09-12）**：file:// 照片取色失败并非"预热未扩散"，而是 jsDelivr 图片类资源被 301 到 raw.githubusercontent.com（已知坑 22）——301 恒定存在，能否成功取决于 raw 域名可达性，因此表现为时通时断。bin 走 cdn 不受影响（.bin 不在重定向范围内）。

## 5. v1.8 轮（落地实景改擦除对比 + 收尾，2026-09-12）

**本轮性质**：接手上一会话未提交的 v1.8 改造（功能已写完、验证未收口、文档未同步），完成验证补强 → 文档 → 发布。

### 问题-修复-复测表（v1.8 收尾轮）

| # | 严重度 | 问题（现象/根因） | 修复 | 复测结果 |
|---|---|---|---|---|
| 9 | 高 | **verify.js 对本次改动完全失明，且发布前根本跑不起来**：它只断言缩略图 2/2，不认擦除交互；首次运行直接 `waitForReady Timeout 180000ms`——根因是 importmap 把 three 指向 @v1.8，tag 未推出 → 404，而 importmap **无法表达回退**（showcase.js/config/图片都有），整页起不来。此前所有发布轮都是"发布后才验证布局" | 加 `RW_LOCAL=1` 测试侧 CDN 拦截（补工作区文件应答，不改生产代码）+ `checkOverlay()`：每个视口开一次舞台，断言两图加载、mask 渐变生效、补偿变量注入、**after 宽=before×1.015、纵向偏移=0.6969%×before 高**、舞台整体不溢出视口、Esc 可关 | 红绿验证：原值绿 → 故意改 scale=1.03 → 5 个视口各 2 条断言全部 FAIL（exit 1）→ 还原后绿。实测五视口宽比均 1.0150，dy 与 0.6969%×h 相符（如 1280×720：3.81 vs 3.81） |
| 10 | 中高 | **粒子消散守卫从来没被测过，而本轮新增了第二个 wheel 监听**：`handleGesture` 的 `realwallIsOpen()` 守卫只靠注释里的推理保证"两个监听不抢"，擦除本身又是滚轮驱动——守卫一坏，在舞台上滚轮会同时把粒子打散 | 加只读钩子 `window.__flow=flow`；shot-realwall.js 加**成对断言**：擦除期间 wipe 必须推进（证明滚轮确实送达）**且** phase 保持 1.000；再加**对照组**（关掉 overlay 后同样滚轮必须能消散/回升），防"钩子失效导致假绿" | 24/24 通过：守卫 `phase=1.000→1.000` 而 `wipe 同期 0→1`；对照组 `1.000→0.050→1.000`。对照组的存在同时补上了一直没人自动跑的交互主路径 |
| 11 | 中（工具） | **对照组首跑假失败**：按标称速度用 `waitForTimeout(2600)` 等 2s 的消散，实测只走完 0.8（1.000→0.200）。根因：帧循环 `dt=Math.min(0.1,...)` 有 100ms 上限，headless 软件渲染跑 9 万粒子 <10fps → dt 帧帧触顶 → 缓动慢于标称。**是测试环境产物，不是产品缺陷** | 测试改为一律 `waitForFunction` 等状态（沿用 waitForReady 的既有做法），不按秒断言 | 对照组全绿（0.050 / 1.000 都等到位）；结论写入 CLAUDE.md 已知坑 19 |
| 12 | 中（文档） | **config 对齐注释与事实不符且会误导**：(a) 读起来像"有可复现的网格最优解"，但本轮用 4 种方法独立复测都无法区分（梯度 MAE 全网格仅差 ±0.4%、SAD 与 1D 剖面最优解钉在搜索边界、NCC 峰值 0.22-0.60 且各带乱跳）；(b) 隐去了两个源图**宽高比不同**（912×1148 vs 1000×1275）——scale 定义在"渲染宽之比"上，相对 before 高度的等效纵向比例其实是 1.0281，改源图时只改 scale 会错 | 重写 realwall.align 注释：写明 scale 的定义基准、宽高比差异的换算、残余错位（1-4px + before 横线自身 ~1.9° 倾斜，scale+offset 校不了旋转）由羽化盖住、以及本轮复测的失效边界 | 数值保持不动（项目规矩：校准不得凭感觉改；无可靠替代测量就不动）。已知坑 21 记录"别再用自动化方法复核这组值" |
| 13 | 中（文档） | **CLAUDE.md 的 realwall 段全面过期**：仍描述 v1.7 的 `.realwall-fig` 双图结构与"加第 3 张实景图必须同步加 fig"，照做会直接把页面改坏 | 重写该段（v1.8 对象式 config/单舞台叠图/三驱动/dataset.wipe/羽化承重/换图流程），同步文件结构、验证清单、已知坑 19-21、版本段 | 文档与代码逐条对齐；`.realwall-fig` 全仓库无残留（grep 确认） |

### v1.8 轮执行记录

| 阶段 | 状态 | 结果 |
|---|---|---|
| 交底核实 | ✅ | 工作区 5 文件未提交（+418/−80）；tag 最新 v1.7；CDN 引用已 bump 到 @v1.8 而 tag 不存在（发布前预期态） |
| 静态检查 | ✅ | `node --check` 四个脚本全过；无 `.realwall-fig` 残留 |
| 测试补强 | ✅ | verify.js 加 RW_LOCAL + 舞台几何断言（红绿已验证）；shot-realwall.js 加守卫/对照组（24 项） |
| 对齐值复核 | ✅ | 4 种自动化方法 + 视觉模型盲测（5 张合成图，含 ±12px 故意错位对照）——**均无法作为基准**，结论：保持原值，残余由羽化盖住（见 #12） |
| 全量复测 | ✅ | `RW_LOCAL=1 shot-realwall.js` 24/24；`RW_LOCAL=1 verify.js` 全绿（0 pageerror / 0 console.error / 0 netLocal / 粒子 90000 / 五视口收容断言全过） |
| 发布 v1.8 | ✅ | commit 9e3eb1e + tag v1.8 + push tag → master 完成；预热 12 条中 `.js`/`.bin` 全 200、3 张图片 301（即已知坑 22）；Pages 构建完成（07:06 UTC）；线上桌面 1600×900 加载 11.9s、手机 390×844 4.8s，粒子成形、照片取色启用、实景两图 912/1000px 且擦除可用、overlay 可开可关；file:// 双击 11.6s 可用但**照片取色失效**。唯一 404 = favicon.ico（Pages 站点级，与页面无关）。验证中发现的图片 301 缺陷转入 v1.9 轮 |

## 6. v1.9 轮（修 jsDelivr 图片 301，2026-09-12）

**本轮性质**：v1.8 线上/file:// 验证时发现的 CDN 缺陷收口（非 v1.8 引入，至少影响 v1.6-v1.8，长期未被发现）。

### 问题-修复-复测表（v1.9 轮）

| # | 严重度 | 问题（现象/根因） | 修复 | 复测结果 |
|---|---|---|---|---|
| 14 | 高 | **jsDelivr 把"图片类"资源 301 重定向到 raw.githubusercontent.com**（jsdelivr/jsdelivr#18420，2024 年起），国内大概率不可达；而 cdnBase 同时供 reference.jpg + 两张实景图用。301 是恒定的，能否拿到图取决于 raw 域名可达性（时通时断）。实测后果：① file:// 双击照片取色失败——raw 慢/不通时回退本地，而本地回退的 img 带 crossOrigin=anonymous，撞 null origin CORS 被拦 → 粒子静默退回色板重映射（颜色布局就错了）；② 该 CDN 图片请求在国内是**挂起 >60s** 而非快速失败，线上首屏靠 8s 兜底救回 | cdnBase 由 cdn.jsdelivr.net 换 **gcore.jsdelivr.net**（不参与该重定向）。测试侧：两脚本 CDN 拦截通配放宽为 `**/*.jsdelivr.net/**`；verify 的 isCdnHost 与缩略图 settle 判定同改（否则新 host 既拦不到、也不算"CDN 上游"） | 修复前实测：file:// 起点下 cdn 图片 60s 超时未加载、gcore 同条件 1.5s 加载 + getImageData 通过。修复后见执行记录 |

### v1.9 轮执行记录

| 阶段 | 状态 | 结果 |
|---|---|---|
| 缺陷定位 | ✅ | curl 分主机比对（v1.7 与 v1.8 同样 301 → 非本轮引入）+ jsDelivr issue #18420 + 浏览器内 A/B 探针（file:// 起点：cdn 60s 超时 / gcore 1.5s 成功） |
| 修法验证 | ✅ | gcore 全资源 200 + `ACAO:*` + MIME 正确；国内延迟与 cdn 同级（bin 1.9-2.8s vs 1.4-1.6s）；测试通配 `**/*.jsdelivr.net/**` 命中 gcore 已单独验证 |
| 测试补强 | ✅ | verify.js / shot-realwall.js 拦截通配 + isCdnHost + 缩略图 settle 判定同步新 host |
| 全量复测 | ✅ | `RW_LOCAL=1 verify.js` 全绿（fails [] / 0 pageerror / 0 console.error / 0 netLocal / 0 netCdn；五视口 overlay 数据齐全，wipe=0、mask 渐变、宽比 1.0150）；`RW_LOCAL=1 shot-realwall.js` 24/24 |
| 发布 v1.9 | ✅ | commit dafe77e + tag v1.9 + push tag → master；预热按 host 拆分共 18 条全 200（cdn 14 条 three 链路 / gcore 4 条 bin+图片）；Pages 构建完成（07:21 UTC） |
| 线上 + file:// 复验 | ✅ | 桌面 1600×900 9.6s（← 11.9s）、手机 390×844 4.5s、file:// 双击 **4.1s（← 11.6s，照片取色恢复，错误 2 → 0）**；三场景图片/bin 全部 200 直出 gcore、**触达 raw.githubusercontent 0 次**、零回退警告。唯一 404 = favicon.ico（Pages 站点级，与页面无关） |

### 文档同步（本轮）

- CLAUDE.md：项目概述加"CDN 分两主机"说明；部署段预热清单**按 host 拆分**并补上一直漏掉的 `three.core.js`（1.4MB，每次加载必拉）；已知坑 22（含"不要顺手统一两主机"的告警）；备用 CDN 段更正为"可达性会变，换主机前重新 curl"（旧结论"gcore 不可达"已过期，保留原实测记录并标注失效）；版本段 v1.9
- 本文件：v1.8 发布行由 ⏳ 改 ✅ 并补实测数据；v1.7 轮"file:// 失败归因于预热未扩散"**更正**为图片 301（原归因写在该轮补记里）
