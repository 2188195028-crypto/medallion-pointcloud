/* ============================================================
   verify.js — 多视口浏览器回归验证（Playwright + 系统 Edge）
   页面结构（v2.1 滚动流）：首幕点云 → 纸面编辑式分栏 → 青瓷项目档案 → 同机位对比
   A) 动态 resize：1280×720 → 1920×1080 → 2560×1440（同一页面，不刷新）
   B) 1366×768 静态视口
   C) 冻结相位 ?t=0（散开）/ ?t=5.2（成形）首幕截图（视觉对照用）
   D) 手机 390×844（isMobile+hasTouch）

   每个视口走完四幕：
   - 首幕：waitReady = loading 隐藏 + 打字机 103 字打满，再等入场淡入；
     断言粒子 90000、无横向溢出、首幕高≈视口、meta 底不超视口、
     竖屏 meta 在正文上方、features 底 ≤ 376、手机字号 ≥11/10/12、提示条 ≥44px
   - 第二幕：先断言揭示前状态（行 blur(8px)/y32/opacity0、图 scale1.08/y20/opacity.4，
     仅整页首次加载可采），滚到 #feature 后等过渡落定，断言终点
     （行 blur0/y0/opacity1、图 scale1/y0/opacity1）、标题两行、图片加载、
     事实 4 条、CTA 指向 #dossier
   - 第三幕：滚到 #dossier 等揭示落定，断言标题两行、项目数字 3 项
     （2m / 7天 / 4人）、前期规划 5 步、材料工序 6 行、小标题/备注/CTA 注入、
     CTA 指向 #compare、触控高度 ≥44、桌面双栏并排 / 手机单栏堆叠、无横向溢出
   - 第四幕：断言两图加载、画框 912:1148、对齐变量与实测布局（宽比 1.015、
     纵向偏移 = 0.6969%×before 高）、mask 方向、手柄 ≥44px、ARIA 百分比与
     隐藏侧、键盘（→2% / PageUp10% / Home / End）、指针点击定位、
     指针拖到端点手柄淡出（data-input=pointer）、键盘端点不淡出

   输出：shots/verify-*.png + shots/verify-report.json；阻断断言失败退出码 1。
   用法：先起服务器 python tools/serve_debug.py 8137，再 node tools/verify.js
        （发布前 tag 未推出时加 RW_LOCAL=1，由测试侧应答 CDN）
   作者：Ligong-Wenchang  日期：2026-09-05（重写：msedge 通道 + 纯交互模式；
     v2.1 滚动流改版：三幕全链路 + 揭示前/后状态 + 对比键盘/指针/端点淡出）
   ============================================================ */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const BASE = "http://127.0.0.1:8137/";
const SHOTS = path.join(__dirname, "..", "shots");
fs.mkdirSync(SHOTS, { recursive: true });

// ---- 发布前本地模式（RW_LOCAL=1） ----
// index.html 的 importmap 把 three 指向 CDN 版本 tag，而发布前新 tag 尚不存在 →
// three 404。showcase.js/config/图片都有本地回退，唯独 importmap 没有
// （importmap 无法表达回退），于是整页起不来。兜底放测试侧（不改生产代码）：
// 拦截 CDN，用工作区文件应答。不设本变量时走真实链路，发布后的线上回归用默认模式。
const LOCAL = process.env.RW_LOCAL === "1";
const MIME = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".bin": "application/octet-stream",
  ".json": "application/json",
};

async function installLocalCdn(ctx) {
  if (!LOCAL) return;
  // 通配 *.jsdelivr.net：three 模块走 cdn.jsdelivr.net，bin/图片走 gcore.jsdelivr.net
  // （config.cdnBase），发布前两个 host 的新 tag 都还不存在，都要用工作区文件应答
  await ctx.route("**/*.jsdelivr.net/**", async (route) => {
    const m = route.request().url().match(/medallion-pointcloud@[^/]+\/(.+)$/);
    if (!m) return route.continue();
    const rel = decodeURIComponent(m[1].split("?")[0]);
    const file = path.join(__dirname, "..", rel);
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: "" });
    route.fulfill({
      status: 200,
      contentType: MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      body: fs.readFileSync(file),
    });
  });
}

const logs = [];
const fails = [];
// 跨视口汇总：真实错误（pageerror / console.error）与网络失败按 host 归因
const allErrors = [];
const allNet = [];

function record(group, type, text) {
  logs.push(`[${group}][${type}] ${text}`);
}

// 阻断断言：失败即写入 fails，报告里能看到"哪一视口哪一项"
function check(name, ok, detail) {
  if (!ok) fails.push(`${name}${detail ? " :: " + detail : ""}`);
  record("assert", ok ? "PASS" : "FAIL", `${name}${detail ? " :: " + detail : ""}`);
}

async function makePage(ctx, group) {
  const page = await ctx.newPage();
  const consoleText = [];
  page.on("console", (m) => {
    consoleText.push(m.text());
    record(group, m.type(), m.text());
    // "Failed to load resource" 由 response/requestfailed 监听归因，不重复计入
    if (m.type() === "error" && !m.text().includes("Failed to load resource")) {
      allErrors.push(`[${group}] console.error: ${m.text()}`);
    }
  });
  page.on("pageerror", (e) => allErrors.push(`[${group}] pageerror: ${e.message}`));
  page.on("response", (r) => {
    if (r.status() >= 400) allNet.push({ group, url: r.url(), text: `[${group}] ${r.status()} ${r.url()}` });
  });
  page.on("requestfailed", (r) => {
    const e = r.failure() && r.failure().errorText;
    allNet.push({ group, url: r.url(), text: `[${group}] REQFAIL(${e}) ${r.url()}` });
  });
  page.__consoleText = consoleText;
  return page;
}

// waitBody=true 时额外等待打字机完成（正文 103 字打满），保证截图/几何落在静止态。
// ?t= 冻结组不可用 waitBody 的语义依赖：文字时间线本身不冻结，但首幕相位不同，
// 只做截图对照，不参与收容断言。
async function waitForReady(page, group, waitBody = false) {
  const t0 = Date.now();
  await page.waitForFunction(
    () => {
      const el = document.getElementById("loading");
      return el && el.style.display === "none";
    },
    null,
    { timeout: 180000 }
  );
  if (waitBody) {
    await page.waitForFunction(
      () => document.getElementById("body").textContent.length >= 103,
      null,
      { timeout: 60000 }
    );
  }
  record(group, "info", `loading 消失耗时 ${Date.now() - t0}ms${waitBody ? "(含打字完成)" : ""}`);
  await page.waitForTimeout(2500); // 渲染稳定 + 入场淡入完成
}

async function scrollToY(page, y) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
}

async function scrollToSection(page, id, offset = 10) {
  await page.evaluate(
    ({ sel, off }) => {
      const el = document.getElementById(sel);
      const top = el.getBoundingClientRect().top + window.scrollY + off;
      window.scrollTo({ top, behavior: "instant" });
    },
    { sel: id, off: offset }
  );
}

// 揭示前状态（只在页面首次加载、还没滚到第二幕时可采）
async function readFeaturePre(page) {
  return page.evaluate(() => {
    const line = document.querySelector(".split-line > span");
    const img = document.getElementById("feature-img");
    if (!line || !img) return null;
    const l = getComputedStyle(line);
    const i = getComputedStyle(img);
    const lm = new DOMMatrixReadOnly(l.transform === "none" ? "" : l.transform);
    const im = new DOMMatrixReadOnly(i.transform === "none" ? "" : i.transform);
    return {
      revealed: window.__page.featureRevealed,
      lineOpacity: parseFloat(l.opacity),
      lineFilter: l.filter,
      lineY: lm.f,
      imgOpacity: parseFloat(i.opacity),
      imgScale: im.a,
      imgY: im.f,
    };
  });
}

async function heroPass(page, group, name, vp) {
  const c = await page.evaluate(() => {
    const rect = (id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        x: +b.x.toFixed(1), y: +b.y.toFixed(1),
        w: +b.width.toFixed(1), h: +b.height.toFixed(1),
        bottom: +b.bottom.toFixed(1),
      };
    };
    const body = document.getElementById("body");
    const meta = document.getElementById("meta").getBoundingClientRect();
    const bw = document.getElementById("body-wrap").getBoundingClientRect();
    const label = document.querySelector(".meta-label");
    const li = document.querySelector("#features li");
    return {
      viewport: [innerWidth, innerHeight],
      scrollW: document.documentElement.scrollWidth,
      heroH: document.getElementById("hero").getBoundingClientRect().height,
      textPanel: rect("text-panel"),
      features: rect("features"),
      cue: rect("hero-cue"),
      metaBottom: +meta.bottom.toFixed(1),
      portraitOrder: meta.top < bw.top,
      bodyLen: body.textContent.length,
      loadingHidden: document.getElementById("loading").style.display === "none",
      errorVisible: !document.getElementById("error").hidden,
      fsBody: parseFloat(getComputedStyle(body).fontSize),
      fsLabel: label ? parseFloat(getComputedStyle(label).fontSize) : null,
      fsFeatureLi: li ? parseFloat(getComputedStyle(li).fontSize) : null,
    };
  });
  const isPortrait = c.viewport[1] > c.viewport[0];
  check(`${name} 粒子数 = 90000`, page.__consoleText.some((t) => t.includes("实际粒子数量 = 90000")));
  check(`${name} 打字完成 103 字`, c.bodyLen >= 103, String(c.bodyLen));
  check(`${name} 无横向溢出`, c.scrollW <= c.viewport[0] + 1, `${c.scrollW}/${c.viewport[0]}`);
  check(`${name} 首幕高度≈视口`, Math.abs(c.heroH - c.viewport[1]) <= 2, `${c.heroH}/${c.viewport[1]}`);
  check(`${name} loading 已隐藏`, c.loadingHidden);
  check(`${name} 看门狗 error 面板隐藏`, !c.errorVisible);
  check(`${name} meta 底不超视口`, c.metaBottom <= c.viewport[1] + 0.5, `${c.metaBottom}/${c.viewport[1]}`);
  check(`${name} 首屏提示触控高度 ≥44`, c.cue && c.cue.h >= 43.5, c.cue && `${c.cue.w}×${c.cue.h}`);
  if (isPortrait) {
    check(`${name} 竖屏 meta 在正文上方`, c.portraitOrder, `metaBottom=${c.metaBottom}`);
    check(`${name} 手机 features 底 ≤ 376`, c.features && c.features.bottom <= 376, c.features && String(c.features.bottom));
    check(`${name} 手机正文字号 ≥11`, c.fsBody >= 10.9, String(c.fsBody));
    check(`${name} 手机标签字号 ≥10`, c.fsLabel >= 9.9, String(c.fsLabel));
    check(`${name} 手机特征词字号 ≥12`, c.fsFeatureLi >= 11.9, String(c.fsFeatureLi));
  }
  return c;
}

async function featurePass(page, group, name) {
  await scrollToSection(page, "feature");
  await page.waitForFunction(() => window.__page.featureRevealed === true, null, {
    timeout: 15000,
  });
  // 等过渡真正结束（不按秒断言：软件渲染下 0.9s 过渡可能更久）
  await page.waitForFunction(
    () => {
      const line = document.querySelector(".split-line > span");
      const img = document.getElementById("feature-img");
      if (!line || !img) return false;
      const l = getComputedStyle(line);
      const i = getComputedStyle(img);
      const lm = new DOMMatrixReadOnly(l.transform === "none" ? "" : l.transform);
      const im = new DOMMatrixReadOnly(i.transform === "none" ? "" : i.transform);
      return (
        parseFloat(l.opacity) > 0.999 &&
        (l.filter === "blur(0px)" || l.filter === "none") &&
        Math.abs(lm.f) < 0.05 &&
        parseFloat(i.opacity) > 0.999 &&
        Math.abs(im.a - 1) < 1e-4 &&
        Math.abs(im.f) < 0.05
      );
    },
    null,
    { timeout: 15000 }
  );

  const f = await page.evaluate(() => {
    const el = document.getElementById("feature");
    const line = el.querySelector(".split-line > span");
    const img = document.getElementById("feature-img");
    const rule = el.querySelector(".feature-rule");
    const parseT = (t) => {
      if (!t || t === "none") return { a: 1, d: 1, f: 0 };
      const m = new DOMMatrixReadOnly(t);
      return { a: m.a, d: m.d, f: m.f };
    };
    const l = getComputedStyle(line);
    const i = getComputedStyle(img);
    const r = el.getBoundingClientRect();
    const frame = el.querySelector(".feature-media-frame").getBoundingClientRect();
    const cta = document.getElementById("feature-cta");
    return {
      revealed: el.classList.contains("is-revealed"),
      dataRevealed: el.dataset.revealed,
      lineCount: el.querySelectorAll(".split-line").length,
      lineOpacity: parseFloat(l.opacity),
      lineFilter: l.filter,
      lineTransform: parseT(l.transform),
      imgOpacity: parseFloat(i.opacity),
      imgTransform: parseT(i.transform),
      imgNaturalW: img.naturalWidth,
      imgComplete: img.complete,
      imgSrc: img.currentSrc,
      ruleScaleX: parseT(getComputedStyle(rule).transform).a,
      rectTop: +r.top.toFixed(1),
      rectW: +r.width.toFixed(1),
      frameRatio: frame.width / frame.height,
      title: document.getElementById("feature-title").innerText,
      facts: el.querySelectorAll("#feature-facts > div").length,
      ctaLabel: document.getElementById("feature-cta-label").textContent,
      ctaHref: cta.getAttribute("href"),
      docW: document.documentElement.scrollWidth,
      cliW: document.documentElement.clientWidth,
    };
  });

  check(`${name} 分栏已揭示`, f.revealed && f.dataRevealed === "1");
  check(`${name} 标题拆两行`, f.lineCount === 2, String(f.lineCount));
  check(`${name} 文字 blur 归零`, f.lineFilter === "blur(0px)" || f.lineFilter === "none", f.lineFilter);
  check(
    `${name} 文字位移归零`,
    Math.abs(f.lineTransform.d - 1) < 0.001 && Math.abs(f.lineTransform.f) < 0.05,
    JSON.stringify(f.lineTransform)
  );
  check(`${name} 文字不透明`, Math.abs(f.lineOpacity - 1) < 0.001, String(f.lineOpacity));
  check(
    `${name} 图片 scale 归 1`,
    Math.abs(f.imgTransform.a - 1) < 0.001 && Math.abs(f.imgTransform.f) < 0.05,
    JSON.stringify(f.imgTransform)
  );
  check(`${name} 图片不透明`, Math.abs(f.imgOpacity - 1) < 0.001, String(f.imgOpacity));
  check(`${name} 实景图已加载`, f.imgComplete && f.imgNaturalW > 0, f.imgSrc);
  check(`${name} 朱砂短线已展开`, Math.abs(f.ruleScaleX - 1) < 0.01, String(f.ruleScaleX));
  check(`${name} 事实行 4 条`, f.facts === 4, String(f.facts));
  check(`${name} 分栏文案已注入`, f.title.includes("九万颗粒子") && f.ctaLabel.length > 0, `${f.title} / ${f.ctaLabel}`);
  check(`${name} CTA 指向项目档案`, (f.ctaHref || "").endsWith("#dossier"), f.ctaHref);
  check(`${name} 装裱画框 4:5`, Math.abs(f.frameRatio - 0.8) < 0.02, f.frameRatio.toFixed(4));
  check(`${name} 第二幕无横向溢出`, f.docW <= f.cliW + 1, `${f.docW}/${f.cliW}`);
  await page.screenshot({ path: path.join(SHOTS, `verify-${name}-feature.png`) });
  return f;
}

async function dossierPass(page, group, name) {
  await scrollToSection(page, "dossier");
  await page.waitForFunction(() => window.__page.dossierRevealed === true, null, {
    timeout: 15000,
  });
  // 等标题行 / 双栏的揭示过渡真正结束（与第二幕同一套 blur8→0 / y32→0）
  await page.waitForFunction(
    () => {
      const spans = [...document.querySelectorAll("#dossier-title .split-line > span")];
      const plan = document.querySelector("#dossier .dossier-plan");
      const ledger = document.querySelector("#dossier .dossier-ledger");
      if (!spans.length || !plan || !ledger) return false;
      const spansIn = spans.every((s) => {
        const cs = getComputedStyle(s);
        const m = new DOMMatrixReadOnly(cs.transform === "none" ? "" : cs.transform);
        return (
          parseFloat(cs.opacity) > 0.999 &&
          (cs.filter === "blur(0px)" || cs.filter === "none") &&
          Math.abs(m.f) < 0.05
        );
      });
      return (
        spansIn &&
        parseFloat(getComputedStyle(plan).opacity) > 0.999 &&
        parseFloat(getComputedStyle(ledger).opacity) > 0.999
      );
    },
    null,
    { timeout: 15000 }
  );

  const d = await page.evaluate(() => {
    const el = document.getElementById("dossier");
    const steps = [...el.querySelectorAll("#dossier-steps > li")].map((li) => ({
      title: (li.querySelector(".step-title") || {}).textContent || "",
      text: (li.querySelector(".step-text") || {}).textContent || "",
    }));
    const materials = [...el.querySelectorAll("#dossier-materials > div")].map((row) => ({
      label: (row.querySelector("dt") || {}).textContent || "",
      value: (row.querySelector("dd") || {}).textContent || "",
    }));
    const stats = [...el.querySelectorAll("#dossier-stats > div")].map((row) => ({
      label: (row.querySelector("dt") || {}).textContent || "",
      value: (row.querySelector("dd") || {}).textContent || "",
    }));
    const cta = document.getElementById("dossier-cta");
    const plan = el.querySelector(".dossier-plan").getBoundingClientRect();
    const ledger = el.querySelector(".dossier-ledger").getBoundingClientRect();
    return {
      revealed: el.classList.contains("is-revealed"),
      dataRevealed: el.dataset.revealed,
      kicker: document.getElementById("dossier-kicker").textContent,
      title: document.getElementById("dossier-title").innerText,
      titleLines: el.querySelectorAll("#dossier-title .split-line").length,
      lead: document.getElementById("dossier-lead").textContent,
      planTitle: document.getElementById("dossier-plan-title").textContent,
      ledgerTitle: document.getElementById("dossier-ledger-title").textContent,
      note: document.getElementById("dossier-note").textContent,
      stats,
      steps,
      materials,
      ctaLabel: document.getElementById("dossier-cta-label").textContent,
      ctaHref: cta.getAttribute("href"),
      ctaH: +cta.getBoundingClientRect().height.toFixed(1),
      planTop: +plan.top.toFixed(1),
      ledgerTop: +ledger.top.toFixed(1),
      ledgerW: +ledger.width.toFixed(1),
      docW: document.documentElement.scrollWidth,
      cliW: document.documentElement.clientWidth,
      viewportW: innerWidth,
    };
  });

  check(`${name} 档案已揭示`, d.revealed && d.dataRevealed === "1");
  check(`${name} 档案标题拆两行`, d.titleLines === 2, String(d.titleLines));
  check(
    `${name} 档案文案已注入`,
    d.title.includes("一面墙") && d.kicker.includes("项目档案") && d.lead.length > 20,
    `${d.title} / ${d.kicker}`
  );
  check(
    `${name} 项目数字 3 项`,
    d.stats.length === 3 && d.stats.every((s) => s.label && s.value),
    String(d.stats.length)
  );
  check(
    `${name} 项目数字为 2m / 7天 / 4人`,
    d.stats.map((s) => s.value.replace(/\s+/g, "")).join("/") === "2m/7天/4人",
    JSON.stringify(d.stats)
  );
  check(
    `${name} 前期规划 5 步`,
    d.steps.length === 5 && d.steps.every((s) => s.title && s.text.length > 8),
    String(d.steps.length)
  );
  check(
    `${name} 材料工序 6 行`,
    d.materials.length === 6 && d.materials.every((m) => m.label && m.value),
    String(d.materials.length)
  );
  check(
    `${name} 档案小标题与备注`,
    d.planTitle.length > 0 && d.ledgerTitle.length > 0 && d.note.length > 0,
    `${d.planTitle} / ${d.ledgerTitle} / ${d.note}`
  );
  check(
    `${name} 档案 CTA 指向对比`,
    (d.ctaHref || "").endsWith("#compare") && d.ctaLabel.length > 0,
    `${d.ctaHref} / ${d.ctaLabel}`
  );
  check(`${name} 档案 CTA 触控高度 ≥44`, d.ctaH >= 43.5, String(d.ctaH));
  if (d.viewportW >= 980) {
    check(
      `${name} 档案双栏并排`,
      Math.abs(d.planTop - d.ledgerTop) <= 4 && d.ledgerW > 200,
      `${d.planTop}/${d.ledgerTop} w=${d.ledgerW}`
    );
  } else {
    check(`${name} 档案单栏堆叠`, d.ledgerTop > d.planTop + 40, `${d.planTop}/${d.ledgerTop}`);
  }
  check(`${name} 档案无横向溢出`, d.docW <= d.cliW + 1, `${d.docW}/${d.cliW}`);
  await page.screenshot({ path: path.join(SHOTS, `verify-${name}-dossier.png`) });
  return d;
}

async function comparePass(page, group, name, { deep = true } = {}) {
  await scrollToSection(page, "compare");
  await page.waitForFunction(
    () => {
      const b = document.getElementById("cmp-before");
      const a = document.getElementById("cmp-after");
      return b && a && b.complete && b.naturalWidth > 0 && a.complete && a.naturalWidth > 0;
    },
    null,
    { timeout: 30000 }
  );
  await page.waitForTimeout(400); // 布局稳定（懒加载图片设置尺寸后）

  const c = await page.evaluate(() => {
    const frame = document.getElementById("cmp-frame");
    const before = document.getElementById("cmp-before");
    const after = document.getElementById("cmp-after");
    const layer = document.querySelector(".cmp-after-layer");
    const handle = document.getElementById("cmp-handle");
    const fr = frame.getBoundingClientRect();
    const br = before.getBoundingClientRect();
    const ar = after.getBoundingClientRect();
    const hr = handle.getBoundingClientRect();
    const fcs = getComputedStyle(frame);
    const lcs = getComputedStyle(layer);
    return {
      pos: window.__page.comparePos,
      dataPos: frame.dataset.pos,
      frame: { x: fr.x, y: fr.y, w: fr.width, h: fr.height },
      before: { w: br.width, h: br.height, x: br.x, y: br.y },
      after: { w: ar.width, h: ar.height, x: ar.x, y: ar.y },
      handle: { x: hr.x, w: hr.width, h: hr.height, opacity: getComputedStyle(handle).opacity },
      scaleVar: fcs.getPropertyValue("--cmp-scale").trim(),
      offsetVar: fcs.getPropertyValue("--cmp-offset-y").trim(),
      featherVar: fcs.getPropertyValue("--cmp-feather").trim(),
      posVar: fcs.getPropertyValue("--cmp-pos").trim(),
      mask: lcs.maskImage || lcs.webkitMaskImage,
      ariaNow: handle.getAttribute("aria-valuenow"),
      ariaText: handle.getAttribute("aria-valuetext"),
      specRows: document.querySelectorAll("#compare-spec > div").length,
      title: document.getElementById("compare-title").innerText,
      docW: document.documentElement.scrollWidth,
      cliW: document.documentElement.clientWidth,
    };
  });

  const wRatio = c.after.w / c.before.w;
  const yOffset = c.after.y - c.before.y;
  check(`${name} 对比初始位置 50%`, Math.abs(c.pos - 0.5) < 0.001, String(c.pos));
  check(`${name} 两图宽度比 1.015`, Math.abs(wRatio - 1.015) < 0.002, wRatio.toFixed(4));
  check(
    `${name} 纵向偏移 = 高度×0.6969%`,
    Math.abs(yOffset - c.before.h * 0.006969) < 0.8,
    `${yOffset.toFixed(2)} vs ${(c.before.h * 0.006969).toFixed(2)}`
  );
  check(
    `${name} 对齐变量注入`,
    c.scaleVar === "101.500%" && c.offsetVar.startsWith("0.6969"),
    `${c.scaleVar} / ${c.offsetVar}`
  );
  check(`${name} 羽化带宽 2.2%`, c.featherVar.startsWith("2.200"), c.featherVar);
  check(
    `${name} mask 自左向右`,
    /linear-gradient/.test(c.mask || "") && /to right/.test(c.mask || ""),
    (c.mask || "").slice(0, 70)
  );
  check(
    `${name} 手柄在 50%`,
    Math.abs(c.handle.x + c.handle.w / 2 - (c.frame.x + c.frame.w / 2)) < 2,
    `${c.handle.x}/${c.frame.x}/${c.frame.w}`
  );
  check(`${name} 手柄触控尺寸 ≥44`, c.handle.w >= 43.5 && c.handle.h >= 43.5, `${c.handle.w}×${c.handle.h}`);
  check(`${name} 对比 aria`, c.ariaNow === "50" && /改造前 50%/.test(c.ariaText), c.ariaText);
  check(`${name} 对比规格 1 条`, c.specRows === 1, String(c.specRows));
  check(`${name} 对比标题注入`, c.title.includes("叠在一起看"), c.title);
  check(
    `${name} 画框比例 912:1148`,
    Math.abs(c.frame.w / c.frame.h - 912 / 1148) < 0.01,
    (c.frame.w / c.frame.h).toFixed(4)
  );
  check(`${name} 第三幕无横向溢出`, c.docW <= c.cliW + 1, `${c.docW}/${c.cliW}`);
  await page.screenshot({ path: path.join(SHOTS, `verify-${name}-compare.png`) });

  if (!deep) return c;

  // ---- 键盘：→ 2% / PageUp 10% / End / Home ----
  await page.focus("#cmp-handle");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(120);
  const afterKey = await page.evaluate(() => window.__page.comparePos);
  check(`${name} 键盘右移 2%`, Math.abs(afterKey - 0.52) < 0.001, String(afterKey));

  await page.keyboard.press("PageUp");
  await page.waitForTimeout(120);
  const afterPgUp = await page.evaluate(() => window.__page.comparePos);
  check(`${name} PageUp 前进 10%`, Math.abs(afterPgUp - 0.62) < 0.001, String(afterPgUp));

  await page.keyboard.press("End");
  await page.waitForTimeout(250);
  const atEnd = await page.evaluate(() => {
    const frame = document.getElementById("cmp-frame");
    const handle = document.getElementById("cmp-handle");
    return {
      pos: window.__page.comparePos,
      edge: frame.dataset.edge,
      input: frame.dataset.input,
      afterHidden: document.getElementById("cmp-after").getAttribute("aria-hidden"),
      beforeHidden: document.getElementById("cmp-before").getAttribute("aria-hidden"),
      ariaText: handle.getAttribute("aria-valuetext"),
      opacity: getComputedStyle(handle).opacity,
      afterTagOpacity: getComputedStyle(document.querySelector(".cmp-tag--after")).opacity,
    };
  });
  check(`${name} End 到 100%`, Math.abs(atEnd.pos - 1) < 0.001, String(atEnd.pos));
  check(`${name} 100% 时 after 对读屏隐藏`, atEnd.afterHidden === "true", String(atEnd.afterHidden));
  check(`${name} 100% 读屏比例`, /改造前 100%，落地后 0%/.test(atEnd.ariaText), atEnd.ariaText);
  check(`${name} 键盘端点手柄不淡出`, atEnd.input === "key" && atEnd.opacity === "1", `${atEnd.input}/${atEnd.opacity}`);
  check(`${name} 端点藏起对侧标签`, atEnd.afterTagOpacity === "0", atEnd.afterTagOpacity);

  await page.keyboard.press("Home");
  await page.waitForTimeout(250);
  const atHome = await page.evaluate(() => {
    const frame = document.getElementById("cmp-frame");
    const handle = document.getElementById("cmp-handle");
    return {
      pos: window.__page.comparePos,
      edge: frame.dataset.edge,
      input: frame.dataset.input,
      beforeHidden: document.getElementById("cmp-before").getAttribute("aria-hidden"),
      ariaText: handle.getAttribute("aria-valuetext"),
      opacity: getComputedStyle(handle).opacity,
    };
  });
  check(`${name} Home 到 0%`, Math.abs(atHome.pos) < 0.001, String(atHome.pos));
  check(`${name} 0% 时 before 对读屏隐藏`, atHome.beforeHidden === "true", String(atHome.beforeHidden));
  check(`${name} 0% 读屏比例`, /改造前 0%，落地后 100%/.test(atHome.ariaText), atHome.ariaText);
  check(`${name} 键盘 0% 手柄不淡出`, atHome.opacity === "1", atHome.opacity);

  // ---- 指针：点画框 25% 处 ----
  const box = await page.locator("#cmp-frame").boundingBox();
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.6);
  await page.waitForTimeout(200);
  const afterClick = await page.evaluate(() => {
    const frame = document.getElementById("cmp-frame");
    const handle = document.getElementById("cmp-handle");
    const fr = frame.getBoundingClientRect();
    const hr = handle.getBoundingClientRect();
    return {
      pos: window.__page.comparePos,
      edge: frame.dataset.edge,
      input: frame.dataset.input,
      opacity: getComputedStyle(handle).opacity,
      handleX: hr.x,
      frameX: fr.x,
      frameW: fr.width,
      beforeHidden: document.getElementById("cmp-before").getAttribute("aria-hidden"),
      afterHidden: document.getElementById("cmp-after").getAttribute("aria-hidden"),
    };
  });
  check(`${name} 点击 25% 定位`, Math.abs(afterClick.pos - 0.25) < 0.02, String(afterClick.pos));
  check(
    `${name} 手柄跟随`,
    Math.abs(afterClick.handleX + 22 - (afterClick.frameX + afterClick.frameW * afterClick.pos)) < 3,
    String(afterClick.handleX)
  );
  check(`${name} 中间位置两侧可读`, afterClick.beforeHidden === null && afterClick.afterHidden === null);
  check(`${name} 指针操作后手柄可见`, afterClick.input === "pointer" && afterClick.opacity === "1", `${afterClick.input}/${afterClick.opacity}`);

  // ---- 指针拖过右缘：到端点、手柄淡出（键盘保留焦点环，指针才淡出） ----
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width + 40, box.y + box.height * 0.5, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const atEdgePointer = await page.evaluate(() => {
    const frame = document.getElementById("cmp-frame");
    const handle = document.getElementById("cmp-handle");
    return {
      pos: window.__page.comparePos,
      edge: frame.dataset.edge,
      input: frame.dataset.input,
      opacity: getComputedStyle(handle).opacity,
      afterTagOpacity: getComputedStyle(document.querySelector(".cmp-tag--after")).opacity,
    };
  });
  check(`${name} 拖过右缘钳位 100%`, Math.abs(atEdgePointer.pos - 1) < 0.001, String(atEdgePointer.pos));
  check(`${name} 端点标记 end`, atEdgePointer.edge === "end", String(atEdgePointer.edge));
  check(
    `${name} 指针端点手柄淡出`,
    atEdgePointer.input === "pointer" && atEdgePointer.opacity === "0",
    `${atEdgePointer.input}/${atEdgePointer.opacity}`
  );
  check(`${name} 端点标签淡出`, atEdgePointer.afterTagOpacity === "0", atEdgePointer.afterTagOpacity);

  // 复位到中间，后续截图/断言不受端点状态影响
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.waitForTimeout(250);
  const reset = await page.evaluate(() => {
    const frame = document.getElementById("cmp-frame");
    return { pos: window.__page.comparePos, edge: frame.dataset.edge || null };
  });
  check(`${name} 点击中点复位`, Math.abs(reset.pos - 0.5) < 0.02 && reset.edge === null, JSON.stringify(reset));
  return c;
}

async function main() {
  const browser = await chromium.launch({
    channel: "msedge", // chromium-1223/1234 缓存路径已失效，系统 Edge 与作品集 tools/shot.mjs 同法
    headless: true,
    args: ["--disable-gpu", "--no-sandbox"],
  });
  const report = {};

  // ---------- A) 动态 resize 组 ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await installLocalCdn(ctx);
    const page = await makePage(ctx, "A");
    await page.goto(BASE + "?v=a1&nowatchdog=1", { timeout: 180000 });
    await waitForReady(page, "A", true);

    // 揭示前状态只在整页首次加载时可采（is-revealed 之后永久为真）
    const pre = await readFeaturePre(page);
    check(
      "A 揭示前 · 标题隐藏",
      pre && pre.revealed === false && pre.lineOpacity === 0 &&
        pre.lineFilter.includes("blur(8px)") && Math.abs(pre.lineY - 32) < 0.5,
      JSON.stringify(pre)
    );
    check(
      "A 揭示前 · 图片压暗推近",
      pre && Math.abs(pre.imgOpacity - 0.4) < 0.01 &&
        Math.abs(pre.imgScale - 1.08) < 0.01 && Math.abs(pre.imgY - 20) < 0.5,
      JSON.stringify(pre)
    );

    const sizes = [
      [1280, 720],
      [1920, 1080],
      [2560, 1440],
    ];
    for (const [w, h] of sizes) {
      const name = `${w}x${h}`;
      await page.setViewportSize({ width: w, height: h });
      await scrollToY(page, 0);
      await page.waitForTimeout(500); // 布局重排 + 首幕重新入视口
      report[name] = { hero: await heroPass(page, "A", name, { w, h }) };
      await page.screenshot({ path: path.join(SHOTS, `verify-${name}.png`) });
      report[name].feature = await featurePass(page, "A", name);
      report[name].dossier = await dossierPass(page, "A", name);
      report[name].compare = await comparePass(page, "A", name);
    }

    // 回到首幕：粒子应从消散态回升成形（消散在两次分栏之间已发生）
    await scrollToY(page, 0);
    const reformed = await page.waitForFunction(
      () => window.__flow && window.__flow.phase >= 0.999,
      null,
      { timeout: 45000 }
    ).then(() => true).catch(() => false);
    check("A 滚回首幕粒子回升成形", reformed);
    check("A 首幕重新进入视口", await page.evaluate(() => window.__page.heroInView === true));
    await ctx.close();
  }

  // ---------- B) 1366×768 静态 ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await installLocalCdn(ctx);
    const page = await makePage(ctx, "B");
    await page.goto(BASE + "?v=b1&nowatchdog=1", { timeout: 180000 });
    await waitForReady(page, "B", true);
    const name = "1366x768";
    report[name] = { hero: await heroPass(page, "B", name, { w: 1366, h: 768 }) };
    await page.screenshot({ path: path.join(SHOTS, `verify-${name}.png`) });
    report[name].feature = await featurePass(page, "B", name);
    report[name].dossier = await dossierPass(page, "B", name);
    report[name].compare = await comparePass(page, "B", name, { deep: false });
    await ctx.close();
  }

  // ---------- C) 冻结相位：散开 t=0 vs 成形 t=5.2 ----------
  report.states = {};
  for (const t of [0, 5.2]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await installLocalCdn(ctx);
    const page = await makePage(ctx, `C-t${t}`);
    await page.goto(BASE + `?t=${t}&v=c${t}&nowatchdog=1`, { timeout: 180000 });
    await waitForReady(page, `C-t${t}`);
    await page.screenshot({ path: path.join(SHOTS, `verify-t${t}.png`) });
    report.states[`t${t}`] = await page.evaluate(() => ({
      bodyLen: document.getElementById("body").textContent.length,
      errorVisible: !document.getElementById("error").hidden,
    }));
    check(`C-t${t} 看门狗 error 面板隐藏`, !report.states[`t${t}`].errorVisible);
    await ctx.close();
  }

  // ---------- D) 手机竖屏（触屏） ----------
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    await installLocalCdn(ctx);
    const page = await makePage(ctx, "D");
    await page.goto(BASE + "?v=d1&nowatchdog=1", { timeout: 180000 });
    await waitForReady(page, "D", true);
    const name = "390x844";
    report[name] = { hero: await heroPass(page, "D", name, { w: 390, h: 844 }) };
    await page.screenshot({ path: path.join(SHOTS, `verify-${name}.png`) });
    report[name].feature = await featurePass(page, "D", name);
    report[name].dossier = await dossierPass(page, "D", name);
    report[name].compare = await comparePass(page, "D", name, { deep: false });
    await ctx.close();
  }

  // ---------- 汇总 ----------
  // CDN 上游（发布前 tag 未推出属预期，回退路径兜底；发布轮必须全净）：
  // 起点是 cdn.jsdelivr.net（three 模块）或 gcore.jsdelivr.net（bin/图片，config.cdnBase），
  // 404 时 jsDelivr 会重定向到 raw.githubusercontent.com，最终 URL 记在后者——
  // 这些 host 同属一条预期失败链路，不能算"本地资源失败"。
  const isCdnHost = (u) => u.includes("jsdelivr.net") || u.includes("githubusercontent.com");
  const netCdn = allNet.filter((n) => isCdnHost(n.url)).map((n) => n.text);
  const netLocal = allNet.filter((n) => !isCdnHost(n.url)).map((n) => n.text);
  const errors = allErrors.slice();

  const particleOk = logs.some((l) => l.includes("实际粒子数量 = 90000"));
  report.console = {
    particleOk,
    errors,
    netLocal,
    netCdn: netCdn.slice(0, 12),
    netCdnCount: netCdn.length,
    warnSample: logs.filter((l) => l.includes("[warn]")).slice(0, 5),
    totalLogs: logs.length,
  };
  if (!particleOk) fails.push("粒子数日志未确认 = 90000");
  if (errors.length) fails.push(`控制台 ${errors.length} 条真实 pageerror/error（见 report.console.errors）`);
  if (netLocal.length) fails.push(`本地资源 ${netLocal.length} 条 4xx/失败（见 report.console.netLocal）`);

  report.fails = fails;
  fs.writeFileSync(path.join(SHOTS, "verify-report.json"), JSON.stringify(report, null, 2), "utf-8");
  console.log("verify done → shots/verify-report.json");
  if (fails.length) {
    console.error(`阻断断言失败 ${fails.length} 项:`);
    fails.forEach((f) => console.error("  ✗ " + f));
    await browser.close();
    process.exit(1);
  }
  console.log("阻断断言全部通过 ✓");
  await browser.close();
}

main().catch((e) => {
  console.error("verify failed:", e);
  process.exit(1);
});
