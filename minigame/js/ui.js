const { COLORS, OPTION_STYLES, avatarText, avatarBg } = require('./core');

/* ------------------------------------------------------------------ *
 * 果汁街机 · Canvas 绘制系统
 *
 * 基调：奶油纸底、深可可描边、实心投影、歪一点的小徽章。
 * 所有视觉元素都用 Canvas 画，不依赖图片资源。
 * ------------------------------------------------------------------ */

let canvas = null;
let ctx = null;
let W = 375;
let H = 667;
let S = 0.5;
let DPR = 1;
let SAFE_TOP = 20;
let SAFE_BOTTOM = 0;

const FONT = '"PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif';
const INK = COLORS.ink;

function init(canvasRef, info) {
  canvas = canvasRef;
  W = info.windowWidth || 375;
  H = info.windowHeight || 667;
  DPR = info.pixelRatio || 1;
  S = W / 750;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);
  ctx.imageSmoothingEnabled = true;
  const safe = info.safeArea || {};
  let menuBottom = 0;
  try {
    if (wx.getMenuButtonBoundingClientRect) {
      const menu = wx.getMenuButtonBoundingClientRect();
      if (menu && menu.bottom) menuBottom = menu.bottom;
    }
  } catch (err) {}
  SAFE_TOP = Math.max(safe.top || 20, menuBottom ? menuBottom + 4 : 20);
  SAFE_BOTTOM = Math.max(0, H - (safe.bottom || H));
}

function rpx(v) { return v * S; }
function width() { return W; }
function height() { return H; }
function safeTop() { return SAFE_TOP; }
function safeBottom() { return SAFE_BOTTOM; }
function context() { return ctx; }
function now() { return Date.now(); }

function alpha(color, a) {
  if (!color || color[0] !== '#') return color;
  let hex = color.slice(1);
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const n = parseInt(hex, 16);
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function easeOutBack(t) {
  const c = 1.70158;
  const p = t - 1;
  return 1 + (c + 1) * p * p * p + c * p * p;
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

/* 入场动效进度：0 → 1 */
function appear(app, delay) {
  const from = (app && app.state && app.state.screenAt) || 0;
  const age = Math.max(0, now() - from - (delay || 0));
  return clamp(age / 320, 0, 1);
}

/* ----------------------------- 基础 ----------------------------- */

function begin(app, opts) {
  const o = opts || {};
  app.hits = [];
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = o.paper || COLORS.paper;
  ctx.fillRect(0, 0, W, H);

  if (o.texture !== false) {
    // 大色块：让底色不是一块死板的米色
    skyBlob(W * 1.04, -H * 0.02, W * 0.66, alpha(COLORS.orange, 0.18));
    skyBlob(-W * 0.16, H * 0.72, W * 0.58, alpha(COLORS.lime, 0.10));
    skyBlob(W * 0.92, H * 1.02, W * 0.5, alpha(COLORS.grape, 0.08));
    if (o.dots !== false) dotGrid();
    if (o.deco !== false) decorations(app);
  }

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
}

function skyBlob(cx, cy, r, color) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function dotGrid() {
  const step = rpx(72);
  const rad = rpx(2);
  ctx.fillStyle = alpha(COLORS.ink, 0.045);
  for (let y = step; y < H; y += step) {
    for (let x = step; x < W; x += step) {
      ctx.fillRect(x, y, rad, rad);
    }
  }
}

function decorations() {
  const t = now() / 1000;
  const bob = Math.sin(t * 1.4) * rpx(5);
  sparkle(W * 0.90, SAFE_TOP + rpx(150) + bob, rpx(16), alpha(COLORS.butter, 0.9));
  sparkle(W * 0.07, H * 0.52 - bob, rpx(11), alpha(COLORS.orange, 0.55));
  sparkle(W * 0.93, H * 0.62 + bob, rpx(9), alpha(COLORS.grape, 0.5));
  ctx.beginPath();
  ctx.arc(W * 0.12, H * 0.30, rpx(4), 0, Math.PI * 2);
  ctx.fillStyle = alpha(COLORS.lime, 0.5);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W * 0.86, H * 0.44, rpx(3), 0, Math.PI * 2);
  ctx.fillStyle = alpha(COLORS.berry, 0.4);
  ctx.fill();
}

/* ----------------------------- 文字 ----------------------------- */

function setFont(size, weight) {
  ctx.font = (weight || '400') + ' ' + rpx(size) + 'px ' + FONT;
}

function text(value, x, y, opts) {
  const o = opts || {};
  setFont(o.size || 28, o.weight || '400');
  ctx.fillStyle = o.color || COLORS.text;
  const str = String(value == null ? '' : value);
  if (o.rotate) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((o.rotate * Math.PI) / 180);
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'top';
    ctx.fillText(o.maxWidth ? ellipsis(str, o.maxWidth) : str, 0, 0);
    ctx.restore();
  } else {
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'top';
    ctx.fillText(o.maxWidth ? ellipsis(str, o.maxWidth) : str, x, y);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

/* 带描边的标题：贴纸感的关键 */
function display(value, x, y, opts) {
  const o = opts || {};
  const size = o.size || 60;
  const weight = o.weight || '800';
  setFont(size, weight);
  const str = String(value == null ? '' : value);
  const lw = o.outlineWidth == null ? rpx(9) : o.outlineWidth;
  const align = o.align || 'left';
  const baseline = o.baseline || 'top';

  ctx.save();
  let dx = x;
  let dy = y;
  if (o.rotate) {
    ctx.translate(x, y);
    ctx.rotate((o.rotate * Math.PI) / 180);
    dx = 0;
    dy = 0;
  }
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  if (lw > 0) {
    ctx.strokeStyle = o.outline || INK;
    ctx.lineWidth = lw;
    ctx.strokeText(str, dx, dy);
  }
  ctx.fillStyle = o.color || COLORS.card;
  ctx.fillText(str, dx, dy);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
}

function measure(value, size, weight) {
  setFont(size || 28, weight || '400');
  return ctx.measureText(String(value == null ? '' : value)).width;
}

function ellipsis(value, maxWidth) {
  const str = String(value == null ? '' : value);
  if (ctx.measureText(str).width <= maxWidth) return str;
  let out = str;
  while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + '…';
}

function wrap(value, maxWidth, size, weight, maxLines) {
  setFont(size || 28, weight || '400');
  const str = String(value == null ? '' : value);
  const lines = [];
  let line = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '\n') {
      lines.push(line);
      line = '';
      continue;
    }
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      const noStart = '，。、；：！？）》」』%”’…';
      if (noStart.indexOf(ch) >= 0 && line.length > 1) {
        const last = line.slice(-1);
        lines.push(line.slice(0, -1));
        line = last + ch;
      } else {
        lines.push(line);
        line = ch;
      }
    } else {
      line = test;
    }
    if (maxLines && lines.length >= maxLines) break;
  }
  if (!maxLines || lines.length < maxLines) lines.push(line);
  return lines;
}

function paragraph(value, x, y, maxWidth, opts) {
  const o = opts || {};
  const size = o.size || 28;
  const lineHeight = o.lineHeight || size * 1.55;
  const lines = wrap(value, maxWidth, size, o.weight, o.maxLines);
  lines.forEach((line, i) => {
    text(line, x, y + i * rpx(lineHeight), o);
  });
  return y + lines.length * rpx(lineHeight);
}

/* ----------------------------- 图形 ----------------------------- */

function roundRect(x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRound(x, y, w, h, r, fill) {
  roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRound(x, y, w, h, r, stroke, lineWidth) {
  roundRect(x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth || 2;
  ctx.stroke();
}

function dashedLine(x1, y1, x2, y2, color, dash, gap, lineWidth) {
  ctx.save();
  if (ctx.setLineDash) ctx.setLineDash([dash || rpx(10), gap || rpx(8)]);
  ctx.strokeStyle = color || alpha(COLORS.ink, 0.28);
  ctx.lineWidth = lineWidth || rpx(2);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function sparkle(cx, cy, size, color) {
  const s = size;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.quadraticCurveTo(cx + s * 0.18, cy - s * 0.18, cx + s, cy);
  ctx.quadraticCurveTo(cx + s * 0.18, cy + s * 0.18, cx, cy + s);
  ctx.quadraticCurveTo(cx - s * 0.18, cy + s * 0.18, cx - s, cy);
  ctx.quadraticCurveTo(cx - s * 0.18, cy - s * 0.18, cx, cy - s);
  ctx.closePath();
  ctx.fillStyle = color || COLORS.butter;
  ctx.fill();
}

function rays(cx, cy, r1, r2, count, color, rotation) {
  const step = (Math.PI * 2) / count;
  const rot = rotation || 0;
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const a = rot + i * step;
    const half = step * 0.26;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a - half) * r1, cy + Math.sin(a - half) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.lineTo(cx + Math.cos(a + half) * r1, cy + Math.sin(a + half) * r1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function confetti(x, y, w, h, seed, t) {
  const pieces = [
    [0.04, 0.12, COLORS.orange], [0.16, 0.34, COLORS.lime], [0.08, 0.62, COLORS.grape],
    [0.26, 0.08, COLORS.butter], [0.34, 0.28, COLORS.berry], [0.48, 0.10, COLORS.sky],
    [0.62, 0.24, COLORS.lime], [0.76, 0.06, COLORS.orange], [0.88, 0.20, COLORS.grape],
    [0.94, 0.44, COLORS.butter], [0.72, 0.46, COLORS.berry], [0.42, 0.44, COLORS.sky],
    [0.10, 0.86, COLORS.berry], [0.30, 0.92, COLORS.butter], [0.55, 0.88, COLORS.lime],
    [0.80, 0.90, COLORS.orange], [0.66, 0.74, COLORS.grape], [0.90, 0.70, COLORS.sky],
  ];
  const phase = (t || 0) / 1000;
  pieces.forEach((p, i) => {
    const drift = Math.sin(phase * 0.9 + i * 1.7) * rpx(6);
    const px = x + w * p[0] + drift + (seed || 0) * 0.01;
    const py = y + h * p[1] + Math.cos(phase * 0.7 + i) * rpx(4);
    const s = rpx(i % 3 === 0 ? 12 : 9);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(phase * 0.8 + i);
    ctx.fillStyle = alpha(p[2], 0.9);
    ctx.fillRect(-s / 2, -s / 2, s, s * 0.62);
    ctx.restore();
  });
}

/* ----------------------------- 图标 ----------------------------- */

function icon(kind, cx, cy, size, opts) {
  const o = opts || {};
  const color = o.color || INK;
  const u = size / 24;
  const P = (x, y) => [cx + (x - 12) * u, cy + (y - 12) * u];
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = o.width || Math.max(1.4, size * 0.085);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const line = (pts, close) => {
    ctx.beginPath();
    pts.forEach((pt, i) => {
      const q = P(pt[0], pt[1]);
      if (i === 0) ctx.moveTo(q[0], q[1]);
      else ctx.lineTo(q[0], q[1]);
    });
    if (close) ctx.closePath();
    ctx.stroke();
  };
  const dot = (x, y, r) => {
    const q = P(x, y);
    ctx.beginPath();
    ctx.arc(q[0], q[1], r * u, 0, Math.PI * 2);
    ctx.fill();
  };
  const circle = (x, y, r) => {
    const q = P(x, y);
    ctx.beginPath();
    ctx.arc(q[0], q[1], r * u, 0, Math.PI * 2);
    ctx.stroke();
  };

  if (kind === 'home') {
    line([[4, 11], [12, 4], [20, 11]]);
    line([[6.5, 10], [6.5, 20], [17.5, 20], [17.5, 10]]);
    line([[10, 20], [10, 14.5], [14, 14.5], [14, 20]]);
  } else if (kind === 'trophy') {
    ctx.beginPath();
    const l = P(6.5, 4), r = P(17.5, 4);
    ctx.moveTo(l[0], l[1]);
    ctx.lineTo(r[0], r[1]);
    ctx.lineTo(r[0], P(13, 13)[1]);
    ctx.quadraticCurveTo(P(12, 17.5)[0], P(12, 17.5)[1], l[0], P(13, 13)[1]);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    const oh = P(6.5, 7);
    ctx.arc(oh[0], oh[1], 3 * u, Math.PI * 0.5, Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    const oh2 = P(17.5, 7);
    ctx.arc(oh2[0], oh2[1], 3 * u, Math.PI * 1.5, Math.PI * 0.5);
    ctx.stroke();
    line([[9, 20.5], [15, 20.5]]);
    line([[12, 17], [12, 20.5]]);
  } else if (kind === 'user') {
    circle(12, 8.5, 3.6);
    ctx.beginPath();
    const s = P(4.5, 20.5), e = P(19.5, 20.5), m = P(12, 11);
    ctx.moveTo(s[0], s[1]);
    ctx.quadraticCurveTo(m[0], m[1], e[0], e[1]);
    ctx.stroke();
  } else if (kind === 'users') {
    circle(9, 9, 3);
    circle(16.5, 10, 2.4);
    ctx.beginPath();
    let s = P(3, 20), e = P(15, 20), m = P(9, 12);
    ctx.moveTo(s[0], s[1]);
    ctx.quadraticCurveTo(m[0], m[1], e[0], e[1]);
    ctx.stroke();
    ctx.beginPath();
    s = P(16, 20); e = P(22, 20); m = P(19.5, 13.5);
    ctx.moveTo(s[0], s[1]);
    ctx.quadraticCurveTo(m[0], m[1], e[0], e[1]);
    ctx.stroke();
  } else if (kind === 'book') {
    roundRect(P(4.5, 4)[0], P(4.5, 4)[1], 15 * u, 16 * u, 2.5 * u);
    ctx.stroke();
    line([[9, 4], [9, 20]]);
    line([[12, 9], [16.5, 9]]);
    line([[12, 12.5], [16.5, 12.5]]);
  } else if (kind === 'lock') {
    roundRect(P(5, 11)[0], P(5, 11)[1], 14 * u, 9 * u, 2.5 * u);
    ctx.stroke();
    ctx.beginPath();
    const q = P(8.5, 11);
    ctx.arc(q[0], q[1], 3.5 * u, Math.PI, Math.PI * 2);
    ctx.stroke();
    dot(12, 15.2, 1.4);
  } else if (kind === 'share') {
    line([[12, 3], [12, 14]]);
    line([[8, 7], [12, 3], [16, 7]]);
    line([[5, 12], [5, 20], [19, 20], [19, 12]]);
  } else if (kind === 'copy') {
    roundRect(P(8.5, 8.5)[0], P(8.5, 8.5)[1], 11 * u, 11.5 * u, 2.5 * u);
    ctx.stroke();
    line([[5, 15.5], [5, 5.5], [15, 5.5], [15, 7.5]]);
  } else if (kind === 'bolt') {
    line([[13.5, 2.5], [5.5, 13.5], [11.5, 13.5], [10.5, 21.5], [18.5, 10.5], [12.5, 10.5]], true);
    ctx.fill();
  } else if (kind === 'clock') {
    circle(12, 12, 8);
    line([[12, 7], [12, 12], [15.5, 14]]);
  } else if (kind === 'coin') {
    circle(12, 12, 8);
    line([[12, 8], [12, 16]]);
    line([[9.5, 10.5], [14.5, 10.5]]);
    line([[9.5, 13.5], [14.5, 13.5]]);
  } else if (kind === 'crown') {
    line([[4, 18], [4, 8], [9, 12], [12, 5.5], [15, 12], [20, 8], [20, 18]], true);
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'check') {
    line([[4.5, 12.5], [9.5, 17.5], [19.5, 6.5]]);
  } else if (kind === 'cross') {
    line([[6, 6], [18, 18]]);
    line([[18, 6], [6, 18]]);
  } else if (kind === 'plus') {
    line([[12, 5], [12, 19]]);
    line([[5, 12], [19, 12]]);
  } else if (kind === 'minus') {
    line([[6, 12], [18, 12]]);
  } else if (kind === 'arrow-left') {
    line([[15, 5], [8, 12], [15, 19]]);
  } else if (kind === 'chevron-right') {
    line([[9.5, 5], [16.5, 12], [9.5, 19]]);
  } else if (kind === 'refresh') {
    ctx.beginPath();
    const q = P(12, 12);
    ctx.arc(q[0], q[1], 7.5 * u, Math.PI * 0.35, Math.PI * 1.95);
    ctx.stroke();
    line([[16, 3.5], [18.5, 7.5], [14.2, 8.4]], true);
    ctx.fill();
  } else if (kind === 'trash') {
    line([[5, 7], [19, 7]]);
    line([[9.5, 7], [10, 4.5], [14, 4.5], [14.5, 7]]);
    line([[7, 7], [8, 20], [16, 20], [17, 7]]);
    line([[10.5, 11], [10.5, 16.5]]);
    line([[13.5, 11], [13.5, 16.5]]);
  } else if (kind === 'flag') {
    line([[6, 21], [6, 3.5]]);
    line([[6, 4], [18, 7], [6, 11]], true);
    ctx.fill();
  } else if (kind === 'play') {
    line([[8, 5], [18.5, 12], [8, 19]], true);
    ctx.fill();
  } else if (kind === 'sparkle') {
    ctx.beginPath();
    const q = P(12, 12);
    ctx.moveTo(q[0], q[1] - 8 * u);
    ctx.quadraticCurveTo(q[0] + 1.5 * u, q[1] - 1.5 * u, q[0] + 8 * u, q[1]);
    ctx.quadraticCurveTo(q[0] + 1.5 * u, q[1] + 1.5 * u, q[0], q[1] + 8 * u);
    ctx.quadraticCurveTo(q[0] - 1.5 * u, q[1] + 1.5 * u, q[0] - 8 * u, q[1]);
    ctx.quadraticCurveTo(q[0] - 1.5 * u, q[1] - 1.5 * u, q[0], q[1] - 8 * u);
    ctx.fill();
  } else if (kind === 'edit') {
    line([[5, 19], [6, 15], [16, 5], [19, 8], [9, 18]], true);
    line([[14.5, 6.5], [17.5, 9.5]]);
  } else if (kind === 'camera') {
    roundRect(P(3.5, 7)[0], P(3.5, 7)[1], 17 * u, 12 * u, 3 * u);
    ctx.stroke();
    line([[9, 7], [10.2, 4.5], [13.8, 4.5], [15, 7]]);
    circle(12, 13, 3.4);
  } else if (kind === 'shield') {
    line([[12, 3], [19, 6], [19, 12], [12, 21], [5, 12], [5, 6]], true);
    line([[9, 12], [11.5, 14.5], [15.5, 9.5]]);
  } else if (kind === 'wifi') {
    ctx.beginPath();
    const q = P(12, 17);
    ctx.arc(q[0], q[1], 6 * u, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
    dot(12, 18, 1.6);
  } else if (kind === 'music') {
    // 八分音符
    const headA = P(8.4, 17.4);
    ctx.beginPath();
    ctx.arc(headA[0], headA[1], 2.9 * u, 0, Math.PI * 2);
    ctx.fill();
    const headB = P(17.4, 15.6);
    ctx.beginPath();
    ctx.arc(headB[0], headB[1], 2.9 * u, 0, Math.PI * 2);
    ctx.fill();
    line([[11.3, 17.2], [11.3, 5.6], [20.3, 4.1], [20.3, 15.4]]);
    line([[11.3, 8.5], [20.3, 7]]);
  } else if (kind === 'bell') {
    ctx.beginPath();
    const q = P(12, 12);
    ctx.moveTo(q[0] - 6.6 * u, q[1] + 6.2 * u);
    ctx.quadraticCurveTo(q[0] - 4.6 * u, q[1] + 3.2 * u, q[0] - 4.6 * u, q[1] - 0.8 * u);
    ctx.quadraticCurveTo(q[0] - 4.6 * u, q[1] - 7.6 * u, q[0], q[1] - 7.6 * u);
    ctx.quadraticCurveTo(q[0] + 4.6 * u, q[1] - 7.6 * u, q[0] + 4.6 * u, q[1] - 0.8 * u);
    ctx.quadraticCurveTo(q[0] + 4.6 * u, q[1] + 3.2 * u, q[0] + 6.6 * u, q[1] + 6.2 * u);
    ctx.closePath();
    ctx.stroke();
    line([[9.9, 6.2], [14.1, 6.2]]);
    const clapper = P(12, 18.2);
    ctx.beginPath();
    ctx.arc(clapper[0], clapper[1], 1.5 * u, 0, Math.PI * 2);
    ctx.fill();
  } else {
    circle(12, 12, 7.5);
  }
  ctx.restore();
}

function lineIcon(kind, x, y, size, color) {
  icon(kind, x + size / 2, y + size / 2, size, { color });
}

/* ----------------------------- 组件 ----------------------------- */

function panel(x, y, w, h, opts) {
  const o = opts || {};
  const radius = o.radius == null ? rpx(34) : o.radius;
  const shadow = o.shadow === undefined ? 'soft' : o.shadow;
  if (shadow) {
    const off = o.shadowOffset == null ? rpx(8) : o.shadowOffset;
    const color = shadow === 'hard'
      ? (o.shadowColor || alpha(COLORS.ink, 0.9))
      : (o.shadowColor || alpha(COLORS.ink, 0.10));
    fillRound(x, y + off, w, h, radius, color);
  }
  fillRound(x, y, w, h, radius, o.fill || COLORS.card);
  if (o.outline !== false) {
    strokeRound(x, y, w, h, radius, o.stroke || o.outlineColor || COLORS.ink, o.lineWidth == null ? rpx(4) : o.lineWidth);
  }
  return { x, y, w, h, radius };
}

function card(x, y, w, h, opts) {
  return panel(x, y, w, h, opts || {});
}

function hit(app, id, x, y, w, h, payload) {
  app.hits.push({ id, x, y, w, h, payload: payload == null ? null : payload });
}

function pressedNow(app, id) {
  return !!(app && app.pressed && app.pressed.id === id && now() - app.pressed.at < 260);
}

function badge(label, x, y, opts) {
  const o = opts || {};
  const size = o.size || 22;
  const padX = o.padX == null ? rpx(16) : o.padX;
  const h = o.height || rpx(40);
  const tw = measure(label, size, o.weight || '700');
  const w = tw + padX * 2;
  const radius = o.radius == null ? h / 2 : o.radius;
  ctx.save();
  if (o.rotate) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((o.rotate * Math.PI) / 180);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }
  if (o.shadow) fillRound(x, y + rpx(3), w, h, radius, alpha(COLORS.ink, 0.18));
  fillRound(x, y, w, h, radius, o.fill || COLORS.orangeSoft);
  if (o.outline !== false) strokeRound(x, y, w, h, radius, o.stroke || INK, o.lineWidth == null ? rpx(3) : o.lineWidth);
  text(label, x + w / 2, y + h / 2, {
    size,
    weight: o.weight || '700',
    color: o.color || INK,
    align: 'center',
    baseline: 'middle',
  });
  ctx.restore();
  return w;
}

function chip(label, x, y, opts) {
  const o = opts || {};
  const size = o.size || 22;
  const padX = o.padX == null ? rpx(18) : o.padX;
  const h = o.height || rpx(44);
  const tw = measure(label, size, '600');
  const w = tw + padX * 2;
  fillRound(x, y, w, h, h / 2, o.fill || COLORS.card);
  strokeRound(x, y, w, h, h / 2, o.stroke || alpha(COLORS.ink, 0.16), rpx(2));
  text(label, x + padX, y + h / 2, {
    size,
    weight: '600',
    color: o.color || COLORS.ink2,
    baseline: 'middle',
  });
  return w;
}

function ribbon(label, x, y, opts) {
  const o = opts || {};
  const size = o.size || 24;
  const h = o.height || rpx(52);
  const tw = measure(label, size, '800');
  const w = tw + rpx(36);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w - rpx(13), y + h / 2);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fillStyle = o.fill || COLORS.orange;
  ctx.fill();
  ctx.strokeStyle = o.stroke || INK;
  ctx.lineWidth = o.lineWidth == null ? rpx(3) : o.lineWidth;
  ctx.stroke();
  text(label, x + rpx(18), y + h / 2, {
    size,
    weight: '800',
    color: o.color || INK,
    baseline: 'middle',
  });
  ctx.restore();
  return w;
}

function avatar(value, x, y, size, opts) {
  const o = opts || {};
  const cx = x + size / 2;
  const cy = y + size / 2;
  if (o.ring) {
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2 + rpx(6), 0, Math.PI * 2);
    ctx.strokeStyle = o.ringColor || COLORS.orange;
    ctx.lineWidth = rpx(6);
    ctx.stroke();
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fillStyle = o.bg || avatarBg(value);
  ctx.fill();
  ctx.strokeStyle = o.stroke || INK;
  ctx.lineWidth = rpx(o.lineWidth == null ? 3 : o.lineWidth);
  ctx.stroke();
  ctx.restore();
  text(avatarText(value), cx, cy + rpx(2), {
    size: (size / rpx(96)) * 50,
    align: 'center',
    baseline: 'middle',
  });
}

/* 果果吉祥物：纯 Canvas 画的橙子小人 */
function mascot(cx, cy, size, opts) {
  const o = opts || {};
  const R = size / 2;
  const mood = o.mood || 'happy';
  const bob = o.still ? 0 : Math.sin(now() / 420) * size * 0.02;
  cy += bob;
  ctx.save();
  ctx.beginPath();
  if (ctx.ellipse) ctx.ellipse(cx, cy + R * 1.06, R * 0.6, R * 0.13, 0, 0, Math.PI * 2);
  else ctx.arc(cx, cy + R * 1.06, R * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = alpha(COLORS.ink, 0.12);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = o.color || COLORS.orange;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, size * 0.045);
  ctx.stroke();
  ctx.save();
  ctx.translate(cx + R * 0.1, cy - R * 0.94);
  ctx.rotate(-0.35);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(R * 0.16, -R * 0.34, R * 0.52, -R * 0.22);
  ctx.quadraticCurveTo(R * 0.3, R * 0.06, 0, 0);
  ctx.fillStyle = COLORS.lime;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, size * 0.03);
  ctx.stroke();
  ctx.restore();
  const eyeY = cy - R * 0.1;
  const eyeX = R * 0.33;
  const eyeR = R * 0.085;
  ctx.fillStyle = INK;
  if (mood === 'wow') {
    ctx.beginPath(); ctx.arc(cx - eyeX, eyeY, eyeR * 1.35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + eyeX, eyeY, eyeR * 1.35, 0, Math.PI * 2); ctx.fill();
  } else if (mood === 'cool') {
    ctx.fillRect(cx - eyeX - eyeR, eyeY - eyeR * 0.5, eyeR * 2.2, eyeR * 0.9);
    ctx.fillRect(cx + eyeX - eyeR, eyeY - eyeR * 0.5, eyeR * 2.2, eyeR * 0.9);
  } else {
    ctx.beginPath(); ctx.arc(cx - eyeX, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + eyeX, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = alpha(COLORS.berry, 0.26);
  ctx.beginPath(); ctx.arc(cx - R * 0.56, cy + R * 0.2, R * 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + R * 0.56, cy + R * 0.2, R * 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.6, size * 0.035);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'wow') {
    ctx.arc(cx, cy + R * 0.3, R * 0.12, 0, Math.PI * 2);
  } else if (mood === 'cool') {
    ctx.moveTo(cx - R * 0.15, cy + R * 0.33);
    ctx.lineTo(cx + R * 0.18, cy + R * 0.27);
  } else {
    ctx.arc(cx, cy + R * 0.16, R * 0.2, Math.PI * 0.16, Math.PI * 0.84);
  }
  ctx.stroke();
  ctx.restore();
}

/* ----------------------------- 按钮 ----------------------------- */

const BUTTON_STYLES = {
  primary: { fill: COLORS.orange, text: INK, lip: alpha(COLORS.ink, 0.92) },
  lime: { fill: COLORS.lime, text: INK, lip: alpha(COLORS.ink, 0.92) },
  secondary: { fill: COLORS.card, text: INK, lip: alpha(COLORS.ink, 0.92) },
  ghost: { fill: COLORS.cream, text: INK, lip: alpha(COLORS.ink, 0.22) },
  berry: { fill: COLORS.berry, text: INK, lip: alpha(COLORS.ink, 0.92) },
  grape: { fill: COLORS.grape, text: INK, lip: alpha(COLORS.ink, 0.92) },
};

function button(app, id, label, x, y, w, h, opts) {
  const o = opts || {};
  const variant = o.variant || 'primary';
  const disabled = !!o.disabled;
  const radius = o.radius == null ? Math.min(h / 2, rpx(34)) : o.radius;
  const style = BUTTON_STYLES[variant] || BUTTON_STYLES.primary;
  const pressed = !disabled && pressedNow(app, id);
  const lift = pressed ? rpx(6) : 0;
  const shadowOff = pressed ? rpx(3) : rpx(10);

  if (variant === 'text' || variant === 'danger') {
    const color = disabled ? COLORS.disabledInk : (o.color || (variant === 'danger' ? COLORS.dangerInk : COLORS.ink));
    text(label, x + w / 2, y + h / 2, {
      size: o.size || 26,
      weight: '700',
      color,
      align: 'center',
      baseline: 'middle',
    });
    if (!disabled && id) hit(app, id, x, y, w, h, o.payload);
    return { x, y, w, h };
  }

  fillRound(x, y + shadowOff, w, h, radius, disabled ? alpha(COLORS.ink, 0.12) : style.lip);
  fillRound(x, y + lift, w, h, radius, disabled ? COLORS.disabled : style.fill);

  if (!disabled) {
    ctx.save();
    roundRect(x, y + lift, w, h, radius);
    ctx.clip();
    ctx.fillStyle = alpha('#FFFFFF', variant === 'secondary' ? 0.7 : 0.26);
    ctx.fillRect(x + rpx(6), y + lift + rpx(5), w - rpx(12), h * 0.38);
    ctx.restore();
  }

  if (!disabled) strokeRound(x, y + lift, w, h, radius, INK, o.lineWidth == null ? rpx(4) : o.lineWidth);
  else strokeRound(x, y + lift, w, h, radius, alpha(COLORS.ink, 0.18), rpx(3));

  const size = o.size || 30;
  const iconSize = o.iconSize || rpx(38);
  const color = disabled ? COLORS.disabledInk : (o.color || style.text);
  ctx.save();
  ctx.translate(0, lift);
  if (o.icon) {
    const tw = measure(label, size, '800');
    const total = iconSize + rpx(14) + tw;
    const startX = x + (w - total) / 2;
    icon(o.icon, startX + iconSize / 2, y + h / 2, iconSize, { color });
    text(label, startX + iconSize + rpx(14), y + h / 2, {
      size,
      weight: o.weight || '800',
      color,
      baseline: 'middle',
    });
  } else {
    text(label, x + w / 2, y + h / 2, {
      size,
      weight: o.weight || '800',
      color,
      align: 'center',
      baseline: 'middle',
    });
  }
  ctx.restore();

  if (!disabled && id) hit(app, id, x, y, w, h, o.payload);
  return { x, y, w, h };
}

function iconButton(app, id, kind, x, y, size, opts) {
  const o = opts || {};
  const pressed = pressedNow(app, id);
  const lift = pressed ? rpx(4) : 0;
  const radius = o.radius == null ? rpx(26) : o.radius;
  if (o.shadow !== false) fillRound(x, y + (pressed ? rpx(2) : rpx(6)), size, size, radius, alpha(COLORS.ink, 0.16));
  fillRound(x, y + lift, size, size, radius, o.fill || COLORS.card);
  strokeRound(x, y + lift, size, size, radius, alpha(COLORS.ink, 0.85), rpx(3));
  icon(kind, x + size / 2, y + size / 2 + lift, o.iconSize || size * 0.52, { color: o.color || INK });
  if (id) hit(app, id, x, y, size, size, o.payload);
  return { x, y, size };
}

function back(app, id) {
  const size = rpx(88);
  const x = rpx(32);
  const y = SAFE_TOP + rpx(4);
  iconButton(app, id, 'arrow-left', x, y, size, { iconSize: rpx(42) });
  return y + size;
}

/* ----------------------------- 进度 ----------------------------- */

function progress(x, y, w, h, value, fill) {
  fillRound(x, y, w, h, h / 2, alpha(COLORS.ink, 0.10));
  const v = clamp(value || 0, 0, 1);
  if (v > 0) fillRound(x, y, Math.max(h, w * v), h, h / 2, fill || COLORS.orange);
}

/* 分段计时条：比细进度条更有街机味 */
function timerBar(x, y, w, h, value, opts) {
  const o = opts || {};
  const segments = o.segments || 10;
  const v = clamp(value || 0, 0, 1);
  const color = o.color || COLORS.orange;
  fillRound(x, y, w, h, h / 2, o.track || alpha(COLORS.ink, 0.12));
  ctx.save();
  roundRect(x, y, w, h, h / 2);
  ctx.clip();
  if (v > 0) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * v, h);
    ctx.fillStyle = alpha('#FFFFFF', 0.32);
    ctx.fillRect(x, y, w * v, h * 0.38);
  }
  ctx.strokeStyle = alpha(COLORS.paper, 0.85);
  ctx.lineWidth = Math.max(1.5, h * 0.16);
  for (let i = 1; i < segments; i++) {
    ctx.beginPath();
    ctx.moveTo(x + (w / segments) * i, y);
    ctx.lineTo(x + (w / segments) * i, y + h);
    ctx.stroke();
  }
  ctx.restore();
  strokeRound(x, y, w, h, h / 2, alpha(COLORS.ink, 0.22), rpx(2));
}

function ring(cx, cy, radius, value, label, opts) {
  const o = opts || {};
  const v = clamp(value || 0, 0, 1);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = alpha(COLORS.ink, 0.12);
  ctx.lineWidth = rpx(10);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v);
  ctx.strokeStyle = o.color || COLORS.orange;
  ctx.lineWidth = rpx(10);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
  text(label, cx, cy - rpx(22), { size: o.size || 32, weight: '800', align: 'center', color: o.textColor || COLORS.text });
}

/* ----------------------------- 页面骨架 ----------------------------- */

function header(title, subtitle) {
  const x = rpx(40);
  let y = SAFE_TOP + rpx(26);
  display(title, x, y, { size: 56, color: COLORS.card, outlineWidth: rpx(9) });
  y += rpx(76);
  if (subtitle) {
    text(subtitle, x, y, { size: 26, color: COLORS.ink2, weight: '500' });
    y += rpx(40);
  }
  return y;
}

function footer(app, active) {
  const barX = rpx(28);
  const barW = W - rpx(56);
  const barH = rpx(112);
  const barY = H - SAFE_BOTTOM - barH - rpx(20);

  fillRound(barX, barY + rpx(9), barW, barH, rpx(56), alpha(COLORS.ink, 0.16));
  fillRound(barX, barY, barW, barH, rpx(56), COLORS.card);
  strokeRound(barX, barY, barW, barH, rpx(56), INK, rpx(4));

  const items = [
    { id: 'nav.home', label: '首页', icon: 'home' },
    { id: 'nav.rank', label: '榜单', icon: 'trophy' },
    { id: 'nav.profile', label: '我的', icon: 'user' },
  ];
  const pad = rpx(12);
  const itemW = (barW - pad * 2) / 3;
  items.forEach((item, i) => {
    const isActive = item.id === active;
    const x = barX + pad + itemW * i;
    const y = barY + rpx(18);
    const h = barH - rpx(36);
    if (isActive) {
      fillRound(x + rpx(4), y, itemW - rpx(8), h, h / 2, COLORS.orange);
      strokeRound(x + rpx(4), y, itemW - rpx(8), h, h / 2, INK, rpx(3));
    }
    const color = isActive ? INK : COLORS.ink3;
    const iconSize = rpx(40);
    const tw = measure(item.label, 24, '800');
    const total = iconSize + rpx(10) + tw;
    const startX = x + (itemW - total) / 2;
    icon(item.icon, startX + iconSize / 2, y + h / 2, iconSize, { color });
    text(item.label, startX + iconSize + rpx(10), y + h / 2, {
      size: 24,
      weight: '800',
      color,
      baseline: 'middle',
    });
    hit(app, item.id, x, barY, itemW, barH);
  });
  return barY;
}

/* 手账胶带：贴在卡片边上，增加手工感 */
function tape(cx, cy, w, h, angle, opts) {
  const o = opts || {};
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(((angle || 0) * Math.PI) / 180);
  ctx.fillStyle = o.fill || 'rgba(255,255,255,0.62)';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = o.stroke || 'rgba(46,27,16,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2 + 2);
  ctx.lineTo(w / 2, -h / 2 + 2);
  ctx.moveTo(-w / 2, h / 2 - 2);
  ctx.lineTo(w / 2, h / 2 - 2);
  ctx.stroke();
  ctx.restore();
}

function ticket(x, y, w, h, opts) {
  const o = opts || {};
  const radius = o.radius == null ? rpx(30) : o.radius;
  panel(x, y, w, h, Object.assign({}, o, { radius }));
  const notchR = rpx(16);
  const cy = y + h / 2;
  [x, x + w].forEach((edge) => {
    ctx.beginPath();
    ctx.arc(edge, cy, notchR, 0, Math.PI * 2);
    ctx.fillStyle = o.notchFill || COLORS.paper;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = rpx(3);
    ctx.stroke();
  });
}

module.exports = {
  init,
  rpx,
  width,
  height,
  safeTop,
  safeBottom,
  context,
  now,
  alpha,
  clamp,
  easeOutBack,
  easeOutCubic,
  appear,
  begin,
  text,
  display,
  measure,
  wrap,
  paragraph,
  roundRect,
  fillRound,
  strokeRound,
  dashedLine,
  sparkle,
  rays,
  confetti,
  icon,
  lineIcon,
  panel,
  card,
  hit,
  pressedNow,
  badge,
  chip,
  ribbon,
  avatar,
  mascot,
  button,
  iconButton,
  back,
  progress,
  timerBar,
  ring,
  header,
  footer,
  ticket,
  tape,
  decorations,
  COLORS,
  OPTION_STYLES,
};
