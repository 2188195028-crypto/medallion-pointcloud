/* time-load.js — 测量页面加载各阶段耗时(诊断用) */
const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: "C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe" });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  const logs = [];
  p.on("console", (m) => logs.push(m.text()));
  const t0 = Date.now();
  await p.goto("http://127.0.0.1:8137/?t=5.2&v=timing", { timeout: 180000 });
  await p.waitForFunction(() => document.getElementById("loading").style.display === "none", null, { timeout: 180000 });
  console.log("总耗时(导航→loading隐藏):", Date.now() - t0, "ms");
  for (const l of logs) {
    if (l.includes("阶段计时") || l.includes("实际粒子")) console.log(l.slice(0, 120));
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
