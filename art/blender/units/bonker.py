"""Bonker: Stone Age infantry (DESIGN A5.2). Club, blunt, 68 lu.

Look (A11): chunky caveman with a big head (a third of his height), an angry V unibrow,
big eyes, a beard, messy hair, a team-dyed pelt tunic (stitched seams, fur tufts on the
edges, a bone hand-print emblem), a bone-tooth necklace, leather arm wraps, fur toe wraps
and an oversized cracked club with a lashed flint, held up and forward so it reads clear
of his head. The tunic is short so the legs show in the walk. Skin and wood stay under 40%
saturation (A11 rule).

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    bounces the club on the beat (it lifts and drops with a dip), weight shift, blink
  walk    walk v3 bounce jog at ground speed (ANIM_SPEC G1): the club on his shoulder, the far
          arm pumping, planted feet, a trailing toe on the contact frames
  attack_b  horizontal baseball sweep at chest height
  attack_c  tap-tap-BONK: two quick ground taps, then a short overhead bonk
  attack  HOP-UP OVERHEAD SMASH: dips with the club lowered, rises on his toes and arches
          back with the club cocked high behind his head (the held extreme reads as a black
          silhouette), hops in with the club whipping over the top (two smear frames), smashes it
          into the ground (dust, impact lines, yell), the club BOUNCES back up and settles
  hit     light: head snaps back, front foot up, eyes squeezed, then an overshoot forward
  die     D1 fling and spin: the club flies up out of his hand, he spins 1.25 turns, lands
          on his back with X eyes and his tongue out
"""
import math

from ageborn_art import colors as C
from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import look
from ageborn_art import moves as M
from ageborn_art.anim import merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "bonker"
GAIT_NAME = "biped"
NAME = "Bonker"
HEIGHT_LU = 68
CANVAS = (280, 224)
FEET = (112, 198)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

# the detail standard (art round W0, ageborn_art/look.py): lifts L1-L3 and L5, material kinds per colour
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 1.35        # a brighter finish highlight (skin, hide, bone): the highlight share floor (0.06)
# W0 milestone 7 (the art gate's SHD 3): a clearer light-to-shadow structure on skin, hair and the pelt (look.SHADE):
# a lit top, a core shadow along the terminator, a darker shadow band, a deeper cavity and a brighter rim
LOOK_SHADE = {"shadow": 0.82, "core": 0.22, "core_width": 0.32, "gradient": 2.2, "cavity": 0.62, "rim_mix": 0.52,
              "top": 0.14, "top_t": 0.60, "team_core": 0.4}
LOOK_RIM = {"lift": 0.52, "full_lu": 0.6}

SKIN = "#EBC4A0"
HAIR = "#3B2D25"
WOOD = "#C2A27E"
WOOD_DK = "#8E7258"
STUD = "#5E5A57"
FLINT = "#7C8088"
FUR = "#75685B"
LEATHER = "#7A5E48"
LEATHER_DK = "#56412F"
BONE = "#F0E6CC"
STUD_LT = "#8E8984"
FLINT_LT = "#A3A7AE"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2424"
TOOTH = "#F4EEDC"
HAIR_LT = "#5E4A3C"       # lighter locks in the hair (two tones)
PAINT = "#5A4239"         # ochre-brown war paint (hue 15, saturation 0.37: under the colour rule)
CHEEK = "#D9A889"         # a ruddy cheek and ear (saturation 0.37, 16 levels under the skin)

# club geometry along +Z from the fist; the head is centred CLUB_HEAD lu up the club
FIST = (4.0, -13.0, 21.0)
CLUB_HEAD = 36.0
CLUB_R = 10.0


def _club(rig, joint, base, axis_sign=1.0):
    """The cracked club, lathed along +Z from `base`, with stone studs, a lashed flint
    blade, grip wraps and a crack. Returns nothing; parts go on `joint`."""
    cx, cy, cz = base
    h = CLUB_HEAD
    g = Geo().lathe([(0, -4.5), (2.6, -4.2), (2.7, -1), (3.0, 14), (4.4, h - 10), (8.0, h - 5.5),
                     (CLUB_R, h), (CLUB_R * 0.96, h + 4.2), (7.2, h + 8.2), (0, h + 9.8)],
                    (cx, cy, cz), segs=18)
    rig.part(joint, g, WOOD)
    # grip wraps and a knob pommel
    g = Geo()
    for z in (-2.0, 2.2, 6.4):
        g.lathe([(3.25, 0), (3.5, 0.8), (3.5, 2.6), (3.2, 3.2)], (cx, cy, cz + z), segs=14)
    rig.part(joint, g, team=True, outline=0.8)    # team grip wraps (the 18% rule with the club across him)
    g = Geo().sphere((cx, cy, cz - 5.5), 3.6, cuts=3)
    rig.part(joint, g, LEATHER, outline=0.8)
    # dark stone studs with chipped, lighter tips (two tones; the tip is 2.6 lu)
    g, gt = Geo(), Geo()
    for d, z in (((-1, 0, 0.3), h - 1), ((0.25, -1, 0.1), h - 3.0),
                 ((-0.4, -1, 0.5), h + 4.5), ((0.1, 0, 1), h + 10.0)):
        b = (cx + d[0] * CLUB_R * 0.8, cy + d[1] * CLUB_R * 0.8, cz + z)
        tip = (b[0] + d[0] * 4.8, b[1] + d[1] * 4.8, b[2] + d[2] * 4.8)
        g.lathe([(3.0, 0), (2.4, 2.8), (0, 5.2)], b, tip, segs=10)
        mid = (b[0] + d[0] * 2.9, b[1] + d[1] * 2.9, b[2] + d[2] * 2.9)
        gt.lathe([(1.45, 0), (0, 2.5)], mid, (mid[0] + d[0] * 2.5, mid[1] + d[1] * 2.5, mid[2] + d[2] * 2.5), segs=8)
    rig.part(joint, g, STUD, finish="gloss")
    rig.part(joint, gt, STUD_LT, outline=0)
    # wood character on the club head's near face: a knot hole and short grain streaks (dark, 1 lu)
    g = Geo()
    a = math.radians(-82.0)
    for z0, z1, r0, r1, da in ((h - 9.0, h - 4.6, 5.4, 8.3, -10.0), (h - 6.2, h - 1.8, 7.1, 9.6, 14.0),
                               (h + 1.0, h + 4.6, 9.9, 9.2, 30.0)):
        a0, a1 = a + math.radians(da), a + math.radians(da + 8.0)
        g.capsule((cx + (r0 + 0.1) * math.cos(a0), cy + (r0 + 0.1) * math.sin(a0), cz + z0),
                  (cx + (r1 + 0.1) * math.cos(a1), cy + (r1 + 0.1) * math.sin(a1), cz + z1), 0.5, segs=8, rings=2)
    kn = (cx + 9.9 * math.cos(a - 0.35), cy + 9.9 * math.sin(a - 0.35), cz + h - 0.6)
    g.blob(kn, (1.5, 0.6, 1.9), p=2.0, rot=(0, 0, math.degrees(a - 0.35) + 90))
    rig.part(joint, g, WOOD_DK, outline=0, highlight=False)
    # a dark leather band bound over the top of the grip (2.6 lu)
    g = Geo().lathe([(3.2, 0), (3.85, 0.5), (3.9, 1.3), (3.85, 2.1), (3.2, 2.6)], (cx, cy, cz + 10.4), segs=16)
    rig.part(joint, g, LEATHER_DK, outline=0.6)
    # a big flint blade lashed to the front of the head (its signature shape), knapped into facets
    g2 = Geo()
    fx, fz = cx + CLUB_R * 0.72, cz + h + 1.0
    g2.slab([(fx, fz - 6.5), (fx + 9.5, fz - 2.5), (fx + 13.0, fz + 1.0), (fx + 8.5, fz + 5.0),
             (fx, fz + 6.0)], cy - 1.0, 3.2)
    rig.part(joint, g2, FLINT, finish="gloss")
    g = Geo()
    for pts in ([(fx + 3.0, fz - 4.4), (fx + 9.0, fz - 1.9), (fx + 6.4, fz + 0.4), (fx + 2.6, fz - 0.6)],
                [(fx + 8.6, fz + 0.2), (fx + 11.8, fz + 1.0), (fx + 8.4, fz + 4.0), (fx + 5.6, fz + 2.6)]):
        g.slab(pts, cy - 2.75, 0.5)
    rig.part(joint, g, FLINT_LT, finish="gloss", outline=0)
    # lashing: cream cord wraps over the blade root
    g = Geo()
    for dz in (-3.2, 0.2, 3.6):
        g.capsule((fx - 2.0, cy - 3.2, fz + dz), (fx + 1.6, cy - 3.2, fz + dz - 0.8), 1.3)
    rig.part(joint, g, BONE, finish="gloss", outline=0.6)
    # the crack: a dark zig-zag groove on the near face of the head
    g = Geo()
    pts = [(cx - 2.5, cz + h + 7.0), (cx - 0.8, cz + h + 3.5), (cx - 3.4, cz + h + 0.5),
           (cx - 1.4, cz + h - 3.5)]
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        g.capsule((x0, cy - CLUB_R * 0.93, z0), (x1, cy - CLUB_R * 0.93, z1), 0.9)
    rig.part(joint, g, WOOD_DK, outline=0, highlight=False)


HIP_Z, KNEE_Z, ANKLE_Z = 19.5, 11.5, 4.0   # walk v3: longer legs (ANIM_SPEC 2.0 rule 5)
LIFT = 2.0                                   # the upper body sits 2 lu higher (legs show)
SKIN_FAR = C.scale(SKIN, 0.80)               # far leg 20% darker (near and far feet read apart)
FUR_FAR = C.scale(FUR, 0.80)
LEATHER_FAR = C.scale(LEATHER, 0.80)
MATERIAL_KINDS = {SKIN: "skin", SKIN_FAR: "skin", HAIR: "fur", WOOD: "wood", WOOD_DK: "wood", STUD: "stone",
                  FLINT: "stone", FUR: "fur", FUR_FAR: "fur", LEATHER: "leather", LEATHER_FAR: "leather",
                  BONE: "bone", LEATHER_DK: "leather", C.scale(LEATHER_DK, 0.8): "leather", STUD_LT: "stone",
                  FLINT_LT: "stone", HAIR_LT: "fur", CHEEK: "skin", "team": "hide"}


def build(rig):
    global RIG
    RIG = rig
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, 15))
    rig.joint("torso", "hips", (0, 0, 16))
    rig.rest_offset["torso"] = (0, 0, LIFT)
    rig.joint("head", "torso", (1, 0, 38))
    for side, y in (("r", -6.0), ("l", 6.0)):
        rig.joint(f"thigh_{side}", "hips", (0, y, HIP_Z))
        rig.joint(f"shin_{side}", f"thigh_{side}", (0.5, y, KNEE_Z))
        rig.joint(f"foot_{side}", f"shin_{side}", (1.0, y, ANKLE_Z))
    for side, y in (("r", -12.5), ("l", 12.0)):
        rig.joint(f"arm_{side}", "torso", (0, y, 36))
        rig.joint(f"fore_{side}", f"arm_{side}", (1.5, y - 0.5 * (1 if y < 0 else -1), 28.5))
    rig.joint("club", "fore_r", FIST)

    # legs: stocky, longer than v2 so two feet read in the jog; short fur toe wraps (8.8 lu long)
    for side, y in (("r", -6.0), ("l", 6.0)):
        skin = SKIN if side == "r" else SKIN_FAR
        fur = FUR if side == "r" else FUR_FAR
        g = Geo().capsule((0, y, HIP_Z), (0.5, y, KNEE_Z), 4.2, 3.5)
        rig.part(f"thigh_{side}", g, skin)
        g = Geo().capsule((0.5, y, KNEE_Z), (1.0, y, ANKLE_Z + 0.4), 3.5, 3.1)
        rig.part(f"shin_{side}", g, skin)
        g = Geo().blob((0.9, y, 6.4), (3.9, 3.9, 2.2), p=2.4)   # fur ankle wrap
        rig.part(f"shin_{side}", g, fur, finish="hair")
        g = Geo().blob((2.6, y, 2.4), (4.4, 4.5, 2.7), p=2.6, taper=(1.0, 0.85))
        for dx in (4.6, 6.2):   # fur tufts at the toe
            g.lathe([(1.5, 0), (0, 2.4)], (dx, y - 2.8, 4.0), (dx + 1.0, y - 3.2, 6.0), segs=8)
        rig.part(f"foot_{side}", g, fur, finish="hair")
        g = Geo().capsule((0.6, y, 10.2), (0.95, y, 7.6), 3.9, 3.7)
        rig.part(f"shin_{side}", g, team=True, outline=0.7)   # team shin wraps (the 18% rule)
        # leather cords crossed over the wraps (a second tone in the team zone, 1.1 lu lines)
        g = Geo()
        yc = y - 3.95 if side == "r" else y - 3.6
        for (x0, z0), (x1, z1) in (((-1.2, 10.9), (2.6, 7.2)), ((2.7, 10.9), (-1.0, 7.2))):
            g.capsule((x0, yc, z0), (x1, yc, z1), 0.55, segs=8, rings=2)
        rig.part(f"shin_{side}", g, LEATHER_DK if side == "r" else C.scale(LEATHER_DK, 0.8), outline=0)

    # torso: bare chest, team pelt top with a shoulder strap; a short skirt (the legs show)
    g = Geo().blob((0, 0, 29), (11.5, 9.8, 11.5), p=2.2, taper=(1.08, 0.92))
    rig.part("torso", g, SKIN)
    pelt = Geo().blob((0.6, 0, 25.0), (13.2, 11.4, 6.2), p=2.5, taper=(1.06, 0.94))
    pelt.capsule((9.8, 6.0, 26.5), (3.5, -9.0, 38.5), 3.4, 3.4)
    stitch_face = F.Face(rig, "torso", [pelt])
    rig.part("torso", pelt, team=True)
    # fur tufts along the pelt's top edge (triangle notches, non-team fur)
    g = Geo()
    for x, y in ((10.5, -4.5), (5.0, -10.0), (-3.0, -10.5), (-9.5, -6.0)):
        g.lathe([(2.3, 0), (0, 3.6)], (x, y, 30.0), (x - 0.6, y - 0.5, 33.4), segs=8)
    rig.part("torso", g, FUR, finish="hair")
    # stitched seam and the bone hand-print emblem above the belt (decals on the pelt's near face)
    g = Geo()
    c = stitch_face.hit(-4.0, 28.6)
    for k in range(3):
        u = -2.6 + k * 2.6
        stitch_face.stroke(g, c, [(u - 0.7, 1.4), (u + 0.7, -1.4)], 1.1, 0.4)
    rig.part("torso", g, BONE, highlight=False, outline=0)
    g = Geo()
    c = stitch_face.hit(6.2, 28.2)
    stitch_face.decal(g, c, F.ellipse(0, -0.6, 2.2, 1.8, 12), 0.4)
    for a, L in ((60, 2.6), (85, 3.0), (110, 2.8), (135, 2.3), (10, 2.3)):
        r = math.radians(a)
        stitch_face.stroke(g, c, [(0.0 + math.cos(r) * 1.5, -0.6 + math.sin(r) * 1.5),
                                  (math.cos(r) * (1.5 + L), -0.6 + math.sin(r) * (1.5 + L))], 1.2, 0.4)
    rig.part("torso", g, BONE, highlight=False, outline=0)
    # wildcat spots on the pelt in the team-dark tone (the team zone in two tones, still team)
    g = Geo()
    for x, z, rx, rz in ((0.6, 29.2, 1.7, 1.35), (-8.6, 27.4, 1.5, 1.25), (-1.8, 20.6, 1.6, 1.2),
                         (6.0, 20.4, 1.4, 1.1), (11.2, 21.2, 1.2, 1.0)):
        stitch_face.decal(g, stitch_face.hit(x, z), F.ellipse(0, 0, rx, rz, 10), 0.35)
    look.team_part(rig, "torso", g, outline=0)
    # a dyed hide belt (3 lu) round the pelt in the team-dark tone (a stripe in the team zone that keeps its
    # team area), a carved bone plate as its buckle on the near side
    g = Geo().lathe([(13.0, 0.0), (13.9, 0.35), (14.05, 1.5), (13.9, 2.65), (13.0, 3.0)], (0.7, 0, 22.6),
                    segs=40, squash=(1.0, 0.86))
    look.team_part(rig, "torso", g, outline=0.8)
    g = Geo().blob((5.6, -12.25, 24.1), (2.7, 1.0, 2.2), p=2.4)
    rig.part("torso", g, BONE, finish="gloss", outline=0.6)
    g = Geo()
    face_b = F.Face(rig, "torso", [Geo().blob((5.6, -12.25, 24.1), (2.7, 1.0, 2.2), p=2.4)])
    face_b.decal(g, face_b.hit(5.6, 24.1), F.ellipse(0, 0, 0.9, 0.8, 8), 0.3)
    rig.part("torso", g, LEATHER_DK, outline=0, highlight=False)       # the hole the strap runs through
    # a dyed hide hip pouch with a fur flap and a bone toggle at the near back hip (it swings a frame late)
    rig.secondary("pouch", "torso", (-4.6, -12.4, 23.0), (-5.0, -12.8, 14.8), max_deg=14, gain=1.3)
    g = Geo().blob((-4.9, -12.7, 19.4), (3.3, 2.2, 3.7), p=2.6, taper=(1.12, 0.88))
    look.team_part(rig, "pouch", g)                 # dyed like the belt (team-dark: keeps the team budget)
    g = Geo().blob((-4.8, -14.5, 21.4), (3.6, 1.2, 2.1), p=2.8, taper=(1.0, 0.9))   # the flap, in front of the bag
    look.team_part(rig, "pouch", g, outline=0.6)          # dyed like the bag (the walk's team budget)
    g = Geo().sphere((-4.5, -15.8, 20.2), 1.2, cuts=2)
    rig.part("pouch", g, BONE, finish="gloss", outline=0.5)

    # a longer team cape that flares behind (a silhouette breaker; the team budget the belt and pouch use)
    rig.secondary("cape", "torso", (-6.5, 0, 37.5), (-12.5, 0, 20.0), max_deg=16, gain=1.2)
    cape = Geo().blob((-10.2, 0, 28.6), (3.6, 11.4, 10.8), p=2.4, taper=(1.4, 0.82))
    for y in (-8.6, -4.0, 1.0, 6.0):
        cape.lathe([(2.6, 0), (0, -3.8)], (-12.6, y, 19.0), segs=8)
    cf = F.Face(rig, "cape", [cape])
    rig.part("cape", cape, team=True)
    g = Geo()
    for x, z, rx, rz in ((-12.6, 31.0, 1.4, 1.2), (-14.2, 24.6, 1.6, 1.3)):
        cf.decal(g, cf.hit(x, z), F.ellipse(0, 0, rx, rz, 10), 0.35)
    look.team_part(rig, "cape", g, outline=0)
    rig.secondary("skirt", "hips", (0.6, 0, 22.0), (-1.0, 0, 13.0), max_deg=10, gain=0.9)
    rig.rest_offset["skirt"] = (0, 0, LIFT + 1.5)
    g = Geo().blob((0.8, 0, 21.2), (13.8, 11.9, 4.4), p=2.6, taper=(1.08, 0.98))
    for x, y in ((9.5, -6), (3, -11.5), (-5, -10.5), (11.5, 3), (-11, -3)):  # ragged hem
        g.lathe([(3.4, 0), (0, -3.6)], (x, y, 18.4), segs=10)
    rig.part("skirt", g, team=True)
    # bone-tooth necklace: big claws on a leather thong
    g = Geo()
    for k, (x, y, z) in enumerate(((9.4, -6.2, 37.6), (11.0, -1.6, 36.6), (10.2, 3.6, 37.0))):
        g.lathe([(2.0, 0), (1.7, 2.3), (0, 5.4)], (x, y - 1.2, z + 0.8), (x + 1.0, y - 1.6, z - 4.6), segs=8)
    rig.part("torso", g, BONE, finish="gloss", outline=0.6)
    g = Geo().lathe([(9.2, 0), (9.8, 0.3), (9.8, 1.4), (9.2, 1.7)], (1.2, 0, 37.0), (2.6, 0, 38.4), segs=22)
    rig.part("torso", g, LEATHER_DK, outline=0.5)
    # a dark chest tuft above the pelt (a shape on the bare chest, 3 lu)
    g = Geo()
    for (x, z), (x1, z1) in (((9.6, 35.0), (11.6, 31.8)), ((8.4, 34.2), (9.2, 30.6)), ((10.8, 35.6), (13.0, 33.2))):
        g.capsule((x, -6.6, z), (x1, -7.4, z1), 1.25, 0.6)
    rig.part("torso", g, HAIR, finish="hair", outline=0)

    if getattr(rig, "skin", None) == "pumpkin_head":
        _pumpkin_head(rig)
    else:
        _head(rig)
    _arms_and_club(rig)
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry (COMMON C1)
        _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, Stone soldier; art/blender/README.md, spot_preview.py): never on
    the face or skin. The team pelt in front of the belly, the hip pouch, the cape, the near shin wrap and the
    club head (a cracked club at stage 2); a strip torn from the cape's hem. Positions are the rest pose as
    drawn (the upper body sits LIFT higher). W0 milestone 7 (review A-S2): the first and biggest mark goes on the
    middle of the pelt behind the club arm, the largest team surface the arm and the club never cover (with the team
    skirt below it and the fur tufts above, a mark there never reaches skin)."""
    rig.damage_spot_at("pelt", "torso", -3.0, 24.5, 7.5, "hide", team=True)
    rig.damage_spot_at("pelt_front", "torso", 10.5, 25.0, 6.0, "hide", team=True)
    rig.damage_spot_at("pouch", "pouch", -6.1, 14.7, 5.0, "hide", team=True)
    rig.damage_spot_at("cape", "cape", -12.0, 30.0, 6.0, "hide", team=True)
    rig.damage_spot_at("wrap", "shin_r", 1.0, 9.0, 5.0, "hide", team=True)
    rig.damage_spot_at("club", "club", 8.0, 53.0, 5.0, "wood", fill=WOOD)
    rig.damage_spot_at("hem", "cape", -12.5, 23.0, 11.0, "hide", kind="strip", team=True)


def _head(rig):
    # head: big, jaw forward, beard, messy hair
    head = Geo().blob((2, 0, 50), (12, 11.5, 12), p=2.3)
    head.blob((6, 0, 44), (8.8, 9.6, 6.4), p=2.2)
    head.blob((14.0, -0.6, 49.0), (3.8, 3.4, 3.2), p=2.0)  # nose
    beard = Geo().blob((6.8, 0, 41.0), (8.4, 10.0, 5.2), p=2.3)   # beard
    beard.blob((-1.5, 0, 57.2), (12.6, 12.4, 7.6), p=2.2)       # hair cap
    beard.blob((-9.5, 0, 50.5), (6.0, 11.0, 9.0), p=2.2)        # back of the hair
    eyes = Geo()
    for y in (-4.8, 4.4):
        eyes.blob((11.4, y, 51.6), (4.3, 4.1, 5.3))
    pup = Geo()
    for y in (-4.8, 4.4):
        pup.blob((14.8, y - 0.5, 51.2), (1.5, 2.5, 2.6))
    face = F.Face(rig, "head", [head, beard, eyes, pup])
    rig.part("head", head, SKIN)
    rig.part("head", beard, HAIR, finish="hair")
    rig.part("head", eyes, EYE, highlight=False)
    rig.joint("pupils", "head", (14.8, 0, 51.2))
    rig.part("pupils", pup, PUPIL, outline=0)
    rig.secondary("hair", "head", (-1.0, 0, 60.0), (-6.0, 0, 68.0), max_deg=12, gain=1.1)
    g = Geo()
    for (x0, z0), (x1, z1), r in (((-2, 60), (-4, 69), 3.6), ((4, 60), (5, 67.5), 3.2),
                                  ((-8, 58), (-14, 63.5), 3.4), ((8, 57), (12.5, 61.5), 2.8)):
        g.capsule((x0, 0, z0), (x1, -1, z1), r, 1.2)
    rig.part("hair", g, HAIR, finish="hair")
    # lighter locks (two-tone hair, 2.6-3 lu wide), on the cap and down the back, so the hair is not one dark mass
    g = Geo()
    for (x0, z0), (x1, z1), r in (((-6.0, 61.0), (-12.0, 56.0), 1.45), ((0.5, 63.2), (-4.5, 60.8), 1.35),
                                  ((-11.0, 54.0), (-13.4, 47.0), 1.4), ((6.0, 61.6), (2.0, 63.6), 1.3)):
        g.capsule((x0, -10.4, z0), (x1, -10.6, z1), r, r * 0.75)
    rig.part("head", g, HAIR_LT, finish="hair", outline=0)
    g = Geo()
    for (x0, z0), (x1, z1) in (((-1.5, 64.0), (-3.5, 68.0)), ((-9.0, 59.5), (-13.0, 62.0))):
        g.capsule((x0, -2.6, z0), (x1, -2.8, z1), 1.3, 0.9)
    rig.part("hair", g, HAIR_LT, finish="hair", outline=0)
    # a bone pushed through the topknot, knobs out at both ends (a silhouette breaker, cream on dark hair)
    g = Geo().capsule((-16.4, -3.0, 59.4), (8.2, -3.0, 71.0), 1.1, 1.1)
    g.sphere((-16.9, -3.0, 59.0), 1.8, cuts=3).sphere((-16.5, -3.0, 60.8), 1.5, cuts=3)
    g.sphere((8.6, -3.0, 71.2), 1.8, cuts=3).sphere((7.7, -3.0, 72.6), 1.5, cuts=3)
    rig.part("hair", g, BONE, finish="gloss", outline=0.7)
    # angry V unibrow on its own joint (it lifts when he is hit)
    rig.joint("brow", "head", (12.5, 0, 56.0))
    g = Geo().capsule((11.0, -9.0, 58.4), (14.0, -0.4, 55.0), 3.2, 2.7)
    g.capsule((14.0, -0.4, 55.0), (11.2, 7.6, 58.2), 2.7, 3.1)
    rig.part("brow", g, HAIR, finish="hair")
    # default mouth: grimace with two teeth (a decal, so it reads at game size)
    rig.joint("mouth", "head", (13.5, 0, 44.8))
    g = Geo()
    c = face.hit(13.8, 44.6)
    face.decal(g, c, [(-2.6, 0.6), (2.4, 1.0), (2.6, -0.4), (-2.4, -0.8)], 0.4)
    rig.part("mouth", g, MOUTH, outline=0, highlight=False)
    g = Geo()
    face.decal(g, c - face.view * 0.25, [(-0.6, 0.9), (0.6, 1.0), (0.6, -0.1), (-0.6, -0.2)], 0.4)
    face.decal(g, c - face.view * 0.25, [(1.2, 1.0), (2.2, 1.1), (2.2, 0.1), (1.2, 0.0)], 0.4)
    rig.part("mouth", g, TOOTH, outline=0, highlight=False)
    face.eye_marks([(14.2, 51.6)], 4.2, SKIN)
    face.mouths((13.6, 44.2), 6.4)
    # a ruddy cheek and ear: a warmer, darker skin patch (16 levels under the skin) so the big face is not one field
    g = Geo()
    face.decal(g, face.hit(7.4, 47.6), F.ellipse(0, 0, 3.0, 2.2, 14), 0.35)
    rig.part("head", g, CHEEK, outline=0, highlight=False)
    g = Geo().blob((-1.6, -10.6, 50.2), (2.4, 1.6, 3.2), p=2.2)          # the ear, its rim catching the light
    rig.part("head", g, SKIN, outline=0.6)
    g = Geo()
    face.decal(g, face.hit(-1.4, 50.2), F.ellipse(0, 0, 1.1, 1.8, 10), 0.3)
    rig.part("head", g, CHEEK, outline=0, highlight=False)


# -- skin: Pumpkin Head (DESIGN A5.8, rare): a carved jack-o'-lantern gourd for a head -----------------------
# Same joints, trackers, poses and clips as the Bonker; the gourd replaces the head, hair, beard and face. The
# carved face sits on the face kit's joints (pupils, brow, mouth, lids, squeeze, ko_x, grit, yell2, ...), so
# every expression still plays: the eyes blink shut, the grin opens in a yell, the eyes go X on the KO. The
# leaf and the curly vine hang on the `hair` follow-through joint.
GOURD = "#CC9F7F"       # pumpkin, HSV saturation 0.38 (the A11 colour rule: orange is a team hue); it reads as
                        # a pumpkin by its lobes, deep grooves and glossy skin rather than by saturation
GOURD_DK = "#8C6C55"    # the grooves between the lobes (dark, saturation 0.39)
CARVE = "#3A2620"       # the carved holes
CANDLE = "#FCDE9C"      # the candle glow inside (an unshaded glow, saturation 0.38)
STEM = "#667A4E"        # green-grey (hue 87: outside the team hue bands)
LEAF = "#748C55"
GOURD_C, GOURD_R, GOURD_H, GOURD_LOBES, GOURD_DEPTH = (2.6, 0.0, 51.4), 14.2, 25.5, 8, 0.14
# skin variants of this script (ageborn_art/skins.py; DESIGN A5.8): extra material kinds per skin
SKINS = {"pumpkin_head": {"kinds": {GOURD: "cloth", GOURD_DK: "cloth", STEM: "wood", LEAF: "cloth"}}}


def _gourd_profile(r, h):
    return [(0, -h * 0.50), (r * 0.46, -h * 0.47), (r * 0.80, -h * 0.37), (r * 0.97, -h * 0.16), (r, 0.0),
            (r * 0.96, h * 0.17), (r * 0.82, h * 0.35), (r * 0.55, h * 0.46), (r * 0.22, h * 0.50), (0, h * 0.43)]


def _lobe(dx, dy):
    phi = math.atan2(dy, dx)
    return 1.0 - GOURD_DEPTH * (1.0 - math.cos(GOURD_LOBES * phi)) / 2.0


def _gourd(c=GOURD_C, r=GOURD_R, h=GOURD_H, sy=0.94):
    """A squat pumpkin lathed about the vertical axis, with GOURD_LOBES lobes pressed into its sides."""
    g = Geo()
    g.lathe(_gourd_profile(r, h), c, segs=56, squash=(1.0, sy))
    for v in g.bm.verts:
        dx, dy = v.co.x - c[0], v.co.y - c[1]
        k = _lobe(dx, dy / sy)
        v.co.x, v.co.y = c[0] + dx * k, c[1] + dy * k
    return g


def _pumpkin_head(rig):
    c, r, h, sy = GOURD_C, GOURD_R, GOURD_H, 0.94
    gourd = _gourd()
    face = F.Face(rig, "head", [gourd])
    rig.part("head", gourd, GOURD, finish="gloss")       # a glossy rind: the highlight reads as pumpkin
    # the grooves between the lobes: dark lines down the visible valleys (1.1 lu)
    g = Geo()
    prof = _gourd_profile(r, h)
    for k in range(GOURD_LOBES):
        phi = (2 * k + 1) * math.pi / GOURD_LOBES
        if math.sin(phi) > 0.45:          # the far side is hidden
            continue
        pts = []
        for rr, zz in prof[1:-2]:
            rad = rr * (1.0 - GOURD_DEPTH) + 0.25
            pts.append((c[0] + rad * math.cos(phi), c[1] + rad * math.sin(phi) * sy, c[2] + zz))
        for a, b in zip(pts, pts[1:]):
            g.capsule(a, b, 0.8, segs=8, rings=2)
    rig.part("head", g, GOURD_DK, outline=0, highlight=False)
    # a rigid stem in the top dimple
    top = c[2] + h * 0.44
    g = Geo().capsule((c[0] - 0.6, 0.0, top - 1.5), (c[0] - 1.6, 0.0, top + 3.2), 2.5, 2.0)
    g.capsule((c[0] - 1.6, 0.0, top + 3.2), (c[0] - 4.2, -0.3, top + 5.6), 2.0, 1.5)
    rig.part("head", g, STEM)
    # the carved face, turned to the viewer so both eyes show (a jack-o'-lantern reads by its face at 62 px):
    # two triangle eyes of 7 lu and a nose with the candle glow inside, angry carved brows, a 17 lu jagged grin
    rig.joint("pupils", "head", (6.4, 0, 55.2))
    eyes = [(1.6, 55.6), (10.6, 55.0)]
    for ex, ez in eyes:
        ce = face.hit(ex, ez)
        g = Geo()
        face.decal(g, ce, [(-3.6, -2.6), (3.4, -2.9), (0.4, 3.9)], 0.4)
        rig.part("pupils", g, CARVE, outline=0, highlight=False)
        g = Geo()
        face.decal(g, ce - face.view * 0.25, [(-2.2, -1.7), (2.1, -1.9), (0.3, 2.3)], 0.4)
        rig.part("pupils", g, glow=CANDLE, outline=0)
    cn = face.hit(6.2, 50.6)
    g = Geo()
    face.decal(g, cn, [(-1.7, -1.3), (1.7, -1.4), (0.0, 1.9)], 0.4)
    rig.part("pupils", g, CARVE, outline=0, highlight=False)
    rig.joint("brow", "head", (6.4, 0, 60.4))
    g = Geo()
    face.stroke(g, face.hit(1.4, 60.4), [(-3.2, 1.1), (3.0, -0.7)], 1.9, 0.4)
    face.stroke(g, face.hit(10.8, 59.8), [(-3.0, -0.7), (3.0, 1.0)], 1.9, 0.4)
    rig.part("brow", g, CARVE, outline=0, highlight=False)
    rig.joint("mouth", "head", (6.0, 0, 45.4))
    cm = face.hit(6.0, 45.4)
    g = Geo()
    grin = [(-8.4, 2.4), (-6.0, 0.6), (-4.6, 2.6), (-2.4, 0.7), (-0.8, 2.8), (1.0, 0.8), (2.8, 2.8), (4.8, 0.6),
            (6.4, 2.6), (8.4, 1.8), (6.9, -2.0), (3.4, -3.8), (-0.6, -4.2), (-4.4, -3.6), (-7.4, -1.6)]
    face.decal(g, cm, grin, 0.4)
    rig.part("mouth", g, CARVE, outline=0, highlight=False)
    g = Geo()
    face.decal(g, cm - face.view * 0.25, [(-6.2, -0.5), (6.0, -0.2), (4.8, -2.2), (1.4, -3.2), (-2.6, -3.0),
                                          (-5.4, -1.8)], 0.4)
    rig.part("mouth", g, glow=CANDLE, outline=0)
    # the face kit on the gourd: lids and squeeze close the carved eyes, KO carves X eyes, the grin opens
    face.eye_marks(eyes, 4.0, GOURD, lash=CARVE, white=GOURD)
    face.mouths((6.0, 45.0), 13.0, dark=CARVE, tooth=GOURD, tongue=CANDLE)
    # a leaf and a curly vine on the follow-through joint (they flop when he moves)
    rig.secondary("hair", "head", (c[0] - 1.8, 0, top + 2.0), (c[0] - 12.0, 0, top + 4.0), max_deg=16, gain=1.3)
    lx, lz = c[0] - 2.4, top + 2.4
    g = Geo().slab([(lx, lz), (lx - 3.6, lz + 3.6), (lx - 8.4, lz + 4.2), (lx - 11.0, lz + 1.6), (lx - 8.6, lz - 0.6),
                    (lx - 4.4, lz - 0.8)], -0.8, 1.2, rot=(0, 0, 0))
    rig.part("hair", g, LEAF, outline=0.6)
    g = Geo()
    for (x0, z0), (x1, z1) in (((lx - 2.2, lz + 1.4), (lx - 6.6, lz + 2.8)), ((lx - 6.6, lz + 2.8), (lx - 9.6, lz + 1.6))):
        g.capsule((x0, -1.5, z0), (x1, -1.5, z1), 0.42, segs=8, rings=2)
    rig.part("hair", g, C.scale(LEAF, 0.72), outline=0, highlight=False)    # the leaf's vein
    g = Geo()
    pts = []
    for i in range(22):
        t = i / 21
        a = 2 * math.pi * 1.6 * t
        rad = 2.6 * (1 - 0.45 * t)
        pts.append((c[0] - 4.0 - 7.5 * t - rad * math.sin(a), 1.5, top + 1.0 - 4.0 * t + rad * math.cos(a)))
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, 0.62, segs=8, rings=2)
    rig.part("hair", g, STEM, outline=0.5)


def _arms_and_club(rig):
    # arms, fists, leather forearm wraps and a team pelt pauldron on the club arm
    for side, y in (("r", -12.5), ("l", 12.0)):
        yd = -0.5 if y < 0 else 0.5
        g = Geo().capsule((0, y, 36), (1.5, y + yd, 28.5), 4.6, 4.0)
        rig.part(f"arm_{side}", g, SKIN)
        g = Geo().capsule((1.5, y + yd, 28.5), (4.0, y + yd, 22.0), 4.0, 3.9)
        g.blob((4.3, y + yd, 20.4), (4.7, 4.5, 4.5), p=2.3)
        g.blob((6.6, y + yd - 1.6, 21.6), (1.9, 1.8, 2.3), p=2.2)   # thumb
        rig.part(f"fore_{side}", g, SKIN)
        g = Geo().capsule((2.9, y + yd, 25.4), (3.6, y + yd, 23.4), 4.5, 4.5)
        # team wrist wraps on both arms (the club arm's crosses the chest in the walk carry; the far arm's pumps
        # in the walk, where the belt, pouch and bone take team area: the 18% rule)
        rig.part(f"fore_{side}", g, team=True, outline=0.7)
    # a leather armband (3 lu) with a bone bead below the pauldron, two war-paint bands on the near forearm
    g = Geo().lathe([(4.55, 0), (5.0, 0.4), (5.0, 2.6), (4.55, 3.0)], (0.55, -12.6, 30.6), (0.95, -12.55, 33.6), segs=18)
    rig.part("arm_r", g, LEATHER_DK, outline=0.6)
    g = Geo().blob((1.9, -17.4, 32.0), (1.5, 1.0, 1.7), p=2.2)
    rig.part("arm_r", g, BONE, finish="gloss", outline=0.5)
    fa = F.Face(rig, "fore_r", [Geo().capsule((1.5, -13.0, 28.5), (4.0, -13.0, 22.0), 4.0, 3.9)])
    g = Geo()
    for z in (27.4, 24.6):
        fa.stroke(g, fa.hit(2.6, z), [(-3.0, 0.5), (3.0, -0.5)], 1.6, 0.3)
    rig.part("fore_r", g, PAINT, outline=0, highlight=False)
    g = Geo().blob((0.5, -12.6, 37.6), (7.4, 6.4, 5.6), p=2.4)
    rig.part("arm_r", g, team=True)
    g = Geo()
    for x, z in ((-5.5, 35.0), (-1.0, 32.5), (4.5, 33.5)):
        g.lathe([(2.0, 0), (0, 3.0)], (x, -13.5, z + 1.5), (x - 0.4, -14.0, z - 1.5), segs=8)
    rig.part("arm_r", g, FUR, finish="hair")

    # the club in his hand, and a loose copy that flies away when he is knocked out
    _club(rig, "club", FIST)
    rig.secondary("strap", "club", (FIST[0], FIST[1], FIST[2] - 5.5), (FIST[0] - 1.5, FIST[1], FIST[2] - 13.5),
                  max_deg=35, gain=1.4)
    g = Geo().capsule((FIST[0], FIST[1] - 0.6, FIST[2] - 5.5), (FIST[0] - 1.5, FIST[1] - 0.6, FIST[2] - 12.5), 1.2, 1.4)
    g.blob((FIST[0] - 1.6, FIST[1] - 0.6, FIST[2] - 13.4), (1.8, 1.4, 2.2), p=2.2)
    rig.part("strap", g, LEATHER, outline=0.6)
    rig.joint("club_loose", "root", (0, 0, 0), hidden=True)
    _club(rig, "club_loose", (0.0, 0.0, -CLUB_HEAD * 0.6))
    rig.track("clubHead", "club", (FIST[0], FIST[1], FIST[2] + CLUB_HEAD))
    rig.track("_foot", "foot_r", (2.6, -6.0, 0.0))
    rig.track("_foot_l", "foot_l", (2.6, 6.0, 0.0))


# -- poses ---------------------------------------------------------------------------------
ARM_REST, FORE_REST, CLUB_REST = -78.7, -71.6, 90.0


def club_arm(arm, fore, club):
    ra = arm - ARM_REST
    rf = fore - FORE_REST - ra
    return {"arm_r": {"r": ra}, "fore_r": {"r": rf}, "club": {"r": club - CLUB_REST - ra - rf}}


def off_arm(arm, fore):
    ra = arm - ARM_REST
    return {"arm_l": {"r": ra}, "fore_l": {"r": fore - FORE_REST - ra}}


# club held up and forward, about 40 degrees from vertical, clear of the head
STANCE = merge(club_arm(-15, 25, 48), off_arm(-70, -30), {"torso": {"r": -3}, "club": {"rx": -14}})


def _idle(f):
    # the club bounces on the beat: up on 1-2, dropped on 3 (dip), a second small beat on 6
    lift = [0.0, 0.7, 1.0, -0.6, 0.2, -0.3][f]

    def extra(ctx):
        return merge(club_arm(-15 + 6 * lift, 25 + 10 * lift, 48 + 10 * lift), {
            "club": {"rx": -14},
            "body": squash(-0.03 * max(0.0, -lift)),
            "hips": {"z": 1.2 * min(0.0, lift)},
            "arm_l": {"r": -4 * ctx["lag"]}, "fore_l": {"r": 5 * max(0.0, -lift)},
        })
    base = merge({k: v for k, v in STANCE.items() if k not in ("arm_r", "fore_r", "club")})
    return M.idle_v2(f, base, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


# -- walk v3: G1 bounce jog at ground speed (card 70 x 1.25 = 87.5 lu/s), 8 x 70 ms -----------------
RIG = None
SPEED = 87.5
LEGS = {s: G.Leg(f"thigh_{s}", f"shin_{s}", (1.0, y, ANKLE_Z), foot=f"foot_{s}",
                 toe=(5.6, y, 0.3), heel=(-1.2, y, 0.3)) for s, y in (("r", -6.0), ("l", 6.0))}
GAIT = G.Gait(8, 616, SPEED, G.biped_feet(LEGS["l"], LEGS["r"], x_mid=1.6, shift=0.5), 0.38,
              lift=6.5, kick=3.0, reach=0.0, toe_off=24.0, early_lift=1.6, drag=0.3, lift_peak=0.38)
# phase: the right foot touched down a little before frame 0, so frame 3 is in the flight
for _k, (_leg, _ph, _x, _gz) in list(GAIT.feet.items()):
    GAIT.feet[_k] = (_leg, _ph - 0.03, _x, _gz)


class _OffArm:
    @staticmethod
    def pose(a, b):
        return off_arm(a, b)


# walk carry: the club rests on his shoulder (not the guard), the far arm pumps
CARRY = merge(club_arm(-62, 74, 160), off_arm(-80, -20), {"torso": {"r": -3}, "club": {"rx": -10}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"club": {"r": -6 * lag}, "arm_r": {"r": 4 * lag}, "fore_r": {"r": -3 * lag},
                "strap": {"hide": True},
                "brow": {"z": 0.3 * lag}, "hair": {"r": 6 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-11.0, twist=7.0, nod=3.0,
                     arms={"l": _OffArm}, arm=35.0, elbow=(55.0, 85.0), extra=extra, report=report)


# 11 unique frames, moves.SMALL_MELEE_MS
#          read  dip  wind  HOLD smear smear IMP  bounce recoil settle settle
A_ARM = [-8, -30, 80, 110, 80, 12, -10, 0, -8, -18, -14]
A_FORE = [34, 10, 110, 140, 70, -8, -20, 5, -12, 5, 22]
A_CLUB = [58, 62, 120, 135, 82, 18, 5, 30, 6, 22, 44]
A_Q = [-0.03, -0.12, 0.06, 0.12, 0.10, 0.02, -0.18, 0.05, -0.07, 0.02, 0.0]
A_X = [-0.5, -2.0, -3.0, -3.5, 3.0, 7.0, 8.0, 7.5, 7.0, 4.0, 1.0]
A_Z = [0.0, -2.8, 0.8, 2.6, 8.0, 4.5, -2.4, -0.8, -1.8, -0.5, 0.0]
A_TORSO = [0, 6, 14, 24, 2, -18, -30, -20, -24, -10, -4]
A_HEAD = [0, 2, -6, -14, -4, 8, 12, 6, 8, 2, 0]
A_THIGH_R = [0, -10, -4, -8, 18, 26, 24, 18, 20, 8, 2]
A_SHIN_R = [0, 8, 0, 0, -30, -20, -18, -10, -14, -4, 0]
A_THIGH_L = [0, 8, 2, 12, -8, -18, -24, -18, -20, -8, -2]
A_SHIN_L = [0, -12, -2, -6, -26, -10, -6, -4, -6, -2, 0]
A_OFF_A = [-65, -30, 20, 40, -60, -110, -125, -100, -110, -90, -75]
A_OFF_F = [-25, 10, 60, 80, -30, -90, -100, -70, -85, -50, -35]


def _attack_pose(f):
    pose = merge(club_arm(A_ARM[f], A_FORE[f], A_CLUB[f]), off_arm(A_OFF_A[f], A_OFF_F[f]), {
        "club": {"rx": -14},
        "hips": {"z": 0.0},
        "torso": {"r": A_TORSO[f]},
        "head": {"r": A_HEAD[f]},
        "thigh_r": {"r": A_THIGH_R[f]}, "shin_r": {"r": A_SHIN_R[f]},
        "thigh_l": {"r": A_THIGH_L[f]}, "shin_l": {"r": A_SHIN_L[f]},
    }, M.body_about((0, 0, 20), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f == 3:   # on his toes: the feet point down
        pose = merge(pose, {"shin_r": {"r": -14}, "shin_l": {"r": -14}})
    if f in (4, 5):
        pose["club"]["sx"] = 1.25
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return pose


CLUB_SMEAR = {"kind": "arc", "joint": "club",
              "inner": (FIST[0], FIST[1], FIST[2] + CLUB_HEAD - 9),
              "outer": (FIST[0], FIST[1], FIST[2] + CLUB_HEAD + 10), "color": WOOD, "taper": 0.1,
              "t0": 0.0, "t1": 0.88, "lines": 3}
CLUB_TIP = (FIST[0], FIST[1], FIST[2] + CLUB_HEAD + 2)


def _attack_clip():
    ov = {
        4: [dict(CLUB_SMEAR)],
        5: [dict(CLUB_SMEAR, t1=0.8)],
        6: [{"kind": "dust", "joint": "club", "point": (FIST[0], FIST[1], FIST[2] + CLUB_HEAD),
             "ground_snap": True, "size_lu": 10.0, "puffs": 5, "seed": 2},
            {"kind": "dust", "ground": (-6.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 5, "spread": 0.8},
            {"kind": "burst", "joint": "club", "point": CLUB_TIP, "r0_lu": 13.0, "r1_lu": 19.0, "n": 5,
             "a0": 20.0, "arc": 140.0}],
        7: [{"kind": "dust", "joint": "club", "point": (FIST[0], FIST[1], FIST[2] + CLUB_HEAD),
             "ground_snap": True, "size_lu": 8.0, "puffs": 4, "seed": 7, "spread": 1.4}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, extra={}, overlays=ov)


# -- attack B: horizontal baseball sweep at chest height (ANIM_SPEC appendix B) --------------------
# unique frames: 0 = A read, 1 = A dip, 2 wind, 3 HOLD (club level behind, body coiled, front knee
# up), 4 smear (club swinging away), 5 IMPACT (club level in front, body unwound, squash),
# 6 follow-through (club wraps across), 7 recoil, 8 = A settle, 9 = A settle; played on A's steps
B_SEQ = [0, 1, 2, 3, 4, 4, 5, 6, 7, 8, 9]
#        wind  HOLD  smear  IMP   follow recoil
B_A = [20, 12, 10, 18, 22, -2]
B_F = [40, 12, 8, 14, 24, 16]
B_C = [118, 16, 12, 20, 28, 36]
B_RZ = [0, 168, 96, -24, -72, -36]       # arm yaw: 180 back, 90 away, 0 forward
B_TRZ = [-22, -36, 0, 24, 40, 18]       # torso twist
B_TR = [6, 10, -6, -14, -10, -6]
B_HD = [-2, -4, 4, 8, 6, 2]
B_X = [-2.0, -3.5, 3.0, 7.0, 7.5, 5.0]
B_Z = [-1.0, 0.6, -1.0, -2.0, -1.0, -0.5]
B_Q = [-0.06, 0.06, 0.04, -0.14, 0.04, -0.04]
B_THR = [10, 26, 20, 26, 22, 14]
B_SHR = [-20, -44, -12, -6, -8, -4]
B_THL = [-6, -4, -14, -24, -22, -14]
B_SHL = [-4, -8, -8, -8, -8, -4]
B_OA = [-40, -20, -70, -120, -130, -100]
B_OF = [10, 30, -20, -70, -80, -50]


def _b_pose(i):
    if i in (0, 1):
        return _attack_pose(i)
    if i in (8, 9):
        return _attack_pose(i + 1)
    k = i - 2
    pose = merge(club_arm(B_A[k], B_F[k], B_C[k]), off_arm(B_OA[k], B_OF[k]), {
        "club": {"rx": -14},
        "arm_r": {"rz": B_RZ[k]},
        "torso": {"r": B_TR[k], "rz": B_TRZ[k]},
        "head": {"r": B_HD[k], "rz": -0.5 * B_TRZ[k]},
        "thigh_r": {"r": B_THR[k]}, "shin_r": {"r": B_SHR[k]},
        "thigh_l": {"r": B_THL[k]}, "shin_l": {"r": B_SHL[k]},
    }, M.body_about((0, 0, 20), x=B_X[k], z=B_Z[k], q=B_Q[k]))
    if k == 2:
        pose["club"]["sx"] = 1.2
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif k in (2, 3, 4):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    else:
        pose = merge(pose, F.expr("grit"))
    return pose


def _attack_b():
    sweep = dict(CLUB_SMEAR, t0=0.0, t1=0.9, samples=18, taper=0.12, lines=3)
    ov = {
        4: [dict(sweep, **{"from": 3})],
        5: [dict(sweep, t0=0.35, t1=0.95, lines=2, **{"from": 4}),
            {"kind": "burst", "joint": "club", "point": CLUB_TIP, "r0_lu": 12.0, "r1_lu": 18.0, "n": 5,
             "a0": -60.0, "arc": 120.0},
            {"kind": "dust", "ground": (8.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 9, "spread": 0.8}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 9), 9: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], M.SMALL_MELEE_MS, impact=5,
                  sequence=B_SEQ, overlays=ov, reuse=reuse)


# -- attack C: tap-tap-BONK: two quick ground taps, a short overhead bonk ------------------------
# steps: raise 40, tap 45, raise 35, tap 40, HOLD 102, smear 28 | A's impact and settle (A frames)
C_MS = [40, 45, 35, 40, 102, 28, 120, 60, 50, 70, 90]
C_SEQ = [0, 1, 0, 1, 2, 3, 4, 5, 6, 7, 8]


def _c_pose(i):
    if i >= 4:
        return _attack_pose(i + 2)
    if i == 0:     # club lifted a little in front, a hop of the shoulders
        pose = merge(club_arm(-4, 40, 58), off_arm(-60, -10), {
            "club": {"rx": -14}, "torso": {"r": -4}, "head": {"r": 2},
            "thigh_r": {"r": 6}, "thigh_l": {"r": -4}}, M.body_about((0, 0, 20), x=0.5, z=0.8, q=0.03))
        return merge(pose, F.expr("grit"))
    if i == 1:     # tap: the club head knocks the ground in front of him
        pose = merge(club_arm(-34, -14, -10), off_arm(-70, -20), {
            "club": {"rx": -14}, "torso": {"r": -14}, "head": {"r": 6},
            "thigh_r": {"r": 10}, "shin_r": {"r": -4}, "thigh_l": {"r": -6}},
            M.body_about((0, 0, 20), x=1.5, z=-1.2, q=-0.06))
        return merge(pose, F.expr("grit"), {"pupils": {"z": -1.0}})
    if i == 2:     # HOLD: the club straight up overhead (short), up on his toes, grinning
        pose = merge(club_arm(64, 120, 96), off_arm(-30, 30), {
            "club": {"rx": -14}, "torso": {"r": 6}, "head": {"r": -8},
            "thigh_r": {"r": 4}, "shin_r": {"r": -6}, "thigh_l": {"r": -2}, "shin_l": {"r": -6}},
            M.body_about((0, 0, 20), x=0.5, z=2.2, q=0.10))
        return merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    # smear: the club whips over the top, he leans in
    pose = merge(club_arm(40, 60, 40), off_arm(-90, -50), {
        "club": {"rx": -14, "sx": 1.2}, "torso": {"r": -16}, "head": {"r": 8},
        "thigh_r": {"r": 22}, "shin_r": {"r": -16}, "thigh_l": {"r": -16}, "shin_l": {"r": -6}},
        M.body_about((0, 0, 20), x=5.0, z=2.0, q=0.06))
    return merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})


def _attack_c():
    tap = {"kind": "dust", "joint": "club", "point": (FIST[0], FIST[1], FIST[2] + CLUB_HEAD),
           "ground_snap": True, "size_lu": 6.0, "puffs": 3, "seed": 21, "spread": 0.7}
    ov = {1: [tap, {"kind": "burst", "joint": "club", "point": CLUB_TIP, "r0_lu": 8.0, "r1_lu": 12.0,
                    "n": 3, "a0": 30.0, "arc": 120.0}],
          3: [dict(CLUB_SMEAR, t0=0.0, t1=0.9, samples=14, **{"from": 2})]}
    reuse = {4: ("attack", 6), 5: ("attack", 7), 6: ("attack", 8), 7: ("attack", 9), 8: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(9)], C_MS, impact=4, sequence=C_SEQ,
                  overlays=ov, reuse=reuse, extra={"holdStep": 4})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 12 * a}, "club": {"r": 14 * a},
                "arm_l": {"r": 40 * a}, "fore_l": {"r": 20 * a},
                "brow": {"z": 1.6 * max(a, 0)}, "hair": {"r": 10 * a}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


# die D1: fling and spin; the club leaves the hand on step 1 and tumbles up and away
LOOSE = [None, (10, 0, 70, 50), (8, 0, 92, 170), (10, 0, 98, 300), (14, 0, 84, 420),
         (18, 0, 56, 530), (21, 0, 28, 610), (23, 0, 9, 630), (24, 0, 11, 632), (24, 0, 9, 630)]


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 70 * flail + 30}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    if LOOSE[k] is not None:
        x, y, z, r = LOOSE[k]
        pose["club"] = dict(pose.get("club", {}), hide=True)
        pose["club_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        # 6 unique idle poses in the same 920 ms (atlas budget)
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        # 8 unique KO poses in the 10 death steps (the last ones hold; atlas budget)
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
