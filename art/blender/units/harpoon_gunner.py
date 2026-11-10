"""Harpoon Gunner: Industrial Age anti-armor (docs/design-lane-ages.md A17.10). Harpoon
(proj.harpoon), 210 lu, ~70 lu, medium. Reel In: the first hit of each engagement pulls the target
25 lu toward the gunner.

Look (A17.12, Industrial palette): a stocky whaler-engineer with big brass goggles pushed up on
his brow, a tall slouched coal watch cap with a team cuff and a cream pompom, a team pea jacket and team
sleeves, a leather apron belt and a big coil of cream rope slung over his shoulder (its ring
faces the camera and stands out behind his back). On his near shoulder rests a heavy iron harpoon gun: a fat
riveted barrel with copper bands, a round breech drum with a crank, a pistol grip and a front
grip, and a barbed iron harpoon head sticking out of the muzzle with its rope running back to the
coil. The long gun with the barbed head is the anti-armor silhouette at 56 px. The attack braces,
aims (held), fires with a flash and a smoke puff (the harpoon leaves the tube), kicks him back,
then "reel-in yank": he heaves the gun back as if hauling the rope, and a fresh harpoon is seated
as he settles. The projectile spawns at the per-frame `muzzle` anchor.

Animation standard (ANIM_SPEC 2026-10-02):
  walk      walk v3 bounce jog at ground speed (G1, 81 lu/s), the gun riding on his shoulder a frame
            late, the apron flap kicking, planted feet
  attack    A as above; the hold is split into the aim and a wobble frame (holdLoop) for the sim's
            longer wind-up
  attack_b  KNEELING BRACED SHOT: drops to one knee, the gun angled a little up on his shoulder
            (the held extreme, holdLoop), fires and the kick rocks him back onto his heel, cranks
            the reel on one knee and rises (the appendix's standing shoulder shot would read like
            A at 62 px, so B changes the body level instead)

Detail standard (art round W3, Track INDUSTRIAL): the pea jacket as worn wool (a team-dark yoke and back seam, a
pocket flap and a team-dark hem band on its skirt), the watch cap knitted (ribs in a darker wool over a mid-grey
knit with a lit crown; the coal knit read as a hole; a deeper team cuff and a team pompom), the harpoon gun's
barrel riveted (brass rivet rows by the
copper bands) with a team-dark middle sleeve. Aimed (item 44): both shots up 45 and 70 degrees (aimed.variants on
the barrel: the gun rises on his shoulder, he leans back under it). Damage spots (posed frames measured): the
jacket's back (r 7.5), the barrel, the near sleeve, the cap, a strip torn from the jacket's hem.
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import look
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import industrial_w3 as IW

SLUG = "harpoon_gunner"
GAIT_NAME = "biped"
NAME = "Harpoon Gunner"
HEIGHT_LU = 70
CANVAS = (340, 228)
FEET = (148, 204)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (40, 44)}
NO_RETIME = True

TY, TZ = -15.5, 37.0         # barrel axis: in front of the near shoulder
T0, T1 = -20.0, 24.0         # barrel ends (x)
TR = 3.9
PIVOT = (-2.0, TY, TZ)
GRIP = (5.0, TY + 1.0, TZ - 8.5)
FORE = (14.0, TY + 1.0, TZ - 6.0)
MUZZLE = (T1 + 2.0, TY, TZ)
HEAD_LEN = 14.0
REEL = (-1.0, TZ - 10.5)
CRANK_R = 5.6
APRON = "#3C3A3A"
KNIT = "#5A5652"            # W3: the watch cap's knit (a mid grey; the coal knit read as a hole at 62 px)
KNIT_RIB = "#45423F"

# the detail standard (art round W3): the pilot's soldier lifts; wool, rope, leather, rubber, iron, copper apart
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 1.2           # under the soldier lift (1.35): goggles, rivet rows and copper bands shine
LOOK_SHADE = IW.SHADE_SOLDIER
LOOK_RIM = IW.RIM_SOLDIER
MATERIAL_KINDS = IW.kinds({I.SKIN: "skin", I.HAIR_RED: "fur", KNIT: "cloth", KNIT_RIB: "cloth", I.COAL_LT: "cloth",
                           I.CREAM: "cloth", I.CREAM_DK: "cloth", I.DENIM: "cloth", I.LEATHER: "leather",
                           I.LEATHER_DK: "leather", I.BOOT: "leather", I.COAL: "leather", APRON: "polymer",
                           I.IRON: "iron", I.IRON_LT: "iron", I.IRON_DK: "iron", I.COPPER: "bronze",
                           I.BRASS: "bronze", I.BRASS_LT: "bronze", I.WOOD: "wood", I.WOOD_LT: "wood",
                           I.SMOKE: "cloth", "team": "cloth"})


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, trousers=I.DENIM, cuff=I.CREAM_DK, thigh_r=4.8)
    # a big coil of cream rope slung over the far shoulder, its ring facing the camera so it
    # stands out behind the back and above the shoulder line (drawn first, behind the jacket)
    g = Geo()
    for k, r in enumerate((11.0, 9.0)):
        g.lathe([(r - 1.8, -1.8), (r + 0.2, -2.0), (r + 1.8, 0), (r + 0.2, 2.0), (r - 1.8, 1.8)],
                (-7.5 - k * 0.6, 6.0 - k * 1.4, 32.0), (-7.2 - k * 0.6, 5.0 - k * 1.4, 32.0), segs=28)
    rig.part("torso", g, I.CREAM, finish="hair")
    g = Geo()
    for a in (0.6, 2.2, 3.8, 5.3):                               # lashings
        g.capsule((-7.5 + 9.0 * math.cos(a), 4.2, 32.0 + 9.0 * math.sin(a)),
                  (-7.5 + 12.6 * math.cos(a), 4.2, 32.0 + 12.6 * math.sin(a)), 1.0)
    rig.part("torso", g, I.LEATHER_DK, outline=0.4)
    g = Geo().capsule((7.0, -9.4, 37.0), (-6.0, -9.0, 18.0), 1.6)   # coil strap across the chest
    rig.part("torso", g, I.LEATHER, outline=0.6)
    I.jacket(rig, collar=I.COAL_LT, hem_z=13.0)
    _jacket_detail(rig)
    g = Geo().blob((0.4, 0, 18.8), (11.2, 10.4, 3.8), p=3.2)   # apron belt with a hook
    rig.part("torso", g, I.LEATHER_DK)
    g = Geo().capsule((9.0, -8.6, 18.0), (10.6, -9.6, 12.0), 0.9)
    rig.part("torso", g, I.IRON_LT, finish="metal", outline=0.4)
    # a black rubber apron flap over the thighs (follow-through)
    rig.secondary("apron", "hips", (8.0, 0.0, 16.0), (10.0, 0.0, 9.0), max_deg=18, gain=1.2)
    g = Geo().blob((10.0, -1.0, 13.4), (2.0, 8.6, 4.2), p=2.6, taper=(1.1, 0.9))
    rig.part("apron", g, APRON, finish="gloss", outline=0.6)

    KI.head_face(rig, brow=I.HAIR_RED, brow_angry=True, mouth_dz=-8.8)
    I.ear(rig)
    g = Geo().blob((5.0, 0, 42.0), (9.8, 10.4, 5.6), p=2.2)   # short beard along the jaw
    g.clip((4.0, 0, 0), (-1, 0, 0)).clip((0, 0, 44.4), (0, 0, 1))
    rig.part("head", g, I.HAIR_RED, finish="hair", outline=0.5)
    # knitted watch cap: a tall soft crown slouched back, a cream rolled cuff, a pompom; big
    # brass goggles pushed up on the brow (they read at 1x)
    g = Geo().blob((-1.4, 0, 58.6), (11.6, 11.2, 10.0), p=2.3, shift=(-0.22, 0), rot=(0, -8, 0))
    g.clip((0, 0, 56.0), (0, 0, -1))
    cap = Geo().blob((-1.4, 0, 58.6), (11.6, 11.2, 10.0), p=2.3, shift=(-0.22, 0), rot=(0, -8, 0))
    cap.clip((0, 0, 56.0), (0, 0, -1))
    capface = F.Face(rig, "head", [cap])
    rig.part("head", g, KNIT)
    IW.folds(rig, "head", capface, [[(x0, 57.8), (x1, 66.0)] for x0, x1 in ((-9.8, -9.0), (-5.6, -5.2), (-1.4, -1.6),
                                                                              (2.8, 2.0), (6.6, 5.2))],
             w=0.9, team=False, fill=KNIT_RIB)
    g = Geo().sphere((-8.0, 0, 67.6), 3.4, cuts=3)                     # pompom (W3: team, the cap's team cue)
    rig.part("head", g, team=True, finish="hair")
    # the rolled cuff (W3: a deeper roll, so the team reads on the cap and the fire frames keep 18% team fill)
    g = Geo().lathe([(12.0, 0), (12.6, 1.6), (12.6, 3.6), (12.1, 5.0), (11.5, 5.6)], (0.2, 0, 54.6), (0.2, 0, 60.2),
                    segs=24)
    rig.part("head", g, team=True, outline=0.6)
    I.goggles(rig, at=(10.4, 0, 59.6), k=1.4, dy=(-5.2, 4.6))

    for s in ("r", "l"):
        I.arm_parts(rig, s, team_sleeve=True, fist=4.6, cuff=I.COAL_LT)
    I.shoulders(rig)

    # the harpoon gun (pivot at the shoulder)
    rig.joint("tube", "torso", PIVOT)
    g = Geo().capsule((T0 + 3, TY, TZ), (T1 - 2, TY, TZ), TR, TR + 0.3, segs=20)
    rig.part("tube", g, team=True)
    g = Geo()   # flared muzzle and the breech drum
    g.lathe([(TR - 0.2, 0), (TR + 1.4, 1.6), (TR + 2.2, 4.6), (TR + 1.0, 5.2), (TR - 1.0, 5.0)],
            (T1 - 3.5, TY, TZ), (T1 + 2, TY, TZ), segs=22)
    rig.part("tube", g, I.IRON_DK, finish="metal")
    g = Geo().lathe([(0, -4.0), (6.4, -4.0), (7.0, -2.4), (7.0, 2.4), (6.4, 4.0), (0, 4.0)],
                    (T0 + 1.0, TY, TZ), (T0 + 1.0, TY - 1, TZ), segs=22)
    rig.part("tube", g, I.IRON_DK, finish="metal")
    g = Geo()
    I.rivets(g, [(T0 + 1.0 + 5.0 * math.cos(a), TY - 4.2, TZ + 5.0 * math.sin(a))
                 for a in (i * math.pi / 3 for i in range(6))], r=0.9)
    rig.part("tube", g, I.BRASS_LT, finish="metal", outline=0)
    g = Geo().capsule((T0 + 1.0, TY - 4.6, TZ), (T0 - 3.0, TY - 6.6, TZ - 5.0), 0.9)   # crank
    g.sphere((T0 - 3.0, TY - 6.8, TZ - 5.0), 1.5, cuts=2)
    rig.part("tube", g, I.WOOD_LT, outline=0.5)
    g = Geo()   # copper bands
    for x in (-6.0, 8.0):
        g.lathe([(TR + 0.5, -1.4), (TR + 0.7, 0), (TR + 0.5, 1.4)], (x, TY, TZ), (x + 1, TY, TZ), segs=20)
    rig.part("tube", g, I.COPPER, finish="metal", outline=0.5)
    # W3: a team-dark sleeve round the barrel's middle and brass rivet rows beside the copper bands
    g = Geo().lathe([(TR + 0.25, -0.2), (TR + 0.45, 0.6), (TR + 0.45, 11.4), (TR + 0.25, 12.2)], (-4.6, TY, TZ),
                    (-3.6, TY, TZ), segs=22)
    look.team_part(rig, "tube", g, outline=0.4)
    g = Geo()
    for x in (-9.2, -7.4, 10.6, 12.4, 18.0, 19.8):
        for a in (-38.0, 0.0, 38.0):
            ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
            g.sphere((x, TY - (TR + 0.35) * ca, TZ + (TR + 0.35) * sa), 0.62, cuts=2)
    rig.part("tube", g, I.BRASS_LT, finish="metal", outline=0)
    g = Geo().blob((-3.0, TY + 1.0, TZ - 4.4), (6.0, 2.6, 1.8), p=3.0)   # shoulder pad
    rig.part("tube", g, I.LEATHER, outline=0.6)
    g = Geo().capsule((GRIP[0], GRIP[1], TZ - TR), (GRIP[0] - 1.5, GRIP[1], GRIP[2]), 1.5)
    g.capsule((FORE[0], FORE[1], TZ - TR), (FORE[0] + 0.5, FORE[1], FORE[2] - 1.0), 1.4)
    rig.part("tube", g, I.WOOD, outline=0.6)
    # the harpoon: a shaft and a big barbed head out of the muzzle (hidden once fired)
    rig.joint("harpoon", "tube", (T1, TY, TZ))
    hx = T1 + 1.0
    g = Geo().capsule((T1 - 4.0, TY, TZ), (hx + HEAD_LEN * 0.4, TY, TZ), 1.2)
    rig.part("harpoon", g, I.IRON_DK, finish="metal", outline=0.6)
    tip = hx + HEAD_LEN
    pts = [(hx + HEAD_LEN * 0.35, TZ + 1.2), (hx + HEAD_LEN * 0.15, TZ + 5.2), (hx + HEAD_LEN * 0.55, TZ + 2.0),
           (tip, TZ), (hx + HEAD_LEN * 0.55, TZ - 2.0), (hx + HEAD_LEN * 0.15, TZ - 5.2),
           (hx + HEAD_LEN * 0.35, TZ - 1.2)]
    g = Geo().slab(pts, TY, 2.4)
    rig.part("harpoon", g, I.IRON_LT, finish="metal", outline=0.8)
    # the reel under the barrel, just ahead of the shoulder, with a crank the near hand can reach
    rx, rz = REEL
    g = Geo().lathe([(0, -3.4), (6.0, -3.4), (6.6, -2.6), (5.2, -1.8), (5.2, 1.8), (6.6, 2.6), (6.0, 3.4), (0, 3.4)],
                    (rx, TY, rz), (rx, TY - 1, rz), segs=22)
    rig.part("tube", g, I.IRON_DK, finish="metal", outline=0.7)
    g = Geo().lathe([(5.3, -1.7), (5.7, 0), (5.3, 1.7)], (rx, TY, rz), (rx, TY - 1, rz), segs=22)
    rig.part("tube", g, I.CREAM, finish="hair", outline=0.4)
    g = Geo().capsule((rx, TY, rz + 2.0), (rx, TY, TZ - TR), 1.2)
    rig.part("tube", g, I.IRON, finish="metal", outline=0.4)
    rig.joint("crank", "tube", (rx, TY - 4.0, rz))
    g = Geo().capsule((rx, TY - 4.0, rz), (rx + CRANK_R, TY - 4.2, rz), 1.0)
    g.sphere((rx, TY - 4.0, rz), 1.6, cuts=2)
    g.capsule((rx + CRANK_R, TY - 4.2, rz), (rx + CRANK_R, TY - 7.4, rz), 1.4)
    rig.part("crank", g, I.WOOD_LT, outline=0.5)
    # the cable snaking out after the harpoon on the shot (hidden)
    rig.joint("cable", "tube", (T1 + 2.0, TY, TZ), hidden=True)
    g = Geo()
    pts = [(T1 + 2.0 + 3.0 * k, TY - 0.5, TZ + 2.6 * math.sin(k * 1.1) * min(1.0, k / 3.0)) for k in range(15)]
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, 0.9)
    rig.part("cable", g, I.CREAM, finish="hair", outline=0.5)
    # the rope from the breech back to the coil
    g = Geo()
    rpts = [(T0 + 2.0, TY + 2.0, TZ - 2.0), (T0 - 2.0, TY + 6.0, TZ - 6.0), (-10.0, -2.0, 28.0)]
    for a, b in zip(rpts, rpts[1:]):
        g.capsule(a, b, 0.8)
    rig.part("tube", g, I.CREAM_DK, outline=0.4)
    rig.track("muzzle", "tube", MUZZLE)
    I.muzzle_flash(rig, "tube", (T1 + 3, TY, TZ), size=1.4)
    rig.joint("smoke", "root", (T1 + 14, -20, TZ + 4), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 5.2), (6, 3, 4.2), (-4, 6, 4.0), (3, 8, 3.4), (10, -1, 3.2)):
        g.sphere((T1 + 14 + dx, -20, TZ + 4 + dz), r, cuts=4)
    rig.part("smoke", g, I.SMOKE, finish="dust", outline=0.8)
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry
        _damage_spots(rig)


def _jacket_detail(rig):
    """W3: the pea jacket as worn wool (rigs_industrial.jacket's surfaces rebuilt for the ray casts)."""
    body = Geo().blob((0, 0, 28.0), (10.6, 9.6, 11.6), p=2.4, taper=(1.08, 0.94))
    body.blob((0, 0, 18.4), (10.4, 9.6, 4.6), p=2.6)
    tface = F.Face(rig, "torso", [body])
    IW.folds(rig, "torso", tface, [[(-9.4, 31.4), (-4.0, 33.4), (2.0, 34.0)], [(-8.0, 30.8), (-7.6, 24.0),
                                                                              (-7.2, 22.6)]], w=1.1, team=True)
    skirt = Geo().blob((0.5, 0, 15.8), (11.4, 10.4, 5.8), p=2.6, taper=(1.1, 1.0))
    skirt.clip((0, 0, 13.0), (0, 0, -1))
    hface = F.Face(rig, "hips", [skirt])
    IW.panel(rig, "hips", hface, [(-6.4, 18.2), (-1.0, 18.0), (-1.2, 15.8), (-6.2, 16.0)], team=True)
    IW.rivets(rig, "hips", hface, [(-3.7, 16.6)], r=0.85, fill=I.BRASS_LT)
    IW.folds(rig, "hips", hface, [[(-10.8, 14.0), (-4.0, 13.6), (4.0, 13.6), (10.6, 14.0)]], w=1.5, team=True)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, soldier; never on the face or skin), measured in the posed frames: the
    jacket's back (the biggest team field the gun and the arms leave clear, r 7.5), the barrel's team sleeve, the
    near sleeve, the cap, a strip torn from the jacket's hem."""
    rig.damage_spot_at("jacket", "torso", -4.4, 26.0, 7.5, "cloth", team=True)
    rig.damage_spot_at("barrel", "tube", 0.0, 34.0, 5.0, "metal", team=True)
    rig.damage_spot_at("sleeve", "arm_r", -1.0, 33.0, 5.0, "cloth", team=True)
    rig.damage_spot_at("cap", "head", -4.0, 62.0, 5.0, "cloth", fill=KNIT)
    rig.damage_spot_at("hem", "hips", -3.0, 13.4, 7.0, "cloth", kind="strip", team=True)


def _world(p, deg, dx, dz):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    x, z = p[0] - PIVOT[0], p[1] - PIVOT[2]
    return (PIVOT[0] + dx + x * c - z * s, PIVOT[2] + dz + x * s + z * c)


def aim(deg, dx=0.0, dz=0.0, crank=None):
    """Gun pointing `deg` (pivot shifted dx, dz); the far hand on the front grip, the near hand
    on the pistol grip, or (crank = angle) on the reel crank's knob."""
    pose = {"tube": {"r": deg, "x": dx, "z": dz}}
    if crank is None:
        gx, gz = _world((GRIP[0], GRIP[2]), deg, dx, dz)
        a, f = I.ik2(I.SH, (gx - 0.4, gz + 0.8))
    else:
        rx, rz = REEL
        ang = math.radians(crank)
        kx, kz = rx + CRANK_R * math.cos(ang), rz + CRANK_R * math.sin(ang)
        gx, gz = _world((kx, kz), deg, dx, dz)
        a, f = I.ik2(I.SH, (gx - 0.4, gz + 0.4))
        pose["crank"] = {"r": crank}
        pose["arm_r_y"] = None
    pose.update(I.arm("r", a, f))
    if pose.pop("arm_r_y", 0) is None:     # bring the cranking arm in front of the barrel
        pose["arm_r"]["y"] = -7.0
    fx_, fz = _world((FORE[0], FORE[2]), deg, dx, dz)
    a, f = I.ik2(I.SH, (fx_ - 0.6, fz))
    pose.update(I.arm("l", a, f))
    return pose


STANCE = merge(aim(9.0), {"hips": {"z": -0.5}})


def _idle(f):
    # the gun rests on the shoulder; he gives the reel a lazy half turn (2-4), weight shift, blink
    turn = [0.0, 0.0, 60.0, 150.0, 210.0, 0.0][f]

    def extra(ctx):
        return {"tube": {"r": 1.5 * ctx["lag"]}}
    base = merge(aim(9.0, crank=turn if 0 < f < 5 else None), {"hips": {"z": -0.5}})
    pose = M.idle_v2(f, base, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)
    if f in (2, 3, 4):
        pose = merge(pose, {"head": {"r": -4.0}, "pupils": {"z": -0.6}})
    return KI.ground_feet(RIG, pose, LEGS)


# -- walk v3: G1 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 77 ms --------------
SPEED = 81.25
LEGS = KI.legs_ik()
GAIT = KI.jog_gait(LEGS, SPEED, cycle_ms=616)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(aim(9.0 - 3.0 * lag, dz=0.8 * lag), {"apron": {"r": 5 * lag}})
    return M.walk_v3(RIG, f, {}, GAIT, legs=LEGS, lean=-7.0, twist=5.0, nod=3.0, extra=extra, report=report)


# 11 unique frames in 824 ms; the shot on frame 4 at 291 ms (impactAt 0.3532, as shipped). The shipped
# 171 ms hold is split into the aim (111) and a wobble partner (60) for the holdLoop.
ATTACK_MS = [50, 70, 111, 60, 70, 90, 70, 70, 70, 80, 83]
ATTACK_IMPACT = 4
U_OF = [0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9]     # unique frame -> row of the pose tables below
#       brace aim HOLD FIRE kick crank crank crank seat settle
DEG = [4.0, 1.0, 0.0, 0.0, 16.0, 6.0, 6.0, 6.0, 9.0, 9.0]
DX = [0.0, 0.6, 1.0, 1.0, -3.5, -1.5, -1.0, -0.8, -0.3, 0.0]
DZ = [-0.5, 0.0, 0.0, 0.0, 1.2, -0.6, -0.6, -0.6, 0.0, 0.0]
CRANK = [None, None, None, None, None, 90.0, 270.0, 450.0, None, None]
BX = [0.0, 0.8, 1.2, 0.0, -5.0, -3.0, -2.5, -2.0, -1.0, 0.0]
BQ = [-0.05, -0.07, -0.09, 0.03, -0.12, -0.02, -0.04, -0.02, 0.0, 0.0]
HZ = [-2.0, -2.4, -3.0, -3.0, -3.4, -1.6, -1.6, -1.6, -0.8, -0.5]
TRS = [-3, -4, -6, -6, 5, 2, 3, 2, 0, 0]


# aimed shots (queue item 44, ageborn_art/aimed.py): a turn of `turn` degrees up tips the gun up on his shoulder
# (about its shoulder pivot), leans him back under it and tips his head up; the arms follow the grips (aim()).
# The torso carries the gun, so its lean is part of the turn.
AIM_LEAN = 0.2            # torso r per degree of turn (positive leans back)
AIM_HEAD = 0.3            # head r per degree, on top of the torso's lean
#        brace aim HOLD wob FIRE kick crank crank crank seat settle
AIM_W = [0.0, 0.5, 1.0, 1.0, 1.0, 0.8, 0.5, 0.3, 0.15, 0.0, 0.0]
#          A    drop HOLD wob FIRE stag crank crank rise  A    A
AIM_W_B = [0.0, 0.4, 1.0, 1.0, 1.0, 1.0, 0.7, 0.5, 0.25, 0.0, 0.0]


def _attack_pose(f, turn=0.0):
    wob = f == 3
    f = U_OF[f]
    lean = AIM_LEAN * turn
    pose = merge(aim(DEG[f] + (1.6 if wob else 0.0) + turn - lean, DX[f], DZ[f] + (0.6 if wob else 0.0),
                     crank=CRANK[f]), {
        "hips": {"z": HZ[f]},
        "torso": {"r": TRS[f] + lean},
        "head": {"r": [-3, -6, -9, -9, 4, -4, -4, -4, 0, 0][f] + AIM_HEAD * turn,
                 "x": [0, 0.6, 1.2, 1.2, 0, 0, 0, 0, 0, 0][f]},
        "thigh_r": {"r": [12, 15, 18, 18, 12, 10, 10, 10, 6, 2][f]},
        "shin_r": {"r": [-10, -12, -16, -16, -12, -8, -8, -8, -4, 0][f]},
        "thigh_l": {"r": [-14, -16, -20, -20, -24, -14, -14, -14, -8, -4][f]},
        "shin_l": {"r": [-6, -8, -10, -10, -10, -8, -8, -8, -4, 0][f]},
        "flash": {"show": f == 3},
        "harpoon": {"hide": f in (3, 4, 5, 6, 7)},
        "cable": {"show": f in (3, 4), "sx": [1, 1, 1, 1.0, 1.35, 1, 1, 1, 1, 1][f]},
        "smoke": {"show": f in (4, 5), "s": [1, 1, 1, 0.7, 1.0, 1.25, 1, 1, 1, 1][f],
                  "x": [0, 0, 0, 0, 3, 7, 0, 0, 0, 0][f], "z": [0, 0, 0, 0, 1, 5, 0, 0, 0, 0][f]},
        "apron": {"r": [0, 0, 0, 0, 8, 0, 0, 0, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=BX[f], q=BQ[f]))
    if f in (1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif f in (3, 4):
        pose = merge(pose, F.expr("yell", "squeeze"))
    elif f in (5, 6, 7):
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_clip():
    ov = {
        4: [{"kind": "burst", "joint": "tube", "point": MUZZLE, "r0_lu": 9.0, "r1_lu": 15.0, "n": 6,
             "a0": -70.0, "arc": 140.0},
            {"kind": "dust", "ground": (-14.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 51, "spread": 0.8,
             "dir": -1.0}],
        5: [{"kind": "dust", "ground": (-18.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 52, "spread": 1.1,
             "dir": -1.0}],
        6: [{"kind": "rings", "joint": "crank", "point": (REEL[0], TY - 4.0, REEL[1]), "radii_lu": (8.0,),
             "a0": 200.0, "a1": 340.0, "color": "#FFF4D6"}],
        7: [{"kind": "arc", "joint": "crank", "inner": (REEL[0], TY - 3.6, REEL[1]),
             "outer": (REEL[0] + CRANK_R + 1.0, TY - 5.0, REEL[1]), "color": I.WOOD_LT, "white": 0.4,
             "band": 0.45, "taper": 0.3, "lines": 1, "from": 6, "t0": 0.0, "t1": 1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], ATTACK_MS, impact=ATTACK_IMPACT,
                  overlays=ov, extra={"holdStep": 2, "holdLoop": [2, 3]})


# -- attack B: kneeling braced shot --------------------------------------------------------------
# unique frames: 0 = A brace, 1 drop, 2 HOLD (on one knee, the gun angled up on his shoulder),
# 3 wobble (holdLoop), 4 FIRE, 5 stagger (the kick rocks him back onto his heel), 6-7 cranks the
# reel, 8 rising (a fresh harpoon seated), 9 = A seat, 10 = A settle
#        drop HOLD wob  FIRE stag crank crank rise
KB_DROP = [7.0, 14.0, 14.0, 14.0, 12.5, 14.0, 14.0, 6.0]
KB_DEG = [10.0, 12.0, 13.6, 12.0, 20.0, 14.0, 14.0, 10.0]
KB_DX = [0.4, 1.0, 1.0, 1.0, -4.0, -1.5, -1.5, -0.5]
KB_DZ = [-0.4, 0.0, 0.6, 0.0, 2.0, -0.4, -0.4, 0.0]
KB_CRANK = [None, None, None, None, None, 120.0, 330.0, None]
KB_BX = [0.4, 1.0, 1.0, 0.0, -6.0, -3.0, -2.5, -1.0]
KB_BR = [0, 0, 0, 0, 6, 3, 3, 0]
KB_BQ = [-0.04, -0.07, -0.07, 0.03, -0.10, -0.02, -0.03, 0.0]
KB_TR = [-4, -6, -6, -6, 8, 0, 1, -2]
KB_HR = [-4, -8, -9, -8, 8, -4, -4, 0]
KB_FRONT = [8.0, 12.5, 12.5, 12.5, 14.0, 12.5, 12.5, 7.0]


def _b_pose(i, turn=0.0):
    if i in (0, 9, 10):
        return _attack_pose(i, turn)
    k = i - 1
    lean = AIM_LEAN * turn
    pose = merge(aim(KB_DEG[k] + turn - lean, KB_DX[k], KB_DZ[k], crank=KB_CRANK[k]), {
        "torso": {"r": KB_TR[k] + lean},
        "head": {"r": KB_HR[k] + AIM_HEAD * turn, "x": 1.2 if k in (1, 2) else 0.0},
        "flash": {"show": k == 3},
        "harpoon": {"hide": k in (3, 4, 5, 6)},
        "cable": {"show": k == 3},
        "smoke": {"show": k in (4, 5), "s": [1, 1, 1, 1, 1.0, 1.25, 1, 1][k], "x": [0, 0, 0, 0, 3, 7, 0, 0][k],
                  "z": [0, 0, 0, 0, 1 - KB_DROP[k], 5 - KB_DROP[k], 0, 0][k]},
        "apron": {"r": [0, 0, 0, 0, 10, 0, 0, 0][k]},
    }, M.body_about((0, 0, 14), x=KB_BX[k], r=KB_BR[k], q=KB_BQ[k]))
    pose = KI.kneel(RIG, pose, LEGS, drop=KB_DROP[k], front=KB_FRONT[k])
    if k in (1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in (3, 4):
        pose = merge(pose, F.expr("yell", "squeeze"))
    elif k in (5, 6):
        pose = merge(pose, F.expr("grit"))
    return pose


def _attack_b():
    ov = {
        4: [{"kind": "burst", "joint": "tube", "point": MUZZLE, "r0_lu": 9.0, "r1_lu": 15.0, "n": 6,
             "a0": -50.0, "arc": 140.0},
            {"kind": "dust", "ground": (-10.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 53, "spread": 0.8,
             "dir": -1.0}],
        5: [{"kind": "dust", "ground": (-16.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 54, "spread": 1.1,
             "dir": -1.0}],
        7: [{"kind": "arc", "joint": "crank", "inner": (REEL[0], TY - 3.6, REEL[1]),
             "outer": (REEL[0] + CRANK_R + 1.0, TY - 5.0, REEL[1]), "color": I.WOOD_LT, "white": 0.4,
             "band": 0.45, "taper": 0.3, "lines": 1, "from": 6, "t0": 0.0, "t1": 1.0}],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 2, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 10 * a}, "tube": {"r": 10 * a},
                "thigh_r": {"r": 20 * max(a, 0)}, "shin_r": {"r": -24 * max(a, 0)},
                "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(aim([20, 40, 60, 40, -40, -80, -85, -90, -90, -90][k]), M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    attack, attack_b = _attack_clip(), _attack_b()
    # aimed up about 45 and 70 degrees at flyers (the Harpoon Gunner hits air; they go to the extras sheet)
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
    ] + aimed_a + aimed_b
    return M.check_variants(M.check_contract(cl, attack_ms=824, attack_impact_at=0.3532))
