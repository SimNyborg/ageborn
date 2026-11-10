"""Armoured Train: Industrial Age Legendary siege mech (CONTENT_PLAN 5.5). Turret gun proj.shell (90 splash
r45 / 2.4 s, range 220, ground) and a roof machine gun proj.bullet (10 / 0.4 s, range 150, ground and air,
priority air; a second sim attack). Overpressure (X0 M2 frenzy) below half HP. ~130 lu, huge.

Look (A11 vehicle rig, Industrial palette): a short armoured locomotive riding on its own stretch of
track: a riveted iron hull with a wide team side band and a big cream cog roundel, a sloped armoured
cowcatcher with hazard stripes, a round smokebox door with a brass ring, a tall flared smokestack
(it puffs on the beat), a team domed gun turret on the roof with a long banded barrel, a small roof
cupola at the back where a gunner in a leather cap works a machine gun, a cab with a driver's face at
the window, a brass whistle, and four big spoked driving wheels joined by a connecting rod. Legendary
white aura is added in game.

"A viewer expects the gun to boom and the whole train to rock on its springs while the machine gun
chatters, and to chug along on a short stretch of track that scrolls under it."

Animation (ANIM_SPEC G6 wheeled/rail):
  idle        the hull breathes on its springs, the stack puffs, the gunner looks round
  walk        the sleepers scroll exactly 2 spacings per cycle at the ground speed (40 x 1.25 =
              50 lu/s; an 816 ms cycle), the 4-spoke wheels turn 2 spoke spacings per cycle with the connecting rod
              going round, the hull chugs (a jolt per half cycle), the stack puffs on 0 and 4
  attack      BROADSIDE BOOM: the turret traverses and settles (the held extreme, a hold loop with the
              barrel quivering), BOOM: a big flash, the barrel slides back, the whole train rocks back
              on its springs and squashes, smoke rolls out, it rocks forward
  attack_b    ELEVATED SHOT: the barrel tips up high and the whistle screams a steam jet, the shot makes
              the hull hop on the rails
  attack_alt  the roof machine gun's own attack (ANIM_SPEC R3): the body idles, the gunner squints and
              the gun chatters; the bullets leave `mgMuzzle`
  hit         vehicle: a suspension bounce, the driver ducks
  die         wreck: a fire flash, the train jumps the rails and tips nose-down, the turret knocked
              askew, a wheel rolls off, black smoke

Detail standard (art round W3, Track INDUSTRIAL): riveted steel. The hull side in plates (dark seams above and below
the team band, proud rivet rows and columns), the band split in team-dark with brass trim along it and the cog whole
(conforming); a brass rim round the cab window and a dark door seam; a bolt circle and a brass handle on the smokebox
door; scratches over the cowcatcher's stripes; brass bands on the stack and a sooted crown; the turret's team-dark seam
band, proud rivets and a vision slit; the cupola team-dark with proud rivets round it; a team livery panel on the cab
under the driver's window; plate seams up the hull's shoulder and worn paint chips; a polished band and a sooted
mouth on the gun; mud thrown up along the frame. The die's fire flash peaks at 0.85 of its old size and its smoke and
steam stay a size smaller late in the clip (the team fill kept at 18% on every frame; timing unchanged). Aimed (queue item 44): the roof gunner up about 45 degrees at flyers and down 30 at the
ground troops (the "22-35 degrees off at the same row"; aimed.variants on the machine gun). Damage spots (vehicle):
the team band, the hull's side, the cab, the turret, the cowcatcher; smoke from the smokebox (low and far ahead of the
driver, so the fire `fireAt` picks burns there) and from the stack.

Circus Train (legendary skin, DESIGN A5.8: "striped circus wagons and bunting"): raspberry and cream wagons with
cream stripes, gilt trim and rivets, a plum frame and stack, and a string of bunting along the roof; the team band,
the cab roof and the turret stay team.
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from units import industrial_w3 as IW
from units.land_dreadnought import gunner

SLUG = "armoured_train"
GAIT_NAME = "wheeled"
NAME = "Armoured Train"
HEIGHT_LU = 172
YAW_DEG = -10.0
CANVAS = (900, 560)
FEET = (424, 520)
ANCHORS = {"head": (0, 154), "hitCenter": (0, 65)}
NO_RETIME = True

R_W = 10.0                       # driving wheel radius
SPOKES = 4
S = 1.3                          # the whole train is modelled at 1/1.3 and scaled up (A11 Legendary band)
WALK_MS = 102
CYCLE = 8 * WALK_MS              # 816 ms
STRIDE = 2 * (2 * math.pi * R_W / SPOKES)     # 31.4 model lu per cycle = 40.8 lu = 50.0 lu/s
WHEEL_STEP = 2 * (360.0 / SPOKES) / 8         # 22.5 degrees per frame (25% of a spacing)
ODO_AMP = STRIDE * S / 4         # the odometer sits on the unscaled root
TIE = STRIDE / 2                 # sleeper spacing: 2 spacings per cycle
AXLES = (-62.0, -26.0, 22.0, 58.0)
WY = -22.0                       # near wheel plane
TURRET = (-4.0, 0.0, 66.0)
BARREL_Z = 76.0
MUZZLE = (60.0, -2.0, BARREL_Z)
CUPOLA = (-42.0, 0.0, 66.0)
MG_MUZZLE = (-22.0, -4.0, 84.0)
STACK = (74.0, 0.0, 66.0)
HULL_C = I.IRON
HULL_DK = I.IRON_DK
BRASS = I.BRASS_LT
SOOT = "#2F2D2E"
WOODTIE = "#5A4A3C"
RAIL = "#777D86"           # W3: the rails apart from the train's own light iron (the skin keeps them iron)
SEAM = "#3F444A"           # the hull's plate seams and the cab door
IRON_HI = "#AEB5BD"        # the gun's polished band and the scratches on the cowcatcher
MUD = "#5E5648"            # mud thrown up along the frame

# the detail standard (art round W3): a machine's lifts (big forms, a deeper core); iron, brass, cream paint, wood and
# the team paint apart
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 0.9           # (the riveted machines ran over 0.10 at 1.2: the Tractor 0.101, the Car 0.118)
LOOK_SHADE = IW.SHADE_BIG
LOOK_RIM = dict(IW.RIM_SOLDIER, lift=0.5)    # (0.6 with the rivet rows put the Car over the highlight band)
MATERIAL_KINDS = IW.kinds({I.IRON: "iron", I.IRON_DK: "iron", I.IRON_LT: "iron", IRON_HI: "iron", SOOT: "iron",
                           SEAM: "iron", RAIL: "iron", I.COAL: "iron", I.COAL_LT: "leather", MUD: "stone",
                           WOODTIE: "wood", I.BRASS: "bronze", I.BRASS_LT: "bronze", I.CREAM: "ceramic", "#6E747C": "iron",
                           I.LEATHER: "leather", I.SKIN: "skin", I.SMOKE: "cloth", I.STEAM: "cloth", "team": "iron"})

# Circus Train (legendary skin, DESIGN A5.8; the puppet's colours): raspberry wagons with cream stripes, gilt trim, a
# plum frame (the raspberry sits outside the team hue bands)
RASP, RASP_DK, RASP_SEAM = "#8A4A66", "#6E3B52", "#5E3246"
CIRCUS_CREAM, GILT, GILT_LT, PLUM = "#EFE6CF", "#C9AE72", "#D8C08A", "#4A3E48"
SKINS = {"circus_train": {
    "palette": IW.skin_palette({I.IRON: RASP, I.IRON_DK: RASP_DK, SEAM: RASP_SEAM, I.IRON_LT: GILT, I.BRASS_LT: GILT_LT,
                                "#6E747C": "#A0607C",
                                SOOT: PLUM, I.CREAM: CIRCUS_CREAM, IRON_HI: "#E8D9B4"}),
    "kinds": IW.kinds({RASP: "ceramic", RASP_DK: "ceramic", RASP_SEAM: "ceramic", CIRCUS_CREAM: "ceramic",
                       GILT: "gold", GILT_LT: "gold", PLUM: "iron", "#E8D9B4": "gold", "#A0607C": "ceramic"})}}


def _circus(rig):
    return getattr(rig, "skin", None) == "circus_train"


def _wheel(rig, name, x, y, parent="chassis", far=False):
    from ageborn_art import colors as C
    k = 0.8 if far else 1.0
    sh = (lambda c: C.scale(c, k))
    rig.joint(name, parent, (x, y, R_W))
    g = Geo()
    n = 16
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        g.capsule((x + (R_W - 1.4) * math.cos(a0), y, R_W + (R_W - 1.4) * math.sin(a0)),
                  (x + (R_W - 1.4) * math.cos(a1), y, R_W + (R_W - 1.4) * math.sin(a1)), 2.0, segs=10, rings=2)
    rig.part(name, g, sh(HULL_DK), finish="metal")
    g = Geo()
    for i in range(SPOKES):
        a = math.radians(360.0 / SPOKES * i)
        g.capsule((x, y, R_W), (x + (R_W - 2.2) * math.cos(a), y, R_W + (R_W - 2.2) * math.sin(a)), 1.6, 1.3, segs=8, rings=2)
    rig.part(name, g, sh(I.CREAM), outline=0.7)             # cream spokes so the roll reads
    g = Geo().blob((x, y - 1.2, R_W), (3.0, 2.0, 3.0), p=2.4)
    g.blob((x + 4.6, y - 1.0, R_W), (2.6, 1.6, 2.2), p=2.6)  # counterweight
    rig.part(name, g, sh(BRASS), finish="metal", outline=0.5)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    rig.joint("all", "root", (0, 0, 0), scale=S)
    rig.joint("body", "all", (0, 0, 0))
    rig.joint("chassis", "body", (0, 0, 2.0))
    rig.joint("odo", "root", (0, 0, 0))
    # the track: two rails and the sleepers (the sleepers scroll on their own joint)
    rig.joint("ties", "all", (0, 0, 0))
    g = Geo()
    for k in range(-6, 9):      # the row slides left up to 1.75 spacings, so it starts short of the rail end
        x = k * TIE
        g.blob((x, 0, 0.8), (2.4, 30.0, 0.9), p=3.0)
    rig.part("ties", g, WOODTIE, outline=0.4)
    g = Geo()
    for y in (-22.0, 22.0):
        g.blob((0, y, 2.0), (128.0, 1.4, 1.0), p=4.0)
    rig.joint("rails", "all", (0, 0, 0))
    rig.part("rails", g, RAIL, finish="metal", outline=0.5)
    for i, x in enumerate(AXLES):
        _wheel(rig, f"wf{i}", x, 20.0, far=True)
    rig.joint("hull", "chassis", (0, 0, 30.0))

    # the hull: a riveted iron box on a dark frame, the cab at the rear, the boiler front
    g = Geo().blob((0, 0, 46.0), (84.0, 20.0, 19.0), p=4.0)
    rig.part("hull", g, HULL_C, finish="metal")
    g = Geo().blob((0, 0, 26.0), (88.0, 18.0, 2.6), p=4.0)
    rig.part("hull", g, SOOT, finish="metal")
    g = Geo().blob((-70.0, 0, 62.0), (16.0, 20.0, 14.0), p=4.0)          # the cab
    rig.part("hull", g, HULL_C, finish="metal")
    _cab_panel(rig, F.Face(rig, "hull", [Geo().blob((-70.0, 0, 62.0), (16.0, 20.0, 14.0), p=4.0)]))
    g = Geo().blob((-70.0, 0, 77.0), (18.0, 22.0, 2.4), p=3.0)
    rig.part("hull", g, team=True)                                        # cab roof
    g = Geo().blob((-62.0, -20.6, 64.0), (5.0, 1.2, 4.6), p=3.0)
    rig.part("hull", g, I.COAL, outline=0.4)                              # cab window
    # the driver's face at the window
    hx, hy, hz = -61.0, -18.0, 64.0
    rig.joint("driver", "hull", (hx, hy, hz))
    head = Geo().blob((hx, hy, hz), (4.6, 4.4, 4.4), p=2.3)
    rig.part("driver", head, I.SKIN)
    g = Geo()
    for dz in (1.2,):
        for dy in (-1.8, 1.4):
            g.blob((hx + 3.8, hy + dy, hz + dz), (0.8, 0.9, 1.2), p=2.2)
    rig.part("driver", g, I.PUPIL, outline=0, highlight=False)
    g = Geo().blob((hx - 0.4, hy, hz + 3.2), (5.0, 5.0, 2.4), p=2.4)
    rig.part("driver", g, I.COAL_LT)
    # cowcatcher and smokebox
    g = Geo().slab([(84.0, 34.0), (100.0, 22.0), (102.0, 18.0), (84.0, 18.0)], 0.0, 36.0)
    rig.part("hull", g, HULL_DK, finish="metal", outline=0.8)
    g = Geo().lathe([(0, 0), (14.0, 0), (15.0, 2.0), (0, 2.6)], (84.0, 0, 46.0), (87.0, 0, 46.0), segs=24)
    rig.part("hull", g, HULL_DK, finish="metal", outline=0.8)
    g = Geo().lathe([(14.6, -0.8), (15.4, 0), (14.6, 0.8)], (86.0, 0, 46.0), (86.6, 0, 46.0), segs=24)
    rig.part("hull", g, BRASS, finish="metal", outline=0.4)
    # the near side: team band, cog roundel, rivets, hazard stripes on the cowcatcher
    band = Geo().blob((4.0, -20.4, 46.0), (74.0, 1.4, 8.0), p=4.0)
    bface = F.Face(rig, "hull", [Geo().blob((4.0, -20.4, 46.0), (74.0, 1.4, 8.0), p=4.0)])
    rig.part("hull", band, team=True)
    # (r10) the roundel centred on the band (screen z 39.8: the band's middle as the camera sees it). Conforming decals
    # cast onto the band only, so a disc straddling its top edge (the shipped place, z 46) lost its upper half; r8's
    # flat disc (the shipped one) hid the conforming cog's edges instead
    g = IW.field(Geo(), bface, F.ellipse(-6.0, 39.8, 7.4, 7.4, 24), depth=0.4)
    rig.part("hull", g, I.CREAM, highlight=False, outline=0)
    g = IW.cog(bface, Geo(), (-6.0, 39.8), s=1.4, depth=0.8)          # W3: the cog whole (conforming)
    rig.part("hull", g, team=True, highlight=False, outline=0)
    _hull_detail(rig)
    cface = F.Face(rig, "hull", [Geo().slab([(84.0, 34.0), (100.0, 22.0), (102.0, 18.0), (84.0, 18.0)], 0.0, 36.0)])
    g = Geo()
    KI.stripes(cface, g, (92.0, 26.0), 14.0, 8.0, n=3)
    rig.part("hull", g, I.CREAM, highlight=False, outline=0)
    # the smokestack and the whistle
    sx, sy, sz = STACK
    g = Geo().capsule((sx, sy, sz - 4.0), (sx, sy, sz + 20.0), 5.4, 5.0)
    g.lathe([(0, 0), (5.0, 0), (8.4, 6.0), (8.6, 8.0), (0, 8.0)], (sx, sy, sz + 18.0), (sx, sy, sz + 26.0), segs=18)
    rig.part("hull", g, SOOT, finish="metal", outline=0.8)
    g = Geo()   # W3: brass bands round the stack's foot and under its crown, and the crown sooted
    for z0, r0 in ((sz + 1.0, 5.3), (sz + 16.0, 5.05)):
        g.lathe([(r0, -0.7), (r0 + 0.4, 0), (r0, 0.7)], (sx, sy, z0), (sx, sy, z0 + 1.0), segs=18)
    rig.part("hull", g, BRASS, finish="metal", outline=0.3)
    I.steam_puff(rig, "hull", (sx + 2.0, sy, sz + 34.0), size=2.2, name="puff", color=I.SMOKE)
    g = Geo().capsule((-46.0, -6.0, 62.0), (-46.0, -6.0, 68.0), 1.2)
    rig.part("hull", g, BRASS, finish="metal", outline=0.4)
    I.steam_puff(rig, "hull", (-46.0, -8.0, 74.0), size=1.4, name="whistle")
    # the gun turret: a team dome with a banded barrel
    rig.joint("turret", "hull", TURRET)
    tx, ty, tz = TURRET
    g = Geo().blob((tx, ty, tz + 6.0), (16.0, 14.0, 10.0), p=2.4)
    g.clip((tx, ty, tz), (0, 0, -1))
    rig.part("turret", g, team=True, finish="metal")
    g = Geo().lathe([(16.4, -1.0), (17.0, 0), (16.4, 1.0)], (tx, ty, tz + 1.0), (tx, ty, tz + 2.0), segs=24)
    rig.part("turret", g, HULL_DK, finish="metal", outline=0.4)
    _turret_detail(rig)
    rig.joint("barrel", "turret", (tx + 12.0, ty - 2.0, BARREL_Z))
    g = Geo().capsule((tx + 10.0, ty - 2.0, BARREL_Z), (MUZZLE[0], ty - 2.0, BARREL_Z), 2.6, 2.3)
    rig.part("barrel", g, HULL_DK, finish="metal", outline=0.8)
    g = Geo()
    for x in (tx + 26.0, tx + 44.0):
        g.lathe([(2.8, -0.8), (3.1, 0), (2.8, 0.8)], (x, ty - 2.0, BARREL_Z), (x + 1.0, ty - 2.0, BARREL_Z), segs=14)
    g.lathe([(3.4, -1.0), (3.6, 0), (3.4, 1.0)], (MUZZLE[0] - 1.0, ty - 2.0, BARREL_Z), (MUZZLE[0], ty - 2.0, BARREL_Z), segs=14)
    rig.part("barrel", g, BRASS, finish="metal", outline=0.4)
    g = Geo().capsule((tx + 14.0, ty - 3.9, BARREL_Z + 1.6), (MUZZLE[0] - 3.0, ty - 3.8, BARREL_Z + 1.5), 0.45, segs=8,
                      rings=2)
    rig.part("barrel", g, IRON_HI, finish="metal", outline=0)           # W3: a polished band along the barrel
    g = Geo().lathe([(1.7, 0), (2.9, 0.4), (2.7, 0.8)], (MUZZLE[0] + 0.1, ty - 2.0, BARREL_Z), (MUZZLE[0] + 1.1, ty - 2.0, BARREL_Z),
                    segs=14)
    rig.part("barrel", g, SOOT, outline=0, highlight=False)               # its sooted mouth
    rig.track("muzzle", "barrel", MUZZLE)
    I.muzzle_flash(rig, "barrel", MUZZLE, size=2.6)
    rig.joint("smoke", "all", (MUZZLE[0] + 14, -20, BARREL_Z + 14), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 10.0), (11, 5, 8.0), (-7, 9, 7.0), (5, 13, 6.6), (18, -2, 6.0)):
        g.sphere((MUZZLE[0] + 14 + dx, -20, BARREL_Z + 14 + dz), r, cuts=4)
    rig.part("smoke", g, I.SMOKE, finish="dust", outline=0.8)
    # the roof cupola with the machine gunner
    cx, cy, cz = CUPOLA
    g = Geo().lathe([(9.0, 0), (9.0, 6.0), (8.0, 7.0)], (cx, cy, cz - 2.0), (cx, cy, cz + 5.0), segs=20)
    IW.team_dark(rig, "hull", g, outline=0.6)        # (r9) team-dark, as the turret is team: the die frames' team fill
    g = Geo()   # W3: proud rivets round the cupola
    for a in range(200, 341, 28):
        t = math.radians(a)
        g.sphere((cx + 9.25 * math.cos(t), cy + 9.25 * math.sin(t), cz + 1.0), 0.9, cuts=2)
    rig.part("hull", g, I.IRON_LT, finish="metal", outline=0.3)
    gunner(rig, "hull", (cx, cy - 2.0, cz + 2.0), "g0")
    rig.joint("mg0", "hull", (cx + 10.0, -4.0, MG_MUZZLE[2]))
    g = Geo().capsule((cx + 6.0, -4.0, MG_MUZZLE[2]), MG_MUZZLE, 1.4, 1.2)
    g.blob((cx + 9.0, -4.0, MG_MUZZLE[2] - 1.0), (3.6, 2.2, 2.8), p=2.6)
    rig.part("mg0", g, I.COAL, finish="metal", outline=0.6)
    rig.track("mgMuzzle", "mg0", MG_MUZZLE)
    I.muzzle_flash(rig, "mg0", MG_MUZZLE, size=1.0, name="flash0")
    # the near wheels and the connecting rod
    for i, x in enumerate(AXLES):
        _wheel(rig, f"wn{i}", x, WY)
    rig.joint("rod", "chassis", (AXLES[1], WY - 3.0, R_W))
    g = Geo().capsule((AXLES[0], WY - 3.0, R_W), (AXLES[3], WY - 3.0, R_W), 1.4)
    rig.part("rod", g, I.IRON_LT, finish="metal", outline=0.5)
    # the wreck parts
    rig.joint("boom", "hull", (30.0, -30.0, 60.0), hidden=True)
    g = Geo().sphere((30.0, -34.0, 60.0), 16.0, cuts=4)
    rig.part("boom", g, glow=I.FIRE, outline=0)
    rig.joint("wsmoke", "hull", (0.0, -10.0, 80.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 10.0), (12, 6, 8.0), (-10, 8, 8.0), (4, 16, 7.0)):
        g.sphere((dx, -10.0, 80.0 + dz), r, cuts=4)
    rig.part("wsmoke", g, SOOT, finish="dust", outline=0.6)
    rig.track("_foot", "odo", (0, 0, 0))
    if _circus(rig):
        _circus_parts(rig)
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry
        _damage_spots(rig)


def _side_y(x, z, cx=0.0, cz=46.0, a=84.0, b=20.0, c=19.0, p=4.0):
    """The near (camera) face of a superellipse blob at (x, z): its y (negative), for parts laid on it."""
    t = 1.0 - abs((x - cx) / a) ** p - abs((z - cz) / c) ** p
    return -b * max(0.0, t) ** (1.0 / p)


def _hull_detail(rig):
    """W3: proud rivet rows along the hull side just outside the team band (they floated off its curved faces), the
    band split in team-dark with brass trim along its edges, a brass rim round the cab window, mud thrown up along the
    frame, a bolt circle and a brass handle on the smokebox door, scratches over the cowcatcher's stripes (joint space;
    the hull blob's near face computed, `_side_y`)."""
    g = Geo()
    for z in (35.4, 56.6):
        for x in range(-74, 80, 8):
            g.sphere((x, _side_y(x, z) - 0.35, z), 1.2, cuts=2)
    rig.part("hull", g, I.IRON_LT, finish="metal", outline=0.3)
    g = Geo()
    for x in (-40.0, 40.0):
        g.slab([(x - 0.6, 39.0), (x + 0.6, 39.0), (x + 0.6, 53.0), (x - 0.6, 53.0)], -21.95, 0.3)
    IW.team_dark(rig, "hull", g, outline=0)
    g = Geo()
    for z in (37.2, 54.8):     # just outside the band (on the iron: the team share keeps its shipped margin)
        g.capsule((-66.0, _side_y(-66.0, z) - 0.35, z), (74.0, _side_y(74.0, z) - 0.35, z), 0.55, segs=8, rings=2)
    pts = [(-62.0 + 5.7 * math.cos(math.radians(a)), -21.2, 64.0 + 5.2 * math.sin(math.radians(a))) for a in range(0, 361, 30)]
    for p0, p1 in zip(pts, pts[1:]):
        g.capsule(p0, p1, 0.6, segs=8, rings=2)
    for a in range(0, 360, 36):                                        # the smokebox door's bolt circle
        t = math.radians(a)
        g.sphere((87.4, 11.6 * math.cos(t), 46.0 + 11.6 * math.sin(t)), 0.9, cuts=2)
    g.capsule((88.6, -5.0, 44.0), (88.6, -5.0, 48.0), 0.7)              # its handle
    rig.part("hull", g, BRASS, finish="metal", outline=0.3)
    g = Geo()
    for x, z, rx, rz in ((-70.0, 29.4, 5.0, 1.6), (-44.0, 28.8, 3.2, 1.2), (-20.0, 29.2, 4.0, 1.4), (14.0, 28.8, 3.0, 1.1),
                         (40.0, 29.4, 4.4, 1.5), (66.0, 29.0, 3.4, 1.2)):
        g.blob((x, _side_y(x, z) - 0.3, z), (rx, 0.4, rz), p=2.2)
    rig.part("hull", g, MUD, outline=0, highlight=False)
    g = Geo()
    for (x0, z0), (x1, z1) in (((86.0, 30.0), (92.0, 27.0)), ((90.0, 24.0), (97.0, 21.6)), ((85.0, 22.0), (88.0, 20.0))):
        g.capsule((x0, -18.4, z0), (x1, -18.4, z1), 0.45, segs=8, rings=2)
    rig.part("hull", g, IRON_HI, finish="metal", outline=0, highlight=False)
    g = Geo()   # (r9) plate seams up the hull's shoulder above the rivet row, between its rivets
    for x in range(-46, 67, 16):
        pts = [(x, _side_y(x, z) - 0.3, z) for z in (57.9, 60.4, 62.9)]
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, 0.55, segs=8, rings=2)
    rig.part("hull", g, SEAM, finish="metal", outline=0)
    g = Geo()   # worn paint: bare iron chips on the shoulder (between the seams) and under the band
    for x, z, rx, rz in CHIPS:
        g.blob((x, _side_y(x, z) - 0.25, z), (rx, 0.35, rz), p=2.2)
    rig.part("hull", g, CHIP, finish="metal", outline=0, highlight=False)


# (r9) the first render measured micro 3.39 (floor 3.4) and team fill 15.8% on die_02: chips and shoulder seams on
# the hull, and a team panel on the cab under the driver's window (painted livery, as the cab roof)
CHIP = "#6E747C"       # bare iron where the paint is worn (a step lighter than I.IRON)
CHIPS = [(-38.0, 60.0, 1.8, 0.8), (-22.0, 61.2, 1.4, 0.7), (-6.0, 59.6, 2.0, 0.8), (10.0, 61.0, 1.6, 0.7),
         (26.0, 59.8, 1.8, 0.8), (42.0, 61.4, 1.4, 0.6), (58.0, 60.0, 1.6, 0.7), (-56.0, 32.6, 1.6, 0.6),
         (-30.0, 32.8, 1.8, 0.6), (0.0, 32.4, 1.4, 0.6), (28.0, 32.8, 1.6, 0.6), (54.0, 32.6, 1.8, 0.6),
         (74.0, 32.8, 1.2, 0.5)]
CAB_PANEL = [(-84.0, 45.4), (-61.5, 45.4), (-61.5, 51.6), (-84.0, 51.6)]   # screen lu (the cab face's casts)


def _cab_panel(rig, cface):
    """(r9) A team panel on the cab's side under the window, edged in team-dark."""
    g = IW.field(Geo(), cface, CAB_PANEL, depth=0.4)
    rig.part("hull", g, team=True, outline=0)
    IW.seam(rig, "hull", cface, CAB_PANEL + CAB_PANEL[:1], w=0.8, depth=0.55, team=True)


def _turret_detail(rig):
    """W3: the turret's team-dark seam band round the dome, proud rivets above its ring and a vision slit."""
    tx, ty, tz = TURRET
    ring = lambda k, z, a0, a1, st: [(tx + 16.0 * k * math.cos(math.radians(a)), ty + 14.0 * k * math.sin(math.radians(a)), z)
                                     for a in range(a0, a1 + 1, st)]
    g = Geo()
    pts = ring(1.012, tz + 5.0, 180, 360, 15)
    for p0, p1 in zip(pts, pts[1:]):
        g.capsule(p0, p1, 0.5, segs=8, rings=2)
    IW.team_dark(rig, "turret", g, outline=0)
    g = Geo()
    for p in ring(1.02, tz + 2.8, 200, 340, 20):
        g.sphere(p, 0.95, cuts=2)
    rig.part("turret", g, I.IRON_LT, finish="metal", outline=0.3)
    g = Geo()
    pts = ring(0.985, tz + 9.0, -52, -28, 8)
    for p0, p1 in zip(pts, pts[1:]):
        g.capsule(p0, p1, 0.6, segs=8, rings=2)
    rig.part("turret", g, I.COAL, outline=0, highlight=False)


def _circus_parts(rig):
    """Circus Train: cream stripes down the raspberry hull above and below the team band, and a string of bunting
    along the hull's top edge (pennants in cream, gilt and a light raspberry, laid on the hull's curved face)."""
    g = Geo()
    for x in range(-72, 82, 12):
        for z0, z1 in ((30.0, 37.4), (54.6, 61.6)):
            pts = [(x, _side_y(x, z) - 0.3, z) for z in (z0, (z0 + z1) / 2, z1)]
            for p0, p1 in zip(pts, pts[1:]):
                g.capsule(p0, p1, 1.7, segs=10, rings=2)
    rig.part("hull", g, CIRCUS_CREAM, outline=0, highlight=False)
    xs = list(range(-50, 81, 6))
    sag = lambda x: 63.4 - 1.6 * math.sin(math.pi * ((x + 50) % 26) / 26)
    g = Geo()
    pts = [(x, _side_y(x, sag(x)) - 0.6, sag(x)) for x in xs]
    for p0, p1 in zip(pts, pts[1:]):
        g.capsule(p0, p1, 0.35, segs=6, rings=2)
    rig.part("hull", g, CIRCUS_CREAM, outline=0.25)
    for k, col in enumerate((CIRCUS_CREAM, GILT_LT, "#B9728F")):
        g = Geo()
        for x in xs[k::3]:
            z = sag(x)
            y = _side_y(x, z - 2.0) - 0.7
            g.slab([(x - 1.7, z - 0.2), (x + 1.7, z - 0.2), (x, z - 3.8)], y, 0.4)
        rig.part("hull", g, col, outline=0.3)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, vehicle), on the surfaces the camera sees through every clip (joint
    space): the team band (r 9), the hull's upper side, the cab, the turret, the cowcatcher; smoke from the smokebox
    (low and far ahead of the driver at his window, so the fire `fireAt` picks burns there) and from the stack."""
    rig.damage_spot("band", "hull", (20.0, -21.9, 46.0), 9.0, "metal", team=True)
    rig.damage_spot("hull", "hull", (44.0, _side_y(44.0, 57.6) - 0.1, 57.6), 6.0, "metal", normal=(0, -0.92, 0.39))
    rig.damage_spot("cab", "hull", (-74.0, -19.5, 70.0), 6.0, "metal", normal=(0, -0.99, 0.15))
    rig.damage_spot("turret", "turret", (TURRET[0] - 6.0, -13.5, TURRET[2] + 6.0), 6.0, "metal", team=True,
                    normal=(-0.2, -0.98, 0))
    rig.damage_spot("catcher", "hull", (88.0, -18.1, 22.0), 5.0, "metal")
    rig.damage_spot("smokebox", "hull", (84.0, -12.0, 50.0), 7.0, "smoke", kind="emit", normal=(1, 0, 0))
    rig.damage_spot("stack", "hull", (STACK[0], 0.0, STACK[2] + 28.0), 6.0, "smoke", kind="emit", normal=(0, 0, 1))


# -- poses ---------------------------------------------------------------------------------
NEAR = [f"wn{i}" for i in range(4)]
FAR = [f"wf{i}" for i in range(4)]


def _wheels(deg):
    out = {w: {"r": -deg} for w in NEAR + FAR}
    a = math.radians(-deg)
    out["rod"] = {"x": 4.6 * math.cos(a) - 4.6, "z": 4.6 * math.sin(a)}
    return out


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    pose = merge(_wheels(0), {
        "hull": dict(squash(0.012 * c), z=0.5 * c),
        "puff": {"show": f in (1, 2, 4, 5), "s": [1, 0.7, 1.0, 1, 0.8, 1.1][f], "z": [0, 0, 3, 0, 0, 4][f]},
        "g0": {"r": 6 * lag}, "driver": {"x": 0.6 * c},
    })
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    jolt = -abs(math.sin(p))
    return merge(_wheels(WHEEL_STEP * f), {
        "odo": {"x": ODO_AMP * math.cos(p)},
        "ties": {"x": -(STRIDE / 8.0) * f},
        "hull": dict(squash(0.02 * jolt), z=1.6 * jolt + 0.4, r=0.8 * math.sin(2 * p)),
        "puff": {"show": f in (0, 1, 4, 5), "s": [0.8, 1.15, 1, 1, 0.8, 1.15, 1, 1][f], "z": [0, 4, 0, 0, 0, 4, 0, 0][f]},
        "g0": {"r": 4 * math.sin(p - 1.0)}, "driver": {"z": 0.6 * math.sin(p - 1.0)},
    })


WALK_DUST = {k: [{"kind": "dust", "ground": (AXLES[0] - 10.0, 0.0), "size_lu": 6.0 if k % 2 else 4.5, "puffs": 3,
                  "seed": 220 + k, "spread": 1.0, "dir": -1.0}] for k in range(8)}

# attack: moves.HEAVY_MELEE_MS (1230 ms, impact at step 6); 10 unique poses on 12 steps
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#        ready turn  settle HOLD quiver lead BOOM rock  fwd  settle
A_TR = [0.0, -4.0, -2.0, -1.0, -1.4, -1.0, 2.0, 1.0, 0.0, 0.0]
A_REC = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, -9.0, -5.0, -1.0, 0.0]
A_X = [0.0, 0.0, 0.0, 0.0, 0.0, 0.5, -6.0, -3.0, 1.5, 0.0]
A_R = [0.0, 0.0, 0.0, -0.4, -0.5, -0.6, 2.4, 1.0, -0.8, 0.0]
A_Q = [0.0, 0.0, -0.01, -0.02, -0.02, 0.0, 0.07, -0.04, 0.0, 0.0]


def _attack_pose(f, elevated=False):
    up = [0, 4, 9, 12, 12.5, 12, 14, 12, 6, 0][f] if elevated else 0.0
    pose = merge(_wheels(0), M.body_about((AXLES[0], 0, 0), x=A_X[f], r=A_R[f] + (1.5 if elevated and f == 6 else 0.0),
                                          q=A_Q[f], z=(3.0 if elevated and f == 6 else 0.0)), {
        "turret": {"r": A_TR[f]},
        "barrel": {"x": A_REC[f], "r": up},
        "flash": {"show": f == 6},
        "smoke": {"show": f in (6, 7, 8), "s": [1, 1, 1, 1, 1, 1, 0.8, 1.1, 1.25, 1][f],
                  "x": [0, 0, 0, 0, 0, 0, 0, 4, 8, 0][f], "z": [0, 0, 0, 0, 0, 0, 0, 4 + up, 8 + up, 0][f]},
        "puff": {"show": f in (6, 7, 8), "s": 1.2},
        "whistle": {"show": elevated and f in (3, 4, 5, 6, 7), "s": [1, 1, 1, 0.8, 1.0, 1.1, 1.3, 1.4, 1, 1][f]},
        "g0": {"z": -3.0 if f in (6, 7) else 0.0}, "driver": {"z": -2.0 if f in (6, 7) else 0.0},
    })
    return pose


def _ov(elevated=False):
    tip = (MUZZLE[0], MUZZLE[1], MUZZLE[2])
    return {6: [{"kind": "burst", "joint": "barrel", "point": tip, "r0_lu": 10.0, "r1_lu": 22.0, "n": 8,
                 "a0": -50.0, "arc": 100.0, "color": "#FFF4D6"},
                {"kind": "dust", "ground": (AXLES[0] - 12.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 241,
                 "spread": 1.2, "dir": -1.0}]}


def _attack_clip():
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, overlays=_ov(), extra={"holdStep": 3, "holdLoop": [3, 4]})


def _attack_b():
    reuse = {0: ("attack", 0), 9: ("attack", 9)}
    return M.clip("attack_b", [_attack_pose(f, elevated=True) for f in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, overlays=_ov(True), reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


# attack_alt: the roof machine gun (6 frames in 450 ms, the shots on frame 3)
ALT_MS = [60, 70, 110, 60, 70, 80]
ALT_IMPACT = 3


# the aimed roof gunner (queue item 44, ageborn_art/aimed.py): `turn` turns the machine gun (its `mgMuzzle`), the gunner
# leans with it; up about 45 degrees at flyers, down 30 at the ground troops (item 47: 22-35 degrees off at the same row)
AIM_W_ALT = [0.5, 1.0, 1.0, 1.0, 0.8, 0.4]
AIM_TARGETS = {"down": -30.0}


def _alt_pose(f, turn=0.0):
    return merge(_idle(0), {
        "g0": {"r": [-4, -8, -9, 6, 8, 2][f] + 0.15 * turn, "x": [1.0, 2.0, 2.0, -1.0, -1.5, 0.0][f]},
        "mg0": {"r": [2.0, 5.0, 5.0, 3.0, -4.0, 0.0][f] + turn},
        "g0_eyes": {"sz": 0.35 if f in (1, 2, 3) else 1.0},
        "flash0": {"show": f == 3},
    })


def _attack_alt():
    ov = {3: [{"kind": "burst", "joint": "mg0", "point": MG_MUZZLE, "r0_lu": 6.0, "r1_lu": 11.0, "n": 5,
               "a0": -50.0, "arc": 100.0}]}
    return M.clip("attack_alt", [_alt_pose(f) for f in range(6)], ALT_MS, impact=ALT_IMPACT, overlays=ov,
                  extra={"noMuzzle": True})


def _hit(k):
    a = M.HIT_AMT[k]
    duck = [0.8, 1.0, 0.6, 0.1, 0.0][k]
    return merge(_wheels(-6 * a), {
        "body": dict(squash([-0.06, 0.04, 0.02, -0.02, 0.0][k]), x=-3.0 * max(a, 0) + 1.0 * min(a, 0)),
        "hull": {"r": 2.0 * a, "z": [-1.5, 1.5, 0.5, -0.3, 0.0][k]},
        "g0": {"z": -6.0 * duck, "r": 8 * a}, "driver": {"z": -3.0 * duck},
        "g0_eyes": {"sz": 0.35 if k < 2 else 1.0}, "turret": {"r": 3 * a},
    })


D_BODY = [dict(x=-2, z=0, r=1, q=-0.04), dict(x=0, z=6, r=-2, q=0.04), dict(x=3, z=10, r=-5, q=0.02),
          dict(x=5, z=8, r=-8, q=-0.06), dict(x=6, z=5, r=-9, q=-0.08), dict(x=6, z=5, r=-9, q=-0.07),
          dict(x=6, z=5, r=-9, q=-0.07), dict(x=6, z=5, r=-9, q=-0.08, s=0.97)]
D_WHEEL = [(0, 0, 0), (-6, 6, 40), (-14, 10, 100), (-24, 6, 170), (-32, -1, 240), (-34, -2, 250),
           (-34, -2, 250), (-34, -2, 250)]


def _die(k):
    b = D_BODY[k]
    wx, wz, wr = D_WHEEL[k]
    pose = merge(_wheels(0), M.body_about((AXLES[3], 0, 0), x=b["x"], z=b["z"], r=b["r"], q=b["q"], s=b.get("s", 1.0)), {
        "ties": {"x": 0}, "rails": {"r": 0},
        "turret": {"r": [0, 6, 12, 16, 18, 18, 18, 18][k], "rz": [0, 8, 16, 20, 20, 20, 20, 20][k]},
        "barrel": {"r": [0, -6, -14, -20, -22, -22, -22, -22][k]},
        "wn0": {"x": wx, "z": wz, "r": wr},
        # (r9) the flash at 0.85 on its peak frame (1.25: it covered a third of the band, team fill 15.8% on die_02),
        # the black smoke and the steam a size smaller late in the clip (team fill 17-17.5% on die_06 and die_07)
        "boom": {"show": k in (1, 2), "s": [1, 1.0, 0.85, 1, 1, 1, 1, 1][k]},
        "wsmoke": {"show": k >= 2, "s": [1, 1, 0.6, 0.8, 0.95, 1.05, 1.15, 1.2][k], "z": [0, 0, 0, 4, 8, 12, 16, 20][k]},
        "puff": {"show": True, "s": [1.2, 1.4, 1.5, 1.55, 1.6, 1.65, 1.7, 1.75][k]},
        "g0": {"z": [0, 4, 8, 6, 2, 0, 0, 0][k], "r": [8, 14, 20, 30, 34, 34, 34, 34][k]},
        "driver": {"z": [0, -1, -2, -3, -3, -3, -3, -3][k]},
    })
    if k >= 1:
        pose.update({"g0_eyes": {"hide": True}, "g0_ko": {"show": True}})
    return pose


def clips():
    alt = _attack_alt()
    # the roof gunner aimed up about 45 degrees at flyers and down at the ground troops (the extras sheet)
    aimed_alt = AIMED.variants(RIG, alt, _alt_pose, AIM_W_ALT, aims=("up45", "down"), targets=AIM_TARGETS)
    for v in aimed_alt:
        AIMED.check_timing(alt, v)
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)], [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], [WALK_MS] * 8, loop=True, overlays=WALK_DUST),
        _attack_clip(),
        _attack_b(),
        alt,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True)) + aimed_alt
