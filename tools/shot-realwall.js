/* ============================================================
   shot-realwall.js — 「落地实景」滚动流全流程验证
   页面结构（v2.1）：首幕点云 → 纸面编辑式分栏 → 青瓷项目档案 → 同机位对比
   桌面 1600×900：
     首幕成形 → 首屏提示指向第二幕 → 滚轮下滚（首幕文字退场）→ 粒子消散 →
     分栏揭示终态 → CTA 进入项目档案 → 档案揭示终态 → CTA 进入第四幕 →
     滑杆初始 50% → 指针拖动 → 键盘 ← / End / Home → 回顶文字复位/粒子回升
   手机 390×844（触屏）：
     无横向溢出 / 首幕满屏 / 提示条 ≥44px → 触摸滑动翻页（CDP 真实触摸）→
     分栏揭示 → 项目档案单栏堆叠 → 触摸拖动手柄 → ARIA 与端点状态
   输出：shots/realwall-*.png；失败时 exit 1（全绿才是绿）
   用法：先起服务器 python tools/serve_debug.py 8137，再 node tools/shot-realwall.js
        （发布前 tag 未推出时加 RW_LOCAL=1）
   作者：Ligong-Wenchang  日期：2026-09-05（v1.8 擦除舞台）
     v2.1 滚动流改版：移除 overlay 章节，改为四幕滚动链路 + 触摸滑动/拖动手柄
   ============================================================ */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

// ?nowatchdog=1：发布前 jsDelivr 对不存在 tag 可能挂起把加载拖过 45s，
// 撞上看门狗会弹 error 面板遮屏拦交互 —— 测试场景跳过看门狗
const BASE = "http://127.0.0.1:8137/?nowatchdog=1";
const SHOTS = path.join(__dirname, "..", "shots");
fs.mkdirSync(SHOTS, { recursive: true });

const logs = [];
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
}

// ---- 本地开发模式（RW_LOCAL=1） ----
// 起因：index.html 的 importmap 把 three 指向 CDN 的版本 tag，而开发中新 tag 尚未
// 推送 → three 404。showcase.js/config/图片 都有本地回退，唯独 importmap 没有
// （importmap 无法表达回退），于是整页起不来。兜底放在测试侧：拦截 CDN，
// 用工作区文件应答。不设本变量时走真实链路。
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
  console.log("(本地模式：CDN 请求由工作区文件应答)");
}

async function waitForReady(page) {
  await page.waitForFunction(
    () => {
      const el = document.getElementById("loading");
      return el && el.style.display === "none";
    },
    null,
    { timeout: 180000 }
  );
  await page.waitForFunction(
    () => document.getElementById("body").textContent.length >= 103,
    null,
    { timeout: 60000 }
  );
  await page.waitForTimeout(2200); // 入场淡入 + 粒子成形完成
}

async function waitPhase(page, pred, ms = 45000) {
  try {
    await page.waitForFunction(pred, null, { timeout: ms });
    return true;
  } catch {
    return false;
  }
}

// 揭示终态：行 blur0 / y0 / opacity1，图 scale1 / y0 / opacity1
async function waitFeatureSettled(page) {
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
}

async function waitCompareImages(page) {
  await page.waitForFunction(
    () => {
      const b = document.getElementById("cmp-before");
      const a = document.getElementById("cmp-after");
      return b && a && b.complete && b.naturalWidth > 0 && a.complete && a.naturalWidth > 0;
    },
    null,
    { timeout: 30000 }
  );
}

async function main() {
  const browser = await chromium.launch({
    channel: "msedge", // chromium-1223 缓存已失效，改用系统 Edge（与作品集 tools/shot.mjs 同法）
    headless: true,
    args: ["--disable-gpu", "--no-sandbox"],
  });

  // ---------- 桌面 ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    await installLocalCdn(ctx);
    const page = await ctx.newPage();
    page.on("console", (m) => logs.push(`[desktop][${m.type()}] ${m.text()}`));
    page.on("pageerror", (e) => logs.push(`[desktop][pageerror] ${e.message}`));

    await page.goto(BASE, { timeout: 180000 });
    await waitForReady(page);
    await page.screenshot({ path: path.join(SHOTS, "realwall-desktop-hero.png") });

    // --- 首幕：成形、提示条指向第二幕、第二幕未提前揭示 ---
    const initial = await page.evaluate(() => {
      const cue = document.getElementById("hero-cue").getBoundingClientRect();
      return {
        phase: window.__flow.phase,
        heroInView: window.__page.heroInView,
        revealed: window.__page.featureRevealed,
        cueHref: document.getElementById("hero-cue").getAttribute("href"),
        cue: { w: cue.width, h: cue.height, top: cue.top, bottom: cue.bottom },
        viewport: [innerWidth, innerHeight],
        scrollY: window.scrollY,
      };
    });
    check("首幕粒子已成形", initial.phase >= 0.999, `phase=${initial.phase}`);
    check("首屏提示指向 #feature", initial.cueHref === "#feature", initial.cueHref);
    check(
      "首屏提示在视口内且 ≥44px",
      initial.cue.top >= 0 &&
        initial.cue.bottom <= initial.viewport[1] &&
        initial.cue.w >= 43.5 &&
        initial.cue.h >= 43.5,
      JSON.stringify(initial.cue)
    );
    check("第二幕未提前揭示", initial.revealed === false);

    // --- 滚轮下滚：页面滚动 + 粒子消散 + 第二幕揭示 ---
    await page.mouse.move(800, 450);
    await page.mouse.wheel(0, 900);
    const scrolled = await page.waitForFunction(
      () => window.scrollY > innerHeight * 0.5,
      null,
      { timeout: 10000 }
    ).then(() => true).catch(() => false);
    check("滚轮下滚翻过首幕", scrolled);

    // 首幕文字随滚动退场（v2.1 浅色轮新增）：--hero-exit 到 1，标题淡出、提示条收线。
    // 注意：updateText 的入场内联 opacity 要等下一帧才乘上退场因子，提示条还有 0.3s
    // 过渡——不能滚动后立刻读，等状态落定再采集。
    await page.waitForFunction(
      () => {
        const title = getComputedStyle(document.getElementById("title"));
        const cue = getComputedStyle(document.getElementById("hero-cue"));
        return parseFloat(title.opacity) < 0.1 && parseFloat(cue.opacity) < 0.1;
      },
      null,
      { timeout: 6000 }
    ).catch(() => {});
    const heroExit = await page.evaluate(() => ({
      exit: window.__page.heroExit,
      titleOpacity: parseFloat(getComputedStyle(document.getElementById("title")).opacity),
      titleTranslate: getComputedStyle(document.getElementById("title")).translate,
      cueOpacity: parseFloat(getComputedStyle(document.getElementById("hero-cue")).opacity),
    }));
    check(
      "首幕文字随下滚退场",
      heroExit.exit >= 0.99 && heroExit.titleOpacity < 0.1 && heroExit.cueOpacity < 0.1,
      JSON.stringify(heroExit)
    );

    const dissolved = await waitPhase(page, () => window.__flow && window.__flow.phase <= 0.02);
    check("下滚后粒子完成消散", dissolved, await page.evaluate(() => String(window.__flow.phase)));
    const revealed = await page.waitForFunction(
      () => window.__page.featureRevealed === true,
      null,
      { timeout: 10000 }
    ).then(() => true).catch(() => false);
    check("第二幕已被揭示", revealed);
    await waitFeatureSettled(page);
    const feature = await page.evaluate(() => {
      const img = document.getElementById("feature-img");
      const line = document.querySelector(".split-line > span");
      const l = getComputedStyle(line);
      return {
        imgLoaded: img.complete && img.naturalWidth > 0,
        title: document.getElementById("feature-title").innerText,
        cta: document.getElementById("feature-cta-label").textContent,
        blur: l.filter,
        opacity: l.opacity,
      };
    });
    check("分栏实景图已加载", feature.imgLoaded);
    check("分栏终态 blur 归零", feature.blur === "blur(0px)" || feature.blur === "none", feature.blur);
    check("分栏终态不透明", Math.abs(parseFloat(feature.opacity) - 1) < 0.001, feature.opacity);
    check("分栏标题为两行文案", feature.title.includes("九万颗粒子"), feature.title);
    await page.screenshot({ path: path.join(SHOTS, "realwall-desktop-feature.png") });

    // --- 分栏 CTA 进入第三幕 · 项目档案（锚点跳转） ---
    const dossierTop = await page.evaluate(() => {
      const el = document.getElementById("dossier");
      return el.getBoundingClientRect().top + window.scrollY;
    });
    await page.click("#feature-cta");
    const jumpedDossier = await page.waitForFunction(
      (top) => Math.abs(window.scrollY - top) < 4,
      dossierTop,
      { timeout: 12000 }
    ).then(() => true).catch(() => false);
    check(
      "分栏 CTA 跳转到项目档案",
      jumpedDossier,
      `scrollY=${await page.evaluate(() => window.scrollY)} top=${dossierTop.toFixed(1)}`
    );
    const dossierRevealed = await page.waitForFunction(
      () => window.__page.dossierRevealed === true,
      null,
      { timeout: 10000 }
    ).then(() => true).catch(() => false);
    check("项目档案已揭示", dossierRevealed);
    await page.waitForTimeout(900); // 标题行 blur/y 与双栏过渡落定
    const dossier = await page.evaluate(() => {
      const el = document.getElementById("dossier");
      const span = el.querySelector("#dossier-title .split-line > span");
      const cs = getComputedStyle(span);
      return {
        title: document.getElementById("dossier-title").innerText,
        stats: [...el.querySelectorAll("#dossier-stats > div")].map((row) =>
          ((row.querySelector("dd") || {}).textContent || "").replace(/\s+/g, "")
        ),
        steps: el.querySelectorAll("#dossier-steps > li").length,
        materials: el.querySelectorAll("#dossier-materials > div").length,
        cta: document.getElementById("dossier-cta-label").textContent,
        ctaHref: document.getElementById("dossier-cta").getAttribute("href"),
        blur: cs.filter,
        opacity: cs.opacity,
        docW: document.documentElement.scrollWidth,
        vw: innerWidth,
      };
    });
    check(
      "档案标题为两行文案",
      dossier.title.includes("一面墙") && dossier.title.includes("前期与施工"),
      dossier.title
    );
    check("档案前期规划 5 步", dossier.steps === 5, String(dossier.steps));
    check("档案材料工序 6 行", dossier.materials === 6, String(dossier.materials));
    check(
      "档案项目数字 2m / 7天 / 4人",
      dossier.stats.length === 3 && dossier.stats.join("/") === "2m/7天/4人",
      JSON.stringify(dossier.stats)
    );
    check("档案终态 blur 归零", dossier.blur === "blur(0px)" || dossier.blur === "none", dossier.blur);
    check("档案终态不透明", Math.abs(parseFloat(dossier.opacity) - 1) < 0.001, dossier.opacity);
    check("档案 CTA 指向对比", /#compare$/.test(dossier.ctaHref || ""), dossier.ctaHref);
    check("档案无横向溢出", dossier.docW <= dossier.vw + 1, `${dossier.docW}/${dossier.vw}`);
    await page.screenshot({ path: path.join(SHOTS, "realwall-desktop-dossier.png") });

    // --- 档案 CTA 进入第四幕（锚点跳转） ---
    const compareTop = await page.evaluate(() => {
      const el = document.getElementById("compare");
      return el.getBoundingClientRect().top + window.scrollY;
    });
    await page.click("#dossier-cta");
    const jumped = await page.waitForFunction(
      (top) => Math.abs(window.scrollY - top) < 4,
      compareTop,
      { timeout: 12000 }
    ).then(() => true).catch(() => false);
    check("档案 CTA 跳转到第四幕", jumped, `scrollY=${await page.evaluate(() => window.scrollY)} top=${compareTop.toFixed(1)}`);
    await waitCompareImages(page);
    await page.waitForTimeout(300);
    const cmp0 = await page.evaluate(() => ({
      pos: window.__page.comparePos,
      handleW: document.getElementById("cmp-handle").getBoundingClientRect().width,
      handleH: document.getElementById("cmp-handle").getBoundingClientRect().height,
      aria: document.getElementById("cmp-handle").getAttribute("aria-valuetext"),
      mask: (() => {
        const cs = getComputedStyle(document.querySelector(".cmp-after-layer"));
        return cs.maskImage || cs.webkitMaskImage || "";
      })(),
    }));
    check("第三幕初始 50%", Math.abs(cmp0.pos - 0.5) < 0.001, String(cmp0.pos));
    check("手柄触控尺寸 ≥44", cmp0.handleW >= 43.5 && cmp0.handleH >= 43.5, `${cmp0.handleW}×${cmp0.handleH}`);
    check("滑杆初始读屏文案", /改造前 50%/.test(cmp0.aria), cmp0.aria);
    check("after 线性 mask 生效", /linear-gradient/.test(cmp0.mask) && /to right/.test(cmp0.mask), cmp0.mask.slice(0, 60));
    await page.screenshot({ path: path.join(SHOTS, "realwall-desktop-compare.png") });

    // --- 指针拖动分隔线到 30% ---
    const box = await page.locator("#cmp-frame").boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const dragged = await page.evaluate(() => window.__page.comparePos);
    check("指针拖动分隔线到 30%", Math.abs(dragged - 0.3) < 0.02, String(dragged));
    check("拖动后输入方式为指针", await page.evaluate(() => document.getElementById("cmp-frame").dataset.input) === "pointer");

    // --- 键盘：← 2% / End / Home ---
    await page.focus("#cmp-handle");
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(120);
    check(
      "键盘左移 2%",
      Math.abs((await page.evaluate(() => window.__page.comparePos)) - 0.28) < 0.001,
      String(await page.evaluate(() => window.__page.comparePos))
    );

    await page.keyboard.press("End");
    await page.waitForTimeout(300);
    const end = await page.evaluate(() => {
      const handle = document.getElementById("cmp-handle");
      return {
        pos: window.__page.comparePos,
        edge: document.getElementById("cmp-frame").dataset.edge,
        opacity: getComputedStyle(handle).opacity,
        afterHidden: document.getElementById("cmp-after").getAttribute("aria-hidden"),
        aria: handle.getAttribute("aria-valuetext"),
      };
    });
    check("End 到 100%", Math.abs(end.pos - 1) < 0.001, String(end.pos));
    check("键盘端点手柄保留（不淡出）", end.opacity === "1", end.opacity);
    check("100% 时 after 对读屏隐藏", end.afterHidden === "true", String(end.afterHidden));
    check("100% 读屏比例", /改造前 100%，落地后 0%/.test(end.aria), end.aria);
    await page.screenshot({ path: path.join(SHOTS, "realwall-desktop-cmp-100.png") });

    await page.keyboard.press("Home");
    await page.waitForTimeout(300);
    const home = await page.evaluate(() => ({
      pos: window.__page.comparePos,
      edge: document.getElementById("cmp-frame").dataset.edge,
      beforeHidden: document.getElementById("cmp-before").getAttribute("aria-hidden"),
      aria: document.getElementById("cmp-handle").getAttribute("aria-valuetext"),
    }));
    check("Home 到 0%", Math.abs(home.pos) < 0.001, String(home.pos));
    check("0% 时 before 对读屏隐藏", home.beforeHidden === "true", String(home.beforeHidden));
    check("0% 读屏比例", /改造前 0%，落地后 100%/.test(home.aria), home.aria);

    // --- 回顶：粒子回升成形 ---
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const reformed = await waitPhase(page, () => window.__flow && window.__flow.phase >= 0.999);
    check("回顶后粒子回升成形", reformed, await page.evaluate(() => String(window.__flow.phase)));
    check("回顶后首幕重新进入视口", await page.evaluate(() => window.__page.heroInView === true));
    const heroBack = await page.evaluate(() => ({
      exit: window.__page.heroExit,
      titleOpacity: parseFloat(getComputedStyle(document.getElementById("title")).opacity),
    }));
    check(
      "回顶后首幕文字复位",
      heroBack.exit <= 0.001 && heroBack.titleOpacity > 0.99,
      JSON.stringify(heroBack)
    );
    await page.screenshot({ path: path.join(SHOTS, "realwall-desktop-reformed.png") });

    await ctx.close();
  }

  // ---------- 手机竖屏 ----------
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    await installLocalCdn(ctx);
    const page = await ctx.newPage();
    page.on("console", (m) => logs.push(`[mobile][${m.type()}] ${m.text()}`));
    page.on("pageerror", (e) => logs.push(`[mobile][pageerror] ${e.message}`));

    await page.goto(BASE, { timeout: 180000 });
    await waitForReady(page);
    await page.screenshot({ path: path.join(SHOTS, "realwall-mobile-hero.png") });

    const layout = await page.evaluate(() => {
      const cue = document.getElementById("hero-cue").getBoundingClientRect();
      return {
        vw: innerWidth,
        vh: innerHeight,
        docW: document.documentElement.scrollWidth,
        heroH: document.getElementById("hero").getBoundingClientRect().height,
        cue: { w: cue.width, h: cue.height, top: cue.top, bottom: cue.bottom },
        phase: window.__flow.phase,
      };
    });
    check("手机无横向溢出", layout.docW <= layout.vw + 1, `${layout.docW}/${layout.vw}`);
    check("手机首幕满屏", Math.abs(layout.heroH - layout.vh) <= 2, `${layout.heroH}/${layout.vh}`);
    check(
      "手机提示条在视口内且 ≥44px",
      layout.cue.top >= 0 && layout.cue.bottom <= layout.vh &&
        layout.cue.w >= 43.5 && layout.cue.h >= 43.5,
      JSON.stringify(layout.cue)
    );
    check("手机首幕粒子已成形", layout.phase >= 0.999, String(layout.phase));

    // --- 触摸上滑翻页（CDP 逐帧 dispatchTouchEvent，验证没有被 touch-action 锁住） ---
    // 注意：Input.synthesizeScrollGesture 在 headless Edge + isMobile 下是空操作（实测 scrollY 恒为 0），
    // 必须用真实的 touchStart/touchMove/touchEnd 序列才会触发原生滚动。
    const cdp = await ctx.newCDPSession(page);
    let gestureOk = true;
    try {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 195, y: 700, id: 1 }],
      });
      for (let i = 1; i <= 12; i++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: 195, y: 700 - (620 * i) / 12, id: 1 }],
        });
        await page.waitForTimeout(25);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } catch (e) {
      gestureOk = false;
      logs.push(`[mobile][warn] dispatchTouchEvent 失败: ${e.message}`);
    }
    await page.waitForTimeout(900);
    const afterSwipe = await page.evaluate(() => window.scrollY);
    check("触摸上滑翻过首幕", gestureOk && afterSwipe > layout.vh * 0.5, `scrollY=${afterSwipe}`);
    const mobileDissolved = await waitPhase(page, () => window.__flow && window.__flow.phase <= 0.02);
    check("手机上滑后粒子消散", mobileDissolved);
    const mobileRevealed = await page.waitForFunction(
      () => window.__page.featureRevealed === true,
      null,
      { timeout: 10000 }
    ).then(() => true).catch(() => false);
    check("手机第二幕已揭示", mobileRevealed);
    await waitFeatureSettled(page);
    await page.screenshot({ path: path.join(SHOTS, "realwall-mobile-feature.png") });

    // --- 项目档案：单栏堆叠 + 内容完整 ---
    await page.evaluate(() => {
      const el = document.getElementById("dossier");
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + 8, behavior: "instant" });
    });
    const mobileDossierRevealed = await page.waitForFunction(
      () => window.__page.dossierRevealed === true,
      null,
      { timeout: 10000 }
    ).then(() => true).catch(() => false);
    check("手机项目档案已揭示", mobileDossierRevealed);
    await page.waitForTimeout(900);
    const mobileDossier = await page.evaluate(() => {
      const el = document.getElementById("dossier");
      const plan = el.querySelector(".dossier-plan").getBoundingClientRect();
      const ledger = el.querySelector(".dossier-ledger").getBoundingClientRect();
      return {
        stats: el.querySelectorAll("#dossier-stats > div").length,
        steps: el.querySelectorAll("#dossier-steps > li").length,
        materials: el.querySelectorAll("#dossier-materials > div").length,
        stacked: ledger.top > plan.top + 40,
        docW: document.documentElement.scrollWidth,
        vw: innerWidth,
      };
    });
    check(
      "手机档案 5 步 / 6 行 / 3 项数字",
      mobileDossier.steps === 5 && mobileDossier.materials === 6 && mobileDossier.stats === 3,
      `${mobileDossier.steps}/${mobileDossier.materials}/${mobileDossier.stats}`
    );
    check("手机档案单栏堆叠", mobileDossier.stacked, `stacked=${mobileDossier.stacked}`);
    check("手机档案无横向溢出", mobileDossier.docW <= mobileDossier.vw + 1, `${mobileDossier.docW}/${mobileDossier.vw}`);
    await page.screenshot({ path: path.join(SHOTS, "realwall-mobile-dossier.png") });

    // --- 滚到对比幕（画框居中），触摸拖动手柄 ---
    await page.evaluate(() => {
      const b = document.getElementById("cmp-frame").getBoundingClientRect();
      window.scrollTo({
        top: window.scrollY + b.top + b.height / 2 - innerHeight / 2,
        behavior: "instant",
      });
    });
    await waitCompareImages(page);
    await page.waitForTimeout(300);
    const frameBox = await page.locator("#cmp-frame").boundingBox();
    const startX = frameBox.x + frameBox.width * 0.5;
    const startY = frameBox.y + frameBox.height * 0.5;
    const endX = frameBox.x + frameBox.width * 0.3;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y: startY, id: 1 }],
    });
    for (let i = 1; i <= 6; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: startX + ((endX - startX) * i) / 6, y: startY, id: 1 }],
      });
      await page.waitForTimeout(30);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(250);
    const touchPos = await page.evaluate(() => ({
      pos: window.__page.comparePos,
      edge: document.getElementById("cmp-frame").dataset.edge || null,
      input: document.getElementById("cmp-frame").dataset.input,
      handleOpacity: getComputedStyle(document.getElementById("cmp-handle")).opacity,
    }));
    check("手机触摸拖动手柄到 30%", Math.abs(touchPos.pos - 0.3) < 0.05, JSON.stringify(touchPos));
    check("手机拖动后手柄可见", touchPos.handleOpacity === "1" && touchPos.edge === null, JSON.stringify(touchPos));
    await page.screenshot({ path: path.join(SHOTS, "realwall-mobile-compare.png") });

    // 触摸拖过右缘 → 端点淡出
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: frameBox.x + frameBox.width * 0.3, y: startY, id: 2 }],
    });
    for (let i = 1; i <= 5; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: endX + ((frameBox.x + frameBox.width + 30 - endX) * i) / 5, y: startY, id: 2 }],
      });
      await page.waitForTimeout(30);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(350);
    const touchEnd = await page.evaluate(() => ({
      pos: window.__page.comparePos,
      edge: document.getElementById("cmp-frame").dataset.edge,
      input: document.getElementById("cmp-frame").dataset.input,
      opacity: getComputedStyle(document.getElementById("cmp-handle")).opacity,
    }));
    check("手机拖过右缘钳位 100%", Math.abs(touchEnd.pos - 1) < 0.001, String(touchEnd.pos));
    check(
      "手机指针端点手柄淡出",
      touchEnd.edge === "end" && touchEnd.input === "pointer" && touchEnd.opacity === "0",
      JSON.stringify(touchEnd)
    );

    await ctx.close();
  }

  await browser.close();

  // 404 为发布前预期（新 tag 未推出时 CDN 资源回退本地的必经路径），不计为错误
  const errs = logs.filter(
    (l) => (l.includes("[error]") || l.includes("pageerror")) && !l.includes("404")
  );
  check("控制台零错误（404 除外）", errs.length === 0, errs.join(" | ").slice(0, 200));

  const failed = results.filter((r) => !r.pass);
  console.log(`\n===== ${results.length - failed.length}/${results.length} 通过 =====`);
  if (failed.length) {
    console.log("失败项:");
    failed.forEach((f) => console.log(`  - ${f.name}  (${f.detail || ""})`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
