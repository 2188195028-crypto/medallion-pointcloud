# PROJECT_STATUS.md — 繁荣昌盛·四季山水圆盘点云展陈页

> 按《无人值守迭代创作使用说明（含提示词）.docx》§二 建立的项目状态与需求覆盖清单。
> 配套规范：《无人值守迭代创作执行规范（繁荣昌盛点云展陈页专用版）.docx》（桌面）+ 本仓库 CLAUDE.md（权威操作规范，冲突时以 CLAUDE.md 为准）。
> 最后更新：2026-10-18（v2.1 墨夜宣纸四幕 + 项目档案 + 一幕→二幕幕间晨曦 + 项目数字带，首幕 #141311，工作区待发布）

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
3. realwall（v2.0 第二幕）：首屏入口牌照片加载成功（naturalWidth>0，含 CDN 404 回退路径）且位置收容（桌面不压文字列 / 手机不压特征词与底栏）；入口牌、底栏、第一幕滚轮三条开章路径；章节圆形 radial mask、金环、三驱动与钳位；Esc/×/返回/背景关闭、上滚与下滑退出、Tab 焦点圈定；五视口章节几何（after 宽=before×1.015、纵向偏移=0.6969%×before 高、面板与舞台不溢出视口）
4. 交互：升起→旋转→拖拽→第一幕滚轮/上滑消散并自动开章→章内揭示→退出后粒子回升；点击不误触
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

## 7. v2.0 轮（双幕改版：入口牌 + 落地实景章节，2026-10-18）— 已被 v2.1 取代

**本轮性质**：用户反馈"首页感觉不错，但落地实景不明显"——把实景从"首屏两个小缩略图 + 横向擦除"升级为完整的第二幕。不是修 bug，是展示结构改写；对齐补偿值保持不动。

### 设计
- 第一幕：点云展陈不变。文字列右侧（桌面）/底栏上方（竖屏）新增入口牌，照片是 after 的局部放大，首屏即可看到"已上墙"。
- 第二幕：全屏章节。左侧图录式说明（02 · 落地实景 / 从点云到墙面 / 客户·位置·形式·状态 / 进度条 / 返回展陈），右侧同一机位前后两图；after 用圆形 mask 从圆盘中心向外揭示，金环标示揭示边缘，画框随进度 1.035 慢推。
- 进入/退出：第一幕滚轮下滑或手指上滑 → 粒子先消散、520ms 后自动开章；入口牌/底栏点击立即开章。章内滚轮/上滑/←→ 揭示；进度 0 时反向滚/下滑退出，Esc / × / 返回 / 点背景同样关闭，关章后粒子回升。
- 竖屏：入口牌 fixed 于底栏上方（脱离文本流），章节上下排布并居中，底栏不再重复入口。

### 改动文件
- index.html：入口牌与章节静态骨架（dialog 语义、facts dl、返回/关闭按钮）；新增 `?local=1` 预览参数，跳过 CDN 主模块直接加载工作区代码
- showcase-config.js：realwall.chapter 文案/事实/提示 + focus；align/feather 未动
- showcase.css：入口牌（桌面浮动 / 竖屏固定）、章节网格、圆形 mask、金环、前后图明暗、竖屏排布；#text-panel 的 will-change 去掉 transform（已知坑 23）
- showcase.js：圆形揭示几何、开/关章状态机、滚轮/触摸/键盘三驱动、退出与焦点圈定
- tools/shot-realwall.js：按第二幕重写（49 项）
- tools/verify.js：入口牌收容 + 章节断言；waitBody 103 字契约保留

### 验证（2026-10-18，RW_LOCAL=1 本地模式）

| 项 | 结果 |
|---|---|
| `node --check` | showcase.js / showcase-config.js / tools/verify.js / tools/shot-realwall.js 全过 |
| shot-realwall.js | **49/49**：桌面入口牌 121.6×205.5 位于文字右缘之后；开章 wipe=0；滚轮 0→0.72；钳位 0/1；键盘 6 步=0.48 且金环 opacity=1；Esc 关闭后 phase 回到 1；底栏开章与背景关闭；两图加载；scale 101.5%/offset 0.6969%/羽化 34.84px/before brightness(0.6)；上滚归零后退出；第一幕下滚自动开章。手机入口 158×64 不压特征词（底 300.4）与底栏（顶 806.1）；上滑 wipe=0.4929、下滑归零、继续下滑退出；章节 scrollHeight=844 |
| verify.js | 五视口全绿：0 pageerror / 0 console.error / 0 netLocal / 粒子 90000；入口牌照片加载；圆形 radial mask；wipe=0 金环不可见；after 宽比 1.0150、纵向偏移符合 0.6969%；面板与舞台不溢出；390×844 章节内容不横向/纵向溢出；手机字号 11/10/12、features 底 300.4 ≤ 376、入口牌不压底栏 |
| 视觉 | 1600×900 / 2560×1440 / 390×844 首屏与章节截图逐张复核；章节底不透明、before 压暗、金环可辨、移动端入口牌浮于底栏上方 |

### 未发布提醒
- index.html 与 showcase-config.js 仍引用 **@v1.9**；发布前必须把两处 bump 到新 tag，并按 commit → tag → push tag → master → 预热（两主机分开）→ 线上 + file:// 验证 的顺序执行。
- 未发布期间的本地预览：`python tools/serve_debug.py 8137` 后打开 `http://127.0.0.1:8137/index.html?local=1&nowatchdog=1`——主模块跳过 CDN 直接用工作区文件（three 与图片仍来自已发布的 @v1.9）。直接双击 index.html 会加载 CDN 上的旧 JS，看到的是旧版交互。
- 本轮**未提交、未推送、未部署**；作品集仓库未动。
- **2026-10-18 复审结论**：用户认为该版展示效果仍不对（落地实景不够突出、整体观感与预期不符），
  整轮推翻。v2.0 的入口牌/圆形光斑章节**从未 commit、未打 tag、未上线**，
  工作区已被 v2.1 覆盖，仅在本文件与 CLAUDE.md 版本段留档。

## 8. v2.1 轮（三幕滚动流重做，2026-10-18，工作区完成未发布）

**本轮性质**：用户否定 v2.0 后重做。依据《点云文物提示词.txt》：保留首个项目的粒子效果并完善，向下接前后对比；视觉运动规格对齐 Ripplix 的 **Editorial Split Feature Reveal**（tobacco/entertainment 示例），配色必须另起。不是修 bug，是展示结构改写；v1.8 实测的对齐补偿值保持不动。

### 设计
- **三幕正常文档流**，不再有 overlay 章节状态机：首幕 `#hero` 100svh（fixed 画布 + fixed 文字面板）→ 第二幕 `#feature` 纸面编辑式分栏（左文右图）→ 第三幕 `#compare` 墨色同机位对比。滚动本身即叙事，页面不接管滚动。
- **粒子交接**：`scrollY > 0.5vh` 消散（1.1/s），`< 0.25vh` 回升（0.55/s），双阈值滞回；首幕完全滚出视口后帧循环停渲染，但 `flow.easing` 未落定就继续跑（防止快速下滚把消散冻在半路）。
- **第二幕揭示**（照参考站规格）：IntersectionObserver threshold 0.25、once；标题逐行 `blur(8px)/translateY(32px)/opacity 0 → 0/0/1`，0.65s、stagger 80ms、delayChildren 100ms；图片 `opacity 0.4/y20/scale 1.08 → 1/0/1`，0.9s；缓动 `cubic-bezier(0.22,1,0.36,1)`；朱砂短线 scaleX 0→1；`prefers-reduced-motion` 只保留透明度。
- **第三幕**：沿用 v1.8 的实测 `align`（scale 1.015、offsetYRatio 8/1148 = 0.6969%），羽化改为画框宽的 **2.2%**（config `feather: 0.022`）；线性 mask，分隔线左 before、右 after。滑杆交互、ARIA（`aria-valuenow/valuetext`、隐藏侧 `aria-hidden`）、指针端点淡出、输入方式捕获跟踪均保持 v1.8 行为。
- **配色避开参考站深绿+金**：墨 `#131518`、纸 `#e9e7df`、象牙 `#f2ede2`、朱砂 `#b8442c`（纸面小字 `#aa3b25`）、陶土 `#d9916f`、青瓷 `#6f8b80`/`#9ab8aa`，全部收敛在 `:root` 变量。

### 改动文件
- `index.html`：三幕 section 骨架；移除 v2.0 的入口牌与 overlay；CDN 引用仍为 **@v1.9**（未发布）
- `showcase-config.js`：`realwall.feature` / `comparison` 的文案、事实、规格行、CTA；`align` 不动，`feather` 2.2%
- `showcase.css`：纸面第二幕、墨色第三幕、`.split-line` 裁切与揭示、线性 mask、滑杆、三幕 z-index、竖屏排布；删除旧 overlay/缩略图样式
- `showcase.js`：新增 `setupFeatureReveal()` / `setupHeroScroll()`，重写滑杆绑定；删除 v2.0 章节状态机与圆形 mask
- `tools/verify.js`：按三幕结构重写（A 动态视口 / B 1366×768 / C 冻结 `?t=0`、`?t=5.2` / D 390×844；含揭示前静止态契约）
- `tools/shot-realwall.js`：按三幕交互链重写（40 项）
- `CLAUDE.md`、本文件、项目记忆：同步到 v2.1

### 验证（2026-10-18，`RW_LOCAL=1` 本地模式）

| 项 | 结果 |
|---|---|
| `node --check` | showcase.js / showcase-config.js / tools/verify.js / tools/shot-realwall.js 全过 |
| `verify.js` | 全绿：fails `[]`、0 pageerror、0 console.error、0 netLocal、0 netCdn；粒子 90000、打字机 103 字；揭示前标题 `opacity 0` + `blur(8px)` + `y=32`，图片 `opacity .4` + `scale 1.08` + `y=20`；揭示后 `blur(0px)` / `opacity 1`。1280×720：features 底 508.5、meta 底 600.3。390×844：features 底 300.4、meta 底 183.2、字号地板 11/10/12、提示条 176.1×44。对比几何：画框 445.91×561.28、before 443.91×559.28、after 宽 450.56（×1.015）、dy 3.89（=559.28×0.006969）、mask 方向 `to right` |
| `shot-realwall.js` | **40/40**。桌面 1600×900：滚轮下滚 → phase `0.010`；第二幕揭示、终态 `blur(0px)`；CTA 锚点 `scrollY=1770` vs compareTop `1772`；滑杆初始 50%、手柄 44×699.59；指针拖到 30%；键盘 ← `0.28`、End `1`（手柄不淡出）、Home `0`；回顶 phase `0.999`。手机 390×844：无横向溢出、首幕 844、提示条 176.1×44、**真实触摸上滑 scrollY=605** → 粒子消散 → 第二幕揭示 → 触摸拖到 30% → 拖过右缘钳位 `1` 且手柄 `opacity 0` |
| 视觉 | 首幕 / 第二幕揭示前后 / 第三幕 50% 与端点截图逐张复核；纸面与墨色两幕边界、朱砂短线、羽化接缝无可见硬边 |
| 控制台 | 零错误（404 除外） |

**测试工具坑（本轮定位）**：`Input.synthesizeScrollGesture` 在 headless Edge + `isMobile` 下是空操作（实测 synth touch → scrollY 0；synth mouse → 620；`dispatchTouchEvent` 拖 600px → 585；`mouse.wheel` → 620）。手机上滑改用逐帧 `Input.dispatchTouchEvent`（touchStart→12×touchMove→touchEnd），已写入 CLAUDE.md 验证清单。

### 未发布提醒
- `index.html` 与 `showcase-config.js` 仍引用 **@v1.9**。发布前必须 bump 到新 tag，并按 **commit → tag → push tag → master → 预热（cdn / gcore 两主机分开）→ 线上 + file:// 验证** 执行。
- **HTML/CSS 不得脱离新 JS 单独部署**：线上 v1.9 的 JS 依赖旧 DOM（缩略图/overlay），新 HTML 会让页面直接坏掉。
- 本轮**未提交、未推送、未部署**；作品集仓库未动。临时探针文件已清理（`tools/_tmp-*.js`、`.tmp_page_block.js`、`.tmp_showcase_backup.js`）。


## 9. v2.1 配色重做 + 项目档案轮（2026-10-18，工作区完成未发布）

**本轮性质**：用户在上轮三幕滚动流基础上提三点要求——①整体配色改浅色系（后经两轮复审，最终定为「墨夜宣纸」）；②下滑时首幕文字也要有动效；③项目体量小，补前期规划与施工介绍。用户明确选定「只写流程和材料，不写数字」，因此**不编造面积、工期、用量、人数**，档案文案全部为流程与材料。**追加（2026-10-18）**：用户随后给出并确认三项真实值——圆盘直径 2m、现场工期 7 天、现场人数 4 人，已补「项目数字」横带；面积、用量等未核实项仍不写（见本节末「追加」）。

### 设计
- **墨夜宣纸（全站）**：首幕墨夜 `#141311`、实景宣纸 `#f4efe6`、档案暖灰纸 `#eae3d6`、对比米白 `#fbf7ef`；墨 `#1f1b16`、次级 `#5a534a`、弱化 `#6a6156`；朱砂 `#a5452f`（纸面小字 `#8c3826`）只用于小标题短线 / CTA / 滑杆，石绿 `#4a6350` 与金 `#a98643` 作辅色。旧令牌 `--ivory/--ivory-soft/--ivory-subtle/--terracotta` 保留为语义别名；`#hero` 与 `#loading/#error` 各自重新声明深底令牌（var() 在声明处解析，不能靠继承）。
- **首幕墨夜 `#141311`（用户选定，配色定稿）**：深底让鎏金/朱红/黛蓝粒子直接成为画面焦点；`.hero-vignette` 改为暗角 + 圆盘后方极淡暖白顶光（负责景深与视线）；Bloom 0.18/0.82。首幕文字反转为宣纸色（`#f4efe6` / `#cfc7ba` / `#a8a093`），强调色提亮为陶土 `#c4705a` / 灰绿 `#a8bfa9` / 浅金 `#c4a76f`。历史：初版 `#cfdad0`、茶青 `#b9c8bc`、中性浅灰 `#d9dcda`、灰度 `#2e2e2e` 均已被本节取代；浅灰底上米白粒子只有 ~1.2:1，是改用深底的原因。
- **第四幕「叠合补偿」文案行已删除**（用户明确要求；此前一轮误读为“保留”）。`comparison.lead` 同步去掉补偿说明，`specs` 只保留 1 条「拍摄」。`align.scale 1.015` / `offsetYRatio 8/1148` 只是渲染对齐的内部值，保留不动，页面上不再出现。
- **首幕文字滚动退场**：`scrollY / 0.5vh` 写入 `--hero-exit` 0→1，`#text-panel > *` 按 `--exit-y`（-14→-102px）与 `--exit-fade`（1.2→1.55）从上到下接力上移淡出；首屏提示按 1.8 倍速率收线。`updateText()` 的入场内联 opacity 必须乘 `exitFactor`，否则每帧内联值会盖掉 CSS 退场（本轮实测踩到：exit=0.64 时标题 opacity 仍为 1）。
- **一幕→二幕幕间晨曦**（用户要求“要动画，不要直接一个颜色过渡”）：`scrollY` 0→0.9vh 把 WebGL `scene.background` 从墨夜 `#141311` 经 `#241813` / `#3b241b` 升温到暖褐 `#5a3728`（终点不取纸色：高亮底会顶穿 Bloom 0.82 阈值，让整屏发光）；`#feature` 上缘外侧的 `.feature-dawn` 羽化带（22vh，下缘与 `--paper` 同色，向上经沙金/陶土过渡到透明）随第二幕一起升过墨夜底，带内暖光 7.5s 呼吸，reduced-motion 下关闭。羽化带高度由 `--dawn-band` 在前 0.16vh 内从 0 展开，**静止时必须为 0**——否则首屏底部会提前露出纸色（本轮实测踩到并修正）。
- **新增第三幕 · 项目档案 `#dossier`**（青瓷底）：标题「一面墙的 / 前期与施工」沿用 split-line `blur(8px)/y32→0` 揭示（threshold 0.2、once）；左栏「前期规划」5 步（现场勘测 / 构图定稿 / 等比放大 / 现场绘制 / 收尾验收），右栏「施工材料与工序」6 行（基层 / 起稿 / 设色 / 金色 / 保护 / 现场）+ 备注 + CTA。编号是真实工序顺序，不是装饰。
- **四幕结构**：点云展陈 → 落地实景 → 项目档案 → 同机位对比。第二幕 CTA 文案改为「看项目档案」、`href="#dossier"`；档案 CTA「看同一机位的前后对比」进第四幕。`index.html` 里 feature CTA 的静态 href 上轮漏改，本轮由 shot-realwall 的跳转断言抓出并修正。

### 改动文件
- `showcase-config.js`：`theme.bg #141311`（theme 其余令牌同步墨夜宣纸）；`stage.bloomStrength 0.18` / `bloomThreshold 0.82`；`comparison.specs` 删「叠合补偿」、lead 去补偿句；`realwall.feature.cta`；新增 `realwall.dossier`（kicker/titleLines/lead/**stats（2m/7天/4人）**/planTitle/steps/ledgerTitle/materials/note/cta）；`comparison.kicker` 改 `04 · 同一机位`
- `index.html`：`theme-color #141311`；新增 `#dossier` section（含 `#dossier-stats` 数字横带）；feature CTA `href="#dossier"`；`#feature` 内新增 `.feature-dawn` 羽化带
- `showcase.css`：墨夜宣纸令牌（含兼容别名）、首幕墨夜底 + 暗角/圆盘暖白顶光（桌面画外 / 竖屏居中）、首幕与加载/错误层深底反转、首屏提示改宣纸色、首幕文字退场、`.feature-dawn` 幕间日出羽化带（含 dawn-breathe）、`#dossier` 全套样式（双栏/时间线/材料行/CTA/焦点/**数字横带三栏 + 980/560px 响应式**）、第四幕米白底 + 暖金晕、硬编码色全部暖化、980px 单栏断点、竖屏与 reduced-motion
- `showcase.js`：`buildDossier()`（含 `stats` 注入）/ `setupDossierReveal()`；`--hero-exit` 与 `window.__page.heroExit`；`window.__page.dossierRevealed`；`updateText()` 退场因子；`updateActDawnColor()` / `--dawn-band` / `window.__page.actDawn` 幕间晨曦
- `tools/verify.js`：四幕说明；分栏 CTA 断言改 `#dossier`；新增 `dossierPass()` 接入 A/B/D 三组；五视口断言 **3 项数字且值为 2m/7天/4人**
- `tools/shot-realwall.js`：新增首幕文字退场/回顶复位断言；CTA 链改为分栏→档案→对比；手机补档案单栏断言；桌面/手机断言数字横带 3 项
- `CLAUDE.md`、本文件、项目记忆：同步

### 验证（2026-10-18，`RW_LOCAL=1` 本地模式）
| 项 | 结果 |
|---|---|
| `node --check` | showcase.js / showcase-config.js / tools/verify.js / tools/shot-realwall.js 全过 |
| `shot-realwall.js` | **55/55**。桌面：首幕退场 `{"exit":1,"titleOpacity":0,"cueOpacity":0}`；CTA 到档案 `scrollY=1772` = 档案顶 1772.0；档案 `blur(0px)` / `opacity 1`、5 步 6 行、无横向溢出；档案 CTA 到对比 `scrollY=3035` vs 3038.3；回顶 `{"exit":0,"titleOpacity":1}`。手机：档案单栏堆叠、5/6、无溢出；其余滑杆链路全绿 |
| `verify.js` | 全绿。五视口（1280/1920/2560/1366/390）档案均 `steps 5 / materials 6`、标题两行、CTA `#compare`、无横向溢出；桌面双栏、手机单栏；0 pageerror |
| 视觉 | 1600×900 四幕截图复核；首幕墨夜→宣纸→暖灰纸→米白四段过渡无跳色；粒子盘面在墨夜底上清晰突出，鎏金与朱红可辨；朱砂只出现在小标题短线/CTA/滑杆；竖屏同色、圆盘居中 |
| 配色定稿复测 | `shot-realwall.js` **55/55**；`verify.js` 五视口阻断断言全绿、0 pageerror；第四幕规格 1 条、lead 无补偿句；截图确认「叠合补偿」行已删除、四幕统一为墨夜宣纸 |
| 幕间晨曦复测 | 1600×900 在 0 / 0.12 / 0.25 / 0.38 / 0.5 / 0.65 / 0.78 / 0.9 / 1.0vh 九档截图：静止时羽化带高度 0、首屏无纸色；0.12 起纸边带晨光长出，0.5 时粒子消退于暖色地平线，0.9 时纸色铺满且顶部无硬边。390×844 同流程无横向溢出（390/390）。改后 `shot-realwall.js` 仍 55/55，`verify.js` 阻断断言全绿 |

### 追加：项目数字横带（2026-10-18，用户提供真实值）
- 用户给出并确认**圆盘直径 2m、现场工期 7 天、现场人数 4 人**。此前「不写数字」的约定只再约束未核实项：面积、材料用量、色数等不写。
- 结构：`index.html` 在 `.dossier-head` 与 `.dossier-grid` 之间插入 `<dl class="dossier-stats" id="dossier-stats" aria-label="项目数字">`；`config.realwall.dossier.stats` 提供 `value/unit/label`；`buildDossier()` 用 `dt`（标签）+ `dd`（数字与单位 span）和 `textContent` 注入。
- 样式：全幅三栏、上下细线 + 栏间竖线；标签在上（11px、字距 0.22em），数字在下（衬线、`clamp(34px,3.6vw,52px)`、等宽数字），单位缩至 0.38em；随档案揭示，延迟 140ms；980px 以下仍三栏，560px 以下收紧内边距与字号；reduced-motion 只保留透明度。
- 验证：`shot-realwall.js` 桌面断言 `2m/7天/4人`、手机断言 3 项，**56/56**；`verify.js` 五视口断言 3 项与值，阻断断言全绿、0 pageerror；1600×900 与 390×844 截图复核三栏对齐、无横向溢出。

### 未发布提醒
- 页面仍引用 **@v1.9**。发布顺序不变：bump tag → commit → tag → push tag → master → 双主机预热 → 线上 + file:// 验证。
- **HTML/CSS/JS 必须同批上线**：新 HTML 的 `#dossier` 依赖新 JS 构建内容，旧 JS 下该节为空。
- 本轮未 commit / 未 push / 未部署；作品集仓库未动。
