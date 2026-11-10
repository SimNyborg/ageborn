"""Gyrocopter: Modern Age air gunship (DESIGN A5.5). Bullet (proj.bullet), 150 lu, air mech.

Look (A11 flyer rig, Modern palette): a round, bubbly autogyro. A team-painted egg-shaped pod (a
cream chevron, a rivet row) with an olive belly and nose cone, a signal nose band, an open cockpit
with a windscreen and a goggled pilot (a round face with the face kit, a leather cap with ear flaps)
whose signal scarf streams behind him (follow-through), twin gunmetal machine guns under the chin
with an ammo box, a thin tail boom with a team fin and a tailplane, khaki skids on struts, and a
two-blade rotor on a mast whose blades strobe round in four phase steps. Flyers are authored with the origin at their lowest point
(the skids); the battle view lifts air units to their flight altitude.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    hover: a bob and a gentle pitch, the rotor spinning, the scarf and the pilot's head
          lagging, a blink
  walk    forward flight: nose down, the rotor tilted into the wind, a porpoising bob
  attack  STRAFING DIP: the nose dips onto the target (the pilot squints), both guns fire together
          (one flash per gun on the shot frame, impact lines), the recoil bumps the pod back, two
          brass casings tumble out under the guns and it bounces back level. The bullets leave
          the per-frame `muzzle` anchor on the fire frame; the clip repeats for the rapid fire.
  hit     flyer: a tilt and a 4 lu drop, the pilot's eyes squeezed, then a wobble back up
  die     D8 spiral down: smoke pours out, the rotor slows and tilts, the gyrocopter noses over and
          spins down with the pilot's spiral eyes, a crash bounce

Animation standard (ANIM_SPEC 2026-10-02, G8 fly):
  rotor     never static: one blade shape steps round 45 degrees a frame over three alternating
            pale blur arcs (the spinning disc), in every clip
  walk      forward flight at the ground speed (80 x 1.25 = 100 lu/s): nose down 7 degrees, the rotor
            tilted into the wind, the scarf streaming; the game adds the hover bob (R8)
  attack    A as above; the dip is split into the hold and a wobble frame (holdLoop: the sim
            wind-up is 2.5x the authored one)
  attack_b  BANKED SHOT: it rolls toward the camera (the rotor disc and the belly show, the held
            extreme, holdLoop), fires both guns from the bank, the recoil rocks it and it rolls level

Art round W3 (the detail standard): both strafes aimed down at the ground row (`attack_down`, `attack_b_down`,
item 44: the code pitches the gyrocopter at most 15 degrees, which left it 15-18 short of a ground target), damage
spots and the smoke place (item 40), and the Shark Mouth skin (item 46).
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import face as F
from ageborn_art import kit_bronze_detail as KD
from ageborn_art import kit_modern as KM
from ageborn_art import look
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from units import modern_w3 as MW

SLUG = "gyrocopter"
GAIT_NAME = "fly"
NAME = "Gyrocopter"
HEIGHT_LU = 66
YAW_DEG = -10.0
CANVAS = (340, 320)
FEET = (170, 250)
ANCHORS = {"head": (0, 62), "hitCenter": (0, 26)}
NO_RETIME = True

POD = (2.0, 0.0, 24.0)
MAST = (-4.0, 0.0, 60.0)
ROTOR_R = 44.0
PHASES = 4                  # 2 blades: 180 degrees of symmetry in 4 steps of 45
MUZZLE = (33.0, -3.0, 11.0)
SCARF = "#B0306A"
BRASS = "#C8B27A"
FIN = [(-38, POD[2] + 4), (-47, POD[2] + 6), (-51, POD[2] + 21), (-45, POD[2] + 22), (-40, POD[2] + 10)]
EGG = ((POD[0], 0, POD[2]), (20.0, 13.0, 13.5))       # the team pod (p 2.2, taper (0.9, 1.0))

# the detail standard (art round W3, ageborn_art/look.py): the lifts and the model detail of audit 5.1 / 5.2.
# What a player sees of a Gyrocopter is the round team pod, the olive nose and tail boom, the pilot with his
# scarf and the rotor: the pod in two tones (a team-dark band above the olive belly, a team panel seam), bigger
# rivets, the fin's team-dark rudder, worn chips on the olive nose and boom. A flyer reads against the sky by its
# outline and a lit top (SHADE_MACHINE's top light).
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = MW.HIGHLIGHT_MACHINE
LOOK_SHADE = MW.SHADE_MACHINE
MATERIAL_KINDS = MW.kinds({R.OLIVE: "iron", R.OLIVE_LT: "iron", MW.CHIP: "iron", R.GUNMETAL: "iron",
                           R.STEEL: "iron", R.KHAKI: "cloth", R.KHAKI_LT: "cloth", R.LEATHER: "leather",
                           R.GLASS: "glass", R.SIGNAL: "polymer", SCARF: "cloth", KM.CREAM: "polymer",
                           BRASS: "bronze", R.SKIN: "skin", R.HAIR: "fur", "team": "iron"})

# Shark Mouth (DESIGN A5.8, epic: "painted nose art"): the same gyrocopter with a shark's grin painted round the
# olive nose and the chin, rows of white teeth, a fierce eye above it on the nose (W3: all of it on the olive nose, which
# keeps the team pod whole). The pod, the fin and the pilot stay as they are.
MOUTH = "#4A3234"         # the painted mouth (desaturated, A11 colour rule)
TEETH = "#EEEAE0"
EYE_DK = "#222225"
SKINS = {"shark_mouth": {"palette": {}, "kinds": MW.kinds({MOUTH: "polymer", TEETH: "polymer", EYE_DK: "polymer"})}}


def _blade(g, ang, mx, mz, w=3.2, t=0.9, r0=0.0, r1=ROTOR_R):
    for sgn in (1, -1):
        a = math.radians(ang)
        c = (r0 + r1) / 2
        g.blob((mx + sgn * c * math.cos(a), sgn * c * math.sin(a), mz + 2.0), ((r1 - r0) / 2, w, t), p=2.6,
               rot=(0, 0, ang))


BLUR = 3                    # alternating rotor blur arcs


def _blur(g, k, mx, mz):
    """Pale speed arcs in the rotor plane, fore and aft of the mast (they read as the spinning disc
    at 1x without covering the pilot); variant k shifts which arcs are drawn."""
    for ci, c in enumerate((0.0, 180.0)):
        for ri, r in enumerate((18.0, 29.0, 40.0)):
            if (ri + ci + k) % 3 == 2:
                continue
            span = 52.0 + 8.0 * ri
            off = 10.0 * (k - 1) * (1 if ci == 0 else -1)
            pts = []
            for j in range(7):
                a = math.radians(c + off - span / 2 + span * j / 6)
                pts.append((mx + r * math.cos(a), r * math.sin(a), mz + 2.0))
            for a, b in zip(pts, pts[1:]):
                g.capsule(a, b, 1.7 + 0.3 * ri, segs=6, rings=2)


def _nose_ref():
    px, py, pz = POD
    return Geo().lathe([(0, 0), (7.4, 0.5), (8.0, 3.0), (6.0, 6.5), (0, 8.4)], (px + 17.0, 0, pz - 1.0),
                       (px + 27.0, 0, pz - 1.0), segs=18)


def _egg_ref():
    return Geo().blob(*EGG, p=2.2, taper=(0.9, 1.0))


def _shark(rig):
    """The Shark Mouth's nose art: a grin round the nose and the chin (dark mouth, white teeth on both lips) and a
    fierce eye on the nose, laid as small decals so they follow the curve.

    W3 review 2 (it read only up close, the 1x Gyrocopter lost it): a bigger grin, a crescent that opens at the nose
    tip and fills the lower front of the nose (5.5 lu open, the chin under it is behind the guns) to a corner curling
    up at the nose ring, with two big fangs on each lip (3.6 lu, staggered) and a bigger eye, so the dark wedge and
    its white zigzag read at 1x; all of it stays on the olive nose (the team pod and its band untouched)."""
    px, py, pz = POD
    fc = F.Face(rig, "pod", [_egg_ref(), _nose_ref()])
    mouth, teeth = Geo(), Geo()
    # the lips in the side view (x, z), from the nose tip back to the mouth's corner
    upper = [(26.6, -0.6), (25.0, -1.4), (23.0, -2.0), (21.0, -2.2), (19.5, -1.6), (18.2, -0.2)]
    lower = [(26.6, -2.4), (25.0, -4.6), (23.0, -6.8), (21.0, -7.6), (19.5, -6.4), (18.2, -0.6)]
    up = [(px + x, pz + z) for x, z in upper]
    lo = [(px + x, pz + z) for x, z in lower]
    for (ux0, uz0), (ux1, uz1), (lx0, lz0), (lx1, lz1) in zip(up, up[1:], lo, lo[1:]):
        mx, mz = (ux0 + ux1 + lx0 + lx1) / 4, (uz0 + uz1 + lz0 + lz1) / 4
        poly = [(lx0 - mx + 0.15, lz0 - mz - 0.3), (lx1 - mx - 0.15, lz1 - mz - 0.3), (ux1 - mx - 0.15, uz1 - mz + 0.3),
                (ux0 - mx + 0.15, uz0 - mz + 0.3)]
        fc.decal(mouth, fc.hit(mx, mz), poly, 0.6)
    rig.part("pod", mouth, MOUTH, outline=0.5, highlight=False)

    def lip(pts, x):
        for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
            if x1 <= x <= x0:
                return z0 + (z1 - z0) * (x - x0) / (x1 - x0)
        return pts[-1][1]
    for x in (px + 24.4, px + 21.0):      # two big fangs hang from the upper lip
        z = lip(up, x)
        fc.decal(teeth, fc.hit(x, z - 1.3), [(-1.8, 1.4), (1.8, 1.4), (0.0, -1.7)], 0.9)
    for x in (px + 22.8, px + 19.6):      # two point up from the lower lip, between them
        z = lip(lo, x)
        fc.decal(teeth, fc.hit(x, z + 1.3), [(-1.8, -1.4), (1.8, -1.4), (0.0, 1.7)], 0.9)
    rig.part("pod", teeth, TEETH, outline=0, highlight=False)
    g = Geo()
    fc.decal(g, fc.hit(px + 21.0, pz + 2.6), F.ellipse(0, 0, 3.2, 2.4, 16), 0.7)    # the eye, on the nose
    rig.part("pod", g, TEETH, outline=0.5, highlight=False)
    g = Geo()
    fc.decal(g, fc.hit(px + 22.0, pz + 2.4), F.ellipse(0, 0, 1.5, 1.6, 12), 1.1)    # its pupil
    fc.stroke(g, fc.hit(px + 20.8, pz + 5.6), [(-3.2, 1.1), (3.0, -0.8)], 1.2, 1.1)  # a fierce brow
    rig.part("pod", g, EYE_DK, outline=0, highlight=False)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("pod", "body", POD)
    px, py, pz = POD
    # tail boom and fin (behind the pod)
    g = Geo().capsule((-14.0, 0, pz + 2.0), (-44.0, 0, pz + 6.0), 3.0, 1.8)
    rig.part("pod", g, R.OLIVE)
    g = Geo().slab(FIN, 0.0, 2.2)
    rig.part("pod", g, team=True, outline=0.8)
    # W3: the rudder team-dark (the fin in two tones)
    g = Geo().slab([(-44.4, pz + 5.6), (-47.0, pz + 6.0), (-51.0, pz + 21.0), (-48.2, pz + 21.5)], -1.25, 0.3)
    look.team_part(rig, "pod", g)
    g = Geo().blob((-45.0, 0, pz + 6.0), (5.0, 9.0, 1.2), p=2.6)   # tailplane
    rig.part("pod", g, R.OLIVE_LT, outline=0.7)
    g = Geo()
    for x in (-22.0, -30.0, -38.0):
        g.lathe([(3.0 - 0.02 * (-x), -0.5), (3.1 - 0.02 * (-x), 0), (3.0 - 0.02 * (-x), 0.5)],
                (x, 0, pz + 2.0 + (x + 14.0) / -30.0 * 4.0), (x - 1.0, 0, pz + 2.0 + (x + 13.0) / -30.0 * 4.0),
                segs=12)
    rig.part("pod", g, R.GUNMETAL, finish="metal", outline=0)
    # W3: worn chips on the olive boom
    boom = Geo().capsule((-14.0, 0, pz + 2.0), (-44.0, 0, pz + 6.0), 3.0, 1.8)
    MW.decals(rig, "pod", [boom], [((-18.5, pz + 3.4), MW.CHIP_B), ((-33.5, pz + 5.0), MW.CHIP_C)], MW.CHIP)
    # skids and struts
    g = Geo()
    for y in (-7.5, 7.5):
        g.capsule((-12.0, y, 1.6), (15.0, y, 1.6), 1.6)
        g.capsule((15.0, y, 1.6), (19.0, y, 4.2), 1.5)
        g.capsule((-6.0, y * 0.8, 2.0), (-3.0, y * 0.6, 12.0), 1.2)
        g.capsule((8.0, y * 0.8, 2.0), (6.0, y * 0.6, 12.0), 1.2)
    rig.part("pod", g, R.KHAKI, outline=0.8)
    # the pod: team egg with an olive belly and nose cone
    egg = Geo().blob((px, 0, pz), (20.0, 13.0, 13.5), p=2.2, taper=(0.9, 1.0))
    egg.clip((0, 0, pz - 6.0), (0, 0, -1))
    eface = F.Face(rig, "pod", [egg])
    rig.part("pod", egg, team=True)
    # W3: the pod in two tones: a team-dark band above the olive belly and a team panel seam behind the screen
    look.team_part(rig, "pod", KD.band_z(*EGG, pz - 6.0, pz - 2.8, p=2.2, taper=(0.9, 1.0), grow=0.3))
    MW.team_line(rig, "pod", _egg_ref(), [(px + 8.6, pz - 2.4), (px + 9.4, pz + 4.0), (px + 8.8, pz + 10.0)], 1.0)
    g = KM.chevron(eface, Geo(), (px - 6.0, pz + 2.0), s=1.0, n=2, w=1.8, gap=2.8)
    rig.part("pod", g, KM.CREAM, highlight=False, outline=0)
    g = Geo()   # W3: the rivets 2.5 lu (they read at game scale)
    for a in range(-150, -20, 18):
        t = math.radians(a)
        g.sphere((px + 18.6 * math.cos(t) * 0.98, 12.2 * math.sin(t) * 0.98, pz - 4.0), 1.25, cuts=2)
    rig.part("pod", g, R.OLIVE_LT, finish="metal", outline=0.3)
    g = Geo().blob((px, 0, pz), (20.0, 13.0, 13.5), p=2.2, taper=(0.9, 1.0))
    g.clip((0, 0, pz - 6.0), (0, 0, 1))
    g.lathe([(0, 0), (7.4, 0.5), (8.0, 3.0), (6.0, 6.5), (0, 8.4)], (px + 17.0, 0, pz - 1.0),
            (px + 27.0, 0, pz - 1.0), segs=18)   # nose cone
    rig.part("pod", g, R.OLIVE)
    g = Geo().lathe([(8.2, -0.9), (8.4, 0), (8.2, 0.9)], (px + 17.0, 0, pz - 1.0), (px + 18.0, 0, pz - 1.0), segs=18)
    rig.part("pod", g, R.SIGNAL, outline=0.5)
    if getattr(rig, "skin", None) == "shark_mouth":
        _shark(rig)
    else:   # W3: worn chips on the olive nose (the Shark Mouth's grin paints over them)
        MW.decals(rig, "pod", [_nose_ref()], [((px + 22.6, pz + 3.6), MW.CHIP_A), ((px + 24.0, pz - 5.0), MW.CHIP_C)],
                  MW.CHIP)
    g = Geo().blob((px + 2.0, 0, pz + 11.8), (10.0, 9.0, 1.6), p=2.6)   # cockpit rim
    rig.part("pod", g, R.LEATHER, outline=0.6)
    g = Geo().blob((px + 11.0, 0, pz + 14.5), (1.4, 8.0, 4.6), p=3.0, rot=(0, 24, 0))   # windscreen
    rig.part("pod", g, R.GLASS, finish="gloss", outline=0.6, outline_hex="#6F8A94")
    # twin machine guns under the chin and an ammo box
    g = Geo()
    for y in (-3.0, 3.0):
        g.capsule((px + 14.0, y, 11.0), (MUZZLE[0] - 1.0, y, 11.0), 1.4)
        g.blob((MUZZLE[0] - 1.5, y, 11.0), (2.2, 1.7, 1.7), p=2.4)
    g.blob((px + 13.0, 0, 11.5), (4.6, 5.6, 2.8), p=2.6)
    rig.part("pod", g, R.GUNMETAL, finish="metal", outline=0.7)
    g = Geo().blob((px + 6.0, -9.0, 10.4), (3.6, 1.6, 2.6), p=3.2)
    rig.part("pod", g, R.KHAKI, outline=0.5)
    rig.track("muzzle", "pod", MUZZLE)
    R.muzzle_flash(rig, "pod", (MUZZLE[0] + 1.0, -3.0, 11.0), size=1.3, name="flash")
    R.muzzle_flash(rig, "pod", (MUZZLE[0] + 1.0, 3.0, 11.0), size=1.0, name="flash2")
    # two brass casings (they tumble out under the guns after the shot)
    for i, dx in enumerate((0.0, 3.0)):
        rig.joint(f"casing{i}", "pod", (px + 12.0 + dx, -4.0, 9.0), hidden=True)
        g = Geo().capsule((px + 11.4 + dx, -4.0 - i, 9.0), (px + 13.0 + dx, -4.0 - i, 9.6), 0.9)
        rig.part(f"casing{i}", g, BRASS, finish="metal", outline=0.4)

    # pilot: a round face with the face kit, a leather cap with goggles, a streaming scarf
    rig.joint("pilot", "pod", (px, 0, pz + 14.0))
    cx, cz = px, pz + 14.0
    g = Geo().blob((cx, 0, cz + 1.5), (6.0, 6.6, 4.0), p=2.4)   # shoulders
    rig.part("pilot", g, R.LEATHER)
    hc = (cx + 1.0, 0.0, cz + 10.5)
    KM.crew_head(rig, "p_head", "pilot", hc, k=1.0, brow=R.HAIR, brow_angry=False)
    g = Geo().blob((hc[0] - 0.4, 0, hc[2] + 3.5), (8.4, 8.0, 5.8), p=2.3)
    g.clip((hc[0], 0, hc[2] + 0.3), (0, 0, -1))
    g.blob((hc[0] - 2.0, -7.4, hc[2] - 0.5), (3.0, 1.4, 4.2), p=2.3)
    g.blob((hc[0] - 2.0, 7.4, hc[2] - 0.5), (3.0, 1.4, 4.2), p=2.3)
    rig.part("p_head", g, R.LEATHER)
    g = Geo()
    for y in (-3.4, 3.0):
        g.lathe([(0, 0), (2.4, 0.2), (2.5, 1.6), (0, 1.8)], (hc[0] + 5.4, y, hc[2] + 4.9), (hc[0] + 7.4, y, hc[2] + 5.5),
                segs=12)
    rig.part("p_head", g, R.GUNMETAL, finish="metal", outline=0.5)
    g = Geo()
    for y in (-3.4, 3.0):
        g.blob((hc[0] + 7.3, y, hc[2] + 5.4), (0.6, 1.8, 1.8), p=2.2)
    rig.part("p_head", g, R.GLASS, finish="gloss", outline=0)
    g = Geo().blob((cx + 1.0, 0, cz + 4.4), (6.2, 7.0, 2.3), p=2.4)   # scarf knot
    rig.part("pilot", g, SCARF)
    rig.secondary("scarf", "pilot", (cx - 4.0, -2.0, cz + 4.6), (cx - 19.0, -2.0, cz + 6.0), max_deg=24, gain=1.5)
    g = Geo().blob((cx - 11.0, -2.0, cz + 5.0), (7.8, 1.4, 2.2), p=2.4, taper=(1.0, 0.8), rot=(0, -6, 0))
    g.blob((cx - 18.5, -2.0, cz + 5.8), (2.8, 1.3, 2.8), p=2.2)
    rig.part("scarf", g, SCARF, outline=0.7)

    # rotor mast, hub, blades (phase copies)
    g = Geo().capsule((px - 5.0, 0, pz + 10.0), (MAST[0], 0, MAST[2]), 1.9, 1.6)
    g.capsule((px - 12.0, 0, pz + 8.0), (MAST[0], 0, MAST[2] - 2.0), 1.2)
    rig.part("pod", g, R.GUNMETAL, finish="metal", outline=0.7)
    rig.joint("rotor", "pod", MAST)
    mx, my, mz = MAST
    g = Geo().blob((mx, 0, mz + 1.0), (3.6, 3.6, 2.4), p=2.4)
    rig.part("rotor", g, R.GUNMETAL, finish="metal", outline=0.7)
    for k in range(BLUR):
        name = f"blur{k}"
        rig.joint(name, "rotor", MAST, hidden=True)
        g = Geo()
        _blur(g, k, mx, mz)
        rig.part(name, g, R.KHAKI_LT, highlight=False, outline=0)
    for k in range(PHASES):
        name = f"blade{k}"
        rig.joint(name, "rotor", MAST, hidden=True)
        ang = 180.0 * k / PHASES
        g = Geo()
        _blade(g, ang, mx, mz)
        rig.part(name, g, R.KHAKI, outline=0.7)
        g = Geo()
        for sgn in (1, -1):
            a = math.radians(ang)
            g.blob((mx + sgn * (ROTOR_R - 3.0) * math.cos(a), sgn * (ROTOR_R - 3.0) * math.sin(a), mz + 2.1),
                   (3.0, 2.8, 0.9), p=2.6, rot=(0, 0, ang))
        rig.part(name, g, R.SIGNAL, outline=0.5)

    rig.joint("smoke", "pod", (px - 8.0, -6.0, pz + 8.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 6.0), (-8, 3, 5.0), (-4, 9, 4.6), (5, 6, 4.2), (-14, 1, 4.0), (-20, 6, 3.4)):
        g.sphere((px - 8.0 + dx, -6.0, pz + 8.0 + dz), r, cuts=4)
    rig.part("smoke", g, R.SMOKE_DK, finish="dust", outline=0.8)
    rig.track("_foot", "odo", (0, 0, 0))
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry (COMMON C1)
        _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40; art/blender/README.md): never on the face or skin. The team pod twice (W3: the
    first mark r 8, the pod is the largest team surface), the olive nose cone, the team fin; smoke trails from the
    engine (a flyer smokes, it never burns)."""
    rig.damage_spot_at("pod", "pod", 8.0, 26.0, 8.0, "metal", team=True)
    rig.damage_spot_at("pod_low", "pod", -6.0, 21.0, 6.0, "metal", team=True)
    rig.damage_spot_at("nose", "pod", 22.0, 24.0, 5.0, "metal", fill="#62664A")
    rig.damage_spot_at("fin", "pod", -46.0, 38.0, 5.0, "metal", team=True)
    rig.damage_spot("engine", "pod", (-16.0, 0.0, 27.0), 5.0, "smoke", kind="emit", normal=(-1, 0, 0))


# -- poses ------------------------------------------------------------------------------------------
def _rotor(step, slow=1, blur=True):
    pose = {f"blade{(step // slow) % PHASES}": {"show": True}}
    if blur:
        pose[f"blur{(step // slow) % BLUR}"] = {"show": True}
    return pose


def _idle(f):
    b = math.sin(2 * math.pi * f / 4)
    c = math.cos(2 * math.pi * f / 4)
    pose = merge(_rotor(f), {
        "body": {"z": 2.0 * b},
        "pod": {"r": 1.8 * c},
        "pilot": {"r": -2.5 * b},
        "p_head": {"r": 3.0 * math.sin(2 * math.pi * (f - 1) / 4)},
    })
    if f == 2:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    return merge(_rotor(f), {
        "odo": {"x": 12.5 * math.cos(p)},     # stride 50 lu per 0.5 s = 100 lu/s (ground speed)
        "body": {"z": 1.2 * math.sin(p)},
        "pod": {"r": -7.0 + 1.8 * math.sin(p + 1.0)},
        "rotor": {"r": -7.0},
        "pilot": {"r": 4.0},
        "p_head": {"r": 2.5 * math.sin(p - 1.0)},
    })


# W3 (item 44): both strafes aimed down at the ground row: a turn (negative) pitches the pod's nose further down
# and drops it a little; the weights hold the dive through the burst and pull out on the settle (the clip repeats
# for the rapid fire).
AIM_W = [0.85, 0.9, 1.0, 0.9, 0.6, 0.0]
AIM_DROP = 0.08

# 6 unique frames in 250 ms; fire on frame 2 at 60 ms (impactAt 0.24, as shipped). The shipped 60 ms
# dip is split into the hold (36) and a wobble partner (24) for the holdLoop.
ATTACK_MS = [36, 24, 50, 40, 50, 50]
ATTACK_IMPACT = 2
U_OF = [0, 0, 1, 2, 3, 4]


def _attack(i, turn=0.0):
    wob = i == 1
    f = U_OF[i]
    pose = merge(_rotor(i), {
        "pod": {"r": [-11, -13, -6, -3, -5][f] + (1.2 if wob else 0.0) + turn, "x": [1.0, 0.5, -2.5, -1.5, 0.0][f]},
        "body": dict(squash([-0.03, 0.03, -0.05, 0.02, 0.0][f]),
                     z=[-1.5, -2.0, 0.5, 1.5, 0.0][f] + (0.6 if wob else 0.0) + AIM_DROP * turn),
        "pilot": {"r": [-5, -6, 4, 2, 0][f]},
        "flash": {"show": f == 1},
        "flash2": {"show": f == 1},
        "casing0": {"show": f in (2, 3), "x": [0, 0, -1, -3, 0][f], "z": [0, 0, -3, -8, 0][f],
                    "r": [0, 0, 80, 220, 0][f]},
        "casing1": {"show": f in (2, 3), "x": [0, 0, 1, 0, 0][f], "z": [0, 0, -2, -6, 0][f],
                    "r": [0, 0, -60, -200, 0][f]},
    })
    if f in (0, 1):
        pose = merge(pose, F.expr("squeeze", "grit"))
    elif f == 2:
        pose = merge(pose, F.expr("yell"))
    return pose


def _attack_clip():
    ov = {2: [{"kind": "burst", "joint": "pod", "point": (MUZZLE[0] + 3.0, -3.0, 11.0), "r0_lu": 6.0,
               "r1_lu": 10.5, "n": 5, "a0": -60.0, "arc": 120.0}]}
    return M.clip("attack", [_attack(f) for f in range(6)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  extra={"holdStep": 0, "holdLoop": [0, 1]})


# -- attack B: banked shot (ANIM_SPEC appendix B) ---------------------------------------------------
# unique frames: 0 HOLD (rolled toward the camera, the nose a little down, the pilot leaning into the
# bank), 1 wobble (holdLoop), 2 FIRE (both guns), 3 recoil (it rocks), 4 rolling level, 5 = A settle.
#       HOLD  wob   FIRE  recoil level
B_RX = [-34.0, -36.0, -33.0, -22.0, -9.0]
B_R = [-2.0, -2.5, 0.0, 3.0, -2.0]
B_X = [0.5, 0.5, -2.0, -1.5, 0.0]
B_Z = [-1.0, -0.6, 0.0, 1.5, 0.5]


def _b_pose(i, turn=0.0):
    if i == 5:
        return _attack(5)
    k = i
    pose = merge(_rotor(i), {
        "body": dict(M.body_about((0, 0, 24), x=B_X[k], z=B_Z[k] + AIM_DROP * turn, rx=B_RX[k],
                                  q=[0, 0, -0.04, 0.02, 0][k])["body"]),
        "pod": {"r": B_R[k] + turn},
        "pilot": {"r": [-6, -6, 3, 2, 0][k], "rx": [8, 8, 6, 4, 0][k]},
        "flash": {"show": k == 2},
        "flash2": {"show": k == 2},
        "casing0": {"show": k in (3, 4), "x": [0, 0, 0, -1, -3][k], "z": [0, 0, 0, -3, -8][k],
                    "r": [0, 0, 0, 80, 220][k]},
        "casing1": {"show": k in (3, 4), "x": [0, 0, 0, 1, 0][k], "z": [0, 0, 0, -2, -6][k],
                    "r": [0, 0, 0, -60, -200][k]},
    })
    if k in (0, 1, 2):
        pose = merge(pose, F.expr("squeeze", "grit"))
    elif k == 3:
        pose = merge(pose, F.expr("yell"))
    return pose


def _attack_b():
    ov = {2: [{"kind": "burst", "joint": "pod", "point": (MUZZLE[0] + 3.0, -3.0, 11.0), "r0_lu": 6.0,
               "r1_lu": 10.5, "n": 5, "a0": -60.0, "arc": 120.0}]}
    reuse = {5: ("attack", 5)}
    return M.clip("attack_b", [_b_pose(i) for i in range(6)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 0, "holdLoop": [0, 1]})


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(_rotor(k), {"body": dict(squash([-0.08, -0.04, 0.02, -0.01, 0][k]), x=-3.0 * max(a, 0),
                                          z=-4.0 * max(a, 0) + 1.5 * min(a, 0)),
                             "pod": {"r": 12 * a}, "pilot": {"r": 10 * a}, "p_head": {"r": 8 * a}})
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


# D8 spiral down: the nose drops, it wobbles and rolls as it falls, crashes nose first with a
# squash and the rotor flies off
D_R = [-8, -18, -30, -42, -55, -64, -58, -62, -62, -62]
D_RZ = [0, 10, -12, 14, -10, 6, 0, 0, 0, 0]
D_RX = [0, 8, -6, 10, -4, 4, 0, 0, 0, 0]
D_Z = [2, 0, -4, -10, -16, -22, -19, -22, -22, -22]
D_X = [-2, -4, -5, -6, -7, -8, -8, -8, -8, -8]
D_Q = [0.04, 0, 0, 0, 0, -0.14, 0.05, -0.06, -0.04, -0.08]
ROTOR_OFF = [None, None, None, None, None, (4, 8, 40), (10, 16, 90), (16, 18, 140), (22, 14, 190),
             (26, 8, 240)]


def _die(k):
    pose = merge(_rotor(k, slow=2 if k > 3 else 1, blur=k < 4), {
        "body": dict(M.body_about((0, 0, 24), x=D_X[k], z=D_Z[k], r=D_R[k], rz=D_RZ[k], rx=D_RX[k],
                                  q=D_Q[k])["body"]),
        "pilot": {"r": [10, 16, -8, 12, -10, 14, 8, 10, 10, 10][k]},
        "smoke": {"show": True, "s": [0.7, 0.85, 0.95, 1.0, 1.05, 1.1, 1.1, 1.15, 1.15, 1.2][k],
                  "x": [0, -1, -2, -3, -4, -5, -6, -7, -8, -9][k]},
    })
    ro = ROTOR_OFF[k]
    if ro is None:
        pose["rotor"] = {"r": [0, 6, 10, 14, 18][k]}
    else:
        x, z, r = ro
        pose["rotor"] = {"x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 5:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 1.4}})
    else:
        pose = merge(pose, F.expr("spiral", "tongue"))
    return pose


def clips():
    attack, attack_b = _attack_clip(), _attack_b()
    # aimed down at the ground row (both strafes; the extras sheet)
    aimed_a = AIMED.variants(RIG, attack, lambda u, t: _attack(u, turn=t), AIM_W, aims=("down",))
    aimed_b = AIMED.variants(RIG, attack_b, lambda u, t: _b_pose(u, turn=t), AIM_W, aims=("down",))
    cl = [
        M.clip("idle", [_idle(f) for f in range(4)], [100, 100, 100, 100], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        attack,
        attack_b,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ] + aimed_a + aimed_b
    for v in aimed_a:
        AIMED.check_timing(attack, v)
    for v in aimed_b:
        AIMED.check_timing(attack_b, v)
    by = {c.name: c for c in cl}
    assert by["idle"].total_ms() == 400 and by["hit"].total_ms() == 310 and by["die"].total_ms() == 695
    return M.check_contract([by["attack"]], attack_ms=250, attack_impact_at=0.24) and M.check_variants(cl)
