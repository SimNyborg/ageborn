"""Pebbler: Stone Age ranged (DESIGN A5.2). Sling, rock projectile (proj.rock), 64 lu.

Look (A11): a lean young slinger, lighter and slimmer than the Bonker, with a big red-brown
topknot held by a bone pin, a team headband with a feather and two tails that stream behind
(follow-through), freckles and a tooth gap, a team one-shoulder pelt tunic with a ragged
skirt and a bone hand-print emblem, a bulging leather pebble pouch on the hip, and a thick
sling cord with a leather cup holding a fat grey rock. In idle he tosses a spare pebble.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    tosses a pebble up and catches it, weight shift, blink
  walk    walk v3 bounce jog (ANIM_SPEC G1): the loaded sling low at the hip, the far arm pumping
  attack_b  low whirl at the hip, underhand flick (A and B loop the whirl while the sim wind-up
          lasts: holdLoop)
  attack  SLING WINDMILL: dips, whirls the sling over his head (a held ring-smear frame of a
          full turn, then half a turn more coming down behind him), steps in and releases
          side-arm at hip height (the rock leaves the cup on the impact frame; the
          projectile spawns at the per-frame `muzzle`), the empty cup flaps up, then he
          reaches into the hip pouch and loads a new rock
  hit     light;  die  D1 fling and spin (the pebble flies off), X eyes
"""
import math

from ageborn_art import colors as CC
from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import look
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import CaveBody
from units import stone_w1 as W1

SLUG = "pebbler"
GAIT_NAME = "biped"
NAME = "Pebbler"
HEIGHT_LU = 64
CANVAS = (240, 216)
FEET = (104, 192)
ANCHORS = {"head": (2, 62), "hitCenter": (0, 30)}
NO_RETIME = True

SKIN = "#E8C9AD"
FRECKLE = "#C99B7E"
HAIR = "#6B5445"
FUR = "#7A6B5E"
LEATHER = "#8C7058"
LEATHER_DK = "#6A5242"
CORD = "#6E5A48"
ROCK = "#9A948A"
ROCK_HI = "#C4BFB6"
BONE = "#EDE3C8"
FEATHER = "#E9DFC9"
FEATHER_TIP = "#5B4A3E"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2424"
TOOTH = "#F4EEDC"

# the detail standard (art round W1, Track STONE; ageborn_art/look.py, the pilot's recipe in units/bonker.py)
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = W1.HIGHLIGHT_SOLDIER
LOOK_SHADE = W1.SHADE_SOLDIER
LOOK_RIM = W1.RIM_SOLDIER
HAIR_LT = "#8C705C"       # lighter locks in the topknot and the back hair (29 levels over the hair)
CHEEK = "#D6AD93"         # a ruddy cheek and ear (22 levels under the skin, saturation 0.32)
MATERIAL_KINDS = W1.kinds({SKIN: "skin", FRECKLE: "skin", HAIR: "fur", FUR: "fur", LEATHER: "leather",
                           LEATHER_DK: "leather", CORD: "leather", ROCK: "stone", ROCK_HI: "stone", BONE: "bone",
                           FEATHER: "fur", FEATHER_TIP: "fur", HAIR_LT: "fur", CHEEK: "skin", "team": "hide"})

# -- skin: Snowball Pebbler (DESIGN A5.8, rare; "knit cap, snowballs instead of rocks") ------------------------
# Same joints, trackers, poses and clips as the Pebbler. A white knit stocking cap with a team rolled brim and a
# bobble replaces the topknot (the cap's tip and bobble hang on the topknot's follow-through joint, so they bounce
# a frame late), every rock is a snowball, the fur is snowy fleece. The game draws its shots as snowballs
# (`proj.snowball`, src/visuals/skins.ts).
SNOW = "#E4EAEE"          # snowballs: white with a cool grey shadow (saturation 0.04)
SNOW_HI = "#F8FAFB"
FLEECE = "#D3D8DB"        # the fur tufts, shoulder pad and foot wraps as snowy fleece
WOOL = "#E9ECEE"          # the knit cap and its bobble
WOOL2 = "#A9B8C4"         # the knit ribs (blue-grey, saturation 0.14: far under the colour rule)
SKINS = {"snowball_pebbler": {
    "kinds": W1.kinds({SNOW: "ceramic", SNOW_HI: "ceramic", FLEECE: "fur", WOOL: "cloth", WOOL2: "cloth"}),
    "palette": {ROCK: SNOW, ROCK_HI: SNOW_HI, FUR: FLEECE, CC.scale(FUR, 0.8): CC.scale(FLEECE, 0.8)}}}

SLING_LEN = 13.5


THIGH_Z, KNEE_Z, ANKLE_Z = 19.5, 11.5, 4.0   # walk v3: longer legs (ANIM_SPEC 2.0 rule 5)
LIFT = 2.0                                   # the upper body sits 2 lu higher


def build(rig):
    global RIG
    RIG = rig
    body = CaveBody(rig, SKIN, FUR, hip_z=16.0, knee_z=KNEE_Z, ankle_z=ANKLE_Z, waist_z=17.0,
                    shoulder_z=35.0, neck_z=37.0, hip_y=5.2, shoulder_y=10.8,
                    elbow=(1.5, 28.0), wrist=(3.5, 21.5), leg_r=(3.7, 3.2, 3.0),
                    arm_r=(3.9, 3.4, 3.3), fist_r=4.1, torso=((0, 28.5), (9.6, 8.6, 9.8)),
                    torso_taper=(1.02, 0.96), foot_len=4.3, thigh_z=THIGH_Z, foot_joint=True,
                    far_shade=0.8)
    rig.rest_offset["torso"] = (0, 0, LIFT)
    fr, fl = body.fist["r"], body.fist["l"]

    # team one-shoulder pelt tunic with a bone hand-print; the skirt swings on its own joint
    pelt = Geo().blob((0.4, 0, 26.2), (10.9, 9.9, 7.4), p=2.5, taper=(1.05, 0.95))
    pelt.capsule((8.4, -5.2, 27.5), (2.5, 8.0, 36.0), 2.9, 2.9)
    deco = F.Face(rig, "torso", [pelt])
    rig.part("torso", pelt, team=True)
    g = Geo()
    c = deco.hit(3.5, 25.0)
    deco.decal(g, c, F.ellipse(0, -0.6, 2.2, 1.9, 12), 0.4)
    for a, L in ((55, 2.8), (80, 3.2), (105, 3.0), (130, 2.5), (8, 2.4)):
        r = math.radians(a)
        deco.stroke(g, c, [(math.cos(r) * 1.5, -0.6 + math.sin(r) * 1.5),
                           (math.cos(r) * (1.5 + L), -0.6 + math.sin(r) * (1.5 + L))], 1.2, 0.4)
    rig.part("torso", g, BONE, highlight=False, outline=0)
    g = Geo()
    for x, y in ((8.5, -4.5), (3.0, -8.8), (-4.0, -8.8)):   # fur tufts on the top edge
        g.lathe([(2.0, 0), (0, 3.2)], (x, y, 32.0), (x - 0.5, y - 0.4, 35.0), segs=8)
    rig.part("torso", g, FUR, finish="hair")
    rig.secondary("skirt", "hips", (0.5, 0, 22.0), (-1.0, 0, 13.5), max_deg=10, gain=1.0)
    rig.rest_offset["skirt"] = (0, 0, LIFT + 1.5)
    g = Geo().blob((0.6, 0, 21.2), (11.2, 10.0, 4.4), p=2.6, taper=(1.08, 0.98))
    for x, y in ((8.0, -5.5), (2.5, -9.5), (-4.5, -9.0), (9.5, 2.5), (-9.5, -2.5)):
        g.lathe([(3.0, 0), (0, -3.4)], (x, y, 18.2), segs=10)
    skirt_face = F.Face(rig, "skirt", [g])
    rig.part("skirt", g, team=True)
    # W1: wildcat spots on the pelt and the skirt in the team-dark tone (the team zone in two tones, still team)
    W1.team_spots(rig, "torso", deco, [(-6.6, 27.2, 1.8, 1.45), (-2.2, 22.0, 1.6, 1.25), (8.2, 28.4, 1.5, 1.2),
                                       (7.4, 21.6, 1.4, 1.15), (-8.6, 22.6, 1.25, 1.05)])
    W1.team_spots(rig, "skirt", skirt_face, [(-3.6, 19.4, 1.6, 1.3), (5.2, 18.6, 1.5, 1.2), (9.6, 21.0, 1.2, 1.0)])
    # a dyed hide belt (3 lu) where the pelt meets the skirt, team-dark (a stripe in the team zone that keeps its
    # team area), a carved bone toggle as its buckle on the near front
    W1.ring(rig, "torso", (0.5, 0, 22.9), 11.35, height=3.0, ry=10.35, team=True, segs=40, outline=0.8)
    g = Geo().blob((9.6, -6.9, 24.4), (2.2, 1.2, 1.9), p=2.4, rot=(0, 0, -38))
    rig.part("torso", g, BONE, finish="gloss", outline=0.6)
    g = Geo().capsule((8.0, -8.2, 24.4), (11.0, -5.6, 24.4), 0.75, segs=8, rings=2)
    rig.part("torso", g, LEATHER_DK, outline=0)
    # bulging pebble pouch on the near hip with a drawstring, two pebbles peeking out; W1: it hangs from a leather
    # loop on the belt and swings a frame late (a secondary joint), with a bone toggle on the drawstring
    rig.secondary("pouch", "hips", (-5.8, -9.4, 24.6), (-6.2, -9.8, 14.6), max_deg=12, gain=1.2)
    g = Geo().blob((-5.8, -9.2, 19.6), (5.0, 3.9, 5.6), p=2.2, taper=(1.12, 0.78))
    pouch_face = F.Face(rig, "pouch", [g])
    rig.part("pouch", g, team=True)   # team-dyed pouch (the 18% rule in the walk)
    W1.team_spots(rig, "pouch", pouch_face, [(-6.8, 17.4, 1.5, 1.3), (-3.6, 15.4, 1.2, 1.0)])
    g = Geo().lathe([(3.2, 0), (3.5, 0.4), (3.5, 1.6), (3.1, 2.0)], (-5.8, -9.2, 23.2), segs=14)
    rig.part("pouch", g, LEATHER_DK, outline=0.6)
    g = Geo().capsule((-6.6, -12.6, 25.6), (-6.4, -12.8, 22.8), 1.35, 1.25)
    rig.part("pouch", g, LEATHER, outline=0.5)
    g = Geo().sphere((-2.9, -12.0, 22.8), 1.4, cuts=3)
    rig.part("pouch", g, BONE, finish="gloss", outline=0.5)
    g = Geo().sphere((-5.0, -10.2, 25.8), 2.3, cuts=3).sphere((-7.8, -9.0, 25.4), 2.0, cuts=3)
    rig.part("pouch", g, ROCK, outline=0.8)

    # head: round, youthful, big eyes, small nose, freckles, a tooth-gap grin; topknot with a pin
    head = Geo().blob((2, 0, 47.5), (10.4, 10.0, 10.4), p=2.25)
    head.blob((5.5, 0, 42.4), (7.2, 8.2, 5.2), p=2.2)
    head.blob((12.8, -0.5, 46.6), (2.8, 2.5, 2.5), p=2.0)  # nose
    hair = Geo().blob((-2.6, 0, 54.4), (9.6, 10.6, 5.6), p=2.2)
    hair.blob((-8.2, 0, 48.2), (4.6, 9.4, 7.6), p=2.2)
    eyes = Geo()
    for y in (-4.6, 3.8):
        eyes.blob((10.6, y, 48.6), (4.0, 3.9, 4.9))
    pup = Geo()
    for y in (-4.6, 3.8):
        pup.blob((13.7, y - 0.4, 48.2), (1.5, 2.4, 2.6))
    band = Geo().lathe([(10.0, 0), (10.9, 0.4), (10.9, 3.0), (9.6, 3.4)], (1.6, 0, 52.4),
                       (0.2, 0, 55.6), segs=22)
    face = F.Face(rig, "head", [head, hair, eyes, pup, band])
    rig.part("head", head, SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    rig.part("head", eyes, EYE, highlight=False)
    rig.joint("pupils", "head", (13.7, 0, 48.2))
    rig.part("pupils", pup, PUPIL, outline=0)
    rig.part("head", band, team=True, outline=0.8)
    g = Geo()
    c = face.hit(9.5, 43.8)
    for u, v in ((-1.6, 0.8), (0.4, -0.2), (2.0, 0.9)):
        face.decal(g, c, F.ellipse(u, v, 0.75, 0.75, 8), 0.3)
    rig.part("head", g, FRECKLE, highlight=False, outline=0)
    # brows (lift on the hit, knit on the throw)
    rig.joint("brow", "head", (11.0, 0, 53.4))
    g = Geo().capsule((9.0, -8.0, 53.2), (12.8, -3.4, 52.8), 1.5, 1.3)
    rig.part("brow", g, HAIR, finish="hair", outline=0.6)
    rig.secondary("knot", "head", (-2.0, 0, 57.0), (-5.5, 0, 66.0), max_deg=14, gain=1.2)
    # a feather tucked in the headband (second follow-through part on the head)
    rig.secondary("feather", "head", (-6.0, -8.0, 54.0), (-12.0, -8.5, 64.0), max_deg=16, gain=1.3)
    if getattr(rig, "skin", None) == "snowball_pebbler":
        _knit_cap(rig)
    else:
        g = Geo().blob((-2.4, 0, 59.4), (3.6, 3.6, 3.4), p=2.2)
        for (x1, y1, z1), r in (((-1.0, -1.0, 68.5), 2.3), ((-7.5, 0.5, 66.5), 2.2),
                                ((3.5, 1.0, 66.0), 1.9), ((-9.5, -1.5, 61.5), 1.8)):
            g.capsule((-2.4, 0, 60.5), (x1, y1, z1), r, 0.7)
        rig.part("knot", g, HAIR, finish="hair")
        g = Geo().lathe([(3.4, 0), (3.9, 0.3), (3.9, 2.1), (3.2, 2.4)], (-2.4, 0, 60.4),
                        (-2.4, 0, 63.0), segs=16)
        rig.part("knot", g, BONE, outline=0.8)
        # W1: lighter locks over the topknot's near strands (two-tone hair, 2.5-2.8 lu wide)
        W1.locks(rig, "knot", [((-2.2, 62.6), (-1.3, 68.0), 1.3), ((-3.8, 62.0), (-7.4, 65.6), 1.25),
                               ((-4.6, 60.6), (-9.0, 61.6), 1.2)], HAIR_LT, -2.4)
        g = Geo().blob((-9.2, -8.4, 59.5), (2.4, 1.0, 6.4), p=2.2, rot=(0, -32, 0))
        rig.part("feather", g, FEATHER, outline=0.7)
        g = Geo().blob((-11.6, -8.6, 63.6), (1.9, 1.1, 2.4), p=2.2, rot=(0, -32, 0))
        rig.part("feather", g, FEATHER_TIP, outline=0.5)
        # a dark quill line down the vane (two-tone feather)
        g = Geo().capsule((-7.6, -9.5, 55.4), (-11.0, -9.6, 62.4), 0.55, 0.4, segs=8, rings=2)
        rig.part("feather", g, FEATHER_TIP, outline=0)
    # W1: lighter locks down the back hair below the headband
    W1.locks(rig, "head", [((-6.8, 51.0), (-10.4, 45.4), 1.35), ((-9.8, 52.0), (-12.0, 47.6), 1.25)], HAIR_LT, -8.6)
    rig.secondary("tails", "head", (-9.6, 0, 51.5), (-19.5, 0, 46.0), max_deg=18, gain=1.3)
    g = Geo().slab([(-9.0, 53.0), (-19.0, 49.5), (-20.5, 46.5), (-9.5, 50.0)], -3.0, 1.2)
    g.slab([(-9.5, 52.0), (-16.5, 45.0), (-18.8, 44.0), (-10.0, 49.4)], 2.5, 1.2)
    rig.part("tails", g, team=True, outline=0.8)
    # a stone bead where the band is knotted at the back (the tails hang from it)
    g = Geo().sphere((-9.4, -4.6, 52.4), 1.6, cuts=3)
    rig.part("head", g, ROCK_HI, finish="gloss", outline=0.6)
    # a ruddy cheek under the freckles and an ear with a warm inner shadow (the big face is not one flat field)
    g = Geo()   # under the freckles' decal (0.14 lu off the skin, the freckles 0.35)
    face.decal(g, face.hit(8.6, 44.0) + face.view * 0.21, F.ellipse(0, 0, 3.0, 2.2, 14), 0.18)
    rig.part("head", g, CHEEK, outline=0, highlight=False)
    ear = Geo().blob((-0.9, -10.0, 46.6), (2.3, 1.5, 3.0), p=2.2)
    ear_face = F.Face(rig, "head", [ear])
    rig.part("head", ear, SKIN, outline=0.6)
    g = Geo()
    ear_face.decal(g, ear_face.hit(-0.7, 46.4), F.ellipse(0, 0, 1.1, 1.8, 10), 0.3)
    rig.part("head", g, CHEEK, outline=0, highlight=False)
    # default mouth: a cheeky grin with a tooth gap (decals, so it reads at game size)
    rig.joint("mouth", "head", (12.2, 0, 42.8))
    c = face.hit(12.4, 42.6)
    g = Geo()
    face.decal(g, c, [(-2.2, 0.9), (0.0, 0.2), (2.2, 1.2), (1.6, -0.7), (-1.6, -0.7)], 0.4)
    rig.part("mouth", g, MOUTH, outline=0, highlight=False)
    g = Geo()
    face.decal(g, c - face.view * 0.25, [(-1.4, 0.5), (-0.3, 0.2), (-0.3, -0.4), (-1.2, -0.3)], 0.4)
    face.decal(g, c - face.view * 0.25, [(0.4, 0.3), (1.5, 0.7), (1.3, -0.3), (0.4, -0.4)], 0.4)
    rig.part("mouth", g, TOOTH, outline=0, highlight=False)
    face.eye_marks([(13.4, 48.6)], 4.0, SKIN)
    face.mouths((12.3, 42.4), 5.6)

    # team leg wraps below the knee (they show in the walk)
    for side, y in (("r", -5.2), ("l", 5.2)):
        g = Geo().capsule((0.6, y, 11.2), (0.95, y, 5.6), 3.7, 3.5)
        rig.part(f"shin_{side}", g, team=True, outline=0.7)
        # W1: leather cords crossed over the wraps (a second tone in the team zone, 1.1 lu lines)
        W1.laces(rig, f"shin_{side}", 0.8, y - 3.75 if side == "r" else y - 3.5, 6.2, 10.8,
                 LEATHER_DK if side == "r" else CC.scale(LEATHER_DK, 0.8))
    # team wrist wraps, a fur pad on the far shoulder
    g = Geo().capsule((2.6, -11.3, 23.8), (3.2, -11.3, 21.0), 4.0, 4.0)
    rig.part("fore_r", g, team=True, outline=0.8)
    g = Geo().blob((0.4, 11.0, 36.6), (5.8, 5.0, 4.4), p=2.4)
    rig.part("torso", g, FUR, finish="hair")
    g = Geo().capsule((2.6, 11.3, 23.8), (3.2, 11.3, 21.0), 4.0, 4.0)
    rig.part("fore_l", g, team=True, outline=0.8)
    # W1: a slinger's leather bracer on the sling arm above the wrap, laced with cord
    W1.ring(rig, "fore_r", (1.8, -11.3, 27.2), 3.45, height=2.8, fill=LEATHER_DK, p1=(3.5, -11.3, 21.5), bulge=0.5,
            outline=0.6)
    g = Geo()
    for dz in (0.7, 1.9):
        g.capsule((1.2, -15.3, 27.0 - dz), (3.4, -15.0, 26.0 - dz), 0.5, segs=8, rings=2)
    rig.part("fore_r", g, BONE, outline=0)
    # W1: a necklace of river stones and a bone tooth on a thong at the collar
    W1.thong(rig, "torso", (0.4, 0, 33.6), 7.9, LEATHER_DK, tilt_to=(2.0, 0, 35.4))
    W1.beads(rig, "torso", [(8.2, -3.4, 32.2), (8.6, 0.6, 32.0)], ROCK_HI, r=1.6)
    g = Geo().lathe([(1.5, 0), (1.25, 1.8), (0, 4.4)], (6.6, -6.4, 33.6), (6.9, -7.2, 29.4), segs=8)
    rig.part("torso", g, BONE, finish="gloss", outline=0.5)

    # the sling: a thick cord from the near fist to a leather cup holding a fat rock (W1: the cord 2.6 lu thick, a
    # dark rim on the cup, a bigger chipped facet on the rock)
    tip = (fr[0], fr[1] - 0.5, fr[2] - SLING_LEN)
    rig.secondary("sling", "fore_r", fr, tip, max_deg=16, gain=0.9)
    g = Geo().capsule(fr, (tip[0], tip[1], tip[2] + 2.0), 1.3)
    g.capsule((fr[0], fr[1] - 0.2, fr[2] + 1.0), (fr[0] - 1.2, fr[1] - 0.4, fr[2] - 3.0), 1.25, 0.7)  # loop
    rig.part("sling", g, CORD, outline=0.7)
    g = Geo().blob((tip[0], tip[1], tip[2] - 0.5), (4.2, 3.4, 2.5), p=2.2, taper=(0.8, 1.15))
    rig.part("sling", g, LEATHER, outline=0.8)
    g = Geo().lathe([(3.9, 0), (4.5, 0.3), (4.5, 1.1), (3.9, 1.4)], (tip[0], tip[1], tip[2] + 0.6), segs=18,
                    squash=(1.0, 0.8))
    rig.part("sling", g, LEATHER_DK, outline=0.5)
    rig.joint("rock", "sling", tip)
    g = Geo().blob((tip[0] + 0.2, tip[1] - 0.8, tip[2] + 1.2), (4.2, 3.8, 3.9), p=2.1)
    rig.part("rock", g, ROCK)
    g = Geo().blob((tip[0] + 1.5, tip[1] - 3.9, tip[2] + 2.5), (1.8, 0.7, 1.45), p=2.2)
    rig.part("rock", g, ROCK_HI, outline=0, highlight=False)
    rig.track("muzzle", "sling", (tip[0], tip[1], tip[2] + 0.5))

    # far hand: a spare pebble to toss in idle
    rig.joint("pebble", "fore_l", fl)
    g = Geo().blob((fl[0] + 2.6, fl[1] - 1.5, fl[2] + 3.6), (2.7, 2.5, 2.5), p=2.1)
    rig.part("pebble", g, ROCK, outline=0.8)
    # a loose rock for the reload (in the near hand, from the hip pouch)
    rig.joint("reload", "fore_r", fr, hidden=True)
    g = Geo().blob((fr[0] + 1.8, fr[1] - 2.2, fr[2] - 1.0), (3.0, 2.8, 2.8), p=2.1)
    rig.part("reload", g, ROCK, outline=0.8)
    rig.track("_foot", "foot_r", (2.2, -5.2, 0.0))
    rig.track("_foot_l", "foot_l", (2.2, 5.2, 0.0))
    global ARM_R, ARM_L, TIP, FR
    TIP, FR = tip, fr
    ARM_R = body.arm("r", "sling", tip)
    ARM_L = body.arm("l")
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry (W0 COMMON C1)
        _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, Stone soldier: hide, fur, bone; never on the face or skin), as the
    rest pose is drawn (the upper body sits LIFT higher, the skirt LIFT + 1.5): the biggest mark on the pelt's back
    half, which the sling arm and the far hand never cover (the pelt's front sits behind the far hand in idle, walk
    and hit), the skirt, the pouch and the near leg wrap; a strip torn from the skirt's hem."""
    rig.damage_spot_at("pelt", "torso", -4.0, 27.0, 7.0, "hide", team=True)
    rig.damage_spot_at("skirt", "skirt", 2.5, 20.5, 5.5, "hide", team=True)
    rig.damage_spot_at("pouch", "pouch", -7.0, 16.0, 5.0, "hide", team=True)
    rig.damage_spot_at("wrap", "shin_r", -2.3, 9.0, 5.0, "hide", team=True)
    rig.damage_spot_at("hem", "skirt", -6.0, 18.5, 10.0, "hide", kind="strip", team=True)


def _knit_cap(rig):
    """Snowball Pebbler: a white knit stocking cap over the topknot. The dome sits on the head above the team band
    (the band is now the cap's rolled brim); its tip and bobble hang on the topknot's follow-through joint, where the
    topknot's strands were, so the silhouette keeps the topknot's mass (A5.8 parity)."""
    prof = [(10.7, 0.0), (10.5, 2.4), (9.6, 4.6), (7.8, 6.6), (5.2, 8.2), (2.6, 9.0), (0.0, 9.3)]
    dome = Geo().lathe(prof, (0.7, 0, 54.4), (-1.4, 0, 63.7), segs=28)
    cap_face = F.Face(rig, "head", [dome])
    rig.part("head", dome, WOOL)
    # knit ribs: blue-grey lines up the dome (texture, 1.3 lu) and a blue-grey stripe round it (a shape, 2.6 lu)
    g = Geo()
    for x in (-6.0, -2.4, 1.4, 5.0, 8.4):
        c = cap_face.hit(x, 57.0)
        cap_face.stroke(g, c, [(0.0, -2.0), (-0.5, 2.6)], 1.3, 0.35)
    rig.part("head", g, WOOL2, outline=0, highlight=False)
    W1.ring(rig, "head", (0.05, 0, 57.6), 10.05, height=2.6, ry=10.05, fill=WOOL2, p1=(-2.0, 0, 66.9), bulge=0.4,
            outline=0.5)
    # the floppy tip and the bobble on the follow-through joint
    g = Geo().capsule((-1.6, 0, 61.6), (-4.6, -0.3, 66.0), 4.4, 3.0)
    g.capsule((-4.6, -0.3, 66.0), (-6.6, -0.5, 66.8), 3.0, 2.2)
    rig.part("knot", g, WOOL)
    # the bobble stays inside the topknot's box (the skin's sheet within +2% of the Pebbler's pixels)
    g = Geo().blob((-7.6, -0.6, 67.2), (3.3, 3.2, 3.1), p=2.0)
    for (dx, dz) in ((-2.4, 1.2), (1.4, 2.0), (-2.6, -1.4), (0.0, 2.2), (2.2, -0.6)):   # a fluffy outline
        g.sphere((-7.6 + dx, -0.6, 67.2 + dz), 1.3, cuts=2)
    rig.part("knot", g, WOOL, finish="hair")
    # the feather is gone; a blue-grey knit stripe round the tip instead (not team: a team part this high would
    # stretch every team frame's box to the bobble and grow the sheet)
    g = Geo().lathe([(3.55, 0), (3.95, 0.3), (3.95, 2.3), (3.55, 2.6)], (-3.4, -0.2, 64.0), (-5.2, -0.35, 66.9),
                    segs=18)
    rig.part("knot", g, WOOL2, outline=0.5)


# -- poses ---------------------------------------------------------------------------------
ARM_R = ARM_L = TIP = FR = None


def sling_arm(a, b, c):
    return ARM_R.pose(a, b, c)


def off_arm(a, b):
    return ARM_L.pose(a, b)


def stance():
    # sling arm low and a little forward, sling hanging; far hand up at the chest with a pebble
    return merge(sling_arm(-30, -8, -92), off_arm(-55, 5), {"torso": {"r": -2}})


def _idle(f):
    toss = [0.0, 0.25, 0.75, 1.0, 0.8, 0.35, 0.0, 0.0][f]

    def extra(ctx):
        return {"arm_r": {"r": 3 * ctx["lag"]}, "sling": {"r": 8 * ctx["lag"]},
                "fore_l": {"r": [-4, 6, 2, 0, 0, 0, -8, -2][f]},
                "pebble": {"z": 13.0 * toss, "x": 1.0 * toss, "r": 130 * f},
                "head": {"r": 5 * toss}, "pupils": {"z": 0.8 * toss}}
    return M.idle_v2(f, stance(), extra=extra, face_blink=F.expr("blink"), blink=7)


# -- walk v3: G1 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 70 ms --------------
RIG = None
SPEED = 81.25
LEGS = {s: G.Leg(f"thigh_{s}", f"shin_{s}", (1.0, y, ANKLE_Z), foot=f"foot_{s}",
                 toe=(4.9, y, 0.4), heel=(-1.4, y, 0.4)) for s, y in (("r", -5.2), ("l", 5.2))}
GAIT = G.Gait(8, 616, SPEED, G.biped_feet(LEGS["l"], LEGS["r"], x_mid=1.6), 0.38,
              lift=6.5, kick=3.0, reach=0.0, toe_off=24.0, early_lift=1.6, drag=0.3, lift_peak=0.38)
for _k, (_leg, _ph, _x, _gz) in list(GAIT.feet.items()):
    GAIT.feet[_k] = (_leg, _ph - 0.03, _x, _gz)


class _Arm:
    def __init__(self, side):
        self.side = side

    def pose(self, a, b):
        return (ARM_R if self.side == "r" else ARM_L).pose(a, b)


def _walk(f, report=None):
    # carry: the loaded sling swings low in the near hand, the pebble in the far fist; both arms pump
    def extra(ctx):
        return {"sling": {"r": 14 * math.cos(ctx["lag_p"])}, "pebble": {"z": 0.6 * ctx["bob_lag"]},
                "arm_r": {"r": 4 * math.cos(ctx["lag_p"])},
                "knot": {"r": 6 * ctx["bob_lag"] / max(ctx["amp"], 1e-3)}}
    # carry: the near fist up at the chest so the loaded sling hangs at the hip, clear of the legs
    carry = merge({k: v for k, v in stance().items() if k not in ("arm_r", "fore_r", "sling")}, sling_arm(-48, 30, -90))
    return M.walk_v3(RIG, f, carry, GAIT, legs=LEGS, lean=-11.0, twist=7.0, nod=3.0,
                     arms={"l": _Arm("l")}, arm=35.0, elbow=(30.0, 65.0),
                     extra=extra, report=report)


# 11 unique frames, moves.SMALL_MELEE_MS; sling angle c keeps turning (no wrap) so the
# ring smear between frames follows the real whirl
#         read  dip  wind  HOLD  smear  lead  IMP  flap  pouch  load  settle
A_A = [-34, -62, 112, 118, -40, -64, -45, 18, -112, -42, -30]
A_B = [-10, -34, 122, 108, -70, -44, -5, 42, -82, -12, -8]
A_C = [-95, -128, 40, 400, 560, 655, 752, 820, 620, 626, 628]
A_Q = [-0.03, -0.12, 0.06, 0.10, 0.03, -0.04, -0.16, 0.04, -0.05, 0.01, 0.0]
A_X = [-0.5, -1.5, -2.5, -3.0, 1.0, 5.0, 8.0, 7.0, 4.5, 2.0, 0.5]
A_Z = [0.0, -2.4, 0.6, 1.8, 0.5, -0.5, -2.6, -0.8, -1.2, -0.4, 0.0]
A_T = [-2, 8, 12, 16, -2, -12, -22, -16, -8, -4, -2]
A_H = [0, -2, -8, -10, 0, 6, 10, 6, 14, 4, 0]
A_THR = [0, -8, -4, -6, 14, 24, 30, 22, 14, 6, 2]
A_SHR = [0, 6, 0, 0, -28, -14, -12, -6, -4, -2, 0]
A_THL = [0, 8, 4, 10, -6, -14, -24, -18, -12, -4, -1]
A_SHL = [0, -10, -4, -14, -10, -6, -4, -4, -2, 0, 0]
A_OA = [-55, -30, 20, 30, -20, -60, -95, -80, -60, -55, -55]
A_OF = [5, 30, 60, 70, 20, -20, -50, -30, 0, 5, 5]


def _attack_pose(f, t=0.0):
    """Frame f; `t` throws it t degrees higher (the aimed variants, item 44): the sling releases later in its whirl
    (the cup higher in front), the arm swings up with it, the far hand points at the target, he leans back and
    looks up. The legs and feet stay as they are."""
    pose = merge(sling_arm(A_A[f] + 0.7 * t, A_B[f] + 0.85 * t, A_C[f] + 1.4 * t),
                 off_arm(A_OA[f] + 0.7 * t, A_OF[f] + 0.5 * t), {
        "torso": {"r": A_T[f] + 0.18 * t}, "head": {"r": A_H[f] + 0.3 * t}, "pupils": {"z": 0.025 * t},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "rock": {"hide": f in (6, 7, 8)},
        "reload": {"show": f == 8},
        "pebble": {"hide": False},
    }, M.body_about((0, 0, 20), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f == 6:
        pose["sling"]["sz"] = 1.18   # the cord snaps straight on the release
    if f == 7:
        pose["sling"]["sz"] = 0.9
    if f in (2, 3, 4, 5):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8, "r": -6}})
    elif f in (6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.0}})
    elif f == 8:
        pose = merge(pose, {"pupils": {"z": -1.2, "x": -0.4}})
    return pose


def _attack_clip():
    cup_in = (FR[0], FR[1], FR[2] - 2.0)
    cup_out = (TIP[0], TIP[1], TIP[2] - 3.5)
    ring = {"kind": "arc", "joint": "sling", "inner": cup_in, "outer": cup_out, "color": ROCK,
            "taper": 0.35, "white": 0.6, "lines": 2, "line_gap_lu": 2.4, "band": 0.38}
    ov = {
        3: [dict(ring, t0=0.06, t1=0.9, samples=28)],
        4: [dict(ring, t0=0.05, t1=0.85, samples=16)],
        5: [dict(ring, t0=0.0, t1=0.85, samples=10, lines=3)],
        6: [{"kind": "dust", "ground": (13.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 4, "spread": 0.8}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: low whirl at the hip, underhand flick (ANIM_SPEC appendix B) ------------------------
# 0 = A read, 1 = A dip, 2 whirl starts low, 3 HOLD (deep crouch, the arm swung back and down, the
# sling whirling in a ring BEHIND the hip; loops with 4 while the sim wind-up lasts), 4 whirl
# continued, 5 the underhand swing comes through, 6 IMPACT (standing tall and leaning back, the arm
# flung up and forward, the near knee kicked up like a pitcher, the rock leaves), 7 the empty cup
# flaps, 8-10 = A reload and settle. Review N1 (2026-10-02): the hold and the impact must not share
# A's silhouette (A: overhead ring, lunge, side-arm release at the hip).
#      whirl HOLD  whirl2 swing  IMP  flap
B_AA = [-120, -168, -160, -75, -52, 30]
B_BB = [-110, -172, -165, -40, -26, 45]
B_CC = [140, 300, 480, 590, 706, 790]      # the sling keeps turning (the ring smear follows it)
B_RZ = [0, 0, 0, 0, 0, 0]                  # the whirl stays in the side plane so the ring reads
B_T = [0, -10, -8, 2, 8, 10]
B_H = [-4, -8, -6, 0, 12, 6]
B_X = [-1.5, -3.5, -3.0, 0.5, 2.0, 2.5]
B_Z = [-2.0, -4.2, -3.6, -1.5, 1.6, 0.4]
B_Q = [-0.06, -0.12, -0.10, 0.02, 0.06, 0.02]
B_THR = [-4, -12, -10, 20, 62, 40]
B_SHR = [10, 26, 22, -24, -70, -40]
B_THL = [8, 18, 16, -6, -8, -6]
B_SHL = [-14, -30, -26, -10, -2, -2]
B_OA = [-40, -20, -30, -60, -150, -120]
B_OF = [20, 40, 30, 0, 10, 10]


def _b_pose(i, t=0.0):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i, t)
    k = i - 2
    pose = merge(sling_arm(B_AA[k] + 0.55 * t, B_BB[k] + 0.65 * t, B_CC[k] + t),
                 off_arm(B_OA[k] + 0.6 * t, B_OF[k] + 0.4 * t), {
        "arm_r": {"rz": B_RZ[k]},
        "torso": {"r": B_T[k] + 0.18 * t}, "head": {"r": B_H[k] + 0.3 * t}, "pupils": {"z": 0.025 * t},
        "thigh_r": {"r": B_THR[k]}, "shin_r": {"r": B_SHR[k]},
        "thigh_l": {"r": B_THL[k]}, "shin_l": {"r": B_SHL[k]},
        "rock": {"hide": i in (6, 7)},
        "pebble": {"hide": False},
    }, M.body_about((0, 0, 20), x=B_X[k], z=B_Z[k], q=B_Q[k]))
    if i == 6:
        pose["sling"]["sz"] = 1.18
    if i in (2, 3, 4):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8, "r": -6}})
    elif i in (5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.0}})
    return pose


def _attack_b():
    cup_in = (FR[0], FR[1], FR[2] - 2.0)
    cup_out = (TIP[0], TIP[1], TIP[2] - 3.5)
    ring = {"kind": "arc", "joint": "sling", "inner": cup_in, "outer": cup_out, "color": ROCK,
            "taper": 0.35, "white": 0.6, "lines": 2, "line_gap_lu": 2.4, "band": 0.38}
    ov = {
        3: [dict(ring, t0=0.05, t1=0.9, samples=24)],
        4: [dict(ring, t0=0.05, t1=0.9, samples=24)],
        5: [dict(ring, t0=0.0, t1=0.85, samples=12, lines=3)],
        6: [{"kind": "dust", "ground": (10.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 14, "spread": 0.8}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov, reuse=reuse,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 16 * a}, "sling": {"r": 30 * a},
                "arm_l": {"r": 36 * a}, "fore_l": {"r": 20 * a},
                "brow": {"z": 1.4 * max(a, 0)}, "knot": {"r": 12 * a}, "tails": {"r": 10 * a}}
    return M.hit_light(k, stance(), recoil, face_hurt=F.expr("squeeze", "grit"))


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(stance(), M.die_d1(k, center_z=27.0, lie_z=10.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 80 * flail + 30}, "sling": {"r": 50 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
        "pebble": {"z": [4, 12, 20, 22, 18, 10, 4, 0, 0, 0][k], "x": [0, 2, 4, 6, 8, 10, 11, 12, 12, 12][k],
                   "r": 90 * k, "hide": k >= 7},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.8}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES)], [M.IDLE_MS] * M.IDLE_FRAMES, loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        attack := _attack_clip(),
        attack_b := _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    cl = M.check_variants(M.check_contract(cl))
    # W1 (item 44): A and B thrown up at flyers about 45 and 70 degrees (the extras sheet); the hold and the
    # wind-up are A's and B's own frames, the release and its follow-through turn, the reload falls out of it
    return cl + (W1.authored_variants(attack, _attack_pose, AIM_W_A, 20.0)
                 + W1.authored_variants(attack_b, _b_pose, AIM_W_B, 5.0))


# per unique frame: the share of the aim's turn (0 = the base frame, reused); the release frame (5) is fully aimed
AIM_W_A = [0, 0, 0, 0, 0.35, 1, 1, 0.7, 0.3, 0, 0]
AIM_W_B = [0, 0, 0, 0, 0.3, 1, 1, 0.7, 0, 0, 0]
W1.register_aims(SLUG, skins=("snowball_pebbler",), clips=("attack", "attack_b"))
