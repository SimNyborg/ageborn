"""Land Dreadnought: Industrial Age Legendary siege heavy (docs/design-lane-ages.md A17.10). Main gun
proj.shell (130 splash r40 / 2.2 s, range 160, ground). Two sponson gunners (riders) each shoot
proj.bullet 10 / 0.5 s at range 160 (G+A); on death the crew bails out as 2 Carbineers. ~180 lu with
the pennant, huge.

Look (A17.12 vehicle rig, Industrial palette): a rhomboid landship. The full-length track belt runs
all the way round a tall riveted iron side frame (a high, jutting nose and a sloped tail), with
steel grousers that scroll with the ground. The side frame carries a wide team band and a big team
roundel with a cream ring; a riveted near-side sponson with an open top holds the first gunner
(leather tanker cap, goggles) behind a rotary machine gun; the second gunner stands in a raised
rear barbette over the far sponson with his own gun, so both riders read from the side. A squat
forward casemate on the roof carries the main gun (a long iron barrel with copper bands and a
muzzle ring). A coal exhaust stack puffs smoke, an open spoked steering wheel with a bright brass
hub rides behind the tail
(the landship's signature), and a tall mast flies the team pennant. Legendary white aura is added in
game.

The walk scrolls both belts with the ground (35 lu/s) and heaves the hull; the attack (main gun)
settles, fires with a big flash (barrel slides back, hull rocks back and squashes), smoke rolls out
and the hull rocks forward. The shell spawns at the per-frame `muzzle` anchor; the riders' guns are
independent attacks, so `rider0Muzzle` and `rider1Muzzle` are exported per frame for every clip
(`meta.ageborn.riders`). The die clip ("crew bails out") wrecks the landship without squashing it:
a fire flash, a 7 degree nose-down tilt onto a snapped track, the casemate knocked askew, black
smoke from both sponsons, and both gunners climbing up out of their hatches from frame 2 (the game
spawns the 2 Carbineers; `crewOutAtMs` marks the climb-out).

Animation standard (ANIM_SPEC 2026-10-02, G6 tracked):
  walk        the belts scroll exactly 2 grouser spacings per 640 ms cycle at the ground speed
              (35 x 1.25 = 43.75 lu/s), the hull heaves (about 3 lu) and pitches 1.5 degrees, the crew
              bobs a beat late, the exhaust puffs and the rear kicks up dust
  attack      A (broadside rock) as above; the aim is split into a hold and a wobble frame (holdLoop:
              the sim's wind-up is 3.1x the authored one)
  attack_b    MAIN GUN ANGLED UP: the hull rears nose-up on its springs, the barrel elevates (the held
              extreme), the shot makes it hop, then both funnels belch black smoke
  attack_alt  the sponson gunners' own attack (6 / 0.5 s, ANIM_SPEC R3): the body idles, both gunners
              squint down their rotary guns and fire; the bullets leave the near gun (`mgMuzzle`)

Detail standard (art round W3, Track INDUSTRIAL): riveted steel. The side frame in plates (dark seams with proud
rivet columns beside them and a proud row along the frame), the team band edged and split in team-dark (its rivets painted over), mud
splashed along the frame under it, brass rivets round the roundel, scratches over the nose's warning stripes; proud rivets on
the sponson, the casemate (with a vision slit) and the barbette; plate seams across the roof; a polished band and a
sooted mouth on the main gun; a riveted band and a sooted crown on the stack. The war machines' panel lines (audit
5.2): the plates above the band in seven columns with a riveted lap seam, the plates under it a seam every 10 lu with a
riveted lap seam and rivet columns, the band in plates with rivets down its seams and along its lap seam, worn paint
chips, scuffs on the band and road grime towards the ground; plate seams round the sponson's and the barbette's drums;
a stronger in-band gradient and cavity (as Modern's Behemoth Tank). The sponson gun is drawn level (its
axis is the joint's, so the aim data measures the gun as drawn). Aimed (queue item 44): the gunners' attack up about
45 degrees (the sponson gun sits low, the flyers high) and down 20 at the ground troops (aimed.variants on the
sponson gun; the barbette gun turns with it, further down). Damage spots (vehicle): the team band, the side frame,
the sponson, the casemate's team band, the barbette; smoke from the engine at the frame's rear (low and far behind
the gunners, so the fire `fireAt` picks burns there) and from the stack.
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import face as F
from ageborn_art import fx
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as G
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo
from units import industrial_w3 as IW

SLUG = "land_dreadnought"
GAIT_NAME = "tracked"
NAME = "Land Dreadnought"
HEIGHT_LU = 180
YAW_DEG = -10.0
CANVAS = (640, 470)
FEET = (262, 440)
ANCHORS = {"head": (0, 150), "hitCenter": (0, 60)}
NO_RETIME = True
EXTRA_META = {"riders": [
    {"id": "rider0", "anchor": "rider0Muzzle", "projectile": "proj.bullet"},
    {"id": "rider1", "anchor": "rider1Muzzle", "projectile": "proj.bullet"},
]}

WALK_MS = 80
STEP_LU = 43.75 * WALK_MS / 1000.0    # 3.5 lu per 80 ms step at the ground speed 35 x 1.25
PITCH = STEP_LU * I.TREAD_PHASES      # 14 lu grousers: one phase copy per step
# the rhomboid, clockwise on screen from the top rear (x forward, z up)
RHOMB = [(-68.0, 92.0), (58.0, 92.0), (104.0, 48.0), (72.0, 2.0), (-58.0, 2.0), (-92.0, 42.0)]
RADII = [14.0, 14.0, 12.0, 16.0, 16.0, 12.0]
TY = -30.0            # near belt plane
TW = 14.0
CASEMATE = (22.0, 0.0, 96.0)
BARREL_Z = 112.0
MUZZLE = (112.0, -2.0, BARREL_Z)
SPONSON = (6.0, TY - 14.0, 44.0)
R0_MUZZLE = (40.0, TY - 18.0, 60.0)    # W3: level along the joint's +X (it pointed 17 degrees up, unmeasured)
BARBETTE = (-46.0, 10.0, 100.0)
R1_MUZZLE = (-14.0, 4.0, 127.0)
_T = {}
IRON_HI = "#AEB5BD"        # W3: the main gun's polished band and the scratches on the nose
SOOT = "#2F2D2E"           # the gun's mouth and the stack's crown
MUD = "#5E5648"            # mud splashed along the team band's foot
SEAM_DK = "#3F444A"        # the side frame's plate seams

# the detail standard (art round W3): a machine's lifts (big forms, a deeper core); iron, brass, copper, cream paint
# and the team paint apart
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 0.9           # (the riveted machines ran over 0.10 at 1.2: the Tractor 0.101, the Car 0.118)
# (r9) a stronger in-band gradient and cavity than SHADE_BIG's, as Modern's Behemoth Tank: the long hull's drums, belts
# and guns turn from light to shadow across their width, and the seams and rivets darken the plate round them
LOOK_SHADE = dict(IW.SHADE_BIG, gradient=3.0, cavity=0.85)
LOOK_RIM = dict(IW.RIM_SOLDIER, lift=0.5)    # (0.6 with the rivet rows put the Car over the highlight band)
MATERIAL_KINDS = IW.kinds({I.IRON: "iron", I.IRON_DK: "iron", I.IRON_LT: "iron", IRON_HI: "iron", SOOT: "iron",
                           SEAM_DK: "iron", I.COAL: "iron", I.COAL_LT: "iron", I.STRIPE_DK: "iron", "#4A4648": "iron",
                           MUD: "stone", "#6E747C": "iron", "#4B5056": "iron",
                           I.BRASS: "bronze", I.BRASS_LT: "bronze", I.COPPER: "bronze",
                           "#E8D9A8": "bronze", I.CREAM: "ceramic", I.BRICK_LT: "cloth", I.WOOD_LT: "wood",
                           I.LEATHER: "leather", I.SKIN: "skin", I.SMOKE: "cloth", I.SMOKE_DK: "cloth",
                           "team": "iron"})


def _frame_plate(rig, joint, y, inset, color, team_band):
    """The side frame: the rhomboid inset from the belt, a thick plate."""
    pts = []
    import ageborn_art.rigs_industrial as RI
    path, total = RI._rounded_path(RHOMB, [r + 2 for r in RADII], n_arc=5)
    cx = sum(p[0] for p in RHOMB) / len(RHOMB)
    cz = sum(p[1] for p in RHOMB) / len(RHOMB)
    for x, z, _ in path:
        dx, dz = x - cx, z - cz
        L = math.hypot(dx, dz)
        pts.append((x - dx / L * inset, z - dz / L * inset))
    g = Geo().slab(pts, y, 12.0)
    rig.part(joint, g, color, finish="metal")
    return pts


def gunner(rig, joint, at, name, face_x=1.0):
    """A small crewman from the chest up: team tunic, leather tanker cap, goggles, eyes."""
    x, y, z = at
    rig.joint(name, joint, at)
    g = Geo().blob((x, y, z + 4.0), (7.4, 7.8, 5.6), p=2.4)
    rig.part(name, g, team=True)
    hz = z + 15.0
    g = Geo().blob((x + 1.0, y, hz), (7.6, 7.4, 7.4), p=2.3)
    g.blob((x + 8.4, y - 0.5, hz - 1.4), (2.4, 2.2, 2.2), p=2.0)
    rig.part(name, g, I.SKIN)
    g = Geo().blob((x - 0.2, y, hz + 3.4), (8.4, 8.2, 6.0), p=2.3)
    g.clip((x, y, hz + 0.8), (0, 0, -1))
    g.blob((x - 1.0, y - 6.8, hz - 1.0), (3.0, 1.6, 4.0), p=2.4)
    rig.part(name, g, I.LEATHER)
    g = Geo()
    for yy in (-3.2, 3.0):
        g.lathe([(0, 0), (2.2, 0.1), (2.4, 1.6), (0, 1.8)], (x + 5.4, y + yy, hz + 4.6), (x + 7.2, y + yy, hz + 5.0),
                segs=12)
    rig.part(name, g, I.BRASS, finish="metal", outline=0.5)
    rig.joint(f"{name}_eyes", name, (x + 6.6, y, hz + 0.6))
    g = Geo()
    for yy in (-3.2, 3.0):
        g.blob((x + 6.4, y + yy, hz + 0.6), (2.1, 2.1, 2.6))
    rig.part(f"{name}_eyes", g, I.EYE, highlight=False, outline=0.5)
    g = Geo()
    for yy in (-3.2, 3.0):
        g.blob((x + 8.2, y + yy - 0.3, hz + 0.4), (0.8, 1.3, 1.4))
    rig.part(f"{name}_eyes", g, I.PUPIL, outline=0)
    rig.joint(f"{name}_ko", name, (x + 6.6, y, hz + 0.6), hidden=True)
    g = Geo()
    for yy in (-3.2, 3.0):
        g.capsule((x + 8.0, y + yy - 1.7, hz + 2.2), (x + 8.0, y + yy + 1.7, hz - 1.2), 0.6)
        g.capsule((x + 8.0, y + yy - 1.7, hz - 1.2), (x + 8.0, y + yy + 1.7, hz + 2.2), 0.6)
    rig.part(f"{name}_ko", g, I.PUPIL, outline=0)
    g = Geo().blob((x + 8.0, y - 0.6, hz - 4.8), (1.2, 2.8, 1.0), p=2.4)
    rig.part(name, g, I.MOUTH, outline=0, highlight=False)
    # arms up (hidden; shown when he bails out)
    rig.joint(f"{name}_arms", name, (x, y, z + 8.0), hidden=True)
    g = Geo()
    for yy in (-7.0, 7.0):
        g.capsule((x, y + yy, z + 8.0), (x + 3.0, y + yy * 1.3, z + 24.0), 2.6, 2.2)
        g.sphere((x + 3.4, y + yy * 1.35, z + 26.0), 3.0, cuts=3)
    rig.part(f"{name}_arms", g, team=True, outline=0.6)


def rotary_gun(rig, joint, p0, p1, k=1.0):
    """A crank-fed rotary machine gun from breech p0 to muzzle p1 (in the side plane)."""
    ang = math.atan2(p1[2] - p0[2], p1[0] - p0[0])
    ux, uz = math.cos(ang), math.sin(ang)
    g = Geo().blob((p0[0] + ux * 3.0, p0[1], p0[2] + uz * 3.0), (5.6 * k, 3.4 * k, 3.6 * k), p=3.0,
                   rot=(0, -math.degrees(ang), 0))
    rig.part(joint, g, I.BRASS, finish="metal", outline=0.7)
    g = Geo()
    for dy, dz in ((-1.4, 0.0), (1.4, 0.0), (0.0, 1.4), (0.0, -1.4)):
        g.capsule((p0[0] + ux * 5.0 - uz * dz, p0[1] + dy, p0[2] + uz * 5.0 + ux * dz),
                  (p1[0] - uz * dz, p1[1] + dy, p1[2] + ux * dz), 0.8 * k)
    rig.part(joint, g, I.IRON_DK, finish="metal", outline=0.6)
    g = Geo().lathe([(3.0 * k, -0.8), (3.2 * k, 0), (3.0 * k, 0.8)], (p1[0] - ux * 2.0, p1[1], p1[2] - uz * 2.0),
                    (p1[0] - ux * 1.0, p1[1], p1[2] - uz * 1.0), segs=14)
    rig.part(joint, g, I.COPPER, finish="metal", outline=0.4)
    g = Geo().capsule((p0[0], p0[1] - 3.8, p0[2]), (p0[0] - 2.0, p0[1] - 5.4, p0[2] - 4.0), 0.7)   # crank
    rig.part(joint, g, I.WOOD_LT, outline=0.4)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("hull", "body", (0, 0, 30.0))

    # far side: belt and frame (mostly hidden behind the hull)
    rig.joint("track_f", "hull", (0, 30.0, 0))
    _frame_plate(rig, "track_f", 30.0, 3.0, I.IRON_DK, False)
    _T["f"] = I.poly_tread(rig, "tf", "track_f", RHOMB, RADII, 30.0, TW, PITCH)

    # the hull box between the frames, the roof and the trailing steering wheels
    g = Geo().blob((4.0, 0, 50.0), (84.0, 26.0, 36.0), p=4.0, taper=(0.9, 1.0))
    rig.part("hull", g, I.IRON)
    g = Geo().blob((-4.0, 0, 88.0), (64.0, 26.0, 4.0), p=4.0)
    rig.part("hull", g, I.IRON_LT, finish="metal")
    g = Geo()   # W3: plate seams across the roof (read at the camera's 15 degree look-down)
    for x in (-20.0, 54.0):     # (the barbette and the casemate cover the rest)
        g.capsule((x, -23.0, 91.6), (x + 0.6, 23.0, 91.6), 0.6, segs=8, rings=2)
    rig.part("hull", g, SEAM_DK, finish="metal", outline=0)
    rig.joint("tail", "hull", (-92.0, 0, 30.0))
    g = Geo()
    g.capsule((-80.0, -6.0, 36.0), (-118.0, -6.0, 18.0), 2.2)
    g.capsule((-80.0, 10.0, 36.0), (-118.0, 10.0, 18.0), 2.2)
    rig.part("tail", g, I.IRON_DK, finish="metal", outline=0.8)
    # the steering wheel: an open spoked wheel (iron tyre, wooden felloe and spokes, a bright
    # brass hub), so it reads as a wheel and not a loose ball
    rig.joint("tw0", "tail", (-120.0, -10.0, 14.0))
    G.wheel(rig, "tw0", (-120.0, -10.0, 14.0), 14.0, 3.4, rim=I.IRON_DK, spokes=I.WOOD_LT, hub=I.BRASS_LT,
            team_felloe=False, n_spokes=8)
    g = Geo().sphere((-120.0, -17.2, 14.0), 2.2, cuts=3)
    rig.part("tw0", g, "#E8D9A8", finish="metal", outline=0.4)
    names = [("tw0", 14.0)]
    _T["wheels"] = names

    # the exhaust stack and the pennant mast
    g = Geo().lathe([(4.0, 0), (4.2, 2.0), (3.6, 26.0), (5.0, 28.0), (5.2, 31.0), (3.4, 31.4)],
                    (-26.0, 12.0, 90.0), (-28.0, 12.0, 121.0), segs=18)
    rig.part("hull", g, I.COAL_LT, finish="metal")
    g = Geo().lathe([(4.25, -0.7), (4.6, 0), (4.25, 0.7)], (-26.2, 12.0, 93.0), (-26.3, 12.0, 94.0), segs=18)
    rig.part("hull", g, I.IRON_LT, finish="metal", outline=0.3)           # W3: a riveted band round the stack's foot
    g = Geo()
    for a in range(200, 341, 28):
        t = math.radians(a)
        g.sphere((-26.2 + 4.7 * math.cos(t), 12.0 + 4.7 * math.sin(t), 93.0), 0.75, cuts=2)
    rig.part("hull", g, I.BRASS_LT, finish="metal", outline=0.25)
    g = Geo().lathe([(5.05, -0.9), (5.4, 0), (5.1, 1.0)], (-27.8, 12.0, 119.4), (-27.9, 12.0, 120.4), segs=18)
    rig.part("hull", g, SOOT, outline=0, highlight=False)                 # its sooted crown
    I.steam_puff(rig, "hull", (-29.0, 8.0, 127.0), size=1.8, name="exhaust", color=I.SMOKE_DK)
    I.pennant(rig, "hull", (-70.0, 14.0, 90.0), 88.0, length=26.0, w=13.0, max_deg=16)

    # rear barbette with the second gunner (over the far sponson)
    bx, by, bz = BARBETTE
    g = Geo().lathe([(13.0, 0), (13.6, 2.0), (13.0, 12.0), (11.4, 13.0), (0, 13.0)], (bx, by, bz - 10.0),
                    (bx, by, bz + 3.0), segs=26)
    rig.part("hull", g, I.IRON_LT, finish="metal")
    g = Geo()   # W3: proud rivet heads (flush 1 lu dots vanished at game scale)
    for a in range(-170, -10, 20):
        t = math.radians(a)
        g.sphere((bx + 13.55 * math.cos(t), by + 13.55 * math.sin(t), bz - 3.0), 1.25, cuts=2)
    rig.part("hull", g, I.BRASS_LT, finish="metal", outline=0.3)
    g = Geo().lathe([(13.62, -0.55), (13.85, 0), (13.62, 0.55)], (bx, by, bz - 7.6), (bx, by, bz - 6.6), segs=26)
    rig.part("hull", g, SEAM_DK, finish="metal", outline=0)              # (r9) a plate seam round the drum
    gunner(rig, "hull", (bx + 1.0, by, bz), "g1")
    rig.joint("mg1", "hull", (bx + 10.0, by - 4.0, bz + 12.0))
    rotary_gun(rig, "mg1", (bx + 8.0, by - 4.0, bz + 12.0), R1_MUZZLE, k=1.0)
    g = Geo().blob((bx + 7.0, by - 6.0, bz + 11.0), (3.0, 2.4, 2.8), p=2.4)
    rig.part("mg1", g, I.SKIN, outline=0.5)
    rig.track("rider1Muzzle", "mg1", R1_MUZZLE)
    I.muzzle_flash(rig, "mg1", R1_MUZZLE, size=0.9, name="flash1")

    # the forward casemate and the main gun
    cx, cy, cz = CASEMATE
    rig.joint("casemate", "hull", (cx, cy, cz))
    g = Geo().blob((cx, cy, cz + 6.0), (26.0, 24.0, 12.0), p=3.2, taper=(1.0, 0.82))
    g.clip((0, 0, cz - 4.0), (0, 0, -1))
    rig.part("casemate", g, I.IRON_LT, finish="metal")
    g = Geo().blob((cx + 1.0, -24.6, cz + 6.0), (20.0, 1.4, 6.0), p=3.2)
    rig.part("casemate", g, team=True, outline=0.6)
    g = Geo()   # W3: proud rivet heads along the team band's edges
    for dx in (-16, -8, 0, 8, 16):
        for dz in (1.0, 11.0):
            g.sphere((cx + dx, -25.9, cz + dz), 1.2, cuts=2)
    rig.part("casemate", g, I.BRASS_LT, finish="metal", outline=0.3)
    g = Geo().blob((cx + 17.0, -20.4, cz + 13.6), (4.2, 1.6, 1.0), p=2.6)   # a vision slit
    rig.part("casemate", g, I.COAL, outline=0, highlight=False)
    g = Geo().blob((cx + 22.0, -2.0, BARREL_Z), (7.0, 10.0, 8.0), p=2.6)   # mantlet
    rig.part("casemate", g, I.IRON_DK, finish="metal")
    rig.joint("barrel", "casemate", (cx + 24.0, -2.0, BARREL_Z))
    g = Geo().capsule((cx + 24.0, -2.0, BARREL_Z), (MUZZLE[0] - 6.0, -2.0, BARREL_Z), 3.6, 3.1)
    rig.part("barrel", g, I.IRON_DK, finish="metal")
    g = Geo()
    for x in (cx + 36.0, cx + 56.0):
        g.lathe([(3.8, -1.4), (4.1, 0), (3.8, 1.4)], (x, -2.0, BARREL_Z), (x + 1, -2.0, BARREL_Z), segs=18)
    rig.part("barrel", g, I.COPPER, finish="metal", outline=0.5)
    g = Geo().lathe([(3.4, 0), (5.2, 1.4), (5.2, 5.6), (3.6, 6.4), (2.2, 6.6)], (MUZZLE[0] - 7.0, -2.0, BARREL_Z),
                    (MUZZLE[0], -2.0, BARREL_Z), segs=20)
    rig.part("barrel", g, I.IRON, finish="metal")
    # W3: a polished band along the barrel's top and a sooted mouth
    g = Geo().capsule((cx + 27.0, -4.6, BARREL_Z + 2.1), (MUZZLE[0] - 8.0, -4.4, BARREL_Z + 1.9), 0.6, segs=8, rings=2)
    rig.part("barrel", g, IRON_HI, finish="metal", outline=0)
    g = Geo().lathe([(2.3, 0), (3.5, 0.45), (3.3, 0.9)], (MUZZLE[0] - 0.2, -2.0, BARREL_Z), (MUZZLE[0] + 0.8, -2.0, BARREL_Z),
                    segs=18)
    rig.part("barrel", g, SOOT, outline=0, highlight=False)
    rig.track("muzzle", "barrel", MUZZLE)
    I.muzzle_flash(rig, "barrel", (MUZZLE[0] + 1, -2.0, BARREL_Z), size=3.4)
    g = Geo().blob((cx - 4.0, -6.0, cz + 18.6), (8.0, 8.0, 3.0), p=2.4)   # hatch
    rig.part("hull", g, I.IRON_DK, finish="metal", outline=0.6)

    # near side: the side frame (team band, roundel, rivets), the belt, the sponson
    rig.joint("track", "hull", (0, TY, 0))
    pts = _frame_plate(rig, "track", TY + 4.0, 5.0, I.IRON, True)
    g = Geo().slab([(-84.0, 63.0), (99.0, 63.0), (79.0, 31.0), (-80.0, 31.0)], TY - 2.6, 1.6)
    rig.part("track", g, team=True)
    g = Geo()
    cxr, czr = -40.0, 47.0
    g.lathe([(0, -1.0), (15.0, -1.0), (15.0, 1.0), (0, 1.0)], (cxr, TY - 3.6, czr), (cxr, TY - 4.6, czr), segs=32)
    rig.part("track", g, I.CREAM, outline=0.6)
    g = Geo().lathe([(0, -1.0), (11.0, -1.0), (11.0, 1.0), (0, 1.0)], (cxr, TY - 4.8, czr), (cxr, TY - 5.8, czr), segs=32)
    rig.part("track", g, team=True, outline=0.4)
    g = Geo().lathe([(0, -1.0), (4.6, -1.0), (4.6, 1.0), (0, 1.0)], (cxr, TY - 6.0, czr), (cxr, TY - 7.0, czr), segs=24)
    rig.part("track", g, I.CREAM, outline=0.3)
    _frame_detail(rig, cxr, czr)
    # warning stripes on the jutting nose, a lifebuoy and a strapped shovel on the side frame,
    # soot streaks under the exhaust
    nose = Geo().slab([(78.0, 60.0), (98.0, 50.0), (86.0, 32.0), (74.0, 44.0)], TY - 3.2, 0.8)
    nface = F.Face(rig, "track", [nose], yaw_deg=YAW_DEG)
    rig.part("track", nose, I.CREAM, outline=0.5)
    g = KI.stripes(nface, Geo(), KI.K.scr(nface, (86.0, TY - 3.8, 46.0)), 22.0, 26.0, n=4, band=1.0,
                   slant=0.5)
    rig.part("track", g, I.STRIPE_DK, highlight=False, outline=0)
    g = Geo().lathe([(4.2, -1.8), (6.6, -2.6), (8.0, 0), (6.6, 2.6), (4.2, 1.8)], (58.0, TY - 5.4, 76.0),
                    (58.0, TY - 6.4, 76.0), segs=24)
    rig.part("track", g, team=True, outline=0.6)             # a team-painted lifebuoy
    g = Geo()
    for a in (45, 135, 225, 315):
        t = math.radians(a)
        g.blob((58.0 + 6.4 * math.cos(t), TY - 7.2, 76.0 + 6.4 * math.sin(t)), (1.6, 1.2, 1.6), p=2.4,
               rot=(0, -a, 0))
    rig.part("track", g, I.BRICK_LT, outline=0.3)
    g = Geo().capsule((-74.0, TY - 5.0, 66.0), (-44.0, TY - 5.0, 76.0), 1.2)
    rig.part("track", g, I.WOOD_LT, outline=0.5)
    g = Geo().blob((-40.0, TY - 5.2, 77.4), (4.4, 1.0, 3.2), p=2.6, rot=(0, -18, 0))
    rig.part("track", g, I.IRON_LT, finish="metal", outline=0.5)
    g = Geo()
    for dx in (-28.0, -18.0):
        g.capsule((dx, TY - 3.8, 84.0), (dx + 3.0, TY - 3.8, 76.0), 0.9)
    rig.part("track", g, "#4A4648", outline=0, highlight=False)
    I.fuse_spark(rig, "track", (40.0, TY - 8.0, 56.0), size=3.0, name="hitspark", seed=3, hidden=True)
    g = Geo().blob((80.0, TY - 3.0, 70.0), (3.6, 2.0, 2.4), p=2.6)   # vision slit
    rig.part("track", g, I.COAL, outline=0, highlight=False)
    _T["n"] = I.poly_tread(rig, "tn", "track", RHOMB, RADII, TY, TW, PITCH, thick=4.2)
    names = I.wheel_row(rig, "rw", "track", (-50.0, -30.0, -10.0, 10.0, 30.0, 50.0), 11.0, TY + 1.0, 6.4)
    _T["road"] = names

    # the near sponson: a riveted half drum sticking out of the frame, open on top
    sx, sy, sz = SPONSON
    g = Geo().blob((sx, sy + 4.0, sz), (24.0, 10.0, 16.0), p=2.8, taper=(0.8, 1.0))
    g.clip((0, sy + 8.0, 0), (0, 1, 0))
    rig.part("track", g, I.IRON_LT, finish="metal")
    g = Geo().blob((sx, sy + 4.0, sz + 2.0), (24.6, 10.6, 5.0), p=2.8)
    g.clip((0, sy + 8.0, 0), (0, 1, 0))
    rig.part("track", g, team=True, outline=0.6)
    g = Geo()
    I.rivets(g, [(sx + dx, sy - 5.6, sz + dz) for dx in (-16, -8, 0, 8, 16) for dz in (-10.0, 12.0)], r=1.0)
    rig.part("track", g, I.BRASS_LT, finish="metal", outline=0)
    g = Geo().blob((sx, sy + 4.0, sz), (24.35, 10.15, 16.25), p=2.8, taper=(0.8, 1.0))   # (r9) a plate seam: a band
    g.clip((0, 0, sz - 4.5), (0, 0, 1))                                                  # of the drum's own surface,
    g.clip((0, 0, sz - 5.7), (0, 0, -1))                                                 # 0.2-0.3 lu proud, round its
    g.clip((0, sy + 8.0, 0), (0, 1, 0))                                                  # lower half
    rig.part("track", g, SEAM_DK, finish="metal", outline=0)
    gunner(rig, "track", (sx + 2.0, sy + 3.0, sz + 11.0), "g0")
    rig.joint("mg0", "track", (sx + 16.0, sy - 2.0, sz + 16.0))
    rotary_gun(rig, "mg0", (sx + 14.0, R0_MUZZLE[1], sz + 16.0), R0_MUZZLE, k=1.0)
    g = Geo().blob((sx + 12.6, R0_MUZZLE[1] - 2.0, sz + 15.0), (3.0, 2.4, 2.8), p=2.4)
    rig.part("mg0", g, I.SKIN, outline=0.5)
    rig.track("rider0Muzzle", "mg0", R0_MUZZLE)
    rig.track("mgMuzzle", "mg0", R0_MUZZLE)       # R3: second-attack accents and attack_alt bullets
    I.muzzle_flash(rig, "mg0", R0_MUZZLE, size=0.9, name="flash0")

    rig.joint("smoke", "root", (MUZZLE[0] + 16, -20, BARREL_Z + 30), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 11.0), (12, 5, 9.0), (-8, 10, 8.0), (6, 15, 7.4), (20, -2, 6.6),
                      (-14, -2, 6.4), (-2, -9, 6.0)):
        g.sphere((MUZZLE[0] + 16 + dx, -20, BARREL_Z + 30 + dz), r, cuts=4)
    rig.part("smoke", g, I.SMOKE, finish="dust", outline=0.8)
    rig.track("_foot", "odo", (0, 0, 0))
    _wreck(rig)
    _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, vehicle), on the surfaces the camera sees through every clip (joint
    space): the team band's front (r 10), the side frame, the sponson's foot, the casemate's team band, the barbette;
    smoke from the engine low on the frame's rear (below the sponson gunner's head on every frame and far behind it,
    so the fire `fireAt` picks burns there) and from the stack's crown."""
    sx, sy, sz = SPONSON
    rig.damage_spot("band", "track", (60.0, TY - 3.5, 45.0), 10.0, "metal", team=True)
    rig.damage_spot("frame", "track", (0.0, TY - 2.1, 78.0), 7.0, "metal")
    rig.damage_spot("sponson", "track", (sx, sy + 4.0 - 8.7, sz - 11.0), 6.0, "metal", normal=(0, -0.93, -0.36))
    rig.damage_spot("casemate", "casemate", (CASEMATE[0] - 6.0, -26.1, CASEMATE[2] + 6.0), 7.0, "metal", team=True)
    bx, by, bz = BARBETTE
    rig.damage_spot("barbette", "hull", (bx, by - 13.55, bz - 6.0), 6.0, "metal")
    rig.damage_spot("engine", "track", (-74.0, TY - 3.6, 50.0), 9.0, "smoke", kind="emit", normal=(0, -1, 0))
    rig.damage_spot("stack", "hull", (-28.0, 12.0, 123.0), 8.0, "smoke", kind="emit", normal=(0, 0, 1))


def _frame_detail(rig, cxr, czr):
    """W3: the near side frame in plates: dark seams up the iron above the team band with proud rivet columns beside
    them and a proud row along it; the team band edged and split in team-dark with proud rivets at its foot and mud
    splashed along it; brass rivets round the roundel; scratches over the nose's warning stripes (joint space: the
    frame's face is the plane y = TY - 2, the band's TY - 3.4)."""
    fy, by_ = TY - 2.0, TY - 3.4
    g = Geo()
    for x, top in ((-50.0, 84.0), (-16.0, 86.0), (18.0, 86.0), (52.0, 82.0)):
        g.slab([(x - 0.7, 64.0), (x + 0.7, 64.0), (x + 0.7, top), (x - 0.7, top)], fy - 0.3, 0.6)
    rig.part("track", g, SEAM_DK, finish="metal", outline=0)
    g = Geo()
    for x, top in ((-50.0, 84.0), (-16.0, 86.0), (18.0, 86.0), (52.0, 82.0)):
        for dx in (-2.6, 2.6):
            for z in (67.0, top - 3.0):
                g.sphere((x + dx, fy - 0.5, z), 1.3, cuts=2)
    for x in range(-64, 60, 8):
        if all(abs(x - s) > 4.0 for s in (-50.0, -16.0, 18.0, 52.0)):
            g.sphere((x, fy - 0.5, 72.0), 1.3, cuts=2)
    rig.part("track", g, I.IRON_LT, finish="metal", outline=0.3)
    g = Geo()   # along the band's foot, painted over with it (team: the shipped team share has little margin)
    for x in range(-74, 80, 9):
        g.sphere((x, by_ - 0.4, 33.4), 1.2, cuts=2)
    rig.part("track", g, team=True, finish="metal", outline=0.3)
    g = Geo()
    g.slab([(-84.0, 61.8), (99.0, 61.8), (98.4, 63.0), (-84.0, 63.0)], by_ - 0.2, 0.4)          # the band's top edge
    g.slab([(-80.0, 31.0), (79.0, 31.0), (79.6, 32.2), (-80.4, 32.2)], by_ - 0.2, 0.4)           # its foot
    for x in (40.0, 70.0):
        g.slab([(x - 0.6, 32.0), (x + 0.6, 32.0), (x + 0.6, 62.0), (x - 0.6, 62.0)], by_ - 0.2, 0.4)
    IW.team_dark(rig, "track", g, outline=0)
    g = Geo()
    for a in range(0, 360, 45):
        t = math.radians(a + 22.5)
        g.sphere((cxr + 13.0 * math.cos(t), TY - 4.9, czr + 13.0 * math.sin(t)), 1.1, cuts=2)
    rig.part("track", g, I.BRASS_LT, finish="metal", outline=0.3)
    g = Geo()
    for x, z, rx, rz in ((-70.0, 26.5, 4.0, 2.0), (-58.0, 25.2, 2.4, 1.4), (-22.0, 26.0, 3.2, 1.8), (58.0, 26.8, 4.4, 2.2),
                         (66.0, 25.4, 2.0, 1.2), (34.0, 25.6, 2.6, 1.4), (-76.0, 29.0, 1.4, 1.0), (62.0, 29.4, 1.2, 0.9)):
        g.blob((x, fy - 0.7, z), (rx, 0.35, rz), p=2.2)               # on the iron frame under the band (over its seams)
    rig.part("track", g, MUD, outline=0, highlight=False)
    g = Geo()
    for (x0, z0), (x1, z1) in (((80.0, 52.0), (86.0, 49.0)), ((84.0, 44.0), (91.0, 41.5)), ((78.0, 40.0), (82.0, 37.0))):
        g.capsule((x0, TY - 3.9, z0), (x1, TY - 3.9, z1), 0.5, segs=8, rings=2)
    rig.part("track", g, IRON_HI, finish="metal", outline=0, highlight=False)
    _frame_plates(rig, fy, by_)


# W3 (r9): the war machines' panel lines every 6-12 lu, rivet rows as texture, wear and a grime gradient towards the
# ground (audit 5.2). The first render (r8) measured edge 0.40 and micro 3.07 against the floors 0.45 and 3.4: the
# plates above and below the team band and the band itself read as flat fields at game scale.
#
# The look-dev of that pass (ld9: flat 0.17, micro 3.8, edge 0.41-0.44) still read the lower plates and the band as the
# weakest fields (edge 0.31 in the bottom sixth, 0.34 on the team), so the plates under the band go to a seam every
# 10 lu with a riveted lap seam, and the band's seams carry rivet columns as riveted plate does.
UP_SEAMS = ((-50.0, 84.0), (-36.0, 86.0), (-16.0, 86.0), (-4.0, 86.0), (18.0, 86.0), (36.0, 85.0), (52.0, 82.0))
LO_SEAMS = [float(x) for x in range(-50, 71, 10)]
BAND_SPLITS = (-70.0, 40.0, 55.0, 70.0)
CHIPS_UP = [(-58.0, 68.4, 2.2, 1.0), (-43.0, 80.6, 1.4, 0.5), (-42.0, 66.2, 1.4, 0.8), (-23.0, 69.4, 2.4, 1.1),
            (-10.0, 82.2, 1.6, 0.8), (-10.0, 66.0, 1.4, 0.7), (8.0, 75.4, 1.5, 0.8), (11.0, 81.4, 1.8, 0.9),
            (25.0, 67.6, 1.8, 0.9), (30.0, 81.2, 1.4, 0.7), (44.0, 69.4, 2.0, 1.0), (44.0, 80.9, 1.6, 0.6),
            (-56.0, 75.4, 1.6, 0.8), (24.0, 75.0, 1.2, 0.7), (-26.0, 75.2, 1.3, 0.7), (-64.0, 81.0, 1.2, 0.7)]
CHIPS_LO = [(-45.0, 19.5, 2.0, 0.9), (-25.0, 19.6, 1.6, 0.8), (-5.0, 19.4, 2.2, 0.9), (15.0, 19.5, 1.5, 0.8),
            (35.0, 19.6, 2.0, 0.9), (55.0, 19.4, 1.6, 0.8), (-35.0, 26.5, 1.4, 0.8), (5.0, 27.0, 1.5, 0.9),
            (25.0, 26.4, 1.4, 0.7), (45.0, 27.2, 1.4, 0.8), (-15.0, 13.0, 1.6, 0.7), (15.0, 13.2, 1.4, 0.7),
            (65.0, 13.4, 1.5, 0.7), (-45.0, 13.0, 1.3, 0.6)]
SMUDGES = [(-40.0, 9.4, 6.0, 1.6), (-12.0, 10.0, 7.0, 1.8), (18.0, 9.2, 6.4, 1.5), (46.0, 9.8, 7.4, 1.7),
           (62.0, 9.6, 4.4, 1.3), (-25.0, 24.2, 3.4, 1.1), (45.0, 24.0, 3.0, 1.0)]
SCUFFS = [(-79.0, 53.5), (-64.0, 38.5), (-58.0, 54.0), (47.0, 39.5), (49.0, 55.0), (61.0, 41.0), (63.5, 55.5),
          (77.0, 52.0), (81.0, 39.6)]
CHIP = "#6E747C"       # bare iron where the paint is worn (a step lighter than I.IRON)
GRIME = "#4B5056"      # road grime towards the ground (a step darker)


def _frame_plates(rig, fy, by_):
    g = Geo()
    for x, top in UP_SEAMS[1::2]:                                       # seams between the four first ones
        g.slab([(x - 0.6, 64.0), (x + 0.6, 64.0), (x + 0.6, top), (x - 0.6, top)], fy - 0.3, 0.6)
    g.slab([(-70.0, 78.4), (64.0, 78.4), (64.0, 79.6), (-70.0, 79.6)], fy - 0.3, 0.6)   # a lap seam along them
    for x in LO_SEAMS:                                                   # the plates under the band, every 10 lu
        g.slab([(x - 0.6, 14.0), (x + 0.6, 14.0), (x + 0.6, 30.0), (x - 0.6, 30.0)], fy - 0.3, 0.6)   # (over the hubs)
    g.slab([(-62.0, 21.4), (74.0, 21.4), (74.0, 22.6), (-62.0, 22.6)], fy - 0.3, 0.6)   # and their lap seam
    rig.part("track", g, SEAM_DK, finish="metal", outline=0)
    g = Geo()   # proud rivets: pairs at the new seams' ends, a row along the frame's top edge, the lower lap seam's row
    for x, top in UP_SEAMS[1::2]:                                       # and a column beside each lower seam
        for dx in (-2.6, 2.6):
            for z in (67.0, top - 3.0):
                g.sphere((x + dx, fy - 0.5, z), 1.3, cuts=2)
    for x in range(-60, 57, 8):
        if all(abs(x - s) > 5.5 for s, _ in UP_SEAMS):
            g.sphere((x, fy - 0.5, 84.0), 1.2, cuts=2)
    for x in (-59.0, -31.0, -10.0, 4.0, 11.0, 25.0, 46.0):              # the upper lap seam's rivets (clear of the
        g.sphere((x, fy - 0.5, 79.0), 1.2, cuts=2)                     # shovel, the soot and the lifebuoy)
    for x in LO_SEAMS[:-1]:
        g.sphere((x + 5.0, fy - 0.5, 22.0), 1.2, cuts=2)
        g.sphere((x + 5.0, fy - 0.5, 16.0), 1.1, cuts=2)
    for k, x in enumerate(LO_SEAMS):
        g.sphere((x + (2.2 if k % 2 else -2.2), fy - 0.5, 27.0), 1.1, cuts=2)
    rig.part("track", g, I.IRON_LT, finish="metal", outline=0.3)
    g = Geo()   # the band split into plates (team-dark) and a team-painted rivet row along its top edge
    for x in (-70.0, 55.0):
        g.slab([(x - 0.6, 32.0), (x + 0.6, 32.0), (x + 0.6, 62.0), (x - 0.6, 62.0)], by_ - 0.2, 0.4)
    g.slab([(-84.0, 46.4), (88.0, 46.4), (88.0, 47.6), (-84.0, 47.6)], by_ - 0.2, 0.4)     # a lap seam along it
    for x, z in SCUFFS:                                                  # scuffed paint (team-dark)
        g.blob((x, by_ - 0.15, z), (1.6, 0.3, 0.6), p=2.2, rot=(0, 12, 0))
    IW.team_dark(rig, "track", g, outline=0)
    g = Geo()   # team-painted rivets: along the band's top edge, its lap seam and down both sides of each split
    for x in range(-80, 96, 9):
        g.sphere((x, by_ - 0.4, 60.4), 1.2, cuts=2)
    for x in range(-80, 88, 9):
        if all(abs(x + 4.5 - s) > 3.5 for s in BAND_SPLITS):
            g.sphere((x + 4.5, by_ - 0.4, 47.0), 1.1, cuts=2)
    for x in BAND_SPLITS:
        for dx in (-2.4, 2.4):
            for z in (37.5, 42.0, 52.0, 56.5):
                if x + dx < 79.0 + (z - 31.0) * 0.6:                    # inside the band's slanted front edge
                    g.sphere((x + dx, by_ - 0.4, z), 1.0, cuts=2)
    rig.part("track", g, team=True, finish="metal", outline=0.3)
    g = Geo()   # worn paint: bare iron chips over the plates
    for x, z, rx, rz in CHIPS_UP + CHIPS_LO:
        g.blob((x, fy - 0.25, z), (rx, 0.35, rz), p=2.2)
    rig.part("track", g, CHIP, finish="metal", outline=0, highlight=False)
    g = Geo()   # road grime towards the ground: smudges along the frame's foot and under the band
    for x, z, rx, rz in SMUDGES:
        g.blob((x, fy - 0.22, z), (rx, 0.35, rz), p=2.0)
    rig.part("track", g, GRIME, outline=0, highlight=False)


def _wreck(rig):
    """Hidden death parts: a fire flash in the hull, a snapped track run dangling at the nose with
    loose links on the ground, and dark smoke rising from both sponsons."""
    bx, bz = 62.0, 96.0      # the flash bursts out of the roof by the casemate (the team band stays clear)
    rig.joint("boom", "hull", (bx, TY - 10.0, bz), hidden=True)
    g = Geo().sphere((bx, TY - 18.0, bz), 16.0, cuts=4)
    rig.part("boom", g, glow=I.FIRE, outline=0)
    g = Geo().sphere((bx + 2.0, TY - 26.0, bz + 2.0), 9.0, cuts=4)
    rig.part("boom", g, glow=I.FLASH_CORE, outline=0)
    g = Geo()
    for i in range(9):
        a = math.pi * (0.05 + 0.9 * i / 8)
        L = 36.0 if i % 2 else 27.0
        g.capsule((bx + 12 * math.cos(a), TY - 24.0, bz + 12 * math.sin(a)),
                  (bx + L * math.cos(a), TY - 24.0, bz + L * math.sin(a)), 3.2, 1.0, segs=6, rings=2)
    rig.part("boom", g, glow=I.FLASH, outline=0)
    rig.joint("broken", "track", (96.0, TY - 6.0, 30.0), hidden=True)
    g = Geo()
    pts = [(98.0, 40.0), (104.0, 29.0), (110.0, 19.0), (118.0, 12.0), (128.0, 8.0)]
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        g.capsule((x0, TY - 6.0, z0), (x1, TY - 6.0, z1), 4.0, segs=10, rings=2)
    rig.part("broken", g, I.COAL, finish="gloss")
    g = Geo()
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        for t in (0.25, 0.75):
            x, z = x0 + (x1 - x0) * t, z0 + (z1 - z0) * t
            g.blob((x, TY - 10.2, z), (2.2, 1.6, 2.2), p=2.4)
    for x in (136.0, 144.0, 140.0):   # loose links (on the ground once the hull has nosed down)
        g.blob((x, TY - 8.0, 6.0 + (x % 3)), (3.4, 3.0, 1.8), p=2.6)
    rig.part("broken", g, I.IRON_LT, finish="metal", outline=0.5)
    for name, at in (("wsmoke0", (10.0, TY - 16.0, 70.0)), ("wsmoke1", (-46.0, 10.0, 118.0))):
        rig.joint(name, "hull", at, hidden=True)
        g = Geo()
        for dx, dz, r in ((0, 0, 7.0), (5, 8, 6.0), (-4, 13, 5.4), (2, 20, 6.4), (-3, 28, 5.0)):
            g.sphere((at[0] + dx, at[1] - 4.0, at[2] + dz), r, cuts=4)
        rig.part(name, g, I.SMOKE_DK, finish="dust", outline=0.8)


# -- poses ---------------------------------------------------------------------------------
def _tracks(step, moving=True):
    d = STEP_LU if moving else 0.0
    return merge(I.poly_tread_pose("tn", step, d, PITCH), I.poly_tread_pose("tf", step, d, PITCH),
                 I.wheel_spin(_T["road"], d * step), I.wheel_spin(_T["wheels"], d * step))


def _riders(t, fire0=False, fire1=False):
    """Gunner sway and gun jitter; `t` is a phase in radians."""
    return {
        "g0": {"r": 2.0 * math.sin(t), "z": 0.5 * math.cos(t)},
        "g1": {"r": 2.0 * math.sin(t + 1.3), "z": 0.5 * math.cos(t + 1.3)},
        "mg0": {"r": 3.0 * math.sin(t + 0.6)}, "mg1": {"r": 3.0 * math.sin(t + 2.0)},
        "flash0": {"show": fire0}, "flash1": {"show": fire1},
    }


def _idle(f):
    # 6 poses in 900 ms: the engine idles (the hull shivers on its springs), the exhaust puffs twice,
    # the sponson gunner pops up to look around (2-3) and the barbette gunner scans the other way
    c = math.cos(2 * math.pi * f / 6)
    pop = [0.0, 0.3, 1.0, 1.0, 0.3, 0.0][f]
    return merge(_tracks(0, False), _riders(f * math.pi / 3), {
        "hull": dict(squash(0.008 * c), z=0.7 * c + [0, 0.3, -0.3, 0.3, -0.3, 0][f]),
        "g0": {"z": 5.0 * pop, "r": -6 * pop},
        "g1": {"rz": [0, 10, 20, 10, -10, -5][f]},
        "g1_eyes": {"x": [0, 0.5, 1.0, 0.5, -0.5, 0][f]},
        "exhaust": {"show": f in (1, 2, 4), "s": [1, 0.8, 1.15, 1, 0.8, 1][f], "z": [0, 0, 5, 0, 0, 0][f]},
    })


def _walk(f):
    # roll: the belts scroll, the hull heaves and pitches over the ground, the crew bounces a beat
    # late, the tail wheel wobbles and the exhaust puffs twice a cycle
    p = 2 * math.pi * f / 8
    return merge(_tracks(f), _riders(p), {
        "odo": {"x": 2.0 * STEP_LU * math.cos(p)},
        "hull": dict(squash(0.012 * math.cos(2 * p)), z=2.2 * math.cos(2 * p) + 0.2, r=1.8 * math.sin(p)),
        "g0": {"z": 2.0 * math.cos(2 * p - 1.2)}, "g1": {"z": 2.0 * math.cos(2 * p - 1.6)},
        "tail": {"r": -2.0 * math.sin(p)},
        "exhaust": {"show": f % 4 in (1, 2), "x": [0, -4, -9, 0][f % 4], "s": [1, 0.9, 1.25, 1][f % 4],
                    "z": [0, 0, 4, 0][f % 4]},
    })


def _walk_clip():
    # dust kicked up behind the rear of the belt, a fresh little cloud every other frame
    ov = {f: [{"kind": "dust", "ground": (-96.0 - 4.0 * (f % 4), 0.0), "size_lu": 8.0 + (f % 4), "puffs": 3,
               "seed": 80 + f, "spread": 1.0, "dir": -1.0}] for f in (0, 2, 4, 6)}
    return M.clip("walk", [_walk(f) for f in range(8)], [WALK_MS] * 8, loop=True, overlays=ov)


# attack: 11 unique frames in 933 ms; the shell leaves on frame 4 at 350 ms (impactAt 0.3751, as
# shipped). The shipped 180 ms aim is split into the hold (125) and a wobble partner (55) for the holdLoop.
ATTACK_MS = [80, 90, 125, 55, 60, 90, 90, 80, 80, 90, 93]
ATTACK_IMPACT = 4
U_OF = [0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9]     # unique frame -> row of the pose tables below
#       dip  lift HOLD FIRE rock  fwd  back smoke cheer settle
A_X = [0.5, 1.0, 1.5, -4.0, -8.0, -4.5, -2.0, -1.0, -0.5, 0.0]
A_R = [-0.8, -0.2, 0.6, 2.8, 4.2, -1.8, 1.4, -0.6, 0.3, 0.0]
A_Q = [-0.02, -0.03, -0.05, 0.05, -0.07, 0.03, -0.02, 0.0, 0.0, 0.0]
A_BX = [0, 0, 0, -11.0, -9.0, -5.0, -2.0, 0, 0, 0]
A_BR = [1.0, 3.0, 4.0, 5.0, 5.5, 3.5, 2.0, 1.0, 0.5, 0.0]
A_REC = [0, 0, 0, 3.0, 7.0, 8.0, 7.0, 6.0, 5.0, 4.5]


def _attack(f):
    wob = f == 3
    f = U_OF[f]
    pose = merge(_tracks(0, False), _riders(f * 0.8 + (0.5 if wob else 0.0)), {
        "body": dict(squash(A_Q[f]), x=A_X[f]),
        "hull": {"r": A_R[f]},
        "barrel": {"x": A_BX[f], "r": A_BR[f] + (1.2 if wob else 0.0)},
        "g0": {"r": [0, 0, -4, 12, 10, 4, 0, 0, -6, 0][f], "z": [0, 0, -2, -3, -2, 0, 0, 2, 6, 1][f]},
        "g1": {"r": [0, 0, -4, 14, 11, 4, 0, 0, -6, 0][f], "z": [0, 0, -2, -3, -2, 0, 0, 2, 6, 1][f]},
        "g0_eyes": {"sz": 0.35 if f in (2, 3, 4) else 1.0},
        "g1_eyes": {"sz": 0.35 if f in (2, 3, 4) else 1.0},
        "g0_arms": {"show": f == 8}, "g1_arms": {"show": f == 8},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5, 6, 7), "s": [1, 1, 1, 1, 0.75, 1.0, 1.1, 1.2, 1, 1][f],
                  "x": [0, 0, 0, 0, -10, 0, 7, 14, 0, 0][f], "z": [0, 0, 0, 0, -12, 0, 7, 13, 0, 0][f]},
        "exhaust": {"show": f in (4, 5, 6), "s": [1, 1, 1, 1, 1.2, 1.5, 1.7, 1, 1, 1][f],
                    "z": [0, 0, 0, 0, 0, 5, 10, 0, 0, 0][f]},
    })
    if wob:
        pose["hull"]["z"] = pose["hull"].get("z", 0.0) + 0.5
    rec = A_REC[f]
    for name, r in _T["road"] + _T["wheels"]:
        pose.setdefault(name, {})["r"] = pose.get(name, {}).get("r", 0.0) + math.degrees(rec / r)
    return pose


def _attack_clip():
    ov = {
        4: [{"kind": "burst", "joint": "barrel", "point": MUZZLE, "r0_lu": 22.0, "r1_lu": 36.0, "n": 8,
             "a0": -80.0, "arc": 160.0},
            {"kind": "dust", "ground": (-60.0, 0.0), "size_lu": 12.0, "puffs": 4, "seed": 71, "spread": 1.2,
             "dir": -1.0}],
        5: [{"kind": "dust", "ground": (-70.0, 0.0), "size_lu": 14.0, "puffs": 5, "seed": 72, "spread": 1.5,
             "dir": -1.0},
            {"kind": "dust", "ground": (70.0, 0.0), "size_lu": 10.0, "puffs": 4, "seed": 73, "spread": 1.2}],
    }
    return M.clip("attack", [_attack(f) for f in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  extra={"holdStep": 2, "holdLoop": [2, 3]})


# -- attack B: main gun angled up, the funnels belch (ANIM_SPEC appendix B) ------------------------
# unique frames: 0 = A dip, 1 elevate, 2 HOLD (the hull reared nose-up on its springs, the barrel
# elevated), 3 wobble (holdLoop), 4 FIRE, 5 hop, 6 slam down, 7 belch (both funnels), 8 settle,
# 9-10 = A settle. The hull pitches about its rear springs.
#         elev HOLD wob  FIRE hop  slam belch settle
UB_HR = [2.5, 5.0, 5.4, 6.5, 4.0, -2.0, 1.0, 0.4]
UB_BR = [8.0, 15.0, 16.2, 16.5, 13.0, 9.0, 5.0, 2.0]
UB_BX = [0.0, 0.0, 0.0, -12.0, -9.0, -5.0, -2.5, -0.5]
UB_X = [0.5, 1.0, 1.0, -5.0, -7.0, -3.0, -1.0, 0.0]
UB_Z = [0.0, 0.0, 0.4, 1.0, 4.0, -1.0, 0.5, 0.0]
UB_Q = [-0.01, -0.03, -0.03, 0.05, 0.03, -0.08, 0.02, 0.0]
UB_REC = [0, 0, 0, 3.0, 8.0, 9.0, 8.0, 7.0]


def _b_pose(i):
    if i in (0, 9, 10):
        return _attack(i)
    k = i - 1
    pose = merge(_tracks(0, False), _riders(i * 0.8), {
        "body": dict(squash(UB_Q[k]), x=UB_X[k], z=UB_Z[k]),
        "hull": {"r": UB_HR[k]},
        "barrel": {"x": UB_BX[k], "r": UB_BR[k]},
        "g0": {"r": [0, -4, -4, 14, 12, 4, -6, 0][k], "z": [0, -2, -2, -3, -1, -2, 6, 1][k]},
        "g1": {"r": [0, -4, -4, 15, 12, 4, -6, 0][k], "z": [0, -2, -2, -3, -1, -2, 6, 1][k]},
        "g0_eyes": {"sz": 0.35 if k in (1, 2, 3) else 1.0},
        "g1_eyes": {"sz": 0.35 if k in (1, 2, 3) else 1.0},
        "g0_arms": {"show": k == 6}, "g1_arms": {"show": k == 6},
        "flash": {"show": k == 3},
        "smoke": {"show": k in (4, 5, 6), "s": [1, 1, 1, 1, 0.8, 1.05, 1.2, 1][k],
                  "x": [0, 0, 0, 0, -12, -2, 6, 0][k], "z": [0, 0, 0, 0, 6, 18, 26, 0][k]},
        "exhaust": {"show": k in (5, 6, 7), "s": [1, 1, 1, 1, 1, 1.8, 2.3, 2.0][k],
                    "z": [0, 0, 0, 0, 0, 4, 10, 16][k], "x": [0, 0, 0, 0, 0, -3, -7, -10][k]},
        "wsmoke1": {"show": k in (6, 7), "s": [1, 1, 1, 1, 1, 1, 1.0, 1.2][k], "z": [0, 0, 0, 0, 0, 0, 2, 8][k]},
    })
    rec = UB_REC[k]
    for name, r in _T["road"] + _T["wheels"]:
        pose.setdefault(name, {})["r"] = pose.get(name, {}).get("r", 0.0) + math.degrees(rec / r)
    return pose


def _attack_b():
    ov = {
        4: [{"kind": "burst", "joint": "barrel", "point": MUZZLE, "r0_lu": 22.0, "r1_lu": 36.0, "n": 8,
             "a0": -60.0, "arc": 160.0},
            {"kind": "dust", "ground": (-64.0, 0.0), "size_lu": 12.0, "puffs": 4, "seed": 74, "spread": 1.2,
             "dir": -1.0}],
        6: [{"kind": "dust", "ground": (-70.0, 0.0), "size_lu": 14.0, "puffs": 5, "seed": 75, "spread": 1.5,
             "dir": -1.0},
            {"kind": "dust", "ground": (76.0, 0.0), "size_lu": 12.0, "puffs": 5, "seed": 76, "spread": 1.4}],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 2, "holdLoop": [2, 3]})


# -- attack_alt: the sponson gunners fire (6 / 0.5 s, ANIM_SPEC R3), played while the landship stands --
# 6 frames in 450 ms, the shots on frame 3 at 240 ms: lean in, aim, HOLD (squinting), FIRE (both rotary
# guns flash), recoil (the barrels spin, the gunners rock back), settle. The body holds idle pose 0.
ALT_MS = [60, 70, 110, 60, 70, 80]
ALT_IMPACT = 3


# aimed gunners (queue item 44, ageborn_art/aimed.py): `turn` turns the sponson gun (the clip's measured weapon, its
# `mgMuzzle`); the barbette gun up top turns with it, less when aiming up (it already points 30 degrees up at the
# flyers) and further when aiming down (it sits 70 lu higher over the ground troops); both gunners lean with their guns
AIM_W_ALT = [0.5, 1.0, 1.0, 1.0, 0.8, 0.4]
AIM_TARGETS = {"down": -20.0}
AIM_MG1 = (0.3, 2.4)      # the barbette gun's share of an up and of a down turn


def _alt_pose(f, turn=0.0):
    base = _idle(0)
    mg = [2.0, 5.0, 5.0, 3.0, -4.0, 0.0][f]
    t1 = turn * (AIM_MG1[0] if turn > 0 else AIM_MG1[1])
    pose = merge(base, {
        "g0": {"r": [-4, -8, -9, 6, 8, 2][f] + 0.15 * turn, "x": [1.0, 2.0, 2.0, -1.0, -1.5, 0.0][f]},
        "g1": {"r": [-4, -8, -9, 7, 9, 2][f] + 0.15 * t1, "x": [1.0, 2.0, 2.0, -1.0, -1.5, 0.0][f]},
        "mg0": {"r": mg + turn}, "mg1": {"r": mg + 1.0 + t1},
        "g0_eyes": {"sz": 0.35 if f in (1, 2, 3) else 1.0},
        "g1_eyes": {"sz": 0.35 if f in (1, 2, 3) else 1.0},
        "flash0": {"show": f == 3}, "flash1": {"show": f == 3},
    })
    return pose


def _attack_alt():
    ov = {3: [{"kind": "burst", "joint": "mg0", "point": R0_MUZZLE, "r0_lu": 6.0, "r1_lu": 11.0, "n": 5,
               "a0": -50.0, "arc": 100.0},
              {"kind": "burst", "joint": "mg1", "point": R1_MUZZLE, "r0_lu": 6.0, "r1_lu": 11.0, "n": 5,
               "a0": -50.0, "arc": 100.0}]}
    return M.clip("attack_alt", [_alt_pose(f) for f in range(6)], ALT_MS, impact=ALT_IMPACT, overlays=ov,
                  extra={"noMuzzle": True})


def _hit(k):
    # vehicle: a suspension bounce, the crew ducks into the hatches, a spark on the side plate,
    # the pennant and the tail wheel whip
    a = M.HIT_AMT[k]
    duck = [0.8, 1.0, 0.6, 0.1, 0.0][k]
    return merge(_tracks(0, False), _riders(0.0), {
        "body": dict(squash(-0.05 * a), x=-4.0 * a, z=[0, 1.5, 0.5, -0.5, 0][k]), "hull": {"r": 3.0 * a},
        "g0": {"r": 10 * a, "z": -7.0 * duck}, "g1": {"r": 10 * a, "z": -7.0 * duck},
        "g0_eyes": {"sz": 0.35 if k < 2 else 1.0}, "g1_eyes": {"sz": 0.35 if k < 2 else 1.0},
        "mg0": {"r": 10 * a}, "mg1": {"r": 10 * a},
        "hitspark": {"show": k < 2, "s": [1.2, 0.8, 1, 1, 1][k]},
        "tail": {"r": 5 * a},
    })


# death ("crew bails out"): 8 unique poses, 12 steps (about 1.1 s). The hull keeps its shape: it
# lurches, noses down 7 degrees onto the snapped track, the casemate is knocked askew and the gun
# droops; a fire flash on frames 1-2, black smoke rising from both sponsons from frame 2; the two
# gunners climb up out of their hatches from frame 2, arms up (the game spawns the 2 Carbineers at the end).
DIE_SEQ = [0, 1, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7]
DIE_MS = [70, 70, 80, 80, 80, 90, 90, 100, 100, 110, 110, 120]


def _die(f):
    tilt = pick(f, [2.0, -3.0, -6.0, -7.5, -7.0, -7.0, -7.0, -7.0])
    pose = merge(_tracks(0, False), {
        "body": {"x": pick(f, [-3, -1, 2, 3, 3, 3, 3, 3]), "r": tilt,
                 "z": pick(f, [1.5, 5.5, 11.0, 13.2, 12.6, 12.8, 12.8, 12.8])},   # pivot on the nose
        "hull": {"r": pick(f, [0, 0.8, -0.6, 0.3, 0, 0, 0, 0])},
        "casemate": {"rz": pick(f, [0, 8, 16, 20, 19, 20, 20, 20]), "r": pick(f, [0, 4, 7, 8, 8, 8, 8, 8]),
                     "x": pick(f, [0, -1, -3, -4, -4, -4, -4, -4]), "z": pick(f, [0, 3, 2, 0.5, 0.5, 0.5, 0.5, 0.5])},
        "barrel": {"r": pick(f, [-4, -10, -18, -22, -21, -22, -22, -22])},
        "boom": {"show": f in (1, 2), "s": pick(f, [1, 1.0, 1.25, 1, 1, 1, 1, 1])},
        "broken": {"show": f >= 2},
        "wsmoke0": {"show": f >= 2, "s": pick(f, [1, 1, 0.6, 0.8, 1.0, 1.15, 1.3, 1.4]),
                    "z": pick(f, [0, 0, 0, 4, 8, 12, 16, 20])},
        "wsmoke1": {"show": f >= 3, "s": pick(f, [1, 1, 1, 0.6, 0.85, 1.05, 1.2, 1.35]),
                    "z": pick(f, [0, 0, 0, 0, 4, 8, 12, 16])},
        "exhaust": {"show": True, "s": pick(f, [1.2, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0])},
        # the gunners: jolted, then climbing up out of the hatches (frame 2), arms up
        "g0": {"z": pick(f, [4, 2, 10, 16, 19, 18, 19, 18]), "x": pick(f, [-2, -2, -3, -5, -7, -8, -8, -8]),
               "r": pick(f, [8, 10, -6, -12, 6, 14, 10, 12])},
        "g1": {"z": pick(f, [4, 2, 11, 17, 20, 19, 20, 19]), "x": pick(f, [-2, -2, -4, -6, -8, -9, -9, -9]),
               "r": pick(f, [10, 12, -4, -10, 8, 16, 12, 14])},
        "g0_arms": {"show": f >= 2}, "g1_arms": {"show": f >= 2},
        "mg0": {"r": pick(f, [-8, -16, -24, -28, -28, -28, -28, -28])},
        "mg1": {"r": pick(f, [-8, -16, -24, -28, -28, -28, -28, -28])},
    })
    if f <= 3:
        pose.update({"g0_eyes": {"hide": True}, "g0_ko": {"show": True},
                     "g1_eyes": {"hide": True}, "g1_ko": {"show": True}})
    pose.setdefault("tw0", {})["r"] = pick(f, [0, 20, 40, 50, 50, 50, 50, 50])
    return pose


def _die_extra():
    total = sum(DIE_MS)
    handoff = sum(DIE_MS[:len(DIE_MS) - 2])
    h = HEIGHT_LU
    return {"fx": [{"id": "fx.dust_poof", "atMs": handoff - 40, "offsetLu": [0, round(h * 0.36, 1)]},
                   {"id": "fx.ko_stars", "atMs": handoff + 40, "offsetLu": [0, round(h * 0.55, 1)],
                    "loops": 2, "scalePow": 0.5}],
            "crewOutAtMs": sum(DIE_MS[:DIE_SEQ.index(2)]),
            "hideUnitAtMs": total}


def clips():
    alt = _attack_alt()
    # the gunners aimed up about 45 degrees at flyers and down at the ground troops (the extras sheet)
    aimed_alt = AIMED.variants(RIG, alt, _alt_pose, AIM_W_ALT, aims=("up45", "down"), targets=AIM_TARGETS)
    for v in aimed_alt:
        AIMED.check_timing(alt, v)
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [150] * 6, loop=True),
        _walk_clip(),
        _attack_clip(),
        _attack_b(),
        alt,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        Clip("die", 8, _die, sequence=DIE_SEQ, durations=DIE_MS, extra=_die_extra()),
    ]
    by = {c.name: c for c in cl}
    assert [by[n].total_ms() for n in ("idle", "walk", "hit", "die")] == [900, 640, 310, 1100]
    m = by["attack"].meta()
    assert m["durationMs"] == 933 and m["impactAt"] == 0.3751, m
    return M.check_variants(cl) + aimed_alt
