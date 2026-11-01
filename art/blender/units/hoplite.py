"""Hoplite: Bronze Age infantry (A17.9). Short spear, Shield Bash knockback, ~68 lu.

Look (A17.12): a stocky citizen-soldier in an open-faced polished-bronze helmet with cheek
guards and a tall team horsehair crest that trails back (follow-through), big eyes and an
angry brow under the rim, a curly black beard, a linen cuirass with a team band and team
pteruges, bronze greaves and laced sandals. A big round aspis with a team face, a riveted
polished rim and a sandstone lambda is carried on the near arm, so the unit reads as a
shield wall at a glance, and a short spear with a polished leaf head, a leather grip wrap
and a bronze butt spike is held in the far hand.

Animation (cartoon kit v2, `ageborn_art/moves.py`; a viewer expects a shield-and-spear man to
shove with the shield and stab over it):
  idle    taps the spear butt on the ground on the beat, weight shift, blink
  walk    walk v3 bounce jog at ground speed (ANIM_SPEC G1): the spear sloped back over the far
          shoulder, the shield swinging on the near forearm, planted feet
  attack_b  UNDERARM LOW THRUST: crouches behind the shield with the spear drawn back at the hip,
          then lunges and drives it low under the rim
  attack_c  OVERHEAD DOWNWARD DRIVE: steps in on his toes with the shield raised high and the
          spear point tilted steeply down from above the shoulder, then drives it down
  attack  SHIELD BASH, THEN OVER-THE-RIM STAB: ducks behind the shield, shoves it forward
          (dust, bash lines), rocks back with the spear cocked overhand by the ear (the held
          extreme), then drives the spear forward over the rim (streak smear, yell); impact on
          the stab, the spear overshoots and he recovers behind the shield
  hit     armoured: dips behind the shield, the helmet clanks down over his eyes
  die     D2 topple: a wobble, then he goes over backwards stiff as a plank; the helmet pops
          off, spins up and rolls away; X eyes and tongue
"""
import math

from ageborn_art import colors as CL
from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import kit_bronze_detail as KD
from ageborn_art import look
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "hoplite"
GAIT_NAME = "biped"
NAME = "Hoplite"
HEIGHT_LU = 68
CANVAS = (300, 250)
FEET = (132, 216)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

# the detail standard (art round W1, ageborn_art/look.py): the lifts and the model detail of audit 5.1 / 5.2.
# Most of the Hoplite a player sees is the aspis, the helmet and crest and the greaved legs, so the detail goes
# there: a team-dark ring band under the rivets (the team zone in two tones), a team-dark base on the crest, a
# tooled band and an incised scroll on the dome, team-dark tips on the pteruges, a socket binding on the spear
# and a xiphos scabbard that hangs below the shield and swings a frame late.
DETAIL_STANDARD = True
# a clearer light-to-shadow structure on skin, hair, linen and the shield (look.SHADE), as the pilot's soldiers
LOOK_SHADE = {"shadow": 0.84, "core": 0.18, "core_width": 0.30, "gradient": 2.0, "cavity": 0.6, "rim_mix": 0.5,
              "top": 0.08, "top_t": 0.62, "team_core": 0.4}
_FAR = lambda c: CL.scale(c, B.V3_FAR)        # noqa: E731 (sandal_legs_v3 darkens the far leg)
MATERIAL_KINDS = {B.SKIN: "skin", _FAR(B.SKIN): "skin", B.HAIR: "fur", B.PLUM: "cloth", B.LINEN: "cloth",
                  B.VERD: "bronze", B.VERD_DK: "cloth", _FAR(B.VERD_DK): "cloth", B.LEATHER: "leather",
                  _FAR(B.LEATHER): "leather", B.LEATHER_DK: "leather", _FAR(B.LEATHER_DK): "leather",
                  B.BRONZE: "bronze", _FAR(B.BRONZE): "bronze", B.BRONZE_HI: "bronze", B.AGED: "bronze",
                  B.AGED_DK: "bronze", B.PLUM_DK: "wood", B.SAND_LT: "ceramic", B.WOOD: "wood", B.WOOD_DK: "wood",
                  "team": "cloth"}

# Marble Hoplite (DESIGN A5.8, rare): a living marble statue with gilded trim, the same model. Marble for skin,
# hair, linen, leather and the spear (the "stone" kind: chips and fine cracks), pale gold for the bronze (under
# the colour rule's 0.38), a gilded lambda, and a gilded laurel wreath round the helmet in place of the tooled
# band; the crest, the shield face and the pteruges stay team.
WREATH = "#D9C690"        # gilded laurel (saturation 0.34)
MARBLE = {B.SKIN: "#E8E4DC", _FAR(B.SKIN): "#BAB6B0", B.HAIR: "#9A948A", B.LINEN: "#F2F0EA", B.PLUM: "#B3ADA4",
          B.PLUM_DK: "#958E85", B.LEATHER: "#A39B8E", _FAR(B.LEATHER): "#827C72", B.LEATHER_DK: "#857D71",
          _FAR(B.LEATHER_DK): "#6A645A", B.WOOD: "#C2BAAD"}
GILT = {B.VERD: "#CDBB86", B.VERD_DK: "#B09F70", _FAR(B.VERD_DK): "#8D7F5A", B.BRONZE: "#DCC793",
        _FAR(B.BRONZE): "#B09F76", B.BRONZE_HI: "#EADBB0", B.AGED: "#C8B88E", B.AGED_DK: "#9C8D69",
        B.SAND_LT: "#E6D5A2"}
SKINS = {"marble_hoplite": {
    "palette": dict(MARBLE, **GILT, **{B.PUPIL: "#3B3733"}),
    "kinds": dict({v: "stone" for v in MARBLE.values()}, **{v: "gold" for v in GILT.values()}, **{WREATH: "gold"})}}

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand (shield)
HL = (0.0, B.ARM_Y["l"], B.HAND_Z)   # far hand (spear), spear modelled pointing up (+Z)
FWD, BACK = 42.0, 18.0
HELM_C = (1.5, 0, 55.0)
TIP = (HL[0], HL[1] - 0.4, HL[2] + FWD)
SHIELD_C = (HR[0] + 1.0, HR[1] - 6.0, HR[2] + 3.0)
SHIELD_R, SHIELD_D, SHIELD_RIM = 13.4, 2.6, 1.3


def _aspis_band(rig, joint, c, r, depth, rim_w, r0, r1, lift=0.25):
    """A team-dark ring band on the aspis face between radii r0 and r1: a thin lathed shell that follows the
    face's bow (the face is an ellipsoid of radius r - rim_w bulging depth x 0.95 toward the camera, -Y)."""
    cx, cy, cz = c
    R, bulge = r - rim_w, depth * 0.95
    prof = []
    n = 6
    for i in range(n + 1):
        rho = r0 + (r1 - r0) * i / n
        d = bulge * math.sqrt(max(0.0, 1.0 - (rho / R) ** 2)) + lift
        prof.append((rho, d))
    # the edges tuck 0.6 lu back into the face; the end caps sit inside the face's volume
    prof = [(r0, prof[0][1] - 0.6)] + prof + [(r1, prof[-1][1] - 0.6)]
    g = Geo().lathe(prof, (cx, cy + 0.2, cz), (cx, cy - 0.8, cz), segs=36)
    look.team_part(rig, joint, g, outline=0)


def _helmet_detail(rig, joint, crest_joint, c=HELM_C):
    """A tooled band round the polished dome (a dark aged-bronze line 1.2 lu above the verdigris rim), an
    incised scroll on the near temple (the Chalcidian helmets' embossed volutes) and the crest's team-dark
    base."""
    cx, cy, cz = c
    if getattr(rig, "skin", None) == "marble_hoplite":
        _wreath(rig, joint, c)
    else:
        g = Geo().blob((cx + 0.1, cy, cz + 2.4), (12.55, 11.95, 0.6), p=2.8)
        rig.part(joint, g, B.AGED_DK, finish="metal", outline=0)
    dome = Geo().blob((cx, cy, cz), (12.4, 11.8, 10.2), p=2.4)
    KD.surface_line(rig, joint, dome, KD.volute((cx + 5.0, cz + 5.6), 0.9, 3.2, a0=200.0, tail=(1.2, -2.2)), 1.2,
                    B.AGED_DK)
    KD.crest_base(rig, crest_joint, c, crest_len=22.0, crest_h=10.0)


def _wreath(rig, joint, c=HELM_C):
    """The Marble Hoplite's gilded laurel wreath round the dome (16 leaf pairs of 4 x 2.2 lu, tilted up and down
    like a herringbone)."""
    cx, cy, cz = c
    g = Geo()
    n = 16
    for k in range(n):
        a = 2 * math.pi * (k + 0.5) / n
        x, y = cx + 0.1 + 12.75 * math.cos(a), cy + 12.15 * math.sin(a)
        for dz, tilt in ((1.1, -24.0), (-0.9, 24.0)):
            g.blob((x, y, cz + 2.4 + dz), (2.0, 0.75, 1.1), p=2.2, rot=(0, tilt, math.degrees(a) + 90))
    rig.part(joint, g, WREATH, finish="metal", outline=0.4)


def build(rig):
    global RIG
    RIG = rig
    B.skeleton_v3(rig)           # walk v3: longer legs, planted feet (ANIM_SPEC 2.0 rule 5)
    B.sandal_legs_v3(rig)

    # torso: plum tunic under a linen cuirass with a team band, verdigris trim; team pteruges
    g = Geo().blob((0, 0, 20.0), (10.6, 9.8, 6.0), p=2.4)
    rig.part("torso", g, B.PLUM)
    B.cuirass(rig, B.LINEN, trim=B.VERD, z=28.5)
    rig.secondary("hem", "hips", (0.5, 0, 17.0), (0.5, 0, 9.0), max_deg=10, gain=0.9)
    rig.rest_offset["hem"] = (0, 0, B.V3_LIFT + 0.6)        # hem >= 9 lu above the soles (the knees show)
    B.pteruges(rig, "hem", 17.2, None, team=True, n=8, radius=(11.2, 10.4), length=7.4)
    # team-dark tips on the pteruges (2.8 lu): the strips that show under the aspis read as a fringed skirt
    g = Geo()
    for k in range(8):
        a = math.pi * (0.55 + 1.9 * k / 7)
        g.blob((11.2 * math.cos(a) * 0.98, 10.4 * math.sin(a), 17.2 - 7.4 + 1.3), (2.95, 2.6, 1.45), p=3.0,
               rot=(0, 0, math.degrees(a) + 90))
    look.team_part(rig, "hem", g, outline=0.5)
    g = Geo().blob((0.5, 0, 20.2), (11.4, 10.6, 1.6), p=3.2)          # leather belt
    rig.part("torso", g, B.LEATHER_DK, outline=0.6)
    # a xiphos in a dark leather scabbard on the near hip (an aged bronze locket and a ball chape, a bone grip
    # and pommel); it hangs back below the aspis and swings a frame late
    rig.secondary("xiphos", "torso", (-3.4, -13.0, 20.6), (-9.0, -13.4, 9.6), max_deg=12, gain=1.2)
    g = Geo().capsule((-3.6, -13.0, 20.0), (-8.6, -13.4, 10.4), 2.1, 1.5)
    rig.part("xiphos", g, B.LEATHER_DK, outline=0.6)
    g = Geo().capsule((-3.3, -13.0, 20.8), (-4.1, -13.1, 18.8), 2.45)
    g.sphere((-9.1, -13.5, 9.5), 1.9, cuts=3)
    rig.part("xiphos", g, B.AGED, finish="metal", outline=0.5)
    g = Geo().capsule((-2.9, -12.9, 21.6), (-1.4, -12.8, 25.0), 1.15)
    rig.part("xiphos", g, B.LINEN, outline=0.5)
    g = Geo().capsule((-4.3, -13.0, 22.4), (-1.5, -13.0, 21.0), 1.0)
    g.sphere((-1.1, -12.8, 25.8), 1.5, cuts=3)
    rig.part("xiphos", g, B.AGED, finish="metal", outline=0.5)
    for s, y in (("r", -12.0), ("l", 11.5)):                          # linen shoulder guards
        g = Geo().blob((0.4, y, 37.0), (6.4, 5.6, 4.8), p=2.6)
        rig.part(f"arm_{s}", g, B.LINEN)
        g = Geo().blob((0.4, y, 34.6), (6.6, 5.8, 1.0), p=3.0)
        rig.part(f"arm_{s}", g, B.VERD_DK, outline=0.4)

    # head: face kit, curly beard, helmet (own joint: it clanks down on hits and pops off)
    beard = Geo()
    for x, y, z, r in ((11.6, -3.2, 40.4, 2.7), (12.8, 0.0, 39.4, 2.9), (11.6, 3.0, 40.4, 2.5),
                       (13.8, -1.2, 42.4, 1.9), (9.6, -5.6, 42.6, 2.4)):
        beard.blob((x, y, z), (r, r, r * 0.95), p=2.1)
    B.face_kit(rig, cx=13.4, cz=50.0, eye_r=(3.8, 3.4, 4.5), extra=[beard], mouth_z=44.8, mouth_w=5.0)
    rig.part("head", beard, B.HAIR, finish="hair")
    rig.joint("helm", "head", HELM_C)
    B.helmet(rig, joint="helm", crest_len=22.0, crest_h=10.0)
    _helmet_detail(rig, "helm", "crest")
    # the loose copy that pops off in the death (no follow-through: it tumbles as a whole)
    rig.joint("helm_loose", "root", HELM_C, hidden=True)
    B.helmet(rig, joint="helm_loose", crest_len=22.0, crest_h=10.0, crest_secondary=False)
    _helmet_detail(rig, "helm_loose", "helm_loose")

    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.1, r1=3.7)
    g = Geo().blob((0, B.ARM_Y["r"], B.HAND_Z + 3.4), (4.6, 4.6, 2.0), p=2.6)   # leather bracer
    rig.part("fore_r", g, B.LEATHER, outline=0.7)
    g = Geo().blob((0, B.ARM_Y["l"], B.HAND_Z + 3.4), (4.4, 4.4, 1.8), p=2.6)
    rig.part("fore_l", g, B.LEATHER, outline=0.7)

    # spear in the far hand, modelled pointing up from the fist, with a leather grip wrap
    rig.joint("spear", "hand_l", HL)
    tip = B.spear(rig, "spear", (HL[0], HL[1] - 0.4, HL[2]), fwd=FWD, back=BACK, r=1.25, head_len=11.0,
                  head=B.BRONZE_HI)
    g = Geo().capsule((HL[0], HL[1] - 0.4, HL[2] - 4.0), (HL[0], HL[1] - 0.4, HL[2] + 4.0), 1.75)
    # a leather binding at the head's socket (a dark band under the polished leaf)
    g.capsule((HL[0], HL[1] - 0.4, HL[2] + FWD - 13.4), (HL[0], HL[1] - 0.4, HL[2] + FWD - 10.8), 1.7)
    rig.part("spear", g, B.LEATHER_DK, outline=0.5)
    rig.track("spearTip", "spear", tip)

    # the aspis on the near hand: a big round team shield with a riveted rim, a team-dark ring band under the
    # rivets (the face in two tones; the lambda stays on the light centre)
    B.aspis(rig, "hand_r", SHIELD_C, r=SHIELD_R, depth=SHIELD_D, rim=B.BRONZE, rim_w=SHIELD_RIM, rivets=12)
    _aspis_band(rig, "hand_r", SHIELD_C, SHIELD_R, SHIELD_D, SHIELD_RIM, 8.4, 11.1)
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry (COMMON C1)
        _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40; art/blender/README.md, spot_preview.py): never on the face or skin. The aspis
    face (the largest camera-facing part) twice, the bronze helmet, the team crest (the linen corslet stays
    behind the raised aspis in every pose); a torn strip from the team hem. W0 milestone 7 (review A-S2): one
    big spot inside the lambda below the boss (the aspis is the largest surface the spear never covers) and a
    second on the face's upper right. W1: the helmet's dent moved back off the new scroll."""
    rig.damage_spot_at("shield", "hand_r", -3.0, 17.0, 9.0, "wood", team=True)
    rig.damage_spot_at("shield_high", "hand_r", 6.5, 25.0, 5.0, "wood", team=True)
    rig.damage_spot_at("helmet", "helm", -3.5, 60.5, 6.0, "metal", fill="#B8863B")
    rig.damage_spot_at("crest", "crest", -6.0, 77.0, 6.0, "hide", team=True)
    rig.damage_spot_at("hem", "hem", -10.0, 14.0, 8.0, "cloth", kind="strip", team=True)


# -- poses ---------------------------------------------------------------------------------
def shield(a, f, w=90.0):
    return B.arm("r", a, f, w, w_rest=90.0)


def spear(a, f, w):
    return B.arm("l", a, f, w, w_rest=90.0)


STANCE = merge(shield(-56, -18, 92), spear(-30, 50, 62), {"torso": {"r": -3}})
SPEAR_HAND_LESS = {k: v for k, v in STANCE.items() if k not in ("arm_l", "fore_l", "hand_l")}


def _idle(f):
    # the spear butt taps the ground on the beat: lifted on 1-2, dropped on 3 (a small dip)
    lift = [0.0, 0.6, 1.0, -0.5, 0.1, 0.0][f]

    def extra(ctx):
        return merge(spear(-30 + 8 * lift, 50 + 8 * lift, 62 + 3 * lift), {
            "body": {"sz": 1.0 - 0.02 * max(0.0, -lift)},
            "arm_r": {"r": -2 * ctx["lag"]}, "hand_r": {"r": 2 * ctx["lag"]},
            "helm": {"z": -0.4 * max(0.0, -lift)},
        })
    return M.idle_v2(f, SPEAR_HAND_LESS, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


# -- walk v3: G1 bounce jog at ground speed (card 70 x 1.25 = 87.5 lu/s), 8 x 77 ms --------------
RIG = None
SPEED = 87.5
LEGS = B.walk_legs_v3()
GAIT = B.jog_gait(SPEED, LEGS)
# walk carry: the spear trailed low in the far hand, point forward (the crest hides a shouldered
# spear), pumping with the far arm; the shield high on the near forearm, swinging a frame late


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        c = -math.cos(ctx["lag_p"])                  # +1 = the near (shield) arm forward
        a = -46 + 10 * c
        sa = -80 - 20 * c                            # the far (spear) arm swings against it
        return merge(shield(a, a + 74 + 6 * c, 92),
                     spear(sa, sa + 62 - 6 * c, 34 + 5 * c - 3 * lag),
                     {"helm": {"z": 0.35 * lag}})
    base = {k: v for k, v in STANCE.items() if k not in ("arm_r", "fore_r", "hand_r", "arm_l", "fore_l", "hand_l")}
    return M.walk_v3(RIG, f, base, GAIT, legs=LEGS, lean=-10.0, twist=6.0, nod=3.0, extra=extra,
                     report=report)


def _feet(pose, fr, fl, lr=0.0, ll=0.0, ar=0.0, al=0.0):
    """Planted feet by IK (near foot x, far foot x, lifts, foot angles)."""
    return B.plant(RIG, pose, LEGS, r=(fr, lr, ar), l=(fl, ll, al))


# 11 unique frames, moves.SMALL_MELEE_MS
#        read  dip  bash  HOLD smear lead  IMP  over recoil settle settle
S_A = [-12, -40, 55, 128, 80, 32, 8, 4, 22, -10, -26]
S_F = [58, 20, 125, 172, 70, 14, 0, -6, 40, 56, 52]
# spear direction in WORLD degrees (the torso lean is subtracted below)
S_WW = [50, 20, 15, 34, 10, 0, -9, -13, 5, 40, 58]
H_A = [-52, -38, -6, -36, -34, -30, -26, -26, -34, -46, -54]
H_F = [-16, -4, 10, -2, -4, -4, -2, -4, -8, -14, -18]
A_T = [-3, -8, -14, 14, 0, -12, -22, -24, -12, -6, -3]
A_H = [0, 4, 6, -6, -2, 6, 10, 10, 4, 1, 0]
A_Q = [-0.02, -0.12, -0.06, 0.1, 0.06, 0.02, -0.16, -0.12, -0.04, 0.02, 0.0]
A_X = [-0.5, -1.5, 4.0, -2.0, 3.0, 6.0, 9.0, 9.5, 6.0, 2.0, 0.5]
A_Z = [0.0, -2.6, -1.0, 1.4, 0.6, -0.6, -2.4, -2.0, -1.2, -0.3, 0.0]
# planted feet (ankle x): the near foot steps in with the bash and the stab, the far foot holds
A_FR = [2.0, 2.0, 8.0, 5.0, 9.0, 12.0, 15.0, 15.0, 11.0, 5.0, 2.5]
A_FL = [-2.0, -2.5, -1.5, -3.0, -1.0, 1.0, 3.5, 3.5, 1.0, -1.0, -2.0]
A_LR = [0, 0, 1.0, 2.5, 3.0, 1.0, 0, 0, 0, 0, 0]


def _attack_pose(f):
    pose = merge(spear(S_A[f], S_F[f], S_WW[f] - A_T[f]), shield(H_A[f], H_F[f], 92), {
        "torso": {"r": A_T[f]}, "head": {"r": A_H[f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    pose = _feet(pose, A_FR[f], A_FL[f], lr=A_LR[f], al=-10.0 if f == 3 else 0.0)
    if f in (4, 5):
        pose.setdefault("spear", {})["sz"] = 1.18
    if f == 6:
        pose.setdefault("spear", {})["sz"] = 1.06
    if f in (1, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif f in (2, 4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return pose


SHIELD_FACE = (HR[0] + 1.0, HR[1] - 8.6, HR[2] + 3.0)
SPEAR_HEAD = (TIP[0], TIP[1], TIP[2] - 3.0)
STREAK = {"kind": "streak", "joint": "spear", "point": SPEAR_HEAD, "color": B.SAND_LT,
          "width_lu": 6.0, "white": 0.3}


def _attack_clip():
    ov = {
        2: [{"kind": "burst", "joint": "hand_r", "point": (SHIELD_FACE[0] + 12.0, SHIELD_FACE[1], SHIELD_FACE[2]),
             "r0_lu": 4.0, "r1_lu": 10.0, "n": 4, "a0": -50.0, "arc": 100.0},
            {"kind": "dust", "ground": (9.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 3, "spread": 0.9}],
        4: [dict(STREAK, **{"from": 3, "t1": 0.95})],
        5: [dict(STREAK, **{"from": 3, "t0": 0.25, "t1": 0.95})],
        6: [dict(STREAK, **{"from": 4, "t0": 0.2, "t1": 0.9, "width_lu": 5.0}),
            {"kind": "burst", "joint": "spear", "point": TIP, "r0_lu": 6.0, "r1_lu": 12.0, "n": 5,
             "a0": -70.0, "arc": 140.0},
            {"kind": "dust", "ground": (-8.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 6, "spread": 0.8}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


# -- attack B: underarm low thrust from behind the shield (ANIM_SPEC appendix B) -------------------
# unique frames: 0 = A read, 1 = A dip, 2 crouch (spear pulled back at the hip), 3 HOLD (deep crouch
# behind the shield, the spear drawn far back underarm, level), 4 smear, 5 lead, 6 IMPACT (a long
# low lunge, the spear driven out under the shield rim), 7 overshoot, 8-10 = A recoil and settle
B_SEQ = list(range(11))
#      crouch HOLD smear lead  IMP  over
B_SA = [-140, -150, -95, -60, -40, -36]       # spear (far) arm: upper arm, forearm (world deg)
B_SF = [-150, -165, -40, -12, -6, -4]
B_SW = [10, 6, 4, 2, 0, -2]                   # spear direction (world deg): level, low
B_HA = [-40, -34, -30, -20, -8, -8]           # shield arm (torso deg)
B_HF = [-6, 0, 4, 12, 24, 22]
B_T = [-10, -18, -16, -20, -26, -26]
B_H = [6, 10, 8, 10, 14, 14]
B_X = [-1.0, -3.0, 2.0, 6.0, 9.0, 9.5]
B_Z = [-3.0, -6.0, -5.0, -5.5, -6.5, -6.2]
B_Q = [-0.06, -0.12, 0.04, 0.0, -0.14, -0.10]
B_FR = [5.0, 7.0, 9.0, 13.0, 17.0, 17.0]
B_FL = [-5.0, -7.0, -6.0, -5.0, -4.0, -4.0]
B_LR = [0.0, 0.0, 2.5, 1.5, 0.0, 0.0]


def _b_pose(i):
    if i in (0, 1):
        return _attack_pose(i)
    if i >= 8:
        return _attack_pose(i)
    k = i - 2
    t = B_T[k]
    pose = merge(spear(B_SA[k] - t, B_SF[k] - t, B_SW[k] - t), shield(B_HA[k], B_HF[k], 92), {
        "torso": {"r": t}, "head": {"r": B_H[k]},
    }, M.body_about((0, 0, 22), x=B_X[k], z=B_Z[k], q=B_Q[k]))
    pose = _feet(pose, B_FR[k], B_FL[k], lr=B_LR[k])
    if i in (4, 5):
        pose.setdefault("spear", {})["sz"] = 1.18
    if i in (2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    else:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


def _attack_b():
    ov = {
        4: [dict(STREAK, **{"from": 3, "t1": 0.95})],
        5: [dict(STREAK, **{"from": 3, "t0": 0.3, "t1": 0.95})],
        6: [dict(STREAK, **{"from": 4, "t0": 0.2, "t1": 0.9, "width_lu": 5.0}),
            {"kind": "burst", "joint": "spear", "point": TIP, "r0_lu": 6.0, "r1_lu": 12.0, "n": 5,
             "a0": -50.0, "arc": 120.0},
            {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 11, "spread": 0.9},
            {"kind": "dust", "ground": (-6.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 12, "spread": 0.7}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov, reuse=reuse)


# -- attack C: overhead downward drive, the shield raised high ----------------------------------
# 0 = A read, 1 = A dip, 2 the spear lifted over the shoulder, 3 HOLD (up on his toes, the shield
# raised high in front, the spear point tilted steeply down from above the shoulder, cocked back),
# 4 smear, 5 lead, 6 IMPACT (a step in, the spear driven steeply down), 7 overshoot, 8-10 = A's
#      lift  HOLD smear lead  IMP  over
C_SA = [40, 30, 50, 40, 10, 4]                # spear arm upper, forearm (world deg)
C_SF = [60, 50, 60, 20, -10, -16]
C_SW = [-40, -58, -54, -50, -52, -55]         # spear pointing steeply down (world deg)
C_HA = [20, 70, 40, -4, -12, -14]             # shield raised over the head like a roof (torso deg)
C_HF = [70, 110, 80, 54, 40, 36]
C_T = [4, 10, -2, -10, -18, -20]
C_H = [-6, -10, -2, 6, 10, 10]
C_X = [-1.0, -2.5, 2.0, 5.0, 8.0, 8.5]
C_Z = [2.0, 7.5, 4.0, 0.0, -3.0, -2.6]
C_Q = [0.05, 0.10, 0.06, 0.0, -0.15, -0.10]
C_FR = [3.0, 4.0, 7.0, 10.0, 13.0, 13.0]
C_FL = [-3.0, -5.0, -4.0, -3.0, -3.0, -3.0]
C_LR = [1.0, 7.0, 5.0, 2.0, 0.0, 0.0]
C_LL = [0.0, 6.0, 3.0, 0.0, 0.0, 0.0]
C_AR = [-10, -30, -10, 0, 0, 0]               # a hop on the hold: both feet off the ground
C_AL = [-10, -36, -12, 0, 0, 0]


def _c_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    k = i - 2
    t = C_T[k]
    pose = merge(spear(C_SA[k] - t, C_SF[k] - t, C_SW[k] - t), shield(C_HA[k], C_HF[k], 92), {
        "torso": {"r": t}, "head": {"r": C_H[k]},
    }, M.body_about((0, 0, 22), x=C_X[k], z=C_Z[k], q=C_Q[k]))
    pose = _feet(pose, C_FR[k], C_FL[k], lr=C_LR[k], ll=C_LL[k], ar=C_AR[k], al=C_AL[k])
    if i in (4, 5):
        pose.setdefault("spear", {})["sz"] = 1.16
    if i in (2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    else:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


def _attack_c():
    ov = {
        4: [dict(STREAK, **{"from": 3, "t1": 0.95})],
        5: [dict(STREAK, **{"from": 3, "t0": 0.3, "t1": 0.95})],
        6: [{"kind": "burst", "joint": "spear", "point": TIP, "r0_lu": 6.0, "r1_lu": 12.0, "n": 5,
             "a0": -150.0, "arc": 140.0},
            {"kind": "dust", "ground": (30.0, 0.0), "size_lu": 6.5, "puffs": 4, "seed": 21, "spread": 1.0},
            {"kind": "dust", "ground": (-4.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 22, "spread": 0.7}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a):
        return merge(shield(-56 + 18 * max(a, 0), -18 + 22 * max(a, 0), 92),
                     {"arm_l": {"r": 12 * a}, "spear": {"r": 10 * a},
                      "brow": {"z": 1.2 * max(a, 0)}})
    base = {k2: v for k2, v in STANCE.items() if k2 not in ("arm_r", "fore_r", "hand_r")}
    return B.hit_armoured(k, base, recoil, face_hurt=F.expr("squeeze", "grit"))


# D2: the helmet pops off on step 3, spins up over him and lands in front, rolling
LOOSE = [None, None, None, (-8, 16, 60), (-4, 30, 190), (2, 20, 300), (8, -6, 380), (13, -38, 440),
         (16, -41, 470), (17, -41, 480)]
SPEAR_LOOSE = [0, 20, 40, 70, 95, 90, 95, 95, 95, 95]


def _die(k):
    flail = [0.4, 0.3, 0.9, 1.0, 0.3, 0.6, 0.1, 0.0, 0.0, 0.0][k]
    stiff = min(1.0, k / 3.0)
    pose = merge(STANCE, B.die_d2(k, center_z=28.0, lie_z=10.0, height=HEIGHT_LU), {
        "torso": {"r": -4 * stiff}, "head": {"r": 10 * flail - 4},
        "arm_r": {"r": 60 * flail + 30 * stiff}, "fore_r": {"r": 20 * flail},
        "arm_l": {"r": 90 * flail + 40 * stiff}, "fore_l": {"r": 30 * flail},
        "hand_l": {"r": -SPEAR_LOOSE[k] * 0.5},
        "thigh_r": {"r": 6 * flail}, "shin_r": {"r": -4 * flail},
        "thigh_l": {"r": -6 * flail}, "shin_l": {"r": -4 * flail},
    })
    if LOOSE[k] is not None:
        x, z, r = LOOSE[k]
        pose["helm"] = dict(pose.get("helm", {}), hide=True)
        pose["helm_loose"] = {"show": True, "x": x, "z": z, "r": -r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
