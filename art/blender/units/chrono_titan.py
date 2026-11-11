"""Chrono Titan: Future Age Legendary siege heavy (DESIGN A5.6). Armoured mech melee, cleave
(3 targets within 60 lu), blunt damage, Time Stop; huge (~190 lu). Walker rig (A11).
Rendered at 1.25x (Legendary budget, SPIKE_REPORT section 5).

Look (A11, Future palette): a towering clockwork knight-machine, twice the Walker Mech. A
broad white armoured chest with a big clock face (white dial, team rim, magenta hands that
tick through every clip, a mint hub), huge team pauldrons, a small heroic helm with a mint
visor and a tall team crest, charcoal joints, and a slowly turning gear halo on the back with
magenta ticks (it reads "time" at a glance and makes the silhouette unique). Legs are
humanoid (knees forward) with heavy boots that plant without sliding. In the near hand a
colossal chrono-blade: a charcoal spine with a white edge, a magenta energy edge line and a
gear-shaped guard. The visor's mint eyes act (angry on the wind-up, slits on the sweep, > < when
hit, spirals and X when it dies); mint light seams run down the thighs.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    the clock ticks, the halo turns, the hull breathes, a blink
  walk    walk v3 heavy clank at ground speed (ANIM_SPEC G3, 43.75 lu/s, 12 frames in 1560 ms): legs
          by IK with planted boots lifted 13 lu, a hard contact (the torso jolts, a shoulder drops,
          the visor squints, a vent puff), a deep down, a slow passing, arms swinging a beat late
  attack  CLOCK-HAND SWEEP: dips, winds the blade back to nine o'clock behind it (the held
          extreme), then sweeps it 180 degrees over the top like a clock hand, with a double magenta
          smear, the clock hands and halo spinning, and cleaves level through the
          front with a lunge (impact lines, dust, a time ring off the dial)
  attack_b  OVERHEAD CHOP FROM 12 TO 6: rises tall with the blade straight up over its helm (the
          held extreme, the clock hands at twelve), then chops it straight down in front
  attack_c  THRUST: sinks into a wide crouch, the blade drawn back level at its hip and the free arm
          out behind (the held extreme), then drives a long straight thrust through the front
  hit     mech: a hard jolt, sparks on the chest, a vent puff
  die     D6 fall-apart: the clock hands spin wild, the halo drops off behind, the knees buckle
          onto the ground and it topples forward with a smoke puff, spiral then X eyes
"""
import math

from ageborn_art import face as FC
from ageborn_art import gait as GT
from ageborn_art import kit_future as KF
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import futcos_w4 as FW

SLUG = "chrono_titan"
GAIT_NAME = "heavy"
NAME = "Chrono Titan"
HEIGHT_LU = 192
YAW_DEG = -16.0
CANVAS = (600, 580)
FEET = (238, 552)
ANCHORS = {"head": (8, 186), "hitCenter": (0, 110)}
NO_RETIME = True

# the detail standard (art round W4): the big machines' lifts (W3's SHADE_BIG) on the white plates, in the W4 white
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 1.5           # (look-dev: 1.0 held the highlight share at 0.056, 1.25 at 0.060; floor 0.06)
# the big plates' in-band gradient and cavity a step deeper (as the Land Dreadnought's: r24 measured micro 3.22, edge
# 0.439 against the war machines' 3.4 and 0.45; at 1.83 px/lu the titan's plates are 40-60 lu fields)
LOOK_SHADE = dict(FW.SHADE_BIG, gradient=3.0, cavity=0.85)
# no white rim overlay on team surfaces: drawn on the colour layer, it would raise every frame's top to the team crest
# and the halo's teeth (the Attack Drone's lesson: the sheet over its +2% pixel budget)
LOOK_RIM = dict(FW.RIM_SOLDIER, lift=0.7, team_white=0.0)
DIAL_HEX, EDGE_HEX, SPINE_HEX = "#E9EDF1", "#E9EDF0", "#2E323D"    # the dial, the blade's edge and spine (keys
SKIN_PALETTE = dict(FW.KIT_WHITE, **{DIAL_HEX: FW.ARMOR.upper(), EDGE_HEX: FW.ARMOR.upper(),  # the skin recolours)
                                     SPINE_HEX: F.SUIT.upper()})
MATERIAL_KINDS = FW.kinds_future()

# Grandfather Clock (legendary skin, DESIGN A5.8; the puppet's recipe: a walnut casing, brass trim and an ivory dial).
# The silhouette sign: a swan-neck pediment with three brass finials crowns the helm in place of the crest, and a
# brass pendulum swings in a glazed case on the belly, ticking with the hands. The plates are walnut (wood grain at
# game scale), the trims and the blade's edge brass, the dial ivory; the lights are a warm lamp glow (saturation 0.3:
# under the A11 colour rule, outlines included).
GC = "grandfather_clock"
WALNUT, WALNUT_DK, WOOD_DK, BRASS, BRASS_DK = "#8A745E", "#5E4E40", "#463C34", "#C8B48A", "#8E7C5A"
IVORY, IRON, GLASS_DK, LAMP, LAMP_CORE = "#F0E8D6", "#2C2824", "#2A2420", "#ECD9A8", "#FFF4DC"
SKINS = {GC: {
    "palette": FW.skin_palette({F.ARMOR: WALNUT, DIAL_HEX: IVORY, EDGE_HEX: BRASS, SPINE_HEX: IRON, F.SUIT: WOOD_DK,
                                F.GUNMETAL: WALNUT_DK, F.TRIM: BRASS, F.STEEL: BRASS_DK, F.VISOR_DARK: GLASS_DK,
                                F.MINT: LAMP, F.MINT_CORE: LAMP_CORE, F.MAGENTA: LAMP, F.MAGENTA_CORE: LAMP_CORE,
                                FW.LINE_ON_WHITE: WALNUT_DK, FW.WEAR_ON_WHITE: "#A8927A", FW.FOLD_ON_SUIT: "#3A322C"}),
    "kinds": FW.kinds({WALNUT: "wood", WALNUT_DK: "wood", WOOD_DK: "wood", "#A8927A": "wood", "#3A322C": "wood",
                       BRASS: "bronze", BRASS_DK: "bronze", IVORY: "ceramic", IRON: "iron", GLASS_DK: "glass"})}}

HIP_Z = 60.0
THIGH, SHIN = 32.0, 36.0
ANK_REST = HIP_Z - THIGH - SHIN
ANKLE_H = 11.0
LEG_Y = {"r": -15.0, "l": 15.0}
STANCE_X = {"r": 10.0, "l": -10.0}
LIFT = 8.0                          # the hips are raised this far above their modelled height

SHOULDER_Z = 130.0
ARM_Y = {"r": -36.0, "l": 34.0}
UPPER, LOWER = 24.0, 24.0
HAND = {s: (0.0, ARM_Y[s], SHOULDER_Z - UPPER - LOWER) for s in ("r", "l")}
BLADE = 84.0
GUARD = 10.0
TIP = (HAND["r"][0], HAND["r"][1] - 2.0, HAND["r"][2] + GUARD + BLADE)
HALO = (-30.0, 12.0, 140.0)
DIAL = (29.0, -9.0, 112.0)
PEND = (14.6, -12.2, 90.0)          # the Grandfather Clock's pendulum pivot, at the top of its glazed case


RIG = None


def build(rig):
    global RIG
    RIG = rig
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, HIP_Z))
    rig.joint("torso", "hips", (0, 0, HIP_Z + 12.0))
    rig.joint("head", "torso", (4.0, 0, 144.0))
    for s in ("r", "l"):
        F.walker_leg(rig, s, (0.0, LEG_Y[s], HIP_Z), THIGH, SHIN)
        y = ARM_Y[s]
        rig.joint(f"arm_{s}", "torso", (0, y, SHOULDER_Z))
        rig.joint(f"fore_{s}", f"arm_{s}", (0, y, SHOULDER_Z - UPPER))
        rig.joint(f"hand_{s}", f"fore_{s}", HAND[s])
    rig.joint("blade", "hand_r", HAND["r"])

    # gear halo on the back (behind everything), turning
    hx, hy, hz = HALO
    rig.joint("halo", "torso", HALO)
    g = Geo().lathe([(26.0, -2.0), (31.0, -1.8), (31.0, 1.8), (26.0, 2.0)], (hx, hy, hz), (hx, hy + 1, hz), segs=40)
    rig.part("halo", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo()
    for i in range(12):
        a = math.radians(i * 30)
        g.blob((hx + 34.0 * math.cos(a), hy, hz + 34.0 * math.sin(a)), (4.6, 2.6, 4.2), p=3.0,
               rot=(0, -i * 30 + 90, 0))
    rig.part("halo", g, team=True, outline=0.8)
    g = Geo()
    for i in range(12):
        a = math.radians(i * 30 + 15)
        r0, r1 = 18.0, (25.0 if i % 3 == 0 else 22.0)
        g.capsule((hx + r0 * math.cos(a), hy - 2.2, hz + r0 * math.sin(a)),     # (W4: in front of the chapter
                  (hx + r1 * math.cos(a), hy - 2.2, hz + r1 * math.sin(a)), 1.3, segs=8, rings=2)   # ring's decal)
    rig.part("halo", g, glow=F.MAGENTA, outline=0.8, outline_hex=F.SUIT)
    g = Geo().capsule((-10.0, 8.0, 135.0), (hx + 2.0, hy, hz - 2.0), 3.6)
    rig.part("torso", g, F.GUNMETAL, finish="metal")

    # far arm (behind the body)
    _arm(rig, "l")

    # legs: charcoal thighs with white plates, knee discs, white shin armour, heavy boots; the far leg
    # is 20% darker and the boots are 26 lu long so the two feet read apart (ANIM_SPEC G3)
    from ageborn_art import colors as CO
    for s in ("r", "l"):
        y = LEG_Y[s]
        kz = HIP_Z - THIGH
        dk = (lambda c: c) if s == "r" else (lambda c: CO.scale(c, 0.8))
        g = Geo().capsule((0, y, HIP_Z), (0, y, kz), 8.0, 6.6)
        rig.part(f"thigh_{s}", g, dk(F.SUIT))
        g = Geo().blob((2.0, y - (1.5 if s == "r" else -1.5), HIP_Z - 12.0), (9.6, 8.8, 13.0), p=2.8,
                       taper=(0.8, 1.05))
        rig.part(f"thigh_{s}", g, team=True)
        g = Geo().lathe([(0, -5.0), (8.0, -4.8), (8.6, 0), (8.0, 4.8), (0, 5.0)], (0, y, kz), (0, y + 1, kz), segs=20)
        rig.part(f"shin_{s}", g, dk(F.GUNMETAL), finish="metal")
        g = Geo().blob((4.6, y, kz + 1.0), (4.0, 7.0, 6.4), p=2.8)
        rig.part(f"shin_{s}", g, team=True, outline=0.8)
        g = Geo().capsule((0, y, kz), (0, y, ANK_REST + 4), 6.4, 5.6)
        rig.part(f"shin_{s}", g, dk(F.SUIT))
        g = Geo().blob((2.4, y, kz - 17.0), (8.4, 9.0, 15.0), p=2.8, taper=(0.85, 1.1))
        rig.part(f"shin_{s}", g, dk(F.ARMOR), finish="gloss", outline_hex=F.TRIM)
        a = ANK_REST
        g = Geo().blob((4.0, y, a - 6.0), (13.0, 10.4, 6.4), p=3.2, taper=(1.0, 0.8))
        g.blob((-4.0, y, a - 3.0), (7.6, 9.6, 7.4), p=3.0)
        rig.part(f"foot_{s}", g, dk(F.ARMOR), finish="gloss", outline_hex=F.TRIM)
        g = Geo().blob((4.0, y, a - 10.6), (13.6, 11.0, 2.0), p=3.4)
        rig.part(f"foot_{s}", g, dk(F.SUIT))
    rig.track("_foot", "foot_r", (4.0, LEG_Y["r"], ANK_REST - 12.0))
    rig.track("_foot_l", "foot_l", (4.0, LEG_Y["l"], ANK_REST - 12.0))

    # pelvis and waist
    g = Geo().blob((0, 0, HIP_Z + 4.0), (20.0, 21.0, 11.0), p=2.8)
    rig.part("hips", g, F.SUIT)
    g = Geo().blob((2.0, 0, HIP_Z + 2.0), (21.0, 22.0, 8.0), p=3.0, taper=(1.1, 1.0))
    g.clip((0, 0, HIP_Z - 3.0), (0, 0, -1))
    rig.part("hips", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((20.0, -2.0, HIP_Z - 2.0), (3.0, 10.0, 11.0), p=3.0, taper=(1.0, 0.8))   # tasset
    rig.part("hips", g, team=True)

    # torso: charcoal core, white chest plates, big clock face on the chest
    g = Geo().blob((0, 0, 86.0), (18.0, 18.0, 12.0), p=2.6)
    rig.part("torso", g, F.SUIT)
    g = Geo().blob((0, 0, 114.0), (29.0, 27.0, 24.0), p=2.8, taper=(0.82, 1.05))
    rig.part("torso", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((0.5, 0, 114.4), (29.6, 27.6, 24.6), p=2.8, taper=(0.82, 1.05))
    g.clip((0, 0, 100.0), (0, 0, 1)).clip((0, 0, 91.0), (0, 0, -1))
    rig.part("torso", g, team=True, outline=0.7)
    g = Geo().blob((-24.0, 0, 118.0), (8.0, 20.0, 16.0), p=3.2)             # power pack
    rig.part("torso", g, F.SUIT, finish="gloss")
    g = Geo()
    for y in (-10.0, 0.0, 10.0):
        g.capsule((-32.2, y, 110.0), (-32.2, y, 126.0), 2.0)
    rig.part("torso", g, glow=F.MINT, outline=0.8, outline_hex=F.SUIT)
    # the clock face, turned toward the camera
    n = (math.cos(math.radians(-38)), math.sin(math.radians(-38)), 0.0)
    dx, dy, dz = DIAL

    def at(d):
        return (dx + n[0] * d, dy + n[1] * d, dz)
    g = Geo().lathe([(0, -1.0), (15.0, -0.8), (16.6, 1.0), (15.6, 3.0), (0, 3.0)], at(-3.0), at(0.0), segs=36)
    rig.part("torso", g, team=True)
    g = Geo().lathe([(0, 0), (13.2, 0.1), (13.0, 1.4), (0, 1.8)], at(0.2), at(1.6), segs=36)
    rig.part("torso", g, DIAL_HEX, finish="gloss", outline_hex=F.TRIM)
    g = Geo()
    tx, ty = n[1], -n[0]      # a unit vector across the dial (horizontal on screen)
    for i in range(12):
        a = math.radians(i * 30)
        r0, r1 = 10.0, (12.2 if i % 3 == 0 else 11.4)
        c0 = at(2.2)
        p0 = (c0[0] + tx * r0 * math.cos(a), c0[1] + ty * r0 * math.cos(a), c0[2] + r0 * math.sin(a))
        p1 = (c0[0] + tx * r1 * math.cos(a), c0[1] + ty * r1 * math.cos(a), c0[2] + r1 * math.sin(a))
        g.capsule(p0, p1, 0.8 if i % 3 else 1.1, segs=6, rings=2)
    rig.part("torso", g, F.SUIT, outline=0)
    for name, length, w in (("hand_hour", 7.0, 1.5), ("hand_min", 10.5, 1.1)):
        c0 = at(2.8)
        rig.joint(name, "torso", c0)
        # modelled pointing up (12 o'clock); pose `rx` spins it about the dial's axis
        g = Geo().capsule(c0, (c0[0], c0[1], c0[2] + length), w, w * 0.6, segs=8, rings=2)
        rig.part(name, g, glow=F.MAGENTA, outline=0.8, outline_hex=F.SUIT)
    g = Geo().sphere(at(3.2), 2.4, cuts=3)
    rig.part("torso", g, glow=F.MINT, outline=0.8, outline_hex=F.SUIT)
    g = Geo().blob((4.0, 0, 139.0), (13.0, 14.0, 5.0), p=2.6)            # gorget
    rig.part("torso", g, F.SUIT)
    rig.joint("pendulum", "torso", PEND)                                 # (W4: the skin's pendulum; no parts here)
    if getattr(rig, "skin", None) == GC:
        _pendulum_case(rig)

    # head: small heroic helm, mint visor, tall team crest
    g = Geo().blob((6.0, 0, 154.0), (14.0, 13.0, 14.0), p=2.6)
    g.blob((10.0, 0, 145.0), (9.0, 10.0, 5.0), p=2.4)
    rig.part("head", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    if getattr(rig, "skin", None) == GC:
        _bonnet(rig)
    else:
        g = Geo().blob((3.0, 0, 171.0), (18.0, 4.2, 11.0), p=2.4, rot=(0, -12, 0))
        g.blob((-9.0, 0, 164.0), (6.0, 3.2, 10.0), p=2.4, rot=(0, 30, 0))
        rig.part("head", g, team=True)
    g = Geo().blob((6.0, 0, 154.0), (14.8, 13.8, 14.8), p=2.6)
    g.clip((12.0, 0, 0), (-1, 0, 0)).clip((0, 0, 158.0), (0, 0, 1)).clip((0, 0, 150.0), (0, 0, -1))
    rig.part("head", g, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    band = Geo().blob((6.0, 0, 154.0), (15.1, 14.1, 15.1), p=2.6)
    band.clip((12.0, 0, 0), (-1, 0, 0)).clip((0, 0, 158.4), (0, 0, 1)).clip((0, 0, 149.6), (0, 0, -1))
    KF.visor_face(rig, "head", [band], (15.6, 154.2), eye_dx=(0.0, 5.0), eye_rx=2.2, eye_rz=3.2, yaw_deg=YAW_DEG)
    # mint light seams on the thighs and a rivet row on the chest band
    for s_ in ("r", "l"):
        y = LEG_Y[s_]
        KF.strip(rig, f"thigh_{s_}", [(9.6, y - 3.0 * (1 if s_ == "r" else -1), HIP_Z - 4.0),
                                      (10.4, y - 3.0 * (1 if s_ == "r" else -1), HIP_Z - 20.0)], r=1.1)
    KF.rivets(rig, "torso", [(x_, -26.6 + 0.12 * abs(x_), 95.6) for x_ in (-16.0, -8.0, 0.0, 8.0)], r=1.3)

    _arm(rig, "r")

    # the chrono-blade along +Z from the near fist
    x, y, z = HAND["r"]
    g = Geo().capsule((x, y, z - 8.0), (x, y, z + 7.0), 2.8)                   # grip
    g.sphere((x, y, z - 9.5), 3.6, cuts=3)                                       # pommel
    rig.part("blade", g, SPINE_HEX, finish="gloss")
    b0 = z + GUARD
    g = Geo().lathe([(0, -2.2), (8.0, -2.0), (9.4, 0), (8.0, 2.0), (0, 2.2)], (x, y - 1.0, b0 - 2.0),
                    (x, y - 2.0, b0 - 2.0), segs=12)                             # gear guard
    rig.part("blade", g, team=True)
    g = Geo().sphere((x, y - 3.0, b0 - 2.0), 3.0, cuts=3)
    rig.part("blade", g, glow=F.MINT, outline=0)
    g = Geo().blob((x - 1.0, y - 1.0, b0 + BLADE / 2), (4.4, 2.6, BLADE / 2), p=2.6, taper=(1.0, 0.5))
    rig.part("blade", g, SPINE_HEX, finish="gloss")                              # spine
    g = Geo().blob((x + 5.0, y - 1.6, b0 + BLADE / 2 + 2), (6.6, 1.9, BLADE / 2 - 1), p=2.4,
                   taper=(1.0, 0.35), shift=(0.2, 0))
    rig.part("blade", g, EDGE_HEX, finish="gloss", outline_hex=F.TRIM)          # edge
    g = Geo().blob((x + 9.6, y - 2.4, b0 + BLADE / 2 + 1), (1.5, 0.9, BLADE / 2 - 5), p=2.4,
                   taper=(1.0, 0.4), shift=(0.4, 0))
    rig.part("blade", g, glow=F.MAGENTA, outline=0)
    rig.track("bladeTip", "blade", TIP)
    F.sparks(rig, "blade", (x + 4.0, y - 4.0, b0 + BLADE * 0.85), color=F.MAGENTA, core=F.WHITE,
             size=3.0, name="sparks", rays=8, seed=4)
    F.puff(rig, "torso", (-30.0, -6.0, 132.0), size=2.4, name="vent", spread=1.2)
    F.sparks(rig, "torso", (26.0, -20.0, 118.0), color=F.MINT, size=2.2, name="hit_spark", rays=6, seed=6)
    F.puff(rig, "root", (0.0, -20.0, 40.0), size=3.2, name="smoke", color="#B9BEC6", spread=1.6)
    _detail(rig)
    _plates(rig)
    if getattr(rig, "skin", None) is None:
        _damage_spots(rig)


def _detail(rig):
    """W4: the detail standard (char space; decals cast at the unit's yaw): the halo ring in twelve plates; the chest
    in plates (a seam down its flank and one under the shoulders) with chipped edges; the team chest band split into
    plates; the pauldrons' team-dark rims and ridges; seams down the forearm plates and round their cuffs; the hip
    skirt in faulds; team-dark grooves round the thigh plates; seams down and round the shin armour and the boots,
    scuffed toes; a seam down the helm (no team-dark decal on the crest: drawn on the colour layer too, it would
    raise the frames' tops); creases at the waist."""
    hx, hy, hz = HALO
    ring = Geo().lathe([(26.0, -2.0), (31.0, -1.8), (31.0, 1.8), (26.0, 2.0)], (hx, hy, hz), (hx, hy + 1, hz), segs=40)
    rf = FC.Face(rig, "halo", [ring], yaw_deg=YAW_DEG)

    def rp(a, r):
        return FW.sc(rf, hx + r * math.cos(math.radians(a)), hz + r * math.sin(math.radians(a)), hy - 2.0)
    # spokes between the magenta ticks (the halo is a disc: its face was one flat white field), broken by a team-dark
    # chapter ring under the ticks (r25: the halo reads as the titan's clock face; and team share for the skin, whose
    # bonnet replaces the team crest), a seam round the hub and proud rivets round the rim between the teeth
    FW.panel_lines(rig, "halo", rf, [[rp(a, 9.0), rp(a, 16.6)] for a in range(0, 360, 30)]
                   + [[rp(a, 26.2), rp(a, 30.2)] for a in range(0, 360, 30)]
                   + [[rp(a, 9.0) for a in range(0, 375, 15)]], w=1.0)
    for a in range(0, 360, 15):
        FW.panel(rig, "halo", rf, [rp(a, 17.2), rp(a + 15, 17.2), rp(a + 15, 25.8), rp(a, 25.8)], team=True)
    FW.rivets(rig, "halo", rf, [rp(a, 28.4) for a in range(15, 360, 30)], r=1.3, fill=F.STEEL)
    FW.wear(rig, "halo", rf, [(*rp(a, 30.2), 1.6, 0.8) for a in (70, 160, 250, 340)])
    # the chest
    chest = Geo().blob((0, 0, 114.0), (29.0, 27.0, 24.0), p=2.8, taper=(0.82, 1.05))
    cf = FC.Face(rig, "torso", [chest], yaw_deg=YAW_DEG)
    FW.panel_lines(rig, "torso", cf, [[FW.sc(cf, -13.0, 134.0, -22.0), FW.sc(cf, -14.0, 118.0, -26.6),
                                       FW.sc(cf, -13.0, 102.0, -25.6)],
                                      [FW.sc(cf, -25.0, 127.0, -18.0), FW.sc(cf, -8.0, 128.0, -25.0),
                                       FW.sc(cf, 8.0, 128.0, -24.6)]], w=1.1)
    FW.wear(rig, "torso", cf, [(*FW.sc(cf, -23.0, 104.0, -20.0), 2.0, 1.0), (*FW.sc(cf, 4.0, 135.0, -21.0), 1.8, 0.9),
                               (*FW.sc(cf, -26.0, 122.0, -16.0), 1.4, 0.8)])
    band = Geo().blob((0.5, 0, 114.4), (29.6, 27.6, 24.6), p=2.8, taper=(0.82, 1.05))
    bf = FC.Face(rig, "torso", [band], yaw_deg=YAW_DEG)
    FW.folds(rig, "torso", bf, [[FW.sc(bf, x, 99.4, -27.0), FW.sc(bf, x, 91.6, -26.4)] for x in (-12.0, 4.0)], w=1.1,
             team=True)
    # the pauldrons: team-dark rims and a ridge
    for s_ in ("r", "l"):
        y = ARM_Y[s_]
        sg = 1 if s_ == "r" else -1
        FW.band(rig, f"arm_{s_}", (1.0, y - 1.5 * sg, SHOULDER_Z + 3.0), (15.0, 12.0, 12.0), 2.6, SHOULDER_Z - 7.6,
                SHOULDER_Z - 6.6, team=True)
    pf = FC.Face(rig, "arm_r", [Geo().blob((1.0, ARM_Y["r"] - 1.5, SHOULDER_Z + 3.0), (15.0, 12.0, 12.0), p=2.6)],
                 yaw_deg=YAW_DEG)
    yy = ARM_Y["r"] - 1.5 - 10.4
    FW.folds(rig, "arm_r", pf, [[FW.sc(pf, -11.0, SHOULDER_Z + 8.0, yy + 1.0), FW.sc(pf, 1.0, SHOULDER_Z + 11.0, yy),
                                 FW.sc(pf, 12.0, SHOULDER_Z + 8.0, yy + 1.0)]], w=1.1, team=True)
    # the forearm plates: a seam down them and round their cuffs
    for s_ in ("r", "l"):
        y = ARM_Y[s_]
        z = SHOULDER_Z - UPPER - 13.0
        FW.band(rig, f"fore_{s_}", (0.5, y, z), (8.8, 8.8, 12.0), 2.8, z - 9.4, z - 8.4, fill=FW.LINE_ON_WHITE,
                taper=(0.85, 1.1))
    ff = FC.Face(rig, "fore_r", [Geo().blob((0.5, ARM_Y["r"], SHOULDER_Z - UPPER - 13.0), (8.8, 8.8, 12.0), p=2.8,
                                            taper=(0.85, 1.1))], yaw_deg=YAW_DEG)
    z = SHOULDER_Z - UPPER - 13.0
    FW.panel_lines(rig, "fore_r", ff, [[FW.sc(ff, -1.0, z + 10.0, ARM_Y["r"] - 8.0), FW.sc(ff, -1.6, z - 6.0,
                                                                                          ARM_Y["r"] - 8.6)]], w=1.0)
    # the hip skirt in faulds; the tasset's team-dark seam
    hf = FC.Face(rig, "hips", [Geo().blob((2.0, 0, HIP_Z + 2.0), (21.0, 22.0, 8.0), p=3.0, taper=(1.1, 1.0))],
                 yaw_deg=YAW_DEG)
    FW.panel_lines(rig, "hips", hf, [[FW.sc(hf, x, HIP_Z + 8.6, -20.4), FW.sc(hf, x, HIP_Z - 2.4, -21.6)]
                                     for x in (-12.0, 1.0, 13.0)], w=1.0)
    FW.wear(rig, "hips", hf, [(*FW.sc(hf, -6.0, HIP_Z - 2.6, -21.0), 1.8, 0.8), (*FW.sc(hf, 8.0, HIP_Z - 2.6, -21.0), 1.5, 0.7)])
    # the legs: team-dark grooves round the thigh plates; the shin armour and the boots
    for s_ in ("r", "l"):
        y = LEG_Y[s_]
        sg = 1 if s_ == "r" else -1
        kz = HIP_Z - THIGH
        for z0 in (HIP_Z - 8.0, HIP_Z - 17.0):
            FW.band(rig, f"thigh_{s_}", (2.0, y - 1.5 * sg, HIP_Z - 12.0), (9.6, 8.8, 13.0), 2.8, z0, z0 + 0.9,
                    team=True, taper=(0.8, 1.05))
        FW.band(rig, f"shin_{s_}", (2.4, y, kz - 17.0), (8.4, 9.0, 15.0), 2.8, kz - 15.0, kz - 14.0,
                fill=FW.LINE_ON_WHITE, taper=(0.85, 1.1))
        a = ANK_REST
        FW.band(rig, f"foot_{s_}", (4.0, y, a - 6.0), (13.0, 10.4, 6.4), 3.2, a - 4.4, a - 3.6, fill=FW.LINE_ON_WHITE,
                taper=(1.0, 0.8))
    kz = HIP_Z - THIGH
    sf = FC.Face(rig, "shin_r", [Geo().blob((2.4, LEG_Y["r"], kz - 17.0), (8.4, 9.0, 15.0), p=2.8, taper=(0.85, 1.1))],
                 yaw_deg=YAW_DEG)
    FW.panel_lines(rig, "shin_r", sf, [[FW.sc(sf, 2.0, kz - 3.0, LEG_Y["r"] - 8.6), FW.sc(sf, 2.6, kz - 13.4,
                                                                                         LEG_Y["r"] - 9.0)],
                                       [FW.sc(sf, 2.6, kz - 16.4, LEG_Y["r"] - 9.0), FW.sc(sf, 2.0, kz - 30.0,
                                                                                         LEG_Y["r"] - 8.4)]], w=1.0)
    FW.wear(rig, "shin_r", sf, [(*FW.sc(sf, 8.4, kz - 28.0, LEG_Y["r"] - 7.0), 1.6, 0.8),
                                (*FW.sc(sf, -4.0, kz - 6.0, LEG_Y["r"] - 7.4), 1.4, 0.7)])
    tf = FC.Face(rig, "foot_r", [Geo().blob((4.0, LEG_Y["r"], ANK_REST - 6.0), (13.0, 10.4, 6.4), p=3.2,
                                            taper=(1.0, 0.8))], yaw_deg=YAW_DEG)
    FW.wear(rig, "foot_r", tf, [(*FW.sc(tf, 14.0, ANK_REST - 8.0, LEG_Y["r"] - 7.0), 1.8, 0.8)])
    # the helm: a seam down its side, wear; a team-dark groove along the crest
    hm = FC.Face(rig, "head", [Geo().blob((6.0, 0, 154.0), (14.0, 13.0, 14.0), p=2.6)], yaw_deg=YAW_DEG)
    FW.panel_lines(rig, "head", hm, [[FW.sc(hm, -2.0, 166.0, -10.6), FW.sc(hm, -3.0, 156.0, -12.6),
                                      FW.sc(hm, -2.0, 145.0, -11.0)]], w=1.0)
    FW.wear(rig, "head", hm, [(*FW.sc(hm, -8.0, 160.0, -10.0), 1.4, 0.7)])
    # creases on the charcoal waist
    wf = FC.Face(rig, "torso", [Geo().blob((0, 0, 86.0), (18.0, 18.0, 12.0), p=2.6)], yaw_deg=YAW_DEG)
    FW.folds(rig, "torso", wf, [[FW.sc(wf, -12.0, 84.0, -14.0), FW.sc(wf, -2.0, 82.6, -17.6), FW.sc(wf, 9.0, 84.0, -15.0)]],
             w=1.0, team=False, fill=FW.FOLD_ON_SUIT)


def _surface_y(c, r, p, x, z, taper=(1.0, 1.0)):
    """The camera's side (-y) of a blob (Geo.blob's superellipsoid with its taper) at (x, z)."""
    zu = max(-1.0, min(1.0, (z - c[2]) / r[2]))
    k = taper[0] + (taper[1] - taper[0]) * (zu + 1) / 2
    xu = (x - c[0]) / (r[0] * k)
    t = 1.0 - abs(xu) ** p - abs(zu) ** p
    return c[1] - r[1] * k * max(t, 0.0) ** (1.0 / p)


def _plates(rig):
    """r25 (r24 measured micro 3.22, edge 0.439, highlight 0.050 against the war machines' 3.4, 0.45 and 0.06: at
    1.83 px/lu the titan's plates are 40-60 lu fields, so they need a seam every 6-12 lu, audit 5.2): the chest's back
    plate split across at the dial's foot and down its middle, the front plate's seam under the dial, proud steel
    rivets where the seams meet; the near pauldron in three lames (team-dark); bolts round the near knee disc; a
    seam over the near shin's band with rivets, and the boot's toe cap; a fuller down the blade."""
    cc, cr, ct = (0.0, 0.0, 114.0), (29.0, 27.0, 24.0), (0.82, 1.05)
    chest = Geo().blob(cc, cr, p=2.8, taper=ct)
    cf = FC.Face(rig, "torso", [chest], yaw_deg=YAW_DEG)

    def on_chest(x, z):
        return FW.sc(cf, x, z, _surface_y(cc, cr, 2.8, x, z, ct))
    FW.panel_lines(rig, "torso", cf, [[on_chest(x, 106.6) for x in (-27.0, -21.0, -15.0, -9.0)],
                                      [on_chest(x, 106.6) for x in (8.0, 12.0, 16.4)],
                                      [on_chest(-21.6, z) for z in (126.0, 118.0, 110.0, 106.6)]], w=1.1)
    FW.rivets(rig, "torso", cf, [on_chest(x, z) for x, z in ((-13.8, 108.8), (-21.6, 108.8), (-13.6, 125.6),
                                                             (-21.6, 125.2), (12.0, 108.8))], r=1.2, fill=F.STEEL)
    # the near pauldron's lames, under its ridge
    pc, pr = (1.0, ARM_Y["r"] - 1.5, SHOULDER_Z + 3.0), (15.0, 12.0, 12.0)
    pf = FC.Face(rig, "arm_r", [Geo().blob(pc, pr, p=2.6)], yaw_deg=YAW_DEG)

    def on_pad(x, z):
        return FW.sc(pf, x, z, _surface_y(pc, pr, 2.6, x, z))
    FW.folds(rig, "arm_r", pf, [[on_pad(-11.4, SHOULDER_Z + 2.6), on_pad(1.0, SHOULDER_Z + 5.2),
                                 on_pad(12.4, SHOULDER_Z + 2.6)],
                                [on_pad(-11.8, SHOULDER_Z - 2.6), on_pad(1.0, SHOULDER_Z - 0.2),
                                 on_pad(12.6, SHOULDER_Z - 2.6)]], w=1.1, team=True)
    # bolts round the near knee disc (gunmetal: the bolts' heads catch the light), clear of the team knee pad
    kz = HIP_Z - THIGH
    y = LEG_Y["r"] - 5.0
    KF.rivets(rig, "shin_r", [(6.0 * math.cos(math.radians(a)), y, kz + 6.0 * math.sin(math.radians(a)))
                              for a in (115, 165, 210, 250)], r=1.1, color=F.STEEL)
    # the near shin: rivets over its band, the boot's toe cap
    sc_, sr, st = (2.4, LEG_Y["r"], kz - 17.0), (8.4, 9.0, 15.0), (0.85, 1.1)
    sf = FC.Face(rig, "shin_r", [Geo().blob(sc_, sr, p=2.8, taper=st)], yaw_deg=YAW_DEG)
    FW.rivets(rig, "shin_r", sf, [FW.sc(sf, x, kz - 12.0, _surface_y(sc_, sr, 2.8, x, kz - 12.0, st))
                                  for x in (-3.6, 7.6)], r=1.1, fill=F.STEEL)
    a = ANK_REST
    bc, br, bt = (4.0, LEG_Y["r"], a - 6.0), (13.0, 10.4, 6.4), (1.0, 0.8)
    tf = FC.Face(rig, "foot_r", [Geo().blob(bc, br, p=3.2, taper=bt)], yaw_deg=YAW_DEG)
    FW.panel_lines(rig, "foot_r", tf, [[FW.sc(tf, x, z, _surface_y(bc, br, 3.2, x, z, bt))
                                        for x, z in ((9.4, a - 3.4), (10.0, a - 6.6), (10.8, a - 9.6))]], w=1.0)
    # a seam across the near forearm plate, one round the helm over the visor, one down the near shin's back
    fc_, fr_, ft_ = (0.5, ARM_Y["r"], SHOULDER_Z - UPPER - 13.0), (8.8, 8.8, 12.0), (0.85, 1.1)
    ff = FC.Face(rig, "fore_r", [Geo().blob(fc_, fr_, p=2.8, taper=ft_)], yaw_deg=YAW_DEG)
    zf = SHOULDER_Z - UPPER - 11.0
    FW.panel_lines(rig, "fore_r", ff, [[FW.sc(ff, x_, zf, _surface_y(fc_, fr_, 2.8, x_, zf, ft_))
                                        for x_ in (-6.4, -1.0, 4.4, 8.0)]], w=1.0)
    hc_, hr_ = (6.0, 0.0, 154.0), (14.0, 13.0, 14.0)
    hf_ = FC.Face(rig, "head", [Geo().blob(hc_, hr_, p=2.6)], yaw_deg=YAW_DEG)
    FW.panel_lines(rig, "head", hf_, [[FW.sc(hf_, x_, 160.6, _surface_y(hc_, hr_, 2.6, x_, 160.6))
                                       for x_ in (-6.0, 0.0, 6.0, 11.0)]], w=1.0)
    FW.panel_lines(rig, "shin_r", sf, [[FW.sc(sf, x_, z_, _surface_y(sc_, sr, 2.8, x_, z_, st))
                                        for x_, z_ in ((-3.4, kz - 4.0), (-4.0, kz - 13.0))],
                                       [FW.sc(sf, x_, z_, _surface_y(sc_, sr, 2.8, x_, z_, st))
                                        for x_, z_ in ((-4.0, kz - 16.0), (-3.4, kz - 28.0))]], w=1.0)
    # a fuller down the blade's edge plate
    x, y, z = HAND["r"]
    b0 = z + GUARD
    ec, er, et = (x + 5.0, y - 1.6, b0 + BLADE / 2 + 2), (6.6, 1.9, BLADE / 2 - 1), (1.0, 0.35)
    ef = FC.Face(rig, "blade", [Geo().blob(ec, er, p=2.4, taper=et, shift=(0.2, 0))], yaw_deg=YAW_DEG)
    FW.panel_lines(rig, "blade", ef, [[FW.sc(ef, x + 4.4 + 0.012 * (zz - b0), zz, y - 3.2)
                                       for zz in (b0 + 8.0, b0 + 30.0, b0 + 52.0)]], w=1.0)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, mech: dents and scratches, sparks and steam; never on the visor or
    the dial): the near team thigh plate, the near pauldron, the white helm behind the visor, the halo's hub, the near
    shin armour; sparks at the gorget, steam from the power pack."""
    # (r27: the chest band and the chest were 0% seen in every clip, behind the near arm and the power pack: the near
    # thigh plate, the largest team field the arm and blade leave clear, and the helm behind the visor)
    rig.damage_spot("thigh", "thigh_r", (3.0, LEG_Y["r"] - 1.5 - 8.6, HIP_Z - 12.0), 7.0, "metal", team=True,
                    normal=(0, -1, 0))
    rig.damage_spot_at("pauldron", "arm_r", -2.0, 128.0, 7.0, "metal", team=True)
    rig.damage_spot("helm", "head", (-3.0, -10.8, 157.0), 6.0, "metal", normal=(-0.3, -0.95, 0.1))
    hx, hy, hz = HALO          # the halo's white hub, inside the team-dark chapter ring, between two spokes
    rig.damage_spot("halo", "halo", (hx + 13.0 * math.cos(math.radians(105)), hy - 2.0,
                                     hz + 13.0 * math.sin(math.radians(105))), 5.0, "metal", normal=(0, -1, 0))
    rig.damage_spot_at("shin", "shin_r", 3.0, 12.0, 6.0, "metal", fill=FW.ARMOR)
    rig.damage_spot("neck", "torso", (8.0, -12.0, 139.0), 5.0, "spark", kind="emit", normal=(0.3, -0.9, 0.3))
    rig.damage_spot("pack", "torso", (-24.0, -8.0, 134.0), 6.0, "steam", kind="emit", normal=(-0.4, 0, 0.9))


def _bonnet(rig):
    """The Grandfather Clock's crown: a walnut cornice over the helm, a broken swan-neck pediment (two scrolls rising
    to brass rosettes) and three brass finials, the tallest in the middle."""
    g = Geo().blob((5.0, 0, 167.0), (16.5, 10.0, 2.2), p=3.2)                                # cornice
    g.blob((-4.4, 0, 173.6), (7.4, 4.2, 2.3), p=2.6, rot=(0, -38, 0))                      # scroll, back
    g.blob((14.4, 0, 173.6), (7.4, 4.2, 2.3), p=2.6, rot=(0, 38, 0))                       # scroll, front
    g.blob((5.0, 0, 170.0), (4.2, 5.0, 2.6), p=2.6)                                         # the plinth
    rig.part("head", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo()
    for x in (-0.4, 10.4):
        g.sphere((x, -4.4, 178.4), 2.4, cuts=3)                                            # rosettes
    for x, z0, h, r in ((5.0, 172.6, 15.0, 2.6), (-11.0, 169.0, 9.0, 1.9), (21.0, 169.0, 9.0, 1.9)):
        g.lathe([(0, 0), (r, 0.6), (r * 1.1, h * 0.25), (r * 0.6, h * 0.45), (r * 0.9, h * 0.55), (0.5, h * 0.8),
                 (0, h)], (x, 0, z0), (x, 0, z0 + 1), segs=14)                               # urn and spike finials
    rig.part("head", g, F.TRIM, finish="metal", outline=0.8)


def _pendulum_case(rig):
    """The Grandfather Clock's glazed pendulum case on the belly (turned toward the camera like the dial), its brass
    frame, and the pendulum: a brass rod and a big brass bob."""
    a = math.radians(-38)
    px, py, pz = PEND
    g = Geo().blob((px - 1.2, py + 1.0, pz - 9.0), (1.8, 7.2, 10.4), p=3.0, rot=(0, 0, -38))
    rig.part("torso", g, F.TRIM, finish="metal", outline=0.8)                                # brass frame
    g = Geo().blob((px - 0.6, py + 0.4, pz - 9.0), (1.6, 6.0, 9.2), p=3.0, rot=(0, 0, -38))
    rig.part("torso", g, F.VISOR_DARK, finish="gloss", outline=0)                             # dark glass
    n = (math.cos(a), math.sin(a))
    rod = Geo().capsule((px + 0.6 * n[0], py + 0.6 * n[1], pz - 0.6), (px + 0.6 * n[0], py + 0.6 * n[1], pz - 12.0), 0.45)
    bob = Geo().lathe([(0, -0.5), (3.4, -0.4), (3.6, 0), (3.4, 0.4), (0, 0.5)],
                      (px + 0.4 * n[0], py + 0.4 * n[1], pz - 14.2), (px + 1.4 * n[0], py + 1.4 * n[1], pz - 14.2),
                      segs=20)
    rig.part("pendulum", rod, F.TRIM, finish="metal", outline=0.4)
    rig.part("pendulum", bob, F.TRIM, finish="metal", outline=0.6)


def _arm(rig, s):
    y = ARM_Y[s]
    z = SHOULDER_Z
    g = Geo().capsule((0, y, z), (0, y, z - UPPER), 8.0, 7.0)
    rig.part(f"arm_{s}", g, F.SUIT)
    g = Geo().blob((1.0, y - 1.5 * (1 if s == "r" else -1), z + 3.0), (15.0, 12.0, 12.0), p=2.6)
    rig.part(f"arm_{s}", g, team=True)
    g = Geo().blob((1.0, y - 2.0 * (1 if s == "r" else -1), z - 6.0), (13.0, 11.0, 4.0), p=2.8)
    rig.part(f"arm_{s}", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(0, -4.0), (7.4, -3.8), (8.0, 0), (7.4, 3.8), (0, 4.0)], (0, y, z - UPPER), (0, y + 1, z - UPPER),
                    segs=18)
    rig.part(f"fore_{s}", g, F.GUNMETAL, finish="metal")
    g = Geo().blob((0.5, y, z - UPPER - 13.0), (8.8, 8.8, 12.0), p=2.8, taper=(0.85, 1.1))
    rig.part(f"fore_{s}", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((8.6, y - 2.0 * (1 if s == "r" else -1), z - UPPER - 13.0), (1.2, 3.0, 8.0), p=3.0)
    rig.part(f"fore_{s}", g, glow=F.MAGENTA, outline=0)
    x, hy, hz = HAND[s]
    g = Geo().blob((x + 1.0, hy, hz), (8.4, 7.8, 8.0), p=2.6)
    rig.part(f"hand_{s}", g, F.SUIT, finish="gloss")


# -- poses -----------------------------------------------------------------------------------
def legs(foot_r, foot_l, hips=(0.0, 0.0)):
    pose = {}
    for s, (fx_, lift) in (("r", foot_r), ("l", foot_l)):
        tgt = (fx_ - hips[0], ANKLE_H + lift - hips[1])
        pose.update(F.leg_ik(s, (0.0, HIP_Z), tgt, THIGH, SHIN, knee_fwd=True))
    pose["hips"] = {"x": hips[0], "z": hips[1]}
    return pose


def stand(bob=0.0, dx=0.0, spread=0.0):
    return legs((STANCE_X["r"] + spread, 0.0), (STANCE_X["l"] - spread, 0.0), (dx, LIFT + bob))


def arms(ra, rf, rw, la=-70.0, lf=-40.0):
    """Blade arm (upper, fore, blade directions) and the free far arm (torso space)."""
    return merge(F.arm("r", ra, rf, rw, 90.0), F.arm("l", la, lf))


def clock(step, fast=0.0):
    """Clock hands at a playback-independent step (the minute hand ticks 30 degrees)."""
    return {"hand_min": {"rx": -30.0 * step - fast}, "hand_hour": {"rx": -60.0 - 2.5 * step - fast / 12},
            "pendulum": {"r": 12.0 * math.sin(math.pi / 2 * step)}}


REST = arms(-80, -35, 55, -75, -30)


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    pose = merge(stand(1.6 * c), REST, clock(f), {
        "torso": {"r": 1.0 * c}, "head": {"r": -1.5 * lag},
        "arm_r": {"r": 2.0 * lag}, "hand_r": {"r": -2.5 * lag}, "arm_l": {"r": 2.0 * lag},
        "halo": {"rx": 0.0, "r": 5.0 * f},
    })
    if f == 4:
        pose = merge(pose, KF.glyph("g_blink"))
    return pose


# -- walk (ANIM_SPEC G3): ground speed 35 x 1.25 = 43.75 lu/s, 12 frames in 1560 ms (130 ms each: a
# longer cycle gives the Legendary a long enough step that its boots read apart) --------------
SPEED = 43.75
WALK_N, WALK_CYCLE = 12, 1560
LEGS_G = {s: GT.Leg(f"thigh_{s}", f"shin_{s}", (0.0, LEG_Y[s], ANK_REST), foot=f"foot_{s}",
                    toe=(16.0, LEG_Y[s], ANK_REST - 11.0), heel=(-10.0, LEG_Y[s], ANK_REST - 11.0))
          for s in ("r", "l")}
GAIT = GT.Gait(WALK_N, WALK_CYCLE, SPEED, {"r": (LEGS_G["r"], -0.03, 0.0, ANKLE_H),
                                          "l": (LEGS_G["l"], 0.47, -2.0, ANKLE_H)},
               0.60, yaw_deg=YAW_DEG, lift=13.0, kick=3.0, reach=4.0, toe_off=14.0, heel_strike=8.0,
               lift_peak=0.45, early_lift=3.0)
# key poses per half cycle (6 frames): CONTACT (hard, a jolt), DOWN (deep), rise, PASSING, PASSING, UP
W_BOB = [-4.0, -7.5, -4.5, -1.0, 1.0, 1.5]
W_JOLT = [-1.6, -0.6, 0.0, 0.0, 0.0, 0.0]   # torso pitch jolt on the plant (deg, no squash: a machine)
W_SH = [3.0, 3.5, 1.5, 0.0, -1.0, -2.0]     # shoulder roll (deg), the weight side drops on contact


def _walk(f, report=None):
    k = f % 6
    side = 1 if f < 6 else -1                 # the near foot lands on frame 0, the far on 6
    p = 2 * math.pi * f / WALK_N
    lag_k = (f - 1) % 6
    swing = math.cos(2 * math.pi * (f - 1) / WALK_N)    # arms swing against the legs, a frame late
    pose = merge(REST, clock(f), {
        "hips": {"x": 0.0, "z": LIFT + W_BOB[k]},
        "torso": dict(r=-5.0 + 1.5 * math.cos(2 * p) + W_JOLT[k], rz=6.0 * math.sin(p), rx=W_SH[k] * side),
        "head": {"r": 2.0 - 0.6 * W_BOB[lag_k]},
        "arm_r": {"r": -12 * swing}, "fore_r": {"r": -6 * max(0.0, swing)}, "hand_r": {"r": 3 * swing},
        "arm_l": {"r": 14 * swing}, "fore_l": {"r": 6 * max(0.0, -swing)},
        "halo": {"r": 3.3 * f},
        "vent": {"show": k in (0, 1), "s": [0.55, 0.8, 1, 1, 1, 1][k], "z": [0.0, 3.0, 0, 0, 0, 0][k]},
    })
    if k == 0:
        pose = merge(pose, KF.glyph("g_squint"))
    return GT.solve(RIG, pose, GAIT.targets(f), report=report)


# -- attack: clock-hand sweep (heavy timing: impact on pose 6 at 570 of 1230 ms) -------------------
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 0]
#      shift  dip   coil  HOLD  12oc  2oc  SWEEP shock follow recover
RA = [-82, 245, 210, 182, 92, 42, 6, 4, -24, -62]
RF = [-38, 235, 200, 184, 94, 40, 4, 0, -26, -45]
RW = [55, 215, 195, 182, 96, 40, 10, 2, -24, 24]
LA = [-75, -55, -30, -10, -40, -70, -95, -95, -88, -78]
LF = [-30, -20, 0, 15, -30, -60, -70, -72, -60, -35]
TR = [2.0, 6.0, 9.0, 11.0, 2.0, -6.0, -14.0, -15.0, -11.0, -4.0]
TZ = [0, 6.0, 12.0, 18.0, 6.0, -2.0, -4.0, -5.0, -4.0, -1.0]
BOB = [0.0, -4.0, -3.0, -2.0, 1.5, -1.0, -9.0, -8.0, -5.0, -1.5]
DX = [-1.0, -3.0, -4.5, -6.0, -2.0, 2.0, 7.0, 7.0, 5.0, 1.0]
SPREAD = [0, 2.0, 3.0, 4.0, 4.0, 4.0, 7.0, 7.0, 5.0, 2.0]
EYES = ["eyes", "g_angry", "g_angry", "g_angry", "g_squint", "g_squint", "g_angry", "g_angry", "eyes", "eyes"]


def _attack_pose(f):
    pose = merge(stand(BOB[f], DX[f], SPREAD[f]), arms(RA[f], RF[f], RW[f], LA[f], LF[f]),
                 clock(f, fast=[0, 0, 0, 0, 90, 180, 300, 330, 350, 360][f]), {
        "torso": {"r": TR[f], "rz": TZ[f]},
        "head": {"r": -0.4 * TR[f], "rz": -0.6 * TZ[f]},
        "sparks": {"show": f == 6},
        "vent": {"show": f in (7, 8), "s": 1.3 if f == 8 else 1.0, "z": 5.0 if f == 8 else 0.0},
        "halo": {"r": [0, 4, 10, 16, 60, 110, 150, 160, 166, 170][f]},
    })
    if f in (4, 5):
        pose["blade"] = dict(pose.get("blade", {}), sz=1.12)
    return merge(pose, KF.glyph(EYES[f]))


def _attack_clip():
    x, y, z = HAND["r"]
    swing = {"kind": "arc", "joint": "blade", "inner": (x + 4.0, y - 2.0, z + GUARD + BLADE * 0.52), "outer": TIP,
             "color": FW.fx(RIG, SKINS, F.MAGENTA), "white": 0.55, "taper": 0.2, "lines": 3, "t0": 0.0, "t1": 0.95}
    inner = dict(swing, inner=(x + 2.0, y - 2.0, z + GUARD + 16.0), outer=(x + 4.0, y - 2.0, z + GUARD + BLADE * 0.46),
                 white=0.6, lines=0)      # (r26: both crescents narrower: the smear frames sat at flat 0.40)
    ov = {                                            # (W4: the outer crescent two-tone; the inner one stays light)
        4: FW.smear_soft(dict(swing, **{"from": 3})) + [dict(inner, **{"from": 3})],
        5: FW.smear_soft(dict(swing, **{"from": 4})) + [dict(inner, **{"from": 4})],
        # impact: no swing smear here (painted over the frame it hid the level blade behind a
        # magenta wedge at game size); the blade, the tip burst and the dust carry the hit
        6: [{"kind": "burst", "joint": "blade", "point": TIP, "r0_lu": 10.0, "r1_lu": 22.0, "n": 7,
             "a0": -80.0, "arc": 160.0, "color": FW.fx(RIG, SKINS, F.MAGENTA_CORE)},
            {"kind": "dust", "ground": (26.0, 0.0), "size_lu": 10.0, "puffs": 4, "seed": 41, "spread": 1.2,
             "color": "#DDE3E8"},
            {"kind": "dust", "ground": (-22.0, 0.0), "size_lu": 8.0, "puffs": 3, "seed": 42, "spread": 1.0,
             "color": "#DDE3E8", "dir": -1.0}],
        7: [{"kind": "rings", "joint": "torso", "point": DIAL, "radii_lu": (22.0, 32.0), "a0": -60.0, "a1": 60.0,
             "color": FW.fx(RIG, SKINS, F.MAGENTA_CORE)}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, overlays=ov)


# -- attack B: overhead chop from 12 to 6 (heavy timing, A's sequence; impact on frame 6) ----------
# frames: 0 = A shift, 1 lift, 2 rise, 3 HOLD (tall, the blade straight up over its helm), 4-5 smears
# (straight down the front), 6 IMPACT (the blade down in front, a deep lunge), 7 shock, 8 follow, 9 = A
B_RA = [20, 70, 96, 60, 20, -14, -12, -40]
B_RF = [60, 100, 100, 60, 10, -24, -22, -30]
B_RW = [100, 100, 94, 50, 4, -22, -18, -4]
B_LA = [-60, -30, -10, -40, -70, -85, -84, -78]
B_LF = [-30, 0, 20, -10, -50, -70, -68, -50]
B_TR = [3.0, 7.0, 10.0, -2.0, -10.0, -16.0, -15.0, -8.0]
B_BOB = [-3.0, 2.0, 4.0, 1.0, -2.0, -9.0, -8.0, -4.0]
B_DX = [-1.0, -2.5, -3.0, 0.0, 3.0, 7.0, 7.0, 4.0]
B_SPREAD = [2.0, 3.0, 3.0, 4.0, 5.0, 7.0, 7.0, 4.0]
B_EYES = ["g_angry", "g_angry", "g_angry", "g_squint", "g_squint", "g_angry", "g_angry", "eyes"]


def _b_pose(i):
    if i in (0, 9):
        return _attack_pose(i)
    k = i - 1
    pose = merge(stand(B_BOB[k], B_DX[k], B_SPREAD[k]), arms(B_RA[k], B_RF[k], B_RW[k], B_LA[k], B_LF[k]),
                 clock(i, fast=[0, 0, 0, 90, 180, 180, 180, 180][k]), {
        "torso": {"r": B_TR[k]}, "head": {"r": -0.4 * B_TR[k]},
        "sparks": {"show": k == 5},
        "vent": {"show": k in (6, 7), "s": 1.3 if k == 7 else 1.0, "z": 5.0 if k == 7 else 0.0},
        "halo": {"r": [4, 10, 16, 60, 110, 150, 160, 166][k]},
    })
    if k in (3, 4):
        pose["blade"] = dict(pose.get("blade", {}), sz=1.12)
    return merge(pose, KF.glyph(B_EYES[k]))


# -- attack C: thrust --------------------------------------------------------------------------
# frames: 0 = A shift, 1 sink, 2 draw, 3 HOLD (a wide crouch, the blade drawn back level at its hip,
# the free arm out behind), 4-5 smears (the drive), 6 IMPACT (a long straight thrust), 7 shock,
# 8 follow, 9 = A recover
C_RA = [-120, -145, -160, -150, -70, -4, -2, -40]
C_RF = [-40, -10, 0, -5, -10, -6, -4, -25]
C_RW = [20, 6, 2, 0, 8, 14, 14, 22]
C_LA = [-100, -120, -130, -100, -60, -40, -42, -60]
C_LF = [-80, -100, -110, -80, -40, -20, -22, -40]
C_TR = [0.0, 4.0, 6.0, -6.0, -12.0, -16.0, -15.0, -8.0]
C_TZ = [6.0, 14.0, 20.0, 8.0, -4.0, -8.0, -7.0, -3.0]
C_BOB = [-3.0, -6.0, -8.0, -7.0, -6.0, -10.0, -9.0, -4.0]
C_DX = [-2.0, -4.0, -6.0, 0.0, 6.0, 12.0, 11.0, 5.0]
C_SPREAD = [2.0, 4.0, 5.0, 6.0, 7.0, 9.0, 9.0, 4.0]
C_EYES = ["g_angry", "g_angry", "g_angry", "g_squint", "g_squint", "g_angry", "g_angry", "eyes"]


def _c_pose(i):
    if i in (0, 9):
        return _attack_pose(i)
    k = i - 1
    pose = merge(stand(C_BOB[k], C_DX[k], C_SPREAD[k]), arms(C_RA[k], C_RF[k], C_RW[k], C_LA[k], C_LF[k]),
                 clock(i, fast=[0, 0, 0, 60, 150, 270, 300, 330][k]), {
        "torso": {"r": C_TR[k], "rz": C_TZ[k]}, "head": {"r": -0.4 * C_TR[k], "rz": -0.6 * C_TZ[k]},
        "sparks": {"show": k == 5},
        "vent": {"show": k in (6, 7), "s": 1.3 if k == 7 else 1.0, "z": 5.0 if k == 7 else 0.0},
        "halo": {"r": [4, 10, 16, 50, 100, 140, 150, 160][k]},
    })
    if k in (3, 4):
        pose["blade"] = dict(pose.get("blade", {}), sz=1.12)
    return merge(pose, KF.glyph(C_EYES[k]))


def _variant(name, pose_fn, smear):
    hit = [{"kind": "burst", "joint": "blade", "point": TIP, "r0_lu": 10.0, "r1_lu": 22.0, "n": 7,
            "a0": -80.0, "arc": 160.0, "color": FW.fx(RIG, SKINS, F.MAGENTA_CORE)},
           {"kind": "dust", "ground": (26.0, 0.0), "size_lu": 10.0, "puffs": 4, "seed": 111, "spread": 1.2,
            "color": "#DDE3E8"},
           {"kind": "dust", "ground": (-22.0, 0.0), "size_lu": 8.0, "puffs": 3, "seed": 112, "spread": 1.0,
            "color": "#DDE3E8", "dir": -1.0}]
    sm = FW.smear_soft if smear.get("kind") == "arc" else (lambda sp: [sp])          # (W4: two-tone arcs)
    ov = {4: sm(dict(smear, **{"from": 3})), 5: sm(dict(smear, **{"from": 4})), 6: hit,
          7: [{"kind": "rings", "joint": "torso", "point": DIAL, "radii_lu": (22.0, 32.0), "a0": -60.0, "a1": 60.0,
               "color": FW.fx(RIG, SKINS, F.MAGENTA_CORE)}]}
    return M.clip(name, [pose_fn(i) for i in range(10)], M.HEAVY_MELEE_MS, impact=6, sequence=ATTACK_SEQ,
                  overlays=ov, reuse={0: ("attack", 0), 9: ("attack", 9)})


def _attack_b():
    x, y, z = HAND["r"]
    chop = {"kind": "arc", "joint": "blade", "inner": (x + 4.0, y - 2.0, z + GUARD + BLADE * 0.52), "outer": TIP,
            "color": FW.fx(RIG, SKINS, F.MAGENTA), "white": 0.55, "taper": 0.2, "lines": 3, "t0": 0.0, "t1": 0.95}
    return _variant("attack_b", _b_pose, chop)


def _attack_c():
    thrust = {"kind": "streak", "joint": "blade", "point": TIP, "color": FW.fx(RIG, SKINS, F.MAGENTA), "width_lu": 14.0,
              "white": 0.5, "t0": 0.0, "t1": 1.0}
    return _variant("attack_c", _c_pose, thrust)


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(stand(-2.0 * max(a, 0)), REST, clock(0, fast=-20 * a), KF.hit_mech(k, (0, 0, 100), scale=1.4), {
        "torso": {"r": 7 * a}, "head": {"r": 8 * a},
        "arm_r": {"r": 10 * a}, "arm_l": {"r": 14 * a},
        "hit_spark": {"show": k <= 1},
        "vent": {"show": k in (2, 3), "s": 0.8},
    })
    return merge(pose, KF.glyph("g_hurt" if k <= 1 else ("g_angry" if k == 2 else "eyes")))


# D6 fall-apart: 8 unique poses in the 12 heavy steps (moves.DIE_SEQ_HEAVY). It sputters (the clock
# hands spin wild), the halo drops off behind, the knees buckle onto the ground, then it topples
# forward onto its blade arm with a smoke puff.
D_BOB = [-2.0, -8.0, -18.0, -30.0, -38.0, -44.0, -42.0, -45.0]
D_DX = [-3.0, -4.0, -2.0, 1.0, 4.0, 8.0, 8.0, 8.0]
D_TR = [10.0, 4.0, -6.0, -16.0, -30.0, -48.0, -44.0, -50.0]
HALO_PATH = [(0, 0, 0), (0, 0, 20), (-6, -10, 60), (-14, -40, 100), (-22, -80, 140), (-26, -92, 160),
             (-27, -90, 162), (-27, -93, 164)]


def _die(k):
    feet = legs((STANCE_X["r"] + [0, 4, 8, 14, 18, 20, 20, 20][k], 0.0), (STANCE_X["l"] - [0, 2, 4, 6, 8, 8, 8, 8][k], 0.0),
                (D_DX[k], LIFT + D_BOB[k]))
    hx, hz, hr = HALO_PATH[k]
    pose = merge(feet, arms(-60 + [10, 20, 30, 40, 50, 60, 58, 60][k], -30 + [10, 20, 30, 40, 50, 60, 58, 60][k],
                            40 + [0, 0, -5, -5, 10, 30, 28, 30][k],
                            -40 + [20, 30, 40, 60, 70, 80, 78, 80][k], -10 + [0, 10, 20, 30, 40, 50, 50, 50][k]),
                 clock(3, fast=[0, 150, 400, 700, 760, 770, 770, 770][k]), {
        "torso": {"r": D_TR[k]}, "head": {"r": [8, -6, 10, 14, 18, 20, 18, 20][k]},
        "halo": {"x": hx, "z": hz, "r": hr},
        "sparks": {"show": k in (0, 2)},
        "hit_spark": {"show": k in (0, 3)},
        "vent": {"show": k in (1, 2), "s": 1.0},
        "smoke": {"show": k in (5, 6, 7), "s": [1, 1, 1, 1, 1, 0.8, 1.1, 1.25][k], "z": [0, 0, 0, 0, 0, 0, 4, 8][k]},
    })
    g = ["g_wide", "g_hurt", "g_spiral", "g_spiral", "eyes_x", "eyes_x", "eyes_x", "eyes_x"][k]
    return merge(pose, KF.glyph(g))


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [M.IDLE_MS_HEAVY] * 6, loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "heavy"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
