/**
 * The visual manifest (DESIGN B5 swap contract, A14.1 ID appendix): every id the game references has
 * an entry, every entry is complete, and the clip contract (A11) holds for every visual.
 */
import { describe, expect, it } from 'vitest';
import type { ClipName } from '@/contracts/art';
import type { AttackDef } from '@/contracts/content';
import { content } from '@/content';
import { CLIP_LIBRARY, UNIT_CLIP_NAMES } from '../clips';
import { buildManifest, MANIFEST, OVERRIDES, PROCEDURAL_MANIFEST } from '../manifest';
import { puppetById } from '../library';
import { PAUSED_WAVE_IDS, PAUSED_WAVE_VISUALS } from '../../../tests/fixtures/pausedWave';

/**
 * A14.1 with the A17.12 ids, spelled out here so the test checks the manifest against DESIGN rather than
 * against itself.
 */
const A14 = {
  ages: ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'],
  arenas: ['tar_pits', 'frostfang', 'kingsmoat', 'powder_bay', 'iron_front', 'neon_harbor', 'orbital_ring', 'chrono_rift'],
  projectiles: [
    ...'rock boulder bee log arrow bolt goose musket lob cannonball grapeshot rocket chainshot bomb bullet shell flak plasma plasma_mortar gravity_orb'.split(' '),
    ...'javelin scorpion_bolt harpoon flare ion starburst star_shard'.split(' '),
  ].map((s) => `proj.${s}`),
  effects: [
    ...'beam_laser beam_rail arc_chain tongue pitch_pour heal_beam'.split(' '),
    ...'spark_blunt spark_slash spark_pierce spark_bullet scorch_laser blast spark_effective puff_resisted muzzle trail splash_ring explosion_s explosion_m explosion_l dust_poof ko_stars coin xp_sparkle debris'.split(' '),
    ...'heal_glyph shield_bubble mark_reticle gravity_swirl smoke_cloud emp_ring time_ripple roar_ring call_marker dizzy legendary_aura'.split(' '),
    ...'telegraph_zone aurochs meteor arrow_rain decree_glow cannonball_rain plane_bomber parachute orbital_beam nanite_swarm'.split(' '),
    ...'evolve_pillar last_stand_wave overdrive_frame siege_vignette'.split(' '),
    // A17.12: instant attacks, ability effects and power effects
    ...'sun_beam gorgon_gaze tesla_arc beam_void beam_ion beam_tachyon'.split(' '),
    ...'stomp_ring fuse_spark beacon_ring blink'.split(' '),
    ...'tidal_wave aegis_glow iron_horse zeppelin star_shard_rain warp_portal'.split(' '),
  ].map((s) => `fx.${s}`),
  roleGroups: ['infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'epic', 'legendary'],
  ui: ['icon.horn', 'trim.bronze', 'trim.silver', 'trim.gold', 'foil.bronze', 'foil.silver', 'foil.holo', 'icon.chevron', 'icon.base_alert', 'icon.follow'],
};

describe('A14.1 coverage', () => {
  it('has every unit, turret, power and skin the content references', () => {
    const missing: string[] = [];
    for (const u of Object.values(content.units)) if (!MANIFEST[u.visualId]) missing.push(u.visualId);
    for (const t of Object.values(content.turrets)) if (!MANIFEST[t.visualId]) missing.push(t.visualId);
    for (const p of Object.values(content.powers)) if (!MANIFEST[p.visualId]) missing.push(p.visualId);
    for (const s of Object.values(content.skins)) if (!MANIFEST[s.visualId]) missing.push(s.visualId);
    // the paused content wave has no art yet (tests/fixtures/pausedWave.ts)
    expect(missing.filter((id) => !PAUSED_WAVE_VISUALS.has(id))).toEqual([]);
    const shipped = <T extends { id: string }>(list: T[]): T[] => list.filter((x) => !PAUSED_WAVE_IDS.has(x.id));
    // A17.13: 56 units (plus the hidden Training Dummy) and 32 turrets; the Stone and Medieval waves add 13
    // troops and a summon (Cave Pup, War Hound), 2 turrets, 2 forts and 3 skins each, the Gunpowder wave 13 troops,
    // 2 turrets, 2 forts and 3 skins
    expect(shipped(Object.values(content.units)).filter((u) => !u.fort && !u.levy).length).toBe(98);
    // A16.14.8: 24 hidden fort twins (walls, towers, camps) and 8 levies, plus the Stone wave's 2 twins and the
    // Medieval wave's Crossbow Keep (its Bear Snares is a trap, no twin) and the Gunpowder wave's Cavalry Picket
    // (its Fougasse is a trap); 10 levies with the X0 camp variants' Slinger Levy (Bronze) and Picket Rider (Gunpowder)
    expect(shipped(Object.values(content.units)).filter((u) => u.fort).length).toBe(28);
    expect(Object.values(content.units).filter((u) => u.levy).length).toBe(10);
    expect(shipped(Object.values(content.turrets)).length).toBe(38);
    expect(shipped(Object.values(content.skins)).length).toBe(21);
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
    expect([...ids].filter((id) => !MANIFEST[id] && !PAUSED_WAVE_VISUALS.has(id))).toEqual([]);
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

describe('visuals agree with the content (A5 tables, A2.7 sizes)', () => {
  // The body-width check (A11) and the placeholder shapes read size and role group from the puppet,
  // so they must match the card data; air units must be drawn as flyers.
  it.each(Object.values(content.units).filter((u) => !PAUSED_WAVE_IDS.has(u.id)).map((u) => [u.id, u] as const))('%s: same size class, role group, age and air flag', (_id, u) => {
    const p = puppetById(PROCEDURAL_MANIFEST[u.visualId]?.source ?? '');
    expect(p).toBeDefined();
    if (!p) return;
    expect(p.size).toBe(u.size);
    expect(p.group).toBe(u.group);
    expect(p.age).toBe(u.age);
    expect(p.motion.air ?? false).toBe(u.tags.includes('air'));
    expect(p.legendary ?? false).toBe(u.rarity === 'legendary');
  });
  // Projectiles and beams leave from `anchors.muzzle` (B5 anchors): every shooter has a muzzle bone at
  // its weapon, including the Matriarch, whose riders throw rocks (A5.2, A14.2).
  const shooters = Object.values(content.units).filter((u) => !PAUSED_WAVE_IDS.has(u.id) && (u.id === 'mammoth_matriarch' || u.attacks.some((a) => a.projectile !== undefined)));
  it.each(shooters.map((u) => [u.id, u] as const))('%s: has a muzzle bone for its shots', (_id, u) => {
    const p = puppetById(PROCEDURAL_MANIFEST[u.visualId]?.source ?? '');
    expect(p?.bones.some((b) => b.id === 'muzzle')).toBe(true);
  });
  it.each(Object.values(content.turrets).filter((t) => !PAUSED_WAVE_IDS.has(t.id)).map((t) => [t.id, t] as const))('%s: turret of the same age, with a muzzle bone', (_id, t) => {
    const p = puppetById(PROCEDURAL_MANIFEST[t.visualId]?.source ?? '');
    expect(p?.age).toBe(t.age);
    expect(p?.bones.some((b) => b.id === 'muzzle')).toBe(true);
  });
});

describe('clip contract (A11)', () => {
  // the procedural tier (the fallback for every unit, and the only tier for skins without a sheet)
  const unitEntries = Object.entries(PROCEDURAL_MANIFEST).filter(([id]) => id.startsWith('unit.'));
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

  it.each(Object.entries(PROCEDURAL_MANIFEST).filter(([id]) => id.startsWith('turret.')))('%s implements the turret clips', (_id, def) => {
    for (const name of ['build', 'idle', 'fire', 'sell', 'modernise']) expect(CLIP_LIBRARY.get(def.clips[name]?.ref ?? ''), name).toBeDefined();
  });

  it('skins keep the base visual clips, anchors and height (clarity parity, A5.8)', () => {
    for (const [id, def] of Object.entries(PROCEDURAL_MANIFEST)) {
      if (!id.includes('@')) continue;
      const base = PROCEDURAL_MANIFEST[id.slice(0, id.indexOf('@'))];
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
