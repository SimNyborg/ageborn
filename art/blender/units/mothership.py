"""Mothership: Cosmic Age Legendary air gunship (docs/design-lane-ages.md A17.11), flyer rig (A11).
Void beam (fx.beam_void, range 180, hits ground and air), Drone Strike every 6 s, crashes on
death. ~172 lu with the pennant. Rendered at the Legendary scale (2.05 px/lu HD).

Look (A17.12, Cosmic palette): a huge disc ship. A wide void and violet saucer whose rim is a
broad team band (the hull stripes), with a ring of mint running lights that turn around the rim,
three dark launch bays with mint glow on the near side, a star-white upper deck stepped up to a
violet superstructure with a team stripe, a glowing violet bridge dome in a star-white frame and
a slim spire with antennas; a mast at the stern flies a big team pennant (follow-through). Under
the hull hangs the tractor ring (a mint glow ring on struts around a void emitter cone), and at
the front of the belly sits the beam emitter. Origin (the feet anchor) is the lowest point; the
battle view lifts air units to flight altitude.

Cartoon kit v2 (art director plan 2026-09-30): the bridge dome is violet glass with the pilot seen
through it (a dark silhouette with mint robot eyes that act: angry on the charge, wide on the
shot, > < when hit, spirals and X in the crash); the drone bay door carries violet chevrons.

Clips: idle hovers (a +-3.6 lu bob, the running lights chase: every third light is bright and the
ring turns, the tractor ring pulses, the pilot blinks), walk is the flight loop (nose-down pitch,
lights chasing faster; walk v3 flight, ANIM_SPEC G8: 6 degrees nose down, the tractor ring pulses
0.85-1.25x on a 2-frame beat, the pennant trails, the odometer runs at the ground speed 50 lu/s; the hover
bob itself is code motion R8), attack BEAM AND DRONE DROP: the nose dips and the drone bay swings open, the
belly emitter charges over three frames with rings (the held extreme, the hull squashed), fires (a
violet flare and a short beam stub with impact lines; the game draws fx.beam_void from the per-frame
`muzzle` anchor), the hull kicks back and a drone drops out of the bay and flies off forward; hit
is the flyer tilt and 4 lu drop with a wobble back up; die is a crash: a 28 degree roll and a
nose-down pitch, the spire snaps off, the running lights go dark quarter by quarter, a mint and white
break-up flash, smoke, and it falls low (the sim does the crash splash). attack_b FORWARD-TILT BEAM PULSE:
no drone, the bay stays shut; the whole saucer tips its nose far down toward the target while the emitter
swells (the held extreme), fires one fat pulse and the recoil throws the nose up into a wobble.

W4 (the detail standard): the team rim band in plates (team-dark hull seams), the star-white deck's radial seams and
rivet rings, the tiers' seams, the belly's seams, bands on the spire; flyer damage spots (dents and scorches, a
smoke trail from the deck). No aimed clips: `aimdata` gives the void beam as an omni emitter.

Classic Saucer (legendary skin, DESIGN A5.8; the puppet's recipe: a 1950s flying saucer, a polished silver hull,
grey rivets, a pale green glass dome). The silhouette sign: one big pale green glass bubble on the deck in place of
the stepped tiers and the bridge, with a little green alien seen through it; rows of grey rivets round the rim and
the deck; the running lights pale green portholes; the rim band stays team.
"""
import math

from ageborn_art import face as FC
from ageborn_art import fx
from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_future as KF
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo
from units import futcos_w4 as FW

SLUG = "mothership"
GAIT_NAME = "fly"
NAME = "Mothership"
HEIGHT_LU = 172
YAW_DEG = -10.0
CANVAS = (440, 480)
FEET = (214, 370)        # room below the feet: the crash ends low
ANCHORS = {"head": (-8, 170), "hitCenter": (0, 70), "muzzle": (44, 22)}
NO_RETIME = True

# W4 detail standard (look.py): the Legendary's big plates take the big shade
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 0.8
# (r39) a clearer light-to-shadow gradient on the big plates, and the violet hull and the team band as plated metal
# (iron's brushed breakup; polymer's 0.03 left the tiers and the band flat): r29 sat at micro 3.20 / 3.28
LOOK_SHADE = dict(FW.SHADE_BIG, gradient=2.7, cavity=0.78)
LOOK_RIM = dict(FW.RIM_SOLDIER, lift=0.5)
MATERIAL_KINDS = FW.kinds_cosmic({"#8667CC": "glass", "#261B40": "cloth", K.SMOKE: "stone", "#8C869A": "stone",
                                  K.VIOLET: "iron", K.VIOLET_DK: "iron", "team": "iron"})

CS = "classic_saucer"
# (r39b: the glass a step deeper, so its white reflections read; r39's #D2EEE2 took them in)
CS_SILVER, CS_SILVER_DK, CS_GREY, CS_GREY_DK, CS_GLASS = "#D8DCE2", "#9AA0AA", "#7A808C", "#5A5E68", "#BCE2CF"
GLASS_BAND = "#26A07C"      # (r39b) the bubble's ground reflection: a key of its own for the skin's palette
CS_LIGHT, CS_LIGHT_CORE, CS_ALIEN = "#CFE8D8", "#F2FFF6", "#5E8A70"
SKINS = {CS: {
    "palette": FW.skin_palette({K.STAR: CS_SILVER, K.STAR_TRIM: CS_SILVER_DK, K.VIOLET: CS_SILVER_DK,
                                K.VIOLET_DK: CS_GREY, K.VIOLET_LT: "#B8BEC8", K.VOID: "#4A4E58", K.VOID_LT: CS_GREY_DK,
                                K.VISOR: "#2A3A32", K.MINT: CS_LIGHT, K.MINT_CORE: CS_LIGHT_CORE, "#2FA884": "#9AB8A6",
                                "#1C8A6A": "#6E8A7A", "#1C6A55": "#5E7A6A", "#8667CC": CS_GLASS, K.VIOLET_GLOW: "#BFE6D0",
                                K.VIOLET_CORE: "#F0FFF6", "#261B40": CS_ALIEN, "#8AF2D2": "#CFEFDC",
                                FW.LINE_ON_STAR: "#A8AEB8", FW.LINE_ON_VIOLET: "#6A707C", GLASS_BAND: "#88AA96"}),
    "kinds": FW.kinds({CS_SILVER: "iron", CS_SILVER_DK: "iron", CS_GREY: "iron", "#B8BEC8": "iron", "#4A4E58": "iron",
                       CS_GREY_DK: "iron", CS_GLASS: "polymer", CS_ALIEN: "hide", "#A8AEB8": "iron", "#6A707C": "iron",
                       "#2A3A32": "glass", "#9AB8A6": "glass", "#88AA96": "polymer", "team": "iron"})}}
# (r39b: the bubble's glass takes polymer's fine speckle, its old glass: as glass (no breakup) it was the skin's
# largest flat field, r39 at micro 3.19; r39d: the alien's skin in hide's blotches, it was one flat green shape)
SCALE = 1.2              # the whole ship: a Legendary towers over the heavies

R = 54.0                  # saucer radius
KR = R / 64.0             # radial scale of the authored saucer details
DZ = 40.0                 # saucer mid height
EMIT = (34.0, -2.0, DZ - 13.0)   # beam emitter at the front of the belly
N_LIGHTS = 12
IDLE_N = 6
WALK_N = 8


def _disc_profile():
    # (radius, z) bottom to top: belly, rim, upper deck
    return [(r * KR, z) for r, z in [(0.0, DZ - 16.0), (20.0, DZ - 15.0), (44.0, DZ - 11.0), (60.0, DZ - 5.0),
                                     (64.0, DZ - 1.0),
            (64.0, DZ + 3.0), (58.0, DZ + 8.0), (40.0, DZ + 13.0), (22.0, DZ + 15.5), (0.0, DZ + 16.0)]]


def build(rig):
    rig.joint("body", "root", (0, 0, 0), scale=SCALE)
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("hull", "body", (0, 0, DZ))
    rig.joint("lights", "hull", (0, 0, DZ))
    for k in range(4):     # quarters of the light ring, so they can go dark in sequence (death)
        rig.joint(f"lights_{k}", "lights", (0, 0, DZ))
    rig.joint("spire", "hull", (-8.0, 4.0, DZ + 34.0))
    rig.joint("tractor", "hull", (0, 0, 14.0))


    # tractor ring under the belly: struts, a mint ring, a void emitter cone with a bright lens
    g = Geo()
    for a in (30, 150, 270):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.capsule((14 * c, 14 * s * 0.8, DZ - 14), (17.5 * c, 17.5 * s * 0.8, 12.0), 1.5, 1.1)
    rig.part("tractor", g, K.STAR_TRIM, finish="metal", outline=0.7)
    g = Geo()
    for i in range(32):
        a0, a1 = 2 * math.pi * i / 32, 2 * math.pi * (i + 1) / 32
        g.capsule((17.5 * math.cos(a0), 17.5 * math.sin(a0) * 0.8, 12.5),
                  (17.5 * math.cos(a1), 17.5 * math.sin(a1) * 0.8, 12.5), 2.0, segs=8, rings=2)
    rig.part("tractor", g, glow=K.MINT, outline=1.0, outline_hex="#1C8A6A")
    g = Geo().lathe([(11.0, 0), (7.6, 12.0), (4.2, 20.0), (0, 22.0)], (0, 0, DZ - 14.0), (0, 0, DZ - 15.0),
                    segs=28, squash=(1.0, 0.85))
    rig.part("hull", g, K.VOID_LT, finish="gloss")
    g = Geo().sphere((0, -1.0, 3.6), 4.2, cuts=4)
    rig.part("tractor", g, glow=K.MINT_CORE, outline=1.0, outline_hex=K.MINT)
    g = Geo().sphere((0.6, -3.4, 3.2), 2.4, cuts=3)        # (r39d) the lens's white-hot heart, proud of it
    rig.part("tractor", g, glow=K.WHITE, outline=0)

    # the saucer: violet belly, a broad team rim band, star-white upper deck
    prof = _disc_profile()
    g = Geo().lathe(prof, segs=48, squash=(1.0, 1.0))
    rig.part("hull", g, K.VIOLET_DK, finish="gloss")
    g = Geo().lathe([(r * 1.012, z) for r, z in prof], segs=48, squash=(1.0, 1.0))
    g.clip((0, 0, DZ + 6.0), (0, 0, 1)).clip((0, 0, DZ - 7.5), (0, 0, -1))
    rig.part("hull", g, team=True)
    g = Geo().lathe([(r * 1.004, z) for r, z in prof], segs=48, squash=(1.0, 1.0))
    g.clip((0, 0, DZ + 6.0), (0, 0, -1))
    rig.part("hull", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    # deck panel rings and hatches
    g = Geo()
    for r0, z in ((50.0 * KR, DZ + 10.4), (41.0 * KR, DZ + 13.2)):
        g.lathe([(r0 - 2.2, -0.6), (r0, -0.6), (r0, 0.6), (r0 - 2.2, 0.6)], (0, 0, z), (0, 0, z + 1), segs=48)
    if getattr(rig, "skin", None) == CS:
        # (r39b) the Classic Saucer's deck rings are team stripes round the silver deck (the tiers' team stripe is gone
        # in the skin: die 03's team share fell to 16.7%)
        rig.part("hull", g, team=True, outline=0)
    else:
        rig.part("hull", g, K.VIOLET_LT, finish="gloss", outline=0)
    g = Geo()
    for a in (-150, -110, -70, -30, 20, 160):
        c, s_ = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.blob((45.5 * KR * c, 45.5 * KR * s_, DZ + 12.4), (3.2, 2.0, 0.8), p=3.0, rot=(0, 0, a + 90))
    rig.part("hull", g, glow=K.MINT, outline=0.6, outline_hex=K.VOID)
    # belly panel ring
    g = Geo().lathe([(30.0, -0.8), (40.0, -0.8), (40.0, 0.8), (30.0, 0.8)], (0, 0, DZ - 12.6), (0, 0, DZ - 11.6),
                    segs=40, squash=(1.0, 1.0))
    rig.part("hull", g, K.VOID, outline=0)
    # running lights on a turning joint: every third light is bright, so the ring visibly chases
    for k in range(4):
        hi, lo = Geo(), Geo()
        for i in range(k * 3, k * 3 + 3):
            a = 2 * math.pi * i / N_LIGHTS
            (hi if i % 3 == 0 else lo).sphere((R * 1.02 * math.cos(a), R * 1.02 * math.sin(a), DZ + 1.0),
                                              2.3 if i % 3 == 0 else 1.7, cuts=3)
        rig.part(f"lights_{k}", hi, glow=K.MINT_CORE, outline=0.8, outline_hex=K.MINT)
        rig.part(f"lights_{k}", lo, glow="#2FA884", outline=0.6, outline_hex="#1C6A55")
    # launch bays on the near rim (dark mouths with a mint glow inside)
    for k, a in enumerate((-120, -90, -60)):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        x, y = (R + 0.4) * c, (R + 0.4) * s
        g = Geo().blob((x, y, DZ - 3.6), (5.2, 1.6, 2.6), p=3.4, rot=(0, 0, a + 90))
        rig.part("hull", g, K.VISOR, finish="gloss", outline=0.6, outline_hex=K.VOID)
        g = Geo().blob((x * 1.006, y * 1.006 - 0.6, DZ - 3.8), (3.6, 1.0, 1.2), p=3.0, rot=(0, 0, a + 90))
        rig.part("hull", g, glow=K.MINT, outline=0)

    # superstructure: stepped violet tiers with a team stripe, bridge dome, spire
    saucer = getattr(rig, "skin", None) == CS
    if saucer:
        _bubble(rig)
    g = Geo()
    g.lathe([(r * KR, z) for r, z in ((0, DZ + 14.0), (36.0, DZ + 14.0), (34.0, DZ + 22.0), (26.0, DZ + 26.0),
                                      (0, DZ + 26.5))], segs=36,
            squash=(1.0, 1.0))
    if not saucer:
        rig.part("hull", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
        g = Geo().lathe([(r * KR, z) for r, z in ((35.4, -2.0), (35.8, -1.0), (35.0, 2.0), (34.4, 2.4))], (0, 0, DZ + 18.0),
                        (0, 0, DZ + 19.0), segs=36, squash=(1.0, 1.0))
        rig.part("hull", g, team=True, outline=0.6)
        g = Geo().lathe([(r * KR, z) for r, z in ((0, DZ + 26.0), (22.0, DZ + 26.0), (21.0, DZ + 32.0), (16.0, DZ + 35.0),
                                                    (0, DZ + 35.5))],
                        segs=32, squash=(1.0, 1.0))
        rig.part("hull", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
        _bridge(rig)
    # spire with antenna rings and the team pennant (the Legendary's team cue) near the top
    sx, sy = -8.0, 4.0
    g = Geo().lathe([(7.0, 0), (5.6, 10.0), (2.6, 34.0), (1.5, 60.0), (0, 63.0)], (sx, sy, DZ + 34.0),
                    (sx, sy, DZ + 97.0), segs=16)
    rig.part("spire", g, K.STAR_TRIM, finish="metal", outline_hex=K.VOID_LT)
    g = Geo()
    for z, r in ((DZ + 52.0, 7.0), (DZ + 66.0, 5.2)):
        g.lathe([(0, -0.9), (r, -0.8), (r, 0.8), (0, 0.9)], (sx, sy, z), (sx, sy, z + 1), segs=20)
    rig.part("spire", g, glow=K.MINT, outline=0.8, outline_hex=K.VOID)
    g = Geo().capsule((sx, sy, DZ + 58.0), (sx + 9.0, sy, DZ + 62.0), 0.8)
    g.capsule((sx, sy, DZ + 72.0), (sx - 7.0, sy, DZ + 75.0), 0.7)
    rig.part("spire", g, K.STAR_TRIM, finish="metal", outline=0.5)
    g = Geo().sphere((sx, sy, DZ + 98.0), 2.4, cuts=3)
    rig.part("spire", g, glow=K.MINT, outline=0.8, outline_hex=K.VOID)
    top = (sx - 1.0, sy, DZ + 93.0)
    rig.secondary("pennant", "spire", top, (top[0] - 26.0, sy, top[2] - 4.0), max_deg=14, gain=1.1, rot_gain=0.6)
    pts = [(0.0, 0.0), (-28.0, -1.5), (-20.0, -7.0), (-28.0, -12.5), (0.0, -14.0)]
    g = Geo().slab([(top[0] + a, top[2] + b) for a, b in pts], sy, 1.4)
    rig.part("pennant", g, team=True, outline=0.8)

    # beam emitter at the front of the belly
    ex, ey, ez = EMIT
    g = Geo().lathe([(0, 0), (6.0, 0.2), (6.4, 3.0), (4.6, 5.0), (0, 5.2)], (ex - 3.0, ey, ez + 4.0),
                    (ex + 1.0, ey, ez - 1.0), segs=18)
    rig.part("hull", g, K.VOID_LT, finish="gloss")
    g = Geo().sphere((ex + 1.0, ey - 0.5, ez - 1.0), 3.0, cuts=3)
    rig.part("hull", g, glow=K.VIOLET_GLOW, outline=0.8, outline_hex=K.VIOLET)
    K.orb(rig, "hull", (ex + 3.0, ey - 1.0, ez - 3.0), 5.2, color=K.MINT, core=K.MINT_CORE,
          name="charge", hidden=True, line="#1C8A6A")
    rig.joint("charge_glow", "hull", (ex + 3.0, ey - 1.0, ez - 3.0), hidden=True)
    g = Geo().star((ex + 3.0, ey - 7.0, ez - 3.0), 16.0, 4.4, 1.2, points=8)
    rig.part("charge_glow", g, glow="#8AF2D2", outline=0)
    # the drone bay on the near rim (a = -90): a hinged door that swings down, and a drone
    bx, by, bz = 0.0, -(R + 0.6), DZ - 3.6
    rig.joint("bay_door", "hull", (bx, by - 0.4, bz - 2.4))
    g = Geo().blob((bx, by - 1.0, bz), (6.2, 1.2, 3.2), p=3.4)
    rig.part("bay_door", g, K.STAR_TRIM, finish="gloss", outline=0.6, outline_hex=K.VOID)
    g = Geo()
    for dx in (-3.6, 0.0, 3.6):
        g.blob((bx + dx, by - 2.2, bz), (1.0, 0.4, 2.2), p=2.4, rot=(0, 20, 0))
    rig.part("bay_door", g, K.VIOLET, finish="gloss", outline=0)
    rig.joint("drone", "hull", (bx, by - 4.0, bz), hidden=True, scale=1.6)
    g = Geo().blob((bx, by - 4.0, bz), (6.4, 5.0, 2.2), p=2.4)
    rig.part("drone", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((bx, by - 4.0, bz + 1.6), (3.2, 2.8, 2.0), p=2.4)
    rig.part("drone", g, team=True, outline=0.6)
    g = Geo().sphere((bx + 4.6, by - 7.6, bz - 0.2), 1.5, cuts=3)
    g.sphere((bx - 4.6, by - 6.0, bz - 0.8), 1.1, cuts=2)
    rig.part("drone", g, glow=K.MINT, outline=0.6, outline_hex=K.VOID)
    rig.joint("flash", "hull", (ex + 3.0, ey, ez - 3.0), hidden=True)
    g = Geo().star((ex + 5.0, ey - 5, ez - 4.0), 14.0, 5.0, 1.4, points=6)
    rig.part("flash", g, glow=K.VIOLET_GLOW, outline=0)
    g = Geo().blob((ex + 22.0, ey - 4, ez - 12.0), (18.0, 2.0, 3.6), p=2.0, rot=(0, 28, 0))
    rig.part("flash", g, glow=K.VIOLET_GLOW, outline=0)
    g = Geo().blob((ex + 20.0, ey - 5.5, ez - 11.0), (15.0, 1.6, 1.6), p=2.0, rot=(0, 28, 0))
    g.sphere((ex + 4.0, ey - 7, ez - 3.0), 5.2, cuts=3)
    rig.part("flash", g, glow=K.VIOLET_CORE, outline=0)
    rig.track("muzzle", "hull", (ex + 3.0, ey, ez - 3.0))
    rig.track("_foot", "odo", (0, 0, 0))

    # death: a mint and white break-up flash on the near deck
    rig.joint("breakup", "hull", (6.0, -34.0, DZ + 8.0), hidden=True)
    g = Geo().star((6.0, -44.0, DZ + 8.0), 30.0, 9.0, 1.6, points=8)
    rig.part("breakup", g, glow="#8AF2D2", outline=0)
    # (r39c) the flash's heart in three steps toward white, each standing proud of the one behind it (one flat white
    # disc held the crash frames' micro under 3.0 in the Classic Saucer)
    for r, y, col in ((11.0, -46.0, "#8AF2D2"), (7.6, -50.0, "#C6F8E6"), (4.2, -54.0, K.WHITE)):
        g = Geo().sphere((6.0, y, DZ + 8.0), r, cuts=4)
        rig.part("breakup", g, glow=col, outline=0)
    # damage: sparks on the deck and smoke (death)
    K.sparks(rig, "hull", (20.0, -30.0, DZ + 10.0), color=K.MINT, size=2.0, name="sparks")
    rig.joint("smoke", "hull", (-10.0, -30.0, DZ + 30.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 9.0), (10, 6, 7.4), (-8, 9, 7.0), (4, 16, 6.2), (-14, 2, 6.0)):
        g.sphere((-10.0 + dx, -30.0, DZ + 30.0 + dz), r, cuts=4)
    rig.part("smoke", g, "#8C869A", finish="dust", outline=0.8)
    _detail(rig)
    if getattr(rig, "skin", None) is None:
        _damage_spots(rig)


def _bridge(rig):
    """The base's bridge dome: dark violet glass in a star-white frame, a glint, the pilot seen through it."""
    # through it (a pale silhouette with mint robot eyes that act)
    dome = Geo().blob((5.0, 0, DZ + 36.0), (15.5, 13.0, 12.6), p=2.2)
    dome.clip((0, 0, DZ + 34.0), (0, 0, -1))
    pf = FC.Face(rig, "hull", [dome])
    g = Geo()
    c = pf.hit(6.4, DZ + 40.6) + pf.view * 0.2
    pf.decal(g, c, FC.ellipse(0.0, 0.6, 4.6, 5.0, 18), 0.3)                       # helmeted head
    pf.decal(g, c, [(-8.4, -8.4), (-7.0, -4.2), (-3.2, -3.0), (3.4, -3.0), (6.6, -4.4), (8.0, -8.4)], 0.3)  # shoulders
    rig.part("hull", g, "#261B40", highlight=False, outline=0)
    KF.visor_face(rig, "hull", [dome], (8.6, DZ + 41.2), eye_dx=(0.0, -3.0), eye_rx=1.5, eye_rz=1.9,
                  color=K.MINT, core=K.MINT_CORE)
    rig.part("hull", dome, "#8667CC", finish="gloss", outline=1.0, outline_hex=K.VIOLET_DK)
    g = Geo().blob((4.0, -8.6, DZ + 44.5), (3.6, 2.2, 2.0), p=2.2)
    rig.part("hull", g, glow=K.VIOLET_CORE, outline=0)
    g = Geo()
    for a in (-140, 140, 180):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.capsule((5 + 15.4 * c * 0.98, 13.0 * s, DZ + 34.0), (5 + 6 * c, 5.0 * s, DZ + 47.6), 1.0, 0.8, segs=8)
    g.lathe([(15.0, -0.8), (16.4, -0.6), (16.4, 0.8), (15.0, 1.0)], (5.0, 0, DZ + 34.2), (5.0, 0, DZ + 35.2), segs=36,
            squash=(1.0, 13.4 / 16.0))
    rig.part("hull", g, K.STAR, finish="gloss", outline=0.6, outline_hex=K.STAR_TRIM)


def _bubble(rig):
    """The Classic Saucer's bubble: one big pale green glass dome on the deck (in place of the tiers and the bridge) with
    a silver rim ring, and the little green alien seen through it (a big head, two antennae, the act-out eyes)."""
    dome = Geo().blob((2.0, 0, DZ + 14.0), (25.0, 21.0, 21.0), p=2.1)
    dome.clip((0, 0, DZ + 14.0), (0, 0, -1))
    pf = FC.Face(rig, "hull", [dome])
    g = Geo()
    c = pf.hit(6.0, DZ + 22.0) + pf.view * 0.2
    pf.decal(g, c, FC.ellipse(0.0, 2.0, 6.2, 5.6, 20), 0.3)                                     # the big head
    pf.decal(g, c, [(-9.0, -7.6), (-7.2, -3.4), (-3.4, -2.6), (3.4, -2.6), (7.2, -3.4), (9.0, -7.6)], 0.3)  # shoulders
    for dx in (-3.0, 3.0):
        pf.stroke(g, c, [(dx, 7.0), (dx * 1.6, 11.6)], 0.9, 0.3)                                   # antennae
    rig.part("hull", g, "#261B40", highlight=False, outline=0)
    KF.visor_face(rig, "hull", [dome], (10.4, DZ + 23.4), eye_dx=(0.0, -3.4), eye_rx=1.8, eye_rz=2.2,
                  color=K.MINT, core=K.MINT_CORE)
    rig.part("hull", dome, "#8667CC", finish="gloss", outline=1.0, outline_hex=K.VIOLET_DK)
    g = Geo().blob((-4.0, -12.0, DZ + 28.0), (5.0, 2.4, 3.0), p=2.2)
    rig.part("hull", g, glow=K.VIOLET_CORE, outline=0)                                          # the glass's glint
    # (r39) the glass reads as glass: a long curved window reflection over the crown, a thinner one under it, and the
    # ground's reflection, a darker green band, round the dome's foot (the bubble was the skin's largest flat field)
    gc = pf.hit(2.0, DZ + 26.0) + pf.view * 0.25
    g = Geo()
    pf.stroke(g, gc, [(-16.0, -2.4), (-12.4, 3.6), (-6.0, 7.4), (2.0, 8.6)], 1.6, 0.3)
    pf.stroke(g, gc, [(-13.2, -4.2), (-9.6, 1.0), (-4.4, 4.2)], 0.9, 0.3)
    pf.stroke(g, gc, [(-21.4, -6.0), (-19.6, 0.4), (-14.6, 6.6), (-7.0, 10.6)], 0.7, 0.3)     # (r39b: a rim arc)
    pf.stroke(g, gc, [(15.0, -6.4), (17.4, -1.6), (17.8, 3.0)], 0.8, 0.3)                       # (r39d: the far side's
    pf.stroke(g, gc, [(9.0, 9.4), (12.6, 7.6)], 0.6, 0.3)                                       # glints)
    rig.part("hull", g, glow=K.WHITE, outline=0)       # (r39b: white, not VIOLET_CORE's #F0FFF6 on the pale glass)
    g = Geo()
    pf.stroke(g, gc, [(-20.0, -9.4), (-10.0, -10.4), (2.0, -10.8), (14.0, -10.4), (21.0, -9.4)], 1.8, 0.3)
    rig.part("hull", g, GLASS_BAND, highlight=False, outline=0)
    # (r39) the rim ring at the bubble's foot is a team collar (the stepped tiers' team stripe is gone in the skin:
    # the team share fell to 15.6%)
    g = Geo().lathe([(24.0, -2.2), (26.6, -2.0), (26.6, 2.2), (24.0, 2.4)], (2.0, 0, DZ + 14.0), (2.0, 0, DZ + 15.0),
                    segs=40, squash=(1.0, 21.0 / 25.0))
    rig.part("hull", g, team=True, outline=0.6)


def _rim_pts(r, z, a):
    return (r * math.cos(math.radians(a)), r * math.sin(math.radians(a)), z)


def _detail(rig):
    """W4: the team rim band's hull seams (team-dark), the deck's radial seams between the hatches and a rivet ring,
    the belly's seams, the tiers' seams (the base), bands round the spire (char space; decals cast)."""
    saucer = getattr(rig, "skin", None) == CS
    prof = _disc_profile()
    band = Geo().lathe([(r * 1.012, z) for r, z in prof], segs=48, squash=(1.0, 1.0))
    bf = FC.Face(rig, "hull", [band], yaw_deg=YAW_DEG)
    seams = []
    for a in [x / 2 for x in range(-330, -20, 15)]:          # (r39: every 7.5 degrees, not 15)
        p0, p1 = _rim_pts(R * 1.012, DZ + 5.2, a), _rim_pts(R * 1.012, DZ - 6.4, a)
        seams.append([FW.sc(bf, p0[0], p0[2], p0[1]), FW.sc(bf, p1[0], p1[2], p1[1])])
    # (r39) and a seam along the band's middle, so the plates are two rows of hull stripes
    seams.append([FW.sc(bf, *(lambda p: (p[0], p[2], p[1]))(_rim_pts(R * 1.012, DZ - 0.6, a))) for a in range(-170, -9, 8)])
    FW.folds(rig, "hull", bf, seams, w=1.0, team=True)
    deck = Geo().lathe([(r * 1.004, z) for r, z in prof], segs=48, squash=(1.0, 1.0))
    df = FC.Face(rig, "hull", [deck], yaw_deg=YAW_DEG)
    radial = []
    for a in range(-170, -5, 10):                            # (r39: every 10 degrees, not 20)
        p0, p1 = _rim_pts(R * 0.95, DZ + 6.6, a), _rim_pts(R * 0.72, DZ + 11.4, a)
        radial.append([FW.sc(df, p0[0], p0[2], p0[1]), FW.sc(df, p1[0], p1[2], p1[1])])
    FW.panel_lines(rig, "hull", df, radial, fill=FW.LINE_ON_STAR, w=1.0)
    rv = [_rim_pts(R * 0.88, DZ + 8.4, a) for a in range(-170, -5, 10)]
    rv += [_rim_pts(R * 0.77, DZ + 10.6, a) for a in range(-165, -10, 10)]     # (r39: a second rivet ring)
    FW.rivets(rig, "hull", df, [FW.sc(df, x, z, y) for x, y, z in rv], r=1.1,
              fill=K.STAR_TRIM if not saucer else K.VIOLET_DK, finish="metal")
    belly = Geo().lathe(prof, segs=48, squash=(1.0, 1.0))
    lf = FC.Face(rig, "hull", [belly], yaw_deg=YAW_DEG)
    under = []
    for a in [x / 2 for x in range(-325, -25, 25)]:          # (r39: every 12.5 degrees, not 25)
        p0, p1 = _rim_pts(R * 0.96, DZ - 6.8, a), _rim_pts(R * 0.62, DZ - 11.6, a)
        under.append([FW.sc(lf, p0[0], p0[2], p0[1]), FW.sc(lf, p1[0], p1[2], p1[1])])
    FW.panel_lines(rig, "hull", lf, under, fill=FW.LINE_ON_VIOLET, w=1.0)
    if saucer:
        rv = [_rim_pts(R * 1.02, DZ - 6.0, a) for a in range(-170, -5, 8)]
        FW.rivets(rig, "hull", bf, [FW.sc(bf, x, z, y) for x, y, z in rv], r=0.9, fill=K.VIOLET_DK, finish="metal")
    else:
        tier = Geo().lathe([(r * KR, z) for r, z in ((0, DZ + 14.0), (36.0, DZ + 14.0), (34.0, DZ + 22.0), (26.0, DZ + 26.0),
                                                     (0, DZ + 26.5))], segs=36, squash=(1.0, 1.0))
        tf = FC.Face(rig, "hull", [tier], yaw_deg=YAW_DEG)
        ts = []
        for a in range(-150, -20, 13):                        # (r39: every 13 degrees, not 26)
            p0, p1 = _rim_pts(34.4 * KR, DZ + 21.0, a), _rim_pts(29.0 * KR, DZ + 24.6, a)
            ts.append([FW.sc(tf, p0[0], p0[2], p0[1]), FW.sc(tf, p1[0], p1[2], p1[1])])
        # (r39) a ring seam round the tier under its top, and the star-white collar under the bridge in plates
        ts.append([FW.sc(tf, *(lambda p: (p[0], p[2], p[1]))(_rim_pts(31.6 * KR, DZ + 23.2, a))) for a in range(-160, -19, 10)])
        FW.panel_lines(rig, "hull", tf, ts, fill=FW.LINE_ON_VIOLET, w=1.0)
        collar = Geo().lathe([(r * KR, z) for r, z in ((0, DZ + 26.0), (22.0, DZ + 26.0), (21.0, DZ + 32.0),
                                                       (16.0, DZ + 35.0), (0, DZ + 35.5))], segs=32, squash=(1.0, 1.0))
        cf = FC.Face(rig, "hull", [collar], yaw_deg=YAW_DEG)
        cs = []
        for a in range(-150, -25, 20):
            p0, p1 = _rim_pts(21.6 * KR, DZ + 27.6, a), _rim_pts(19.6 * KR, DZ + 33.0, a)
            cs.append([FW.sc(cf, p0[0], p0[2], p0[1]), FW.sc(cf, p1[0], p1[2], p1[1])])
        FW.panel_lines(rig, "hull", cf, cs, fill=FW.LINE_ON_STAR, w=0.9)
    sx, sy = -8.0, 4.0
    g = Geo()
    # (r39c: four more bands up the spire, which was one flat grey field in the Classic Saucer)
    for z, r in ((DZ + 37.0, 6.6), (DZ + 40.0, 5.0), (DZ + 46.0, 4.4), (DZ + 56.0, 4.25), (DZ + 62.0, 3.5),
                 (DZ + 70.0, 2.65), (DZ + 78.0, 2.35)):
        g.lathe([(0, -0.4), (r, -0.35), (r, 0.35), (0, 0.4)], (sx, sy, z), (sx, sy, z + 1), segs=16)
    rig.part("spire", g, FW.LINE_ON_VIOLET, outline=0, highlight=False)
    # (r39d) the spire's foot in plates: seams up its camera side between the bands
    sp = Geo().lathe([(7.0, 0), (5.6, 10.0), (2.6, 34.0), (1.5, 60.0), (0, 63.0)], (sx, sy, DZ + 34.0), (sx, sy, DZ + 97.0),
                     segs=16)
    spf = FC.Face(rig, "spire", [sp], yaw_deg=YAW_DEG)

    def spr(zz):
        return 7.0 - 0.14 * zz if zz <= 10.0 else 5.6 - 0.125 * (zz - 10.0)
    FW.panel_lines(rig, "spire", spf, [[FW.sc(spf, sx + spr(zz) * math.cos(math.radians(a)), DZ + 34.0 + zz,
                                              sy + spr(zz) * math.sin(math.radians(a))) for zz in (1.6, 8.0, 15.0, 22.0)]
                                       for a in (-150, -120, -90, -60, -30)], fill=FW.LINE_ON_VIOLET, w=0.7)
    # (r39) the team pennant's folds (team-dark): it was one flat team field at the top of every frame
    top = (sx - 1.0, sy, DZ + 93.0)
    pts = [(0.0, 0.0), (-28.0, -1.5), (-20.0, -7.0), (-28.0, -12.5), (0.0, -14.0)]
    pf = FC.Face(rig, "pennant", [Geo().slab([(top[0] + a, top[2] + b) for a, b in pts], sy, 1.4)], yaw_deg=YAW_DEG)
    FW.folds(rig, "pennant", pf, [[FW.sc(pf, top[0] + a + da, top[2] + b, sy - 0.7) for da, b in
                                   ((0.0, -0.9), (-0.9, -4.6), (0.4, -8.6), (-0.4, -12.6))] for a in (-5.0, -11.0, -16.6)],
             w=0.9, team=True)
    if saucer:
        # (r39d) the Classic Saucer: two more pennant folds, a second rivet row along the rim band's top
        FW.folds(rig, "pennant", pf, [[FW.sc(pf, top[0] + a + da, top[2] + b, sy - 0.7) for da, b in
                                       ((0.0, -1.2), (-0.7, -4.8), (0.3, -8.4), (-0.3, -12.2))] for a in (-8.2, -13.8)],
                 w=0.8, team=True)
        rv = [_rim_pts(R * 1.012, DZ + 4.0, a) for a in range(-166, -9, 8)]
        FW.rivets(rig, "hull", bf, [FW.sc(bf, x, z, y) for x, y, z in rv], r=0.8, fill=K.VIOLET_DK, finish="metal")


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, flyer: dents and scorches, a smoke trail): the team rim band (r 9, its
    largest team field), the star-white deck, the belly, the near tier; smoke from the deck."""
    rig.damage_spot("rim", "hull", _rim_pts(R * 1.02, DZ - 1.0, -100.0), 9.0, "metal", team=True, normal=(-0.17, -0.98, 0))
    rig.damage_spot("deck", "hull", _rim_pts(R * 0.84, DZ + 9.2, -60.0), 7.0, "metal", normal=(0.2, -0.5, 0.85))
    rig.damage_spot("belly", "hull", _rim_pts(R * 0.9, DZ - 8.0, -120.0), 6.0, "metal", normal=(-0.2, -0.6, -0.75))
    rig.damage_spot("tier", "hull", _rim_pts(33.0 * KR, DZ + 20.0, -95.0), 6.0, "metal", normal=(0, -0.9, 0.4))
    rig.damage_spot("smoke", "hull", (-14.0, -20.0, DZ + 14.0), 7.0, "smoke", kind="emit", normal=(0, 0, 1))


# -- poses ---------------------------------------------------------------------------------
def _lights(k):
    return {"lights": {"rz": k}}


def _idle(f):
    # a +-3.6 lu hover bob; the light ring chases a quarter turn per loop (the bright lights move
    # one bright-to-bright step); the pilot blinks once
    ph = 2 * math.pi * f / IDLE_N
    pose = merge(_lights(90.0 * f / IDLE_N), {
        "body": {"z": 3.6 * math.sin(ph)},
        "hull": {"r": 1.0 * math.sin(ph - 0.9)},
        "tractor": dict(squash(0.05 * math.sin(ph + 1.0)), s=1.0 + 0.05 * math.sin(ph)),
    })
    if f == 4:
        pose = merge(pose, KF.glyph("g_blink"))
    return pose


WALK_MS = 100


PULSE = [1.25, 0.85, 1.18, 0.9, 1.25, 0.85, 1.18, 0.9]


def _walk(f):
    p = 2 * math.pi * f / WALK_N
    a = 50.0 * (WALK_N * WALK_MS / 1000.0) / 4.0     # odo: ground speed 40 x 1.25 = 50 lu/s
    return merge(_lights(180.0 * f / WALK_N), {
        "odo": {"x": a * math.cos(p)},
        "body": {"z": 1.0 * math.sin(p)},
        "hull": {"r": -6.0 + 0.8 * math.sin(p - 0.8)},
        "tractor": dict(squash(0.06 * (PULSE[f] - 1.0)), r=5.0 + 3.0 * math.sin(p - 1.6), s=PULSE[f]),
    })


# -- attack: beam and drone drop (841 ms, impact at 408 ms = 0.4851, as shipped) --------------------
ATTACK_MS = [60, 80, 100, 168, 100, 90, 80, 80, 83]
ATTACK_IMPACT = 4
#        dip   charge charge HOLD  FIRE  kick  drone drone settle
BODY_Z = [-1.0, -1.5, -2.0, -2.5, 1.5, 3.0, 1.5, 0.5, 0.0]
BODY_X = [0.5, 1.0, 1.0, 1.5, -2.0, -4.5, -2.5, -1.0, 0.0]
HULL_R = [-3.0, -3.5, -4.0, -4.5, 1.5, 3.5, 1.5, 0.0, -0.5]
HULL_Q = [-0.01, -0.02, -0.03, -0.05, 0.05, -0.02, 0.01, 0.0, 0.0]
CHG = [0.0, 0.45, 0.85, 1.35, 0, 0, 0, 0, 0]
GLOW = [0.0, 0.0, 0.7, 1.2, 0, 0, 0, 0, 0]
DOOR = [15, 40, 65, 85, 90, 90, 60, 25, 5]
DRONE = [None, None, None, (0, 0, -1, 0), (6, -4, -8, -10), (14, -6, -13, -16), (26, -8, -14, -8),
         (42, -8, -12, 0), None]
EYES = ["g_angry", "g_angry", "g_squint", "g_squint", "g_wide", "g_hurt", "eyes", "g_happy", "eyes"]


def _attack_pose(f):
    pose = merge(_lights(8.0 * f), {
        "body": {"z": BODY_Z[f], "x": BODY_X[f]},
        "hull": dict(squash(HULL_Q[f]), r=HULL_R[f]),
        "charge": {"show": CHG[f] > 0, "s": max(CHG[f], 0.01)},
        "charge_glow": {"show": GLOW[f] > 0, "s": max(GLOW[f], 0.01)},
        "flash": {"show": f == 4},
        "bay_door": {"rx": DOOR[f]},
    })
    if DRONE[f] is not None:
        x, y, z, r = DRONE[f]
        pose["drone"] = {"show": True, "x": x, "y": y, "z": z, "r": r}
    return merge(pose, KF.glyph(EYES[f]))


def _attack_clip():
    ex, ey, ez = EMIT
    ov = {
        2: [{"kind": "rings", "joint": "hull", "point": (ex + 3.0, ey, ez - 3.0), "radii_lu": (8.0,), "a0": -180.0,
             "a1": 180.0, "color": K.MINT_CORE}],
        3: [{"kind": "rings", "joint": "hull", "point": (ex + 3.0, ey, ez - 3.0), "radii_lu": (9.5, 14.0),
             "a0": -180.0, "a1": 180.0, "color": K.MINT_CORE}],
        4: [{"kind": "burst", "joint": "hull", "point": (ex + 6.0, ey, ez - 5.0), "r0_lu": 10.0, "r1_lu": 18.0,
             "n": 7, "a0": -110.0, "arc": 150.0, "color": K.VIOLET_CORE}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov)


# -- attack B: forward-tilt beam pulse (A's steps: 841 ms, the beam at 408 ms), no drone ----------------
# 0 = A dip, 1 tilt, 2 charge, 3 HOLD (the nose tipped far down at the target, the emitter swollen, the
# bay shut), 4 FIRE (one fat pulse), 5 recoil (nose thrown up), 6 wobble, 7 recover, 8 = A settle
B_Z = [-1.0, -2.0, -3.0, -3.5, 0.5, 3.0, 1.0, 0.0, 0.0]
B_X = [0.5, 1.5, 2.5, 3.0, 0.0, -4.0, -2.0, -0.5, 0.0]
B_R = [-3.0, -8.0, -12.0, -15.0, -10.0, 5.0, -2.0, 0.5, -0.5]
B_Q = [0.0, -0.02, -0.04, -0.06, 0.06, -0.03, 0.02, 0.0, 0.0]
B_CHG = [0.0, 0.5, 0.95, 1.6, 0, 0, 0, 0, 0]
B_GLOW = [0.0, 0.3, 0.8, 1.4, 0, 0, 0, 0, 0]
B_EYES = ["g_angry", "g_angry", "g_squint", "g_angry", "g_wide", "g_hurt", "eyes", "g_happy", "eyes"]


def _b_pose(f):
    if f in (0, 8):
        return _attack_pose(f)
    pose = merge(_lights(10.0 * f), {
        "body": {"z": B_Z[f], "x": B_X[f]},
        "hull": dict(squash(B_Q[f]), r=B_R[f]),
        "tractor": {"r": [0, 6, 10, 12, 4, -8, 3, 0, 0][f], "s": 1.0 + 0.15 * B_GLOW[f]},
        "charge": {"show": B_CHG[f] > 0, "s": max(B_CHG[f], 0.01)},
        "charge_glow": {"show": B_GLOW[f] > 0, "s": max(B_GLOW[f], 0.01)},
        "flash": {"show": f == 4, "s": 1.25},
        "bay_door": {"rx": 5},
    })
    return merge(pose, KF.glyph(B_EYES[f]))


def _attack_b():
    ex, ey, ez = EMIT
    ov = {
        2: [{"kind": "rings", "joint": "hull", "point": (ex + 3.0, ey, ez - 3.0), "radii_lu": (8.5,), "a0": -180.0,
             "a1": 180.0, "color": K.VIOLET_CORE}],
        3: [{"kind": "rings", "joint": "hull", "point": (ex + 3.0, ey, ez - 3.0), "radii_lu": (10.0, 15.0, 20.0),
             "a0": -180.0, "a1": 180.0, "color": K.VIOLET_CORE}],
        4: [{"kind": "burst", "joint": "hull", "point": (ex + 6.0, ey, ez - 5.0), "r0_lu": 12.0, "r1_lu": 22.0,
             "n": 8, "a0": -130.0, "arc": 160.0, "color": K.VIOLET_CORE}],
    }
    return M.clip("attack_b", [_b_pose(f) for f in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse={0: ("attack", 0), 8: ("attack", 8)}, extra={"holdStep": 3})


def _hit(k):
    pose = merge(KC.hit_flyer(k, (0, 0, DZ), scale=1.0), {
        "hull": dict(squash([-0.04, -0.03, 0.02, 0.0, 0.0][k]), r=[4.0, 6.0, -2.0, 1.0, 0.0][k]),
        "tractor": {"r": [8, 12, -6, 2, 0][k]}, "sparks": {"show": k == 0, "s": 0.7},
    })
    return merge(pose, KF.glyph("g_hurt" if k <= 1 else ("g_angry" if k == 2 else "eyes")))


# death: a crash, 8 unique poses in 12 steps (about 1.1 s). 0 struck (sparks), 1 it rolls and
# pitches, the spire cracks, the first quarter of the running lights goes dark, 2 the spire snaps
# off and a mint/white break-up flash bursts from the near deck, 3 the flash peaks, more lights
# out, 4 every light dark, smoke, 5-6 falling hard in a 28 degree roll, 7 low, hand-off
DIE_SEQ = [0, 1, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7]
DIE_MS = [60, 70, 70, 60, 60, 80, 90, 90, 100, 100, 110, 120]


def _die(f):
    pose = {
        "body": {"x": pick(f, [-3, -6, -8, -10, -12, -14, -15, -15]),
                 "z": pick(f, [1, -2, -6, -12, -20, -32, -44, -48]),
                 "s": pick(f, [1, 1, 1, 1, 1, 1, 0.98, 0.92])},
        "hull": {"r": pick(f, [-6, -10, -13, -15, -16, -18, -19, -19]),
                 "rx": pick(f, [4, 10, 16, 21, 24, 27, 28, 28])},
        "tractor": {"r": pick(f, [12, 22, 30, 34, 36, 38, 38, 38])},
        "spire": {"r": pick(f, [0, 8, 30, 48, 60, 68, 72, 72]), "x": pick(f, [0, 0, -3, -7, -10, -12, -13, -13]),
                  "z": pick(f, [0, 0, 5, 3, -3, -10, -16, -18])},
        "sparks": {"show": f in (0, 1), "s": pick(f, [1.0, 1.3, 1, 1, 1, 1, 1, 1])},
        "breakup": {"show": f in (2, 3), "s": pick(f, [1, 1, 0.8, 1.2, 1, 1, 1, 1])},
        "smoke": {"show": f >= 3, "s": pick(f, [1, 1, 1, 0.7, 0.95, 1.15, 1.3, 1.4]),
                  "z": pick(f, [0, 0, 0, 0, 4, 8, 12, 14])},
    }
    for k in range(4):   # the light quarters go dark one after another
        if f >= 1 + k:
            pose[f"lights_{k}"] = {"hide": True}
    return merge(pose, KF.glyph(["g_hurt", "g_wide", "g_wide", "g_spiral", "eyes_x", "eyes_x", "eyes_x", "eyes_x"][f]))


def _die_extra():
    total = sum(DIE_MS)
    handoff = sum(DIE_MS[:len(DIE_MS) - 2])
    h = HEIGHT_LU
    return {"fx": [{"id": "fx.dust_poof", "atMs": handoff - 40, "offsetLu": [0, round(h * 0.36, 1)]},
                   {"id": "fx.ko_stars", "atMs": handoff + 40, "offsetLu": [0, round(h * 0.55, 1)],
                    "loops": 2, "scalePow": 0.5}],
            "hideUnitAtMs": total}


def clips():
    return M.check_variants([
        M.clip("idle", [_idle(f) for f in range(IDLE_N)], [150] * IDLE_N, loop=True),
        M.clip("walk", [_walk(f) for f in range(WALK_N)], [WALK_MS] * WALK_N, loop=True),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(f) for f in range(8)], DIE_MS, sequence=DIE_SEQ, extra=_die_extra()),
    ])
