"""Pulse Trooper: Future Age ranged (DESIGN A5.6). Plasma bolt, laser damage, ~70 lu.

Look (A11): charcoal undersuit, glossy white armour, a big helmet whose upper dome is a team cap
over a white faceplate with a dark visor and mint robot eyes that act (angry while aiming, a slit
on the shot, > < when hit, X on death), a whip antenna with a magenta tip (follow-through), a team
chest plate with the pale Future hex, team shoulder pads with light strips, a belt with pouches and
a glowing buckle, a backpack power pack with a cable that swings to the rifle, and an oversized
plasma rifle: a charcoal receiver, a white shroud, three mint coil rings, a top cell hatch, a wide
flared muzzle with a magenta ring.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    rifle at low ready, taps the side of his visor with the far hand, weight shift, a blink
  walk    walk v3 bounce jog at ground speed (ANIM_SPEC G1, 81.25 lu/s): the rifle carried at port
          across the chest and bobbing a frame late, planted feet, the antenna and cable swinging
  attack  SHOULDER, CHARGE, SNAP AND CELL SWAP: snaps the rifle to his shoulder, the coils heat
          up ring by ring while a charge ball grows at the muzzle (the held extreme, angry eyes),
          one flash, a hard kick up and back, then the spent cell pops out of the top hatch,
          steam vents, and he slaps a fresh cell in. The bolt leaves `muzzle` on the fire frame.
  attack_b  HIP-FIRE SNAP: drops into a wide low crouch with the rifle braced at the hip, the
          coils whining (the held extreme), snaps one bolt off from the hip; the kick throws the
          muzzle up and pops the spent cell, then the A cell slap and settle
  attack_c  KNEELING SHOT: drops onto one knee, tucks the rifle in tight and squints down the barrel
          (the held extreme), fires low and level; the kick rocks him back on his heel
  hit     light: the head snaps back, the antenna whips, eyes > <
  die     D1 fling and spin, X eyes, the rifle flung wide
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import face as FC
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_future as KF
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import futcos_w4 as FW

SLUG = "pulse_trooper"
GAIT_NAME = "biped"
NAME = "Pulse Trooper"
HEIGHT_LU = 70
CANVAS = (300, 232)
FEET = (104, 204)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (54, 30)}
NO_RETIME = True

# the detail standard (art round W4): the soldiers' lifts; the glossy white armour, trims, the charcoal suit and the
# team plates apart (the glows are never lifted)
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 0.5
LOOK_SHADE = FW.SHADE_WHITE
LOOK_RIM = dict(FW.RIM_SOLDIER, lift=0.42)
# the rifle's shroud in a light gun grey, not the armour's white (its long lit edge rang the highlight share)
GUN_LT, GUN_SEAM = "#B4BBC6", "#8A929F"
COIL = "#8CF5D0"               # the heated coils, a mid mint
MATERIAL_KINDS = FW.kinds_future({GUN_LT: "iron", GUN_SEAM: "iron"})

# Space Cadet (rare skin, DESIGN A5.8): a retro space cadet: cream plates over a purple-grey flight suit with lilac
# piping, silver trims, a finned silver ray gun and rocket fins on the pack (the silhouette sign)
SC_CREAM, SC_SILVER, SC_LILAC = "#DDD2B6", "#D8DCE0", "#8A7CB4"
SKINS = {"space_cadet": {
    "palette": FW.skin_palette({FW.ARMOR: SC_CREAM, FW.LINE_ON_WHITE: "#B8AB8B", FW.WEAR_ON_WHITE: "#CFC4A6",
                                F.ARMOR: "#ECE4CF", F.SUIT: "#5A5470", F.SUIT_LT: "#6E6788", F.CHARCOAL: "#4A4560",
                                FW.FOLD_ON_SUIT: SC_LILAC, FW.LINE_ON_SUIT: "#433E57", FW.WEAR_ON_SUIT: "#7A7394",
                                F.GUNMETAL: "#6A6E80", F.TRIM: SC_SILVER, F.STEEL: "#A8AEBC", GUN_LT: SC_SILVER,
                                GUN_SEAM: "#9EA4B2", F.VISOR_DARK: "#2A2540"}),
    "kinds": FW.kinds({SC_CREAM: "ceramic", "#B8AB8B": "ceramic", "#CFC4A6": "ceramic", "#ECE4CF": "ceramic",
                       "#5A5470": "cloth", "#6E6788": "cloth", "#4A4560": "cloth", SC_LILAC: "cloth", "#433E57": "cloth",
                       "#7A7394": "cloth", "#6A6E80": "iron", SC_SILVER: "iron", "#A8AEBC": "iron", "#9EA4B2": "iron",
                       "#2A2540": "glass"})}}

G0 = (4.0, -15.0, 27.0)     # rifle grip at rest (character space); the rifle is a torso child
FORE = 15.0                 # the far hand grips the foregrip this far along the rifle
K_ = 1.15
MUZZLE = (G0[0] + 55.0 * K_ - 4.0, G0[1], G0[2] + 3.6)
HATCH = (G0[0] + 10.0 * K_, G0[1], G0[2] + 8.6)


def X(dx):
    return G0[0] + dx * K_


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KF.skeleton_v3(rig, head=(1, 0, 39))
    KF.legs_v3(rig, armor=FW.ARMOR)
    gx, gy, gz = G0
    rig.joint("gun", "torso", G0)

    # antenna behind the helmet (follow-through)
    rig.secondary("antenna", "head", (-7.5, 7.0, 55.0), (-12.5, 8.4, 69.0), max_deg=18, gain=1.4)
    g = Geo().capsule((-7.5, 7.0, 55.0), (-12.2, 8.4, 68.0), 0.9)
    rig.part("antenna", g, F.SUIT, outline=1.0)
    g = Geo().sphere((-12.4, 8.5, 69.0), 2.1, cuts=3)
    rig.part("antenna", g, glow=F.MAGENTA, outline=1.0, outline_hex=F.MAGENTA)

    # power pack cable from the backpack to the rifle butt (follow-through)
    rig.secondary("cable", "torso", (-12.0, -5.0, 25.0), (-6.0, -10.0, 13.0), max_deg=16, gain=1.2)
    g = Geo()
    pts = [(-12.0, -5.0, 25.0), (-11.5, -8.0, 18.0), (-7.0, -10.5, 14.0), (-1.0, -12.5, 15.5)]
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, 1.3, segs=8, rings=2)
    rig.part("cable", g, F.GUNMETAL, outline=0.6)

    F.arm_parts(rig, "l", glove=FW.ARMOR)
    F.torso_armor(rig, pack=False)
    FW.pack(rig)
    g = Geo().blob((-11.4, 0, 36.6), (4.8, 8.8, 2.2), p=3.4)      # team band on the pack
    rig.part("torso", g, team=True, outline=0.6)
    g = Geo().blob((1.0, 0, 39.0), (7.6, 7.8, 1.8), p=2.6)         # white gorget
    rig.part("torso", g, FW.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((0.6, 0, 16.6), (10.4, 10.2, 4.0), p=2.8, taper=(1.1, 1.0))
    g.clip((0, 0, 13.0), (0, 0, -1))
    rig.part("hips", g, FW.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((5.0, -9.6, 20.2), (2.6, 1.8, 2.8), p=3.2).blob((-2.8, -9.6, 20.4), (2.4, 1.8, 2.6), p=3.2)
    rig.part("torso", g, F.GUNMETAL, outline=0.6)
    chest = Geo().blob((1.8, 0, 32.0), (9.8, 10.6, 7.6), p=3.0, taper=(0.9, 1.0))
    cf = FC.Face(rig, "torso", [chest])
    g = KF.hexmark(cf, Geo(), K.scr(cf, (6.0, -9.0, 32.0)), s=0.9, w=1.3)
    rig.part("torso", g, KF.HEX_PALE, highlight=False, outline=0)

    # helmet: white dome and faceplate, a team cap with a crest, a dark visor with the eyes
    g = Geo().blob((2, 0, 52), (11.4, 11.0, 11.6), p=2.5)
    g.blob((0, 0, 43.2), (7.5, 7.5, 3.2), p=2.4)
    rig.part("head", g, FW.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((2, 0, 52.1), (11.75, 11.35, 11.95), p=2.5, cuts=8)
    g.clip((0, 0, 48.6), (0, 0, -1))
    g.clip((8.4, 0, 51.0), (1, 0, -0.3))
    g.blob((-0.5, 0, 63.6), (10.4, 2.8, 2.6), p=2.8, rot=(0, -8, 0))
    rig.part("head", g, team=True)
    visor = Geo().blob((10.2, -0.6, 50.8), (4.8, 10.0, 5.4), p=3.2)
    KF.visor_face(rig, "head", [visor], (11.0, 51.0), eye_dx=(0.0, 3.5), eye_rx=1.7, eye_rz=2.5)
    rig.part("head", visor, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    g = Geo().blob((-3.5, -10.4, 51.0), (4.4, 2.0, 4.4), p=2.4)       # ear pod
    rig.part("head", g, F.SUIT)
    g = Geo().blob((-3.5, -12.2, 51.0), (1.4, 0.8, 1.4), p=2.2)
    rig.part("head", g, glow=F.MINT, outline=0)

    F.arm_parts(rig, "r", glove=FW.ARMOR)
    F.shoulders(rig)
    KF.strip(rig, "arm_r", [(-4.0, -18.0, 38.0), (0.6, -18.4, 39.4), (5.2, -17.8, 38.0)], r=0.65)

    # the plasma rifle along +X from the grip
    g = Geo().blob((X(12), gy + 1, gz + 3.5), (13.5 * K_, 3.4, 4.2), p=3.6)          # receiver
    g.blob((gx - 7, gy + 1, gz + 2.5), (6.0, 2.6, 3.9), p=3.4, rot=(0, 10, 0))      # stock
    g.blob((gx + 0.5, gy + 1, gz - 1.5), (2.2, 2.0, 4.2), p=2.8, rot=(0, -12, 0))   # grip
    g.blob((X(15), gy + 2, gz - 1.0), (2.0, 1.8, 3.4), p=2.8, rot=(0, -8, 0))       # foregrip
    rig.part("gun", g, F.SUIT)
    g = Geo().blob((X(14), gy + 1, gz + 7.2), (11.5 * K_, 3.0, 2.4), p=3.4)         # top shroud
    g.lathe([(3.4, 0), (3.6, 4), (3.0, 16.5), (0, 16.7)], (X(26), gy + 1, gz + 3.5),
            (X(44), gy + 1, gz + 3.5), segs=14)
    rig.part("gun", g, GUN_LT, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((X(12), gy - 2.2, gz + 3.8), (7.0, 0.8, 2.4), p=3.2)            # team side panel (W4: 5 x 1.8;
    #                                     the up-70 aimed shots, the rifle across the chest plate, ran 16.8% team)
    rig.part("gun", g, team=True, outline=0.5)
    rings = [X(20), X(24), X(28)]
    g = Geo()
    for x in rings:
        g.lathe([(0, -0.5), (4.4, -0.45), (4.4, 0.45), (0, 0.5)], (x, gy + 1, gz + 3.5), (x + 1, gy + 1, gz + 3.5),
                segs=16)      # (W4: 1.6 lu thick, the three rings held 0.013 of the highlight share)
    rig.part("gun", g, glow=F.MINT, outline=1.0, outline_hex=F.SUIT)
    for i, x in enumerate(rings):      # heated coils: a bigger pale ring per coil (charge)
        rig.joint(f"coil{i}", "gun", (x, gy, gz + 3.5), hidden=True)
        g = Geo().lathe([(0, -0.7), (5.2, -0.6), (5.2, 0.6), (0, 0.7)], (x, gy + 0.6, gz + 3.5),
                        (x + 1, gy + 0.6, gz + 3.5), segs=18)
        # (W4: 2.4 lu thick in MINT_CORE: the charged frames ran 0.11-0.12 highlight share)
        rig.part(f"coil{i}", g, glow=COIL, outline=1.0, outline_hex=F.MINT)
    g = Geo().lathe([(0, -0.5), (3.2, -0.4), (5.8, 1.6), (6.2, 4.0), (4.6, 4.6), (0, 4.7)],
                    (X(44) - 1.0, gy + 1, gz + 3.5), (X(44) + 10, gy + 1, gz + 3.5), segs=18)
    rig.part("gun", g, F.SUIT, finish="gloss")
    g = Geo().lathe([(3.0, 0), (6.4, 0.2), (6.4, 1.8), (3.2, 2.0)], (X(44) + 2.8, gy + 1, gz + 3.5),
                    (X(44) + 12, gy + 1, gz + 3.5), segs=18)
    rig.part("gun", g, F.MAGENTA)
    # the top cell (a glowing capsule in a hatch); swapped after the shot
    hx, hy, hz = HATCH
    g = Geo().blob((hx, hy + 1, hz - 0.4), (4.4, 3.2, 1.6), p=3.0)
    rig.part("gun", g, F.GUNMETAL, outline=0.6)
    rig.joint("cell", "gun", HATCH)
    g = Geo().capsule((hx - 3.0, hy + 0.6, hz + 1.0), (hx + 3.0, hy + 0.6, hz + 1.0), 1.9)
    rig.part("cell", g, glow=F.MINT, outline=1.0, outline_hex=F.SUIT)
    rig.joint("cell_loose", "root", HATCH, hidden=True)
    g = Geo().capsule((hx - 3.0, hy - 1.0, hz + 1.0), (hx + 3.0, hy - 1.0, hz + 1.0), 2.0)
    rig.part("cell_loose", g, "#7FA79A", outline=1.0, outline_hex=F.SUIT)
    # the far hand on the foregrip and the near hand on the grip ride with the rifle
    rig.track("muzzle", "gun", MUZZLE)

    # muzzle charge ball, flash and vent steam
    mx, my, mz = MUZZLE
    rig.joint("charge", "gun", MUZZLE, hidden=True)
    g = Geo().sphere((mx + 2.5, my - 1.0, mz), 3.8, cuts=4)
    rig.part("charge", g, glow=F.MINT_CORE, outline=1.4, outline_hex=F.MINT)
    rig.joint("flash", "gun", MUZZLE, hidden=True)
    g = Geo().blob((mx + 9.5, my - 1, mz), (10.0, 1.6, 3.6), p=2.0)
    g.blob((mx + 5.0, my - 1, mz + 2.6), (6.4, 1.5, 2.0), p=2.0, rot=(0, -34, 0))
    g.blob((mx + 5.0, my - 1, mz - 2.6), (6.4, 1.5, 2.0), p=2.0, rot=(0, 34, 0))
    rig.part("flash", g, glow=F.MINT, outline=0)
    g = Geo().blob((mx + 6.0, my - 2, mz), (6.4, 1.4, 2.1), p=2.0)
    rig.part("flash", g, glow=F.WHITE, outline=0)
    F.puff(rig, "gun", (X(22), gy, gz + 11.0), size=0.9, name="vent", spread=1.4)
    _detail(rig)
    if getattr(rig, "skin", None) == "space_cadet":
        _cadet(rig)
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry
        _damage_spots(rig)


def _cadet(rig):
    """Space Cadet: three silver fins round the ray gun's barrel and two rocket fins under the pack."""
    gx, gy, gz = G0
    g = Geo()
    for x in (X(31), X(35), X(39)):
        g.lathe([(0, -0.45), (5.4, -0.4), (5.7, 0.0), (5.4, 0.4), (0, 0.45)], (x, gy + 1, gz + 3.5),
                (x + 1, gy + 1, gz + 3.5), segs=20)
    rig.part("gun", g, F.TRIM, finish="gloss", outline=0.6, outline_hex=F.SUIT)
    g = Geo()
    for y in (-5.0, 3.0):
        g.slab([(-14.0, 24.6), (-19.6, 18.8), (-19.8, 22.4), (-15.6, 28.0)], y, 0.9)
    rig.part("torso", g, F.TRIM, finish="gloss", outline=0.6, outline_hex=F.SUIT)


def _detail(rig):
    """W4: the detail standard on the white armour, the suit, the team plates and the rifle (char space; decals cast)."""
    # the helmet: the team cap's team-dark rim, a seam round the jaw, a panel line on the white side; wear
    FW.band(rig, "head", (2, 0, 52.1), (11.75, 11.35, 11.95), 2.5, 48.7, 49.5, team=True)
    FW.band(rig, "head", (2, 0, 52.1), (11.75, 11.35, 11.95), 2.5, 55.4, 56.1, team=True)   # the cap's second ridge
    FW.band(rig, "head", (0, 0, 43.2), (7.5, 7.5, 3.2), 2.4, 42.0, 42.7, fill=FW.LINE_ON_WHITE)
    hf = FC.Face(rig, "head", [Geo().blob((2, 0, 52), (11.4, 11.0, 11.6), p=2.5)])
    FW.panel_lines(rig, "head", hf, [[FW.sc(hf, -8.0, 47.6, -9.6), FW.sc(hf, -1.0, 46.0, -11.0),
                                      FW.sc(hf, 5.0, 46.4, -10.4)]], w=0.75)
    FW.wear(rig, "head", hf, [(*FW.sc(hf, -8.8, 45.0, -8.4), 1.3, 0.7), (*FW.sc(hf, 6.0, 45.2, -9.6), 1.1, 0.6)])
    # the team chest plate in two plates (team-dark) with two vents under the hex; the gorget's seam
    cf = FC.Face(rig, "torso", [Geo().blob((1.8, 0, 32.0), (9.8, 10.6, 7.6), p=3.0, taper=(0.9, 1.0))])
    FW.folds(rig, "torso", cf, [[FW.sc(cf, -6.0, 27.6, -10.4), FW.sc(cf, 3.0, 27.4, -10.4), FW.sc(cf, 10.0, 28.2, -9.0)],
                                [FW.sc(cf, -3.0, 37.6, -10.4), FW.sc(cf, -3.4, 28.0, -10.4)]], w=0.8, team=True)
    FW.folds(rig, "torso", cf, [[FW.sc(cf, 3.2, 29.6, -10.4), FW.sc(cf, 6.4, 29.6, -10.4)],
                                [FW.sc(cf, 3.2, 31.2, -10.4), FW.sc(cf, 6.4, 31.2, -10.4)]], w=0.6, team=True)
    FW.band(rig, "torso", (1.0, 0, 39.0), (7.6, 7.8, 1.8), 2.6, 37.8, 38.5, fill=FW.LINE_ON_WHITE)
    # the faulds in three plates, chipped along the hem
    ff = FC.Face(rig, "hips", [Geo().blob((0.6, 0, 16.6), (10.4, 10.2, 4.0), p=2.8, taper=(1.1, 1.0))])
    FW.panel_lines(rig, "hips", ff, [[FW.sc(ff, -3.6, 19.8, -10.2), FW.sc(ff, -4.0, 13.4, -10.2)],
                                     [FW.sc(ff, 3.4, 19.8, -10.2), FW.sc(ff, 3.8, 13.4, -10.2)]], w=0.7)
    FW.wear(rig, "hips", ff, [(*FW.sc(ff, -7.0, 13.8, -9.0), 1.4, 0.6), (*FW.sc(ff, 0.0, 13.6, -10.2), 1.2, 0.5),
                              (*FW.sc(ff, 7.2, 14.0, -8.0), 1.0, 0.5)])
    # the shoulder pads' team-dark rims; the bracers' cuff seams; the suit's elbow creases
    for s in ("r", "l"):
        y = F.ARM_Y[s]
        FW.band(rig, f"arm_{s}", (0.5, y - 0.3 * F.SIDE_Y[s], 37.6), (6.8, 5.8, 5.4), 2.6, 33.6, 34.4, team=True)
        FW.band(rig, f"fore_{s}", (0.3, y, F.HAND_Z + 4.2), (4.9, 4.8, 3.6), 2.8, 26.0, 26.7, fill=FW.LINE_ON_WHITE,
                taper=(0.9, 1.1))
        sleeve = FC.Face(rig, f"arm_{s}", [Geo().capsule((0, y, F.SHOULDER_Z), (0, y, F.ELBOW_Z), 4.1, 3.8)])
        FW.folds(rig, f"arm_{s}", sleeve, [[FW.sc(sleeve, -2.6, 30.6, y - 3.8), FW.sc(sleeve, 0.2, 29.8, y - 4.0),
                                            FW.sc(sleeve, 2.8, 30.8, y - 3.8)]], w=0.8, team=False,
                 fill=FW.FOLD_ON_SUIT)
    # the legs: knee creases on the suit, the boots' seams, a scuffed toe
    from ageborn_art import kit_medieval as KM
    for s in ("r", "l"):
        y = F.LEG_Y * F.SIDE_Y[s]
        th = FC.Face(rig, f"thigh_{s}", [Geo().capsule((0, y, KM.V3_THIGH_Z + 0.5), (0.5, y, KM.V3_KNEE_Z), 4.6, 4.1)])
        FW.folds(rig, f"thigh_{s}", th, [[FW.sc(th, -2.4, 14.4, y - 4.4), FW.sc(th, 0.4, 13.6, y - 4.6),
                                          FW.sc(th, 3.0, 14.6, y - 4.2)]], w=0.8, team=False, fill=FW.FOLD_ON_SUIT)
        FW.band(rig, f"foot_{s}", (2.8, y, 2.4), (4.4, 4.7, 2.5), 2.9, 3.0, 3.6, fill=FW.LINE_ON_WHITE,
                taper=(1.02, 0.84))
    tf = FC.Face(rig, "foot_r", [Geo().blob((2.8, -F.LEG_Y, 2.4), (4.4, 4.7, 2.5), p=2.9, taper=(1.02, 0.84))])
    FW.wear(rig, "foot_r", tf, [(*FW.sc(tf, 6.2, 2.0, -F.LEG_Y - 3.0), 1.2, 0.6)])
    # the rifle: seams across the white shroud, vent slots on the receiver, wear on the shroud's nose
    gx, gy, gz = G0
    g = Geo()
    for x in (X(8), X(17)):
        g.capsule((x, gy - 1.9, gz + 9.4), (x + 0.4, gy - 1.9, gz + 5.6), 0.36, segs=8, rings=2)
    rig.part("gun", g, GUN_SEAM, outline=0, highlight=False)
    g = Geo()
    for x in (X(2), X(4.5), X(7)):
        g.capsule((x, gy - 2.3, gz + 1.4), (x + 1.4, gy - 2.3, gz + 1.4), 0.42, segs=8, rings=2)
    rig.part("gun", g, FW.LINE_ON_SUIT, outline=0, highlight=False)
    g = Geo().blob((X(24.5), gy - 1.6, gz + 8.0), (1.3, 0.4, 0.6), p=2.2)
    rig.part("gun", g, FW.WEAR_ON_WHITE, outline=0, highlight=False)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, soldier; never on the face or skin), measured in the posed frames:
    the team band on the power pack (the rifle crosses the chest plate), the near shoulder pad, the helmet's team cap,
    the white faulds, the near thigh."""
    rig.damage_spot_at("pack", "torso", -11.4, 36.6, 5.5, "metal", team=True)
    rig.damage_spot_at("pauldron", "arm_r", 0.5, 39.0, 5.0, "metal", team=True)
    rig.damage_spot_at("cap", "head", -3.0, 58.0, 5.5, "metal", team=True)
    rig.damage_spot_at("faulds", "hips", -5.0, 16.0, 5.0, "metal")
    rig.damage_spot_at("thigh", "thigh_r", 1.0, 13.0, 5.0, "cloth")


# -- poses -----------------------------------------------------------------------------------
LOW = (6.0, 25.0, -8.0)      # low ready: grip x, z (torso space), rifle angle
AIM = (7.5, 34.5, 0.0)       # shouldered


def hold(gx, gz, deg):
    return F.hold2("gun", G0, FORE * K_, gx, gz, deg)


STANCE = merge(hold(*LOW), {"torso": {"r": -2.0}})


def _idle(f):
    tap = [0.0, 0.45, 1.0, 1.0, 0.4, 0.0][f]

    def extra(ctx):
        return {"antenna": {"r": 0.0}}
    pose = M.idle_v2(f, STANCE, frames=6, extra=extra, blink=4, face_blink=KF.glyph("g_blink"))
    pose = merge(pose, {"gun": {"r": 1.4 * math.cos(2 * math.pi * f / 6)}})
    if tap > 0:
        # the far hand leaves the foregrip and taps the side of the visor
        a0, f0 = F.ik2(F.SH, (LOW[0] + FORE * K_ * math.cos(math.radians(LOW[2])),
                              LOW[1] + FORE * K_ * math.sin(math.radians(LOW[2]))))
        a1, f1 = F.ik2(F.SH, (7.0, 50.0))
        pose.update(F.arm("l", a0 + (a1 - a0) * tap, f0 + (f1 - f0) * tap))
        pose["head"] = dict(pose.get("head", {}), r=pose.get("head", {}).get("r", 0.0) - 5 * tap)
        if f == 3:
            pose = merge(pose, KF.glyph("g_happy"))
    return pose


# -- walk v3: G1 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 77 ms -------------
SPEED = 81.25
LEGS = KF.legs_ik()
GAIT = KF.jog_gait(LEGS, SPEED, cycle_ms=616)
# walk carry: the rifle at port, slanted up across the chest, the far hand on the receiver
PORT = (1.0, 23.0, 34.0)
PORT_FORE = 9.5


def carry(gx, gz, deg):
    return F.hold2("gun", G0, PORT_FORE, gx, gz, deg)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(carry(PORT[0], PORT[1] + 1.0 * lag, PORT[2] - 4.0 * lag),
                     {"antenna": {"r": 0.0}, "head": {"r": 4.0 - 2.0 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -3.0}}, GAIT, legs=LEGS, lean=-10.0, twist=6.0, nod=3.0,
                     extra=extra, report=report)


# -- attack: shoulder, charge, snap, cell swap (748 ms, impact at 374 ms = 0.5, as shipped) -----
ATTACK_MS = [50, 60, 80, 184, 90, 70, 70, 60, 84]
ATTACK_IMPACT = 4
#     raise  aim  charge HOLD  FIRE kick  pop  slap settle
GX = [7.0, 7.5, 7.5, 7.5, 7.5, 4.0, 5.0, 6.0, 6.0]
GZ = [30.0, 34.5, 34.5, 34.0, 34.5, 37.0, 33.0, 29.0, 26.0]
DEG = [-4.0, 0.0, 0.0, 0.0, 0.0, 22.0, 10.0, 0.0, -6.0]
BX = [0.0, 0.5, 0.5, 1.0, 0.0, -4.0, -2.0, -0.5, 0.0]
BZ = [0.0, -0.4, -0.8, -1.4, -0.6, 0.6, 0.2, 0.0, 0.0]
BQ = [0.0, -0.02, -0.04, -0.07, 0.04, -0.10, 0.03, -0.02, 0.0]
TR = [-2, -4, -5, -6, -3, 8, 4, 0, -2]
HR = [-2, -6, -8, -9, -6, 8, 2, -4, -1]
CHG = [0, 0, 0.6, 1.25, 0, 0, 0, 0, 0]
CELL = [None, None, None, None, None, (0.0, 7.0, 40), (-6.0, 16.0, 160), (-12.0, 8.0, 290), None]
EYES = ["eyes", "g_angry", "g_angry", "g_angry", "g_squint", "g_hurt", "eyes", "g_angry", "eyes"]


# aimed shots (queue item 44, ageborn_art/aimed.py): a turn of `turn` degrees up raises the butt toward the cheek
# (the grip rises and draws back), leans the body back into the shot and tips the head up with it (the Carbineer's
# rig, W3). The torso carries the rifle, so its lean is part of the turn.
AIM_LEAN = 0.22           # torso r per degree of turn (positive leans back)
AIM_RISE = 0.10           # grip z per degree up (torso space, lu)
AIM_DRAW = 0.05           # grip x per degree up (drawn back toward the shoulder)
AIM_HEAD = 0.30           # head r per degree, on top of the torso's lean
#        raise aim  charge HOLD FIRE kick pop  slap settle
AIM_W = [0.0, 0.6, 1.0, 1.0, 1.0, 0.8, 0.4, 0.15, 0.0]
#          A   kneel tuck HOLD FIRE rock rock2 rise  A
AIM_W_C = [0.0, 0.5, 1.0, 1.0, 1.0, 0.8, 0.5, 0.2, 0.0]


def _aim(gx, gz, deg, turn):
    """The grip and the rifle's angle (torso space) turned `turn` degrees up, with the torso's lean taken out."""
    if not turn:
        return gx, gz, deg
    up = max(0.0, turn)
    return gx - AIM_DRAW * up, gz + AIM_RISE * up, deg + turn - AIM_LEAN * turn


def _attack_pose(f, turn=0.0):
    pose = merge(hold(*_aim(GX[f], GZ[f], DEG[f], turn)), {
        "torso": {"r": TR[f] + AIM_LEAN * turn},
        "head": {"r": HR[f] + AIM_HEAD * turn, "x": 1.0 if f in (1, 2, 3, 4) else 0.0},
        "thigh_r": {"r": [4, 10, 14, 16, 14, 8, 6, 4, 2][f]},
        "shin_r": {"r": [0, -4, -8, -10, -8, -2, -2, 0, 0][f]},
        "thigh_l": {"r": [-4, -10, -14, -16, -18, -14, -10, -6, -4][f]},
        "shin_l": {"r": [0, -2, -6, -8, -6, 0, 0, 0, 0][f]},
        "charge": {"show": CHG[f] > 0, "s": max(CHG[f], 0.01)},
        "coil0": {"show": f in (2, 3)}, "coil1": {"show": f == 3 or f == 2}, "coil2": {"show": f == 3},
        "flash": {"show": f == 4},
        "vent": {"show": f in (5, 6), "s": [1, 1, 1, 1, 1, 0.8, 1.25, 1, 1][f], "z": [0, 0, 0, 0, 0, 0, 3, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=BX[f], z=BZ[f], q=BQ[f]))
    if f in (2, 3):
        pose["body"]["x"] += 0.35 if f == 3 else -0.2       # a charge tremble
    if CELL[f] is not None:
        x, z, r = CELL[f]
        pose["cell"] = {"hide": True}
        pose["cell_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if f == 7:
        # the far hand slaps a fresh cell into the top hatch
        a, fo = F.ik2(F.SH, (GX[f] + 11.0 * K_, GZ[f] + 10.0))
        pose.update(F.arm("l", a, fo))
    return KI.ground_feet(RIG, merge(pose, KF.glyph(EYES[f])), LEGS)


def _attack_clip():
    ov = {
        4: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 8.0, "r1_lu": 14.0, "n": 5,
             "a0": -60.0, "arc": 120.0, "color": FW.fx(RIG, SKINS, F.MINT_CORE)}],
        3: [{"kind": "rings", "joint": "gun", "point": (MUZZLE[0] - 2.0, MUZZLE[1], MUZZLE[2]), "radii_lu": (6.5, 10.0),
             "a0": -70.0, "a1": 70.0, "color": FW.fx(RIG, SKINS, F.MINT_CORE)}],
        7: [{"kind": "burst", "joint": "gun", "point": (HATCH[0], HATCH[1], HATCH[2] + 3.0), "r0_lu": 3.5,
             "r1_lu": 7.0, "n": 4, "a0": 30.0, "arc": 120.0, "color": "#FFFFFF"}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov)


# -- attack B: hip-fire snap (A's 748 ms, impact at 374 ms) -------------------------------------
# steps: drop 50, brace 70, HOLD 194 (a wide low crouch, the rifle braced at the hip, coils
# whining), snap 60 | FIRE 90, kick 70 (the muzzle thrown up, the spent cell pops), rise 70,
# A slap 60, A settle 84
B_MS = [50, 70, 194, 60, 90, 70, 70, 60, 84]
#      drop  brace HOLD  snap  FIRE  kick  rise
B_GX = [5.0, 3.0, 2.0, 3.5, 3.5, 0.5, 4.0]
B_GZ = [26.0, 21.5, 20.0, 20.5, 20.5, 24.0, 27.0]
B_DEG = [-6.0, 4.0, 7.0, 2.0, 2.0, 36.0, 14.0]
B_BX = [0.0, -0.5, -1.0, 0.5, -1.0, -4.5, -2.0]
B_BZ = [-2.0, -6.0, -8.0, -7.5, -7.0, -5.0, -2.5]
B_BQ = [-0.03, -0.06, -0.09, 0.0, 0.05, -0.08, 0.02]
B_TR = [-4, 4, 7, 4, 6, 14, 5]
B_HR = [-4, -6, -8, -6, -4, 10, 2]
B_THR = [10, 24, 30, 30, 30, 24, 12]
B_SHR = [-6, -18, -24, -24, -22, -16, -8]
B_THL = [-10, -22, -28, -28, -30, -24, -12]
B_SHL = [-4, -16, -22, -22, -20, -12, -6]
B_EYES = ["g_angry", "g_angry", "g_angry", "g_squint", "g_squint", "g_hurt", "eyes"]


def _b_pose(i):
    if i in (7, 8):
        return _attack_pose(i)
    k = i
    pose = merge(hold(B_GX[k], B_GZ[k], B_DEG[k]), {
        "torso": {"r": B_TR[k]}, "head": {"r": B_HR[k]},
        "thigh_r": {"r": B_THR[k]}, "shin_r": {"r": B_SHR[k]},
        "thigh_l": {"r": B_THL[k]}, "shin_l": {"r": B_SHL[k]},
        "charge": {"show": k in (2, 3), "s": 0.8 if k == 2 else 1.05},
        "coil0": {"show": k in (1, 2, 3)}, "coil1": {"show": k in (2, 3)}, "coil2": {"show": k == 3},
        "flash": {"show": k == 4},
        "vent": {"show": k == 6, "s": 1.1, "z": 2.0},
    }, M.body_about((0, 0, 22), x=B_BX[k], z=B_BZ[k], q=B_BQ[k]))
    if k == 2:
        pose["body"]["x"] += 0.3      # a charge tremble
    if k in (5, 6):
        x, z, r = CELL[k]
        pose["cell"] = {"hide": True}
        pose["cell_loose"] = {"show": True, "x": x, "z": z, "r": r}
    return KI.ground_feet(RIG, merge(pose, KF.glyph(B_EYES[k])), LEGS)


def _attack_b():
    ov = {
        4: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 8.0, "r1_lu": 14.0, "n": 5,
             "a0": -60.0, "arc": 120.0, "color": FW.fx(RIG, SKINS, F.MINT_CORE)},
            {"kind": "dust", "ground": (-12.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 61, "spread": 0.8,
             "color": "#DDE3E8"}],
        2: [{"kind": "rings", "joint": "gun", "point": (MUZZLE[0] - 2.0, MUZZLE[1], MUZZLE[2]), "radii_lu": (5.5, 8.5),
             "a0": -70.0, "a1": 70.0, "color": FW.fx(RIG, SKINS, F.MINT_CORE)}],
    }
    reuse = {7: ("attack", 7), 8: ("attack", 8)}
    return M.clip("attack_b", [_b_pose(i) for i in range(9)], B_MS, impact=4, overlays=ov, reuse=reuse,
                  extra={"holdStep": 2})


# -- attack C: kneeling shot (A's timing) --------------------------------------------------------
# steps: A raise 50, kneel 60, tuck 80, HOLD 184 (on one knee, the rifle tucked in tight, squinting
# down the barrel) | FIRE 90, rock back 70, rock 70, rise 60, A settle 84
C_MS = [50, 60, 80, 184, 90, 70, 70, 60, 84]
#      kneel tuck  HOLD  FIRE  rock  rock2 rise
C_GX = [6.5, 8.0, 8.5, 8.5, 5.0, 6.0, 6.5]
C_GZ = [30.0, 31.5, 31.5, 31.5, 34.0, 32.0, 29.0]
C_DEG = [-2.0, 0.0, 0.0, 0.0, 16.0, 6.0, 0.0]
C_DROP = [8.0, 14.0, 14.0, 14.0, 14.0, 12.0, 6.0]
C_TR = [-6, -9, -10, -8, 4, -2, -3]
C_HR = [-6, -10, -12, -8, 6, 0, -2]
C_BX = [0.0, 0.5, 0.8, 0.0, -3.0, -1.5, -0.5]
C_EYES = ["g_angry", "g_squint", "g_squint", "g_squint", "g_hurt", "g_angry", "eyes"]


def _c_pose(i, turn=0.0):
    if i in (0, 8):
        return _attack_pose(i, turn)
    k = i - 1
    pose = merge(hold(*_aim(C_GX[k], C_GZ[k], C_DEG[k], turn)), {
        "torso": {"r": C_TR[k] + AIM_LEAN * turn},
        "head": {"r": C_HR[k] + AIM_HEAD * turn, "x": 1.0 if k in (1, 2, 3) else 0.0},
        "charge": {"show": k in (1, 2), "s": 0.6 if k == 1 else 1.1},
        "coil0": {"show": k in (1, 2)}, "coil1": {"show": k == 2}, "coil2": {"show": k == 2},
        "flash": {"show": k == 3},
        "vent": {"show": k in (4, 5), "s": 1.0 if k == 4 else 1.2, "z": 0.0 if k == 4 else 3.0},
    }, M.body_about((0, 0, 22), x=C_BX[k]))
    if k == 2:
        pose["body"]["x"] += 0.3
    pose = merge(pose, KF.glyph(C_EYES[k]))
    return KI.kneel(RIG, pose, LEGS, drop=C_DROP[k], front=13.0)


def _attack_c():
    ov = {
        4: [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 8.0, "r1_lu": 14.0, "n": 5,
             "a0": -60.0, "arc": 120.0, "color": FW.fx(RIG, SKINS, F.MINT_CORE)},
            {"kind": "dust", "ground": (-14.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 62, "spread": 0.9,
             "color": "#DDE3E8"}],
        3: [{"kind": "rings", "joint": "gun", "point": (MUZZLE[0] - 2.0, MUZZLE[1], MUZZLE[2]), "radii_lu": (6.5, 10.0),
             "a0": -70.0, "a1": 70.0, "color": FW.fx(RIG, SKINS, F.MINT_CORE)}],
    }
    reuse = {0: ("attack", 0), 8: ("attack", 8)}
    return M.clip("attack_c", [_c_pose(i) for i in range(9)], C_MS, impact=4, overlays=ov, reuse=reuse,
                  extra={"holdStep": 3})


def _hit(k):
    def recoil(a):
        up = max(a, 0)
        return merge(hold(LOW[0] - 2 * up, LOW[1] + 2 * up, LOW[2] + 18 * a),
                     {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                      "thigh_r": {"r": 22 * up}, "shin_r": {"r": -26 * up}})
    return M.hit_light(k, {"torso": {"r": -2.0}}, recoil, face_hurt=KF.glyph("g_hurt"),
                       face_back=KF.glyph("g_angry") if k == 2 else None)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    landed = [0, 0, 0, 0, 0.8, 1, 1, 1, 1, 1][k]
    pose = merge(hold(LOW[0] + 2, LOW[1] + 4 * flail - 3 * landed, LOW[2] + 40 * flail - 78 * landed), M.die_d1(k, center_z=28.0, lie_z=11.0,
                                                                                  height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    g = "g_hurt" if k == 0 else ("g_wide" if k < 4 else "eyes_x")
    return merge(pose, KF.glyph(g))


def clips():
    attack = _attack_clip()
    attack_c = _attack_c()
    # aimed up about 45 and 70 degrees at flyers (the Pulse Trooper hits air; they go to the extras sheet): the
    # shouldered shot (A) and the kneeling shot (C); the hip-fire snap (B) keeps the runtime's lean
    aimed_a = AIMED.variants(RIG, attack, _attack_pose, AIM_W, aims=("up45", "up70"))
    aimed_c = AIMED.variants(RIG, attack_c, _c_pose, AIM_W_C, aims=("up45", "up70"))
    for v in aimed_a:
        AIMED.check_timing(attack, v)
    for v in aimed_c:
        AIMED.check_timing(attack_c, v)
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        attack,
        _attack_b(),
        attack_c,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ] + aimed_a + aimed_c
    return M.check_variants(M.check_contract(cl, attack_ms=748, attack_impact_at=0.5))
