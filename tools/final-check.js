/* ============================================================
   final-check.js — 循环衔接 + 重启按钮 + 键盘可达性验证
   1) 真实运行(不冻结),等一个完整 10s 周期 + 进入下一轮
   2) 验证循环点无残留:下一轮 ~0.5s 时画面应回到散开状态
   3) 点击/键盘触发重启按钮,验证进度归零
   输出:shots/final-check.json + 截图
   用法:node tools/final-check.js
   作者:Ligong-Wenchang  日期:2026-08-04
   ============================================================ */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const BASE = "http://127.0.0.1:8137/";
const SHOTS = path.join(__dirname, "..", "shots");

async function main() {
  const browser = await chromium.launch({
    executablePath:
      process.env.PW_CHROME ||
      "C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe",
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));

  const report = { errors: [] };
  await page.goto(BASE + "?v=final", { timeout: 180000 });
  await page.waitForFunction(
    () => document.getElementById("loading").style.display === "none",
    null, { timeout: 180000 }
  );

  // 等待一个完整周期:从加载完成起等 11s → 应处于下一轮 ~1s
  await page.waitForTimeout(11000);
  const next = await page.evaluate(() => ({
    progress: document.getElementById("progress").getAttribute("aria-valuenow"),
    bodyLen: document.getElementById("body").textContent.length,
    titleOpacity: getComputedStyle(document.getElementById("title")).opacity,
    featuresOpacity: getComputedStyle(document.querySelector("#features li")).opacity,
  }));
  report.afterOneCycle = next;
  await page.screenshot({ path: path.join(SHOTS, "final-cycle2.png") });

  // 点击重启按钮
  await page.click("#restart");
  await page.waitForTimeout(300);
  const afterRestart = await page.evaluate(() => ({
    progress: document.getElementById("progress").getAttribute("aria-valuenow"),
  }));
  report.afterRestart = afterRestart;

  // 键盘触发(Enter/Space 天然触发 button click,再点一次验证)
  await page.focus("#restart");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const afterKeyboard = await page.evaluate(() => ({
    progress: document.getElementById("progress").getAttribute("aria-valuenow"),
  }));
  report.afterKeyboard = afterKeyboard;

  // 粒子数量最终确认(诊断窗口)
  report.errors = errors;
  fs.writeFileSync(path.join(SHOTS, "final-check.json"), JSON.stringify(report, null, 2), "utf-8");
  console.log("final-check done:", JSON.stringify(report));
  await browser.close();
}

main().catch((e) => { console.error("final-check failed:", e); process.exit(1); });
