"""Fusilier: Gunpowder Age ranged (DESIGN A5.4). Musket (proj.musket), 240 lu, ~70 lu.

Look (A11, Gunpowder palette): a line infantryman in a team shako (a black leather top and visor,
a brass plate with an anchor, cream cords, a team pompom), a team long coat with cream facings and a cream anchor on
the tails, cream crossbelts in an X over a cream waistcoat with brass buttons, a black cartridge
box on the belt, cream breeches, black buttoned gaiters. He carries an oversized flintlock with a
bayonet at port arms (diagonal, so the tall silhouette reads 'musket' at 56 px).

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`, `kit_medieval.py`):
  idle    at port arms, breathing; taps the butt and checks the pan (head dips), blink
  walk    walk v3 bounce jog at ground speed (ANIM_SPEC G1): the musket sloped back on his near
          shoulder (slope arms, not the port-arms guard), the far arm pumping, planted feet, the
          coat tails and the queue flying late
  attack_b  STANDING SHOULDER SHOT: stays on his feet in a wide braced stance, shoulders the
          musket level and leans into the aim (the held extreme, a tall standing silhouette
          against A's low kneel); the pan fizzes while the aim holds, BANG, the kick rocks him
          back a step, then the same reload as A
  attack  HIP FIRE, THEN RELOAD (art round W2, queue item 44): he plants his feet wide, drops the
          musket level at the hip with the butt under his arm and leans into it (the held aim), the
          pan fizzes, BANG (a big flash, one frame), the kick jerks the muzzle up and rocks him back
          a step while a big powder cloud billows, then he reaches back to the cartridge box, bites a
          cartridge open and primes the pan. Until W2 this was a kneeling shot: with the standing
          shot B the two variants made him kneel and stand every few shots, so both now stand (the
          kneeling keys stay below as the unused `_kneel_volley`, for a later signature stance).
          The ball leaves the per-frame `muzzle` anchor on the fire frame.
  aimed   attack and attack B aimed up about 45 and 70 degrees at flyers (ageborn_art/aimed.py)
  hit     light: head snaps back, the shako lifts, eyes squeezed
  die     D2 topple: rocks back, stiffens and falls flat on his face like a plank, the shako
          pops off and rolls, X eyes and tongue
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import colors as CL
from ageborn_art import face as F
from ageborn_art import gait as GT  # noqa: F401
from ageborn_art import kit_bronze_detail as KD
from ageborn_art import kit_gunpowder as G
from ageborn_art import kit_medieval as K
from ageborn_art import look
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import gunpowder_w2 as GW

SLUG = "fusilier"
GAIT_NAME = "biped"
NAME = "Fusilier"
HEIGHT_LU = 70
CANVAS = (320, 256)
FEET = (108, 218)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (62, 35)}
NO_RETIME = True

HAIR = "#5A4B40"
GAITER = "#38383E"      # W2: a lit side on the black gaiters (was rigs_gunpowder.BLACK)
SHOE = "#2F2B2B"

# the detail standard (art round W2, ageborn_art/look.py): the lifts and the model detail of audit 5.1 / 5.2.
# What a player sees of the Fusilier is the shako, the coat with its crossbelts, the near arm and the musket: a
# team-dark buttoned lapel and a team-dark band round the shako (the team zone in two tones), a team-dark hem on the
# coat skirts, larger brass buttons, brass buttons on the cream cuffs, a brass plate on each crossbelt, a lighter
# gaiter with a cream top edge, and the musket's barrel and stock as metal and wood.
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 0.65   # the highlight share inside 0.06-0.10 (his thin cream belts and brass read as highlights)
# (a softer rim and top light cost more micro-contrast than they saved highlight: the soldiers' LOOK_SHADE)
LOOK_SHADE = {"shadow": 0.84, "core": 0.18, "core_width": 0.30, "gradient": 2.0, "cavity": 0.6, "rim_mix": 0.5,
              "top": 0.08, "top_t": 0.62, "team_core": 0.4}
_FAR = lambda c: CL.scale(c, 0.8)        # noqa: E731 (kit_gunpowder.legs_v3 darkens the far leg)
MATERIAL_KINDS = {B.SKIN: "skin", HAIR: "fur", B.CREAM: "cloth", _FAR(B.CREAM): "cloth", GAITER: "leather",
                  _FAR(GAITER): "leather", SHOE: "leather", _FAR(SHOE): "leather", B.BLACK: "leather",
                  B.BRASS: "bronze", _FAR(B.BRASS): "bronze", B.WOOD: "wood", B.GUNWOOD: "wood",
                  B.GUNMETAL: "iron", B.STEEL: "iron", "team": "cloth"}

# Toy Soldier (DESIGN A5.8, rare): a painted wooden toy of the same Fusilier, the same model: porcelain-pale
# painted skin with rosy cheeks, glossy black paint, ivory paint for the cream, bright gilt paint for the brass, a
# brown painted musket and a brass wind-up key in his back. The coat, shako and pompom stay team.
TOY = {B.SKIN: "#E6D3C3", HAIR: "#3A332E", B.CREAM: "#E4DBC9", _FAR(B.CREAM): CL.scale("#E4DBC9", 0.8),
       GAITER: "#2C2C34", _FAR(GAITER): CL.scale("#2C2C34", 0.8), SHOE: "#26262C", _FAR(SHOE): CL.scale("#26262C", 0.8),
       B.BLACK: "#24242A", B.BRASS: "#CBB384", _FAR(B.BRASS): CL.scale("#CBB384", 0.8), B.WOOD: "#4A3A34",
       B.GUNWOOD: "#7E625A", B.GUNMETAL: "#7A7F88", B.STEEL: "#C4CAD2"}
TOY_KINDS = {"#E6D3C3": "ceramic", "#3A332E": "ceramic", "#E4DBC9": "ceramic", CL.scale("#E4DBC9", 0.8): "ceramic",
             "#2C2C34": "ceramic", CL.scale("#2C2C34", 0.8): "ceramic", "#26262C": "ceramic",
             CL.scale("#26262C", 0.8): "ceramic", "#24242A": "ceramic", "#CBB384": "gold",
             CL.scale("#CBB384", 0.8): "gold", "#4A3A34": "wood", "#7E625A": "wood", "#7A7F88": "iron",
             "#C4CAD2": "iron", "#E39A92": "ceramic"}
SKINS = {"toy_soldier": {"palette": TOY, "kinds": TOY_KINDS}}
CHEEK = "#E39A92"       # the Toy Soldier's painted cheeks

ARM_Y = {"r": -12.5, "l": 10.5}
SH = (0.0, B.SHOULDER_Z)            # shoulder in torso space (x, z)
G0 = (4.0, -14.5, 27.0)              # musket grip at rest (character space)
FORE = 12.0                          # far hand: this far along the musket from the grip
LENGTH, BAYONET = 50.0, 13.0
MUZZLE = (G0[0] + LENGTH + 1.0, G0[1], G0[2] + 1.6)
HAT_C = (1.0, 0.0, 58.0)


def _shako(rig, joint):
    x, y, z = HAT_C
    g = Geo().lathe([(0, 0), (9.6, 0), (10.6, 6.0), (11.2, 13.0), (0, 13.2)], (x, y, z - 1.0),
                    (x, y, z + 12.2), segs=24, squash=(1.0, 0.94))
    rig.part(joint, g, team=True)
    g = Geo().lathe([(0, 11.2), (11.25, 11.2), (11.25, 13.4), (0, 13.6)], (x, y, z - 1.0),
                    (x, y, z + 12.2), segs=24, squash=(1.0, 0.94))
    rig.part(joint, g, B.BLACK, finish="gloss", outline=0.4)   # black leather top
    g = Geo().blob((x + 8.4, y, z - 0.6), (6.4, 9.6, 1.1), p=2.6)          # visor
    g.clip((x + 1.0, 0, 0), (-1, 0, 0))
    rig.part(joint, g, B.BLACK, finish="gloss", outline=0.6)
    g = Geo().lathe([(9.8, 0), (10.4, 0.4), (10.4, 1.8), (9.8, 2.2)], (x, y, z - 0.4), segs=24)
    g.lathe([(11.2, 0), (11.6, 0.4), (11.6, 1.6), (11.2, 2.0)], (x, y, z + 10.8), segs=24)
    rig.part(joint, g, B.CREAM, outline=0.4)                             # cream bands
    plate = Geo().blob((x + 10.0, y - 1.6, z + 6.0), (1.4, 5.0, 4.8), p=2.4, rot=(0, -6, -10))
    pf = F.Face(rig, joint, [plate])
    rig.part(joint, plate, B.BRASS, finish="metal", outline=0.5)
    g = G.anchor(pf, Geo(), K.scr(pf, (x + 11.2, y - 1.8, z + 6.0)), s=0.62, w=1.5)
    rig.part(joint, g, B.WOOD, highlight=False, outline=0)
    g = Geo()                                                              # cream cords swag
    for a, b in (((x + 9.6, -6.0, z + 2.0), (x + 4.0, -10.4, z + 0.4)),
                 ((x + 4.0, -10.4, z + 0.4), (x - 3.0, -10.4, z + 2.8))):
        g.capsule(a, b, 0.8)
    rig.part(joint, g, B.CREAM, outline=0.4)
    g = Geo().sphere((x + 7.0, y, z + 15.8), 3.6, cuts=4)                  # pompom
    g.blob((x + 7.0, y, z + 13.0), (1.6, 1.6, 1.8), p=2.2)
    rig.part(joint, g, team=True, outline=0.8)
    # W2: a team-dark band round the shako's body (the team zone in two tones)
    g = Geo().lathe([(10.0, 0), (10.55, 0.3), (10.7, 2.1), (10.15, 2.4)], (x, y, z + 3.0), (x, y, z + 15.2),
                    segs=24, squash=(1.0, 0.94))
    look.team_part(rig, joint, g, outline=0.4)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig, arm_y=ARM_Y)
    G.legs_v3(rig, B.CREAM, SHOE, stocking=GAITER, gaiter_buttons=B.BRASS)

    # torso: team coat, cream waistcoat front, cream crossbelts (X), brass buttons, black stock
    g = Geo().blob((0, 0, 28.0), (10.8, 10.0, 11.8), p=2.4, taper=(1.08, 0.94))
    g.blob((0, 0, 18.0), (10.4, 9.8, 4.6), p=2.6)
    rig.part("torso", g, team=True)
    g = Geo().blob((5.2, -1.0, 27.5), (6.8, 4.8, 9.2), p=2.6, taper=(1.05, 0.7))
    g.clip((7.8, 0, 0), (-1, 0, 0))
    look.team_part(rig, "torso", g)   # buttoned lapel front (W2: team-dark, with brass buttons)
    g = Geo().capsule((1.0, -10.4, 37.0), (10.6, 0.0, 22.0), 2.2).capsule((10.6, 0.0, 22.0), (2.0, 9.8, 18.5), 2.2)
    g.capsule((1.0, 10.0, 37.0), (10.4, -3.0, 25.0), 2.1).capsule((10.4, -3.0, 25.0), (1.0, -10.6, 18.5), 2.1)
    rig.part("torso", g, B.CREAM, outline=0.8)
    g = Geo().blob((10.9, -1.4, 23.5), (1.4, 2.2, 2.2), p=2.4)   # crossbelt plate
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.5)
    g = Geo()
    for z in (33.0, 29.0, 25.0):
        g.sphere((11.8, -2.4, z), 1.35, cuts=3)      # W2: 1.15 -> 1.35 lu (they read at game scale)
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.5)
    g = Geo().blob((1.2, 0, 37.2), (6.8, 7.2, 2.4), p=2.4)     # black neck stock
    rig.part("torso", g, B.BLACK)
    g = Geo().blob((0.4, 0, 19.6), (11.2, 10.4, 1.8), p=3.0)
    rig.part("torso", g, B.CREAM)                               # waist belt
    g = Geo().blob((-8.2, -8.0, 19.0), (4.2, 3.0, 3.6), p=3.0)  # cartridge box at the back hip
    rig.part("torso", g, B.BLACK, finish="gloss")
    g = Geo().blob((-8.4, -11.2, 19.4), (1.8, 0.8, 1.8), p=2.4)
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.4)
    # coat skirts over the thighs (front flaps), team
    g = Geo().blob((0.5, 0, 17.6), (11.8, 10.8, 6.6), p=2.6, taper=(1.12, 1.0))
    g.clip((0, 0, 13.4), (0, 0, -1))
    rig.part("hips", g, team=True)
    g = KD.band_z((0.5, 0, 17.6), (11.8, 10.8, 6.6), 13.4, 15.6, p=2.6, taper=(1.12, 1.0))
    look.team_part(rig, "hips", g)                  # W2: a team-dark hem on the coat skirts
    # coat tails with cream turnbacks and a cream anchor, swinging behind the legs (lifted with
    # the upper body so the longer legs show; they kick with the knees)
    rig.secondary("tails", "hips", (-4.0, 0, 18.0), (-7.5, 0, 6.0), max_deg=16, gain=1.2)
    rig.rest_offset["tails"] = (0, 0, K.V3_LIFT + 4.5)
    tl = Geo().blob((-5.2, 0, 12.0), (5.4, 10.2, 8.0), p=2.6, taper=(0.7, 1.0), rot=(0, 10, 0))
    tf = F.Face(rig, "tails", [tl])
    rig.part("tails", tl, team=True)
    g = G.anchor(tf, Geo(), (-6.4, 12.6), s=0.9)
    rig.part("tails", g, B.CREAM, highlight=False, outline=0)
    g = Geo().blob((-6.5, 0, 5.4), (3.8, 10.8, 2.4), p=2.6, rot=(0, 10, 0))
    rig.part("tails", g, B.CREAM)

    # head: face kit, hair with a queue at the back, the shako on its own joint
    head = G.head_geos(center=(2, 0, 48.5), nose=(13.6, -0.6, 46.8))
    hair = Geo().blob((-6.4, 0, 48.0), (6.0, 10.2, 7.6), p=2.2)
    hair.blob((-3.0, -10.4, 45.5), (3.2, 1.8, 4.4), p=2.2)   # side curl
    K.face2(rig, [head, hair], B.SKIN, cx=12.0, cz=49.6, eye_dy=(-4.6, 4.4),
            eye_r=(3.8, 3.5, 4.4), brow=HAIR, mouth_dz=-7.4, mouth_x=12.6,
            eye_at=(13.8, 49.8), mark_r=4.1)
    rig.part("head", head, B.SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    rig.secondary("queue", "head", (-10.0, 0, 46.0), (-13.0, 0, 37.0), max_deg=16, gain=1.1)
    g = Geo().capsule((-10.5, 0, 45.5), (-13.0, 0, 38.0), 2.2, 1.6)
    rig.part("queue", g, HAIR, finish="hair")
    g = Geo().blob((-11.2, 0, 43.0), (1.8, 2.8, 1.6), p=2.4)
    rig.part("queue", g, B.BLACK, outline=0.6)
    rig.joint("hat", "head", HAT_C)
    _shako(rig, "hat")
    rig.joint("hat_loose", "root", HAT_C, hidden=True)
    _shako(rig, "hat_loose")

    # arms: team sleeves, cream cuffs
    for s in ("r", "l"):
        B.arm_parts(rig, s, team_sleeve=True, cuff=B.CREAM, arm_y=ARM_Y)
        y = ARM_Y[s]                                 # W2: two brass buttons on each cream cuff
        cuff = Geo().blob((0, y, B.HAND_Z + 3.4), (5.0, 5.0, 2.0), p=2.6)
        GW.studs(rig, f"fore_{s}", [cuff], [(-1.9, B.HAND_Z + 3.4), (1.9, B.HAND_Z + 3.4)], r=1.25)
    for s, y in (("r", -12.4), ("l", 10.4)):
        g = Geo().blob((0, y, 37.0), (5.8, 5.2, 4.4), p=2.4)  # shoulder with a cream wing
        rig.part(f"arm_{s}", g, team=True)
        g = Geo().blob((0.4, y * 1.05, 40.2), (3.6, 2.6, 1.4), p=2.4)
        rig.part(f"arm_{s}", g, B.CREAM, outline=0.5)

    # musket on its own joint under the torso; the far hand is part of the musket
    rig.joint("gun", "torso", G0)
    muzzle = B.musket(rig, "gun", G0, length=LENGTH, bayonet=BAYONET, r=1.12)
    # the far hand gripping the fore-stock is part of the musket (its own joint, so the walk can
    # hide it while that arm pumps free)
    rig.joint("gunhand", "gun", (G0[0] + FORE, G0[1] + 2.4, G0[2] - 0.4))
    g = Geo().blob((G0[0] + FORE, G0[1] + 2.4, G0[2] - 0.4), (3.8, 3.2, 3.6), p=2.4)
    rig.part("gunhand", g, B.SKIN)
    g = Geo().capsule((G0[0] + 2.0, G0[1] - 1.8, G0[2] - 1.4), (G0[0] + 28.0, G0[1] - 1.8, G0[2] - 1.0), 0.6)
    rig.part("gun", g, B.CREAM, outline=0.3)   # the sling
    rig.track("muzzle", "gun", muzzle)
    B.muzzle_flash(rig, "gun", muzzle, size=2.0)
    # the pan flash (a puff at the lock)
    rig.joint("pan", "gun", (G0[0] + 3.0, G0[1], G0[2] + 3.5), hidden=True)
    g = Geo().star((G0[0] + 3.0, G0[1] - 2.0, G0[2] + 5.4), 3.4, 1.4, 1.0, points=6)
    rig.part("pan", g, glow=B.FIRE, outline=0)
    g = Geo().sphere((G0[0] + 3.0, G0[1] - 2.6, G0[2] + 5.4), 1.4, cuts=3)
    rig.part("pan", g, glow="#FFFFFF", outline=0)
    # a paper cartridge in the near hand for the reload beat (bitten open, poured in the pan)
    hx, hy, hz = 0.0, ARM_Y["r"], B.HAND_Z
    rig.joint("cart", "hand_r", (hx + 2.0, hy - 3.0, hz), hidden=True)
    g = Geo().capsule((hx + 2.0, hy - 3.6, hz - 1.0), (hx + 2.0, hy - 3.6, hz + 5.5), 1.5)
    rig.part("cart", g, B.CREAM, outline=0.5)
    # the big powder cloud (world placed in front of the kneeling muzzle)
    G.smoke_cloud(rig, "root", (MUZZ_KNEEL[0] + 9.0, -16.0, MUZZ_KNEEL[1]), size=1.6)
    if getattr(rig, "skin", None) == "toy_soldier":
        # a brass wind-up key in his back and painted cheeks
        g = Geo().capsule((-9.6, 0, 31.0), (-14.6, 0, 31.0), 1.1)
        g.sphere((-15.0, 0, 31.0), 1.5, cuts=3)
        g.blob((-16.2, 0, 33.8), (2.0, 0.9, 2.5), p=2.2)
        g.blob((-16.2, 0, 28.2), (2.0, 0.9, 2.5), p=2.2)
        rig.part("torso", g, B.BRASS, finish="metal", outline=0.6)
        head = G.head_geos(center=(2, 0, 48.5), nose=(13.6, -0.6, 46.8))
        c = GW.on_surface(rig, "head", [head], 9.8, 44.6)
        rig.part("head", Geo().blob(c, (2.4, 0.7, 2.0), p=2.2), CHEEK, outline=0)
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry (COMMON C1)
        _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40; art/blender/README.md): never on the face or skin. Placed where the posed frames
    show them (the probe's camera rays in idle, walk and both shots, W1 lesson 4): the coat skirt's front flap
    (the largest team surface the musket and the near arm leave clear), the coat's back edge behind the arm, the
    coat tails, the shako's team body; a torn strip from the skirt's back hem."""
    rig.damage_spot_at("coat", "hips", 8.0, 16.0, 8.0, "cloth", team=True)
    rig.damage_spot_at("back", "torso", -10.0, 26.0, 7.0, "cloth", team=True)
    rig.damage_spot_at("tails", "tails", -8.0, 14.0, 7.0, "cloth", team=True)
    rig.damage_spot_at("shako", "hat", -4.0, 64.0, 6.0, "cloth", team=True)
    rig.damage_spot_at("hem", "hips", -8.0, 12.0, 8.0, "cloth", kind="strip", team=True)


# -- poses ---------------------------------------------------------------------------------
KNEEL = 7.5          # hips drop to kneel on the far knee
MUZZ_KNEEL = (57.0, 26.0)


def gun_point(gx, gz, deg, p):
    """Torso-space (x, z) of a gun-rest point p (x, z) for a grip at (gx, gz) and angle deg."""
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    dx, dz = p[0] - G0[0], p[1] - G0[2]
    return (gx + dx * c - dz * s, gz + dx * s + dz * c)


def hold(gx, gz, deg, near=None, fore=FORE):
    """Musket grip at (gx, gz) in torso space pointing `deg`; both arms solved to hold it.
    near=(x, z) moves the near hand off the grip to that point (the reload beat); `fore` slides the far hand
    along the musket (the hip fire and the steep aims grip it closer, inside the far arm's reach)."""
    pose = {"gun": {"x": gx - G0[0], "z": gz - G0[2], "r": deg}}
    if fore != FORE:
        pose["gunhand"] = {"x": fore - FORE}
    tx, tz = near if near else (gx - 0.4, gz + 0.4)
    a, f = B.ik2(SH, (tx, tz))
    pose.update(B.arm("r", a, f))
    fx_, fz = gx + fore * math.cos(math.radians(deg)), gz + fore * math.sin(math.radians(deg))
    a, f = B.ik2(SH, (fx_ - 1.0, fz - 1.0))
    pose.update(B.arm("l", a, f))
    return pose


PORT = (6.0, 25.0, 48.0)   # grip x, z, musket angle: port arms, bayonet up


def _idle(f):
    # breathing at port arms; he bounces the musket once (3) and dips his head to check the
    # pan (2-3); blink on 5
    chk = [0.0, 0.3, 1.0, 0.8, 0.2, 0.0][f]
    bounce = [0.0, 0.0, 0.0, 1.0, 0.3, 0.0][f]

    def extra(ctx):
        return merge(hold(PORT[0] + 0.4 * ctx["lag"], PORT[1] + 0.6 * ctx["lag"] + 1.2 * bounce,
                          PORT[2] + 1.5 * ctx["lag"] - 4 * chk),
                     {"head": {"r": -5 * chk}, "pupils": {"z": -0.6 * chk}})
    return M.idle_v2(f, {"torso": {"r": -1}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


# -- walk v3: G1 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 82 ms -------------
SPEED = 81.25
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED, cycle_ms=656, stance=0.36)
SLOPE = (7.0, 33.0, 135.0)   # slope arms: the grip in front of the chest, the barrel on the shoulder


def slope(gx, gz, deg):
    """The musket sloped on the near shoulder, the near hand on the grip; the far hand lets go."""
    a, f = B.ik2(SH, (gx - 0.4, gz + 0.4))
    return merge({"gun": {"x": gx - G0[0], "z": gz - G0[2], "r": deg}, "gunhand": {"hide": True}},
                 B.arm("r", a, f))


CARRY = merge(slope(*SLOPE), {"torso": {"r": -2}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"gun": {"z": 0.8 * lag, "r": 4.0 * lag}, "tails": {"r": 5 * lag}, "queue": {"r": 6 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-8.0, twist=6.0, nod=3.0,
                     arms={"l": K.ArmChain("l")}, extra=extra, report=report)


# kneel_fire (items 51/52, the front rank of a Firing Line; the shipped attack A until W2): KNEEL AND FIRE, then
# reload, 790 ms with the shot at 374 ms, 12 steps. Rendered into the extras sheet (pipeline.POSE_CLIPS); nothing
# plays it until items 51 and 52 are built.
#            lower kneel shoulder AIM(held) pan | FIRE kick cloud rise ram ram port
ATTACK_MS = [40, 50, 54, 160, 70, 70, 60, 60, 56, 50, 50, 70]
ATTACK_IMPACT = 5
#         (grip x, grip z, musket angle) in torso space
KNEEL_GUN = [(6.0, 25.0, 30.0), (5.0, 28.0, 14.0), (5.0, 31.5, 3.0), (5.0, 32.0, 1.0), (5.0, 32.0, 1.0),
       (4.6, 32.0, 0.0), (1.8, 33.8, 14.0), (3.0, 32.8, 7.0), (6.0, 25.0, 16.0), (6.0, 26.0, 22.0),
       (6.0, 27.0, 14.0), (6.0, 25.0, 48.0)]
KNEEL_KN = [0.0, 0.7, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.3, 0.0, 0.0, 0.0]   # kneel amount
KNEEL_LEAN = [-2, -8, -9, -11, -11, -9, 2, 0, -2, -2, -3, -1]
KNEEL_HEAD = [-2, -4, -8, -11, -11, -9, 6, 2, -4, -10, -8, 0]
KNEEL_X = [0.0, 0.5, 0.5, 1.0, 1.0, 0.0, -3.5, -2.5, -1.0, 0.0, 0.0, 0.0]
KNEEL_Q = [0.0, -0.08, -0.03, -0.04, -0.05, 0.03, -0.1, -0.04, 0.05, -0.04, 0.03, 0.0]
# reload beat: the near hand goes to the cartridge box, to the mouth (bites it open), to the pan
RELOAD = {8: (-6.0, 21.0), 9: (11.0, 42.0), 10: None}



def _kneel(k):
    """Down on the far knee, the near foot planted forward (the walk v3 legs, as the Longbowman)."""
    return merge({
        "thigh_r": {"r": 88 * k}, "shin_r": {"r": -92 * k}, "foot_r": {"r": 4 * k},
        "thigh_l": {"r": -4 * k}, "shin_l": {"r": -96 * k}, "foot_l": {"r": -30 * k},
    }, M.body_about((0, 0, 22), z=-10.5 * k))


def _kneel_pose(f):
    gx, gz, deg = KNEEL_GUN[f]
    near = None
    if f in RELOAD:
        # the reload: cartridge box, mouth, then the pan
        near = RELOAD[f] if f != 10 else gun_point(gx, gz, deg, (G0[0] + 3.0, G0[2] + 5.0))
    pose = merge(hold(gx, gz, deg, near=near), _kneel(KNEEL_KN[f]), {
        "torso": {"r": KNEEL_LEAN[f]},
        "head": {"r": KNEEL_HEAD[f], "x": [0, 0.4, 1.0, 1.4, 1.4, 1.2, 0, 0, 0, 0, 0, 0][f]},
        "pan": {"show": f == 4},
        "flash": {"show": f == 5},
        "smoke": {"show": f in (6, 7, 8), "s": [1, 1, 1, 1, 1, 1, 0.8, 1.0, 1.0, 1, 1, 1][f],
                  "x": [0, 0, 0, 0, 0, 0, -4, 2, 8, 0, 0, 0][f], "z": [0, 0, 0, 0, 0, 0, 0, 3, 8, 0, 0, 0][f]},
    }, M.body_about((0, 0, 20), x=KNEEL_X[f], q=KNEEL_Q[f]))
    if f in RELOAD:
        pose["cart"] = {"show": True}
    if f in (0, 1, 7, 8, 11):
        pose = merge(pose, {"thigh_r": {"r": [4, 0, 0, 0, 0, 0, 0, 2, 8, 0, 0, 4][f]}})
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze", "grit"), {"brow": {"z": -1.0}})
    elif f in (5, 6):
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif f in (9, 10):
        pose = merge(pose, F.expr("grit"))
    return pose


def _kneel_volley():
    ov = {
        5: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 9.0, "r1_lu": 15.0, "n": 6,
             "a0": -70.0, "arc": 140.0, "color": "#FFF4D6"}],
        1: [{"kind": "dust", "ground": (-8.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 32, "spread": 0.8}],
        6: [{"kind": "dust", "ground": (-10.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 31, "spread": 0.8,
             "dir": -1.0}],
    }
    # 11 unique poses (atlas budget): the kick pose is held while the cloud billows (no frame 7)
    keep = [f for f in range(12) if f != 7]
    ov = {keep.index(k): v for k, v in ov.items() if k in keep}
    # the hold loops with the pan-fizz frame while the sim wind-up lasts (2.7x, ANIM_SPEC R5)
    return M.clip("kneel_fire", [_kneel_pose(f) for f in keep], ATTACK_MS, impact=keep.index(ATTACK_IMPACT),
                  overlays=ov, sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 8, 9, 10],
                  extra={"holdStep": 3, "holdLoop": [3, 4]})



# attack (W2): HIP FIRE, the same 790 ms, shot (impact) at 374 ms (impactAt 0.4734) and 12 steps as the kneeling shot
# it replaced; the grip at the hip, the far hand closer along the stock, the body at the standing height of B.
#            read                lower               brace               AIM (held)          pan
HIP_GUN = [(6.0, 25.0, 30.0), (4.0, 25.0, 14.0), (2.6, 23.4, 9.0), (2.0, 23.0, 8.0), (2.0, 23.2, 8.6),
           #  FIRE               kick                cloud               box                 bite
           (2.0, 23.0, 8.0), (0.2, 24.6, 22.0), (1.0, 24.0, 15.0), (6.0, 25.0, 16.0), (6.0, 26.0, 22.0),
           #  prime              port
           (6.0, 27.0, 14.0), (6.0, 25.0, 48.0)]
HIP_FORE = [FORE, 7.0, 6.0, 6.0, 6.0, 6.0, 6.0, 6.0, FORE, FORE, FORE, FORE]
HIP_LEAN = [-2, -5, -7, -8, -8, -8, 0, -3, -2, -2, -3, -1]
HIP_HEAD = [-2, -4, -6, -7, -7, -6, 6, 2, -4, -10, -8, 0]
HIP_X = [0.0, 0.5, 0.8, 1.0, 1.0, 0.6, -3.0, -2.0, -1.0, 0.0, 0.0, 0.0]
HIP_Q = [0.0, -0.05, -0.03, -0.04, -0.05, 0.03, -0.1, -0.04, 0.05, -0.04, 0.03, 0.0]
HIP_FEET = [None, ((3.5, 0, 0), (-3.5, 0, 0)), ((5.0, 0, 0), (-5.0, 0, 0)), ((5.5, 0, 0), (-5.5, 0, 0)),
            ((5.5, 0, 0), (-5.5, 0, 0)), ((5.5, 0, 0), (-5.5, 0, 0)), ((4.5, 0, 0), (-9.5, 0, -8)),
            ((3.5, 0, 0), (-6.0, 0, 0)), None, None, None, None]
HIP_SMOKE_Z = 9.0      # the cloud sits this much higher than it did for the kneeling muzzle
KEEP = [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11]   # the unique poses (the kick is held while the cloud billows)

# aimed attacks (queue item 44, ageborn_art/aimed.py): a turn of `turn` degrees up tips the musket up about the grip
# (at the hip the butt drops along the thigh; at the shoulder the grip rises and draws back toward the cheek), leans
# the body back into the shot and the head with it; the far hand slides down the stock as the muzzle climbs.
AIM_LEAN_H, AIM_RISE_H, AIM_DRAW_H = 0.12, 0.04, 0.03     # hip fire: lean per degree, grip rise and draw (lu)
AIM_LEAN, AIM_RISE, AIM_DRAW = 0.24, 0.11, 0.05           # shoulder shot (as the Crossbowman)
AIM_HEAD = 0.30
AIM_W = [0.0, 0.45, 0.85, 1.0, 1.0, 1.0, 0.75, 0.3, 0.0, 0.0, 0.0]   # per unique frame; the reload stays A's


def _attack_pose(f, turn=0.0):
    gx, gz, deg = HIP_GUN[f]
    lean = AIM_LEAN_H * turn
    if turn:
        up = max(0.0, turn)
        gx, gz, deg = gx - AIM_DRAW_H * up, gz + AIM_RISE_H * up, deg + turn - lean
    near = None
    if f in RELOAD:
        near = RELOAD[f] if f != 10 else gun_point(gx, gz, deg, (G0[0] + 3.0, G0[2] + 5.0))
    sz = [0, 0, 0, 0, 0, 0, HIP_SMOKE_Z, HIP_SMOKE_Z + 3, HIP_SMOKE_Z + 8, 0, 0, 0][f]
    pose = merge(hold(gx, gz, deg, near=near, fore=HIP_FORE[f]), {
        "torso": {"r": HIP_LEAN[f] + lean},
        "head": {"r": HIP_HEAD[f] + AIM_HEAD * turn, "x": [0, 0.4, 1.0, 1.4, 1.4, 1.2, 0, 0, 0, 0, 0, 0][f]},
        "pan": {"show": f == 4},
        "flash": {"show": f == 5},
        "smoke": {"show": f in (6, 7, 8), "s": [1, 1, 1, 1, 1, 1, 0.8, 1.0, 1.0, 1, 1, 1][f],
                  "x": [0, 0, 0, 0, 0, 0, -4, 2, 8, 0, 0, 0][f] + 0.1 * max(turn, 0.0),
                  "z": sz + 0.35 * max(turn, 0.0)},     # the cloud follows a raised muzzle, in front of him
    }, M.body_about((0, 0, 20), x=HIP_X[f], q=HIP_Q[f]))
    if f in RELOAD:
        pose["cart"] = {"show": True}
    if HIP_FEET[f]:
        r, l = HIP_FEET[f]
        pose = G.plant(RIG, pose, LEGS, r=r, l=l)
    elif f in (0, 11):
        pose = merge(pose, {"thigh_r": {"r": 4}})
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze", "grit"), {"brow": {"z": -1.0}})
    elif f in (5, 6):
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif f in (9, 10):
        pose = merge(pose, F.expr("grit"))
    return pose


def _attack_clip():
    ov = {
        5: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 9.0, "r1_lu": 15.0, "n": 6,
             "a0": -70.0, "arc": 140.0, "color": "#FFF4D6"}],
        1: [{"kind": "dust", "ground": (-8.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 32, "spread": 0.8}],
        6: [{"kind": "dust", "ground": (-10.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 31, "spread": 0.8,
             "dir": -1.0}],
    }
    ov = {KEEP.index(k): v for k, v in ov.items() if k in KEEP}
    # the hold loops with the pan-fizz frame while the sim wind-up lasts (2.7x, ANIM_SPEC R5)
    return M.clip("attack", [_attack_pose(f) for f in KEEP], ATTACK_MS, impact=KEEP.index(ATTACK_IMPACT),
                  overlays=ov, sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 8, 9, 10],
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: standing shoulder shot (ANIM_SPEC appendix B) -------------------------------------
# unique frames: 0 = A read, 1 raise, 2 shoulder, 3 AIM (held: a wide braced stance, leaning into
# the level musket), 4 aim + pan fizz, 5 FIRE (flash), 6 kick (a step back, the cloud), 7 lower,
# 8-10 = A's reload (bite, prime, port arms). Same steps as A.
GUN_B = [None, (5.0, 30.0, 12.0), (4.0, 33.5, 2.0), (3.6, 34.0, -1.0), (3.6, 34.0, -1.0),
         (3.0, 34.2, 0.0), (0.4, 35.6, 16.0), (4.0, 28.0, 24.0)]
LEAN_B = [0, 0, 1, 2, 2, 2, 8, 0]
HEAD_B = [0, -3, -7, -10, -10, -9, 6, 0]
BX_B = [0, 0.5, 0.5, 0.5, 0.5, 0.0, -4.5, -2.0]
BQ_B = [0, -0.04, -0.02, -0.05, -0.06, 0.04, -0.1, 0.03]
FEET_B = [None, ((3.5, 0, 0), (-3.5, 0, 0)), ((4.5, 0, 0), (-4.0, 0, 0)), ((5.0, 0, 0), (-4.5, 0, 0)),
          ((5.0, 0, 0), (-4.5, 0, 0)), ((5.0, 0, 0), (-4.5, 0, 0)), ((4.0, 0, 0), (-9.0, 0, -8)),
          ((3.0, 0, 0), (-5.0, 0, 0))]


def _b_pose(f, turn=0.0):
    gx, gz, deg = GUN_B[f]
    lean = AIM_LEAN * turn
    up = max(0.0, turn)
    if turn:
        gx, gz, deg = gx - AIM_DRAW * up, gz + AIM_RISE * up, deg + turn - lean
    pose = merge(hold(gx, gz, deg, fore=FORE - 0.06 * up), {
        "torso": {"r": LEAN_B[f] + lean},
        "head": {"r": HEAD_B[f] + AIM_HEAD * turn, "x": [0, 0.4, 1.0, 1.4, 1.4, 1.2, 0, 0][f]},
        "pan": {"show": f == 4},
        "flash": {"show": f == 5},
        # the cloud billows in front of the standing muzzle (about 11 lu higher than the kneel)
        "smoke": {"show": f in (6, 7), "s": [1, 1, 1, 1, 1, 1, 1.05, 0.95][f],
                  "x": [0, 0, 0, 0, 0, 0, 0, 10][f] + 0.1 * up, "z": [0, 0, 0, 0, 0, 0, 11, 17][f] + 0.35 * up},
    }, M.body_about((0, 0, 20), x=BX_B[f], q=BQ_B[f]))
    r, l = FEET_B[f]
    pose = G.plant(RIG, pose, LEGS, r=r, l=l)
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze", "grit"), {"brow": {"z": -1.0}})
    elif f == 5:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif f == 6:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.4}})
    return pose


def _b_poses(turn_of=lambda u: 0.0):
    """B's 11 unique poses: A's read, B's own 1-7, A's reload (9-11)."""
    return [_attack_pose(0)] + [_b_pose(f, turn_of(f)) for f in range(1, 8)] + [_attack_pose(f) for f in (9, 10, 11)]


def _b_turned(u, t):
    return _attack_pose(0) if u == 0 else _b_pose(u, t) if u <= 7 else _attack_pose(u + 1)


def _attack_b():
    ov = {
        5: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 9.0, "r1_lu": 15.0, "n": 6,
             "a0": -70.0, "arc": 140.0, "color": "#FFF4D6"}],
        6: [{"kind": "dust", "ground": (-14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 33, "spread": 0.8,
             "dir": -1.0}],
    }
    poses = _b_poses()
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", poses, ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 8, 9, 10], reuse=reuse,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


STANCE = hold(*PORT)


def _hit(k):
    def recoil(a):
        return merge(hold(PORT[0], PORT[1], PORT[2] + 12 * a), {
            "head": {"r": 16 * a}, "torso": {"r": 12 * a},
            "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
            "hat": {"z": 3.0 * max(a, 0), "r": 10 * a},
            "brow": {"z": 1.6 * max(a, 0)}})
    return M.hit_light(k, {}, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


# D2: the shako pops off on the slam (step 5) and rolls forward (x, z, spin from its rest pivot)
HAT_PATH = {5: (44.0, -48.0, -95.0), 6: (49.0, -38.0, -170.0), 7: (54.0, -50.0, -265.0),
            8: (57.0, -51.0, -330.0), 9: (58.0, -51.0, -355.0)}


def _die(k):
    stiff = [0.3, 0.6, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0][k]
    flop = [0, 0, 0, 0, 0, 0.6, 1.0, 0.8, 0.8, 0.8][k]
    gun = [60, 64, 50, 58, 72, 86, 88, 86, 86, 86][k]   # the musket ends up flat along him
    pose = merge(hold(PORT[0], PORT[1], gun), K.die_d2(k, toe_x=7.0, lie_lift=7.0), {
        "head": {"r": [14, 8, 0, 0, -2, -8, 4, 0, 0, 0][k]},
        "torso": {"r": 4 * (1 - stiff)},
        "thigh_r": {"r": 6 * (1 - stiff)}, "thigh_l": {"r": -4 * (1 - stiff)},
        "shin_r": {"r": -20 * flop}, "shin_l": {"r": -10 * flop},
    })
    if k in HAT_PATH:
        x, z, r = HAT_PATH[k]
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "o"), {"brow": {"z": 1.8}})
    elif k <= 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.4}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


# square (items 51/52, the square a line forms when cavalry charges): the bayonet levelled at chest height in a
# braced stance (front foot forward, back leg driving, a slight crouch), breathing; a loop of two poses.
SQUARE = [((5.5, 31.0, 14.0), -6, -2.0, 0.0), ((5.5, 30.6, 15.0), -7, -2.6, 0.4)]   # (grip, gun deg), lean, z, bob


def _square(k):
    (gx, gz, deg), lean, z, bob = SQUARE[k]
    pose = merge(hold(gx, gz + bob, deg, fore=7.0), {"torso": {"r": lean}, "head": {"r": -4 + 2 * k}},
                 M.body_about((0, 0, 20), x=1.0, z=z))
    pose = G.plant(RIG, pose, LEGS, r=(7.0, 0, 0), l=(-8.0, 0, 0))
    return merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})


def clips():
    attack, attack_b = _attack_clip(), _attack_b()
    # aimed up about 45 and 70 degrees at flyers (both variants; the extras sheet)
    aimed_a = AIMED.variants(RIG, attack, lambda u, t: _attack_pose(KEEP[u], turn=t), AIM_W, aims=("up45", "up70"))
    aimed_b = AIMED.variants(RIG, attack_b, _b_turned, AIM_W, aims=("up45", "up70"))
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        attack,
        attack_b,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 9)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ] + aimed_a + aimed_b + [
        _kneel_volley(),
        M.clip("square", [_square(k) for k in range(2)], [460, 460], loop=True),
    ]
    for v in aimed_a:
        AIMED.check_timing(attack, v)
    for v in aimed_b:
        AIMED.check_timing(attack_b, v)
    return M.check_variants(M.check_contract(cl, attack_ms=790, attack_impact_at=0.4734))
