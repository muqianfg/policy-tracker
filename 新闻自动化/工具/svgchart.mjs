/**
 * 纯 SVG 图表库（2026-10-27）—— 零依赖
 *
 * 为什么要自己写：项目里没有 node_modules，也不想联网加载 CDN。
 * SVG 服务端直接生成字符串，塞进 HTML 就行，深色模式靠 CSS 变量。
 */

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function niceTicks(min, max, count = 5) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.001; v += step) ticks.push(+v.toFixed(10));
  return ticks;
}

const fmtNum = (v, dec) => {
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(1) + "万";
  return v.toFixed(dec ?? (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2));
};

/**
 * 折线图
 * opts: { width, height, series:[{name,color,points:[{x:DateStr,y:num}], dash, fill}],
 *         xLabels:[str], yLabel, valueFormat, markers:[{x, y, label, color}], zeroLine }
 */
export function lineChart(opts) {
  const W = opts.width ?? 900, H = opts.height ?? 340;
  const pad = { l: 58, r: 18, t: opts.title ? 44 : 20, b: 46 };
  const innerW = W - pad.l - pad.r, innerH = H - pad.t - pad.b;
  const series = (opts.series ?? []).filter((s) => s.points && s.points.length);
  if (!series.length) return '<div class="chart-empty">暂无数据</div>';

  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort();
  const xIndex = Object.fromEntries(xs.map((x, i) => [x, i]));
  const allY = series.flatMap((s) => s.points.map((p) => p.y)).filter((v) => Number.isFinite(v));
  if (opts.zeroLine) { allY.push(0); }
  let yMin = Math.min(...allY), yMax = Math.max(...allY);
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const padY = (yMax - yMin) * 0.08;
  yMin -= padY; yMax += padY;

  const sx = (x) => pad.l + (xs.length === 1 ? innerW / 2 : (xIndex[x] / (xs.length - 1)) * innerW);
  const sy = (y) => pad.t + innerH - ((y - yMin) / (yMax - yMin)) * innerH;

  const yTicks = niceTicks(yMin, yMax, 5);
  const fmt = opts.valueFormat ?? ((v) => fmtNum(v));

  let g = "";
  // 网格与 y 轴
  for (const t of yTicks) {
    const y = sy(t);
    g += '<line class="c-grid" x1="' + pad.l + '" y1="' + y.toFixed(1) + '" x2="' + (W - pad.r) + '" y2="' + y.toFixed(1) + '"/>';
    g += '<text class="c-ytick" x="' + (pad.l - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + esc(fmt(t)) + "</text>";
  }
  // x 轴标签（最多 7 个）
  const stepX = Math.max(1, Math.ceil(xs.length / 7));
  for (let i = 0; i < xs.length; i += stepX) {
    g += '<text class="c-xtick" x="' + sx(xs[i]).toFixed(1) + '" y="' + (H - pad.b + 20) + '" text-anchor="middle">' + esc(xs[i].slice(5)) + "</text>";
  }
  g += '<line class="c-axis" x1="' + pad.l + '" y1="' + (H - pad.b) + '" x2="' + (W - pad.r) + '" y2="' + (H - pad.b) + '"/>';
  // 零线
  if (opts.zeroLine) {
    g += '<line class="c-zero" x1="' + pad.l + '" y1="' + sy(0).toFixed(1) + '" x2="' + (W - pad.r) + '" y2="' + sy(0).toFixed(1) + '"/>';
  }

  // 数据线
  series.forEach((s) => {
    const pts = s.points.filter((p) => Number.isFinite(p.y));
    const d = pts.map((p, i) => (i ? "L" : "M") + sx(p.x).toFixed(1) + " " + sy(p.y).toFixed(1)).join(" ");
    if (s.fill) {
      const first = pts[0], last = pts[pts.length - 1];
      const area = d + " L" + sx(last.x).toFixed(1) + " " + sy(yMin).toFixed(1) + " L" + sx(first.x).toFixed(1) + " " + sy(yMin).toFixed(1) + " Z";
      g += '<path d="' + area + '" fill="' + s.color + '" opacity="0.10"/>';
    }
    g += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="' + (opts.thin ? 1.6 : 2.2) + '" stroke-linejoin="round" stroke-linecap="round"' + (s.dash ? ' stroke-dasharray="5 4"' : "") + "/>";
    // 末端点 + 最新值
    if (!opts.thin) {
      const lp = pts[pts.length - 1];
      g += '<circle cx="' + sx(lp.x).toFixed(1) + '" cy="' + sy(lp.y).toFixed(1) + '" r="3.5" fill="' + s.color + '" stroke="#fff" stroke-width="1.5"/>';
      if (opts.endLabel) {
        g += '<text class="c-endlabel" x="' + (sx(lp.x) - 6).toFixed(1) + '" y="' + (sy(lp.y) - 9).toFixed(1) + '" text-anchor="end" fill="' + s.color + '">' + esc(fmt(lp.y)) + "</text>";
      }
    }
    // 悬停提示
    if (opts.tooltip !== false) {
      for (const p of pts) {
        g += '<circle cx="' + sx(p.x).toFixed(1) + '" cy="' + sy(p.y).toFixed(1) + '" r="7" fill="transparent"><title>' + esc(s.name + " · " + p.x + " · " + fmt(p.y)) + "</title></circle>";
      }
    }
  });

  // 标记点（如开仓日）
  for (const mk of opts.markers ?? []) {
    if (!xs.includes(mk.x)) continue;
    const x = sx(mk.x), y = sy(mk.y);
    g += '<g><line class="c-mark" x1="' + x.toFixed(1) + '" y1="' + pad.t + '" x2="' + x.toFixed(1) + '" y2="' + (H - pad.b) + '"/>';
    g += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5.5" fill="' + (mk.color || "#8c2f39") + '" stroke="#fff" stroke-width="2"/>';
    if (mk.label) g += '<text class="c-marklabel" x="' + (x + 9).toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" fill="' + (mk.color || "#8c2f39") + '">' + esc(mk.label) + "</text>";
    g += "</g>";
  }

  // 图例
  let legend = "";
  if (series.length > 1) {
    legend = '<div class="chart-legend">' + series.map((s) => '<span><i style="background:' + s.color + '"></i>' + esc(s.name) + "</span>").join("") + "</div>";
  }
  const titleHtml = opts.title ? '<div class="chart-title">' + esc(opts.title) + (opts.subtitle ? '<span>' + esc(opts.subtitle) + "</span>" : "") + "</div>" : "";
  return '<figure class="chart">' + titleHtml + '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet" role="img">' + g + "</svg>" + legend + "</figure>";
}

/** 柱状图（可正负） */
export function barChart(opts) {
  const W = opts.width ?? 900, H = opts.height ?? 280;
  const pad = { l: 58, r: 18, t: opts.title ? 44 : 20, b: 52 };
  const innerW = W - pad.l - pad.r, innerH = H - pad.t - pad.b;
  const data = (opts.data ?? []).filter((d) => Number.isFinite(d.y));
  if (!data.length) return '<div class="chart-empty">暂无数据</div>';
  let yMin = Math.min(0, ...data.map((d) => d.y)), yMax = Math.max(0, ...data.map((d) => d.y));
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const p2 = (yMax - yMin) * 0.12; yMin -= p2; yMax += p2;
  const sy = (y) => pad.t + innerH - ((y - yMin) / (yMax - yMin)) * innerH;
  const bw = innerW / data.length;
  const barW = Math.min(56, bw * 0.58);
  const yTicks = niceTicks(yMin, yMax, 4);
  const fmt = opts.valueFormat ?? ((v) => fmtNum(v));
  let g = "";
  for (const t of yTicks) {
    const y = sy(t);
    g += '<line class="c-grid" x1="' + pad.l + '" y1="' + y.toFixed(1) + '" x2="' + (W - pad.r) + '" y2="' + y.toFixed(1) + '"/>';
    g += '<text class="c-ytick" x="' + (pad.l - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + esc(fmt(t)) + "</text>";
  }
  data.forEach((d, i) => {
    const cx = pad.l + bw * (i + 0.5);
    const y0 = sy(0), y1 = sy(d.y);
    const y = Math.min(y0, y1), h = Math.max(1.5, Math.abs(y1 - y0));
    const color = d.color ?? (d.y >= 0 ? "#b5493f" : "#3c7a8c");
    g += '<rect x="' + (cx - barW / 2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3" fill="' + color + '" opacity="0.88"><title>' + esc(d.label + "：" + fmt(d.y)) + "</title></rect>";
    const vy = d.y >= 0 ? y - 7 : y + h + 15;
    g += '<text class="c-barlabel" x="' + cx.toFixed(1) + '" y="' + vy.toFixed(1) + '" text-anchor="middle" fill="' + color + '">' + esc(fmt(d.y)) + "</text>";
    g += '<text class="c-xtick" x="' + cx.toFixed(1) + '" y="' + (H - pad.b + 22) + '" text-anchor="middle">' + esc(d.label) + "</text>";
  });
  g += '<line class="c-axis" x1="' + pad.l + '" y1="' + sy(0).toFixed(1) + '" x2="' + (W - pad.r) + '" y2="' + sy(0).toFixed(1) + '"/>';
  const titleHtml = opts.title ? '<div class="chart-title">' + esc(opts.title) + (opts.subtitle ? '<span>' + esc(opts.subtitle) + "</span>" : "") + "</div>" : "";
  return '<figure class="chart">' + titleHtml + '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet" role="img">' + g + "</svg></figure>";
}

/** 横向条形图（分位、排名） */
export function hBarChart(opts) {
  const rows = opts.data ?? [];
  if (!rows.length) return '<div class="chart-empty">暂无数据</div>';
  const rowH = 30, W = opts.width ?? 900, padT = opts.title ? 40 : 10;
  const H = padT + rows.length * rowH + 26;
  const labelW = opts.labelWidth ?? 110, valW = 90;
  const barMax = W - labelW - valW - 24;
  const max = Math.max(...rows.map((r) => Math.abs(r.y)), 0.0001);
  let g = "";
  rows.forEach((r, i) => {
    const y = padT + i * rowH;
    const w = Math.max(2, (Math.abs(r.y) / max) * barMax);
    const color = r.color ?? (r.y >= 60 ? "#b5493f" : r.y <= 35 ? "#3c7a8c" : "#8a8578");
    g += '<text class="c-rowlabel" x="' + (labelW - 10) + '" y="' + (y + rowH / 2 + 5) + '" text-anchor="end">' + esc(r.label) + "</text>";
    g += '<rect x="' + labelW + '" y="' + (y + 7) + '" width="' + w.toFixed(1) + '" height="' + (rowH - 14) + '" rx="3" fill="' + color + '" opacity="0.85"><title>' + esc(r.label + "：" + (opts.valueFormat ? opts.valueFormat(r.y) : r.y)) + "</title></rect>";
    g += '<text class="c-rowval" x="' + (labelW + w + 8).toFixed(1) + '" y="' + (y + rowH / 2 + 5) + '" fill="' + color + '">' + esc(opts.valueFormat ? opts.valueFormat(r.y) : r.y) + "</text>";
  });
  const titleHtml = opts.title ? '<div class="chart-title">' + esc(opts.title) + (opts.subtitle ? '<span>' + esc(opts.subtitle) + "</span>" : "") + "</div>" : "";
  return '<figure class="chart">' + titleHtml + '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid meet" role="img">' + g + "</svg></figure>";
}

export const COLORS = ["#8c2f39", "#3c7a8c", "#b5852f", "#4a7c59", "#7b5ea7", "#a05a3c", "#5c6b8a", "#96742f"];
