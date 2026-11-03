"""Cave Bear: Stone Age epic brawler (CONTENT_PLAN 5.1). Wide paw swats; every 14 s a roar stuns
enemies within 110 lu (the game draws the roar ring and dizzy stars, `timeStop.frozen: false`).
Claws, slash, ~92 lu.

Look (A11, PLAN.md): a towering, round cave bear with a huge shoulder hump, a broad domed head with
small round ears, a pale muzzle and small angry eyes, thick shaggy fur, massive forearms and big
paws with ivory claws. It wears a team war harness (a hide cape strapped over the hump with bone
toggles), team bands on the forearms and a team pennant on a short pole (every Heavy-sized beast
carries a pennant, A11).

"A viewer expects it to rear up and swat with a huge paw, bite, and to plod in a heavy trot."

Animation (ANIM_SPEC G4 heavy trot, appendix B claws and jaws):
  idle      heavy breathing, sniffs, scratches with a forepaw, blink
  walk      walk v3 heavy trot (card 55 x 1.25 = 68.75 lu/s), 8 frames in 840 ms, the hump rolling,
            the head low and swinging
  attack    REAR-UP SWAT: rises onto its hind legs (held extreme: tall, the near paw cocked high
            and back), swats down and across in a wide arc (claw lines over two frames), drops back
  attack_b  LUNGE BITE: a low lunge on all fours with the jaws wide, a bite and a head shake
  attack_c  LOW SWEEP: stays down and backhands a forepaw across at knee height
  hit       beast: head shake, a growl;  die  D4 heavy topple onto its back, X eyes
"""
import math

from ageborn_art import colors as CC
from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import Quad
from ageborn_art import look
from units import stone_w1 as W1

SLUG = "cave_bear"
GAIT_NAME = "quad"
NAME = "Cave Bear"
HEIGHT_LU = 92
YAW_DEG = -10.0
CANVAS = (380, 330)
FEET = (176, 300)
ANCHORS = {"head": (30, 76), "hitCenter": (0, 40)}
NO_RETIME = True

FUR = "#6E5A4A"
FUR_DK = "#54453A"
MUZZLE = "#B59C84"
NOSE = "#2E2826"
CLAW = "#EDE3C8"
STRAP = "#6B5646"
BONE = "#EDE3C8"
WOOD = "#8A7560"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#5A2E2E"
TOOTH = "#F4EEDC"

BODY_SCALE = 1.1
PAW_R = None
# W1 (the detail standard): a grizzled light top over a dark body, darker paws, a pale chest crescent
FUR_LT = "#9A846F"        # frosted guard-hair tips on the hump and shoulders (40 levels over the fur)
SOCK = "#46392F"          # the lower legs and paws (16 levels under the fur); the far ones 20% darker again
CLAW_DK = "#7C7062"       # the claws' dark roots (two-tone claws: the ivory tips read brightest)
SCAR = "#CDB79F"
# W1 art gate (S1): the fur in rounded two-tone tufts (a darker root, a lighter middle, a round end in shadow)
# instead of light-tipped spikes, over one lighter value plane on the near shoulder and haunch
FUR_PLANE = "#7E6856"     # the near shoulder and haunch (14 levels over the fur): the form reads before the texture
FUR_MID = "#8F7865"       # the tufts' lit middle on the shoulder and haunch planes (15 over the plane)

DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 1.6   # over the beasts' 1.45: the dark coat's highlight was 0.038 at idle 0
LOOK_SHADE = W1.SHADE_BIG
LOOK_RIM = W1.RIM_BEAST
MATERIAL_KINDS = W1.kinds({FUR: "fur", FUR_DK: "fur", FUR_LT: "fur", FUR_PLANE: "fur", FUR_MID: "fur", SOCK: "fur",
                           MUZZLE: "fur", NOSE: "hide", CLAW: "bone", CLAW_DK: "bone", STRAP: "leather", BONE: "bone",
                           WOOD: "wood", TOOTH: "bone", SCAR: "hide", "team": "hide"})
FAR = 0.8                 # the far legs' tones (rigs_stone: the far side 20% darker)
LEG_GEOS = {}             # the upper legs' rest geometry (blockers for the trunk's tufts)

# W1 art gate: the fur in shingled tufts, each three rounded locks (3.7-6 lu) fanning from one root and lying on the
# coat, with no darker cap and no interior line: the round end of each lock falls into the shadow band over the roots
# of the row below, so the coat shows dark roots and lit middles without reading as studs or spikes; the same rows on
# the far side, which faces the camera when the bear rolls onto its back
TUFT = {"shape": "lock", "lean": 0.12, "flat": 0.55, "inset": 0.45}
SHINGLE = {"dx": 5.6, "dz": 4.4, "length": (4.6, 6.0), "r": (1.15, 1.35), "jit": 1.2, "jit_z": 1.8}


def _clumps(rig, joint, coat, spots, side, fill, lean=None, flat=None):
    """Locks at `spots` laid on `coat` (W1.tufts) as one part of `fill`, without an interior line."""
    _, lobes = W1.tufts(coat, spots, side, lean=TUFT["lean"] if lean is None else lean,
                        flat=TUFT["flat"] if flat is None else flat, cap=0, shape=TUFT["shape"], inset=TUFT["inset"])
    rig.part(joint, lobes, fill, finish="hair", outline=0)


def _shingles(*a, **k):
    """W1.shingles with the bear's spacing and sizes, each spot fanned into a tuft of three locks."""
    return W1.fan(W1.shingles(*a, **dict(SHINGLE, **k)))


def _leg(rig, name, p0, p1, front):
    x0, y, z0 = p0
    x1, _, z1 = p1
    near = y < 0
    side = -1 if near else 1
    # W1 art gate: the near upper legs (the shoulder and haunch masses) one lighter value plane
    col = FUR_PLANE if near else FUR_DK
    g = Geo().capsule(p0, p1, 10.6 if front else 11.0, 8.4)
    g.blob((x0 + (2.0 if front else -1.5), y, z0 - 5.0), (11.0, 8.4, 12.0), p=2.2)
    upper = W1.Coat([g])
    LEG_GEOS[name] = upper.trees[0]
    rig.part(f"leg_{name}", g, col, finish="hair")
    sock = SOCK if near else CC.scale(SOCK, FAR)     # W1: darker lower legs and paws (value structure)
    g = Geo().capsule(p1, (x1 + 1.0, y, 6.0), 8.4 if front else 7.6, 7.4)
    lower = W1.Coat([g])
    rig.part(f"leg_{name}2", g, sock, finish="hair")
    clump = FUR_MID if near else CC.scale(FUR_PLANE, FAR)
    if front:   # team forearm band
        g = Geo().capsule((x1 + 0.4, y, z1 - 2.0), (x1 + 0.8, y, z1 - 6.0), 8.8, 8.2)
        rig.part(f"leg_{name}2", g, team=True, outline=0.6)
        # W1: a shaggy elbow fringe over the band (rounded clumps behind the forearm, pointing back and down)
        _clumps(rig, f"leg_{name}2", lower, [(x1 - 4.4, z1 + 2.6, 5.0, -56, 1.8), (x1 - 5.2, z1 - 1.2, 4.6, -62, 1.7),
                                             (x1 - 1.0, z1 + 3.4, 4.6, -30, 1.7)], side, col, lean=0.3)
    g = Geo().blob((x1 + 3.0, y, 4.0), (9.6 if front else 8.4, 8.0, 4.2), p=2.4)
    rig.part(f"leg_{name}2", g, sock, finish="hair")
    g = Geo()
    gt = Geo()
    for dy in (-3.6, 0.0, 3.6):
        g.lathe([(1.4, 0), (1.1, 1.2)], (x1 + 11.0, y + dy, 3.6), (x1 + 14.0, y + dy, 1.4), segs=8)
        gt.lathe([(1.15, 0), (0.8, 0.8), (0, 2.4)], (x1 + 11.9, y + dy, 2.95), (x1 + 14.0, y + dy, 1.4), segs=8)
    rig.part(f"leg_{name}2", g, CLAW_DK, finish="gloss", outline=0.4)   # W1: two-tone claws
    rig.part(f"leg_{name}2", gt, CLAW, finish="gloss", outline=0)
    # W1 art gate: shingled clumps over the shoulder and haunch (lighter than the plane: lit middles, the plane's
    # darker tone between them at the roots), flowing down and a little forward on the shoulder, back on the haunch
    if front:
        spots = _shingles(x0 - 10.0, x0 + 13.0, z0 + 3.0, z1 + 4.0, tilt=lambda x, z: 4.0 + 0.4 * (x - x0),
                          seed=11 if near else 12)
    else:
        spots = _shingles(x0 - 12.0, x0 + 10.0, z0 + 4.0, z1 + 3.0, tilt=lambda x, z: -10.0 + 0.4 * (x - x0),
                          seed=13 if near else 14)
    if near:
        # the lit top of the shoulder and the haunch stays smooth: the plane reads first, its fur hangs below it
        spots = [sp for sp in spots if sp[1] < z0 - 3.0 or sp[0] < x0 - 7.0 or sp[0] > x0 + 9.0]
    _clumps(rig, f"leg_{name}", upper, spots, side, clump)
    if not front:
        # W1: a fringe over the hock, hanging onto the dark sock
        _clumps(rig, f"leg_{name}2", lower, [(x1 - 3.4, z1 + 2.6, 5.0, -10, 1.8), (x1 + 1.4, z1 + 2.2, 4.6, -2, 1.7),
                                             (x1 - 7.6, z1 + 3.4, 4.6, -20, 1.7)], side, col)


def build(rig):
    global RIG, LEGS, PAW_R
    RIG = rig
    LEG_GEOS.clear()
    q = Quad(rig, trunk=(0, 42), front_x=17.0, back_x=-17.0, leg_y=10.0, shoulder_z=44.0,
             hip_z=40.0, knee_z=20.0, hock_z=18.0, knee_dx=1.5, hock_dx=-2.0, far_dx=-3.0)
    rig.rest_scale["body"] = BODY_SCALE
    LEGS = {}
    for name in ("fl", "bl", "fr", "br"):
        p0, p1, _ = q.legs[name]
        _leg(rig, name, p0, p1, name[0] == "f")
        LEGS[name] = G.Leg(f"leg_{name}", f"leg_{name}2", (p1[0] + 1.5, p1[1], 0.8),
                           bend=1.0 if name[0] == "f" else -1.0)
        rig.track(f"_foot_{name}", f"leg_{name}2", (p1[0] + 1.5, p1[1], 0.6))
    PAW_R = (q.legs["fr"][1][0] + 12.0, -10.0, 3.0)
    # round body, a big hump over the shoulders
    trunk = Geo().blob((-2, 0, 50), (26, 18.5, 19), p=2.2)
    trunk.blob((12, 0, 62), (16, 16.5, 15), p=2.2)
    trunk.blob((-17, 0, 48), (13, 16.5, 15), p=2.2)
    trunk_t = W1.bvh(trunk)
    rig.part("trunk", trunk, FUR, finish="hair")
    # W1 art gate: a fringe of rounded locks from under the girth straps along the near side of the belly (the fur and
    # the lighter plane in turn), lying back along the belly (pegs when the bear rears up, hanging straight down)
    lobes, lobes2 = Geo(), Geo()
    for k, x in enumerate((-16.0, -11.5, -7.0, -2.5, 2.0, 6.5, 11.0)):
        W1.tuft_at(None, lobes if k % 2 == 0 else lobes2, (x, -12.6, 33.0), (0.0, -1.0, 0.0),
                   5.4 if k % 2 == 0 else 5.0, -44, r=1.8 if k % 2 == 0 else 1.6, lean=0.1, flat=0.55, cap=0,
                   shape="lock")
    rig.part("trunk", lobes, FUR, finish="hair", outline=0)
    rig.part("trunk", lobes2, FUR_PLANE, finish="hair", outline=0)
    # team hide cape over the hump, a strap with bone toggles, team pennant
    g = Geo().blob((2.0, 0, 62.0), (22.4, 20.4, 13.4), p=2.8)
    g.clip((0, 0, 47.6), (0, 0, -1))
    for x in (-8.0, -2.0, 4.0, 10.0, 16.0):
        g.lathe([(2.4, 0), (0, -3.6)], (x, -17.2, 52.4), segs=8)
    cape_t = W1.bvh(g)
    cape_face = F.Face(rig, "trunk", [g])
    rig.part("trunk", g, team=True)
    # W1: the cape in two tones: a team-dark band above its hem (laid in pieces round the hump) and a bone paw
    # emblem (a 6 lu shape: a pad and three toes) on its flank
    hem = [(-12.0, 51.6), (-6.0, 51.2), (0.0, 51.0), (6.0, 51.1), (12.0, 51.4), (18.0, 52.0)]
    W1.stripes(rig, "trunk", cape_face, [[a, b] for a, b in zip(hem, hem[1:])], w=2.8)
    # W1: three big claw slashes painted on the cape's flank (the cave bear's own mark, up to 2.6 lu wide and
    # pointed at both ends), team-dark; each slash is one polygon anchored at its middle where the flank faces the
    # camera (strokes built of pieces, or laid in pieces over the curved top, show every piece's edge light and read
    # as strings of beads)
    g = Geo()
    for x0 in (-15.0, -11.0, -7.0):
        (ax, az), (bx, bz) = (x0, 65.0), (x0 + 3.6, 55.6)
        mx, mz = (ax + bx) / 2, (az + bz) / 2
        L = math.hypot(bx - ax, bz - az)
        tx, tz = (bx - ax) / L, (bz - az) / L
        nx, nz = -tz, tx
        side_a, side_b = [], []
        for i in range(9):
            t = i / 8
            bow = 0.9 * math.sin(math.pi * t)                              # a slight swipe
            w = 1.3 * math.sin(math.pi * (0.08 + 0.84 * t)) ** 0.6         # half-width, pointed at both ends
            cx, cz = ax + (bx - ax) * t + nx * bow - mx, az + (bz - az) * t + nz * bow - mz
            side_a.append((cx + nx * w, cz + nz * w))
            side_b.append((cx - nx * w, cz - nz * w))
        poly = side_a + side_b[::-1]
        area = sum(u0 * v1 - u1 * v0 for (u0, v0), (u1, v1) in zip(poly, poly[1:] + poly[:1]))
        cape_face.decal(g, cape_face.hit(mx, mz), poly if area > 0 else poly[::-1], 1.0)   # counter-clockwise
    look.team_part(rig, "trunk", g, outline=0)
    g = Geo()
    c = cape_face.hit(2.0, 61.0)
    cape_face.decal(g, c, F.ellipse(0, -0.8, 3.4, 2.6, 14), 0.3)
    for u, v in ((-3.4, 3.1), (0.0, 4.2), (3.4, 3.1)):
        cape_face.decal(g, c, F.ellipse(u, v, 1.4, 1.5, 10), 0.3)
    rig.part("trunk", g, BONE, highlight=False, outline=0)
    # W1: a woven team-dark zigzag down the cape's front (its biggest plain field), joining the hem band
    W1.seam(rig, "trunk", cape_face, [(12.6 if k % 2 == 0 else 16.4, 53.6 + 3.2 * k) for k in range(6)], w=2.2,
            team=True)
    g = Geo()
    for x in (-8.0, 12.0):   # W1: girth straps 17 lu wide (13 before): the team that shows when it rolls over
        g.lathe([(0, -8.5), (19.6, -8.3), (20.2, 8.3), (0, 8.5)], (x, 0, 50), (x + 1.0, 0, 50), segs=24, squash=(1.12, 1.1))
    g.clip((0, 0, 40.0), (0, 0, 1))
    straps_t = W1.bvh(g)
    rig.part("trunk", g, team=True, outline=0.8)
    g = Geo()
    for x in (-2.0, 12.0):
        g.capsule((x - 2.0, -19.0, 52.0), (x + 2.6, -19.0, 52.8), 1.4)
    rig.part("trunk", g, BONE, outline=0.6)
    # W1 art gate: shingled clumps on the trunk wherever the cape, the straps and the legs leave it clear, on both
    # sides (the far side faces the camera when the bear rolls over): the flank under the cape's hem (the lighter
    # plane over the fur), and a grizzled rump behind the cape (frosted; the hump's in front of it is on the neck)
    coat = W1.Coat([trunk_t], blockers=[cape_t, straps_t] + list(LEG_GEOS.values()))
    for side in (-1, 1):
        _clumps(rig, "trunk", coat, _shingles(-28.0, 28.0, 50.5, 42.0, tilt=-8.0, seed=21 + side), side, FUR_PLANE)
        _clumps(rig, "trunk", coat, _shingles(-31.0, -19.0, 66.0, 41.0, tilt=lambda x, z: -24.0 + 2.2 * (x + 19.0),
                                                seed=24 + side), side, FUR_LT)
    rig.joint("pole", "trunk", (-12, 4.0, 60))
    g = Geo().capsule((-12, 4.0, 60), (-15, 4.0, 92), 1.4, 1.2).sphere((-15.2, 4.0, 93.0), 2.0, cuts=3)
    rig.part("pole", g, WOOD)
    rig.secondary("pennant", "pole", (-14.6, 4.0, 89), (-32, 4.0, 85), max_deg=14, gain=1.3)
    pts = [(-14.6, 91.0), (-35.0, 88.0), (-28.0, 82.0), (-34.5, 75.0), (-14.2, 74.5)]
    rig.part("pennant", Geo().slab(pts, 4.0, 1.4), team=True, outline=0.8)
    # W1: a team-dark band at the hoist (the pennant in two tones)
    look.team_part(rig, "pennant", Geo().slab([(-14.6, 91.0), (-19.4, 90.4), (-19.2, 75.0), (-14.2, 74.5)], 3.15, 0.5),
                   outline=0)
    # W1: the clan's bone paw on the pennant as on the cape (bright on the team, it reads at 30 px)
    g = Geo().slab(F.ellipse(-23.6, 80.8, 3.2, 2.5, 14), 3.1, 0.4)
    for x, z in ((-26.9, 85.0), (-23.6, 86.4), (-20.3, 85.0)):
        g.slab(F.ellipse(x, z, 1.35, 1.4, 10), 3.1, 0.4)
    rig.part("pennant", g, BONE, highlight=False, outline=0)
    # neck and head: broad dome, small ears, pale muzzle
    rig.joint("neck", "trunk", (22, 0, 54))
    rig.joint("head", "neck", (31, 0, 54), scale=1.08)
    neck = Geo().blob((25, 0, 55), (11, 14, 14), p=2.3)
    neck_face = F.Face(rig, "neck", [neck])
    ncoat = W1.Coat([neck], blockers=[cape_t])
    rig.part("neck", neck, FUR, finish="hair")
    # W1: the pale crescent on the chest (a marking that reads at 62 px)
    g = Geo()
    neck_face.stroke(g, neck_face.hit(30.0, 48.0), [(-3.6, 3.6), (-1.6, 0.6), (1.6, -0.6), (4.0, 0.8)], 2.8, 0.35)
    rig.part("neck", g, MUZZLE, highlight=False, outline=0)
    # W1 art gate: rounded tufts on the neck, both sides: the grizzled top of the hump in front of the cape (the fur's
    # roots, frosted lobes), a row down the side (dark roots, lighter middles) and a dark ruff under the jaw
    for side in (-1, 1):
        _clumps(rig, "neck", ncoat, _shingles(19.0, 31.0, 69.0, 62.0, tilt=lambda x, z: 22.0 + 2.0 * (x - 19.0),
                                                seed=31 + side), side, FUR_LT)
        _clumps(rig, "neck", ncoat, _shingles(17.0, 27.0, 58.0, 49.0, tilt=14.0, seed=33 + side), side, FUR_PLANE)
        _clumps(rig, "neck", ncoat, [(30.6, 47.2, 5.0, -14, 1.8), (26.4, 46.2, 5.0, -20, 1.8), (34.0, 48.0, 4.6, -6, 1.6)],
                side, FUR_DK, lean=0.4)
    head = Geo().blob((36, 0, 56), (13.0, 12.6, 12.0), p=2.3)
    head.blob((47.5, 0, 51.5), (8.0, 7.6, 6.4), p=2.2)
    eye = Geo().blob((43.0, -9.6, 59.0), (2.6, 1.6, 2.4))
    pup = Geo().blob((44.4, -10.2, 58.8), (1.1, 1.0, 1.6))
    face = F.Face(rig, "head", [head, eye, pup])
    hcoat = W1.Coat([head])
    rig.part("head", head, FUR, finish="hair")
    rig.part("head", Geo().blob((48.5, -0.4, 50.6), (7.0, 6.6, 5.0), p=2.2), MUZZLE)
    rig.part("head", Geo().blob((54.6, -0.4, 53.0), (2.6, 2.8, 2.0), p=2.2), NOSE, outline=0.5)
    rig.part("head", eye, EYE, highlight=False)
    rig.joint("pupils", "head", (44.4, -10.2, 58.8))
    rig.part("pupils", pup, PUPIL, outline=0)
    face.eye_marks([(44.4, 59.0)], 2.4, FUR)
    rig.joint("brow", "head", (43.0, -9.6, 62.0))
    rig.part("brow", Geo().capsule((39.6, -11.0, 63.0), (46.0, -10.0, 61.0), 2.0, 1.4), FUR_DK, finish="hair", outline=0.6)
    # W1: an old pale scar across the brow and frosted cheek tufts (the head is not one brown dome)
    g = Geo()
    face.stroke(g, face.hit(38.6, 58.0), [(-1.6, 2.4), (1.6, -2.2)], 1.2, 0.35)
    rig.part("head", g, SCAR, highlight=False, outline=0)
    # W1: two frosted streaks down the crown (the side of the head was one brown dome at game scale)
    for pts in ([(40.5, 64.5), (37.6, 61.4), (35.2, 58.4)], [(35.6, 65.6), (33.0, 62.6), (31.0, 59.6)]):
        W1.seam(rig, "head", face, pts, fill=FUR_LT, w=2.4)
    # W1 art gate: frosted cheek clumps sweeping back, on both cheeks
    for side in (-1, 1):
        _clumps(rig, "head", hcoat, [(33.6, 52.0, 5.0, -66, 1.9), (33.0, 56.2, 4.6, -60, 1.8), (30.6, 49.4, 4.6, -50, 1.7)],
                side, FUR_LT, lean=0.3)
    rig.joint("ears", "head", (30.0, 0, 66.0))
    g = Geo()
    for y in (-1, 1):
        g.blob((29.0, 9.6 * y, 67.4), (3.8, 2.4, 3.8), p=2.2)
    rig.part("ears", g, FUR_DK, finish="hair")
    rig.joint("jaw", "head", (43, 0, 47))
    jaw = Geo().blob((48.0, 0, 45.0), (7.6, 6.4, 3.2), p=2.2)
    jface = F.Face(rig, "jaw", [jaw])
    rig.part("jaw", jaw, MUZZLE)
    rig.part("jaw", Geo().blob((47.6, 0, 47.0), (6.6, 5.2, 1.4), p=2.2), MOUTH, outline=0, highlight=False)
    jaw.bm.free()
    jface.mouths((52.0, 45.0), 5.0)
    g = Geo()
    for y in (-2.6, 2.6):
        g.lathe([(1.1, 0), (0, 2.6)], (52.6, y, 49.0), (52.8, y, 46.6), segs=6)
    rig.part("head", g, TOOTH, finish="gloss", outline=0.3)
    rig.track("pawR", "leg_fr2", PAW_R)
    # stubby tail
    rig.secondary("tail", "trunk", (-29, 0, 52), (-33, 0, 48), max_deg=20, gain=1.3)
    rig.part("tail", Geo().blob((-31.0, 0, 51.0), (4.0, 3.6, 3.6), p=2.2), FUR_DK, finish="hair")
    if getattr(rig, "skin", None) is None:
        _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, beast): the team cape over the hump tears (its free field) and a
    strip hangs from its hem; scuffs on the near shoulder and haunch; breath puffs from the nose at the last stage.
    As the rest pose is drawn (the body x 1.1). W1 art gate (nit 5, hurt reads faintly on the dark coat): the two
    scuffs sit on the smooth, lighter tops of the shoulder and the haunch (no fur over them) and are larger."""
    rig.damage_spot_at("cape", "trunk", -2.0, 66.0, 8.0, "hide", team=True)
    rig.damage_spot_at("shoulder", "leg_fr", 21.0, 45.0, 7.5, "hide")
    rig.damage_spot_at("haunch", "leg_br", -21.0, 42.0, 7.5, "hide")
    rig.damage_spot_at("hem", "trunk", -6.0, 56.0, 10.0, "hide", kind="strip", team=True)
    rig.damage_spot("breath", "head", (56.0, -2.0, 52.0), 5.0, "breath", kind="emit", normal=(1, 0, 0))


CENTER = (0, 0, 48.0)
RIG = None
LEGS = None
SPEED = 68.75
GAIT = None


def _gait():
    global GAIT
    if GAIT is None:
        GAIT = G.Gait(8, 840, SPEED, G.quad_feet(LEGS, G.TROT, scale=BODY_SCALE,
                                                 x_off={"fr": 2.0, "fl": 2.0, "br": -1.0, "bl": -1.0}),
                      0.48, lift=8.5, kick=2.0, reach=2.5, toe_off=0.0, heel_strike=0.0)
    return GAIT


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    lag = math.cos(2 * math.pi * (f - 1) / n)
    scr = [0.0, 0.0, 0.6, 1.0, 0.5, 0.0][f]
    pose = {
        "trunk": {"z": -1.4 * c, "r": 0.6 * c},
        "body": squash(-0.025 * c),
        "neck": {"r": 2.5 * lag - 6 * scr}, "head": {"r": -3.0 * lag},
        "leg_fl": {"r": 30 * scr}, "leg_fl2": {"r": -50 * scr},
        "ears": {"r": [0, 10, -4, 0, 0, 0][f]},
    }
    if f == 5:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f, report=None):
    g = _gait()

    def extra(ctx):
        p = ctx["p"]
        return {"neck": {"r": -6.0 * math.cos(2 * p - 0.6)}, "head": {"r": 4.0 * math.cos(2 * p - 1.2), "rz": 6 * math.sin(p)},
                "ears": {"r": 6 * math.cos(2 * p - 1.4)}}
    return G.quad_walk(RIG, f, g, {}, base_z=-4.0, bob=2.4, beats=2, pitch=2.0, roll=3.0, extra=extra, report=report)


def _br(x, z, q, r, n, h, j, fr, fl, br, bl, nrz=0.0, rz=0.0, ears=0.0):
    return merge(M.body_about(CENTER, x=x, z=z, q=q), {
        "trunk": {"r": r, "rz": rz},
        "neck": {"r": n, "rz": nrz}, "head": {"r": h}, "jaw": {"r": j},
        "leg_fr": {"r": fr[0]}, "leg_fr2": {"r": fr[1]},
        "leg_fl": {"r": fl[0]}, "leg_fl2": {"r": fl[1]},
        "leg_br": {"r": br[0]}, "leg_br2": {"r": br[1]},
        "leg_bl": {"r": bl[0]}, "leg_bl2": {"r": bl[1]},
        "ears": {"r": ears},
    })


ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#        x     z     q      r    n    h    j    fr          fl          br         bl
A_TAB = [
    (-1.0, 0.0, -0.02, 0, -4, -2, 0, (0, 0), (0, 0), (0, 0), (0, 0)),
    (-3.0, 3.0, 0.03, 18, 0, 0, -6, (30, -40), (24, -36), (-10, 14), (-8, 12)),
    (-5.0, 10.0, 0.06, 40, 8, 6, -14, (70, -60), (60, -70), (-24, 26), (-22, 24)),
    (-6.0, 14.0, 0.08, 54, 12, 10, -20, (120, -40), (70, -90), (-30, 30), (-28, 28)),
    (-2.0, 12.0, 0.06, 40, 0, -4, -24, (80, -20), (60, -80), (-26, 26), (-24, 24)),
    (2.0, 8.0, 0.02, 20, -10, -12, -24, (20, -10), (40, -70), (-20, 20), (-18, 18)),
    (5.0, 3.0, -0.12, 4, -16, -14, -10, (-20, 0), (14, -40), (-14, 14), (-12, 12)),
    (4.0, 0.0, -0.04, 0, -8, -6, -4, (-10, 0), (4, -10), (-6, 6), (-4, 4)),
    (2.0, 0.0, 0.02, 0, -2, -2, -2, (-2, 0), (0, 0), (-2, 2), (-2, 2)),
    (0.5, 0.0, 0.0, 0, 0, 0, 0, (0, 0), (0, 0), (0, 0), (0, 0)),
]


def _plant_hind(pose, dx=0.0):
    """Keeps both hind paws on the ground by IK while the body rears (ANIM_SPEC: planted feet)."""
    t = {n: (LEGS[n], LEGS[n].end.x * BODY_SCALE + dx, LEGS[n].end.z * BODY_SCALE, 0.0) for n in ("br", "bl")}
    return G.solve(RIG, pose, t)


def _attack_pose(f):
    x, z, q, r, n, h, j, fr, fl, br, bl = A_TAB[f]
    pose = _br(x, z, q, r, n, h, j, fr, fl, br, bl, ears=-14 if 2 <= f <= 6 else 0)
    if f in (2, 3):
        pose = merge(pose, {"brow": {"z": -1.2}})
    if 1 <= f <= 6:
        pose = _plant_hind(pose, dx=x * 0.5)
    return pose


def _claw(frm=None, t0=0.0):
    pts = [(PAW_R[0], PAW_R[1], PAW_R[2] + 3.0), (PAW_R[0] + 1.0, PAW_R[1], PAW_R[2]), (PAW_R[0], PAW_R[1], PAW_R[2] - 3.0)]
    s = {"kind": "claw", "joint": "leg_fr2", "points": pts, "color": "#FFFFFF", "width_lu": 3.2, "white": 0.0, "t0": t0}
    if frm is not None:
        s["from"] = frm
    return s


def _attack_clip():
    ov = {
        4: [_claw(3)],
        5: [_claw(4, 0.3)],
        6: [{"kind": "burst", "joint": "leg_fr2", "point": PAW_R, "r0_lu": 10.0, "r1_lu": 18.0, "n": 6, "a0": -40.0, "arc": 150.0},
            {"kind": "dust", "ground": (34.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 141, "spread": 1.2}],
        7: [{"kind": "dust", "ground": (20.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 142, "spread": 1.2}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov)


B_SEQ = [0, 1, 1, 2, 3, 3, 4, 5, 6, 6, 7, 7]


def _b_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 2)
    tab = [
        (-3.0, -2.0, -0.04, -4, -10, -6, -10, (-12, 16), (-10, 14), (16, 22), (14, 20)),
        (-6.0, -4.0, -0.08, -6, -16, -8, -24, (-20, 26), (-18, 24), (24, 34), (22, 30)),
        (6.0, -1.0, 0.06, -4, -12, -10, -36, (30, -24), (24, -18), (-28, 10), (-24, 8)),
        (12.0, -3.0, -0.12, -6, -20, -16, 0, (20, -4), (16, -2), (-24, 10), (-20, 8)),
        (10.0, -2.0, -0.04, -4, -14, -10, -4, (12, -2), (8, 0), (-16, 8), (-12, 6)),
    ][i - 1]
    x, z, q, r, n, h, j, fr, fl, br, bl = tab
    p = _br(x, z, q, r, n, h, j, fr, fl, br, bl, ears=-16)
    if i == 5:
        p["head"]["rx"] = 16
    return p


def _attack_b():
    bite = (55.0, 0.0, 50.0)
    ov = {3: [{"kind": "streak", "joint": "head", "point": bite, "color": MUZZLE, "width_lu": 10.0, "white": 0.4, "from": 2}],
          4: [{"kind": "burst", "joint": "head", "point": bite, "r0_lu": 8.0, "r1_lu": 15.0, "n": 6, "a0": -50.0, "arc": 140.0},
              {"kind": "dust", "ground": (34.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 143, "spread": 1.0}]}
    reuse = {0: ("attack", 0), 6: ("attack", 8), 7: ("attack", 9)}
    return M.clip("attack_b", [_b_pose(i) for i in range(8)], M.HEAVY_MELEE_MS, impact=4,
                  sequence=B_SEQ, overlays=ov, reuse=reuse)


def _c_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 2)
    tab = [  # body rz, near foreleg cocked back then swept forward low
        (-2.0, -1.0, -0.03, -2, -6, -4, -6, (-30, -40), (-6, 6), (8, 10), (6, 8), 14),
        (-4.0, -3.0, -0.07, -4, -10, -6, -10, (-50, -70), (-10, 10), (14, 18), (12, 16), 24),
        (4.0, -2.0, 0.04, -2, -6, -6, -14, (10, -30), (-4, 4), (-10, 6), (-8, 4), 0),
        (7.0, -3.0, -0.12, -4, -10, -8, -16, (50, -20), (2, 0), (-16, 6), (-12, 4), -20),
        (5.0, -1.0, 0.02, -2, -6, -4, -8, (30, -10), (0, 0), (-8, 4), (-6, 2), -12),
    ][i - 1]
    x, z, q, r, n, h, j, fr, fl, br, bl, rz = tab
    return _br(x, z, q, r, n, h, j, fr, fl, br, bl, rz=rz, nrz=-rz * 0.6, ears=-14)


def _attack_c():
    ov = {3: [_claw(2)],
          4: [_claw(3, 0.4),
              {"kind": "burst", "joint": "leg_fr2", "point": PAW_R, "r0_lu": 8.0, "r1_lu": 14.0, "n": 5, "a0": -30.0, "arc": 120.0},
              {"kind": "dust", "ground": (30.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 144, "spread": 1.0}]}
    reuse = {0: ("attack", 0), 6: ("attack", 8), 7: ("attack", 9)}
    return M.clip("attack_c", [_c_pose(i) for i in range(8)], M.HEAVY_MELEE_MS, impact=4,
                  sequence=B_SEQ, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a, shake):
        return {"body": dict(squash(-0.06 * max(a, 0)), x=-4.0 * max(a, 0) + 1.0 * min(a, 0)),
                "trunk": {"r": 5 * a},
                "neck": {"r": 10 * a}, "head": {"r": 6 * a + 8 * shake, "rx": 14 * shake},
                "jaw": {"r": -12 * max(a, 0)}, "ears": {"r": -20 * max(a, 0)},
                "leg_br": {"r": -12 * max(a, 0)}, "leg_bl": {"r": -10 * max(a, 0)},
                "leg_br2": {"r": 18 * max(a, 0)}, "leg_bl2": {"r": 16 * max(a, 0)},
                "leg_fr": {"r": -8 * a}, "leg_fl": {"r": -6 * a}}
    return M.hit_beast(k, {}, recoil, face_hurt=F.expr("squeeze"))


def _die_pose(k):
    kick = [0.0, 0.3, 0.7, 1.0, 0.6, 1.0, 0.4, 0.2, 0.1, 0.0][k]
    pose = merge(M.die_d4(k, center_z=50.0, back_z=38.0, height=HEIGHT_LU, heavy=True), {
        "neck": {"r": [10, 16, 12, 6, 2, 0, 0, 0, 0, 0][k]},
        "head": {"r": [8, -6, -10, -14, -12, -10, -8, -8, -8, -8][k]},
        "jaw": {"r": -14},
        "leg_fr": {"r": 30 * kick - 10}, "leg_fr2": {"r": -30 * kick},
        "leg_fl": {"r": -20 * kick + 10}, "leg_fl2": {"r": -20 * kick},
        "leg_br": {"r": -26 * kick}, "leg_br2": {"r": 26 * kick},
        "leg_bl": {"r": 20 * kick}, "leg_bl2": {"r": 20 * kick},
        "tail": {"r": 20 * kick}, "ears": {"r": -20},
        "pole": {"hide": k >= 3, "r": 25 * min(1.0, k)},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", mouth=None))
    elif k >= 3:
        pose = merge(pose, F.expr("x"), F.expr("tongue", mouth=None))
    return pose


def clips():
    keep = M.HEAVY_DIE_KEEP
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)], [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.walk_clip("walk", RIG, _walk, _gait(), "quad"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die_pose(keep[i]) for i in range(len(keep))], M.DIE_MS_HEAVY,
               sequence=M.DIE_SEQ_HEAVY, extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
