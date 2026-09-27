/**
 * The rider rig (DESIGN A11 Rigs): a biped seated on a quadruped mount (Knight, Cuirassier,
 * Ursa Paladin). The rider's pelvis hangs from the mount's `saddle` bone; the far leg hides behind
 * the mount's body and the near leg rests over it.
 */
import { getClip } from '../clips';
import type { PuppetDef, SlotDef } from '../types';
import { biped, type BipedSpec } from './biped';
import { anchorsFrom } from './common';
import { quadruped, type QuadSpec } from './quadruped';

export interface RiderSpec {
  id: string;
  mount: Omit<QuadSpec, 'id' | 'attack' | 'group' | 'size' | 'age'>;
  rider: Omit<BipedSpec, 'id' | 'attack' | 'group' | 'size' | 'age'>;
  age: QuadSpec['age'];
  height: number;
  attack: string;
  ability?: string;
  group: QuadSpec['group'];
  size: QuadSpec['size'];
  legendary?: boolean;
}

/** Rider z order: far leg behind the mount, near leg over its body, upper body above everything. */
function riderZ(slot: SlotDef): number {
  switch (slot.id) {
    case 'legB':
    case 'shinB':
      return 1 + slot.z / 100;
    case 'legF':
    case 'shinF':
      return 36 + slot.z / 100;
    default:
      return 40 + slot.z;
  }
}

export function rider(s: RiderSpec): PuppetDef {
  const m = quadruped({ ...s.mount, id: s.id, age: s.age, attack: s.attack, group: s.group, size: s.size, height: s.height });
  const r = biped({
    ...s.rider,
    id: `${s.id}:rider`,
    age: s.age,
    attack: s.attack,
    group: s.group,
    size: s.size,
    pose: { legF: -78, shinF: 70, legB: -70, shinB: 64, ...s.rider.pose },
  });
  const riderBones = r.bones
    .filter((b) => b.id !== 'root' && b.id !== 'spin')
    .map((b) => (b.id === 'pelvis' ? { ...b, parent: 'saddle', x: 0, y: 0 } : b));
  const slots = [...m.slots, ...r.slots.map((sl) => ({ ...sl, z: riderZ(sl) }))];
  const bones = [...m.bones, ...riderBones];
  const attackClip = getClip(s.attack);
  return {
    ...m,
    rig: 'rider',
    bones,
    slots,
    palette: { ...m.palette, ...r.palette, ...s.mount.palette },
    anchors: anchorsFrom(bones, {
      heightLu: s.height,
      headTop: { x: 0, y: -s.height },
      muzzleBone: bones.some((b) => b.id === 'muzzle') ? 'muzzle' : undefined,
      center: s.mount.bodyHeight + 10,
    }),
    motion: { ...m.motion, family: 'rider', ability: s.ability ?? 'ability.flourish', twirlBone: 'handF' },
    impactAt: attackClip?.impactAt ?? 0.55,
    legendary: s.legendary,
    aura: s.legendary ? 'legendary' : null,
  };
}
