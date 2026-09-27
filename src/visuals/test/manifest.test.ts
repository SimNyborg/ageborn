/**
 * The visual manifest (DESIGN B5 swap contract, A14.1 ID appendix): every id the game references has
 * an entry, every entry is complete, and the clip contract (A11) holds for every visual.
 */
import { describe, expect, it } from 'vitest';
import type { ClipName } from '@/contracts/art';
import type { AttackDef } from '@/contracts/content';
import { content } from '@/content';
import { CLIP_LIBRARY, UNIT_CLIP_NAMES } from '../clips';
import { buildManifest, MANIFEST, OVERRIDES } from '../manifest';
import { puppetById } from '../library';

/** A14.1, spelled out here so the test checks the manifest against DESIGN rather than against itself. */
const A14 = {
  ages: ['stone', 'medieval', 'gunpowder', 'modern', 'future'],
  arenas: ['tar_pits', 'frostfang', 'kingsmoat', 'powder_bay', 'iron_front', 'neon_harbor', 'orbital_ring', 'chrono_rift'],
  projectiles: 'rock boulder bee log arrow bolt goose musket lob cannonball grapeshot rocket chainshot bomb bullet shell flak plasma plasma_mortar gravity_orb'.split(' ').map((s) => `proj.${s}`),
  effects: [
    ...'beam_laser beam_rail arc_chain tongue pitch_pour heal_beam'.split(' '),
    ...'spark_blunt spark_slash spark_pierce spark_bullet scorch_laser blast spark_effective puff_resisted muzzle trail splash_ring explosion_s explosion_m explosion_l dust_poof ko_stars coin xp_sparkle debris'.split(' '),
    ...'heal_glyph shield_bubble mark_reticle gravity_swirl smoke_cloud emp_ring time_ripple roar_ring call_marker dizzy legendary_aura'.split(' '),
    ...'telegraph_zone aurochs meteor arrow_rain decree_glow cannonball_rain plane_bomber parachute orbital_beam nanite_swarm'.split(' '),
    ...'evolve_pillar last_stand_wave overdrive_frame siege_vignette'.split(' '),
  ].map((s) => `fx.${s}`),
  roleGroups: ['infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'epic', 'legendary'],
  ui: ['icon.horn', 'trim.bronze', 'trim.silver', 'trim.gold', 'foil.bronze', 'foil.silver', 'foil.holo'],
};

describe('A14.1 coverage', () => {
  it('has every unit, turret, power and skin the content references', () => {
    const missing: string[] = [];
    for (const u of Object.values(content.units)) if (!MANIFEST[u.visualId]) missing.push(u.visualId);
    for (const t of Object.values(content.turrets)) if (!MANIFEST[t.visualId]) missing.push(t.visualId);
    for (const p of Object.values(content.powers)) if (!MANIFEST[p.visualId]) missing.push(p.visualId);
    for (const s of Object.values(content.skins)) if (!MANIFEST[s.visualId]) missing.push(s.visualId);
    expect(missing).toEqual([]);
    expect(Object.values(content.units).length).toBe(36);
    expect(Object.values(content.turrets).length).toBe(20);
    expect(Object.values(content.skins).length).toBe(12);
  });

  it('has every projectile and effect the content fires', () => {
    const ids = new Set<string>();
    const add = (a: AttackDef): void => {
      if (!a.projectile) return;
      ids.add('visualId' in a.projectile ? a.projectile.visualId : a.projectile.effectId);
    };
    for (const u of Object.values(content.units)) u.attacks.forEach(add);
    for (const t of Object.values(content.turrets)) add(t.attack);
    expect(ids.size).toBeGreaterThan(20);
    expect([...ids].filter((id) => !MANIFEST[id])).toEqual([]);
  });

  it('has the world, projectile, effect and UI ids of A14.1', () => {
    const want = [
      ...A14.ages.map((a) => `base.${a}`),
      ...A14.ages.map((a) => `backdrop.${a}`),
      ...A14.ages.map((a) => `icon.age.${a}`),
      ...A14.arenas.map((a) => `ground.${a}`),
      ...A14.projectiles,
      ...A14.effects,
      ...A14.roleGroups.map((g) => `icon.role.${g}`),
      ...A14.ui,
    ];
    expect(want.filter((id) => !MANIFEST[id])).toEqual([]);
  });

  it('every procedural entry points at an existing source', () => {
    for (const [id, def] of Object.entries(MANIFEST)) {
      if (def.kind !== 'procedural') continue;
      const known = puppetById(def.source) !== undefined || id.startsWith('fx.') || id.startsWith('backdrop.') || id.startsWith('ground.');
      expect(known, id).toBe(true);
    }
  });
});

describe('clip contract (A11)', () => {
  const unitEntries = Object.entries(MANIFEST).filter(([id]) => id.startsWith('unit.'));
  it.each(unitEntries)('%s implements every clip name with a resolvable keyframe clip', (_id, def) => {
    for (const name of UNIT_CLIP_NAMES as readonly ClipName[]) {
      const ref = def.clips[name];
      expect(ref, name).toBeDefined();
      if (!ref) continue;
      expect(ref.kind).toBe('keyframes');
      const clip = CLIP_LIBRARY.get(ref.ref);
      expect(clip, ref.ref).toBeDefined();
      expect(ref.durationMs).toBe(clip?.durationMs);
    }
    const attack = CLIP_LIBRARY.get(def.clips['attack']?.ref ?? '');
    expect(def.events.attack.impactAt).toBeGreaterThan(0);
    expect(def.events.attack.impactAt).toBeLessThan(1);
    expect(attack?.impactAt).toBe(def.events.attack.impactAt);
    expect(def.team.kind).toBe('zones');
    if (def.team.kind === 'zones') expect(def.team.zones).toContain('team');
    expect(def.heightLu).toBeGreaterThan(20);
    expect(def.anchors.head.y).toBeLessThan(def.anchors.hitCenter.y);
  });

  it.each(Object.entries(MANIFEST).filter(([id]) => id.startsWith('turret.')))('%s implements the turret clips', (_id, def) => {
    for (const name of ['build', 'idle', 'fire', 'sell', 'modernise']) expect(CLIP_LIBRARY.get(def.clips[name]?.ref ?? ''), name).toBeDefined();
  });

  it('skins keep the base visual clips, anchors and height (clarity parity, A5.8)', () => {
    for (const [id, def] of Object.entries(MANIFEST)) {
      if (!id.includes('@')) continue;
      const base = MANIFEST[id.slice(0, id.indexOf('@'))];
      expect(base, id).toBeDefined();
      if (!base) continue;
      expect(def.anchors, id).toEqual(base.anchors);
      expect(def.heightLu, id).toBe(base.heightLu);
      expect(def.clips, id).toEqual(base.clips);
      expect(def.team, id).toEqual(base.team);
    }
  });

  it('a skin may set translucency down to 70% (ghost corsair)', () => {
    expect(MANIFEST['unit.corsair@ghost_corsair']?.filters?.alpha).toBe(0.7);
  });
});

describe('swap point', () => {
  it('OVERRIDES replace generated entries without touching anything else', () => {
    expect(OVERRIDES).toEqual({});
    const generated = buildManifest();
    expect(Object.keys(generated).sort()).toEqual(Object.keys(MANIFEST).sort());
  });
});
