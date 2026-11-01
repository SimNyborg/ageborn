/**
 * Clip drivers for the gallery: they play the A11 clip contract on real views, exactly as the
 * battle view would (spawn, idle, walk, attack with a sim impact time, hit flash, stun pose, die,
 * victory, ability; turret build/idle/aim/fire/outdated/modernise/sell).
 */
import type { Container, Text } from 'pixi.js';
import type { ClipName, EffectView, TurretView, UnitPose, UnitView, VisualDef } from '@/contracts/art';
import type { RoleGroup, Side } from '@/contracts/ids';
import { EMIT_EFFECT } from '@/render/damageFeel';

export const UNIT_CLIPS: readonly ClipName[] = ['spawn', 'idle', 'walk', 'attack', 'hit', 'stun', 'die', 'victory', 'ability'];

/** How long each clip is shown in cycle mode (ms). */
function showMs(clip: string, def: VisualDef): number {
  const d = def.clips[clip]?.durationMs ?? 600;
  switch (clip) {
    case 'spawn':
      return 700;
    case 'idle':
      return 1400;
    case 'walk':
      return 1400;
    case 'stun':
      return 1300;
    case 'die':
      return Math.max(d, 800) + 500;
    case 'victory':
      return 1500;
    case 'hit':
      return 500;
    default:
      return d + 450;
  }
}

export interface UnitCellOptions {
  make: () => UnitView;
  def: VisualDef;
  parent: Container;
  x: number;
  y: number;
  side: Side;
  group: RoleGroup;
  trim: UnitPose['levelTrim'];
  /** 'cycle' or one clip name. */
  mode: string;
  label?: Text;
  /**
   * The white Legendary aura (A12), for Legendary units and Legendary skins. In a match the battle view
   * adds it (`fx.legendary_aura`, sized like render/battleView.ts); the gallery does the same.
   */
  aura?: (radius: number) => EffectView;
  /**
   * Queue item 40: the HP the unit is drawn with (bp of max; default full): the gallery's damage control shows each
   * stage (75/50/25%) on every unit and skin.
   */
  hpBp?: number;
  /**
   * Queue item 40: plays a damaged unit's emitters (smoke, fire, sparks, steam, breath, motes) as the battle view does
   * (`render/damageFeel.ts`, at their rates on the cell's clock); without it the gallery shows marks, tint and motion only.
   */
  fx?: (effectId: string, opts: Record<string, number>) => EffectView;
}

/** The HP the gallery's damage control draws a unit with, by damage stage (queue item 40: 0 unhurt .. 3 wrecked). */
export const DAMAGE_STAGE_HP: readonly number[] = [10000, 7000, 4600, 2000];

/** One unit view driven through its clips. */
export class UnitCell {
  private view: UnitView;
  private clipIndex = -1;
  private clip = '';
  private t = 0;
  private stunned = false;
  private walkX = 0;
  private aura: EffectView | null = null;
  private auraPlaying = false;
  private readonly auraRadius: number;
  /** The damage emitters' spawn debt (per emitter) and the particles they have in flight. */
  private readonly dmgAcc: number[] = [];
  private readonly dmgFx: EffectView[] = [];

  constructor(private readonly o: UnitCellOptions) {
    this.view = this.spawnView();
    this.auraRadius = Math.max(24, Math.round(Math.abs(this.view.anchors.head.y - this.view.anchors.feet.y) * 0.55));
    if (o.aura) {
      this.aura = o.aura(this.auraRadius);
      o.parent.addChildAt(this.aura.root, Math.max(0, o.parent.getChildIndex(this.view.root)));
    }
    this.next();
  }

  private spawnView(): UnitView {
    const v = this.o.make();
    this.o.parent.addChild(v.root);
    return v;
  }

  private pose(): UnitPose {
    return {
      x: this.o.x + this.walkX,
      y: this.o.y,
      facing: this.o.side === 0 ? 1 : -1,
      hpBp: this.o.hpBp ?? 10000,
      shieldBp: 0,
      stunned: this.stunned,
      frozen: false,
      alpha: 1,
      levelTrim: this.o.trim,
      roleGlyph: this.o.group,
    };
  }

  private start(clip: string): void {
    this.clip = clip;
    this.t = 0;
    this.stunned = clip === 'stun';
    this.walkX = 0;
    if (this.o.label) this.o.label.text = clip;
    switch (clip) {
      case 'attack': {
        const d = this.o.def.clips['attack']?.durationMs ?? 600;
        const impact = this.o.def.events.attack.impactAt;
        // The sim hands the view a windup; here the clip's own impact time is used (B5).
        this.view.play('attack', { impactAtMs: Math.round(d * impact) });
        break;
      }
      case 'hit':
        this.view.play('hit');
        this.view.flash(80);
        break;
      case 'stun':
        break;
      default:
        this.view.play(clip);
    }
  }

  private next(): void {
    if (this.o.mode === 'cycle') {
      this.clipIndex = (this.clipIndex + 1) % UNIT_CLIPS.length;
      const clip = UNIT_CLIPS[this.clipIndex] ?? 'idle';
      if (this.clip === 'die' || clip === 'spawn') this.respawn();
      this.start(clip);
      return;
    }
    if (this.clip === 'die' || (this.o.mode === 'spawn' && this.clip === 'spawn')) this.respawn();
    this.start(this.o.mode);
  }

  private respawn(): void {
    this.view.destroy();
    this.view = this.spawnView();
  }

  update(dtMs: number): void {
    this.t += dtMs;
    if (this.clip === 'walk') this.walkX = ((this.t / 1000) * 40) % 60 - 30;
    this.view.setPose(this.pose());
    this.view.update(dtMs);
    this.updateAura(dtMs);
    this.updateDamageFx(dtMs);
    const loops = this.clip === 'idle' || this.clip === 'walk' || this.clip === 'victory' || this.clip === 'stun';
    if (this.o.mode !== 'cycle' && loops) return;
    if (this.t >= showMs(this.clip, this.o.def)) {
      if (this.clip === 'stun') {
        this.stunned = false;
        this.view.setPose(this.pose());
      }
      if (this.o.mode !== 'cycle' || this.clip !== 'ability') this.view.play('idle');
      this.next();
    }
  }

  /** A damaged unit's emitters, spawned in the cell's world at their rates (the battle view's rule, without its caps). */
  private updateDamageFx(dtMs: number): void {
    const make = this.o.fx;
    if (!make) return;
    for (let i = this.dmgFx.length - 1; i >= 0; i--) {
      const e = this.dmgFx[i] as EffectView;
      e.update(dtMs);
      if (e.done) {
        e.destroy();
        this.dmgFx.splice(i, 1);
      }
    }
    const v = this.view as UnitView & { damageStage?: number; damageFx?: () => readonly { kind: string; x: number; y: number; rate: number; size: number }[] };
    if ((v.damageStage ?? 0) < 2 || this.clip === 'die' || typeof v.damageFx !== 'function') return;
    const list = v.damageFx();
    for (let i = 0; i < list.length; i++) {
      const em = list[i];
      const id = em ? EMIT_EFFECT[em.kind] : undefined;
      if (!em || !id) continue;
      this.dmgAcc[i] = (this.dmgAcc[i] ?? 0) + (Math.max(0, em.rate) * dtMs) / 1000;
      while ((this.dmgAcc[i] as number) >= 1) {
        this.dmgAcc[i] = (this.dmgAcc[i] as number) - 1;
        const opts = { dir: this.o.side === 0 ? 1 : -1, scale: Math.max(0.4, em.size / 10) };
        const fx = make(id, opts);
        this.o.parent.addChild(fx.root);
        fx.playAt({ x: v.root.x + em.x, y: v.root.y + em.y }, opts);
        this.dmgFx.push(fx);
      }
    }
  }

  private updateAura(dtMs: number): void {
    const a = this.aura;
    if (!a) return;
    a.root.visible = this.clip !== 'die';
    const facing = this.o.side === 0 ? 1 : -1;
    const at = { x: this.o.x + this.walkX + this.view.anchors.hitCenter.x * facing, y: this.o.y + this.view.anchors.hitCenter.y };
    if (!this.auraPlaying || a.done) {
      a.playAt(at, { radius: this.auraRadius, side: this.o.side });
      this.auraPlaying = true;
    }
    a.root.position.set(at.x, at.y);
    a.update(dtMs);
  }

  destroy(): void {
    this.aura?.destroy();
    for (const e of this.dmgFx.splice(0)) e.destroy();
    this.view.destroy();
  }
}

export const TURRET_STEPS = ['build', 'idle', 'fire', 'fire', 'fire', 'outdated', 'modernise', 'build', 'sell'] as const;

/** One turret view driven through build, aim, fire, outdated, modernise and sell. */
export class TurretCell {
  private view: TurretView;
  private step = -1;
  private t = 0;
  private aimT = 0;

  constructor(
    private readonly make: () => TurretView,
    private readonly parent: Container,
    private readonly x: number,
    private readonly y: number,
    private readonly side: Side,
    private readonly mode: string,
    private readonly label?: Text,
  ) {
    this.view = this.spawn();
    this.next();
  }

  private spawn(): TurretView {
    const v = this.make();
    v.root.position.set(this.x, this.y);
    this.parent.addChild(v.root);
    return v;
  }

  private next(): void {
    if (this.mode !== 'cycle') {
      if (this.mode === 'sell' || this.mode === 'modernise') {
        this.view.destroy();
        this.view = this.spawn();
      }
      this.t = 0;
      if (this.mode === 'outdated') this.view.setOutdated(true);
      else this.view.play(this.mode as 'build' | 'idle' | 'fire' | 'sell' | 'modernise');
      if (this.label) this.label.text = this.mode;
      return;
    }
    this.step = (this.step + 1) % TURRET_STEPS.length;
    const s = TURRET_STEPS[this.step] ?? 'idle';
    if (s === 'build' && this.step === 0) {
      this.view.destroy();
      this.view = this.spawn();
    }
    this.t = 0;
    if (this.label) this.label.text = s;
    if (s === 'outdated') this.view.setOutdated(true);
    else {
      if (s === 'modernise' || s === 'build') this.view.setOutdated(false);
      this.view.play(s);
    }
  }

  update(dtMs: number): void {
    this.t += dtMs;
    this.aimT += dtMs;
    // A target walking back and forth in front of the turret.
    const dir = this.side === 0 ? 1 : -1;
    this.view.aimAt(this.x + dir * (140 + 110 * Math.sin(this.aimT / 900)));
    this.view.update(dtMs);
    const hold = this.mode === 'cycle' ? (TURRET_STEPS[this.step] === 'idle' || TURRET_STEPS[this.step] === 'outdated' ? 1400 : 650) : 900;
    if (this.t >= hold) {
      if (this.mode === 'cycle' && TURRET_STEPS[this.step] === 'modernise') {
        this.view.destroy();
        this.view = this.spawn();
      }
      this.next();
    }
  }

  destroy(): void {
    this.view.destroy();
  }
}
