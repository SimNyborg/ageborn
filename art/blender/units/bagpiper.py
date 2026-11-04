"""Bagpiper: Gunpowder Age rare support, Dread aura (CONTENT_PLAN 5.4). Bagpipes, a drone ring, ~68 lu.

Look (A11, Gunpowder palette): a stocky piper with a bushy moustache and puffed cheeks, a tall team
feather bonnet, a team doublet with cream facings, the pleated team kilt with tartan bands and a cream
sporran, cream hose and black brogues. Under his far arm a big team-tartan bag with three dark drones
(cream ferrules and tips) sweeping over his shoulder; the chanter in both hands.

"A viewer expects him to puff his cheeks, squeeze the bag and blast a droning wail at the foe, and to
march slowly and proudly."

Animation (ANIM_SPEC G1 march, appendix B for a horn: drone blast, raised skirl):
  idle      pumps the bag gently, fingers on the chanter, the drones sway, blink
  walk      walk v3 slow march at ground speed (card 60 x 1.25 = 75 lu/s), the kilt swishing, the
            drones bobbing a frame late, the bag breathing
  attack    DRONE BLAST: fills his cheeks and squeezes the bag big (the held extreme, a loop of the
            cheek and bag pulse while the wind-up lasts), then blasts: rings burst from the drones
  attack_b  RAISED SKIRL: leans back with the chanter lifted high (the held extreme), then tips
            forward and skirls a blast down the chanter at the foe
  hit       light: head snaps back, the bag squeals flat, eyes squeezed
  die       D3 dizzy sit: the bag deflates in his lap, spiral eyes
"""
import math

from ageborn_art import colors as CL
from ageborn_art import face as F
from ageborn_art import kit_bronze_detail as KD
from ageborn_art import kit_gunpowder as G
from ageborn_art import kit_medieval as K
from ageborn_art import look
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import gunpowder_w2 as GW

SLUG = "bagpiper"
GAIT_NAME = "biped"
NAME = "Bagpiper"
HEIGHT_LU = 72
CANVAS = (330, 330)
FEET = (150, 290)
ANCHORS = {"head": (2, 72), "hitCenter": (0, 32), "muzzle": (-16, 74)}
NO_RETIME = True

HAIR = "#6E625A"
HAIR_LT = "#8C8076"      # W2: lighter tufts in the hair and moustache (two-tone hair)
HOSE = "#E6DCC4"
HOSE_DK = "#B9A98A"      # W2: the hose's dicing (as the Highlander's)
SHOE = "#3B3432"         # W2: a lit side that separates from the outline (was #2E2A2A)
WOOD = "#54463C"         # W2: the drones and chanter with a lit side (was #3E342E)
TARTAN = "#3A3F3A"
BONNET = "#3A3940"       # W2: the tall feather bonnet at a mid value (was #2B2A30)
FEATHER_LT = "#57565E"   # W2: lighter feather tufts on the bonnet
CHEEKS = "#F0C2A6"

# the detail standard (art round W2, ageborn_art/look.py): the lifts and the model detail of audit 5.1 / 5.2.
# What a player sees of the Bagpiper is the tall bonnet, the doublet, the kilt, the bag and the drones: the kilt
# hangs from the waist again (its lathe pointed down into the doublet, as the Highlander's did), a team-dark sett band
# and pleat folds on the kilt, team-dark piping, wings and bonnet band (the team zone in two tones), lighter feather
# tufts on a lighter bonnet, team garter flashes and dicing on the hose, lighter drones, tufts and shoes.
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 0.93
LOOK_SHADE = {"shadow": 0.84, "core": 0.18, "core_width": 0.30, "gradient": 2.0, "cavity": 0.6, "rim_mix": 0.5,
              "top": 0.08, "top_t": 0.62, "team_core": 0.4}
_FAR = lambda c: CL.scale(c, 0.8)        # noqa: E731 (kit_gunpowder.legs_v3 darkens the far leg)
MATERIAL_KINDS = {B.SKIN: "skin", _FAR(B.SKIN): "skin", HAIR: "fur", HAIR_LT: "fur", HOSE: "cloth",
                  _FAR(HOSE): "cloth", HOSE_DK: "cloth", "#978A70": "cloth", SHOE: "leather", _FAR(SHOE): "leather",
                  WOOD: "wood", TARTAN: "cloth", BONNET: "fur", FEATHER_LT: "fur", B.CREAM: "cloth",
                  B.LEATHER: "leather", CHEEKS: "skin", "team": "cloth"}
DOUBLET = ((0, 0, 28.5), (12.2, 11.0, 12.0))    # the team doublet's blob (centre, radii)
KILT = [(11.0, 0), (12.2, -3.0), (13.2, -6.4), (13.8, -8.4), (0, -8.6)]   # (radius, height below the waist)


def _on_kilt(a_deg, z, lift=0.15):
    """The point on the kilt's surface at the angle a (degrees; -90 faces the camera) and the height z."""
    d = 18.4 - z
    r = KILT[-2][0]
    for (r0, h0), (r1, h1) in zip(KILT, KILT[1:-1]):
        if -h1 >= d >= -h0:
            r = r0 + (r1 - r0) * (d + h0) / (h0 - h1)
            break
    a = math.radians(a_deg)
    return ((r + lift) * math.cos(a) + 0.4, (r + lift) * math.sin(a) * 0.92, z)
BAG_C = (-9.0, 8.0, 30.0)            # bag centre (torso space, under the far arm)
HAT_C = (1.0, 0.0, 57.0)
DRONE_TOPS = [(-18.0, 12.0, 74.0), (-25.0, 13.0, 66.0), (-29.0, 14.0, 56.0)]


def _bonnet(rig, joint):
    x, y, z = HAT_C
    g = Geo().blob((x - 1.0, y, z + 8.0), (11.0, 10.8, 12.0), p=2.3, taper=(0.9, 1.0))
    g.clip((x, y, z - 0.6), (0, 0, -1))
    rig.part(joint, g, BONNET, finish="hair")                      # the tall feather bonnet
    ref = Geo().blob((x - 1.0, y, z + 8.0), (11.0, 10.8, 12.0), p=2.3, taper=(0.9, 1.0))
    fb = F.Face(rig, joint, [ref])
    g = Geo()                                                        # W2: lighter feather tufts (two tones)
    for (fx, fz), r in (((x + 4.0, z + 15.0), (2.6, 1.6, 2.2)), ((x - 1.0, z + 17.6), (2.6, 1.6, 2.2)),
                        ((x + 6.4, z + 9.0), (2.4, 1.6, 2.2)), ((x - 9.6, z + 12.0), (2.4, 1.6, 2.4)),
                        ((x + 1.4, z + 11.0), (2.4, 1.6, 2.0))):
        g.blob(tuple(fb.hit(fx, fz)), r, p=2.2)
    rig.part(joint, g, FEATHER_LT, finish="hair", outline=0)
    g = Geo().blob((x - 6.0, -8.6, z + 6.0), (4.6, 2.4, 6.4), p=2.4)
    rig.part(joint, g, team=True, outline=0.5)                     # team side panel
    g = Geo().lathe([(10.4, 0), (11.0, 0.3), (11.0, 2.0), (10.4, 2.3)], (x, y, z - 0.8), segs=24)
    look.team_part(rig, joint, g, outline=0.5)                     # team band (W2: team-dark)
    g = Geo().capsule((x - 4.0, -9.6, z + 8.0), (x - 6.0, -9.0, z + 20.0), 1.6, 0.9)
    rig.part(joint, g, B.CREAM, outline=0.5)                         # a cream hackle


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig)
    G.legs_v3(rig, B.SKIN, SHOE, stocking=HOSE, thigh_r=4.8)
    for s, y in (("r", -B.LEG_Y), ("l", B.LEG_Y)):                 # W2: team garter flashes and diced hose
        g = Geo().blob((0.6, y - (4.2 if s == "r" else -4.2), K.V3_KNEE_Z - 2.4), (1.6, 0.9, 2.0), p=2.4)
        rig.part(f"shin_{s}", g, team=True, outline=0.4)
        g = Geo()
        for zz in (5.4, 8.8):
            g.blob((1.6, y - (3.6 if s == "r" else -3.6), zz), (1.6, 0.7, 1.6), p=1.6)
        rig.part(f"shin_{s}", g, HOSE_DK if s == "r" else "#978A70", outline=0, highlight=False)

    coat = Geo().blob((0, 0, 28.5), (12.2, 11.0, 12.0), p=2.4, taper=(1.12, 0.95))
    coat.blob((0, 0, 19.0), (11.6, 10.4, 4.8), p=2.6)
    rig.part("torso", coat, team=True)
    g = Geo().blob((9.2, -1.4, 29.0), (3.4, 4.6, 8.0), p=2.6)
    g.clip((8.2, 0, 0), (-1, 0, 0))
    rig.part("torso", g, B.CREAM, outline=0.6)
    g = KD.stripe_x(*DOUBLET, 5.6, 8.6, z0=22.0, z1=37.4, p=2.4, taper=(1.12, 0.95), grow=0.3)
    look.team_part(rig, "torso", g)                                  # W2: team-dark piping down the front
    g = Geo().blob((0.4, 0, 20.4), (12.4, 11.2, 1.8), p=3.0)
    rig.part("torso", g, B.LEATHER)
    # kilt (as the Highlander's)
    rig.secondary("kilt", "hips", (0.0, 0, 18.0), (0.0, 0, 10.0), max_deg=12, gain=1.1)
    rig.rest_offset["kilt"] = (0, 0, K.V3_LIFT + 1.0)
    # W2: the lathe's axis points up, so the profile hangs down from the waist (it pointed down, which turned the
    # kilt over into the doublet and left only its stripes floating over bare thighs)
    kilt = Geo().lathe(KILT, (0.4, 0, 18.4), (0.4, 0, 19.4), segs=24, squash=(1.0, 0.92))
    kf = F.Face(rig, "kilt", [kilt])
    rig.part("kilt", kilt, team=True)
    g = G.stripes(kf, Geo(), (15.6, 12.2), -9.0, 13.0, 1.3)
    rig.part("kilt", g, TARTAN, highlight=False, outline=0)
    # W2: the kilt in two tones: a team-dark sett band between the dark lines and team-dark pleat folds round
    # the back
    g = G.stripes(kf, Geo(), (13.9,), -12.6, 13.0, 2.2)
    look.team_part(rig, "kilt", g, highlight=False, outline=0)
    g = Geo()
    for a in (-106, -130, -154, -178):
        g.capsule(_on_kilt(a, 17.4), _on_kilt(a, 10.4), 0.85)
    look.team_part(rig, "kilt", g, highlight=False, outline=0)
    g = Geo().blob((12.2, -1.0, 14.8), (2.6, 5.0, 4.6), p=2.4, taper=(1.0, 0.85))
    rig.part("kilt", g, B.CREAM, finish="hair", outline=0.6)

    head = G.head_geos(center=(2, 0, 49.0), nose=(14.2, -0.6, 47.0))
    hair = Geo().blob((-5.6, 0, 47.0), (6.0, 10.6, 6.6), p=2.2)
    K.face2(rig, [head, hair], B.SKIN, cx=12.2, cz=50.4, eye_dy=(-4.6, 4.4),
            eye_r=(3.8, 3.6, 4.5), brow=HAIR, mouth_dz=-8.4, mouth_x=13.6, eye_at=(14.0, 50.6), mark_r=4.2)
    rig.part("head", head, B.SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    hf = F.Face(rig, "head", [Geo().blob((-5.6, 0, 47.0), (6.0, 10.6, 6.6), p=2.2)])
    g = Geo()                                  # W2: lighter rounded tufts (two-tone hair, W1 review)
    for (hx_, hz_), r in (((-8.0, 49.4), (2.3, 1.6, 2.2)), ((-9.8, 44.8), (2.2, 1.6, 2.3)),
                          ((-5.4, 42.4), (2.1, 1.6, 2.0))):
        g.blob(tuple(hf.hit(hx_, hz_)), r, p=2.2)
    rig.part("head", g, HAIR_LT, finish="hair", outline=0)
    B.moustache(rig, HAIR, cx=13.8, z=45.2)
    # puffed cheeks (shown while he blows)
    rig.joint("cheeks", "head", (10.0, -7.0, 44.0), hidden=True)
    g = Geo().sphere((10.4, -7.4, 44.0), 4.2, cuts=4)
    rig.part("cheeks", g, CHEEKS, outline=0.6)
    rig.joint("hat", "head", HAT_C)
    _bonnet(rig, "hat")

    for s in ("r", "l"):
        B.arm_parts(rig, s, team_sleeve=True, cuff=B.CREAM)
        g = Geo().blob((0, B.ARM_Y[s], 37.0), (5.8, 5.2, 4.6), p=2.4)
        look.team_part(rig, f"arm_{s}", g)                           # W2: team-dark wings

    # the bag (its own joint so it can inflate) and the drones over the far shoulder
    rig.joint("bag", "torso", BAG_C)
    bag = Geo().blob(BAG_C, (9.6, 6.4, 8.4), p=2.2, rot=(0, -20, 0))
    bf = F.Face(rig, "bag", [bag])
    rig.part("bag", bag, team=True)
    g = G.stripes(bf, Geo(), (BAG_C[2] + 3.0, BAG_C[2] - 2.0), BAG_C[0] - 7.0, BAG_C[0] + 7.0, 1.2)
    rig.part("bag", g, TARTAN, highlight=False, outline=0)
    rig.secondary("drones", "torso", (-6.0, 12.0, 36.0), (-24.0, 13.0, 66.0), max_deg=8, gain=1.0)
    g = Geo()
    for i, top in enumerate(DRONE_TOPS):
        g.capsule((-6.0, 11.0 + 0.5 * i, 36.0), top, 1.8 - 0.15 * i, 1.4 - 0.1 * i)
    rig.part("drones", g, WOOD, outline=0.6)
    g = Geo()
    for top in DRONE_TOPS:
        g.lathe([(2.2, -1.6), (2.6, 0), (2.2, 1.6)], (top[0] + 0.5, top[1], top[2] - 1.6),
                (top[0] - 0.5, top[1], top[2] + 1.6), segs=10)
        g.lathe([(2.0, -1.0), (2.4, 0), (2.0, 1.0)], (top[0] + 2.4, top[1], top[2] - 9.0),
                (top[0] + 1.8, top[1], top[2] - 7.0), segs=10)
    rig.part("drones", g, B.CREAM, outline=0.4)
    rig.track("drone_top", "drones", DRONE_TOPS[0])
    # the chanter: from the bag down and forward to the hands (part of the near hand)
    hx, hy, hz = 0.0, B.ARM_Y["r"], B.HAND_Z
    g = Geo().capsule((hx + 1.0, hy + 2.0, hz + 6.0), (hx + 1.6, hy + 1.0, hz - 7.0), 1.1, 1.4)
    g.lathe([(2.0, 0), (1.2, 1.6)], (hx + 1.6, hy + 1.0, hz - 7.0), (hx + 1.8, hy + 1.0, hz - 8.6), segs=10)
    rig.part("hand_r", g, WOOD, outline=0.6)
    rig.track("chanter", "hand_r", (hx + 1.8, hy + 1.0, hz - 8.6))
    rig.track("muzzle", "drones", DRONE_TOPS[0])
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry (COMMON C1)
        _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40; art/blender/README.md): never on the face or skin. The doublet's back half (the
    largest team surface the chanter arm leaves clear; the bag rides on the far side), the kilt's pleated back, the
    bonnet; a torn strip from the kilt's hem."""
    rig.damage_spot_at("doublet", "torso", -8.0, 26.0, 8.0, "cloth", team=True)   # clear of the arms in every frame
    rig.damage_spot_at("kilt", "kilt", -6.0, 17.0, 7.0, "cloth", team=True)
    rig.damage_spot_at("bonnet", "hat", -2.0, 70.0, 5.5, "cloth", fill=BONNET)
    rig.damage_spot_at("hem", "kilt", -7.0, 11.5, 8.0, "cloth", kind="strip", team=True)


# -- poses ---------------------------------------------------------------------------------
def pipe(ra=-60, rf=40, rw=110, la=-50, lf=20):
    """Both hands on the chanter; `rw` the chanter direction (it is modelled pointing down, -90 rest)."""
    return merge(B.arm("r", ra, rf, rw, w_rest=-90.0), B.arm("l", la, lf))


STANCE = merge(pipe(), {"torso": {"r": -2}})


def _idle(f):
    pump = [0.0, 0.4, 1.0, 0.6, 0.2, 0.0][f]

    def extra(ctx):
        return {"bag": {"s": 1.0 + 0.06 * pump}, "arm_l": {"r": -4 * pump}, "drones": {"r": 3 * ctx["lag"]},
                "head": {"r": -2 + 2 * ctx["lag"]}, "hand_r": {"r": 3 * ctx["lag"]}}
    return M.idle_v2(f, STANCE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


SPEED = 75.0
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED, cycle_ms=660, stance=0.38, lift=7.0)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"kilt": {"r": 5 * lag, "rx": 6 * math.sin(ctx["p"])}, "drones": {"r": 6 * lag},
                "bag": {"s": 1.0 + 0.04 * lag}, "hand_r": {"r": 4 * lag}}
    return M.walk_v3(RIG, f, STANCE, GAIT, legs=LEGS, lean=-3.0, twist=4.0, nod=3.0, extra=extra, report=report)


# attack A: drone blast. moves.SMALL_MELEE_MS, impact 6, hold step 3 looping with step 2 (bag pulse)
#        read  breath fill  HOLD  pulse squeeze BLAST over  ease  settle settle
A_BAG = [1.0, 1.05, 1.14, 1.22, 1.18, 1.1, 0.94, 0.96, 1.0, 1.0, 1.0]
A_LEAN = [-2, 2, 6, 10, 8, 0, -8, -6, -2, -2, -2]
A_HEAD = [0, 4, 8, 12, 10, 2, -6, -4, 0, 0, 0]
A_X = [0.0, -0.5, -1.0, -2.0, -1.5, 0.5, 2.5, 2.0, 1.0, 0.0, 0.0]
A_Q = [0.0, 0.01, 0.03, 0.05, 0.04, -0.02, -0.08, -0.03, 0.0, 0.0, 0.0]


def _a_pose(f):
    pose = merge(pipe(-60 + 0.5 * A_LEAN[f], 40, 110), {
        "torso": {"r": A_LEAN[f]}, "head": {"r": A_HEAD[f] - 0.5 * A_LEAN[f]},
        "bag": {"s": A_BAG[f]}, "cheeks": {"show": f in (2, 3, 4, 5)},
        "arm_l": {"r": [0, 0, -6, -10, -8, -14, -4, 0, 0, 0, 0][f]},
        "drones": {"r": [0, 0, 2, 4, 3, 0, -8, -4, 0, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=A_X[f], q=A_Q[f]))
    pose = G.plant(RIG, pose, LEGS, r=(3.0, 0, 0), l=(-3.5, 0, 0), max_drop=3.0)
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze"))
    elif f in (6, 7):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -0.8}})
    return pose


def _ov_a():
    tops = DRONE_TOPS[0]
    return {
        6: [{"kind": "rings", "joint": "drones", "point": (tops[0] - 1.0, tops[1], tops[2] + 2.0),
             "radii_lu": (6.0, 11.0, 16.0), "a0": 20.0, "a1": 160.0, "color": "#EDE6F4"}],
        7: [{"kind": "rings", "joint": "drones", "point": (tops[0] - 1.0, tops[1], tops[2] + 2.0),
             "radii_lu": (13.0, 19.0), "a0": 30.0, "a1": 150.0, "color": "#EDE6F4"}],
    }


def _attack_clip():
    return M.clip("attack", [_a_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=_ov_a(), extra={"holdStep": 3, "holdLoop": [2, 3]})


# attack B: raised skirl: leans back with the chanter lifted high, then tips forward and blasts down it
B_RW = {2: 30, 3: 60, 4: 64, 5: 10, 6: -30, 7: -40}
B_LEAN = {2: 10, 3: 18, 4: 18, 5: 4, 6: -12, 7: -10}


def _b_pose(f):
    if f not in B_RW:
        return _a_pose(f)
    lean = B_LEAN[f]
    pose = merge(pipe(-20 + 0.8 * lean, 60, B_RW[f] - lean), {
        "torso": {"r": lean}, "head": {"r": 4 - 0.4 * lean},
        "bag": {"s": [1, 1, 1.1, 1.18, 1.2, 1.1, 0.95, 0.97][f]}, "cheeks": {"show": f in (2, 3, 4, 5)},
        "drones": {"r": [0, 0, 4, 8, 8, 2, -10, -6][f]},
    }, M.body_about((0, 0, 22), x=[0, 0, -1.5, -3, -3, 0, 3, 2.5][f], q=[0, 0, 0.03, 0.05, 0.05, -0.02, -0.08, -0.03][f]))
    pose = G.plant(RIG, pose, LEGS, r=(5.0, 0, 0), l=(-6.0, 0, 0), max_drop=4.0)
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze"))
    else:
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -0.8}})
    return pose


def _ov_b():
    hx, hy, hz = 0.0, B.ARM_Y["r"], B.HAND_Z
    pt = (hx + 1.8, hy + 1.0, hz - 9.0)
    return {
        6: [{"kind": "rings", "joint": "hand_r", "point": pt, "radii_lu": (6.0, 11.0, 16.0), "a0": -150.0,
             "a1": -20.0, "color": "#EDE6F4"}],
        7: [{"kind": "rings", "joint": "hand_r", "point": pt, "radii_lu": (13.0, 19.0), "a0": -140.0,
             "a1": -30.0, "color": "#EDE6F4"}],
    }


def _attack_b():
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=_ov_b(), reuse=reuse, extra={"holdStep": 3, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 10 * a},
                "thigh_r": {"r": 18 * max(a, 0)}, "shin_r": {"r": -20 * max(a, 0)},
                "bag": {"s": 1.0 - 0.1 * max(a, 0)}, "drones": {"r": 10 * a},
                "hat": {"r": 8 * a}, "brow": {"z": 1.4 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "o"),
                       face_back=F.expr("o") if k == 2 else None)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.7, 0.2, 0.4, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d3(k, center_z=24.0, height=HEIGHT_LU), K.d3_sit(k), {
        "bag": {"s": [1.0, 1.1, 1.0, 0.9, 0.8, 0.75, 0.7, 0.7, 0.7, 0.7][k]},
        "drones": {"r": -30 * flail}, "kilt": {"sz": 0.9},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.6}})
    else:
        pose = merge(pose, F.expr("spiral", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
