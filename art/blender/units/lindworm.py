"""Lindworm: Medieval Age legendary dragon (CONTENT_PLAN 5.3). Green marsh-fire breath, ~130 lu.

Look (A11, PLAN.md): a long, low, wingless marsh dragon on four stubby clawed legs: dusky violet-grey
scales (outside the team hue bands), a pale ridged belly, a long neck rising to a horned dragon head
with a toothy grin, amber eyes and a frilled jaw, team-coloured spine frills down the neck and back, a
team war caparison over the shoulders with a parchment bear paw (the realm's beast), a team collar, and
a long tail ending in a team fin. Its breath is alchemical green marsh-fire (mint and white core,
never in the team hue bands).

"A viewer expects a dragon to rear back, take a breath and sweep a gout of green fire over the front,
and to crawl forward low, its tail lashing."

Animation (ANIM_SPEC G4, appendix B for a breath weapon: rear-and-breathe, low sweep, reared pour):
  idle      smoke curls from the nostrils, the head sways and licks its lips, the tail flicks
  walk      walk v3 (G4 trot at ground speed, card 50 x 1.25 = 62.5 lu/s, 8 frames in 800 ms): stubby
            legs with planted IK feet, the body sways, the tail S-curves a beat late
  attack    REAR AND BREATHE: draws the neck back high and swells the chest (the held extreme, an
            inhale squash), then lunges the head forward and a gout of green fire sweeps the front
            (a cone of flame, smoke), the fire breaking off as it settles
  attack_b  LOW SWEEP: coils the head low along the ground, then sweeps the fire up and across
  attack_c  REARED POUR: rears up on its hind legs with the head high, then pours the fire down
  hit       beast: the head recoils, the frills flatten
  die       slumps onto its belly, the neck falls flat, smoke puffs, X eyes

Detail standard (art round W2, Track MEDIEVAL): the long neck and tail banded in darker scale rows (the big plain
fields read as scaled hide), rows of lighter plates over the haunch, the caparison in two tones (a team-dark border
above its fringe) with its paw whole, the back frills team-dark. Damage spots: the caparison (r 9), the neck's
scales, the tail fin, a strip torn from the caparison's fringe, smoke curling from the nostrils (breath) and a smoke
emitter low on the haunch, below the head and clear beside it on every frame (DAMAGE's `fireAt`).
Bone Wyrm (legendary skin): a skeletal dragon in bleached bone with dark rib bands down its flank and dark
sockets round the eyes; the fire stays ghost green.
W2 review (S1, the wave's weakest item; the extras sheet under the beast floors): the neck and tail no longer banded
like a ribbed hose: shingled scales over their backs (round lobes pointing down the neck and out along the tail) and
pale scutes down the throat; the caparison quilted in team-dark diamonds (its big field read as glossy plastic); the
breath in three values (a darker green rim, the mint body, the white core) with lighter streaks along the flow
instead of one flat mint cone; the smoke rises from the back behind the caparison, clear of the body. The Bone Wyrm
keeps the ringed neck and tail (vertebrae suit the skeleton).
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import kit_medieval as K
from ageborn_art import look
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from units import medieval_w2 as MW

SLUG = "lindworm"
GAIT_NAME = "quad"
NAME = "Lindworm"
HEIGHT_LU = 130
YAW_DEG = -10.0
CANVAS = (830, 480)
FEET = (305, 430)
ANCHORS = {"head": (54, 125), "hitCenter": (0, 45)}
NO_RETIME = True

SCALE_C = "#6E6684"
SCALE_DK = "#57506B"
SCALE_LT = "#8E86A6"
BELLY = "#D8CFB0"
FANG = "#F4EEDC"
CLAW = "#E2D6BC"
EYEC = "#F2E6B0"
MOUTH = "#5A2E3E"
PARCH = "#E8DFC8"
FIRE = "#8FE39A"
FIRE_CORE = "#E8FFE6"
FIRE_RIM = "#56B26C"      # W2 review S1: the breath's darker rim (three values instead of a flat mint cone)
FIRE_BAND_CORE = "#D3F2D4"  # W2 S1, second pass: flow bands a few levels under the white core
FIRE_BAND_LT = "#A6EBB0"    # ... a few levels over the mint body
FIRE_BAND_DK = "#7CD38A"    # ... and a few under it
SCALE_MID = "#79718F"     # the shingled scales over the neck's and tail's backs
SMOKE = "#B9C2B8"
SCALE_RING = "#5F5874"    # the neck's and tail's scale rows (between the scale and its dark)
RIDGE = "#BDB396"

# the detail standard (art round W2): the beast's lifts; scales, belly plates, bone and the team harness apart
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = MW.HIGHLIGHT_BEAST
LOOK_SHADE = MW.SHADE_BEAST
LOOK_RIM = MW.RIM_BEAST
MATERIAL_KINDS = MW.kinds({SCALE_C: "hide", SCALE_DK: "hide", SCALE_LT: "hide", SCALE_RING: "hide", SCALE_MID: "hide",
                           BELLY: "bone",
                           RIDGE: "bone", FANG: "bone", CLAW: "bone", EYEC: "glass", MOUTH: "skin", PARCH: "cloth",
                           FIRE: "energy", FIRE_CORE: "energy", FIRE_RIM: "energy", FIRE_BAND_CORE: "energy",
                           FIRE_BAND_LT: "energy", FIRE_BAND_DK: "energy", SMOKE: "cloth", "#2A2018": "skin",
                           "team": "cloth"})

# Bone Wyrm (legendary skin, DESIGN A5.8): a skeletal dragon: bleached bone hide, dark rib bands down the flank and
# dark sockets round the eyes (geometry the skin adds), grey-brown scale rows; the breath stays ghost green. The bone
# hide takes the hide's blotchy texture (weathered bone; the pores alone left the pale sheet under the micro floor)
BONE, BONE_DK, BONE_LT, SOCKET = "#E2D8C0", "#B8AB90", "#F2ECDC", "#6E6252"
SKINS = {"bone_wyrm": {
    "palette": MW.skin_palette({SCALE_C: BONE, SCALE_DK: BONE_DK, SCALE_LT: BONE_LT, SCALE_RING: "#A3967C",
                                BELLY: "#CFC4A8", RIDGE: "#9E9178"}),
    "kinds": MW.kinds({BONE: "hide", BONE_DK: "hide", BONE_LT: "hide", "#A3967C": "bone", "#CFC4A8": "bone",
                       "#9E9178": "bone", SOCKET: "bone"})}}

BODY_SCALE = 1.25
NECK = dict(base=(18.0, 0.0, 48.0), l=(30.0, 26.0), ang=(64.0, 30.0), r=(9.0, 7.0))


def _neck_points():
    x0, y, z0 = NECK["base"]
    a1, a2 = math.radians(NECK["ang"][0]), math.radians(NECK["ang"][1])
    x1, z1 = x0 + NECK["l"][0] * math.cos(a1), z0 + NECK["l"][0] * math.sin(a1)
    x2, z2 = x1 + NECK["l"][1] * math.cos(a2), z1 + NECK["l"][1] * math.sin(a2)
    return (x0, z0), (x1, z1), (x2, z2), a1, a2


(X0, Z0), (X1, Z1), (X2, Z2), A1, A2 = _neck_points()
SNOUT = (X2 + 22.0, 0.0, Z2 - 1.0)
FLAME_TIP = (X2 + 64.0, 0.0, Z2 - 4.0)


def _frame(p0, p1):
    """A capsule segment's axis a (p0 -> p1 in the x-z plane), its dorsal normal d (the side facing up: the back of a
    rising neck, the top of a falling tail) and the camera side c (-y)."""
    from mathutils import Vector
    a = Vector((p1[0] - p0[0], 0.0, p1[1] - p0[1])).normalized()
    d = Vector((-a.z, 0.0, a.x)) if a.x >= 0 else Vector((a.z, 0.0, -a.x))
    return a, d, Vector((0.0, -1.0, 0.0))


def _rows(p0, p1, step, t0, t1):
    L = math.dist(p0, p1) * (t1 - t0)
    n = max(1, int(L / step))
    return [t0 + (t1 - t0) * (k + 0.5) / n for k in range(n)]


def _scales(rig, joint, p0, p1, r0, r1, toward, step=3.0, phis=(10.0, 40.0, 70.0), length=4.4, r=1.75, t0=0.06,
            t1=0.96):
    """W2 review S1: shingled scales over the back of a neck or tail segment: round lobes (W1.tuft_at) laid on the
    capsule p0 -> p1 (radius r0 -> r1) in rows every `step` lu at the angles `phis` from the dorsal line toward the
    camera (odd rows offset half a step), each pointing toward p0 (`toward` -1: down a neck to the body) or p1 (+1:
    out along a tail), so each row's round ends cover the next row's roots."""
    a, d, c = _frame(p0, p1)
    dv = a * toward
    tilt = math.degrees(math.atan2(dv.x, -dv.z))
    half = (phis[1] - phis[0]) / 2 if len(phis) > 1 else 0.0
    lobes = Geo()
    for k, t in enumerate(_rows(p0, p1, step, t0, t1)):
        rr = r0 + (r1 - r0) * t
        ax = (p0[0] + (p1[0] - p0[0]) * t, 0.0, p0[1] + (p1[1] - p0[1]) * t)
        for phi in phis:
            ph = math.radians(phi + (half if k % 2 else 0.0))
            nv = d * math.cos(ph) + c * math.sin(ph)
            p = (ax[0] + nv.x * rr, ax[1] + nv.y * rr, ax[2] + nv.z * rr)
            MW.tuft_at(None, lobes, p, nv, length, tilt, r, inset=0.45, lean=0.18, flat=0.55, cap=0, shape="round")
    rig.part(joint, lobes, SCALE_MID, outline=0)


def _scutes(rig, joint, p0, p1, r0, r1, step=2.5, phis=(126.0, 158.0), t0=0.05, t1=0.95):
    """W2 review S1: pale scutes down the throat: flat plates across the throat side of a neck segment (rows every
    `step` lu at the angles `phis` from the dorsal line, past the camera side to the throat), each lying on the
    surface and wide round the neck, so the throat reads as a snake's belly between the scaled back and the jaw."""
    from mathutils import Matrix
    a, d, c = _frame(p0, p1)
    g = Geo()
    for t in _rows(p0, p1, step, t0, t1):
        rr = r0 + (r1 - r0) * t
        ax = (p0[0] + (p1[0] - p0[0]) * t, 0.0, p0[1] + (p1[1] - p0[1]) * t)
        for phi in phis:
            ph = math.radians(phi)
            nv = d * math.cos(ph) + c * math.sin(ph)
            tv = d * -math.sin(ph) + c * math.cos(ph)
            p = (ax[0] + nv.x * (rr - 0.3), ax[1] + nv.y * (rr - 0.3), ax[2] + nv.z * (rr - 0.3))
            e = Matrix((tuple(a), tuple(tv), tuple(nv))).transposed().to_euler("XYZ")
            g.blob(p, (1.3, 2.7, 0.8), p=2.4, rot=tuple(math.degrees(v) for v in e))
    rig.part(joint, g, BELLY, outline=0.3)


def _neck(rig):
    r0, r1 = NECK["r"]
    rig.joint("n1", "trunk", (X0, 0.0, Z0))
    rig.joint("n2", "n1", (X1, 0.0, Z1))
    rig.joint("nh", "n2", (X2, 0.0, Z2))
    rig.part("n1", Geo().capsule((X0, 0, Z0), (X1, 0, Z1), r0 + 2.0, r0), SCALE_C)
    rig.part("n2", Geo().capsule((X1, 0, Z1), (X2, 0, Z2), r0, r1), SCALE_C)
    if getattr(rig, "skin", None) == "bone_wyrm":
        # the Bone Wyrm's neck banded in rings (vertebrae suit the skeleton) over three pale throat plates
        MW.mail_rows(rig, "n1", (X0, 0, Z0), (X1, 0, Z1), lambda t: r0 + 2.0 - 2.0 * t, SCALE_RING, step=2.8, w=1.0,
                     bulge=0.35, finish="metal")
        MW.mail_rows(rig, "n2", (X1, 0, Z1), (X2, 0, Z2), lambda t: r0 + (r1 - r0) * t, SCALE_RING, step=2.8, w=1.0,
                     bulge=0.35, finish="metal")
        g = Geo()
        for t in (0.2, 0.5, 0.8):
            g.blob((X0 + (X1 - X0) * t + 4.4 * math.sin(A1), -r0 * 0.5, Z0 + (Z1 - Z0) * t - 4.4 * math.cos(A1)),
                   (3.6, 3.4, 1.6), p=2.4, rot=(0, -NECK["ang"][0], 0))
        rig.part("n1", g, BELLY, outline=0.4)
    else:
        # W2 review S1: shingled scales down the neck's back and pale scutes down its throat (no ringed hose)
        _scales(rig, "n1", (X0, Z0), (X1, Z1), r0 + 2.0, r0, toward=-1)
        _scales(rig, "n2", (X1, Z1), (X2, Z2), r0, r1, toward=-1, t1=0.86)
        _scutes(rig, "n1", (X0, Z0), (X1, Z1), r0 + 2.0, r0)
        _scutes(rig, "n2", (X1, Z1), (X2, Z2), r0, r1, t1=0.84)
    for seg, (p0, p1, aa, rr) in enumerate((((X0, Z0), (X1, Z1), A1, r0), ((X1, Z1), (X2, Z2), A2, r1))):
        g = Geo()
        for t in (0.2, 0.55, 0.9):
            cx, cz = p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t
            bx, bz = cx - (rr + 0.5) * math.sin(aa), cz + (rr + 0.5) * math.cos(aa)
            tx, tz = bx - 7.0 * math.sin(aa) - 2.6 * math.cos(aa), bz + 7.0 * math.cos(aa) - 2.6 * math.sin(aa)
            g.slab([(bx - 3.6 * math.cos(aa), bz - 3.6 * math.sin(aa)), (bx + 3.6 * math.cos(aa), bz + 3.6 * math.sin(aa)),
                    (tx, tz)], 0.0, 1.8)
        rig.part(f"n{seg + 1}", g, team=True, outline=0.7)
    g = Geo().lathe([(0, 0), (r1 + 1.8, 0.2), (r1 + 1.8, 3.8), (0, 4.0)], (X2 - 4.4 * math.cos(A2), 0, Z2 - 4.4 * math.sin(A2)),
                    (X2 - 0.4 * math.cos(A2), 0, Z2 - 0.4 * math.sin(A2)), segs=16)
    rig.part("n2", g, team=True, outline=0.6)

    # head: a long snout, horns, a frill, amber eyes with the face kit, an opening jaw
    hx, hz = X2, Z2
    head = Geo().blob((hx + 7.0, 0, hz + 1.0), (12.0, 7.6, 7.0), p=2.3, taper=(1.0, 0.9))
    head.blob((hx + 17.0, 0, hz - 0.6), (6.6, 5.6, 4.4), p=2.3)
    ex, ez = hx + 8.0, hz + 5.0
    eye = Geo().blob((ex, -6.0, ez), (2.8, 1.5, 2.6))
    pup = Geo().blob((ex + 1.0, -6.8, ez), (0.8, 0.9, 2.0))
    fc = F.Face(rig, "nh", [head, eye, pup])
    rig.part("nh", head, SCALE_C)
    rig.part("nh", eye, EYEC, highlight=False)
    rig.joint("pupils", "nh", (ex + 1.0, -6.8, ez))
    rig.part("pupils", pup, "#2A2018", outline=0)
    fc.eye_marks([(ex + 0.4, ez)], 2.7, SCALE_C)
    if getattr(rig, "skin", None) == "bone_wyrm":   # the skull's dark socket round the eye
        g = Geo().blob((ex - 0.2, -5.6, ez), (4.4, 1.4, 3.8), p=2.2)
        rig.part("nh", g, SOCKET, outline=0)
    rig.joint("brow", "nh", (ex, -5.0, ez + 3.0))
    g = Geo().capsule((hx + 5.0, -5.0, ez + 3.0), (hx + 11.0, -4.4, ez + 1.6), 1.3, 0.9)
    rig.part("brow", g, SCALE_DK, outline=0.5)
    g = Geo()
    for dy in (-4.0, 4.0):   # swept-back horns
        g.capsule((hx + 1.0, dy, hz + 6.0), (hx - 9.0, dy * 1.3, hz + 12.0), 2.2, 0.6)
    rig.part("nh", g, CLAW, finish="gloss", outline=0.5)
    g = Geo()
    for i, (dx, dz) in enumerate(((-2.0, 0.0), (-4.0, -4.0), (-3.0, -8.0))):   # team jaw frill spikes
        g.slab([(hx + dx, hz + dz), (hx + dx - 7.0, hz + dz - 1.0), (hx + dx - 1.0, hz + dz - 4.0)], -6.2, 1.4)
    rig.part("nh", g, team=True, outline=0.6)
    g = Geo()
    for dx in (14.0, 18.0, 22.0):
        g.lathe([(1.0, 0), (0, -2.8)], (hx + dx, -4.0, hz - 2.8), segs=6)
    rig.part("nh", g, FANG, outline=0.4)
    g = Geo()
    for dy in (-1.6, 1.6):   # nostrils
        g.blob((hx + 22.4, dy, hz + 1.0), (0.9, 0.7, 0.7), p=2.0)
    rig.part("nh", g, SCALE_DK, outline=0)
    rig.joint("jaw", "nh", (hx + 2.0, 0, hz - 2.4))
    g = Geo().blob((hx + 11.0, 0, hz - 5.0), (10.6, 5.6, 2.6), p=2.3, rot=(0, 6, 0))
    rig.part("jaw", g, SCALE_C)
    g = Geo().blob((hx + 11.0, -0.6, hz - 3.0), (8.8, 4.4, 1.3), p=2.3)
    rig.part("jaw", g, MOUTH, outline=0, highlight=False)
    g = Geo()
    for dx in (12.0, 17.0):
        g.lathe([(0.9, 0), (0, 2.4)], (hx + dx, -3.6, hz - 4.2), segs=6)
    rig.part("jaw", g, FANG, outline=0.4)
    rig.joint("mouth", "nh", (hx + 14.0, 0, hz - 3.0), hidden=True)   # the face kit's mouth slot (unused)
    # the breath: a cone of green fire from the jaws (its own joint, shown only while breathing)
    rig.joint("flame", "nh", (SNOUT[0], 0, SNOUT[2] - 1.0), hidden=True)
    sx, sz = SNOUT[0], SNOUT[2] - 1.0
    # W2 review S1: the gout in three values: a darker rim (the full cone, behind), the mint body inside it and the
    # white core, with lighter streaks along the flow (one flat mint cone read as a plastic funnel)
    prof = [(1.8, 0), (4.6, 8.0), (8.2, 20.0), (10.8, 32.0), (11.4, 38.0), (8.2, 42.0), (0, 43.0)]
    g = Geo().lathe(prof, (sx, 2.5, sz), (sx + 43.0, 2.5, sz - 3.0), segs=18, squash=(1.0, 0.9))
    rig.part("flame", g, glow=FIRE_RIM, outline=0)
    g = Geo().lathe([(r * 0.8, h * 0.95) for r, h in prof], (sx + 0.6, 0.0, sz), (sx + 41.0, 0.0, sz - 2.85), segs=18,
                    squash=(1.0, 0.9))
    rig.part("flame", g, glow=FIRE, outline=0)
    g = Geo().lathe([(1.0, 0), (2.6, 8.0), (5.0, 20.0), (6.0, 30.0), (0, 36.0)], (sx + 1.0, -2.0, sz),
                    (sx + 37.0, -2.0, sz - 2.5), segs=14)
    rig.part("flame", g, glow=FIRE_CORE, outline=0)
    g = Geo()
    for dx, dz, r in ((40.0, 8.0, 4.0), (32.0, -9.0, 3.4), (46.0, -5.0, 3.0)):
        g.sphere((sx + dx, 2.5, sz + dz), r, cuts=2)
    rig.part("flame", g, glow=FIRE_RIM, outline=0)
    g = Geo()
    for dx, dz, r in ((40.0, 6.8, 2.6), (32.0, -7.8, 2.2)):
        g.sphere((sx + dx, 0.0, sz + dz), r, cuts=2)
    rig.part("flame", g, glow=FIRE, outline=0)
    # streaks along the flow on the near side of the mint body: lighter lines and, between them, darker ones (moving
    # fire, not a funnel), and embers flung off the gout's edge
    def streaks(lines):
        g = Geo()
        for v, h0, h1, w in lines:
            pts = []
            for i in range(6):
                h = h0 + (h1 - h0) * i / 5
                rad = 0.8 * (1.8 + (11.2 - 1.8) * min(1.0, h / 34.0))
                pts.append((sx + 0.6 + h, -0.9 * rad * math.sqrt(max(0.0, 1.0 - v * v)) - 0.4,
                            sz - 0.07 * h + v * rad))
            for p, q in zip(pts, pts[1:]):
                g.capsule(p, q, w, w * 0.9, segs=8, rings=2)
        return g
    rig.part("flame", streaks(((0.62, 7.0, 30.0, 0.85), (-0.55, 10.0, 33.0, 0.8), (0.18, 18.0, 38.0, 0.7),
                               (-0.2, 24.0, 39.0, 0.65), (0.84, 16.0, 34.0, 0.6), (-0.82, 20.0, 36.0, 0.6))),
             glow=FIRE_CORE, outline=0)
    rig.part("flame", streaks(((0.4, 12.0, 34.0, 0.55), (-0.38, 15.0, 36.0, 0.55), (0.0, 28.0, 40.0, 0.5),
                               (0.72, 26.0, 38.0, 0.45), (-0.68, 28.0, 39.0, 0.45))), glow=FIRE_RIM, outline=0)
    # W2 S1 (second pass): low-contrast flow bands, a few levels off their ground, laid closely over the white core and
    # the mint body, so the gout has value structure everywhere inside it (wide flat glow held the extras' micro
    # under the beast floor)
    def core_r(h):
        for (h0, r0), (h1, r1) in zip(((0.0, 1.0), (8.0, 2.6), (20.0, 5.0), (30.0, 6.0), (36.0, 0.0)),
                                      ((8.0, 2.6), (20.0, 5.0), (30.0, 6.0), (36.0, 0.0), (99.0, 0.0))):
            if h <= h1:
                return r0 + (r1 - r0) * (h - h0) / (h1 - h0)
        return 0.0

    def core_bands(lines):
        g = Geo()
        for v, h0, h1, w in lines:
            pts = []
            for i in range(7):
                h = h0 + (h1 - h0) * i / 6
                r = core_r(h)
                pts.append((sx + 1.0 + h, -2.0 - r * math.sqrt(max(0.0, 1.0 - v * v)) - 0.3, sz - 0.069 * h + v * r))
            for p, q in zip(pts, pts[1:]):
                g.capsule(p, q, w, w, segs=8, rings=2)
        return g
    rig.part("flame", core_bands(((-0.62, 4.0, 31.0, 0.42), (-0.2, 3.0, 32.0, 0.42), (0.22, 4.0, 31.0, 0.42),
                                  (0.6, 6.0, 30.0, 0.42))), glow=FIRE_BAND_CORE, outline=0)
    rig.part("flame", streaks(((0.74, 6.0, 38.0, 0.42), (-0.72, 8.0, 39.0, 0.42), (0.92, 12.0, 36.0, 0.4),
                               (-0.9, 12.0, 37.0, 0.4), (0.3, 30.0, 42.0, 0.42), (-0.3, 31.0, 42.0, 0.42))),
             glow=FIRE_BAND_LT, outline=0)
    rig.part("flame", streaks(((0.5, 22.0, 41.0, 0.4), (-0.48, 24.0, 41.0, 0.4), (0.06, 33.0, 42.5, 0.4))),
             glow=FIRE_BAND_DK, outline=0)
    g = Geo()
    for dx, dz, r in ((22.0, 13.5, 1.2), (30.0, 15.5, 1.0), (26.0, -13.0, 1.1), (36.0, -14.5, 0.9), (44.0, 11.0, 1.0),
                      (48.0, -9.0, 0.9), (16.0, 10.0, 0.9), (52.0, 2.0, 1.1)):
        g.sphere((sx + dx, -1.0, sz + dz), r, cuts=2)
    rig.part("flame", g, glow=FIRE_CORE, outline=0)
    g = Geo()   # W2: licks of the white core curling out through the gout (the fire reads as flames, not a cone)
    for dx, dz, ang, ln in ((12.0, 3.0, 18.0, 14.0), (20.0, -4.0, -16.0, 13.0), (27.0, 5.5, 24.0, 11.0),
                            (33.0, -6.0, -22.0, 10.0)):
        a = math.radians(ang)
        g.lathe([(1.6, 0), (2.2, ln * 0.35), (0, ln)], (sx + dx, -3.0, sz + dz),
                (sx + dx + math.cos(a), -3.0, sz + dz + math.sin(a)), segs=10)
    rig.part("flame", g, glow=FIRE_CORE, outline=0)
    rig.joint("smoke", "nh", (hx + 22.0, 0, hz + 2.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((2.0, 3.0, 2.4), (5.0, 7.0, 3.0), (3.0, 11.0, 3.4)):
        g.sphere((hx + 22.0 + dx, -1.0, hz + 2.0 + dz), r, cuts=2)
    rig.part("smoke", g, SMOKE, outline=0.4)
    rig.track("breath", "nh", FLAME_TIP)
    rig.rest_scale["nh"] = 1.45


def _leg(rig, name, x, y):
    col = SCALE_C if y < 0 else SCALE_DK
    rig.joint(name, "trunk", (x, y, 22.0))
    rig.joint(f"{name}2", name, (x + 2.0, y, 11.0))
    g = Geo().capsule((x, y, 24.0), (x + 2.0, y, 11.0), 6.6, 5.4)
    rig.part(name, g, col)
    g = Geo().capsule((x + 2.0, y, 11.0), (x + 3.0, y, 4.0), 5.4, 4.4)
    g.blob((x + 5.0, y, 2.4), (7.2, 5.4, 2.6), p=2.6)
    rig.part(f"{name}2", g, col)
    g = Geo()
    for dy in (-3.4, 0.0, 3.4):
        g.lathe([(1.4, 0), (0, 3.4)], (x + 11.0, y + dy, 1.6), (x + 14.0, y + dy, 1.0), segs=6)
    rig.part(f"{name}2", g, CLAW, outline=0.4)
    g = Geo().capsule((x + 0.4, y, 21.0), (x + 1.6, y, 14.0), 7.2, 6.2)   # team leg wraps (war harness)
    rig.part(name, g, team=True, outline=0.6)


RIG = None
LEGS = {}


def _leg_ik(name, x, y):
    LEGS[name[4:]] = G.Leg(name, f"{name}2", (x + 5.0, y, 0.3), bend=1.0 if name[4] == "f" else -1.0)
    RIG.track(f"_foot_{name[4:]}", f"{name}2", (x + 5.0, y, 0.3))


def build(rig):
    global RIG
    RIG = rig
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("trunk", "body", (0, 0, 28))
    rig.rest_scale["body"] = BODY_SCALE
    for name, x, y in (("leg_fl", 18.0, 12.0), ("leg_bl", -22.0, 12.0)):
        _leg(rig, name, x, y)
        _leg_ik(name, x, y)
    # a long tail (three segments) with a team fin
    rig.joint("tail1", "trunk", (-32.0, 0, 30.0))
    rig.joint("tail2", "tail1", (-54.0, 0, 22.0))
    rig.joint("tail3", "tail2", (-74.0, 0, 12.0))
    rig.part("tail1", Geo().capsule((-32.0, 0, 30.0), (-54.0, 0, 22.0), 11.0, 7.8), SCALE_C)
    rig.part("tail2", Geo().capsule((-54.0, 0, 22.0), (-74.0, 0, 12.0), 7.8, 4.8), SCALE_C)
    if getattr(rig, "skin", None) == "bone_wyrm":   # the Bone Wyrm's tail banded in rings (vertebrae)
        MW.mail_rows(rig, "tail1", (-36.0, 0, 28.5), (-54.0, 0, 22.0), lambda t: 10.6 - 2.8 * t, SCALE_RING, step=2.9,
                     w=1.0, bulge=0.35, finish="metal")
        MW.mail_rows(rig, "tail2", (-54.0, 0, 22.0), (-72.0, 0, 13.0), lambda t: 7.8 - 3.0 * t, SCALE_RING, step=2.9,
                     w=0.9, bulge=0.3, finish="metal")
    else:   # W2 review S1: shingled scales out along the tail's top
        _scales(rig, "tail1", (-32.0, 30.0), (-54.0, 22.0), 11.0, 7.8, toward=1, t0=0.14)
        _scales(rig, "tail2", (-54.0, 22.0), (-74.0, 12.0), 7.8, 4.8, toward=1, length=3.8, r=1.5, step=2.7)
    rig.part("tail3", Geo().capsule((-74.0, 0, 12.0), (-92.0, 0, 7.0), 4.8, 2.0), SCALE_C)
    g = Geo().slab([(-86.0, 8.0), (-100.0, 17.0), (-96.0, 6.0), (-101.0, -3.0)], 0.0, 1.6)
    rig.part("tail3", g, team=True, outline=0.7)
    g = Geo()
    for x, z in ((-44.0, 32.0), (-62.0, 24.0)):   # tail spine frills
        g.slab([(x - 4.0, z), (x + 4.0, z + 1.0), (x - 1.0, z + 8.0)], 0.0, 1.6)
    rig.part("tail1", g, team=True, outline=0.6)
    # a long, low body, a ridged pale belly, team back frills
    g = Geo().blob((-2.0, 0, 34.0), (38.0, 19.0, 16.0), p=2.3)
    g.blob((16.0, 0, 38.0), (16.0, 17.0, 14.0), p=2.2)
    gb = Geo().blob((2.0, -4.0, 23.0), (32.0, 15.0, 6.4), p=2.4)
    bodyface = F.Face(rig, "trunk", [g, gb])     # W2: the flank's surface, to lay plates and ribs on
    rig.part("trunk", g, SCALE_C)
    rig.part("trunk", gb, BELLY, outline=0.6)
    g = Geo()
    for x in range(-30, 31, 4):   # W2 review S1: the belly's ridges twice as close (the reared frames show it)
        g.capsule((float(x), -15.6, 20.0), (float(x) + 1.0, -16.4, 25.0), 0.7)
    rig.part("trunk", g, RIDGE, outline=0)
    g = Geo()
    for x, z in ((-16.0, 40.0), (-4.0, 44.0), (8.0, 42.0), (-10.0, 30.0), (2.0, 32.0), (-26.0, 34.0)):
        g.blob((x, -17.8, z), (3.0, 1.0, 2.2), p=2.4)
    rig.part("trunk", g, SCALE_DK, outline=0)
    g = Geo()   # W2: rows of lighter plates over the haunch behind the caparison (staggered, overlapping)
    for row, z in enumerate((42.0, 37.5, 33.0, 28.5)):
        for x in (-38.0, -33.0):
            c = bodyface.hit(x + (2.5 if row % 2 else 0.0), z)
            g.blob((c.x, c.y, c.z), (2.6, 1.3, 2.0), p=2.3)
    rig.part("trunk", g, SCALE_LT, outline=0)

    if getattr(rig, "skin", None) == "bone_wyrm":   # dark rib bands down the flank, the skeleton showing through
        g = Geo()
        for x in (-20.0, -12.0, -4.0, 4.0, 12.0):
            a, b = bodyface.hit(x, 29.0), bodyface.hit(x - 2.4, 20.5)
            g.capsule((a.x, a.y, a.z), (b.x, b.y, b.z), 1.3, 1.0, segs=10, rings=2)
        rig.part("trunk", g, SOCKET, outline=0)
    # a team war caparison over the shoulders with a parchment paw and a fringe
    cap = Geo().blob((0.0, 0, 44.0), (30.0, 20.6, 14.0), p=3.0)
    cap.clip((0, 0, 30.0), (0, 0, -1))
    cap.clip((-28.0, 0, 0), (-1, 0, 0))
    cface = F.Face(rig, "trunk", [cap])
    rig.part("trunk", cap, team=True)
    g = MW.paw(cface, Geo(), K.scr(cface, (4.0, -20.0, 40.0)), s=2.0)    # W2: the paw whole
    rig.part("trunk", g, PARCH, highlight=False, outline=0)
    # W2: the caparison in two tones: a team-dark border above its fringe
    MW.seam(rig, "trunk", cface, [K.scr(cface, (x, -20.6, 32.6 + 0.004 * x * x)) for x in range(-26, 27, 4)], w=2.8,
            team=True)
    # its rear third team-dark (per pale) and folds hanging down it (drapery: the big field reads as cloth)
    MW.panel(rig, "trunk", cface, [K.scr(cface, (x, -20.6, z)) for x, z in ((-12.0, 54.0), (-12.0, 34.0), (-27.0, 35.0),
                                                                           (-27.0, 50.0))], depth=0.3)
    MW.folds(rig, "trunk", cface, [[K.scr(cface, (x, -20.6, 54.0 - 0.12 * abs(x))), K.scr(cface, (x + 0.6, -20.6, 35.0))]
                                   for x in (-20.0, -6.0, 16.0, 24.0)], w=1.4)
    # W2 review S1: the caparison's front quilted in team-dark diamonds (its big field read as glossy plastic)
    (qx0, qz0), (qx1, qz1) = K.scr(cface, (-10.0, -20.6, 35.6)), K.scr(cface, (27.0, -20.6, 55.0))
    MW.folds(rig, "trunk", cface, MW.lattice(qx0, qx1, qz0, qz1, 6.5), w=0.9)
    g = Geo()
    for x in range(-26, 26, 5):
        g.lathe([(1.6, 0), (2.0, -1.8), (0, -4.6)], (x, -20.6, 30.2), segs=8)
    rig.part("trunk", g, PARCH, outline=0.4)
    g = Geo()
    for i, x in enumerate((-30.0, -20.0)):   # back frills behind the caparison
        z = 50.0 - (i * 2.0)
        g.slab([(x - 5.0, z - 1.0), (x + 5.0, z), (x - 2.0, z + 10.0)], 0.0, 2.0)
    look.team_part(rig, "trunk", g, outline=0.8)     # W2: team-dark (the harness's team in two tones)
    _neck(rig)
    for name, x, y in (("leg_fr", 18.0, -12.0), ("leg_br", -22.0, -12.0)):
        _leg(rig, name, x, y)
        _leg_ik(name, x, y)
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry
        _damage_spots(rig)


SPOTS = {"caparison": (-14.0, 50.0), "neck": (30.0, 80.0), "fin": (-121.0, 14.0), "hem": (10.0, 38.0)}   # screen lu


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, beast; the body x 1.25, the head x 1.45): the caparison behind its paw
    (its largest team field, r 9), the neck's scales, the tail fin, a strip torn from the caparison's fringe, smoke
    curling from the nostrils (breath) and a smoke emitter on the back behind the caparison, so the smoke rises clear
    of the body against the sky (the W2 review's nit: low on the haunch it read as a faint smudge by the leg)."""
    rig.damage_spot_at("caparison", "trunk", *SPOTS["caparison"], 9.0, "cloth", team=True)
    rig.damage_spot_at("neck", "n1", *SPOTS["neck"], 6.0, "hide")
    rig.damage_spot_at("fin", "tail3", *SPOTS["fin"], 5.0, "cloth", team=True)
    rig.damage_spot_at("hem", "trunk", *SPOTS["hem"], 10.0, "cloth", kind="strip", team=True)
    rig.damage_spot("breath", "nh", (X2 + 22.4, -1.6, Z2 + 1.6), 4.0, "breath", kind="emit", normal=(1, 0, 0))
    rig.damage_spot("smoke", "trunk", (-31.0, -4.0, 47.0), 7.0, "smoke", kind="emit", normal=(0, 0, 1))


# -- poses ---------------------------------------------------------------------------------
def head(s1=0.0, s2=0.0, h=0.0, jaw=0.0):
    return {"n1": {"r": s1}, "n2": {"r": s2}, "nh": {"r": h}, "jaw": {"r": -jaw}}


def fire(show=True, s=1.0, r=0.0):
    return {"flame": {"show": show, "s": s, "r": r}}


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    ph = 2 * math.pi * f / n
    pose = merge({"trunk": {"z": -1.0 * c}, "body": squash(-0.015 * c)},
                 head(4 * math.sin(ph), 6 * math.sin(ph - 0.8), -5 * math.sin(ph - 1.4), jaw=5 if f == 3 else 0),
                 {"tail2": {"r": 6 * math.sin(ph)}, "tail3": {"r": 10 * math.sin(ph - 1)},
                  "smoke": {"show": f in (1, 2), "z": 2.0 * (f - 1)}})
    if f == 4:
        pose = merge(pose, F.expr("blink", mouth=None))
    return pose


SPEED = 62.5
GAIT = None


def _gait():
    global GAIT
    if GAIT is None:
        GAIT = G.Gait(8, 800, SPEED, G.quad_feet(LEGS, G.TROT, scale=BODY_SCALE,
                                                 x_off={"fr": 1.0, "fl": 1.0, "br": -1.0, "bl": -1.0}),
                      0.5, lift=7.0, kick=2.0, reach=2.0, toe_off=0.0, heel_strike=0.0)
    return GAIT


def _walk(f, report=None):
    g = _gait()

    def extra(ctx):
        p = ctx["p"]
        s_, c = math.sin(p), math.cos(p)
        return merge({
            "tail1": {"rz": -8 * s_}, "tail2": {"rz": -12 * math.sin(p - 0.8), "r": 4 * c},
            "tail3": {"rz": -16 * math.sin(p - 1.6), "r": 8 * math.sin(p - 1.0)},
            "trunk": {"rz": 3 * s_},
        }, head(4 * math.sin(p), 6 * math.sin(p - 0.7), -5 * math.sin(p - 1.3)))
    return G.quad_walk(RIG, f, g, {}, base_z=-2.0, bob=2.2, beats=2, pitch=1.2, roll=3.0,
                       extra=extra, report=report)


# attack: moves.HEAVY_MELEE_MS (1230 ms, impact at step 6); 10 unique poses on 12 steps
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#       shift  draw  rear  HOLD lunge lunge BREATH sweep fade settle  (neck1, neck2, head, jaw)
A_HEAD = [(2, 2, 0, 0), (10, 12, -6, 6), (10, 26, -14, 14), (12, 42, -26, 22), (4, 10, -6, 30), (-8, -12, 6, 34),
          (-16, -20, 10, 36), (-20, -24, 12, 34), (-10, -12, 6, 16), (-2, -2, 0, 2)]
# the gout's scale per frame (W2 review S1: its peak 1.3-1.35 cut to 1.15-1.18, so the fire ends near the `breath`
# tracker where the hit lands, and the flat green field no longer holds the extras' means under the floors)
A_FIRE = [None, None, None, None, (0.5, 0), (1.0, 0), (1.15, 7), (1.12, 15), (0.9, 6), None]
A_R = [0.0, 0.5, 1.0, 1.0, 0.5, -2.0, -4.0, -4.0, -2.0, 0.0]
A_X = [0.0, -1.0, -2.5, -3.5, 0.0, 3.0, 5.0, 5.0, 2.0, 0.0]
A_Q = [-0.01, 0.02, 0.04, 0.06, 0.02, -0.03, -0.06, -0.04, -0.02, 0.0]


def _pose(tbl, firetbl, rr, xx, qq, f, z=None, rear=None):
    s1, s2, h, jaw = tbl[f]
    pose = merge(M.body_about((0, 0, 30), x=xx[f], z=(z[f] if z else 0.0), q=qq[f]), {"trunk": {"r": rr[f]}},
                 head(s1, s2, h, jaw),
                 {"tail2": {"r": [0, 4, 8, 10, 0, -6, -10, -8, -2, 0][f]},
                  "tail3": {"r": [0, 8, 12, 16, 0, -10, -16, -12, -4, 0][f]}})
    if rear:
        pose = merge(pose, M.body_about((-22.0 * BODY_SCALE, 0, 0), r=rear[f]),
                     {"leg_fr": {"r": 1.4 * rear[f]}, "leg_fl": {"r": 1.4 * rear[f]},
                      "leg_fr2": {"r": -1.6 * rear[f]}, "leg_fl2": {"r": -1.6 * rear[f]}})
    fr = firetbl[f]
    if fr:
        pose = merge(pose, fire(True, fr[0], fr[1]))
    if f in (2, 3):
        pose = merge(pose, {"brow": {"z": -1.0}}, F.expr("squeeze", mouth=None))
    if f == 3:
        pose = merge(pose, {"n1": {"sx": 1.08, "sz": 1.08}, "smoke": {"show": True}})
    return pose


def _attack_pose(f):
    return _pose(A_HEAD, A_FIRE, A_R, A_X, A_Q, f)


def _ov(tip=FLAME_TIP):
    return {
        4: [{"kind": "streak", "joint": "nh", "point": SNOUT, "color": SCALE_LT, "width_lu": 10.0, "white": 0.3,
             "from": 3, "t1": 0.95}],
        6: [{"kind": "burst", "joint": "nh", "point": tip, "r0_lu": 8.0, "r1_lu": 16.0, "n": 6, "a0": -80.0,
             "arc": 160.0, "color": "#E8FFE6"},
            {"kind": "dust", "ground": (90.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 161, "spread": 1.4}],
    }


def _attack_clip():
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS, impact=6, smear=4,
                  sequence=ATTACK_SEQ, overlays=_ov())


# attack B: low sweep. 1 sink, 2 coil, 3 HOLD (the head low along the ground, the body crouched), 4-5 the
# sweep starts, 6 BREATH (fire swept up and across), 7 sweep, 8-9 = A
B_HEAD = [(2, 2, 0, 0), (-14, -10, 6, 4), (-26, -20, 12, 8), (-34, -28, 18, 14), (-26, -18, 12, 26), (-16, -8, 4, 32),
          (-8, 0, -2, 36), (-2, 4, -6, 34), (-10, -12, 6, 16), (-2, -2, 0, 2)]
B_FIRE = [None, None, None, None, (0.5, 12), (1.0, 8), (1.15, 2), (1.18, -6), (0.9, -14), None]
B_R = [0.0, -2.0, -4.0, -5.0, -3.0, -1.0, 1.0, 1.0, -2.0, 0.0]
B_X = [0.0, 1.0, 0.0, -1.0, 1.0, 3.0, 5.0, 5.0, 2.0, 0.0]
B_Z = [0.0, -1.5, -3.0, -4.0, -3.0, -1.5, 0.0, 0.0, 0.0, 0.0]
B_Q = [-0.01, -0.02, -0.04, -0.05, 0.02, 0.03, -0.05, -0.03, -0.02, 0.0]


def _b_pose(f):
    if f == 0 or f >= 8:
        return _attack_pose(f)
    return _pose(B_HEAD, B_FIRE, B_R, B_X, B_Q, f, z=B_Z)


# attack C: reared pour. 1 lift, 2 rear, 3 HOLD (reared up on the hind legs, head high and back), 4-5 the
# head drops, 6 BREATH (fire poured down in front), 7 pour, 8-9 = A
C_HEAD = [(2, 2, 0, 0), (6, 8, -4, 4), (12, 16, -8, 10), (16, 22, -10, 16), (0, -6, 10, 28), (-14, -20, 22, 34),
          (-22, -28, 30, 36), (-24, -30, 32, 34), (-10, -12, 6, 16), (-2, -2, 0, 2)]
C_FIRE = [None, None, None, None, (0.5, 0), (1.0, -4), (1.15, -8), (1.18, -14), (0.9, -18), None]
C_REAR = [0.0, 6.0, 14.0, 18.0, 12.0, 4.0, 0.0, 0.0, 0.0, 0.0]
C_X = [0.0, -1.0, -2.0, -3.0, 0.0, 3.0, 5.0, 5.0, 2.0, 0.0]
C_Q = [-0.01, 0.02, 0.03, 0.04, 0.02, -0.03, -0.07, -0.04, -0.02, 0.0]
C_R = [0.0] * 10


def _c_pose(f):
    if f == 0 or f >= 8:
        return _attack_pose(f)
    return _pose(C_HEAD, C_FIRE, C_R, C_X, C_Q, f, rear=C_REAR)


def _variant(name, fn):
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip(name, [fn(i) for i in range(10)], M.HEAVY_MELEE_MS, impact=6, smear=4, sequence=ATTACK_SEQ,
                  overlays=_ov(), reuse=reuse)


def _hit(k):
    def recoil(a, shake):
        pose = {"body": dict(squash(-0.05 * max(a, 0)), x=-4.0 * max(a, 0) + 1.0 * min(a, 0)),
                "trunk": {"r": 3 * a}, "tail2": {"r": 8 * a}}
        pose = merge(pose, head(10 * a, 8 * a, -6 * a + 8 * shake, jaw=10 * max(a, 0)), {"nh": {"rx": 10 * shake}})
        return pose
    return M.hit_beast(k, {}, recoil, face_hurt=F.expr("squeeze", mouth=None))


DIE_KEEP = [0, 1, 2, 4, 5, 7, 8, 9]


def _die(k):
    droop = [0.0, 0.3, 0.6, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0][k]
    sink = [0.0, 0.2, 0.5, 0.8, 1.0, 0.92, 1.0, 1.0, 1.0, 1.0][k]
    pose = M.body_about((0, 0, 30), x=-2.0 * sink, z=-12.0 * sink,
                        q=[-0.06, 0.04, 0.02, -0.08, -0.12, 0.04, -0.06, -0.03, -0.05, -0.08][k],
                        s=[1, 1, 1, 1, 1, 1, 1, 1, 0.97, 0.92][k])
    pose = merge(pose, head(-70 * droop, 40 * droop, 36 * droop, jaw=14 * droop),
                 {"tail2": {"r": -8 * sink}, "tail3": {"r": -10 * sink},
                  "leg_fr": {"r": 50 * sink}, "leg_fr2": {"r": -30 * sink},
                  "leg_fl": {"r": 46 * sink}, "leg_fl2": {"r": -28 * sink},
                  "leg_br": {"r": -50 * sink}, "leg_br2": {"r": 30 * sink},
                  "leg_bl": {"r": -46 * sink}, "leg_bl2": {"r": 28 * sink},
                  "smoke": {"show": 2 <= k <= 6}})
    if k >= 4:
        pose = merge(pose, F.expr("x", mouth=None))
    elif k <= 1:
        pose = merge(pose, F.expr("squeeze", mouth=None))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)],
               [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.walk_clip("walk", RIG, _walk, _gait(), "quad"),
        _attack_clip(),
        _variant("attack_b", _b_pose),
        _variant("attack_c", _c_pose),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(DIE_KEEP[i]) for i in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
