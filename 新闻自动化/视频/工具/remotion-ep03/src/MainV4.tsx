import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const BG = "#FAF6EE", INK = "#231F1A", ACC = "#A3323D", MUT = "#9A8C77", LINE = "rgba(35,31,26,0.14)";
const FONT_CSS = "@font-face{font-family:'NotoSerifSC';src:url('/noto-serif-700.woff2') format('woff2');font-weight:700}";
const SERIF = "'NotoSerifSC','Microsoft YaHei',serif";
const SANS = "'Microsoft YaHei',sans-serif";
const FPS = 30;
const fr = (s: number) => Math.round(s * FPS);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const pop = (frame: number, fps: number, delay: number) => {
  const s = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.6, stiffness: 120 } });
  return { opacity: interpolate(s, [0, 1], [0, 1]), transform: "translateY(" + interpolate(s, [0, 1], [28, 0]).toFixed(1) + "px) scale(" + interpolate(s, [0, 1], [0.94, 1]).toFixed(3) + ")" } as React.CSSProperties;
};
const fin = (f: number, s: number, d: number) => interpolate(f, [s, s + d], [0, 1], clamp);
const count = (f: number, s: number, d: number, t: number) => t * interpolate(f, [s, s + d], [0, 1], clamp);

const Header: React.FC = () => (<>
  <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(35,31,26,0.10) 2.2px, transparent 2.2px)", backgroundSize: "28px 28px" }} />
  <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 168, borderBottom: "1.5px solid " + LINE, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 34, letterSpacing: 3, color: ACC }}><span style={{ width: 13, height: 13, borderRadius: 7, background: ACC, display: "block" }} />11.13 联播解读</div>
    <div style={{ fontSize: 28, color: MUT, letterSpacing: 3 }}>2026.11.13</div>
  </div>
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 112, borderTop: "1.5px solid rgba(35,31,26,0.10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: MUT, letterSpacing: 1, textAlign: "center", padding: "0 40px" }}>数据来源：新闻联播 · 央行 · 外交部 · 农业农村部</div>
</>);

const Head: React.FC<{ head?: string; text: React.ReactNode; sub?: string; top?: number }> = ({ head, text, sub, top = 340 }) => (
  <div style={{ position: "absolute", left: 60, right: 60, top, textAlign: "center" }}>
    {head ? <div style={{ display: "inline-block", border: "2px solid " + ACC, borderRadius: 999, padding: "6px 24px", color: ACC, fontFamily: SANS, fontSize: 26, letterSpacing: 3 }}>{head}</div> : null}
    <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 64, color: INK, marginTop: head ? 18 : 0, lineHeight: 1.35 }}>{text}</div>
    {sub ? <div style={{ fontFamily: SANS, fontSize: 28, color: MUT, marginTop: 14, lineHeight: 1.5 }}>{sub}</div> : null}
  </div>
);

const Boxy: React.FC<{ y: number; h?: number; w?: number; children: React.ReactNode; frame: number; fps: number; delay: number; accent?: boolean }> = ({ y, h = 150, w = 880, children, frame, fps, delay, accent }) => (
  <div style={{ position: "absolute", left: (1080 - w) / 2, top: y, width: w, minHeight: h, borderRadius: 22, background: "rgba(255,255,255,0.66)", border: "1.5px solid " + (accent ? ACC : LINE), display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "22px 24px", ...pop(frame, fps, delay) }}>{children}</div>
);

const S1: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  return (<AbsoluteFill><div style={{ position: "absolute", left: 50, right: 50, top: 560, textAlign: "center", ...pop(f, fps, 4) }}>
    <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 100, color: INK }}>新闻联播<span style={{ color: ACC }}>解读</span></div>
    <div style={{ fontFamily: SANS, fontSize: 32, color: ACC, marginTop: 24 }}>新闻联播天天有，带你解读最新信号</div>
    <div style={{ fontFamily: SANS, fontSize: 28, color: MUT, marginTop: 20 }}>2026 年 11 月 13 日 · 主条目 <span style={{ color: ACC, fontWeight: 700 }}>{Math.round(count(f, fr(4.32), fr(0.8), 13))}</span> 条</div>
  </div></AbsoluteFill>);
};

const S2: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const items = [
    { t: "社融 28.61 万亿", sub: "前 10 个月 · 同比少增 2.29 万亿", d: fr(0.6) },
    { t: "APEC · 深圳", sub: "11 月 18—19 日领导人会议", d: fr(5.31) },
    { t: "冬春农田水利", sub: "高标准农田 + 灌区改造", d: fr(9.13) },
  ];
  return (<AbsoluteFill>
    <Head head="这期三件事" text={<>三件都有<span style={{ color: ACC }}>数字</span>的事</>} top={340} />
    {items.map((it, i) => (
      <Boxy key={it.t} y={620 + i * 240} delay={it.d} frame={f} fps={fps}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 40, color: INK }}>{it.t}</div>
        <div style={{ fontFamily: SANS, fontSize: 24, color: MUT, marginTop: 8 }}>{it.sub}</div>
      </Boxy>
    ))}
  </AbsoluteFill>);
};

const S3: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const v = count(f, fr(6.6), fr(1.6), 28.61);
  return (<AbsoluteFill>
    <Head head="第一件" text={<>社融：社会<span style={{ color: ACC }}>借了多少钱</span></>} sub="前 10 个月社融增量" top={320} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center", ...pop(f, fps, fr(6.6)) }}>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 170, color: ACC }}>{v.toFixed(2)}<span style={{ fontSize: 62, color: INK }}> 万亿</span></div>
      <div style={{ fontFamily: SANS, fontSize: 30, color: MUT }}>前 10 个月社融增量</div>
    </div>
    <Boxy y={1080} w={820} delay={fr(9.66)} frame={f} fps={fps}>
      <div style={{ fontFamily: SANS, fontSize: 26, color: MUT }}>同比</div>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 60, color: ACC }}>少增 2.29 万亿</div>
      <div style={{ fontFamily: SANS, fontSize: 24, color: MUT }}>增量变小，不是负增长</div>
    </Boxy>
  </AbsoluteFill>);
};

const S4: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const cut = fin(f, fr(2.4), fr(1.2));
  return (<AbsoluteFill>
    <Head head="结构变化" text={<>居民在<span style={{ color: ACC }}>还钱</span>，不是在借钱</>} top={340} />
    {[{ k: "住户贷款", v: "-1.46 万亿", w: 62, d: fr(1.6) }, { k: "其中短期贷款", v: "-1.41 万亿", w: 58, d: fr(3.4) }].map((r, i) => (
      <Boxy key={r.k} y={660 + i * 300} h={180} delay={r.d} frame={f} fps={fps}>
        <div style={{ fontFamily: SANS, fontSize: 30, color: INK }}>{r.k}</div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 62, color: ACC, marginTop: 6 }}>{r.v}</div>
        <div style={{ width: "82%", height: 26, borderRadius: 13, background: "rgba(35,31,26,0.07)", marginTop: 12, overflow: "hidden" }}>
          <div style={{ width: (r.w * cut) + "%", height: "100%", background: ACC }} />
        </div>
      </Boxy>
    ))}
  </AbsoluteFill>);
};

const S5: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const gauge = interpolate(f, [fr(10.1), fr(11.3)], [0, 0.13], clamp);
  const gaugeLen = 2 * Math.PI * 80 * 0.75;
  return (<AbsoluteFill>
    <Head head="钱去哪了" text={<>钱便宜，但<span style={{ color: ACC }}>没人借</span></>} top={320} />
    <Boxy y={620} h={200} delay={fr(0.97)} frame={f} fps={fps}>
      <div style={{ fontFamily: SANS, fontSize: 26, color: MUT }}>住户存款</div>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 74, color: ACC }}>+8.47 万亿</div>
      <div style={{ fontFamily: SANS, fontSize: 22, color: MUT }}>钱进了存款</div>
    </Boxy>
    <Boxy y={860} h={300} delay={fr(3.47)} frame={f} fps={fps}>
      <div style={{ fontFamily: SANS, fontSize: 26, color: MUT }}>M2 与 M1 增速</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 50, marginTop: 10, height: 150 }}>
        {[{ n: "M2", v: 7.1, d: fr(3.47) }, { n: "M1", v: 4.4, d: fr(5.19) }].map((b) => (
          <div key={b.n} style={{ textAlign: "center" }}>
            <div style={{ width: 80, height: (b.v * 14) * fin(f, b.d, fr(1.2)), background: b.n === "M2" ? ACC : "rgba(163,50,61,0.45)", borderRadius: 8, margin: "0 auto" }} />
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 28, color: INK, marginTop: 6 }}>{b.v}%</div>
            <div style={{ fontFamily: SANS, fontSize: 22, color: MUT }}>{b.n}</div>
          </div>
        ))}
      </div>
    </Boxy>
    <Boxy y={1200} h={260} delay={fr(10.1)} frame={f} fps={fps}>
      <div style={{ fontFamily: SANS, fontSize: 26, color: MUT }}>10 月同业拆借利率</div>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <svg width="160" height="160" viewBox="0 0 360 360">
          <circle cx="180" cy="180" r="80" fill="none" stroke="rgba(35,31,26,0.12)" strokeWidth={22} strokeDasharray={gaugeLen + " 9999"} transform="rotate(135 180 180)" strokeLinecap="round" />
          <circle cx="180" cy="180" r="80" fill="none" stroke={ACC} strokeWidth={22} strokeDasharray={gaugeLen + " 9999"} strokeDashoffset={gaugeLen * (1 - gauge)} transform="rotate(135 180 180)" strokeLinecap="round" />
          <text x="180" y="200" textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize="64" fill={INK}>1.3%</text>
        </svg>
        <div style={{ fontFamily: SANS, fontSize: 26, color: MUT, textAlign: "left" }}>借钱<br />很便宜</div>
      </div>
    </Boxy>
  </AbsoluteFill>);
};

const S6: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const w1 = fin(f, fr(1.3), fr(1.2));
  return (<AbsoluteFill>
    <Head head="谁在撑" text={<>企业贷款 + <span style={{ color: ACC }}>直接融资</span></>} top={300} />
    <Boxy y={620} h={230} delay={fr(1.3)} frame={f} fps={fps}>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 46, color: INK }}>企业贷款 12.39 万亿</div>
      <div style={{ fontFamily: SANS, fontSize: 26, color: ACC, marginTop: 4 }}>其中中长期 6.69 万亿</div>
      <div style={{ width: "86%", height: 44, borderRadius: 10, background: "rgba(35,31,26,0.07)", marginTop: 14, overflow: "hidden", display: "flex" }}>
        <div style={{ width: (6.69 / 12.39 * 100 * w1) + "%", background: ACC }} />
        <div style={{ width: ((12.39 - 6.69) / 12.39 * 100 * w1) + "%", background: "rgba(163,50,61,0.35)" }} />
      </div>
    </Boxy>
    <Boxy y={880} h={190} delay={fr(6.12)} frame={f} fps={fps}>
      <div style={{ fontFamily: SANS, fontSize: 26, color: MUT }}>企业债券净融资</div>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 66, color: ACC }}>3.1 万亿</div>
      <div style={{ fontFamily: SANS, fontSize: 24, color: MUT }}>同比多 1.27 万亿</div>
    </Boxy>
    <Boxy y={1100} h={190} delay={fr(6.9)} frame={f} fps={fps}>
      <div style={{ fontFamily: SANS, fontSize: 26, color: MUT }}>政府债券净融资</div>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 66, color: INK }}>11.49 万亿</div>
      <div style={{ fontFamily: SANS, fontSize: 24, color: MUT }}>同比少 4592 亿</div>
    </Boxy>
  </AbsoluteFill>);
};

const FlowV: React.FC<{ frame: number; fps: number; title: React.ReactNode; stages: { label: string; items: string }[]; delays: number[]; squeezed: string; sqDelay: number }> = ({ frame, fps, title, stages, delays, squeezed, sqDelay }) => (
  <AbsoluteFill>
    <Head text={title} top={300} />
    {stages.map((st, i) => (
      <React.Fragment key={st.label}>
        <Boxy y={560 + i * 290} h={210} delay={delays[i]} frame={frame} fps={fps} accent={i === 1}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 42, color: i === 1 ? ACC : INK }}>{st.label}</div>
          <div style={{ fontFamily: SANS, fontSize: 26, color: MUT, marginTop: 8, textAlign: "center" }}>{st.items}</div>
        </Boxy>
        {i < stages.length - 1 ? <div style={{ position: "absolute", left: 0, right: 0, top: 770 + i * 290, textAlign: "center", fontSize: 38, color: ACC, opacity: fin(frame, delays[i + 1] - 8, 6) }}>↓</div> : null}
      </React.Fragment>
    ))}
    <div style={{ position: "absolute", left: 0, right: 0, top: 1450, textAlign: "center", ...pop(frame, fps, sqDelay) }}>
      <div style={{ display: "inline-block", borderRadius: 999, border: "1.5px solid " + ACC, padding: "14px 26px", fontFamily: SANS, fontSize: 26, color: INK, maxWidth: 880, lineHeight: 1.4 }}>被挤压 / 可接点：{squeezed}</div>
    </div>
  </AbsoluteFill>
);

const CheckV: React.FC<{ frame: number; fps: number; title: React.ReactNode; items: string[]; delays: number[]; top?: number }> = ({ frame, fps, title, items, delays, top = 320 }) => (
  <AbsoluteFill>
    <Head text={title} top={top} />
    {items.map((it, i) => (
      <div key={it} style={{ ...pop(frame, fps, delays[i]), position: "absolute", left: 70, right: 70, top: 600 + i * 200, borderRadius: 18, background: "rgba(255,255,255,0.62)", border: "1.5px solid " + LINE, padding: "26px 28px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 18, background: ACC, color: "#fff", textAlign: "center", lineHeight: "36px", fontSize: 22, flexShrink: 0 }}>✓</div>
        <div style={{ fontFamily: SANS, fontSize: 29, color: INK, lineHeight: 1.45 }}>{it}</div>
      </div>
    ))}
  </AbsoluteFill>
);

const S9: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  return (<AbsoluteFill><div style={{ position: "absolute", left: 0, right: 0, top: 600, textAlign: "center", ...pop(f, fps, 6) }}>
    <div style={{ display: "inline-block", border: "2px solid " + ACC, borderRadius: 999, padding: "8px 26px", color: ACC, fontFamily: SANS, fontSize: 28, letterSpacing: 3 }}>第二件</div>
    <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 100, color: INK, marginTop: 24 }}>APEC · <span style={{ color: ACC }}>深圳</span></div>
    <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 70, color: INK, marginTop: 18 }}>11 月 18—19 日</div>
    <div style={{ fontFamily: SANS, fontSize: 30, color: MUT, marginTop: 20, padding: "0 60px", lineHeight: 1.5 }}>领导人非正式会议 · 中国时隔 <span style={{ color: ACC, fontWeight: 700 }}>12</span> 年再当东道主</div>
  </div></AbsoluteFill>);
};

const S10: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const cx = 540, cy = 1180, R = 200;
  return (<AbsoluteFill>
    <Head head="APEC 是什么" text={<>21 个经济体的<span style={{ color: ACC }}>合作论坛</span></>} sub="成果是宣言，不是协议" top={300} />
    <svg style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920 }} viewBox="0 0 1080 1920">
      {Array.from({ length: 21 }).map((_, i) => {
        const ang = (-90 + i * (360 / 21)) * Math.PI / 180;
        return <circle key={i} cx={cx + Math.cos(ang) * R} cy={cy + Math.sin(ang) * R} r={10} fill={i % 3 === 0 ? ACC : "rgba(163,50,61,0.45)"} opacity={fin(f, fr(0.9) + i * 2, fr(0.5))} />;
      })}
      <circle cx={cx} cy={cy} r={58} fill="none" stroke={ACC} strokeWidth={3} opacity={fin(f, fr(0.9), fr(1))} />
      <text x={cx} y={cy + 10} textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize="28" fill={INK} opacity={fin(f, fr(0.9), fr(1))}>APEC</text>
    </svg>
    <Boxy y={700} h={220} delay={fr(3.81)} frame={f} fps={fps}>
      <div style={{ fontFamily: SANS, fontSize: 26, color: MUT }}>预期成果</div>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 54, color: ACC }}>深圳宣言</div>
      <div style={{ fontFamily: SANS, fontSize: 22, color: MUT }}>贸易 · 互联互通 · 数字经济 · AI</div>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 30, color: INK, marginTop: 6 }}>开放 · 创新 · 合作</div>
    </Boxy>
    <div style={{ ...pop(f, fps, fr(11.4)), position: "absolute", left: 0, right: 0, top: 1500, textAlign: "center" }}>
      <div style={{ display: "inline-block", borderRadius: 999, border: "1.5px solid " + ACC, padding: "14px 30px", fontFamily: SANS, fontSize: 26, color: INK }}>优先领域：开放 · 创新 · 合作</div>
    </div>
  </AbsoluteFill>);
};

const S11: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const n1 = Math.round(count(f, fr(2.25), fr(1.2), 300));
  const pct = count(f, fr(8.75), fr(1.2), 30);
  return (<AbsoluteFill>
    <Head head="配套数据" text={<>APEC 中国年，已经<span style={{ color: ACC }}>热起来</span></>} top={320} />
    <div style={{ position: "absolute", left: 0, right: 0, top: 700, textAlign: "center", ...pop(f, fps, fr(2.25)) }}>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 160, color: ACC }}>{n1}<span style={{ fontSize: 56, color: INK }}>+ 场</span></div>
      <div style={{ fontFamily: SANS, fontSize: 28, color: MUT }}>APEC 中国年会议活动</div>
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 1120, textAlign: "center", ...pop(f, fps, fr(8.75)) }}>
      <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 160, color: ACC }}>{Math.round(pct)}<span style={{ fontSize: 56, color: INK }}>%</span></div>
      <div style={{ fontFamily: SANS, fontSize: 28, color: MUT, padding: "0 80px", lineHeight: 1.5 }}>大湾区 9 市对 APEC 经济体进出口增长</div>
    </div>
  </AbsoluteFill>);
};

const S14: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const draw = fin(f, fr(4.84), fr(1.4));
  return (<AbsoluteFill>
    <Head head="第三件" text={<>高标准农田：<span style={{ color: ACC }}>升级版农田</span></>} sub="土地平整 · 灌排配套 · 道路通电" top={300} />
    <svg style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920 }} viewBox="0 0 1080 1920">
      {Array.from({ length: 4 }).map((_, r) => Array.from({ length: 3 }).map((_, c) => (
        <rect key={r + "-" + c} x={220 + c * 220} y={700 + r * 170} width={190} height={140} rx={10} fill="rgba(163,50,61,0.10)" stroke="rgba(49,120,80,0.55)" strokeWidth={3} opacity={fin(f, fr(2.4) + (r + c) * 2, fr(0.5))} />
      )))}
      <line x1={180} y1={700} x2={180} y2={1380} stroke="rgba(35,31,26,0.35)" strokeWidth={14} strokeDasharray="1000" strokeDashoffset={1000 * (1 - draw)} />
      <line x1={190} y1={660} x2={900} y2={660} stroke="rgba(35,31,26,0.18)" strokeWidth={12} strokeDasharray="1000" strokeDashoffset={1000 * (1 - draw)} />
      <text x={150} y={1420} textAnchor="middle" fontFamily={SANS} fontSize="26" fill={MUT} opacity={draw}>沟渠</text>
      <text x={900} y={640} textAnchor="middle" fontFamily={SANS} fontSize="26" fill={MUT} opacity={draw}>道路</text>
    </svg>
  </AbsoluteFill>);
};

const S15: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const chips = [
    { t: "质量优先", d: fr(1.41) }, { t: "大中型灌区改造", d: fr(4.4) }, { t: "农田沟渠疏浚", d: fr(7.6) },
    { t: "农业节水增效", d: fr(8.73) }, { t: "严格资金监管", d: fr(10.89) },
  ];
  return (<AbsoluteFill>
    <Head head="这次批示" text={<>五件事，一个关键词：<span style={{ color: ACC }}>质量</span></>} top={320} />
    <div style={{ position: "absolute", left: 60, right: 60, top: 640, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20 }}>
      {chips.map((c) => <div key={c.t} style={{ ...pop(f, fps, c.d), width: 420, borderRadius: 18, background: "rgba(255,255,255,0.66)", border: "1.5px solid " + LINE, padding: "30px 12px", textAlign: "center", fontFamily: SERIF, fontWeight: 700, fontSize: 34, color: INK }}>{c.t}</div>)}
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: 1150, textAlign: "center", ...pop(f, fps, fr(11.8)) }}>
      <div style={{ display: "inline-block", borderRadius: 999, border: "2px solid " + ACC, padding: "16px 28px", fontFamily: SANS, fontSize: 28, color: INK, maxWidth: 880, lineHeight: 1.5 }}>冬春是集中施工期 —— 现在就是窗口</div>
    </div>
  </AbsoluteFill>);
};

const S17: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const good = ["水利施工、节水灌溉安装、土壤检测岗位增加", "粮食产量更稳"];
  const bad = ["社融少增是同比，不是负增长", "APEC 是宣言，不是协议", "农田批示是要求，不是预算"];
  return (<AbsoluteFill>
    <Head text={<>对个人的影响 · 三个<span style={{ color: ACC }}>反面</span></>} top={280} />
    {good.map((it, i) => (
      <div key={it} style={{ ...pop(f, fps, fr(4.49) + i * 8), position: "absolute", left: 80, right: 80, top: 540 + i * 160, borderRadius: 16, background: "rgba(255,255,255,0.62)", border: "1.5px solid " + LINE, padding: "20px 24px", display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: 16, background: ACC, color: "#fff", textAlign: "center", lineHeight: "32px", fontSize: 20, flexShrink: 0 }}>✓</div>
        <div style={{ fontFamily: SANS, fontSize: 27, color: INK, lineHeight: 1.45 }}>{it}</div>
      </div>
    ))}
    {bad.map((it, i) => (
      <div key={it} style={{ ...pop(f, fps, fr(8.39) + i * 6), position: "absolute", left: 80, right: 80, top: 900 + i * 150, borderRadius: 16, background: "rgba(255,255,255,0.5)", border: "1.5px dashed " + ACC, padding: "18px 24px", display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: 16, border: "2px solid " + ACC, color: ACC, textAlign: "center", lineHeight: "28px", fontSize: 20, flexShrink: 0 }}>!</div>
        <div style={{ fontFamily: SANS, fontSize: 26, color: MUT, lineHeight: 1.45 }}>{it}</div>
      </div>
    ))}
    <div style={{ position: "absolute", left: 0, right: 0, top: 1450, textAlign: "center", ...pop(f, fps, fr(16.79)) }}>
      <div style={{ display: "inline-block", background: "rgba(255,255,255,0.75)", border: "2px solid " + ACC, borderRadius: 999, padding: "16px 30px", fontFamily: SERIF, fontWeight: 700, fontSize: 34, color: INK }}>持续追踪 · 整理成合集</div>
    </div>
  </AbsoluteFill>);
};

const SEG = [0, 6.37, 18.38, 30.02, 40.39, 53.3, 65.3, 77.3, 92.4, 100.77, 114.41, 124.41, 139.86, 150.06, 159.15, 175.15, 188.61, 207.33];
const START = SEG.map((x) => fr(x));

export const MainV4: React.FC = () => {
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
      case 4: return <S5 f={f} />;
      case 5: return <S6 f={f} />;
      case 6: return <FlowV frame={f} fps={FPS} title={<>社融的<span style={{ color: ACC }}>上下游</span></>} stages={[{ label: "上游", items: "银行 · 券商 · 保险" }, { label: "中游", items: "科技制造 · 城投" }, { label: "下游", items: "消费 · 地产" }]} delays={[fr(1.58), fr(4.2), fr(6.5)]} squeezed="银行零售信贷 · 消费金融" sqDelay={fr(8.0)} />;
      case 7: return <CheckV frame={f} fps={FPS} title={<>对个人的影响</>} items={["消费贷电话变多：银行放不出去", "存款利率低：钱放银行不划算", "贷款利率低：买房、经营贷更便宜", "岗位：银行零售承压，券商投行景气"]} delays={[fr(1.18), fr(4.28), fr(7.56), fr(11.68)]} />;
      case 8: return <S9 f={f} />;
      case 9: return <S10 f={f} />;
      case 10: return <S11 f={f} />;
      case 11: return <FlowV frame={f} fps={FPS} title={<>APEC 的<span style={{ color: ACC }}>上下游</span></>} stages={[{ label: "上游", items: "出口制造 · 跨境电商" }, { label: "中游", items: "物流 · 支付 · 会展" }, { label: "下游", items: "深圳本地消费与服务" }]} delays={[fr(2.39), fr(4.69), fr(8.0)]} squeezed="最现实可接点：跨境电商本地化服务" sqDelay={fr(12.27)} />;
      case 12: return <CheckV frame={f} fps={FPS} title={<>对个人的影响</>} items={["跨境电商、会展、翻译短期岗位增加", "跨境购物和支付更顺", "深圳本地酒店、餐饮、安保短期受益"]} delays={[fr(1.22), fr(4.78), fr(7.26)]} top={360} />;
      case 13: return <S14 f={f} />;
      case 14: return <S15 f={f} />;
      case 15: return <FlowV frame={f} fps={FPS} title={<>农田水利的<span style={{ color: ACC }}>上下游</span></>} stages={[{ label: "上游", items: "管材 · 水泵 · 滴灌带" }, { label: "中游", items: "农田水利施工 · 灌区改造" }, { label: "下游", items: "农机 · 农资 · 粮食" }]} delays={[fr(2.57), fr(5.87), fr(8.21)]} squeezed="大水漫灌等低效灌溉方式" sqDelay={fr(10.73)} />;
      default: return <S17 f={f} />;
    }
  })();
  return (<AbsoluteFill style={{ background: BG, fontFamily: SANS }}>
    <style>{FONT_CSS}</style>
    <Header />
    <div style={{ position: "absolute", inset: 0 }}>{scene}</div>
  </AbsoluteFill>);
};
