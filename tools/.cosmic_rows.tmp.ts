import { contentAllReleased as c } from '../tests/fixtures/allReleased';
import strings from '../src/i18n/content.en.json';
const en: any = strings;
const ids = 'crystal_guard void_skimmer moonlings nova_thrower asteroid_golem star_mortar antimatter_rifler bio_weaver void_whisperer star_fighter swarm_matron gravity_sage star_leviathan'.split(' ');
const RR: any = { common: 'C', rare: 'R', epic: 'E', legendary: 'L' };
const SZ: any = { small: 'S', medium: 'M', large: 'L', huge: 'H' };
const hits = (a: any) => (!a ? '-' : a.hitsGround && a.hitsAir ? 'GA' : a.hitsAir ? 'A' : 'G');
console.log('// UNITS');
for (const id of ids) {
  const u: any = c.units[id]; const a = u.attacks[0];
  const tags = u.tags.filter((t: string) => t !== 'ground').join(' ');
  console.log(`    ['${id}', '${en.card[id].name}', '${RR[u.rarity]}', '${u.role}', ${u.cost}, ${u.hp}, ${a.damage}, ${a.intervalMs / 100}, ${a.range}, ${u.speed}, '${SZ[u.size]}', '${hits(a)}', '${tags}'],`);
}
console.log('// TURRETS');
for (const id of ['shard_spitter', 'event_horizon']) {
  const t: any = c.turrets[id]; const a = t.attack;
  console.log(`    ['${id}', '${en.card[id].name}', '${RR[t.rarity]}', ${t.cost}, ${a.damage}, ${a.intervalMs / 100}, ${a.range}, '${hits(a)}'],`);
}
console.log('// POWERS');
for (const id of ['meteor_drizzle', 'pulsar_pulse']) {
  const p: any = c.powers[id];
  console.log(`  ['${id}', '${en.card[id].name}', '${p.age}', '${p.slot}', '${p.family}', '${p.source}', ${p.cost}, ${p.reloadMs}, ${p.telegraphMs}, ${p.maxTargets ?? 0}],`);
}
console.log('// A14');
const fx = (a: any) => (!a.projectile ? 'melee' : 'instant' in a.projectile ? a.projectile.effectId : a.projectile.visualId);
for (const id of [...ids, 'swarmling', 'shard_spitter', 'event_horizon']) {
  const u: any = c.units[id];
  const atk = u ? [...u.attacks.map((a: any) => [id, a]), ...u.abilities.filter((x: any) => x.kind === 'riders').map((x: any) => ['riders', x.attack])] : [[id, (c.turrets as any)[id].attack]];
  console.log(`  ${id}: [${atk.map(([s, a]: any) => `['${s}', '${fx(a)}', '${a.sfx}', '${a.dmgType}']`).join(', ')}],`);
}
console.log('// MODS/PRIORITY');
for (const id of [...ids, 'swarmling', 'shard_spitter', 'event_horizon']) {
  const u: any = c.units[id]; const a = u ? u.attacks[0] : (c.turrets as any)[id].attack;
  const own = (a.mods ?? []).filter((m: any) => m.vs !== 'structure');
  if (own.length || a.priority) console.log(id, JSON.stringify(own), a.priority ?? '');
}
