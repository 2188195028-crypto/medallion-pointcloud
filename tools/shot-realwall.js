/* ============================================================
   shot-realwall.js — 落地实景「擦除对比」全流程验证
   桌面 1600×900:默认视图 → 两个入口开门进度 → 滚轮擦除/钳位 →
                   键盘擦除 → 三档进度截图 → Esc/背景关闭 → 两图加载
   手机 390×844 竖屏(触屏):点开 → 竖向拖动映射横向擦除 → 钳位
   输出:shots/realwall-*.png;失败时 exit 1(全绿才是绿)
   用法:先起服务器 python tools/serve_debug.py 8137,再 node tools/shot-realwall.js
   作者:Ligong-Wenchang  日期:2026-09-01(v1.8 擦除对比改造)
   ============================================================ */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

// ?nowatchdog=1:发布前 jsDelivr 对不存在 tag 可能挂起把加载拖过 45s,
// 撞上看门狗会弹 error 面板遮屏拦点击 —— 测试场景跳过看门狗
const BASE = "http://127.0.0.1:8137/?nowatchdog=1";
const SHOTS = path.join(__dirname, "..", "shots");
fs.mkdirSync(SHOTS, { recursive: true });

const logs = [];
const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
}

// ---- 本地开发模式(RW_LOCAL=1) ----
// 起因:index.html 的 importmap 把 three 指向 CDN 的版本 tag,而开发中新 tag 尚未
// 推送 → three 404。showcase.js/config/图片 都有本地回退,唯独 importmap 没有
// (importmap 无法表达回退),于是整页起不来。改动生产代码去迁就测试是本末倒置,
// 所以把兜底放在测试侧:拦截 CDN,用工作区文件应答。
// 不设本变量时走真实链路(CDN 404 → 本地回退),发布后验证用默认模式。
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
  await ctx.route("**/cdn.jsdelivr.net/**", async (route) => {
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
  console.log(`(本地模式:CDN 请求由工作区文件应答)`);
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
  await page.waitForTimeout(2000);
}

// 擦除进度由 showcase.js 写在 #realwall-overlay 的 dataset 上
const readWipe = (page) =>
  page.evaluate(() =>
    parseFloat(document.getElementById("realwall-overlay").dataset.wipe ?? "NaN")
  );

// 断言 CSS 真的生效(不只看 JS 状态):after 图层必须带上 mask 渐变
const readMaskApplied = (page) =>
  page.evaluate(() => {
    const el = document.getElementById("realwall-after");
    if (!el) return "";
    const cs = getComputedStyle(el);
    return cs.maskImage || cs.webkitMaskImage || "";
  });

async function main() {
  const browser = await chromium.launch({
    channel: "msedge", // chromium-1223 缓存已失效,改用系统 Edge(与作品集 tools/shot.mjs 同法)
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
    await page.screenshot({ path: path.join(SHOTS, "realwall-desktop-default.png") });

    const thumbCount = await page.locator(".realwall-thumb").count();
    check("缩略图 2 张", thumbCount === 2, `count=${thumbCount}`);

    // --- 入口 1:「改造前」→ wipe 应为 0 ---
    await page.locator(".realwall-thumb").first().click();
    await page.waitForTimeout(600);
    const openAfterClick = await page.evaluate(
      () => !document.getElementById("realwall-overlay").hidden
    );
    check("点缩略图打开 overlay", openAfterClick);
    const wipeBefore = await readWipe(page);
    check("「改造前」入口开门进度 = 0", Math.abs(wipeBefore) < 0.001, `wipe=${wipeBefore}`);
    const mask = await readMaskApplied(page);
    check("after 图层 mask 渐变已生效", mask.includes("gradient"), mask.slice(0, 60));
    const captionStart = await page.evaluate(
      () => document.getElementById("realwall-caption").textContent
    );
    check("进度 0 时图注为「改造前」", captionStart.includes("改造前"), captionStart);
    await page.screenshot({ path: path.join(SHOTS, "realwall-wipe-000.png") });

    // --- 守卫:擦除期间的滚轮不得驱动粒子消散 ---
    // 读 flow.phase(1=成形/0=散开)。先等成形跑完再取基准,否则分不清"还没升起来"
    // 与"被滚散了"。断言必须成对:下面 wipe 推进证明滚轮确实送达并被擦除消费,
    // phase 不变才说明全局消散监听被 realwallIsOpen() 挡住——只测 phase 会在
    // "滚轮压根没送达"时假绿(两次监听抢事件是这个项目高风险点,见 CLAUDE.md)。
    await page.waitForFunction(() => window.__flow && window.__flow.phase >= 0.999, null, {
      timeout: 30000,
    });
    const phaseBefore = await page.evaluate(() => window.__flow.phase);

    // --- 滚轮擦除:下滚前进、上滚后退、两端钳位 ---
    await page.mouse.move(800, 450);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(200);
    const wipeAfterWheel = await readWipe(page);
    check("滚轮下滚推进擦除", wipeAfterWheel > wipeBefore, `wipe=${wipeAfterWheel}`);

    await page.mouse.wheel(0, -4000); // 远远超过回到 0 所需
    await page.waitForTimeout(200);
    const wipeClampLow = await readWipe(page);
    check("上滚钳位到 0 不越界", wipeClampLow === 0, `wipe=${wipeClampLow}`);

    await page.mouse.wheel(0, 40000); // 远远超过满进度所需
    await page.waitForTimeout(200);
    const wipeClampHigh = await readWipe(page);
    check("下滚钳位到 1 不越界", wipeClampHigh === 1, `wipe=${wipeClampHigh}`);
    await page.screenshot({ path: path.join(SHOTS, "realwall-wipe-100.png") });

    // 累计 44400 的滚轮量已远超消散阈值(80),phase 若还是 1 就是守卫真的在挡
    const phaseAfter = await page.evaluate(() => window.__flow.phase);
    check(
      "擦除期间滚轮未驱动粒子消散(守卫)",
      phaseAfter >= 0.999,
      `phase=${phaseBefore.toFixed(3)}→${phaseAfter.toFixed(3)}, wipe 同期由 0 → ${wipeClampHigh}`
    );

    // --- 键盘擦除:回到 0 再用 → 走到中段 ---
    await page.mouse.wheel(0, -40000);
    await page.waitForTimeout(150);
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(250);
    const wipeMid = await readWipe(page);
    check("方向键推进擦除(6 步 ≈ 0.48)", wipeMid > 0.3 && wipeMid < 0.7, `wipe=${wipeMid}`);
    await page.screenshot({ path: path.join(SHOTS, "realwall-wipe-050.png") });

    // --- Esc 关闭 ---
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    check(
      "Esc 关闭",
      await page.evaluate(() => document.getElementById("realwall-overlay").hidden)
    );

    // --- 入口 2:「落地后」→ wipe 应为 1 ---
    await page.locator(".realwall-thumb").nth(1).click();
    await page.waitForTimeout(500);
    const wipeAfterEntry = await readWipe(page);
    check("「落地后」入口开门进度 = 1", wipeAfterEntry === 1, `wipe=${wipeAfterEntry}`);
    const captionEnd = await page.evaluate(
      () => document.getElementById("realwall-caption").textContent
    );
    check("进度 1 时图注为「落地后」", captionEnd.includes("落地后"), captionEnd);

    // --- 背景点击关闭(无拖动,应为正常点击) ---
    await page.mouse.click(40, 450); // 左边缘背景
    await page.waitForTimeout(400);
    check(
      "点背景关闭",
      await page.evaluate(() => document.getElementById("realwall-overlay").hidden)
    );

    // --- 两图加载成功(naturalWidth>0;CDN 404 → 本地回退需 ~1-3s,条件等待) ---
    await page.locator(".realwall-thumb").first().click();
    await page.waitForTimeout(600);
    let bothLoaded = true;
    try {
      await page.waitForFunction(
        () =>
          ["realwall-before", "realwall-after"].every(
            (id) => document.getElementById(id).naturalWidth > 0
          ),
        null,
        { timeout: 20000 }
      );
    } catch {
      bothLoaded = false;
    }
    check("before/after 两图加载成功", bothLoaded);

    // --- 对齐补偿是否真的注入了(值来自 config,写错会静默错位) ---
    const alignVars = await page.evaluate(() => {
      const cs = getComputedStyle(document.getElementById("realwall-overlay"));
      return {
        scale: cs.getPropertyValue("--rw-scale").trim(),
        offsetY: cs.getPropertyValue("--rw-offset-y").trim(),
        feather: cs.getPropertyValue("--rw-feather").trim(),
      };
    });
    check(
      "对齐补偿变量已注入",
      alignVars.scale === "101.500%" &&
        alignVars.offsetY === "0.6969%" && // 8/1148×100 = 0.69686… 四位小数
        alignVars.feather === "6.000%",
      JSON.stringify(alignVars)
    );

    // --- 对照组:关掉 overlay 后,同一批滚轮动作必须能驱动粒子消散/回升 ---
    // 上面那条守护断言要有意义,前提是"phase 确实会随滚轮变化"。没有这组对照,
    // phase 哪怕永远卡在 1(钩子失效/粒子根本没起来),守护断言也会假绿。
    // 顺带补上一直没人自动跑的交互主路径(滚轮消散 → 反向回升)。
    // 注意**不能按秒断言**:帧循环 dt 上限 0.1s,headless 软件渲染(禁用 GPU)
    // 帧率 <10fps 时缓动会明显慢于标称速度(实测 2.6s 只走完 0.8)——那是测试环境
    // 的产物,不是产品缺陷(真机 30fps+ 时 dt 不触顶)。所以一律等状态到位。
    async function waitPhase(pred, ms) {
      try {
        await page.waitForFunction(pred, null, { timeout: ms });
        return true;
      } catch {
        return false;
      }
    }

    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const phaseCtlStart = await page.evaluate(() => window.__flow.phase);
    await page.mouse.move(400, 450);
    await page.mouse.wheel(0, 300); // 阈值 80,累计 300 必触发消散
    const dissolved = await waitPhase(() => window.__flow.phase < 0.05, 30000);
    const phaseDissolved = await page.evaluate(() => window.__flow.phase);
    check(
      "对照组:overlay 关闭时滚轮触发消散",
      dissolved && phaseDissolved < 0.05,
      `phase=${phaseCtlStart.toFixed(3)}→${phaseDissolved.toFixed(3)}`
    );
    await page.mouse.wheel(0, -300);
    const risen = await waitPhase(() => window.__flow.phase >= 0.999, 30000);
    const phaseRisen = await page.evaluate(() => window.__flow.phase);
    check(
      "对照组:反向滚轮回升成形",
      risen && phaseRisen >= 0.999,
      `phase=${phaseDissolved.toFixed(3)}→${phaseRisen.toFixed(3)}`
    );
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
    await page.screenshot({ path: path.join(SHOTS, "realwall-mobile-default.png") });

    await page.locator(".realwall-thumb").first().tap();
    await page.waitForTimeout(800);
    check(
      "手机点开 overlay",
      await page.evaluate(() => !document.getElementById("realwall-overlay").hidden)
    );
    const wipeMobileStart = await readWipe(page);
    check("手机「改造前」入口进度 = 0", Math.abs(wipeMobileStart) < 0.001, `wipe=${wipeMobileStart}`);

    // 手机守卫基准(同桌面:等成形完成,再确认滑动不驱动粒子)
    await page.waitForFunction(() => window.__flow && window.__flow.phase >= 0.999, null, {
      timeout: 30000,
    });
    const phaseMobileBefore = await page.evaluate(() => window.__flow.phase);

    // 竖向拖动 → 横向擦除(CDP 派发真实触摸事件;竖直上滑半屏 ≈ 进度 +0.5)
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 195, y: 620 }],
    });
    for (let i = 1; i <= 8; i++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: 195, y: 620 - i * 26 }],
      });
      await page.waitForTimeout(30);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(300);
    const wipeMobileDrag = await readWipe(page);
    check(
      "手机上滑推进擦除",
      wipeMobileDrag > 0.3 && wipeMobileDrag < 0.7,
      `wipe=${wipeMobileDrag}`
    );
    await page.screenshot({ path: path.join(SHOTS, "realwall-mobile-wipe.png") });

    // 拖完不该被当成"点背景"误关闭(拖动位移远超阈值)
    check(
      "拖动后 overlay 仍打开(未误触关闭)",
      await page.evaluate(() => !document.getElementById("realwall-overlay").hidden)
    );

    // 208px 的上滑位移已远超触摸消散阈值(60px),phase 不变才是守卫在挡
    const phaseMobileAfter = await page.evaluate(() => window.__flow.phase);
    check(
      "擦除期间触摸未驱动粒子消散(守卫)",
      phaseMobileAfter >= 0.999,
      `phase=${phaseMobileBefore.toFixed(3)}→${phaseMobileAfter.toFixed(3)}, wipe 同期 0 → ${wipeMobileDrag.toFixed(3)}`
    );
    await ctx.close();
  }

  await browser.close();

  // 404 为发布前预期(新 tag 未推出时 CDN 资源回退本地的必经路径),不计为错误
  const errs = logs.filter(
    (l) => (l.includes("[error]") || l.includes("pageerror")) && !l.includes("404")
  );
  check("控制台零错误(404 除外)", errs.length === 0, errs.join(" | ").slice(0, 200));

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
