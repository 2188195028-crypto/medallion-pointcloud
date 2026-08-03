/* ============================================================
   verify.js — 多分辨率浏览器验证脚本（Playwright）
   1) 动态 resize：1280×720 → 1920×1080 → 2560×1440（不刷新页面）
   2) 静态视口：1366×768
   3) 时间线状态：?t=0.5 / 2.8 / 5.2 / 7.8 / 9.5 各截图
   输出：shots/verify-*.png + shots/verify-report.json
   用法：node tools/verify.js
   作者：Ligong-Wenchang  日期：2026-08-04
   ============================================================ */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const BASE = "http://127.0.0.1:8137/";
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
  await page.waitForTimeout(2500); // 渲染稳定 + 首帧诊断
}

async function collect(page) {
  return page.evaluate(() => {
    const r = (s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
    };
    const body = document.getElementById("body");
    const tp = document.getElementById("text-panel");
    const tpRect = tp.getBoundingClientRect();
    const meta = document.getElementById("meta");
    const bottom = document.getElementById("bottom-bar").getBoundingClientRect();
    const metaRect = meta.getBoundingClientRect();
    return {
      viewport: [window.innerWidth, window.innerHeight],
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      canvas: r("#stage canvas"),
      textPanel: r("#text-panel"),
      category: r("#category"),
      title: r("#title"),
      alias: r("#alias"),
      intro: r("#intro"),
      body: r("#body"),
      bodyLines: body ? body.getClientRects().length : null,
      features: r("#features"),
      meta: r("#meta"),
      bottomBar: r("#bottom-bar"),
      textBottom: +(tpRect.bottom).toFixed(1),
      metaBottom: +(metaRect.bottom).toFixed(1),
      barTop: +bottom.top.toFixed(1),
      metaBarGap: +(bottom.top - metaRect.bottom).toFixed(1),
      bodyOpacity: getComputedStyle(body).opacity,
      titleFont: getComputedStyle(document.getElementById("title")).fontSize,
      bodyFont: getComputedStyle(body).fontSize,
      loadingHidden: document.getElementById("loading").style.display === "none",
    };
  });
}

async function main() {
  const browser = await chromium.launch({
    executablePath:
      process.env.PW_CHROME ||
      "C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe",
  });
  const report = {};

  // ---------- A) 动态 resize 组 ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
    page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

    await page.goto(BASE + "?t=5.2&v=8", { timeout: 180000 });
    await waitForReady(page);
    await page.screenshot({ path: path.join(SHOTS, "verify-1280x720.png") });
    report["1280x720"] = await collect(page);

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(SHOTS, "verify-1920x1080.png") });
    report["1920x1080"] = await collect(page);

    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(SHOTS, "verify-2560x1440.png") });
    report["2560x1440"] = await collect(page);
    await ctx.close();
  }

  // ---------- B) 1366×768 静态 ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "?t=5.2&v=9", { timeout: 180000 });
    await waitForReady(page);
    await page.screenshot({ path: path.join(SHOTS, "verify-1366x768.png") });
    report["1366x768"] = await collect(page);
    await ctx.close();
  }

  // ---------- C) 时间线状态 ----------
  report.timeline = {};
  for (const t of [0.5, 2.8, 5.2, 7.8, 9.5]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    await page.goto(BASE + `?t=${t}&v=t${t}`, { timeout: 180000 });
    await waitForReady(page);
    await page.screenshot({ path: path.join(SHOTS, `verify-t${t}.png`) });
    const st = await page.evaluate(() => ({
      bodyTextLen: document.getElementById("body").textContent.length,
      featuresVisible: Array.from(document.querySelectorAll("#features li")).map((li) => getComputedStyle(li).opacity),
      progressNow: document.getElementById("progress").getAttribute("aria-valuenow"),
    }));
    report.timeline[`t${t}`] = st;
    await ctx.close();
  }

  // ---------- 汇总 ----------
  report.console = {
    particleCountLogs: logs.filter((l) => l.includes("实际粒子数量")),
    errors: logs.filter((l) => l.includes("error") || l.includes("错误") || l.includes("[pageerror]")),
    totalLogs: logs.length,
  };
  fs.writeFileSync(path.join(SHOTS, "verify-report.json"), JSON.stringify(report, null, 2), "utf-8");
  console.log("verify done → shots/verify-report.json");
  await browser.close();
}

main().catch((e) => {
  console.error("verify failed:", e);
  process.exit(1);
});
