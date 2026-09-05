/* ============================================================
   shot-realwall.js — 落地实景照片功能验证截图
   1) 桌面 1600×900:默认视图(缩略图) → 点开大图 → Esc 关闭 → 点背景关闭
   2) 手机 390×844 竖屏(触屏):默认视图 → 点开大图
   输出:shots/realwall-*.png
   用法:先起服务器 python tools/serve_debug.py 8137,再 node tools/shot-realwall.js
   作者:Ligong-Wenchang  日期:2026-09-01
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

async function main() {
  const browser = await chromium.launch({
    channel: "msedge", // chromium-1223 缓存已失效,改用系统 Edge(与作品集 tools/shot.mjs 同法)
    headless: true,
    args: ["--disable-gpu", "--no-sandbox"],
  });

  // ---------- 桌面 ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await ctx.newPage();
    page.on("console", (m) => logs.push(`[desktop][${m.type()}] ${m.text()}`));
    page.on("pageerror", (e) => logs.push(`[desktop][pageerror] ${e.message}`));

    await page.goto(BASE, { timeout: 180000 });
    await waitForReady(page);
    await page.screenshot({ path: path.join(SHOTS, "realwall-desktop-default.png") });

    // 缩略图数量与大盘可见性
    const thumbCount = await page.locator(".realwall-thumb").count();
    console.log("desktop thumbs:", thumbCount);

    // 点缩略图开大图
    await page.locator(".realwall-thumb").first().click();
    await page.waitForTimeout(600);
    const openAfterClick = await page.evaluate(
      () => !document.getElementById("realwall-overlay").hidden
    );
    console.log("overlay open after thumb click:", openAfterClick);
    await page.screenshot({ path: path.join(SHOTS, "realwall-desktop-overlay.png") });

    // Esc 关闭
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    console.log("closed by Esc:", await page.evaluate(() => document.getElementById("realwall-overlay").hidden));

    // 点背景关闭
    await page.locator(".realwall-thumb").nth(1).click();
    await page.waitForTimeout(400);
    await page.mouse.click(40, 450); // 左边缘背景
    await page.waitForTimeout(400);
    console.log("closed by backdrop:", await page.evaluate(() => document.getElementById("realwall-overlay").hidden));

    // 大图是否真的加载成功(naturalWidth>0;CDN 404 → 本地回退需 ~1-3s,条件等待而非固定延时)
    await page.locator(".realwall-thumb").first().click();
    await page.waitForTimeout(600);
    let allLoaded = true;
    try {
      await page.waitForFunction(
        () =>
          Array.from(document.querySelectorAll("#realwall-overlay .realwall-fig img")).every(
            (i) => i.naturalWidth > 0
          ),
        null,
        { timeout: 20000 }
      );
    } catch {
      allLoaded = false;
    }
    console.log("overlay images loaded:", allLoaded ? "all true" : "FAILED");
    await page.screenshot({ path: path.join(SHOTS, "realwall-desktop-overlay2.png") });
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
    const page = await ctx.newPage();
    page.on("console", (m) => logs.push(`[mobile][${m.type()}] ${m.text()}`));
    page.on("pageerror", (e) => logs.push(`[mobile][pageerror] ${e.message}`));

    await page.goto(BASE, { timeout: 180000 });
    await waitForReady(page);
    await page.screenshot({ path: path.join(SHOTS, "realwall-mobile-default.png") });

    await page.locator(".realwall-thumb").first().tap();
    await page.waitForTimeout(800);
    console.log("mobile overlay open:", await page.evaluate(() => !document.getElementById("realwall-overlay").hidden));
    await page.screenshot({ path: path.join(SHOTS, "realwall-mobile-overlay.png") });
    await ctx.close();
  }

  await browser.close();
  // 404 为发布前预期(新 tag 未推出时 CDN 资源回退本地的必经路径),不计为错误
  const errs = logs.filter(
    (l) => (l.includes("[error]") || l.includes("pageerror")) && !l.includes("404")
  );
  console.log("console errors:", errs.length ? errs : "none");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
