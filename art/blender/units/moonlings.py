"""Moonlings: Cosmic Age common ranged, Trio (CONTENT_PLAN 5.8, X0 M1 squad of 3). Little moon aliens that hop
and spit glowing pellets, ~62 lu (the card trains three; the sheet is one Moonling, played desynchronised).

Look (A11, Cosmic palette): a round moon-grey alien head with dark crater spots, two big cartoon eyes and a
wide mouth, two antennae with mint bulbs that bob on follow-through; a stubby team space suit with a star-white
collar ring, belt and the pale Cosmic star, a small violet air pack with a mint light, star-white gloves and
violet boots with team cuffs.

"A viewer expects a little alien gremlin: a bouncy waddle, then it puffs its cheeks, hops and spits a glowing
pellet."

Animation (ANIM_SPEC G1 bouncy jog at card 65 x 1.25 = 81.25 lu/s, appendix B throwers/spitters; the sim fires
every 1.0 s):
  idle      bobs on its feet, the antennae wobble, looks around, a blink
  walk      walk v3 bouncy waddle: a big bob, a side sway, the arms flapping, the antennae trailing
  attack    HOP SPIT: squats, puffs its cheeks (the held extreme), hops up leaning forward and spits a pellet
            from the mouth (a mint flash), lands
  attack_b  LEAN-BACK SPIT: leans far back with the head tipped up and the cheeks puffed (the held extreme),
            then snaps forward from the hips and spits low
  hit       light: the head snaps back, eyes squeezed, the antennae whip
  die       D1 fling and spin, X eyes and the tongue out

W4 (the detail standard): the moon head as stone with more craters and their lit rims, the team suit's seams
(team-dark), a buckle on the belt, the air pack's bands, the pads' ridges, the legs' creases, team shin bands and boot
seams; beast damage spots (scuffs on the suit and the head, a breath puff). Aimed at flyers (queue item 44): both
spits up about 45 and 70 degrees, hand-posed like W2's Friar (kit_bronze_detail.aimed_hand: a spit has no measured
weapon, so the turn is solved on the head's facing at the release); aimdata.SPEC gives the variants their aimDeg.
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import face as FC
from ageborn_art import kit_bronze_detail as KD
from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_cosmic_wave as CW
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_medieval as KM
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import futcos_w4 as FW

SLUG = "moonlings"
GAIT_NAME = "biped"
NAME = "Moonling"
HEIGHT_LU = 64
CANVAS = (280, 240)
FEET = (120, 210)
ANCHORS = {"head": (2, 62), "hitCenter": (0, 30), "muzzle": (16, 44)}
NO_RETIME = True

# W4 detail standard (look.py): the lifts; the moon head as stone (its craters)
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 0.5
LOOK_SHADE = FW.SHADE_SOLDIER
LOOK_RIM = dict(FW.RIM_SOLDIER, lift=0.42)
MOON_LT = "#E6E2EE"                 # a crater's lit rim
MATERIAL_KINDS = FW.kinds_cosmic({CW.MOON: "stone", CW.MOON_DK: "stone", MOON_LT: "stone"})

HEAD_C = (2.0, 0.0, 49.0)
MOUTH = (14.6, -3.0, 44.0)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KC.skeleton_v3(rig, head=(1, 0, 38))
    KC.legs_v3(rig, team_shin=True, knee=None, thigh_r=4.2)
    K.arm_parts(rig, "l", sleeve=CW.VOID, bracer=None, glove=CW.STAR, r0=3.6, r1=3.2, fist=3.8)
    # the stubby team suit with a star-white collar and belt, the pale star, a violet air pack
    g = Geo().blob((0, 0, 28.0), (10.6, 10.0, 11.6), p=2.3, taper=(1.05, 0.95))
    cf = FC.Face(rig, "torso", [g])
    star = KC.starmark(cf, Geo(), KM.scr(cf, (6.0, -8.0, 28.0)), s=0.9)
    rig.part("torso", star, KC.STAR_PALE, highlight=False, outline=0)
    rig.part("torso", g, team=True)
    g = Geo().blob((0.4, 0, 20.2), (10.8, 10.4, 2.2), p=3.4)
    rig.part("torso", g, CW.STAR, finish="gloss", outline_hex=CW.STAR_TRIM)
    g = Geo().blob((0, 0, 17.0), (9.6, 9.4, 4.0), p=2.6)
    rig.part("hips", g, team=True)
    g = Geo().lathe([(8.2, -1.0), (9.4, -0.6), (9.4, 0.8), (8.0, 1.2)], (1.0, 0, 37.6), (1.0, 0, 40.0), segs=24)
    rig.part("torso", g, CW.STAR, finish="gloss", outline_hex=CW.STAR_TRIM)
    g = Geo().blob((-11.2, 0, 29.0), (3.8, 6.4, 6.4), p=3.4)
    rig.part("torso", g, CW.VIOLET_DK, finish="gloss")
    g = Geo().sphere((-14.4, -3.0, 31.0), 1.6, cuts=3)
    rig.part("torso", g, glow=CW.MINT, outline=0.6, outline_hex=CW.VOID)
    # the moon head: grey, craters, the cartoon face, two antennae
    head = Geo().blob(HEAD_C, (12.6, 12.0, 12.4), p=2.2)
    face = KM.face2(rig, [head], CW.MOON, 10.6, 51.0, eye_dy=(-7.4, 1.6), eye_r=(4.0, 3.8, 5.0),
                    pupil_r=(1.7, 2.6, 2.9), brow=CW.MOON_DK, brow_angry=False, mouth_w=7.0, mouth_dz=-7.0,
                    mouth_shape="smile")
    rig.part("head", head, CW.MOON, outline_hex=CW.MOON_DK)
    g = Geo()
    for x, y, z, r in ((-6.0, -9.0, 56.0, 2.2), (-1.0, -11.0, 44.0, 1.6), (-8.0, -7.0, 45.0, 1.4), (3.0, -6.0, 60.0, 1.6)):
        g.blob((x, y, z), (r, 1.0, r), p=2.4)
    rig.part("head", g, CW.MOON_DK, outline=0)
    for i, (y, lean) in enumerate(((-4.0, 10.0), (5.0, -14.0))):
        rig.secondary(f"ant{i}", "head", (-1.0, y, 60.0), (-4.0 + lean * 0.3, y, 72.0), max_deg=24, gain=1.5)
        g = Geo().capsule((-1.0, y, 60.0), (-3.0 + lean * 0.25, y, 70.0), 0.9)
        rig.part(f"ant{i}", g, CW.MOON_DK, outline=0.6)
        g = Geo().sphere((-3.2 + lean * 0.25, y, 71.4), 2.2, cuts=3)
        rig.part(f"ant{i}", g, glow=CW.MINT, outline=0.8, outline_hex="#1C8A6A")
    # puffed cheeks (shown on the held extreme) and the pellet in the mouth
    rig.joint("cheeks", "head", (12.0, -4.0, 45.0), hidden=True)
    g = Geo().blob((10.6, -6.0, 45.6), (4.6, 3.6, 4.2), p=2.2)
    rig.part("cheeks", g, CW.MOON, outline_hex=CW.MOON_DK)
    g = Geo().blob((12.6, -8.4, 46.6), (1.6, 0.6, 1.0), p=2.4)
    rig.part("cheeks", g, "#E9B9D6", outline=0, highlight=False)
    rig.track("muzzle", "head", MOUTH)
    K.star_burst(rig, "head", (MOUTH[0] + 1.0, MOUTH[1], MOUTH[2]), size=0.8, name="flash")
    K.arm_parts(rig, "r", sleeve=CW.VOID, bracer=None, glove=CW.STAR, r0=3.6, r1=3.2, fist=3.8)
    for s in ("r", "l"):
        y = K.ARM_Y[s]
        g = Geo().blob((0.4, y, 35.2), (5.9, 5.4, 4.9), p=2.6)
        rig.part(f"arm_{s}", g, team=True, outline=0.6)
    _detail(rig)
    if getattr(rig, "skin", None) is None:
        _damage_spots(rig)
    return face


def _detail(rig):
    """W4: more craters on the moon head with lit rims; the suit's team-dark seams; a buckle on the belt; the air pack's
    bands; the near pad's ridge; the legs' creases, team shin bands and boot seams (char space; decals cast)."""
    from ageborn_art import rigs_cosmic as RC
    hr = (12.6, 12.0, 12.4)
    hf = FC.Face(rig, "head", [Geo().blob(HEAD_C, hr, p=2.2)])
    # (r41) the new craters seated on the head's camera side (r31c's two at its back edge floated off it) and every
    # crater's lit rim laid on the head's surface over its upper edge (r31c cast them at the craters' depth: past the
    # head's edge they fell to the y = 0 plane, 38 missed samples)
    craters = ((-4.2, 50.6, 1.5), (-9.4, 52.0, 1.0), (1.0, 54.6, 0.9), (-3.2, 59.4, 0.9))
    g = Geo()
    for x, z, r in craters:
        g.blob((x, KD.blob_y(HEAD_C, hr, x, z, p=2.2) + 0.3, z), (r, 1.0, r), p=2.4)
    rig.part("head", g, CW.MOON_DK, outline=0)
    rims = []
    for x, z, r in craters + ((-6.0, 56.0, 2.2), (3.0, 60.0, 1.6), (-8.0, 45.0, 1.4), (-1.0, 44.0, 1.6)):
        rims.append([FW.on_blob(hf, HEAD_C, hr, x + (r + 0.5) * math.cos(math.radians(a)),
                                z + (r + 0.5) * math.sin(math.radians(a)), p=2.2) for a in (150, 110, 70, 30)])
    FW.panel_lines(rig, "head", hf, rims, fill=MOON_LT, w=0.6)
    sf = FC.Face(rig, "torso", [Geo().blob((0, 0, 28.0), (10.6, 10.0, 11.6), p=2.3, taper=(1.05, 0.95))])
    FW.folds(rig, "torso", sf, [[FW.sc(sf, -4.4, 36.0, -8.8), FW.sc(sf, -5.0, 29.0, -9.6), FW.sc(sf, -4.4, 22.6, -9.2)],
                                [FW.sc(sf, -8.6, 31.4, -5.6), FW.sc(sf, -1.0, 32.6, -9.8), FW.sc(sf, 2.6, 32.4, -9.6)]],
             w=0.8, team=True)
    g = Geo().blob((10.4, -4.0, 20.2), (1.4, 2.2, 1.9), p=3.0)
    rig.part("torso", g, CW.STAR_TRIM, finish="metal", outline=0.5)
    for z in (25.6, 32.4):
        FW.band(rig, "torso", (-11.2, 0, 29.0), (3.8, 6.4, 6.4), 3.4, z, z + 0.7, fill=FW.LINE_ON_VIOLET)
    y = K.ARM_Y["r"]
    padf = FC.Face(rig, "arm_r", [Geo().blob((0.4, y, 35.2), (5.9, 5.4, 4.9), p=2.6)])
    FW.folds(rig, "arm_r", padf, [[FW.sc(padf, -3.6, 36.6, y - 4.6), FW.sc(padf, 0.4, 38.0, y - 5.0),
                                   FW.sc(padf, 4.4, 36.6, y - 4.6)]], w=0.75, team=True)
    for s in ("r", "l"):
        y = RC.LEG_Y * RC.SIDE_Y[s]
        th = FC.Face(rig, f"thigh_{s}", [Geo().capsule((0, y, KM.V3_THIGH_Z + 0.5), (0.5, y, KM.V3_KNEE_Z), 4.6, 4.1)])
        FW.folds(rig, f"thigh_{s}", th, [[FW.sc(th, -2.4, 14.4, y - 4.4), FW.sc(th, 0.4, 13.6, y - 4.6),
                                          FW.sc(th, 3.0, 14.6, y - 4.2)]], w=0.8, team=False, fill=FW.FOLD_ON_VOID)
        FW.band(rig, f"shin_{s}", (1.9, y, 8.8), (3.4, 4.2, 2.8), 2.6, 6.6, 7.3, team=True)
        FW.band(rig, f"foot_{s}", (2.8, y, 2.4), (4.4, 4.7, 2.5), 2.9, 3.0, 3.6, fill=FW.LINE_ON_VIOLET, taper=(1.02, 0.84))


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, beast: scuffs, a torn suit, no blood; a breath puff when tired): the
    near team pad, the team hips, the moon head behind the eyes, the air pack; breath at the mouth. (r31b: the team
    suit's mark went to the near pad: at z 27 the near arm covered it on the walk and the throws, 60%, and at z 33
    the pad itself, 0%.)"""
    y = K.ARM_Y["r"]
    rig.damage_spot("pad", "arm_r", (0.4, y - 5.2, 34.4), 5.0, "cloth", team=True, normal=(0, -1, 0))
    rig.damage_spot("hips", "hips", (-2.0, -9.2, 16.0), 5.0, "cloth", kind="strip", team=True, normal=(0, -1, 0))
    rig.damage_spot("head", "head", (-7.0, -9.0, 50.0), 5.0, "hide", normal=(-0.4, -0.9, 0.2))
    rig.damage_spot("pack", "torso", (-12.4, -5.4, 29.0), 5.0, "metal", normal=(-0.5, -0.9, 0))
    rig.damage_spot("breath", "head", MOUTH, 3.5, "breath", kind="emit", normal=(0.8, -0.4, 0.2))


def arms(r=(-70, -40), l=(-90, -60)):
    return merge(K.arm("r", *r), K.arm("l", *l))


STANCE = merge(arms((-75, -50), (-100, -70)), {"torso": {"r": -2.0}})


def _idle(f):
    def extra(ctx):
        return {"head": {"rz": [0, 8, 14, 8, 0, -6][f]}, "arm_r": {"r": 4 * ctx["lag"]}, "arm_l": {"r": -4 * ctx["lag"]}}
    pose = M.idle_v2(f, STANCE, frames=6, bob=1.8, chest=0.04, extra=extra, blink=4, face_blink=FC.expr("blink"))
    return KI.ground_feet(RIG, pose, LEGS)


SPEED = 81.25
LEGS = KC.legs_ik()
GAIT = KC.jog_gait(LEGS, SPEED, cycle_ms=600, stance=0.52, lift=5.0)
BOUNCE = [-3.6, -4.4, -0.4, 3.0]


def _walk(f, report=None):
    def extra(ctx):
        c = math.cos(ctx["lag_p"])
        return merge(arms((-60 + 24 * c, -20 + 20 * c), (-60 - 24 * c, -20 - 20 * c)),
                     {"head": {"rx": -4 * math.sin(ctx["p"])}, "body": {"rx": 4 * math.sin(ctx["p"])}})
    return M.walk_v3(RIG, f, {"torso": {"r": -2.0}}, GAIT, legs=LEGS, bob=BOUNCE, lean=-6.0, twist=5.0, nod=4.0,
                     sway=5.0, extra=extra, report=report)


# -- attack: hop spit (700 ms, the pellet leaves at 350 ms = 0.5) -----------------------------------
ATTACK_MS = [50, 70, 100, 130, 100, 90, 80, 80]
ATTACK_IMPACT = 4
A_Z = [0.0, -4.0, -5.5, -6.0, 5.0, 3.0, 0.0, 0.0]
A_Q = [0.0, -0.08, -0.12, -0.14, 0.10, 0.04, -0.06, 0.0]
A_T = [-2, -8, -10, -10, -20, -14, -6, -2]
A_HD = [0, 6, 10, 12, -8, -4, 0, 0]
A_TH = [0, 24, 34, 36, -6, 0, 10, 0]
A_SH = [0, -30, -44, -46, 0, -6, -16, 0]
A_ARM = [((-75, -50), (-100, -70)), ((-110, -80), (-120, -90)), ((-130, -100), (-130, -100)), ((-135, -105), (-135, -105)),
         ((-20, 10), (-30, 0)), ((-40, -10), (-50, -20)), ((-70, -40), (-90, -60)), ((-75, -50), (-100, -70))]
A_EXPR = [None, ("squeeze",), ("squeeze",), ("squeeze",), ("yell",), ("o",), None, None]


# aimed spits (queue item 44): a turn of `turn` degrees up leans the body back by AIM_LEAN of it and tips the head by
# the rest (the head's facing is the spit's line); the wind-up rises into the aim, the landing falls out of it
AIM_LEAN = 0.3
AIM_W = [0.0, 0.3, 0.6, 0.9, 1.0, 0.7, 0.3, 0.0]


def _a_pose(f, turn=0.0):
    pose = merge(arms(*A_ARM[f]), {
        "torso": {"r": A_T[f] + AIM_LEAN * turn}, "head": {"r": A_HD[f] + (1.0 - AIM_LEAN) * turn},
        "cheeks": {"show": f in (2, 3)},
        "flash": {"show": f == 4},
        "thigh_r": {"r": A_TH[f]}, "shin_r": {"r": A_SH[f]}, "thigh_l": {"r": A_TH[f] - 4}, "shin_l": {"r": A_SH[f]},
    }, M.body_about((0, 0, 24), x=[0, 0, -1, -1, 3, 2, 0.5, 0][f], z=A_Z[f], q=A_Q[f]))
    if A_EXPR[f]:
        pose = merge(pose, FC.expr(*A_EXPR[f]))
    if f in (4, 5):
        return pose
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_clip():
    ov = {3: CW.rings_fx("head", (10.6, -6.0, 45.6), (6.0, 8.5), CW.MINT_CORE, -60.0, 60.0),
          4: CW.fire_fx("head", MOUTH, CW.MINT_CORE, r=(5.0, 9.0), a0=-50.0) + CW.dust_fx(0.0, 391, size=4.0)}
    return M.clip("attack", [_a_pose(f) for f in range(8)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  extra={"holdStep": 3})


# -- attack B: lean-back spit ------------------------------------------------------------------------
B_T = [-2, 8, 18, 22, -22, -16, -6, -2]
B_HD = [0, 8, 16, 18, -12, -6, 0, 0]
B_BX = [0.0, -1.0, -2.0, -2.5, 3.0, 2.0, 0.5, 0.0]
B_ARM = [((-75, -50), (-100, -70)), ((-40, 0), (-50, -10)), ((-10, 30), (-20, 20)), ((0, 40), (-10, 30)),
         ((-100, -70), (-110, -80)), ((-90, -60), (-100, -70)), ((-75, -50), (-100, -70)), ((-75, -50), (-100, -70))]


def _b_pose(f, turn=0.0):
    if f in (0, 7):
        return _a_pose(f)
    pose = merge(arms(*B_ARM[f]), {
        "torso": {"r": B_T[f] + AIM_LEAN * turn}, "head": {"r": B_HD[f] + (1.0 - AIM_LEAN) * turn},
        "cheeks": {"show": f in (2, 3)}, "flash": {"show": f == 4},
        "thigh_r": {"r": [0, -6, -10, -12, 20, 14, 4, 0][f]}, "shin_r": {"r": [0, -6, -10, -10, -24, -16, -6, 0][f]},
        "thigh_l": {"r": [0, 10, 18, 20, -10, -6, -2, 0][f]}, "shin_l": {"r": [0, -10, -18, -20, -10, -6, -2, 0][f]},
    }, M.body_about((0, 0, 24), x=B_BX[f], z=[0, 0, -1, -1.5, -2.5, -1.5, 0, 0][f], q=[0, 0.03, 0.05, 0.06, -0.10, -0.04, 0, 0][f]))
    if A_EXPR[f]:
        pose = merge(pose, FC.expr(*A_EXPR[f]))
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_b():
    ov = {3: CW.rings_fx("head", (10.6, -6.0, 45.6), (6.0, 8.5), CW.MINT_CORE, -60.0, 60.0),
          4: CW.fire_fx("head", MOUTH, CW.MINT_CORE, r=(5.0, 9.0), a0=-80.0) + CW.dust_fx(14.0, 392, size=4.0)}
    return M.clip("attack_b", [_b_pose(f) for f in range(8)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse={0: ("attack", 0), 7: ("attack", 7)}, extra={"holdStep": 3})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a}, "arm_r": {"r": 30 * max(a, 0)}, "arm_l": {"r": 24 * max(a, 0)},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=FC.expr("squeeze", "grit"), face_back=FC.expr("o") if k == 2 else None)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=26.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 60 * flail + 20}, "arm_l": {"r": 110 * flail + 30},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    e = ("squeeze", "yell") if k == 0 else (("o",) if k < 4 else ("x", "tongue"))
    return merge(pose, FC.expr(*e))


def clips():
    attack, attack_b = _attack_clip(), _attack_b()
    # aimed up about 45 and 70 degrees at flyers (the extras sheet); a spit has no measured weapon, so the turn is
    # solved on the head's facing (+X) at the release (the impact frame)
    aimed = (KD.aimed_hand(RIG, attack, _a_pose, AIM_W, "head", (1.0, 0.0, 0.0)) +
             KD.aimed_hand(RIG, attack_b, _b_pose, AIM_W, "head", (1.0, 0.0, 0.0)))
    for v in aimed:
        AIMED.check_timing(attack_b if v.name.startswith("attack_b_") else attack, v)
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        attack,
        attack_b,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ] + aimed
    return M.check_variants(M.check_contract(cl, attack_ms=700, attack_impact_at=0.5))
