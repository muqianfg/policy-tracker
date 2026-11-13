import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const BG = "#FAF6EE", INK = "#231F1A", ACC = "#A3323D", MUT = "#9A8C77", LINE = "rgba(35,31,26,0.14)";
const FONT_CSS = "@font-face{font-family:'NotoSerifSC';src:url('/noto-serif-700.woff2') format('woff2');font-weight:700}";
const SERIF = "'NotoSerifSC','Microsoft YaHei',serif";
const SANS = "'Microsoft YaHei',sans-serif";
const FPS = 30;
const fr = (sec: number) => Math.round(sec * FPS);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const pop = (frame: number, fps: number, delay: number) => {
  const s = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.6, stiffness: 120 } });
  return { opacity: interpolate(s, [0, 1], [0, 1]), transform: "translateY(" + interpolate(s, [0, 1], [26, 0]).toFixed(1) + "px) scale(" + interpolate(s, [0, 1], [0.94, 1]).toFixed(3) + ")" } as React.CSSProperties;
};
const fadeAt = (frame: number, start: number, dur: number) => interpolate(frame, [start, start + dur], [1, 0], clamp);
const fadeIn = (frame: number, start: number, dur: number) => interpolate(frame, [start, start + dur], [0, 1], clamp);
const count = (frame: number, start: number, dur: number, target: number) => target * interpolate(frame, [start, start + dur], [0, 1], clamp);

const Header: React.FC = () => (
  <>
    <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(35,31,26,0.10) 2.2px, transparent 2.2px)", backgroundSize: "30px 30px" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 92, borderBottom: "1.5px solid " + LINE, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 64px", fontFamily: SANS }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, letterSpacing: 3, color: ACC }}><span style={{ width: 12, height: 12, borderRadius: 6, background: ACC, display: "block" }} />11.12 联播解读</div>
      <div style={{ fontSize: 24, color: MUT, letterSpacing: 3 }}>2026.11.12</div>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 70, borderTop: "1.5px solid rgba(35,31,26,0.10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: MUT, letterSpacing: 1.5, fontFamily: SANS }}>数据来源：新闻联播 · 国家发改委 · 人社部 · 生态环境部</div>
  </>
);

const Title: React.FC<{ head?: string; text: React.ReactNode; sub?: string; style?: React.CSSProperties }> = ({ head, text, sub, style }) => (
  <div style={{ position: "absolute", left: 0, right: 0, textAlign: "center", ...style }}>
    {head ? <div style={{ display: "inline-block", border: "2px solid " + ACC, borderRadius: 999, padding: "8px 26px", color: ACC, fontFamily: SANS, fontSize: 28, letterSpacing: 4 }}>{head}</div> : null}
    <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 76, color: INK, letterSpacing: 2, marginTop: head ? 24 : 0 }}>{text}</div>
    {sub ? <div style={{ fontFamily: SANS, fontSize: 30, color: MUT, marginTop: 18, letterSpacing: 1.5 }}>{sub}</div> : null}
  </div>
);

const Icon: React.FC<{ kind: string; size?: number; color?: string }> = ({ kind, size = 64, color = INK }) => {
  const s = { width: size, height: size, display: "block" } as React.CSSProperties;
  const stroke = { fill: "none", stroke: color, strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (kind === "water") return (<svg viewBox="0 0 64 64" style={s}><path d="M32 8 C32 8 14 30 14 42 a18 18 0 0 0 36 0 C50 30 32 8 32 8Z" {...stroke} /></svg>);
  if (kind === "power") return (<svg viewBox="0 0 64 64" style={s}><path d="M36 6 L18 36 h12 l-4 22 L46 26 H33 Z" {...stroke} /></svg>);
  if (kind === "compute") return (<svg viewBox="0 0 64 64" style={s}><rect x="16" y="16" width="32" height="32" rx="6" {...stroke} /><rect x="26" y="26" width="12" height="12" rx="2" {...stroke} /><path d="M16 24 H8 M16 32 H8 M16 40 H8 M48 24 H56 M48 32 H56 M48 40 H56 M24 16 V8 M32 16 V8 M40 16 V8 M24 48 V56 M32 48 V56 M40 48 V56" {...stroke} /></svg>);
  if (kind === "comm") return (<svg viewBox="0 0 64 64" style={s}><path d="M32 54 V30" {...stroke} /><circle cx="32" cy="24" r="6" {...stroke} /><path d="M18 16 a20 20 0 0 1 28 0" {...stroke} /><path d="M10 8 a32 32 0 0 1 44 0" {...stroke} /></svg>);
  if (kind === "pipe") return (<svg viewBox="0 0 64 64" style={s}><circle cx="32" cy="32" r="22" {...stroke} /><circle cx="32" cy="32" r="10" {...stroke} /><path d="M32 10 V22 M32 42 V54" {...stroke} /></svg>);
  if (kind === "truck") return (<svg viewBox="0 0 64 64" style={s}><rect x="6" y="22" width="30" height="20" rx="3" {...stroke} /><path d="M36 30 h10 l10 8 v6 H36 Z" {...stroke} /><circle cx="18" cy="48" r="5" {...stroke} /><circle cx="46" cy="48" r="5" {...stroke} /></svg>);
  if (kind === "money") return (<svg viewBox="0 0 64 64" style={s}><circle cx="32" cy="32" r="22" {...stroke} /><path d="M32 18 V46 M24 26 h12 a6 6 0 0 1 0 12 h-12" {...stroke} /></svg>);
  if (kind === "people") return (<svg viewBox="0 0 64 64" style={s}><circle cx="22" cy="22" r="8" {...stroke} /><circle cx="44" cy="24" r="6" {...stroke} /><path d="M8 52 c0-10 6-16 14-16 s14 6 14 16" {...stroke} /><path d="M36 52 c0-8 4-12 10-12 s10 4 10 12" {...stroke} /></svg>);
  if (kind === "leaf") return (<svg viewBox="0 0 64 64" style={s}><path d="M52 10 C28 14 14 26 14 44 c0 4 2 6 6 6 18 0 30-14 32-40Z" {...stroke} /><path d="M16 52 C26 40 34 32 46 22" {...stroke} /></svg>);
  if (kind === "warn") return (<svg viewBox="0 0 64 64" style={s}><path d="M32 10 L58 54 H6 Z" {...stroke} /><path d="M32 26 V40" {...stroke} /><circle cx="32" cy="47" r="2.5" fill={color} /></svg>);
  return (<svg viewBox="0 0 64 64" style={s}><circle cx="32" cy="32" r="22" {...stroke} /></svg>);
};

const Chip: React.FC<{ x: number; y: number; w?: number; h?: number; label: string; icon?: string; frame: number; fps: number; delay: number; accent?: boolean; sub?: string }> = ({ x, y, w = 200, h = 132, label, icon, frame, fps, delay, accent, sub }) => {
  const a = pop(frame, fps, delay);
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: 22, background: "rgba(255,255,255,0.6)", border: "1.5px solid " + (accent ? ACC : LINE), boxShadow: "0 10px 26px rgba(60,40,10,0.08)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, ...a }}>
      {icon ? <Icon kind={icon} size={46} /> : null}
      <div style={{ fontFamily: SANS, fontSize: 26, color: INK, letterSpacing: 2, textAlign: "center", lineHeight: 1.2 }}>{label}</div>
      {sub ? <div style={{ fontFamily: SANS, fontSize: 18, color: MUT }}>{sub}</div> : null}
    </div>
  );
};

/* ---------- Scene 1: 开场 ---------- */
const S1: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 250, textAlign: "center", ...pop(f, fps, 6) }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 120, color: INK, letterSpacing: 4 }}>新闻联播<span style={{ color: ACC }}>解读</span></div>
        <div style={{ fontFamily: SANS, fontSize: 34, color: MUT, marginTop: 20, letterSpacing: 3 }}>2026 年 11 月 12 日 · 主条目 <span style={{ color: ACC, fontWeight: 700 }}>{Math.round(count(f, fr(2.6), fr(1.2), 8))}</span> 条</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", ...pop(f, fps, fr(3.0)) }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 46, color: INK }}>这期看三件事</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 660, display: "flex", justifyContent: "center", gap: 28 }}>
        <div style={pop(f, fps, fr(5.24))}><div style={{ width: 300, borderRadius: 20, border: "1.5px solid " + ACC, background: "rgba(255,255,255,0.6)", padding: "22px 0", textAlign: "center", fontFamily: SANS, fontSize: 30, color: INK }}>基础设施蓝图</div></div>
        <div style={pop(f, fps, fr(6.64))}><div style={{ width: 300, borderRadius: 20, border: "1.5px solid " + ACC, background: "rgba(255,255,255,0.6)", padding: "22px 0", textAlign: "center", fontFamily: SANS, fontSize: 30, color: INK }}>社保改革清单</div></div>
        <div style={pop(f, fps, fr(7.9))}><div style={{ width: 300, borderRadius: 20, border: "1.5px solid " + ACC, background: "rgba(255,255,255,0.6)", padding: "22px 0", textAlign: "center", fontFamily: SANS, fontSize: 30, color: INK }}>气候大会</div></div>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Scene 2: 六张网 ---------- */
const S2: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const cx = 960, cy = 560, R = 340;
  const ringStart = fr(6.6);
  const four = [
    { label: "交通", icon: "comm", t: fr(14.48 - 10), dx: -330, dy: -50 },
    { label: "水利", icon: "water", t: fr(14.98 - 10), dx: -110, dy: -120 },
    { label: "能源", icon: "power", t: fr(15.38 - 10), dx: 110, dy: -120 },
    { label: "物流", icon: "truck", t: fr(15.8 - 10), dx: 330, dy: -50 },
  ];
  const six = [
    { label: "水网", sub: "调水", icon: "water" }, { label: "电网", sub: "输电", icon: "power" }, { label: "算力网", sub: "算力调度", icon: "compute" },
    { label: "通信网", sub: "连接", icon: "comm" }, { label: "地下管网", sub: "城市管线", icon: "pipe" }, { label: "物流网", sub: "货运", icon: "truck" },
  ];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 250, textAlign: "center", opacity: fadeAt(f, ringStart - 8, 10) }}>
        <Title head="第一件" text={<>交通 · 水利 · 能源 · 物流<span style={{ color: ACC }}>连成一张网</span></>} />
      </div>
      {four.map((c) => (
        <div key={c.label} style={{ opacity: fadeAt(f, ringStart - 8, 10) }}>
          <Chip x={cx + c.dx} y={cy + 160 + c.dy} label={c.label} icon={c.icon} frame={f} fps={fps} delay={c.t} w={180} h={120} />
        </div>
      ))}
      {f > ringStart - 6 && (
        <AbsoluteFill style={{ opacity: fadeIn(f, ringStart - 6, 8) }}>
          {six.map((n, i) => {
            const ang = (-90 + i * 60) * Math.PI / 180;
            const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
            const t = ringStart + i * 6;
            return (
              <React.Fragment key={n.label}>
                <svg style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080 }} viewBox="0 0 1920 1080"><line x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(163,50,61,0.30)" strokeWidth={3} strokeDasharray="8 10" style={{ opacity: fadeIn(f, t, 8) }} /></svg>
                <Chip x={x} y={y} label={n.label} sub={n.sub} icon={n.icon} frame={f} fps={fps} delay={t} accent w={210} h={140} />
              </React.Fragment>
            );
          })}
          <div style={{ position: "absolute", left: 0, right: 0, top: cy - 44, textAlign: "center" }}>
            <div style={{ display: "inline-block", fontFamily: SERIF, fontWeight: 700, fontSize: 62, color: INK, background: BG, padding: "0 24px", border: "2px solid " + ACC, borderRadius: 18 }}>六张网</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ---------- Scene 3: 数据 ---------- */
const S3: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const railStart = fr(21.52 - 19.28);
  const gaugeStart = fr(27.26 - 19.28);
  const corrStart = fr(28.82 - 19.28);
  const railW = interpolate(f, [railStart, railStart + fr(1.6)], [0, 1], clamp);
  const num15 = interpolate(f, [railStart, railStart + fr(1.4)], [0, 1.5], clamp);
  const showGauge = f >= gaugeStart;
  const gauge = interpolate(f, [gaugeStart, gaugeStart + fr(1.0)], [0, 0.95], clamp);
  const gaugeLen = 2 * Math.PI * 130 * 0.75;
  const showCorr = f >= corrStart;
  return (
    <AbsoluteFill>
      {f < gaugeStart && (
        <AbsoluteFill style={{ opacity: fadeAt(f, gaugeStart - 6, 6) }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 250, textAlign: "center", ...pop(f, fps, 4) }}>
            <Title head="十五五" text={<>新建约 <span style={{ color: ACC }}>{num15.toFixed(1)}</span> 万公里铁路</>} />
          </div>
          <svg style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080 }} viewBox="0 0 1920 1080">
            <line x1={240} y1={720} x2={1680} y2={720} stroke="rgba(35,31,26,0.18)" strokeWidth={10} strokeLinecap="round" />
            <line x1={240} y1={720} x2={240 + 1440 * railW} y2={720} stroke={ACC} strokeWidth={10} strokeLinecap="round" />
            {Array.from({ length: 13 }).map((_, i) => <line key={i} x1={240 + 120 * i} y1={710} x2={240 + 120 * i} y2={730} stroke="rgba(35,31,26,0.35)" strokeWidth={4} style={{ opacity: railW > i / 12 ? 1 : 0.15 }} />)}
            <circle cx={240 + 1440 * railW} cy={720} r={16} fill={ACC} />
          </svg>
        </AbsoluteFill>
      )}
      {showGauge && !showCorr && (
        <AbsoluteFill style={{ opacity: fadeIn(f, gaugeStart, 6) }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 230, textAlign: "center", ...pop(f, fps, gaugeStart) }}><Title head="2030 年" text="综合立体交通网主骨架" /></div>
          <svg style={{ position: "absolute", left: 960 - 180, top: 400, width: 360, height: 360 }} viewBox="0 0 360 360">
            <circle cx="180" cy="180" r="130" fill="none" stroke="rgba(35,31,26,0.12)" strokeWidth={24} strokeDasharray={gaugeLen + " 9999"} transform="rotate(135 180 180)" strokeLinecap="round" />
            <circle cx="180" cy="180" r="130" fill="none" stroke={ACC} strokeWidth={24} strokeDasharray={gaugeLen + " 9999"} strokeDashoffset={gaugeLen * (1 - gauge)} transform="rotate(135 180 180)" strokeLinecap="round" />
            <text x="180" y="208" textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize="94" fill={INK}>{Math.round(gauge * 100)}%</text>
          </svg>
          <div style={{ position: "absolute", left: 0, right: 0, top: 800, textAlign: "center", fontFamily: SANS, fontSize: 34, color: MUT }}>主骨架建成率 力争达到</div>
        </AbsoluteFill>
      )}
      {showCorr && (
        <AbsoluteFill style={{ opacity: fadeIn(f, corrStart, 8) }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", ...pop(f, fps, corrStart) }}><Title text={<>6 条国家级商品<span style={{ color: ACC }}>流通走廊</span></>} sub="粮食 · 能源 · 矿产 —— 从产地到消费地的专用通道" /></div>
          <svg style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080 }} viewBox="0 0 1920 1080">
            {["粮", "能", "矿", "粮", "能", "矿"].map((g, i) => {
              const y = 470 + i * 78;
              const w = interpolate(f, [corrStart + i * 4, corrStart + 30 + i * 4], [0, 1], clamp);
              const tt = interpolate(f, [corrStart + 10 + i * 4, corrStart + 55 + i * 4], [0, 1], clamp);
              return (
                <g key={i}>
                  <path d={"M420," + y + " C 700," + (y - 46) + " 1120," + (y - 46) + " 1500," + y} fill="none" stroke="rgba(35,31,26,0.14)" strokeWidth={3} strokeDasharray="5 9" />
                  <path d={"M420," + y + " C 700," + (y - 46) + " 1120," + (y - 46) + " 1500," + y} fill="none" stroke={ACC} strokeWidth={5} strokeLinecap="round" style={{ opacity: w }} />
                  <text x={396} y={y + 8} textAnchor="middle" fontFamily={SANS} fontSize="20" fill={ACC}>{g}</text>
                  <text x={1524} y={y + 8} textAnchor="middle" fontFamily={SANS} fontSize="20" fill={INK}>{g}</text>
                  {tt > 0 && tt < 1 ? <circle cx={420 + 1080 * tt} cy={y - 46 * Math.sin(Math.PI * tt)} r={12} fill={ACC} /> : null}
                </g>
              );
            })}
            <text x="300" y="440" textAnchor="middle" fontFamily={SANS} fontSize="26" fill={MUT}>产地</text>
            <text x="1620" y="440" textAnchor="middle" fontFamily={SANS} fontSize="26" fill={MUT}>消费地</text>
          </svg>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ---------- Scene 4: 水网 + 达峰 ---------- */
const S4: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const tWater = fr(33 - 31.83);
  const tPeak = fr(38.24 - 31.83);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 240, textAlign: "center", ...pop(f, fps, 4) }}><Title head="水利与能源" text={<>水网大动脉 · <span style={{ color: ACC }}>能源达峰</span></>} /></div>
      {f < tPeak && (
        <AbsoluteFill style={{ opacity: fadeAt(f, tPeak - 4, 6) }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center", ...pop(f, fps, tWater) }}>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 64, color: INK }}>南水北调 <span style={{ color: ACC }}>东线二期</span></div>
          </div>
          <svg style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080 }} viewBox="0 0 1920 1080">
            <path d="M300 760 C 600 640, 900 840, 1200 700 S 1600 640, 1660 700" fill="none" stroke="rgba(35,31,26,0.16)" strokeWidth={16} strokeLinecap="round" />
            <path d="M300 760 C 600 640, 900 840, 1200 700 S 1600 640, 1660 700" fill="none" stroke={ACC} strokeWidth={16} strokeLinecap="round" strokeDasharray="1600" strokeDashoffset={interpolate(f, [tWater, tWater + fr(1.6)], [1600, 0], clamp)} />
          </svg>
        </AbsoluteFill>
      )}
      {f >= tPeak - 6 && (
        <AbsoluteFill style={{ opacity: fadeIn(f, tPeak - 6, 8) }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 470, textAlign: "center", ...pop(f, fps, tPeak) }}>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 72, color: INK }}>碳排放与化石能源消费 <span style={{ color: ACC }}>总量达峰</span></div>
            <div style={{ fontFamily: SANS, fontSize: 32, color: MUT, marginTop: 18 }}>能源领域：先达峰、再下降</div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ---------- Generic flow scene (上下游) ---------- */
const Flow: React.FC<{ f: number; fps: number; start: number; stages: { label: string; items: string; icon: string }[]; title: React.ReactNode; trigs: number[] }> = ({ f, fps, start, stages, title, trigs }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 0, right: 0, top: 220, textAlign: "center", ...pop(f, fps, start) }}><Title text={title} /></div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 470, display: "flex", justifyContent: "center", alignItems: "center", gap: 26 }}>
      {stages.map((st, i) => (
        <React.Fragment key={st.label}>
          <div style={{ ...pop(f, fps, trigs[i]), width: 420, borderRadius: 24, border: "1.5px solid " + (i === 1 ? ACC : LINE), background: "rgba(255,255,255,0.62)", padding: "26px 28px", textAlign: "center" }}>
            <Icon kind={st.icon} size={58} color={i === 1 ? ACC : INK} />
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 40, color: i === 1 ? ACC : INK, marginTop: 10 }}>{st.label}</div>
            <div style={{ fontFamily: SANS, fontSize: 24, color: MUT, marginTop: 10, lineHeight: 1.5 }}>{st.items}</div>
          </div>
          {i < stages.length - 1 ? <div style={{ opacity: fadeIn(f, trigs[i + 1] - 10, 8), fontSize: 40, color: ACC }}>→</div> : null}
        </React.Fragment>
      ))}
    </div>
  </AbsoluteFill>
);

/* ---------- Checklist ---------- */
const Check: React.FC<{ f: number; fps: number; start: number; title: React.ReactNode; items: string[]; trigs: number[]; sub?: string }> = ({ f, fps, start, title, items, trigs, sub }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 0, right: 0, top: 230, textAlign: "center", ...pop(f, fps, start) }}><Title text={title} sub={sub} /></div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 480, display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
      {items.map((it, i) => (
        <div key={it} style={{ ...pop(f, fps, trigs[i]), display: "flex", alignItems: "center", gap: 18, width: 1080, borderRadius: 18, background: "rgba(255,255,255,0.6)", border: "1.5px solid " + LINE, padding: "20px 28px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 17, background: ACC, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontFamily: SANS }}>✓</div>
          <div style={{ fontFamily: SANS, fontSize: 30, color: INK, letterSpacing: 1 }}>{it}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

/* ---------- Chapter / Layers / Coverage / Chips / Climate / Final ---------- */
const Chapter: React.FC<{ f: number; fps: number; head: string; title: React.ReactNode; sub: string; icon: string }> = ({ f, fps, head, title, sub, icon }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center", ...pop(f, fps, 6) }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 12, border: "2px solid " + ACC, borderRadius: 999, padding: "8px 26px", color: ACC, fontFamily: SANS, fontSize: 28, letterSpacing: 3 }}>{head}</div>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 96, color: INK, marginTop: 26 }}>{title}</div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 30 }}><Icon kind={icon} size={90} color={ACC} /></div>
      <div style={{ fontFamily: SANS, fontSize: 32, color: MUT, marginTop: 18 }}>{sub}</div>
    </div>
  </AbsoluteFill>
);

const Layers: React.FC<{ f: number; fps: number; t1: number; t2: number; t3: number }> = ({ f, fps, t1, t2, t3 }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", ...pop(f, fps, 4) }}><Title head="第二件" text={<>社保清单：<span style={{ color: ACC }}>三层结构</span></>} sub="国家保基本 · 单位补充 · 个人储备" /></div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 430, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{ ...pop(f, fps, t1), width: 820, borderRadius: 18, background: "rgba(255,255,255,0.7)", border: "1.5px solid " + LINE, padding: "24px 30px" }}>
        <div style={{ fontFamily: SANS, fontSize: 24, color: MUT }}>第三层 · 个人储备</div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 42, color: INK, marginTop: 6 }}>个人养老金 <span style={{ color: ACC, fontSize: 30 }}>每年上限 1.2 万元</span></div>
      </div>
      <div style={{ ...pop(f, fps, t2), width: 860, borderRadius: 18, background: "rgba(255,255,255,0.7)", border: "1.5px solid " + ACC, padding: "24px 30px" }}>
        <div style={{ fontFamily: SANS, fontSize: 24, color: MUT }}>第二层 · 单位补充</div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 42, color: INK, marginTop: 6 }}>企业年金 <span style={{ color: ACC, fontSize: 26 }}>＋ 职业年金</span></div>
      </div>
      <div style={{ ...pop(f, fps, t3), width: 900, borderRadius: 18, background: "rgba(255,255,255,0.7)", border: "1.5px solid " + LINE, padding: "24px 30px" }}>
        <div style={{ fontFamily: SANS, fontSize: 24, color: MUT }}>第一层 · 国家保基本</div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 40, color: INK, marginTop: 6 }}>养老 · 医疗 · 失业 · 工伤 · 生育</div>
      </div>
    </div>
  </AbsoluteFill>
);

const Coverage: React.FC<{ f: number; fps: number; t1: number; t2: number }> = ({ f, fps, t1, t2 }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 0, right: 0, top: 220, textAlign: "center", ...pop(f, fps, 4) }}><Title text={<>两个<b style={{ color: ACC }}> 新覆盖 </b>：长护险 · 灵活就业</>} /></div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 470, display: "flex", justifyContent: "center", gap: 40 }}>
      <div style={{ ...pop(f, fps, t1), width: 620, borderRadius: 24, background: "rgba(255,255,255,0.65)", border: "1.5px solid " + LINE, padding: "32px 36px", textAlign: "center" }}>
        <Icon kind="people" size={84} color={ACC} />
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 48, color: INK, marginTop: 12 }}>长期护理保险</div>
        <div style={{ fontFamily: SANS, fontSize: 26, color: MUT, marginTop: 12, lineHeight: 1.6 }}>社保“第六险”<br />为失能老人的护理费用兜底</div>
      </div>
      <div style={{ ...pop(f, fps, t2), width: 620, borderRadius: 24, background: "rgba(255,255,255,0.65)", border: "1.5px solid " + LINE, padding: "32px 36px", textAlign: "center" }}>
        <Icon kind="truck" size={84} color={ACC} />
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 48, color: INK, marginTop: 12 }}>灵活就业社保</div>
        <div style={{ fontFamily: SANS, fontSize: 26, color: MUT, marginTop: 12, lineHeight: 1.6 }}>骑手 · 网约车 · 自由职业<br />缴费全自付、参保率低 → 要提参保率</div>
      </div>
    </div>
  </AbsoluteFill>
);

const Chips: React.FC<{ f: number; fps: number; start: number; title: React.ReactNode; chips: string[]; trigs: number[] }> = ({ f, fps, start, title, chips, trigs }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 0, right: 0, top: 230, textAlign: "center", ...pop(f, fps, start) }}><Title text={title} /></div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 520, display: "flex", justifyContent: "center", gap: 30 }}>
      {chips.map((c, i) => (
        <div key={c} style={{ ...pop(f, fps, trigs[i]), width: 460, borderRadius: 20, background: "rgba(255,255,255,0.66)", border: "1.5px solid " + ACC, padding: "34px 20px", textAlign: "center", fontFamily: SERIF, fontWeight: 700, fontSize: 40, color: INK }}>{c}</div>
      ))}
    </div>
  </AbsoluteFill>
);

const Climate: React.FC<{ f: number; fps: number; t1: number; t2: number }> = ({ f, fps, t1, t2 }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", ...pop(f, fps, 4) }}><Title head="第三件" text={<>气候大会：<span style={{ color: ACC }}>绿色不设墙</span></>} sub="韩正 · COP31 安塔利亚峰会国别发言" /></div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 470, display: "flex", justifyContent: "center", alignItems: "center", gap: 60 }}>
      <div style={{ ...pop(f, fps, t1), width: 620, textAlign: "center" }}>
        <Icon kind="leaf" size={100} color={ACC} />
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 44, color: INK, marginTop: 12 }}>绿色技术产品自由流通</div>
        <div style={{ fontFamily: SANS, fontSize: 26, color: MUT, marginTop: 10 }}>反对把绿色当贸易壁垒</div>
      </div>
      <div style={{ ...pop(f, fps, t2), width: 620, textAlign: "center" }}>
        <svg viewBox="0 0 300 140" style={{ width: 320, height: 150 }}><line x1="20" y1="70" x2="280" y2="70" stroke="rgba(35,31,26,0.3)" strokeWidth={6} strokeLinecap="round" /><line x1="20" y1="70" x2={20 + 260 * interpolate(f, [t2, t2 + 40], [0, 1], clamp)} y2="70" stroke={ACC} strokeWidth={8} strokeLinecap="round" /><circle cx="280" cy="70" r="14" fill={ACC} /></svg>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 44, color: INK }}>2035 年 NDC 目标</div>
        <div style={{ fontFamily: SANS, fontSize: 26, color: MUT, marginTop: 10 }}>提交国家自主贡献</div>
      </div>
    </div>
  </AbsoluteFill>
);

const Industry: React.FC<{ f: number; fps: number; t1: number; t2: number; t3: number }> = ({ f, fps, t1, t2, t3 }) => {
  const bars = [{ label: "光伏", v: 0.9 }, { label: "风电", v: 0.8 }, { label: "储能", v: 0.85 }, { label: "电动车", v: 0.95 }];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 200, textAlign: "center", ...pop(f, fps, 4) }}><Title text={<>出口：<span style={{ color: ACC }}>新能源更顺</span>，高碳更贵</>} /></div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 430, display: "flex", justifyContent: "center", gap: 60 }}>
        <div style={{ ...pop(f, fps, t1), width: 700 }}>
          <div style={{ fontFamily: SANS, fontSize: 28, color: ACC, marginBottom: 14 }}>受益：新能源出口</div>
          {bars.map((b, i) => (
            <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
              <div style={{ width: 90, fontFamily: SANS, fontSize: 24, color: INK }}>{b.label}</div>
              <div style={{ flex: 1, height: 26, background: "rgba(35,31,26,0.08)", borderRadius: 13 }}><div style={{ width: (b.v * 100 * interpolate(f, [t1 + i * 6, t1 + 30 + i * 6], [0, 1], clamp)).toFixed(0) + "%", height: "100%", borderRadius: 13, background: ACC }} /></div>
            </div>
          ))}
        </div>
        <div style={{ ...pop(f, fps, t2), width: 620, borderRadius: 22, border: "1.5px solid " + LINE, background: "rgba(255,255,255,0.6)", padding: "30px 34px" }}>
          <div style={{ fontFamily: SANS, fontSize: 28, color: ACC }}>被挤压：高碳产品出口</div>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 40, color: INK, marginTop: 14 }}>碳关税压力更大</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 830, textAlign: "center", ...pop(f, fps, t3) }}>
        <div style={{ display: "inline-block", borderRadius: 999, border: "1.5px solid " + ACC, padding: "12px 30px", fontFamily: SANS, fontSize: 30, color: INK }}>对个人：绿色产品更便宜、选择更多</div>
      </div>
    </AbsoluteFill>
  );
};

const Final: React.FC<{ f: number; fps: number; t1: number; t2: number; t3: number; t4: number }> = ({ f, fps, t1, t2, t3, t4 }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 0, right: 0, top: 210, textAlign: "center", ...pop(f, fps, 4) }}><Title text={<>三件事，三个<span style={{ color: ACC }}>反面</span></>} /></div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 430, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      {[
        { t: "基础设施数字是五年规划，不是今年订单", d: t1 },
        { t: "社保清单要等配套细则落地", d: t2 },
        { t: "气候承诺要看各国执行", d: t3 },
      ].map((it) => (
        <div key={it.t} style={{ ...pop(f, fps, it.d), display: "flex", alignItems: "center", gap: 16, width: 1000, borderRadius: 16, border: "1.5px solid " + LINE, background: "rgba(255,255,255,0.6)", padding: "18px 26px" }}>
          <Icon kind="warn" size={44} color={ACC} />
          <div style={{ fontFamily: SANS, fontSize: 30, color: INK }}>{it.t}</div>
        </div>
      ))}
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 830, textAlign: "center", ...pop(f, fps, t4) }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.75)", border: "2px solid " + ACC, borderRadius: 999, padding: "16px 40px", fontFamily: SERIF, fontWeight: 700, fontSize: 40, color: INK }}>持续追踪 · 整理成合集</div>
    </div>
  </AbsoluteFill>
);

/* ---------- Timeline ---------- */
const SEG = [0, 10, 19.28, 31.83, 40.2, 54.75, 64.2, 70.57, 81.66, 94.75, 109.3, 125.49, 139.86, 146.77, 156.78, 170.06, 184.4];
const START = SEG.map((s) => fr(s));

export const Main: React.FC = () => {
  const frame = useCurrentFrame();
  let idx = 0;
  for (let i = 0; i < START.length - 1; i++) if (frame >= START[i]) idx = i;
  const f = frame - START[idx];
  const scene = (() => {
    switch (idx) {
      case 0: return <S1 f={f} />;
      case 1: return <S2 f={f} />;
      case 2: return <S3 f={f} />;
      case 3: return <S4 f={f} />;
      case 4: return <Flow f={f} fps={FPS} start={fr(0.4)} title={<>外贸？不对，是<b style={{color:ACC}}>基建上下游</b></>} stages={[{ label: "上游", items: "钢材 · 水泥 · 管材 · 工程机械", icon: "power" }, { label: "中游", items: "铁路 · 公路 · 水利施工", icon: "truck" }, { label: "下游", items: "大宗商品贸易 · 铁路货运", icon: "money" }]} trigs={[fr(0.44), fr(4.14), fr(7.3)]} />;
      case 5: return <Check f={f} fps={FPS} start={fr(0.4)} title={<>对个人的影响</>} items={["铁路、水利施工、物流仓储岗位增加", "物流成本有望下降", "建材价格会受到支撑"]} trigs={[fr(3.93), fr(4.85), fr(7.25)]} />;
      case 6: return <Chapter f={f} fps={FPS} head="第二件" title={<>社保改革：<span style={{ color: ACC }}>一份清单</span></>} sub="国务院第二十二次专题学习" icon="people" />;
      case 7: return <Layers f={f} fps={FPS} t1={fr(70.68 - 70.57)} t2={fr(74.02 - 70.57)} t3={fr(77)} />;
      case 8: return <Coverage f={f} fps={FPS} t1={fr(81.62 - 81.66) + 6} t2={fr(86.72 - 81.66)} />;
      case 9: return <Chips f={f} fps={FPS} start={fr(0.4)} title={<>这次明确：<span style={{ color: ACC }}>三条线</span></>} chips={["扩大企业年金覆盖面", "完善灵活就业社保", "养老全国统筹 · 医保省级统筹"]} trigs={[fr(95.56 - 94.75), fr(102.64 - 94.75), fr(105.84 - 94.75)]} />;
      case 10: return <Flow f={f} fps={FPS} start={fr(0.4)} title={<>社保的<b style={{color:ACC}}>上下游</b></>} stages={[{ label: "上游", items: "社保基金 · 托管 · 投资机构", icon: "money" }, { label: "中游", items: "企业年金 · 个人养老金 · 商业保险", icon: "people" }, { label: "下游", items: "养老服务 · 护理机构 · 医疗健康", icon: "people" }]} trigs={[fr(111.1 - 109.3), fr(113.88 - 109.3), fr(117)]} />;
      case 11: return <Check f={f} fps={FPS} start={fr(0.4)} title={<>对个人的影响</>} items={["单位有企业年金 → 退休多一份钱", "个人养老金账户可以抵税", "长护险铺开 → 失能护理能报销一部分", "灵活就业参保渠道更顺"]} trigs={[fr(128.28 - 125.49), fr(132.08 - 125.49), fr(132.46 - 125.49), fr(136.62 - 125.49)]} />;
      case 12: return <Chapter f={f} fps={FPS} head="第三件" title={<>气候外交：<span style={{ color: ACC }}>COP31</span></>} sub="联合国气候变化大会 · 安塔利亚峰会" icon="leaf" />;
      case 13: return <Climate f={f} fps={FPS} t1={fr(149.54 - 146.77)} t2={fr(153.68 - 146.77)} />;
      case 14: return <Industry f={f} fps={FPS} t1={fr(157.9 - 156.78)} t2={fr(162.3 - 156.78)} t3={fr(165.66 - 156.78)} />;
      default: return <Final f={f} fps={FPS} t1={fr(172.84 - 170.06)} t2={fr(176.44 - 170.06)} t3={fr(179.24 - 170.06)} t4={fr(181.76 - 170.06)} />;
    }
  })();
  return (
    <AbsoluteFill style={{ background: BG, fontFamily: SANS }}>
      <style>{FONT_CSS}</style>
      <Header />
      <div style={{ position: "absolute", inset: 0 }}>{scene}</div>
    </AbsoluteFill>
  );
};
