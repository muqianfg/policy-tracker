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
  return { opacity: interpolate(s, [0, 1], [0, 1]), transform: "translateY(" + interpolate(s, [0, 1], [26, 0]).toFixed(1) + "px) scale(" + interpolate(s, [0, 1], [0.94, 1]).toFixed(3) + ")" } as React.CSSProperties;
};
const fin = (f: number, s: number, d: number) => interpolate(f, [s, s + d], [0, 1], clamp);
const count = (f: number, s: number, d: number, t: number) => t * interpolate(f, [s, s + d], [0, 1], clamp);

const Header: React.FC = () => (<>
  <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(35,31,26,0.10) 2.2px, transparent 2.2px)", backgroundSize: "30px 30px" }} />
  <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 92, borderBottom: "1.5px solid " + LINE, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 64px", fontFamily: SANS }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 26, letterSpacing: 3, color: ACC }}><span style={{ width: 12, height: 12, borderRadius: 6, background: ACC, display: "block" }} />11.13 联播解读</div>
    <div style={{ fontSize: 24, color: MUT, letterSpacing: 3 }}>2026.11.13</div>
  </div>
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 70, borderTop: "1.5px solid rgba(35,31,26,0.10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: MUT, letterSpacing: 1.5, fontFamily: SANS }}>数据来源：新闻联播 · 央行 · 外交部 · 农业农村部</div>
</>);

const Head: React.FC<{ head?: string; text: React.ReactNode; sub?: string; top?: number }> = ({ head, text, sub, top = 250 }) => (
  <div style={{ position: "absolute", left: 100, right: 100, top, textAlign: "center" }}>
    {head ? <div style={{ display: "inline-block", border: "2px solid " + ACC, borderRadius: 999, padding: "8px 26px", color: ACC, fontFamily: SANS, fontSize: 28, letterSpacing: 3 }}>{head}</div> : null}
    <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 72, color: INK, letterSpacing: 1.5, marginTop: head ? 22 : 0, lineHeight: 1.35 }}>{text}</div>
    {sub ? <div style={{ fontFamily: SANS, fontSize: 30, color: MUT, marginTop: 16, lineHeight: 1.5 }}>{sub}</div> : null}
  </div>
);

const Big: React.FC<{ value: number; unit: string; label: string; delay: number; frame: number; fps: number; accent?: boolean; x?: number; y?: number; size?: number }> = ({ value, unit, label, delay, frame, fps, accent, x = 0, y = 0, size = 150 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 760, textAlign: "center", ...pop(frame, fps, delay) }}>
    <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: size, color: accent ? ACC : INK }}>{value.toFixed(value < 10 ? 2 : 1)}<span style={{ fontSize: size * 0.4, color: INK }}> {unit}</span></div>
    <div style={{ fontFamily: SANS, fontSize: 30, color: MUT, marginTop: 8 }}>{label}</div>
  </div>
);

const Flow: React.FC<{ frame: number; fps: number; top?: number; title: React.ReactNode; stages: { label: string; items: string; icon: string }[]; delays: number[]; squeezed?: string; sqDelay?: number }> = ({ frame, fps, top = 200, title, stages, delays, squeezed, sqDelay }) => (
  <AbsoluteFill>
    <Head text={title} top={top} />
    <div style={{ position: "absolute", left: 0, right: 0, top: top + 240, display: "flex", justifyContent: "center", alignItems: "center", gap: 22 }}>
      {stages.map((st, i) => (
        <React.Fragment key={st.label}>
          <div style={{ ...pop(frame, fps, delays[i]), width: 420, borderRadius: 24, background: "rgba(255,255,255,0.66)", border: "1.5px solid " + (i === 1 ? ACC : LINE), padding: "26px 24px", textAlign: "center" }}>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 40, color: i === 1 ? ACC : INK }}>{st.label}</div>
            <div style={{ fontFamily: SANS, fontSize: 23, color: MUT, marginTop: 12, lineHeight: 1.5 }}>{st.items}</div>
          </div>
          {i < stages.length - 1 ? <div style={{ opacity: fin(frame, delays[i + 1] - 8, 6), fontSize: 38, color: ACC }}>→</div> : null}
        </React.Fragment>
      ))}
    </div>
    {squeezed ? (
      <div style={{ position: "absolute", left: 0, right: 0, top: top + 500, textAlign: "center", ...pop(frame, fps, sqDelay ?? 0) }}>
        <div style={{ display: "inline-block", borderRadius: 999, border: "1.5px solid " + ACC, padding: "12px 30px", fontFamily: SANS, fontSize: 28, color: INK }}>被挤压：{squeezed}</div>
      </div>
    ) : null}
  </AbsoluteFill>
);

const Check: React.FC<{ frame: number; fps: number; title: React.ReactNode; items: string[]; delays: number[]; top?: number }> = ({ frame, fps, title, items, delays, top = 220 }) => (
  <AbsoluteFill>
    <Head text={title} top={top} />
    <div style={{ position: "absolute", left: 0, right: 0, top: top + 200, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      {items.map((it, i) => (
        <div key={it} style={{ ...pop(frame, fps, delays[i]), display: "flex", alignItems: "center", gap: 16, width: 1040, borderRadius: 18, background: "rgba(255,255,255,0.62)", border: "1.5px solid " + LINE, padding: "20px 26px" }}>
          <div style={{ width: 34, height: 34, borderRadius: 17, background: ACC, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>✓</div>
          <div style={{ fontFamily: SANS, fontSize: 30, color: INK, lineHeight: 1.4 }}>{it}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

const ChipRow: React.FC<{ frame: number; fps: number; title: React.ReactNode; chips: { t: string; d: number; sub?: string }[]; top?: number }> = ({ frame, fps, title, chips, top = 220 }) => (
  <AbsoluteFill>
    <Head text={title} top={top} />
    <div style={{ position: "absolute", left: 0, right: 0, top: top + 200, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 20, padding: "0 120px" }}>
      {chips.map((c) => (
        <div key={c.t} style={{ ...pop(frame, fps, c.d), width: 400, borderRadius: 20, background: "rgba(255,255,255,0.66)", border: "1.5px solid " + ACC, padding: "28px 18px", textAlign: "center" }}>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 34, color: INK }}>{c.t}</div>
          {c.sub ? <div style={{ fontFamily: SANS, fontSize: 22, color: MUT, marginTop: 8 }}>{c.sub}</div> : null}
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

const S1: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center", ...pop(f, fps, 4) }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 118, color: INK, letterSpacing: 3 }}>新闻联播<span style={{ color: ACC }}>解读</span></div>
        <div style={{ fontFamily: SANS, fontSize: 34, color: ACC, marginTop: 22, letterSpacing: 3 }}>新闻联播天天有，带你解读最新信号</div>
        <div style={{ fontFamily: SANS, fontSize: 30, color: MUT, marginTop: 22, letterSpacing: 2 }}>2026 年 11 月 13 日 · 主条目 <span style={{ color: ACC, fontWeight: 700 }}>{Math.round(count(f, fr(4.32), fr(0.8), 13))}</span> 条</div>
      </div>
    </AbsoluteFill>
  );
};

const S2: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const items = [
    { t: "社融 28.61 万亿", sub: "前 10 个月，同比少增 2.29 万亿", d: fr(0.6) },
    { t: "APEC · 深圳", sub: "11 月 18—19 日领导人会议", d: fr(5.31) },
    { t: "冬春农田水利", sub: "高标准农田 + 灌区改造", d: fr(9.13) },
  ];
  return (
    <AbsoluteFill>
      <Head head="这期三件事" text={<>三件都有<span style={{ color: ACC }}>数字</span>的事</>} top={250} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 560, display: "flex", justifyContent: "center", gap: 26 }}>
        {items.map((it) => (
          <div key={it.t} style={{ ...pop(f, fps, it.d), width: 470, borderRadius: 24, background: "rgba(255,255,255,0.66)", border: "1.5px solid " + ACC, padding: "30px 24px", textAlign: "center" }}>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 40, color: INK }}>{it.t}</div>
            <div style={{ fontFamily: SANS, fontSize: 24, color: MUT, marginTop: 12, lineHeight: 1.5 }}>{it.sub}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const S3: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const v = count(f, fr(6.6), fr(1.6), 28.61);
  return (
    <AbsoluteFill>
      <Head head="第一件" text={<>社融：整个社会<span style={{ color: ACC }}>借了多少钱</span></>} sub="前 10 个月社会融资规模增量" top={220} />
      <div style={{ position: "absolute", left: 380, top: 640 }}>
        <Big value={v} unit="万亿元" label="前 10 个月社融增量" delay={fr(6.6)} frame={f} fps={fps} x={0} y={0} />
      </div>
      <div style={{ position: "absolute", left: 1100, top: 700, ...pop(f, fps, fr(9.66)) }}>
        <div style={{ width: 520, borderRadius: 20, border: "1.5px solid " + LINE, background: "rgba(255,255,255,0.62)", padding: "26px 30px" }}>
          <div style={{ fontFamily: SANS, fontSize: 26, color: MUT }}>同比</div>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 54, color: ACC }}>少增 2.29 万亿</div>
          <div style={{ fontFamily: SANS, fontSize: 24, color: MUT, marginTop: 8 }}>增量变小，不是负增长</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const S4: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const cut = fin(f, fr(2.4), fr(1.2));
  return (
    <AbsoluteFill>
      <Head head="结构变化" text={<>居民在<span style={{ color: ACC }}>还钱</span>，不是在借钱</>} top={220} />
      <div style={{ position: "absolute", left: 200, right: 200, top: 620 }}>
        {[{ k: "住户贷款", v: "减少 1.46 万亿" }, { k: "其中短期贷款", v: "减少 1.41 万亿" }].map((r, i) => (
          <div key={r.k} style={{ ...pop(f, fps, fr(1.6 + i * 1.8)), display: "flex", alignItems: "center", gap: 30, marginTop: 26 }}>
            <div style={{ width: 300, fontFamily: SANS, fontSize: 30, color: INK }}>{r.k}</div>
            <div style={{ flex: 1, height: 56, borderRadius: 10, background: "rgba(35,31,26,0.07)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: (i === 0 ? 62 : 58) * cut + "%", background: "rgba(163,50,61,0.85)" }} />
            </div>
            <div style={{ width: 260, fontFamily: SERIF, fontWeight: 700, fontSize: 38, color: ACC, textAlign: "right" }}>{r.v}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const S5: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const gauge = interpolate(f, [fr(10.1), fr(11.3)], [0, 0.13], clamp);
  const gaugeLen = 2 * Math.PI * 90 * 0.75;
  return (
    <AbsoluteFill>
      <Head head="钱去哪了" text={<>钱便宜，但<span style={{ color: ACC }}>没人借</span></>} top={190} />
      <div style={{ position: "absolute", left: 130, top: 520, width: 520, borderRadius: 22, border: "1.5px solid " + LINE, background: "rgba(255,255,255,0.62)", padding: "26px 30px", ...pop(f, fps, fr(0.97)) }}>
        <div style={{ fontFamily: SANS, fontSize: 26, color: MUT }}>住户存款</div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 62, color: ACC }}>+8.47 万亿</div>
        <div style={{ fontFamily: SANS, fontSize: 22, color: MUT, marginTop: 6 }}>钱进了存款</div>
      </div>
      <div style={{ position: "absolute", left: 700, top: 520, width: 520, borderRadius: 22, border: "1.5px solid " + LINE, background: "rgba(255,255,255,0.62)", padding: "26px 30px", ...pop(f, fps, fr(3.47)) }}>
        <div style={{ fontFamily: SANS, fontSize: 26, color: MUT }}>M2 与 M1 增速</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 40, marginTop: 14 }}>
          {[{ n: "M2", v: 7.1, d: fr(3.47) }, { n: "M1", v: 4.4, d: fr(5.19) }].map((b) => (
            <div key={b.n} style={{ textAlign: "center", ...pop(f, fps, b.d) }}>
              <div style={{ width: 90, height: (b.v * 12) * fin(f, b.d, fr(1.2)), background: b.n === "M2" ? ACC : "rgba(163,50,61,0.45)", borderRadius: 8 }} />
              <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 34, color: INK, marginTop: 8 }}>{b.v}%</div>
              <div style={{ fontFamily: SANS, fontSize: 22, color: MUT }}>{b.n}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: 1270, top: 520, width: 500, borderRadius: 22, border: "1.5px solid " + LINE, background: "rgba(255,255,255,0.62)", padding: "26px 30px", ...pop(f, fps, fr(10.1)) }}>
        <div style={{ fontFamily: SANS, fontSize: 26, color: MUT }}>10 月同业拆借利率</div>
        <svg width="220" height="220" viewBox="0 0 360 360" style={{ margin: "10px auto 0", display: "block" }}>
          <circle cx="180" cy="180" r="90" fill="none" stroke="rgba(35,31,26,0.12)" strokeWidth={22} strokeDasharray={gaugeLen + " 9999"} transform="rotate(135 180 180)" strokeLinecap="round" />
          <circle cx="180" cy="180" r="90" fill="none" stroke={ACC} strokeWidth={22} strokeDasharray={gaugeLen + " 9999"} strokeDashoffset={gaugeLen * (1 - gauge)} transform="rotate(135 180 180)" strokeLinecap="round" />
          <text x="180" y="200" textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize="70" fill={INK}>1.3%</text>
        </svg>
        <div style={{ fontFamily: SANS, fontSize: 22, color: MUT, textAlign: "center" }}>借钱很便宜</div>
      </div>
    </AbsoluteFill>
  );
};

const S6: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const w1 = fin(f, fr(1.3), fr(1.2));
  return (
    <AbsoluteFill>
      <Head head="谁在撑" text={<>企业贷款 + <span style={{ color: ACC }}>直接融资</span>在补位</>} top={220} />
      <div style={{ position: "absolute", left: 160, right: 160, top: 620 }}>
        <div style={{ ...pop(f, fps, fr(1.3)) }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: SANS, fontSize: 30, color: INK }}>
            <div>企业贷款 <span style={{ color: ACC, fontWeight: 700 }}>12.39 万亿</span></div>
            <div style={{ color: MUT }}>其中中长期 <span style={{ color: ACC }}>6.69 万亿</span></div>
          </div>
          <div style={{ height: 62, borderRadius: 10, background: "rgba(35,31,26,0.07)", marginTop: 14, overflow: "hidden", display: "flex" }}>
            <div style={{ width: (6.69 / 12.39 * 100 * w1) + "%", background: ACC }} />
            <div style={{ width: ((12.39 - 6.69) / 12.39 * 100 * w1) + "%", background: "rgba(163,50,61,0.35)" }} />
          </div>
        </div>
        <div style={{ ...pop(f, fps, fr(6.12)), marginTop: 40, display: "flex", gap: 26 }}>
          <div style={{ flex: 1, borderRadius: 20, border: "1.5px solid " + LINE, background: "rgba(255,255,255,0.62)", padding: "26px 30px" }}>
            <div style={{ fontFamily: SANS, fontSize: 26, color: MUT }}>企业债券净融资</div>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 66, color: INK }}>3.1 万亿</div>
            <div style={{ fontFamily: SANS, fontSize: 24, color: ACC }}>同比多 1.27 万亿</div>
          </div>
          <div style={{ flex: 1, borderRadius: 20, border: "1.5px solid " + LINE, background: "rgba(255,255,255,0.62)", padding: "26px 30px" }}>
            <div style={{ fontFamily: SANS, fontSize: 26, color: MUT }}>政府债券净融资</div>
            <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 66, color: INK }}>11.49 万亿</div>
            <div style={{ fontFamily: SANS, fontSize: 24, color: MUT }}>同比少 4592 亿</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const S7: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill>
    <Flow frame={f} fps={FPS} top={200} title={<>社融的<span style={{ color: ACC }}>上下游</span></>}
      stages={[
        { label: "上游", items: "银行 · 券商 · 保险", icon: "money" },
        { label: "中游", items: "科技制造 · 城投", icon: "people" },
        { label: "下游", items: "消费 · 地产", icon: "truck" },
      ]} delays={[fr(1.58), fr(4.2), fr(6.5)]} squeezed="银行零售信贷 · 消费金融" sqDelay={fr(8.0)} />
  </AbsoluteFill>
);

const S8: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill>
    <Check frame={f} fps={FPS} top={180} title={<>对个人的影响</>} items={[
      "消费贷电话变多：银行放不出去",
      "存款利率低：钱放银行不划算",
      "贷款利率低：买房、经营贷更便宜",
      "岗位：银行零售承压，券商投行景气",
    ]} delays={[fr(1.18), fr(4.28), fr(7.56), fr(11.68)]} />
  </AbsoluteFill>
);

const S9: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, textAlign: "center", ...pop(f, fps, 6) }}>
        <div style={{ display: "inline-block", border: "2px solid " + ACC, borderRadius: 999, padding: "8px 26px", color: ACC, fontFamily: SANS, fontSize: 28, letterSpacing: 3 }}>第二件</div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 108, color: INK, marginTop: 24 }}>APEC · <span style={{ color: ACC }}>深圳</span></div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 78, color: INK, marginTop: 18 }}>11 月 18—19 日</div>
        <div style={{ fontFamily: SANS, fontSize: 34, color: MUT, marginTop: 22 }}>领导人非正式会议 · 中国时隔 <span style={{ color: ACC, fontWeight: 700 }}>12</span> 年再当东道主</div>
      </div>
    </AbsoluteFill>
  );
};

const S10: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const cx = 620, cy = 580, R = 230;
  return (
    <AbsoluteFill>
      <Head head="APEC 是什么" text={<>21 个经济体的<span style={{ color: ACC }}>合作论坛</span></>} sub="成果是宣言，不是协议" top={170} />
      <svg style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080 }} viewBox="0 0 1920 1080">
        {Array.from({ length: 21 }).map((_, i) => {
          const ang = (-90 + i * (360 / 21)) * Math.PI / 180;
          const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
          const op = fin(f, fr(0.9) + i * 2, fr(0.5));
          return <circle key={i} cx={x} cy={y} r={11} fill={i % 3 === 0 ? ACC : "rgba(163,50,61,0.45)"} opacity={op} />;
        })}
        <circle cx={cx} cy={cy} r={66} fill="none" stroke={ACC} strokeWidth={3} opacity={fin(f, fr(0.9), fr(1))} />
        <text x={cx} y={cy + 10} textAnchor="middle" fontFamily={SERIF} fontWeight={700} fontSize="30" fill={INK} opacity={fin(f, fr(0.9), fr(1))}>APEC</text>
      </svg>
      <div style={{ position: "absolute", left: 1030, top: 420, ...pop(f, fps, fr(3.81)) }}>
        <div style={{ width: 620, borderRadius: 22, border: "1.5px solid " + ACC, background: "rgba(255,255,255,0.66)", padding: "30px 34px" }}>
          <div style={{ fontFamily: SANS, fontSize: 26, color: MUT }}>预期成果</div>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 56, color: ACC, marginTop: 6 }}>深圳宣言</div>
          <div style={{ fontFamily: SANS, fontSize: 24, color: MUT, marginTop: 10, lineHeight: 1.6 }}>贸易 · 互联互通 · 数字经济 · AI</div>
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 34, color: INK, marginTop: 18 }}>开放 · 创新 · 合作</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const S11: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const n1 = Math.round(count(f, fr(2.25), fr(1.2), 300));
  const pct = count(f, fr(8.75), fr(1.2), 30);
  return (
    <AbsoluteFill>
      <Head head="配套数据" text={<>APEC 中国年，已经<span style={{ color: ACC }}>热起来</span></>} top={220} />
      <div style={{ position: "absolute", left: 250, top: 600, width: 620, textAlign: "center", ...pop(f, fps, fr(2.25)) }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 170, color: ACC }}>{n1}<span style={{ fontSize: 60, color: INK }}>+ 场</span></div>
        <div style={{ fontFamily: SANS, fontSize: 30, color: MUT }}>APEC 中国年会议活动</div>
      </div>
      <div style={{ position: "absolute", left: 1000, top: 600, width: 620, textAlign: "center", ...pop(f, fps, fr(8.75)) }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 170, color: ACC }}>{Math.round(pct)}<span style={{ fontSize: 60, color: INK }}>%</span></div>
        <div style={{ fontFamily: SANS, fontSize: 30, color: MUT }}>大湾区 9 市对 APEC 经济体进出口增长</div>
      </div>
    </AbsoluteFill>
  );
};

const S12: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill>
    <Flow frame={f} fps={FPS} top={180} title={<>APEC 的<span style={{ color: ACC }}>上下游</span></>}
      stages={[
        { label: "上游", items: "出口制造 · 跨境电商", icon: "truck" },
        { label: "中游", items: "物流 · 支付 · 会展", icon: "money" },
        { label: "下游", items: "深圳本地消费与服务", icon: "people" },
      ]} delays={[fr(2.39), fr(4.69), fr(8.0)]} squeezed="最现实可接点：跨境电商本地化服务（语言/支付/合规）" sqDelay={fr(12.27)} />
  </AbsoluteFill>
);

const S13: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill>
    <Check frame={f} fps={FPS} top={240} title={<>对个人的影响</>} items={[
      "跨境电商、会展、翻译短期岗位增加",
      "跨境购物和支付更顺",
      "深圳本地酒店、餐饮、安保短期受益",
    ]} delays={[fr(1.22), fr(4.78), fr(7.26)]} />
  </AbsoluteFill>
);

const S14: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const draw = fin(f, fr(4.84), fr(1.4));
  return (
    <AbsoluteFill>
      <Head head="第三件" text={<>高标准农田：<span style={{ color: ACC }}>升级版农田</span></>} sub="土地平整 · 灌排配套 · 道路通电" top={180} />
      <svg style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080 }} viewBox="0 0 1920 1080">
        {Array.from({ length: 5 }).map((_, r) => Array.from({ length: 6 }).map((_, c) => (
          <rect key={r + "-" + c} x={420 + c * 170} y={480 + r * 96} width={150} height={76} rx={8} fill="rgba(163,50,61,0.10)" stroke="rgba(49,120,80,0.55)" strokeWidth={3} opacity={fin(f, fr(2.4) + (r + c) * 2, fr(0.5))} />
        )))}
        <line x1={380} y1={480} x2={380} y2={960} stroke="rgba(35,31,26,0.35)" strokeWidth={16} strokeDasharray="1000" strokeDashoffset={1000 * (1 - draw)} />
        <line x1={390} y1={450} x2={1460} y2={450} stroke="rgba(35,31,26,0.18)" strokeWidth={14} strokeDasharray="1100" strokeDashoffset={1100 * (1 - draw)} />
        <text x={380} y={440} textAnchor="middle" fontFamily={SANS} fontSize="26" fill={MUT} opacity={draw}>道路</text>
        <text x={355} y={1000} textAnchor="middle" fontFamily={SANS} fontSize="26" fill={MUT} opacity={draw}>沟渠</text>
      </svg>
    </AbsoluteFill>
  );
};

const S15: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  const chips = [
    { t: "质量优先", d: fr(1.41) }, { t: "大中型灌区改造", d: fr(4.4) }, { t: "农田沟渠疏浚", d: fr(7.6) },
    { t: "农业节水增效", d: fr(8.73) }, { t: "严格资金监管", d: fr(10.89) },
  ];
  return (
    <AbsoluteFill>
      <Head head="这次批示" text={<>五件事，一个关键词：<span style={{ color: ACC }}>质量</span></>} top={180} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 500, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 22, padding: "0 160px" }}>
        {chips.map((c) => (
          <div key={c.t} style={{ ...pop(f, fps, c.d), width: 380, borderRadius: 18, background: "rgba(255,255,255,0.66)", border: "1.5px solid " + LINE, padding: "26px 16px", textAlign: "center", fontFamily: SERIF, fontWeight: 700, fontSize: 34, color: INK }}>{c.t}</div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center", ...pop(f, fps, fr(11.8)) }}>
        <div style={{ display: "inline-block", borderRadius: 999, border: "2px solid " + ACC, padding: "14px 34px", fontFamily: SANS, fontSize: 30, color: INK }}>冬春是集中施工期 —— 现在就是窗口</div>
      </div>
    </AbsoluteFill>
  );
};

const S16: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill>
    <Flow frame={f} fps={FPS} top={180} title={<>农田水利的<span style={{ color: ACC }}>上下游</span></>}
      stages={[
        { label: "上游", items: "管材 · 水泵 · 滴灌带", icon: "water" },
        { label: "中游", items: "农田水利施工 · 灌区改造", icon: "truck" },
        { label: "下游", items: "农机 · 农资 · 粮食", icon: "leaf" },
      ]} delays={[fr(2.57), fr(5.87), fr(8.21)]} squeezed="大水漫灌等低效灌溉方式" sqDelay={fr(10.73)} />
  </AbsoluteFill>
);

const S17: React.FC<{ f: number }> = ({ f }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Head text={<>对个人的影响 · 三个<span style={{ color: ACC }}>反面</span></>} top={140} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        {["水利施工、节水灌溉安装、土壤检测岗位季节性增加", "粮食产量更稳"].map((it, i) => (
          <div key={it} style={{ ...pop(f, fps, fr(4.49) + i * 8), display: "flex", alignItems: "center", gap: 16, width: 1000, borderRadius: 16, background: "rgba(255,255,255,0.62)", border: "1.5px solid " + LINE, padding: "16px 24px" }}>
            <div style={{ width: 30, height: 30, borderRadius: 15, background: ACC, color: "#fff", textAlign: "center", lineHeight: "30px", fontSize: 20 }}>✓</div>
            <div style={{ fontFamily: SANS, fontSize: 28, color: INK }}>{it}</div>
          </div>
        ))}
        {["社融少增是同比，不是负增长", "APEC 是宣言，不是协议", "农田批示是要求，不是预算"].map((it, i) => (
          <div key={it} style={{ ...pop(f, fps, fr(8.39) + i * 6), display: "flex", alignItems: "center", gap: 16, width: 1000, borderRadius: 16, background: "rgba(255,255,255,0.5)", border: "1.5px dashed " + ACC, padding: "14px 24px" }}>
            <div style={{ width: 30, height: 30, borderRadius: 15, border: "2px solid " + ACC, color: ACC, textAlign: "center", lineHeight: "28px", fontSize: 20 }}>!</div>
            <div style={{ fontFamily: SANS, fontSize: 26, color: MUT }}>{it}</div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 880, textAlign: "center", ...pop(f, fps, fr(16.79)) }}>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.75)", border: "2px solid " + ACC, borderRadius: 999, padding: "14px 34px", fontFamily: SERIF, fontWeight: 700, fontSize: 36, color: INK }}>持续追踪 · 整理成合集</div>
      </div>
    </AbsoluteFill>
  );
};

const SEG = [0, 6.37, 18.38, 30.02, 40.39, 53.3, 65.3, 77.3, 92.4, 100.77, 114.41, 124.41, 139.86, 150.06, 159.15, 175.15, 188.61, 207.33];
const START = SEG.map((x) => fr(x));

export const Main4: React.FC = () => {
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
      case 6: return <S7 f={f} />;
      case 7: return <S8 f={f} />;
      case 8: return <S9 f={f} />;
      case 9: return <S10 f={f} />;
      case 10: return <S11 f={f} />;
      case 11: return <S12 f={f} />;
      case 12: return <S13 f={f} />;
      case 13: return <S14 f={f} />;
      case 14: return <S15 f={f} />;
      case 15: return <S16 f={f} />;
      default: return <S17 f={f} />;
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
