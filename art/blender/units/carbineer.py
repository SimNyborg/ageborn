"""Carbineer: Industrial Age ranged (docs/design-lane-ages.md A17.10). Bullet (proj.bullet), 250 lu,
~68 lu.

Look (A17.12, Industrial palette): a frontier-style rifleman in a very wide-brimmed coal slouch hat
(the brim dips at the front and back) with a team band, a long team duster coat down to the shins
(lapels, brass buttons, a leather belt, a cream cog on the coat skirt, long coat tails that swing
behind him on follow-through), a cream neckerchief whose tails flutter, iron-blue trousers tucked
into tall boots with brass spurs, a dark moustache and a cartridge bandolier across the chest. He
carries a short lever-action carbine (brass receiver, wooden stock, big lever loop) at port arms.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    tips his hat with the far hand (the brim dips), weight shift, blink
  walk    walk v3 bounce jog at ground speed (ANIM_SPEC G1, 81 lu/s): forward lean, the carbine
          at port arms bobbing a frame late, the coat tails and kerchief swinging, planted feet
  attack  SNAP SHOT AND LEVER FLOURISH: snaps the carbine to his shoulder, squints down the sights
          (the held extreme), fires (one flash, a smoke puff), kicks, then flips the carbine up
          to the vertical with a crescent smear and throws the lever (a brass casing arcs away),
          snaps it home and brings the carbine down to port arms. The bullet leaves `muzzle` on
          the fire frame. While the sim wind-up lasts he holds the aim and the barrel wobbles
          (holdLoop: hold and wobble frames)
  attack_b  KNEELING AIMED SHOT: drops to one knee, the carbine to the shoulder, aims (the held
          extreme, holdLoop), fires, rides the kick, works the lever without the flip (a casing
          flies) and rises
  hit     light: the head snaps back, the hat lifts, eyes squeezed
  die     D1 fling and spin: the hat pops off and lands behind him, X eyes and tongue
  kneel_fire  (items 51/52, the front rank of a Firing Line; extras sheet) KNEELING FIRE: attack B's kneeling
          frames as a loop that stays down on the knee (aim, wobble, fire, kick, lever, home), with the attack's
          timing and fire step; every frame reused, so it costs no pixels

Detail standard (art round W3, Track INDUSTRIAL): the duster as worn canvas (a team-dark yoke seam over the
shoulders and a seam down the back, a pocket flap, pleats and a team-dark hem band down the long skirt, the cog
whole), the slouch hat in a mid-grey felt with a lit crown (the coal felt read as a hole), a stitched binding on the
brim, the carbine's barrel with a polished band and the stock with a grain line. Aimed (item 44): both shots up 45
and 70 degrees (aimed.variants on the carbine: the stock rises to the cheek, the body leans back). Damage spots
(posed frames measured): the coat's back (r 7.5), its skirt, the near sleeve, the hat, a strip torn from the hem.
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import look
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from units import industrial_w3 as IW

SLUG = "carbineer"
GAIT_NAME = "biped"
NAME = "Carbineer"
HEIGHT_LU = 68
CANVAS = (296, 236)
FEET = (108, 208)
ANCHORS = {"head": (2, 67), "hitCenter": (0, 32), "muzzle": (54, 36)}
NO_RETIME = True

G0 = (4.0, -15.0, 27.0)     # carbine grip at rest (character space)
FORE = 12.0
LENGTH = 38.0
HAT_C = (1.0, 0.0, 57.8)
KERCHIEF = "#D8CDB6"
HAT_FELT = "#5C5751"        # W3: a mid-grey felt (the coal felt read as a hole at 62 px)
HAT_BIND = "#47433F"        # the brim's stitched binding
GRAIN = "#7E6249"           # the stock's grain line
IRON_HI = "#9AA2AC"         # the barrel's polished band

# the detail standard (art round W3): the pilot's soldier lifts; cloth, felt, leather, wood, iron and brass apart
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 1.2           # under the soldier lift (1.35): brass receiver, buttons, cartridges and spurs shine
LOOK_SHADE = IW.SHADE_SOLDIER
LOOK_RIM = IW.RIM_SOLDIER
MATERIAL_KINDS = IW.kinds({I.SKIN: "skin", I.HAIR: "fur", KERCHIEF: "cloth", HAT_FELT: "cloth", HAT_BIND: "cloth",
                           I.COAL: "cloth", I.COAL_LT: "cloth", I.DENIM: "cloth", I.LEATHER: "leather",
                           I.LEATHER_DK: "leather", I.BOOT: "leather", I.BRASS: "bronze", I.BRASS_LT: "bronze",
                           I.WOOD_LT: "wood", GRAIN: "wood", I.IRON_DK: "iron", I.IRON_LT: "iron", IRON_HI: "iron",
                           KI.CREAM: "cloth", I.SMOKE: "cloth", "team": "cloth"})


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, trousers=I.DENIM, gaiter=I.LEATHER_DK, spur=I.BRASS_LT)   # brass spurs at the heels
    # the duster's back panel ends at the knee and the tails above the boots (hems >= 9 lu up)
    I.long_coat(rig, tail_len=6.0, long=True, hem_z=13.0, skirt_z=10.0)
    _coat_detail(rig)
    # bandolier across the chest (leather with brass cartridge tips)
    g = Geo().capsule((10.4, -7.0, 36.0), (8.0, 8.0, 19.0), 1.8)
    rig.part("torso", g, I.LEATHER, outline=0.6)
    g = Geo()
    for t in (0.2, 0.4, 0.6, 0.8):
        g.blob((10.4 - 2.4 * t + 0.9, -7.0 + 15.0 * t, 36.0 - 17.0 * t), (0.9, 1.1, 1.6), p=2.6)
    rig.part("torso", g, I.BRASS_LT, finish="metal", outline=0)
    # neckerchief knot and fluttering tails
    g = Geo().lathe([(7.2, 0), (7.8, 1.6), (7.4, 3.0)], (1.2, 0, 36.2), (1.2, 0, 39.2), segs=18)
    g.blob((8.6, -2.0, 36.4), (2.4, 2.6, 2.2), p=2.4)
    rig.part("torso", g, KERCHIEF, outline=0.6)
    rig.secondary("kerchief", "torso", (8.6, -2.0, 36.0), (6.0, -3.0, 29.0), max_deg=26, gain=1.5)
    g = Geo().blob((7.6, -2.6, 32.4), (1.8, 1.2, 3.6), p=2.4, rot=(0, 20, 0))
    rig.part("kerchief", g, KERCHIEF, outline=0.5)

    KI.head_face(rig, brow=I.HAIR, brow_angry=False, mouth_dz=-9.2)
    I.moustache(rig, I.HAIR, curl=True)
    I.back_hair(rig, I.HAIR)
    I.ear(rig)
    rig.joint("hat", "head", HAT_C)
    I.slouch_hat(rig, c=HAT_C, joint="hat", color=HAT_FELT)
    _hat_detail(rig, "hat")
    KI.loose(rig, "hat_loose", HAT_C, lambda j: I.slouch_hat(rig, c=HAT_C, joint=j, color=HAT_FELT))

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=None, team_sleeve=True, fist=4.4, cuff=I.COAL_LT)
    I.shoulders(rig)

    rig.joint("gun", "torso", G0)
    muzzle = I.lever_carbine(rig, "gun", G0, length=LENGTH, k=1.1)
    _carbine_detail(rig)
    g = Geo().blob((G0[0] + FORE, G0[1] + 2.4, G0[2] - 0.2), (3.6, 3.0, 3.4), p=2.4)
    rig.part("gun", g, I.SKIN)
    rig.track("muzzle", "gun", muzzle)
    I.muzzle_flash(rig, "gun", muzzle, size=1.8)
    rig.joint("smoke", "gun", muzzle, hidden=True)
    g = Geo()
    for dx, dz, r in ((6.0, 1.0, 4.0), (11.0, 3.0, 3.3), (3.0, 4.6, 3.0), (8.0, 6.4, 2.6)):
        g.sphere((muzzle[0] + dx, muzzle[1] - 2, muzzle[2] + dz), r, cuts=4)
    rig.part("smoke", g, I.SMOKE, finish="dust", outline=0.8)
    rig.joint("casing", "root", (G0[0] + 2, G0[1] - 2, G0[2] + 7), hidden=True)
    g = Geo().capsule((G0[0] + 0.5, G0[1] - 3, G0[2] + 6.2), (G0[0] + 4.0, G0[1] - 3, G0[2] + 8.0), 1.2)
    rig.part("casing", g, I.BRASS_LT, finish="metal", outline=0.5)
    MUZ.append(muzzle)
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry
        _damage_spots(rig)


def _coat_detail(rig):
    """W3: the duster as worn canvas (rigs_industrial.long_coat's surfaces rebuilt for the ray casts)."""
    body = Geo().blob((0, 0, 27.6), (10.8, 9.8, 12.0), p=2.4, taper=(1.1, 0.94))
    body.blob((0.3, 0, 17.4), (11.2, 10.2, 5.0), p=2.6)
    tface = F.Face(rig, "torso", [body])
    # a yoke seam over the shoulders and a seam down the back
    IW.folds(rig, "torso", tface, [[(-9.6, 31.6), (-4.0, 33.6), (2.0, 34.2), (6.4, 33.0)],
                                   [(-8.2, 31.0), (-7.4, 25.0), (-7.0, 22.0)]], w=1.1, team=True)
    upper = Geo().blob((0.4, 0, 15.2), (11.6, 10.6, 5.4), p=2.6, taper=(1.12, 1.0))
    upper.clip((0, 0, 13.0), (0, 0, -1))
    skirt = Geo().blob((-1.0, 0, 11.0), (11.6, 11.4, 9.0), p=2.6, taper=(1.2, 0.98))
    skirt.clip((0, 0, 10.0), (0, 0, -1)).clip((0, 0, 16.0), (0, 0, 1)).clip((-1.0, 0, 0), (1, 0, 0))
    skirt.clip((0, -3.0, 0), (0, -1, 0))
    hface = F.Face(rig, "hips", [upper, skirt])
    # a pocket flap with a brass button, pleats down the back skirt and a team-dark hem band
    IW.panel(rig, "hips", hface, [(1.6, 16.4), (7.6, 16.2), (7.2, 13.8), (2.0, 14.0)], team=True)
    IW.rivets(rig, "hips", hface, [(4.6, 14.6)], r=0.9, fill=I.BRASS_LT)
    IW.folds(rig, "hips", hface, [[(-8.6, 15.4), (-9.2, 11.2)], [(-4.8, 15.6), (-5.0, 11.0)]], w=1.0, team=True)
    IW.folds(rig, "hips", hface, [[(-11.0, 11.0), (-6.0, 10.6), (-1.8, 10.8)]], w=1.6, team=True)
    g = IW.cog(hface, Geo(), (4.4, 11.6), s=0.85)     # the cog whole (conforming)
    rig.part("hips", g, KI.CREAM, highlight=False, outline=0)


def _hat_detail(rig, joint):
    """W3: a stitched binding round the slouch hat's brim and a lit crown top (the felt's planes read)."""
    x, y, z = HAT_C
    g = Geo().blob((x + 0.8, y, z + 0.6), (22.0, 19.0, 1.5), p=2.2)
    for v in g.bm.verts:
        dx, dy = (v.co.x - x) / 22.0, (v.co.y - y) / 19.0
        v.co.z -= 3.6 * dx * dx - 1.2 * dy * dy
    brim = F.Face(rig, joint, [g])
    pts = [(x - 20.4, z - 2.6), (x - 12.0, z + 0.2), (x - 2.0, z + 0.9), (x + 8.0, z + 0.4), (x + 17.0, z - 1.8),
           (x + 22.0, z - 3.6)]
    IW.stitches(rig, joint, brim, pts, HAT_BIND, w=0.8, dash=1.4, gap=0.8)
    # a second, team-dark band above the team hat band (a wider band in two tones: the team cue on the hat reads
    # at 62 px and keeps the team fill over 18% on the fire frames, where the flash widens the silhouette)
    g = Geo().lathe([(10.1, 0), (10.2, 1.0), (9.6, 2.2), (9.2, 2.6)], (x, y, z + 4.8), (x, y, z + 7.4), segs=24)
    look.team_part(rig, joint, g, outline=0.5)


def _carbine_detail(rig):
    """W3: a polished band along the barrel's top and a grain line down the stock."""
    gx, gy, gz = G0
    k = 1.1
    g = Geo().capsule((gx + 7.0, gy - 0.9, gz + 3.15 * k), (gx + LENGTH - 2.0, gy - 0.9, gz + 3.15 * k), 0.42,
                      segs=8, rings=2)
    rig.part("gun", g, IRON_HI, finish="metal", outline=0)
    g = Geo().capsule((gx - 13.0, gy - 2.1, gz - 3.4), (gx - 4.6, gy - 2.1, gz - 1.6), 0.4, segs=8, rings=2)
    g.capsule((gx + 8.0, gy - 1.7, gz + 0.2), (gx + 20.0, gy - 1.7, gz + 0.5), 0.36, segs=8, rings=2)
    rig.part("gun", g, GRAIN, outline=0, highlight=False)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, soldier; never on the face or skin), measured in the posed frames: the
    coat's back (the biggest team field the arms and the carbine leave clear, r 7.5), the coat's skirt, the near
    sleeve, the hat's crown, a strip torn from the coat's hem."""
    rig.damage_spot_at("coat", "torso", -4.0, 27.0, 7.5, "cloth", team=True)
    rig.damage_spot_at("skirt", "hips", -4.0, 12.6, 5.0, "cloth", team=True)
    rig.damage_spot_at("sleeve", "arm_r", -1.0, 34.0, 5.0, "cloth", team=True)
    rig.damage_spot_at("hat", "hat", -2.0, 67.0, 5.0, "cloth", fill=HAT_FELT)
    rig.damage_spot_at("hem", "hips", -2.0, 9.6, 8.0, "cloth", kind="strip", team=True)


MUZ = []
PORT = (4.0, 27.0, 52.0)     # port arms: the carbine held diagonally across the chest


def hold(gx, gz, deg):
    return I.hold2("gun", G0, FORE, gx, gz, deg)


STANCE = merge(hold(*PORT), {"torso": {"r": -2.0}})


def _idle(f):
    # tips his hat: the far hand leaves the fore-end (1), touches the brim and dips it (2-3), back (4-5)
    tip = [0.0, 0.5, 1.0, 1.0, 0.4, 0.0][f]

    def extra(ctx):
        return {}
    pose = M.idle_v2(f, STANCE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=3)
    if tip > 0:
        a, fo = I.ik2(I.SH, (9.0, 55.0))
        la, lf = pose["arm_l"]["r"] - 90.0, pose["fore_l"]["r"] + pose["arm_l"]["r"] - 90.0
        na, nf = la + (a - la) * tip, lf + (fo - lf) * tip
        pose.update(I.arm("l", na, nf))
        pose["hat"] = {"r": -9 * tip, "z": -0.8 * tip, "x": 0.8 * tip}
        pose["head"] = dict(pose.get("head", {}), r=pose.get("head", {}).get("r", 0.0) - 4 * tip)
        if f in (2, 3):
            pose = merge(pose, F.expr("blink" if f == 3 else "grit"))
    return pose


# -- walk v3: G1 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 77 ms --------------
SPEED = 81.25
LEGS = KI.legs_ik()
GAIT = KI.jog_gait(LEGS, SPEED, cycle_ms=616)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(hold(PORT[0], PORT[1] + 0.9 * lag, PORT[2] - 4.0 * lag),
                     {"hat": {"r": -2.0 * lag}, "kerchief": {"r": 6 * lag}, "coattail": {"r": 6 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -2.0}}, GAIT, legs=LEGS, lean=-10.0, twist=7.0, nod=3.0,
                     extra=extra, report=report)


# 11 unique frames in 765 ms; impact (fire) on frame 4 at 291 ms (impactAt 0.3804, as shipped). The
# shipped 191 ms hold is split into the hold (130) and a wobble partner (61) for the holdLoop.
ATTACK_MS = [40, 60, 130, 61, 60, 70, 60, 50, 70, 80, 84]
ATTACK_IMPACT = 4
U_OF = [0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9]     # unique frame -> row of the pose tables below
#       raise snap HOLD FIRE kick flip snap down settle settle
GX = [5.0, 5.0, 5.0, 5.0, 2.5, 3.0, 3.0, 4.0, 4.5, 4.0]
GZ = [30.0, 33.0, 33.0, 33.0, 35.0, 37.0, 38.0, 32.0, 28.0, 27.0]
DEG = [18.0, 4.0, 0.0, 0.0, 16.0, 78.0, 86.0, 46.0, 50.0, 52.0]
LEVER = [0, 0, 0, 0, 0, 62, 6, 0, 0, 0]
BX = [0.0, 0.5, 1.0, 0.0, -3.5, -2.0, -1.0, -0.5, 0.0, 0.0]
BQ = [0.0, -0.03, -0.06, 0.03, -0.10, 0.05, 0.02, -0.02, 0.0, 0.0]
BZ = [0.0, -0.5, -1.2, -1.2, -0.8, 1.2, 0.8, 0.0, 0.0, 0.0]
TR = [-2, -4, -5, -5, 5, 4, 2, 0, -1, -2]
HR = [-2, -7, -10, -9, 5, 6, 4, 0, 0, 0]
CAS = [None, None, None, None, None, (-3, 4, 60), (-9, 13, 200), (-15, 10, 330), (-19, -2, 420),
       None]


# aimed shots (queue item 44, ageborn_art/aimed.py): a turn of `turn` degrees up raises the stock toward the cheek
# (the grip rises and draws back), leans the body back into the shot and tips the head up with it. The torso carries
# the carbine, so its lean is part of the turn.
AIM_LEAN = 0.22           # torso r per degree of turn (positive leans back)
AIM_RISE = 0.10           # grip z per degree up (torso space, lu)
AIM_DRAW = 0.05           # grip x per degree up (drawn back toward the shoulder)
AIM_HEAD = 0.30           # head r per degree, on top of the torso's lean
#        raise snap HOLD wob FIRE kick flip snap down settle settle
AIM_W = [0.0, 0.5, 1.0, 1.0, 1.0, 0.8, 0.35, 0.15, 0.0, 0.0, 0.0]
#        A    drop HOLD wob FIRE kick lever home rise  A    A
AIM_W_B = [0.0, 0.4, 1.0, 1.0, 1.0, 1.0, 0.8, 0.6, 0.25, 0.0, 0.0]


def _aim(gx, gz, deg, turn):
    """The grip and the carbine's angle (torso space) turned `turn` degrees up, with the torso's lean taken out."""
    if not turn:
        return gx, gz, deg
    up = max(0.0, turn)
    return gx - AIM_DRAW * up, gz + AIM_RISE * up, deg + turn - AIM_LEAN * turn


def _attack_pose(f, turn=0.0):
    wob = f == 3
    f = U_OF[f]
    lean = AIM_LEAN * turn
    gx, gz, deg = _aim(GX[f], GZ[f] + (0.7 if wob else 0.0), DEG[f] + (1.8 if wob else 0.0), turn)
    pose = merge(hold(gx, gz, deg), {
        "torso": {"r": TR[f] + lean},
        "head": {"r": HR[f] + AIM_HEAD * turn, "x": 1.2 if f in (1, 2, 3) else 0.0},
        "hat": {"r": [0, 0, 0, 0, 6, -4, -2, 0, 0, 0][f]},
        "thigh_r": {"r": [4, 10, 14, 14, 10, 8, 6, 4, 2, 0][f]},
        "shin_r": {"r": [0, -4, -8, -8, -6, -2, -2, 0, 0, 0][f]},
        "thigh_l": {"r": [-4, -10, -14, -16, -16, -12, -10, -6, -4, -2][f]},
        "shin_l": {"r": [0, -2, -6, -6, -4, 0, 0, 0, 0, 0][f]},
        "lever": {"r": LEVER[f]},
        "flash": {"show": f == 3},
        "smoke": {"show": f == 4, "s": 1.1},
    }, M.body_about((0, 0, 22), x=BX[f], z=BZ[f], q=BQ[f]))
    if CAS[f] is not None:
        x, z, r = CAS[f]
        pose["casing"] = {"show": True, "x": x, "z": z, "r": r}
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0 - (0.4 if wob else 0.0)}})
    if f in (5, 6):
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_clip():
    muz = MUZ[0] if MUZ else (G0[0] + LENGTH + 1.0, G0[1], G0[2] + 2.6)
    flip = {"kind": "arc", "joint": "gun", "inner": (G0[0] + 16.0, G0[1], G0[2] + 2.4), "outer": muz,
            "color": I.IRON_LT, "white": 0.4, "taper": 0.2, "lines": 2}
    ov = {
        6: [dict(flip, **{"from": 5, "t0": 0.0, "t1": 0.9})],
        4: [{"kind": "burst", "joint": "gun", "point": muz, "r0_lu": 8.0, "r1_lu": 13.0, "n": 5,
             "a0": -60.0, "arc": 120.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays=ov, extra={"holdStep": 2, "holdLoop": [2, 3]})


# -- attack B: kneeling aimed shot (ANIM_SPEC appendix B) ----------------------------------------
# unique frames: 0 = A raise, 1 drop, 2 HOLD (kneeling, the carbine at his shoulder, squinting),
# 3 wobble (holdLoop), 4 FIRE, 5 kick, 6 lever down (a casing flies), 7 lever home, 8 rising,
# 9 = A settle, 10 = A settle
#        drop HOLD wob  FIRE kick lever home rise
KB_DROP = [7.0, 14.0, 14.0, 14.0, 13.5, 14.0, 14.0, 7.0]
KB_GX = [5.0, 6.0, 6.0, 6.0, 3.5, 5.0, 5.0, 4.5]
KB_GZ = [31.0, 34.0, 34.6, 34.0, 35.5, 33.5, 33.5, 30.0]
KB_DEG = [10.0, 2.0, 3.6, 2.0, 20.0, 6.0, 4.0, 36.0]
KB_LEVER = [0, 0, 0, 0, 0, 64, 4, 0]
KB_TR = [-6, -8, -8, -8, 4, -4, -6, -2]
KB_HR = [-6, -10, -11, -10, 6, -2, -4, 0]
KB_BX = [0.5, 1.0, 1.0, 0.0, -3.0, -1.0, -0.5, 0.0]
KB_BQ = [-0.04, -0.06, -0.06, 0.04, -0.10, 0.02, 0.0, 0.0]
KB_CAS = [None, None, None, None, None, (-3, 3, 60), (-10, 9, 200), (-16, 0, 330)]
KB_FRONT = [8.0, 12.5, 12.5, 12.5, 12.0, 12.5, 12.5, 7.0]


def _b_pose(i, turn=0.0):
    if i in (0, 9, 10):
        return _attack_pose(i, turn)
    k = i - 1
    lean = AIM_LEAN * turn
    pose = merge(hold(*_aim(KB_GX[k], KB_GZ[k], KB_DEG[k], turn)), {
        "torso": {"r": KB_TR[k] + lean},
        "head": {"r": KB_HR[k] + AIM_HEAD * turn, "x": 1.2 if k in (1, 2, 3) else 0.0},
        "hat": {"r": [0, 0, 0, 0, 7, -3, -1, 0][k]},
        "lever": {"r": KB_LEVER[k]},
        "flash": {"show": k == 3, "s": 0.8 if k == 3 else 1.0},
        "smoke": {"show": k == 4, "s": 0.9},
    }, M.body_about((0, 0, 22), x=KB_BX[k], q=KB_BQ[k]))
    if KB_CAS[k] is not None:
        x, z, r = KB_CAS[k]
        pose["casing"] = {"show": True, "x": x, "z": z - KB_DROP[k], "r": r}
    pose = KI.kneel(RIG, pose, LEGS, drop=KB_DROP[k], front=KB_FRONT[k])
    if k in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0 - (0.4 if k == 2 else 0.0)}})
    elif k in (5, 6):
        pose = merge(pose, F.expr("grit"))
    return pose


def _attack_b():
    muz = MUZ[0] if MUZ else (G0[0] + LENGTH + 1.0, G0[1], G0[2] + 2.6)
    ov = {
        4: [{"kind": "burst", "joint": "gun", "point": muz, "r0_lu": 8.0, "r1_lu": 13.0, "n": 5,
             "a0": -60.0, "arc": 120.0},
            {"kind": "dust", "ground": (-12.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 21, "spread": 0.7,
             "dir": -1.0}],
        6: [{"kind": "arc", "joint": "lever", "inner": (G0[0] + 1.0, G0[1], G0[2] - 2.0),
             "outer": (G0[0] + 3.0, G0[1], G0[2] - 7.0), "color": I.IRON_LT, "white": 0.4, "taper": 0.3,
             "lines": 1, "from": 5, "t0": 0.0, "t1": 1.0}],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 2, "holdLoop": [2, 3]})


# kneel_fire (items 51/52, the front rank of a Firing Line; the extras sheet, pipeline.POSE_CLIPS): attack B's
# kneeling frames as a loop that stays down on the knee: home (lever closed), aim, the held aim and its wobble
# (holdLoop), FIRE on the attack's fire step, kick, lever, home again. The attack's 765 ms and fire step, so a
# Firing Line can swap it for the attack; every frame is attack B's, reused (no new pixels).
KNEEL_FROM = [7, 2, 3, 4, 5, 6]               # attack B's unique frames: home, HOLD, wobble, FIRE, kick, lever
KNEEL_SEQ = [0, 1, 1, 2, 3, 4, 5, 0, 0, 0, 0]  # the 11 steps of ATTACK_MS (fire on step 4)


def _kneel_fire():
    return M.clip("kneel_fire", [_b_pose(i) for i in KNEEL_FROM], ATTACK_MS, impact=ATTACK_IMPACT,
                  sequence=KNEEL_SEQ, reuse={j: ("attack_b", i) for j, i in enumerate(KNEEL_FROM)},
                  extra={"holdStep": 2, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return merge(hold(PORT[0], PORT[1], PORT[2] + 16 * a) if a > 0 else {},
                     {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                      "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                      "hat": {"z": 3.5 * max(a, 0), "r": 12 * a}, "brow": {"z": 1.6 * max(a, 0)}})
    base = {"torso": {"r": -2.0}} if M.HIT_AMT[k] > 0 else STANCE
    return M.hit_light(k, base, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


HAT_PATH = KI.hat_pop(land=55.0, back=60.0)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(hold(PORT[0], PORT[1], PORT[2] + 30 * flail), M.die_d1(k, center_z=28.0, lie_z=11.0,
                                                                         height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_l": {"r": 60 * flail}, "fore_l": {"r": 30 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    hp = HAT_PATH[k]
    if hp is not None:
        x, z, r = hp
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    attack, attack_b = _attack_clip(), _attack_b()
    # aimed up about 45 and 70 degrees at flyers (Carbineer hits air; they go to the extras sheet)
    aimed_a = AIMED.variants(RIG, attack, _attack_pose, AIM_W, aims=("up45", "up70"))
    aimed_b = AIMED.variants(RIG, attack_b, _b_pose, AIM_W_B, aims=("up45", "up70"))
    for v in aimed_a:
        AIMED.check_timing(attack, v)
    for v in aimed_b:
        AIMED.check_timing(attack_b, v)
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        attack,
        attack_b,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
        _kneel_fire(),
    ] + aimed_a + aimed_b
    return M.check_variants(M.check_contract(cl, attack_ms=765, attack_impact_at=0.3804))
