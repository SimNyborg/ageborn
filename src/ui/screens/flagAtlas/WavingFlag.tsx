/**
 * The big flag of the Flag Atlas (PLAN 2d "the big view gets a cloth wave; still under reduce motion"):
 * the vendored design (`src`, the flag's SVG from the cosmetic art function) on a pole, drawn on a canvas
 * in vertical strips that ripple from the hoist to the fly. The cloth follows the art sheet (AUDIT §3.1):
 * hard-edged fold bands that travel with the ripple (a shadow band where the cloth turns away, a light
 * band where it faces the light), a sheen from the top left, a darker hoist hem, and an outline in the
 * flag's own dark (black at 62% over its colours: fill × 0.38, never ink black), plus a cast shadow.
 *
 * `unfurl` is a counter: when it changes the cloth unfurls from the pole (a short furl, a whip out with
 * overshoot and a squash, then the ripple settles), the moment a flag is bought. Reduce motion (`still`)
 * draws one still pose and the unfurl becomes a fade. The loop runs only while the canvas is on screen.
 */
import { useEffect, useRef } from 'preact/hooks';

/** Fold bands: where the slope of the ripple passes these, a shadow or light band is drawn (cel cut). */
const SHADE_AT = 0.42;
const LIGHT_AT = -0.58;
/** Ripple: waves along the cloth, speed (radians per second) and amplitude (share of the cloth height). */
const WAVES = 1.15;
const SPEED = 3.1;
const AMP = 0.055;
const UNFURL_MS = 760;

/** easeOutBack-like overshoot for the unfurl's width (0..1 → 0..1, peaking at about 1.06). */
function whip(k: number): number {
  const c = 1.9;
  const x = k - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
}

interface Layout {
  w: number;
  h: number;
  dpr: number;
  poleX: number;
  poleW: number;
  knob: number;
  x0: number;
  y0: number;
  fw: number;
  fh: number;
  amp: number;
}

function layout(w: number, h: number, dpr: number): Layout {
  const poleW = Math.max(4, Math.round(5 * dpr));
  const knob = Math.round(6 * dpr);
  const poleX = Math.round(10 * dpr);
  const x0 = poleX + poleW;
  // the cloth keeps the 4:3 of the designs and fits the box with room for the ripple and the knob
  const maxW = w - x0 - Math.round(14 * dpr);
  const maxH = (h - knob * 2 - Math.round(16 * dpr)) / (1 + AMP * 2 * 1.6);
  const fw = Math.max(10, Math.min(maxW, (maxH * 4) / 3));
  const fh = (fw * 3) / 4;
  const amp = fh * AMP;
  return { w, h, dpr, poleX, poleW, knob, x0, y0: knob * 2 + amp * 1.6 + Math.round(2 * dpr), fw, fh, amp };
}

/** Draws the flag once into an offscreen canvas at the cloth's size, with its sheen and hoist hem. */
function rasterise(img: HTMLImageElement | null, fw: number, fh: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(fw));
  c.height = Math.max(1, Math.round(fh));
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  if (img) ctx.drawImage(img, 0, 0, c.width, c.height);
  else {
    ctx.fillStyle = '#e8dfc8';
    ctx.fillRect(0, 0, c.width, c.height);
  }
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(255,255,255,0.13)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(c.width * 0.42, 0);
  ctx.lineTo(0, c.height * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 0, Math.max(2, c.width * 0.025), c.height);
  ctx.fillStyle = 'rgba(0,0,0,0.07)';
  ctx.fillRect(0, c.height * 0.93, c.width, c.height * 0.07);
  return c;
}

export function WavingFlag(p: { src: string | null; still: boolean; unfurl: number; label: string; testid?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const state = useRef({
    img: null as HTMLImageElement | null,
    loaded: '' as string,
    off: null as HTMLCanvasElement | null,
    layer: null as HTMLCanvasElement | null,
    lay: null as Layout | null,
    unfurlAt: -1,
    seenUnfurl: p.unfurl,
    visible: true,
    raf: 0,
    t0: 0,
    /** Draws one frame soon (a still pose after its picture loads or the box changes). */
    redraw: () => {},
  });

  // the picture
  useEffect(() => {
    const st = state.current;
    if (!p.src || typeof Image === 'undefined') {
      st.img = null;
      st.loaded = '';
      st.off = null;
      return undefined;
    }
    let live = true;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!live) return;
      st.img = img;
      st.loaded = p.src ?? '';
      st.off = null;
      st.redraw();
    };
    img.src = p.src;
    return () => {
      live = false;
    };
  }, [p.src]);

  // the unfurl, replayed when the counter changes
  useEffect(() => {
    const st = state.current;
    if (p.unfurl === st.seenUnfurl) return;
    st.seenUnfurl = p.unfurl;
    st.unfurlAt = performance.now();
    const el = canvasRef.current;
    if (p.still && el && typeof el.animate === 'function') el.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
  }, [p.unfurl, p.still]);

  // the loop
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof requestAnimationFrame !== 'function' || typeof el.getContext !== 'function') return undefined;
    const ctx = el.getContext('2d');
    if (!ctx) return undefined;
    const st = state.current;
    st.t0 = performance.now();
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver((entries) => {
        st.visible = entries.some((e) => e.isIntersecting);
        if (st.visible) st.redraw();
      });
      io.observe(el);
    }
    let last = -1e9;
    const frame = (now: number) => {
      st.raf = 0;
      // the cloth moves at 30 frames a second (half the work; an unfurl runs at the full rate)
      const unfurling = st.unfurlAt >= 0 && now - st.unfurlAt < UNFURL_MS;
      if (p.still || unfurling || now - last >= 30) {
        last = now;
        draw(now);
      }
      // moving: keep going (a frame off screen costs nothing, draw returns at once); still: one pose,
      // and another only while an unfurl fades in
      if (!p.still) st.raf = requestAnimationFrame(frame);
    };
    st.redraw = () => {
      if (!st.raf) st.raf = requestAnimationFrame(frame);
    };
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(() => st.redraw());
      ro.observe(el);
    }
    const draw = (now: number) => {
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const cw = Math.round(el.clientWidth * dpr);
      const ch = Math.round(el.clientHeight * dpr);
      if (cw <= 0 || ch <= 0) return;
      if (el.width !== cw || el.height !== ch) {
        el.width = cw;
        el.height = ch;
        st.off = null;
        st.layer = null;
      }
      if (!st.visible && !p.still && st.lay) return;
      const L = (st.lay = layout(cw, ch, dpr));
      if (!st.off) st.off = rasterise(st.img, L.fw, L.fh);
      if (!st.layer) {
        st.layer = document.createElement('canvas');
        st.layer.width = cw;
        st.layer.height = ch;
      }
      // unfurl progress: 0 furled at the pole → 1 open (with overshoot); the ripple is livelier meanwhile
      const since = st.unfurlAt < 0 || p.still ? Infinity : now - st.unfurlAt;
      const k = Math.min(1, since / UNFURL_MS);
      const open = since === Infinity ? 1 : k < 0.12 ? 0.08 - k * 0.3 : Math.max(0.05, whip((k - 0.12) / 0.88));
      const boost = since === Infinity ? 1 : 1 + 1.6 * (1 - k);
      const squash = since === Infinity ? 1 : 1 - 0.07 * Math.sin(Math.min(1, k * 1.6) * Math.PI);
      const t = p.still ? 0.9 : (now - st.t0) / 1000;
      const lc = st.layer.getContext('2d');
      if (!lc) return;
      lc.clearRect(0, 0, cw, ch);
      const step = Math.max(1, Math.round(2 * dpr));
      const fw = L.fw;
      const fh = L.fh * squash;
      const y0 = L.y0 + (L.fh - fh) / 2;
      const src = st.off;
      const top: number[] = [];
      for (let x = 0; x <= fw; x += step) {
        const u = x / fw;
        const ph = t * SPEED - u * WAVES * Math.PI * 2;
        const a = L.amp * Math.pow(u, 0.85) * boost;
        const dy = Math.sin(ph) * a;
        const dx = L.x0 + x * open;
        const w = Math.min(step, fw - x) * open + 0.75;
        top.push(dx, y0 + dy);
        if (x < fw) {
          lc.drawImage(src, (x / fw) * src.width, 0, Math.max(1, (step / fw) * src.width), src.height, dx, y0 + dy, w, fh);
          const slope = Math.cos(ph) * Math.pow(u, 0.6) * Math.min(1.4, boost);
          if (slope > SHADE_AT || slope < LIGHT_AT) {
            lc.globalCompositeOperation = 'source-atop';
            lc.fillStyle = slope > SHADE_AT ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)';
            lc.fillRect(dx, y0 + dy, w, fh);
            lc.globalCompositeOperation = 'source-over';
          }
        }
      }
      // the outline, inside the cloth's edge, in the flag's own dark
      lc.globalCompositeOperation = 'source-atop';
      lc.beginPath();
      lc.moveTo(top[0]!, top[1]!);
      for (let i = 2; i < top.length; i += 2) lc.lineTo(top[i]!, top[i + 1]!);
      for (let i = top.length - 2; i >= 0; i -= 2) lc.lineTo(top[i]!, top[i + 1]! + fh);
      lc.closePath();
      lc.strokeStyle = 'rgba(0,0,0,0.62)';
      lc.lineWidth = Math.max(2, 2.6 * dpr);
      lc.lineJoin = 'round';
      lc.stroke();
      lc.globalCompositeOperation = 'source-over';

      ctx.clearRect(0, 0, cw, ch);
      // the pole: wood with a highlight, a gold knob on top
      const px = L.poleX;
      ctx.fillStyle = '#6b4a2b';
      ctx.fillRect(px, L.knob, L.poleW, ch - L.knob);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(px + L.poleW * 0.2, L.knob * 1.6, Math.max(1, L.poleW * 0.25), ch - L.knob * 2);
      ctx.strokeStyle = '#2b1d10';
      ctx.lineWidth = Math.max(1, dpr);
      ctx.strokeRect(px, L.knob, L.poleW, ch - L.knob);
      ctx.beginPath();
      ctx.arc(px + L.poleW / 2, L.knob, L.knob * 0.95, 0, Math.PI * 2);
      ctx.fillStyle = '#f2b52c';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px + L.poleW / 2 - L.knob * 0.3, L.knob * 0.7, L.knob * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = '#fff3d6';
      ctx.fill();
      // the cloth with its cast shadow
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.32)';
      ctx.shadowOffsetX = 3 * dpr;
      ctx.shadowOffsetY = 5 * dpr;
      ctx.drawImage(st.layer, 0, 0);
      ctx.restore();
    };
    st.raf = requestAnimationFrame(frame);
    return () => {
      if (st.raf) cancelAnimationFrame(st.raf);
      st.raf = 0;
      st.redraw = () => {};
      io?.disconnect();
      ro?.disconnect();
    };
  }, [p.still]);

  return <canvas ref={canvasRef} class="fa-wave" role="img" aria-label={p.label} data-testid={p.testid} data-src={p.src ?? ''} />;
}
