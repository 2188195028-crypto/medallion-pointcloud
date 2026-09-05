/* ============================================================
   verify.js — 多分辨率浏览器回归验证(Playwright + 系统 Edge)
   A) 动态 resize:1280×720 → 1920×1080 → 2560×1440(?t=5.2 冻结成形态,不刷新)
   B) 1366×768 静态视口
   C) 冻结状态 ?t=0(散开)/ ?t=5.2(成形) 对比截图
   D) 手机 390×844(isMobile+hasTouch,触屏降档)
   顺带断言/采集:实景缩略图加载(naturalWidth>0,覆盖 CDN 404 回退)、
   粒子数日志 = 90000、加载耗时(吸收原 time-load.js 职能)、
   控制台零 pageerror/error、竖屏 order(meta 在正文上方)、无横向溢出。
   输出:shots/verify-*.png + shots/verify-report.json;阻断断言失败退出码 1。
   用法:先起服务器 python tools/serve_debug.py 8137,再 node tools/verify.js
   作者:Ligong-Wenchang  日期:2026-09-05(重写:msedge 通道 + 纯交互模式 + realwall)
   ============================================================ */
const { chromium } = require("playwright-core");
const path = require("path");
const fs = require("fs");

const BASE = "http://127.0.0.1:8137/";
const SHOTS = path.join(__dirname, "..", "shots");
fs.mkdirSync(SHOTS, { recursive: true });

const logs = []; // [viewport组][type] 文本
const fails = []; // 阻断断言失败记录

function record(group, type, text) {
  logs.push(`[${group}][${type}] ${text}`);
}

async function waitForReady(page, group) {
  const t0 = Date.now();
  await page.waitForFunction(
    () => {
      const el = document.getElementById("loading");
      return el && el.style.display === "none";
    },
    null,
    { timeout: 180000 }
  );
  const loadMs = Date.now() - t0;
  record(group, "info", `loading 消失耗时 ${loadMs}ms`);
  await page.waitForTimeout(2500); // 渲染稳定 + 打字机/淡入进行
  return loadMs;
}

// 缩略图 settle:CDN 成功(naturalWidth>0)或 CDN 失败已回退本地 src
// (发布前 jsDelivr/raw 上游对同一 URL 逐次 404/ORB/挂起不定,挂起时 img 不触发
//  error 也就没有回退;等 20s,仍未落定记 warn 由 collect 的 loaded 断言裁决)
async function waitThumbsSettle(page, group, ms) {
  try {
    await page.waitForFunction(
      () => {
        const imgs = Array.from(document.querySelectorAll(".realwall-thumb img"));
        if (!imgs.length) return false;
        return imgs.every((i) => i.complete && (i.naturalWidth > 0 || !i.src.includes("cdn.jsdelivr.net")));
      },
      null,
      { timeout: ms }
    );
  } catch {
    record(group, "warn", "缩略图 20s 未 settle(CDN 上游挂起)");
  }
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
    const metaRect = meta.getBoundingClientRect();
    const bw = document.getElementById("body-wrap");
    const bwRect = bw.getBoundingClientRect();
    const thumbs = Array.from(document.querySelectorAll(".realwall-thumb"));
    return {
      viewport: [window.innerWidth, window.innerHeight],
      scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
      canvas: r("#stage canvas"),
      textPanel: r("#text-panel"),
      title: r("#title"),
      intro: r("#intro"),
      body: r("#body"),
      bodyLines: body ? body.getClientRects().length : null,
      features: r("#features"),
      meta: r("#meta"),
      metaTop: +metaRect.top.toFixed(1),
      bodyWrapTop: +bwRect.top.toFixed(1),
      // 竖屏 order 校验:meta(颜色/工艺线索)在正文上方 ⇔ metaTop < bodyWrapTop
      portraitOrder: metaRect.top < bwRect.top,
      realwallThumbs: thumbs.length,
      realwallLoaded: thumbs.length > 0 && thumbs.every((t) => {
        const img = t.querySelector("img");
        return img && img.naturalWidth > 0;
      }),
      bottomBar: r("#bottom-bar"),
      loadingHidden: document.getElementById("loading").style.display === "none",
      // 看门狗误报防护:error 面板必须始终隐藏(出现即加载真失败,假绿防护)
      errorVisible: !document.getElementById("error").hidden,
    };
  });
}

async function main() {
  const browser = await chromium.launch({
    channel: "msedge", // chromium-1223/1234 缓存路径已失效,系统 Edge 与作品集 tools/shot.mjs 同法
    headless: true,
    args: ["--disable-gpu", "--no-sandbox"],
  });
  const report = {};
  const errors = []; // 真实错误:pageerror + 非"资源加载失败"类 console.error
  // CDN 上游(发布前 tag 未推出属预期,回退路径兜底;发布轮必须全净):
  // 请求起点 cdn.jsdelivr.net,404 时 jsDelivr 302 重定向到 raw.githubusercontent.com
  // (ref 规范化为 "1.6"),最终 URL 记在后者 —— 两个 host 同属一条预期失败链路
  const isCdnHost = (u) => u.includes("cdn.jsdelivr.net") || u.includes("githubusercontent.com");
  const netCdn = [];
  const netLocal = []; // 本地/同源资源 4xx 或失败(真实问题)

  async function makePage(ctx, group) {
    const page = await ctx.newPage();
    page.on("response", (r) => {
      if (r.status() >= 400) {
        (isCdnHost(r.url()) ? netCdn : netLocal).push(`[${group}] ${r.status()} ${r.url()}`);
      }
    });
    page.on("requestfailed", (r) => {
      const e = r.failure() && r.failure().errorText;
      (isCdnHost(r.url()) ? netCdn : netLocal).push(`[${group}] REQFAIL(${e}) ${r.url()}`);
    });
    page.on("console", (m) => {
      record(group, m.type(), m.text());
      // "Failed to load resource" 由上面的 response/requestfailed 监听归因,不重复计入
      if (m.type() === "error" && !m.text().includes("Failed to load resource")) {
        errors.push(`[${group}] console.error: ${m.text()}`);
      }
    });
    page.on("pageerror", (e) => errors.push(`[${group}] pageerror: ${e.message}`));
    return page;
  }

  // ---------- A) 动态 resize 组 ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await makePage(ctx, "A");
    const t0 = Date.now();
    await page.goto(BASE + "?t=5.2&v=8&nowatchdog=1", { timeout: 180000 });
    await waitForReady(page, "A");
    await waitThumbsSettle(page, "A", 20000);
    record("A", "info", `goto→ready 总耗时 ${Date.now() - t0}ms`);
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
    const page = await makePage(ctx, "B");
    await page.goto(BASE + "?t=5.2&v=9&nowatchdog=1", { timeout: 180000 });
    await waitForReady(page, "B");
    await waitThumbsSettle(page, "B", 20000);
    await page.screenshot({ path: path.join(SHOTS, "verify-1366x768.png") });
    report["1366x768"] = await collect(page);
    await ctx.close();
  }

  // ---------- C) 冻结状态:散开 t=0 vs 成形 t=5.2 ----------
  report.states = {};
  for (const t of [0, 5.2]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await makePage(ctx, `C-t${t}`);
    await page.goto(BASE + `?t=${t}&v=t${t}&nowatchdog=1`, { timeout: 180000 });
    await waitForReady(page, `C-t${t}`);
    await page.screenshot({ path: path.join(SHOTS, `verify-t${t}.png`) });
    const st = await page.evaluate(() => ({
      bodyLen: document.getElementById("body").textContent.length,
    }));
    report.states[`t${t}`] = st;
    await ctx.close();
  }

  // ---------- D) 手机竖屏(触屏) ----------
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const page = await makePage(ctx, "D");
    await page.goto(BASE + "?t=5.2&v=m&nowatchdog=1", { timeout: 180000 });
    await waitForReady(page, "D");
    await waitThumbsSettle(page, "D", 20000);
    await page.screenshot({ path: path.join(SHOTS, "verify-390x844.png") });
    report["390x844"] = await collect(page);
    await ctx.close();
  }

  // ---------- 汇总 ----------
  const particleLogs = logs.filter((l) => l.includes("实际粒子数量"));
  const particleOk = particleLogs.some((l) => l.includes("90000")) ||
    logs.some((l) => l.includes("粒子数量") && l.includes("90000"));
  report.console = {
    particleLogs: particleLogs.slice(0, 3),
    particleOk,
    errors,
    netLocal,
    netCdn: netCdn.slice(0, 12),
    netCdnCount: netCdn.length,
    warnSample: logs.filter((l) => l.includes("[warn]")).slice(0, 5),
    totalLogs: logs.length,
  };

  // 阻断断言
  for (const [name, c] of Object.entries(report)) {
    if (!c || typeof c !== "object") continue;
    if (c.viewport && c.scroll && c.scroll[0] > c.viewport[0] + 1) {
      fails.push(`${name} 横向溢出: scrollWidth=${c.scroll[0]} > innerWidth=${c.viewport[0]}`);
    }
    if (c.realwallThumbs !== undefined && (!c.realwallLoaded || c.realwallThumbs !== 2)) {
      fails.push(`${name} 实景缩略图异常: count=${c.realwallThumbs} loaded=${c.realwallLoaded}`);
    }
    if (c.errorVisible) fails.push(`${name} 看门狗 error 面板可见(加载被拖过 45s,判失败)`);
  }
  if (!particleOk) fails.push("粒子数日志未确认 = 90000");
  if (errors.length) fails.push(`控制台 ${errors.length} 条真实 pageerror/error(见 report.console.errors)`);
  if (netLocal.length) fails.push(`本地资源 ${netLocal.length} 条 4xx/失败(见 report.console.netLocal)`);
  // netCdn(CDN 404/重置)发布前属预期:回退路径已兜底;线上发布轮必须为 0
  report.fails = fails;

  fs.writeFileSync(path.join(SHOTS, "verify-report.json"), JSON.stringify(report, null, 2), "utf-8");
  console.log("verify done → shots/verify-report.json");
  if (fails.length) {
    console.error("阻断断言失败:");
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
