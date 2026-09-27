/**
 * A puppet as Pixi sprites: one container per slot (depth-sorted once by z) holding the baked
 * textures of its part: main, team (tinted), over and a white flash silhouette. Every frame the pure
 * pose math (`pose.ts`) gives bone matrices, and each slot container takes its matrix.
 *
 * Slots are flat children of `container` rather than nested bone containers, so draw order can
 * interleave bones freely (far arm behind the torso, weapon between hand and forearm) and every
 * sprite of one atlas page batches into a single draw call.
 */
import { Container, Matrix, Sprite, type Texture } from 'pixi.js';
import type { PartBaker } from '../../bake';
import type { PartLookup } from '../../draw';
import { boneWorld, DEFAULT_STATE, slotId, slotLocal, slotsInOrder, slotVisible, type DeltaLookup, type PuppetState } from '../../pose';
import { STYLE } from '../../style';
import { matMul, type Mat } from '../../svg';
import type { PuppetDef, SlotDef } from '../../types';

export interface SlotSprites {
  def: SlotDef;
  node: Container;
  main: Sprite;
  team: Sprite | null;
  over: Sprite | null;
  white: Sprite;
}

function sprite(tex: Texture, x: number, y: number): Sprite {
  const s = new Sprite(tex);
  s.position.set(x, y);
  return s;
}

export class PuppetSprites {
  readonly container = new Container();
  readonly slots: SlotSprites[] = [];
  private readonly world = new Map<string, Mat>();
  private readonly m = new Matrix();
  private flashAlpha = 0;
  private state: PuppetState = DEFAULT_STATE;

  constructor(
    readonly puppet: PuppetDef,
    baker: PartBaker,
    parts: PartLookup,
    private teamColor: number,
    private striped: boolean,
  ) {
    for (const def of slotsInOrder(puppet)) {
      const part = parts(def.part);
      if (!part) continue;
      const baked = baker.get(part, puppet.palette, def.tone === 'back' ? STYLE.backTonePct : 0);
      const node = new Container();
      node.label = slotId(def);
      const { x, y } = baked.origin;
      const main = sprite(baked.main, x, y);
      node.addChild(main);
      let team: Sprite | null = null;
      const teamTex = striped && baked.teamStriped ? baked.teamStriped : baked.team;
      if (teamTex) {
        team = sprite(teamTex, x, y);
        // Far-limb tone is already baked into the grey, so the plain team colour is the tint.
        team.tint = teamColor;
        node.addChild(team);
      }
      let over: Sprite | null = null;
      if (baked.over) {
        over = sprite(baked.over, x, y);
        node.addChild(over);
      }
      const white = sprite(baked.white, x, y);
      white.visible = false;
      node.addChild(white);
      if (def.alpha !== undefined) node.alpha = def.alpha;
      this.container.addChild(node);
      this.slots.push({ def, node, main, team, over, white });
    }
    // Texture pages may have been drawn into: upload once.
    baker.flush();
    this.apply();
  }

  /** Re-tints the team layers (colourblind preset changes). */
  setTeam(color: number, striped: boolean): void {
    this.teamColor = color;
    this.striped = striped;
    for (const s of this.slots) if (s.team) s.team.tint = color;
  }

  get team(): { color: number; striped: boolean } {
    return { color: this.teamColor, striped: this.striped };
  }

  setState(st: PuppetState): void {
    this.state = st;
  }

  /** Poses every slot from bone deltas (rest pose when omitted). */
  apply(deltas?: DeltaLookup): void {
    boneWorld(this.puppet.bones, deltas, this.world);
    for (const s of this.slots) {
      const bone = this.world.get(s.def.bone);
      const visible = slotVisible(s.def.when, this.state);
      s.node.visible = visible && bone !== undefined && s.node.alpha > 0;
      if (!bone || !visible) continue;
      const t = matMul(bone, slotLocal(s.def));
      this.m.set(t[0], t[1], t[2], t[3], t[4], t[5]);
      s.node.setFromMatrix(this.m);
    }
  }

  /** World (puppet space) matrix of a bone after the last `apply`. */
  boneMatrix(id: string): Mat | undefined {
    return this.world.get(id);
  }

  /** White (or tinted) silhouette overlay for hit flashes; 0 hides it. */
  setFlash(alpha: number, color = 0xffffff): void {
    if (alpha === this.flashAlpha && alpha === 0) return;
    this.flashAlpha = alpha;
    for (const s of this.slots) {
      s.white.visible = alpha > 0;
      s.white.alpha = alpha;
      s.white.tint = color;
    }
  }

  slotsTagged(tag: SlotDef['tag']): SlotSprites[] {
    return this.slots.filter((s) => s.def.tag === tag);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
