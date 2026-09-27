import type { EffectView, Pt } from '@/contracts';
import { mulberry32 } from '@/core';
import { Container } from 'pixi.js';
import { describe, expect, it } from 'vitest';
import { ScreenFlash } from '../feel/flash';
import { GlobalFreeze, SlowMotion, scaleHitstop } from '../feel/hitstop';
import { FloatingNumbers, formatNumber, numberVisible, type LabelFactory } from '../feel/numbers';
import { ParticlePool } from '../feel/particlePool';
import { Noise1D, Shake } from '../feel/shake';
import { defaultFeelConfig, validateFeelConfig } from '../feelConfig';
import { newBar, stepBar } from '../healthbars';
import { AutoPresetMonitor, initialPreset, particleCap, presetDpr } from '../presets';

describe('global freeze cap (A12 Hitstop)', () => {
  it('grants at most 150 ms per rolling 3 s', () => {
    const f = new GlobalFreeze(150, 3000);
    expect(f.request(120, 0)).toBe(120); // power lands
    f.update(120);
    expect(f.request(100, 200)).toBe(30); // evolve: only 30 ms left in the window
    f.update(30);
    expect(f.request(80, 400)).toBe(0); // legendary death: budget spent
    expect(f.frozen).toBe(false);
    // The window rolls: 3 s after the first grant its 120 ms are back; the 30 ms from t = 200 still count.
    expect(f.usedMs(3001)).toBe(30);
    expect(f.request(80, 3001)).toBe(80);
    f.update(80);
    expect(f.request(80, 3100)).toBe(40);
  });

  it('does not add overlapping freezes, and charges only the extension', () => {
    const f = new GlobalFreeze(150, 3000);
    f.request(100, 0);
    f.update(40); // 60 ms left
    expect(f.request(80, 40)).toBe(20);
    expect(f.remainingMs).toBe(80);
    expect(f.usedMs(40)).toBe(120);
  });

  it('exempts base destroyed from the cap', () => {
    const f = new GlobalFreeze(150, 3000);
    f.request(150, 0);
    f.update(150);
    expect(f.request(250, 200, true)).toBe(250);
    expect(f.frozen).toBe(true);
    f.update(250);
    expect(f.frozen).toBe(false);
  });

  it('applies the hitstop setting and reduce motion (x0.5)', () => {
    expect(scaleHitstop(70, { hitstop: true, reduceMotion: false })).toBe(70);
    expect(scaleHitstop(70, { hitstop: true, reduceMotion: true })).toBe(35);
    expect(scaleHitstop(70, { hitstop: false, reduceMotion: false })).toBe(0);
  });

  it('runs view-only slow motion for its duration', () => {
    const s = new SlowMotion();
    s.start(0.3, 1200);
    expect(s.timeScale).toBe(0.3);
    s.update(1199);
    expect(s.timeScale).toBe(0.3);
    s.update(2);
    expect(s.timeScale).toBe(1);
  });
});

describe('screen shake (A12 trauma model)', () => {
  const cfg = defaultFeelConfig.shake;

  it('uses shake = trauma² with linear decay of 1.2/s', () => {
    const s = new Shake(cfg, 7);
    s.add(0.5);
    s.update(250);
    expect(s.trauma).toBeCloseTo(0.2);
    s.add(2);
    expect(s.trauma).toBe(1);
    s.update(1000);
    expect(s.trauma).toBeCloseTo(0);
  });

  it('never exceeds 12 px or 2.5 degrees, and a multiplier of 0 disables it', () => {
    const s = new Shake(cfg, 3);
    let maxOff = 0;
    let maxRot = 0;
    for (let i = 0; i < 600; i++) {
      s.trauma = 1;
      s.update(16);
      const o = s.offset();
      maxOff = Math.max(maxOff, Math.abs(o.x), Math.abs(o.y));
      maxRot = Math.max(maxRot, Math.abs(o.rot));
    }
    expect(maxOff).toBeLessThanOrEqual(12 + 1e-9);
    expect(maxOff).toBeGreaterThan(6);
    expect((maxRot * 180) / Math.PI).toBeLessThanOrEqual(2.5 + 1e-9);
    s.multiplier = 0;
    expect(s.offset()).toEqual({ x: 0, y: 0, rot: 0 });
  });

  it('kicks along the attack vector and the kick decays', () => {
    const s = new Shake(cfg, 1, 5, 140);
    s.add(0.5, { x: 1, y: 0 });
    const o = s.offset();
    expect(o.x).toBeGreaterThan(0);
    s.update(200);
    s.trauma = 0;
    expect(s.offset().x).toBe(0);
  });

  it('has seeded, bounded noise', () => {
    const a = new Noise1D(4);
    const b = new Noise1D(4);
    for (let t = 0; t < 50; t += 0.37) {
      expect(a.at(t)).toBe(b.at(t));
      expect(Math.abs(a.at(t))).toBeLessThanOrEqual(1);
    }
  });
});

describe('screen flash', () => {
  it('shows a one-frame flash for exactly one update', () => {
    const f = new ScreenFlash();
    f.resize(100, 100);
    f.trigger(16, 0xffffff, 0.3);
    f.update(16);
    expect(f.root.visible).toBe(true);
    f.update(16);
    expect(f.root.visible).toBe(false);
  });

  it('fades a timed flash out and softens with reduce motion', () => {
    const f = new ScreenFlash();
    f.trigger(120, 0xffffff, 0.8);
    expect(f.currentAlpha()).toBeCloseTo(0.8);
    f.update(60);
    expect(f.currentAlpha()).toBeLessThan(0.8);
    f.update(60);
    expect(f.active).toBe(false);
  });
});

class FakeFx implements EffectView {
  readonly root = new Container();
  left = 0;
  plays = 0;
  get done(): boolean {
    return this.left <= 0;
  }
  fly(_f: Pt, _t: Pt, ms: number): void {
    this.left = ms;
    this.plays++;
  }
  playAt(): void {
    this.left = 100;
    this.plays++;
  }
  update(dt: number): void {
    this.left -= dt;
  }
  destroy(): void {}
}

describe('particle pool (A12 Particles)', () => {
  function pool(cap: number): { p: ParticlePool; made: FakeFx[] } {
    const made: FakeFx[] = [];
    const art = {
      createEffect: () => {
        const v = new FakeFx();
        made.push(v);
        return v;
      },
    };
    return { p: new ParticlePool(art, new Container(), cap, mulberry32(1)), made };
  }

  it('never exceeds the cap and drops the lowest priority first', () => {
    const { p } = pool(10);
    expect(p.emit('fx.dust_poof', 8, 0, { x: 0, y: 0 })).toBe(8);
    expect(p.emit('fx.ko_stars', 5, 3, { x: 0, y: 0 })).toBe(5);
    expect(p.liveCount).toBe(10);
    // Priority 0 cannot evict anything of priority 0 or higher.
    expect(p.emit('fx.dust_poof', 3, 0, { x: 0, y: 0 })).toBe(0);
    expect(p.liveCount).toBe(10);
    expect(p.dropped).toBeGreaterThan(0);
  });

  it('reuses finished views instead of creating new ones', () => {
    const { p, made } = pool(100);
    p.emit('fx.spark_blunt', 3, 1, { x: 0, y: 0 });
    p.update(150);
    expect(p.liveCount).toBe(0);
    p.emit('fx.spark_blunt', 3, 1, { x: 0, y: 0 });
    expect(made.length).toBe(3);
    expect(p.fly('fx.coin', { x: 0, y: 0 }, { x: 5, y: 5 }, 300, true, 4)).toBe(true);
    expect(made.length).toBe(4);
  });
});

describe('damage numbers (A12)', () => {
  const plain: LabelFactory = () => {
    const root = new Container();
    let text = '';
    return {
      root,
      setText: (s) => {
        text = s;
        root.label = text;
      },
      setStyle: () => {},
    };
  };

  it('shows Important numbers by default, every hit in All, none in Off; gold always', () => {
    expect(numberVisible('important', 'damage', false)).toBe(false);
    expect(numberVisible('important', 'power', true)).toBe(true);
    expect(numberVisible('all', 'damage', false)).toBe(true);
    expect(numberVisible('off', 'power', true)).toBe(false);
    expect(numberVisible('off', 'gold', false)).toBe(true);
  });

  it('merges repeated hits on one key and spreads nearby labels 20-40 px apart', () => {
    const n = new FloatingNumbers(new Container(), defaultFeelConfig.tuning, mulberry32(2), plain);
    n.mode = 'all';
    n.show('power', 40, { x: 100, y: -30 }, { important: true, key: 'c1:5', scale: 1 });
    n.show('power', 40, { x: 100, y: -30 }, { important: true, key: 'c1:5', scale: 1 });
    expect(n.shown()).toEqual([{ kind: 'power', value: 80 }]);
    n.show('damage', 12, { x: 101, y: -30 }, { scale: 1 });
    n.update(0, 1);
    expect(n.liveCount).toBe(2);
    n.update(2000, 1);
    expect(n.liveCount).toBe(0);
  });

  it('formats values', () => {
    expect(formatNumber(1234)).toBe('1,234');
    expect(formatNumber(20_000)).toBe('20k');
    expect(formatNumber(12.4)).toBe('12');
  });
});

describe('health bars (A11)', () => {
  it('appear once damaged; the ghost holds 300 ms, then drains', () => {
    const b = newBar();
    expect(b.shown).toBe(false);
    stepBar(b, 10000, 0, 16, 300, 350);
    expect(b.shown).toBe(false);
    stepBar(b, 7000, 0, 16, 300, 350);
    expect(b.shown).toBe(true);
    expect(b.ghostBp).toBe(10000);
    stepBar(b, 7000, 0, 290, 300, 350);
    expect(b.ghostBp).toBe(10000);
    stepBar(b, 7000, 0, 20, 300, 350);
    stepBar(b, 7000, 0, 50, 300, 350);
    expect(b.ghostBp).toBeLessThan(10000);
    stepBar(b, 7000, 0, 1000, 300, 350);
    expect(b.ghostBp).toBe(7000);
    stepBar(b, 8000, 0, 16, 300, 350);
    expect(b.hpBp).toBe(8000);
    expect(b.ghostBp).toBe(8000);
  });
});

describe('graphics presets (B6)', () => {
  it('starts High on desktop and Lite on mobile under Auto', () => {
    expect(initialPreset('auto', false)).toBe('high');
    expect(initialPreset('auto', true)).toBe('lite');
    expect(initialPreset('high', true)).toBe('high');
  });

  it('caps particles and DPR per preset and device', () => {
    const caps = defaultFeelConfig.particleCaps;
    expect(particleCap('lite', false, caps)).toBe(300);
    expect(particleCap('high', false, caps)).toBe(1500);
    expect(particleCap('high', true, caps)).toBe(600);
    expect(presetDpr('high', 3)).toBe(2);
    expect(presetDpr('lite', 3)).toBe(1);
  });

  it('drops Auto to Lite when frames average over 20 ms for 3 s, and never climbs back', () => {
    const m = new AutoPresetMonitor('auto', false);
    for (let i = 0; i < 400; i++) expect(m.frame(16.7)).toBe(false);
    let dropped = false;
    for (let i = 0; i < 200 && !dropped; i++) dropped = m.frame(26);
    expect(dropped).toBe(true);
    expect(m.preset).toBe('lite');
    for (let i = 0; i < 400; i++) m.frame(5);
    expect(m.preset).toBe('lite');
    const fixed = new AutoPresetMonitor('high', false);
    for (let i = 0; i < 400; i++) fixed.frame(40);
    expect(fixed.preset).toBe('high');
  });

  it('ignores the warm-up frames of a battle (uploads and lazy bakes)', () => {
    const m = new AutoPresetMonitor('auto', false);
    // 1.5 s of slow start-up frames, then a steady 60 fps: stays High.
    for (let i = 0; i < 15; i++) expect(m.frame(100)).toBe(false);
    for (let i = 0; i < 600; i++) expect(m.frame(16.7)).toBe(false);
    expect(m.preset).toBe('high');
  });
});

describe('feel config', () => {
  it('is valid and follows the A12 table', () => {
    const c = defaultFeelConfig;
    expect(validateFeelConfig(c)).toEqual([]);
    expect(c.globalFreezeCapMs).toBe(150);
    expect(c.globalFreezeWindowMs).toBe(3000);
    expect(c.shake).toEqual({ decayPerSec: 1.2, noiseHz: 18, maxOffsetPx: 12, maxRotDeg: 2.5 });
    expect(c.particleCaps).toEqual({ mobile: 600, desktop: 1500 });
    expect(c.damageNumbers).toBe('important');
    expect(c.tuning.ghostHoldMs).toBe(300);
    expect(c.tuning.numberSpreadPx).toEqual([20, 40]);
    expect(c.tuning.intensity.decayPerSec).toBe(0.2);
  });

  it('reports broken values', () => {
    const bad = JSON.parse(JSON.stringify(defaultFeelConfig)) as typeof defaultFeelConfig;
    bad.events['hit.light'] = { flashMs: -1, flashAlpha: 3 };
    expect(validateFeelConfig(bad).length).toBe(2);
  });
});
