#!/usr/bin/env node
/**
 * 预览页截图工具（开发用，不参与小游戏运行）。
 *
 * 先启动带调试端口的 Chrome：
 *   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *     --headless=new --no-sandbox --disable-gpu --hide-scrollbars \
 *     --user-data-dir=.preview-out/prof --remote-debugging-port=9333 about:blank
 *
 * 再执行：
 *   node preview/shot.mjs --page "screen=home&clean=1" --out .preview-out/home.png
 *
 * 参数：
 *   --page   preview/index.html 的 query，或完整 URL
 *   --out    输出 png 路径
 *   --w/--h  视口尺寸（默认 375×812）
 *   --scale  设备像素比（默认 2）
 *   --full   截取整页（总览页用）
 *   --wait   额外等待毫秒（默认 350）
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes('--' + name);

const CDP = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9333';
const page = arg('page', 'screen=home&clean=1');
const out = resolve(arg('out', '.preview-out/shot.png'));
const W = Number(arg('w', 375));
const H = Number(arg('h', 812));
const SCALE = Number(arg('scale', 2));
const waitExtra = Number(arg('wait', 350));
const url = /^https?:/.test(page) ? page : `http://127.0.0.1:8123/preview/index.html?${page}`;

function connect(wsUrl) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => res(ws);
    ws.onerror = (e) => rej(new Error('ws error'));
  });
}

function client(ws) {
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  };
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const created = await fetch(`${CDP}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' }).then((r) => r.json());
const ws = await connect(created.webSocketDebuggerUrl);
const send = client(ws);

await send('Page.enable');
await send('Runtime.enable');
// 预览台每次都用最新的 core/ui/screens/fixtures，避免改完代码截到旧缓存
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', {
  width: W,
  height: H,
  deviceScaleFactor: SCALE,
  mobile: true,
});
await send('Page.navigate', { url });

let ready = false;
for (let i = 0; i < 80; i++) {
  await sleep(120);
  try {
    const r = await send('Runtime.evaluate', { expression: 'window.__ready === true', returnByValue: true });
    if (r.result && r.result.value === true) {
      ready = true;
      break;
    }
  } catch (e) {
    /* page navigating */
  }
}
if (!ready) {
  const err = await send('Runtime.evaluate', { expression: 'document.getElementById("meta") && document.getElementById("meta").textContent', returnByValue: true });
  throw new Error('预览未就绪：' + JSON.stringify(err.result && err.result.value));
}
await sleep(waitExtra);

let clip;
if (has('full')) {
  const m = await send('Page.getLayoutMetrics');
  const size = m.cssContentSize || m.contentSize;
  clip = { x: 0, y: 0, width: size.width, height: size.height, scale: 1 };
}
const shot = await send('Page.captureScreenshot', {
  format: 'png',
  fromSurface: true,
  captureBeyondViewport: has('full'),
  ...(clip ? { clip } : {}),
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, Buffer.from(shot.data, 'base64'));
console.log(out);
await send('Page.close').catch(() => {});
ws.close();
