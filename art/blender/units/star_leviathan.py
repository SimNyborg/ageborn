"""Star Leviathan: Cosmic Age Legendary void beast (CONTENT_PLAN 5.8). A space whale that swims just above the ground
with two Moonling riders, built at ~96 lu tall and drawn 1.8x (SC) like the other Legendaries (~172 lu tall,
~270 lu long; A11 Legendaries 170-220 lu).

Look (A11, Cosmic palette): a huge friendly-fierce space whale: a violet back speckled with stars, a star-white belly
and throat with grooves, big cartoon eyes and a wide mouth, a mint throat glow that swells when it sings, long team
pectoral fins with star-white edges, violet dorsal sails, a tail with a team fluke. A team saddle blanket with the
pale star sits on its back, and two little Moonlings (grey heads, team suits, mint antennae) ride on it.

"A viewer expects a singing space whale: it swims through the air with slow undulations, rears back and lets out
a booming song wave, while the little riders on its back spit at anything nearby."

Animation (ANIM_SPEC G8 hover swim, the odometer at 40 x 1.25 = 50 lu/s; the hover bob is code motion; heavy
melee timing; the riders get attack_alt, ANIM_SPEC R3):
  idle        floats and breathes, the fins paddle, the tail sways, the riders bob and look around, a blink
  walk        an undulating swim: the head and tail wave a beat apart, the fins sweep, the riders bounce
  attack      SONG WAVE: arches back with the throat swelling (the held extreme), then thrusts the head forward
              and a ring of song rolls out of the mouth (ring smear)
  attack_b    HIGH CALL: rears high, head up and the fins spread (the held extreme), then sings down at the front
  attack_c    LOW BOOM: dips its head low to the ground, tail up (the held extreme), then a forward lunge and boom
  attack_alt  the two Moonling riders spit on their own beat; the whale holds its idle pose
  hit         a tilt and a drop, the eyes squeeze, the riders duck
  die         sinks to the ground and rolls onto its side, the riders hop off, X eyes and the tongue out

W4 (the detail standard; the shipped sheet measured flat 0.60, micro 1.42: one huge smooth body): the back strewn
with stars (constellation specks over the near flank), wrinkle bands at the neck and behind the fin, creases over the
back and round the head, knobbly tubercles on the brow and the snout, the belly's long ventral pleats, the fins' and
the fluke's team-dark ribs, the saddle blanket's border seam (team-dark), the sails' ribs, the tail's creases; rider
damage spots (the whale as a beast: scuffs on its hide and fins, a torn blanket, a breath puff); the riders' spit
(attack_alt, the second gunner) aimed down 35 degrees at the ground troops (item 44).
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import config as C
from ageborn_art import face as FC
from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_bronze_detail as KB
from ageborn_art import kit_cosmic_wave as CW
from ageborn_art import kit_medieval as KM
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from units import futcos_w4 as FW

SLUG = "star_leviathan"
GAIT_NAME = "hover"
NAME = "Star Leviathan"
SC = 1.8                     # the whole beast is modelled at 96 lu and scaled at the body joint
HEIGHT_LU = 172
YAW_DEG = -12.0
CANVAS = (940, 640)
FEET = (470, 590)
ANCHORS = {"head": (72, 144), "hitCenter": (0, 79)}
NO_RETIME = True

# W4 detail standard (look.py): the Legendary's big fields take the big shade
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 1.5            # (the shipped sheet: flat 0.60, highlight share 0.019; one huge smooth body; r40b 1.2 to 1.5;
                                # r42b's 2.2, with cavity 0.95, washed the team parts out of the death roll: team fill 10.6%)
LOOK_SHADE = dict(FW.SHADE_BIG, gradient=3.6, cavity=0.85)     # (r42: 3.0 to 3.6, so the head and the flank shade)
LOOK_RIM = dict(FW.RIM_SOLDIER, lift=0.5)
# (r40) the whale's violet back, its belly and its team fins and fluke in fur's fine clumps: the finest breakup that
# reads at this size (look-dev S/w4/futcos/ld/lev_*, idle 0: polymer's speckle flat 0.35, hide's blotches 0.30, stone's
# cells 0.27, fur 0.23; r29 rendered hide at flat 0.340, micro 2.76)
MATERIAL_KINDS = FW.kinds_cosmic({CW.MOON: "stone", CW.MOON_DK: "stone", "#FAF6EE": "ceramic", "#2A2236": "glass",
                                  CW.VIOLET: "fur", CW.VIOLET_DK: "fur", CW.STAR: "fur", "team": "fur"})
CONST_LINE = "#B7A0E6"      # (r40) the constellations' lines over the back, a pale lilac a step under the stars
FOLD_LIP = "#B98AE6"        # (r42) a fold's lit lip: a light violet, a step over VIOLET_LT
# (r42d) the violet hull, head and tail in matte: gloss washed the lit back and crown into one flat plateau (look-dev
# S/w4/futcos/ld/lev42d_*, idle 0, attack 5, die 4: micro 3.43 to 3.63 with matte, 3.71 with the back's and the crown's
# folds too; the highlight share 0.072 to 0.069)
BODY_FINISH = "matte"

HULL = (0.0, 0.0, 42.0)
HEAD_C = (38.0, 0.0, 48.0)
MOUTH = (58.0, -6.0, 40.0)
RIDERS = ((-6.0, 0.0, 64.0), (-24.0, 0.0, 61.0))


def _rider(rig, i, at):
    x, y, z = at
    j = f"rider{i}"
    rig.joint(j, "hull", at, scale=1.25)
    g = Geo().blob((x, y, z + 5.0), (4.4, 4.4, 5.0), p=2.3)
    rig.part(j, g, team=True)
    head = Geo().blob((x + 0.8, y, z + 13.4), (5.6, 5.4, 5.4), p=2.2)
    rig.part(j, head, CW.MOON, outline_hex=CW.MOON_DK)
    g = Geo()
    for dy in (-3.8, 0.6):
        g.blob((x + 4.6, y + dy, z + 14.6), (1.4, 1.6, 2.0), p=2.2)
    rig.part(j, g, "#FAF6EE", highlight=False, outline=0.5)
    g = Geo()
    for dy in (-3.8, 0.6):
        g.blob((x + 5.6, y + dy - 0.2, z + 14.2), (0.6, 0.9, 1.1), p=2.2)
    rig.part(j, g, "#2A2236", outline=0, highlight=False)
    rig.secondary(f"rant{i}", j, (x - 1.0, y, z + 18.0), (x - 4.0, y, z + 25.0), max_deg=24, gain=1.5)
    g = Geo().capsule((x - 1.0, y, z + 18.0), (x - 3.0, y, z + 24.0), 0.7)
    rig.part(f"rant{i}", g, CW.MOON_DK, outline=0.5)
    g = Geo().sphere((x - 3.2, y, z + 24.8), 1.6, cuts=2)
    rig.part(f"rant{i}", g, glow=CW.MINT, outline=0.6, outline_hex="#1C8A6A")
    rig.joint(f"spit{i}", j, (x + 7.0, y - 3.0, z + 11.6), hidden=True)
    g = Geo().sphere((x + 7.6, y - 3.0, z + 11.6), 1.8, cuts=2)
    rig.part(f"spit{i}", g, glow=CW.MINT_CORE, outline=0.6, outline_hex=CW.MINT)


def _fin(rig, joint, root, side, team=True, scale=1.0):
    x, y, z = root
    k = scale
    pts = [(x + 4.0, z + 2.0), (x - 6.0 * k, z - 10.0 * k), (x - 22.0 * k, z - 22.0 * k), (x - 26.0 * k, z - 18.0 * k),
           (x - 14.0 * k, z - 4.0 * k), (x - 6.0, z + 2.0)]
    g = Geo().slab(pts, y, 2.4)
    if team:
        rig.part(joint, g, team=True)
    else:
        rig.part(joint, g, CW.VIOLET_DK, finish="gloss")
    g = Geo().capsule((x - 6.0 * k, y - 1.4 * side, z - 10.0 * k), (x - 24.0 * k, y - 1.4 * side, z - 20.0 * k), 1.0, 0.7)
    rig.part(joint, g, CW.STAR, finish="gloss", outline=0.5, outline_hex=CW.STAR_TRIM)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    # interior lines keep their lu width under the body scale (as world.common.turret_module does)
    orig_part = rig.part

    def part(joint, geo, *a, outline=C.OUTLINE_LU, **k):
        return orig_part(joint, geo, *a, outline=min(outline, C.OUTLINE_LU) / SC, **k)

    rig.part = part
    rig.joint("body", "root", (0, 0, 0), scale=SC)
    rig.joint("hull", "body", HULL)
    hx, hy, hz = HULL
    # far pectoral fin
    rig.joint("fin_l", "hull", (12.0, 18.0, 34.0))
    _fin(rig, "fin_l", (12.0, 18.0, 34.0), -1, team=True, scale=0.9)
    # the tail, two segments and a team fluke
    rig.joint("tail1", "hull", (-26.0, 0, 42.0))
    g = Geo().blob((-40.0, 0, 42.0), (18.0, 13.0, 12.0), p=2.3, taper=(0.75, 1.0))
    rig.part("tail1", g, CW.VIOLET, finish=BODY_FINISH, outline_hex=CW.VIOLET_DK)
    g = Geo().blob((-40.0, 0, 37.0), (15.0, 11.0, 6.0), p=2.4)
    g.clip((0, 0, 36.0), (0, 0, 1))
    rig.part("tail1", g, CW.STAR, outline_hex=CW.STAR_TRIM)
    rig.joint("tail2", "tail1", (-54.0, 0, 44.0))
    g = Geo().blob((-62.0, 0, 46.0), (12.0, 7.4, 7.0), p=2.3, taper=(0.7, 1.0))
    rig.part("tail2", g, CW.VIOLET, finish=BODY_FINISH, outline_hex=CW.VIOLET_DK)
    g = Geo().slab([(-68.0, 48.0), (-80.0, 64.0), (-88.0, 66.0), (-82.0, 50.0), (-88.0, 34.0), (-80.0, 34.0)], 0.0, 3.0)
    rig.part("tail2", g, team=True)
    # the big body: a violet back with star specks, a star-white grooved belly
    g = Geo().blob(HULL, (36.0, 20.0, 20.0), p=2.3, taper=(1.05, 0.95))
    rig.part("hull", g, CW.VIOLET, finish=BODY_FINISH, outline_hex=CW.VIOLET_DK)
    g = Geo().blob((hx + 2.0, hy, hz - 6.0), (34.0, 19.0, 13.0), p=2.4)
    g.clip((0, 0, hz - 6.0), (0, 0, 1))
    rig.part("hull", g, CW.STAR, outline_hex=CW.STAR_TRIM)
    g = Geo()
    for i in range(5):
        x = hx - 20.0 + 9.0 * i
        g.capsule((x, -18.4, hz - 13.0), (x + 6.0, -18.6, hz - 15.0), 0.7)
    rig.part("hull", g, CW.STAR_TRIM, outline=0)
    g = Geo().blob((hx - 4.0, -15.0, hz + 1.0), (26.0, 6.0, 3.0), p=2.6)            # team flank stripe
    rig.part("hull", g, team=True, outline=0.6)
    KC.specks(rig, "hull", [(-20.0, 56.0, 1.4), (-4.0, 58.0, 1.1), (10.0, 56.0, 1.3), (-28.0, 50.0, 1.0), (18.0, 52.0, 1.0)],
              -19.0, mint_at=(4.0, 52.0, 1.2))
    # dorsal sails
    for i, (x, h) in enumerate(((6.0, 16.0), (-14.0, 13.0))):
        rig.secondary(f"sail{i}", "hull", (x, 0, 58.0), (x - 8.0, 0, 58.0 + h), max_deg=10, gain=1.0)
        g = Geo().slab([(x + 4.0, 57.0), (x - 4.0, 57.0 + h), (x - 10.0, 57.0 + h - 2.0), (x - 8.0, 57.0)], 0.0, 2.4)
        rig.part(f"sail{i}", g, CW.VIOLET_DK, finish="gloss", outline_hex=CW.VIOLET_DK)
    # the saddle blanket with the star
    g = Geo().blob((-15.0, 0, 59.5), (18.0, 16.0, 4.0), p=2.6)
    g.clip((0, 0, 56.0), (0, 0, -1))
    rig.part("hull", g, team=True)
    g = Geo().star((-15.0, -15.0, 58.0), 3.2, 1.3, 1.2, points=5)
    rig.part("hull", g, KC.STAR_PALE, outline=0)
    for i, at in enumerate(RIDERS):
        _rider(rig, i, at)
    # the head (a joint at the neck) with the face, the throat glow and the mouth
    rig.joint("head", "hull", (26.0, 0, 46.0))
    head = Geo().blob(HEAD_C, (22.0, 18.0, 17.0), p=2.3, taper=(0.95, 1.05))
    KM.face2(rig, [head], CW.VIOLET, 52.0, 54.0, eye_dy=(-12.0, -1.0), eye_r=(5.0, 4.6, 6.0), pupil_r=(2.2, 3.2, 3.6),
             brow=CW.VIOLET_DK, brow_w=1.4, mouth_w=12.0, mouth_dz=-12.0, mouth_shape="smile")
    rig.part("head", head, CW.VIOLET, finish=BODY_FINISH, outline_hex=CW.VIOLET_DK)
    g = Geo().blob((HEAD_C[0] + 2.0, 0, HEAD_C[2] - 9.0), (20.0, 16.0, 7.0), p=2.4)
    g.clip((0, 0, HEAD_C[2] - 9.0), (0, 0, 1))
    rig.part("head", g, CW.STAR, outline_hex=CW.STAR_TRIM)
    rig.joint("throat", "head", (HEAD_C[0] + 4.0, -10.0, HEAD_C[2] - 12.0), hidden=True)
    g = Geo().blob((HEAD_C[0] + 4.0, -12.0, HEAD_C[2] - 12.0), (10.0, 6.0, 6.0), p=2.3)
    rig.part("throat", g, glow=CW.MINT, outline=1.0, outline_hex="#1C8A6A")
    g = Geo().blob((HEAD_C[0] + 2.0, -15.0, HEAD_C[2] - 11.0), (5.0, 3.0, 3.0), p=2.3)
    rig.part("throat", g, glow=CW.MINT_CORE, outline=0)
    # the near pectoral fin (in front)
    rig.joint("fin_r", "hull", (12.0, -20.0, 34.0))
    _fin(rig, "fin_r", (12.0, -20.0, 34.0), 1, team=True)
    # the muzzle carrier (moved to a rider in attack_alt)
    rig.joint("mz", "hull", MOUTH, hidden=True)
    rig.track("muzzle", "mz", MOUTH)
    rig.joint("odo", "root", (0, 0, 0))
    rig.track("_foot", "odo", (0, 0, 0))
    _detail(rig)
    if getattr(rig, "skin", None) is None:
        _damage_spots(rig)


def _detail(rig):
    """W4 (in the model's 96 lu space; the body is scaled 1.8), after the W4 review's S1: r29-r40c covered the hide in
    rows of short creases, tubercles and star dust, a fine speckle at 1x that took the head's and the flank's big forms
    (MAT 3). r42 makes the breakup bigger and sparser: five broad folds (two along the lower flank, the neck's, one on
    each tail segment), each a dark crease under a lit lip; the constellations kept to the dark back stripe, the
    shipped stars joined by pale lines and two larger ones added; no dots on the head or the belly; a stronger in-band
    gradient so the big forms shade. r42c makes each lip a ridge of the hide; r42d adds a fold across the lit back and one
    across the crown, and takes the hull, head and tail to matte (BODY_FINISH). Kept: the eye's wrinkles, the belly's and the throat's pleats (and under the body,
    the throat and the tail for the death roll), the fins', the fluke's and the sails' ribs, the blanket's border seam
    and quilting, the riders' craters, belts and badges, the throat glow's white heart."""
    hx, hy, hz = HULL
    br, bt = (36.0, 20.0, 20.0), (1.05, 0.95)
    body = FC.Face(rig, "hull", [Geo().blob(HULL, br, p=2.3, taper=bt)], yaw_deg=YAW_DEG)
    hc, hr, ht = HEAD_C, (22.0, 18.0, 17.0), (0.95, 1.05)
    head = FC.Face(rig, "head", [Geo().blob(hc, hr, p=2.3, taper=ht)], yaw_deg=YAW_DEG)
    t1c, t1r, t1t = (-40.0, 0, 42.0), (18.0, 13.0, 12.0), (0.75, 1.0)
    tf = FC.Face(rig, "tail1", [Geo().blob(t1c, t1r, p=2.3, taper=t1t)], yaw_deg=YAW_DEG)
    t2c, t2r, t2t = (-62.0, 0, 46.0), (12.0, 7.4, 7.0), (0.7, 1.0)
    t2 = FC.Face(rig, "tail2", [Geo().blob(t2c, t2r, p=2.3, taper=t2t)], yaw_deg=YAW_DEG)

    def on(face, c, r, t, pts, dz=0.0, dx=0.0, lift=0.0):
        """(x, z) side-view points laid on a tapered blob's camera side, shifted by dx, dz."""
        return [FW.sc(face, x + dx, z + dz, KB.blob_y(c, r, x + dx, z + dz, p=2.3, taper=t) - lift) for x, z in pts]

    def fold(joint, face, c, r, t, pts, up=(0.0, 1.15)):
        """A broad fold: a dark crease along pts and its lit lip just above it (up: the lip's offset in x, z), the lip a
        ridge of the hide standing proud (r42c: as a painted line it gave edges but no shading; a ridge rounds from its
        lit top into its shadow, the soft gradient a fold has)."""
        FW.panel_lines(rig, joint, face, [on(face, c, r, t, pts)], fill=FW.LINE_ON_VIOLET, w=1.25)
        lip = [(x + up[0], z + up[1]) for x, z in pts]
        g = KB.ridge(c, r, lip, 0.95, p=2.3, taper=t, bulge=0.55)
        rig.part(joint, g, FOLD_LIP, finish="gloss", outline=0)
    # the folds: three along the flank (one over the team stripe, the dark back stripe's lower edge; two under it) and a
    # crease along the white belly's top edge, the neck's fold (behind the head), the brow's and the cheek's, one on
    # each tail segment (r42 had five: micro 3.33, edge 0.407 against 3.6 and 0.45; r42c micro 3.43, edge 0.448)
    fold("hull", body, HULL, br, bt, ((-28.0, 48.6), (-18.0, 48.0), (-8.0, 47.8), (2.0, 47.8), (12.0, 48.2),
                                      (18.0, 48.8)))
    fold("hull", body, HULL, br, bt, ((-27.0, 39.4), (-17.0, 38.8), (-7.0, 38.4), (3.0, 38.4), (13.0, 38.8),
                                      (21.0, 39.6)))
    fold("hull", body, HULL, br, bt, ((-25.0, 35.4), (-15.0, 34.8), (-5.0, 34.4), (5.0, 34.4), (15.0, 34.8),
                                      (22.0, 35.6)))
    belly = FC.Face(rig, "hull", [Geo().blob((hx + 2.0, hy, hz - 6.0), (34.0, 19.0, 13.0), p=2.4)], yaw_deg=YAW_DEG)
    FW.panel_lines(rig, "hull", belly, [[FW.sc(belly, x, z, KB.blob_y((hx + 2.0, hy, hz - 6.0), (34.0, 19.0, 13.0), x, z,
                                                                   p=2.4)) for x, z in
                                         ((-24.0, 33.6), (-14.0, 33.2), (-4.0, 33.0), (6.0, 33.0), (16.0, 33.4),
                                          (24.0, 34.0))]], fill=FW.LINE_ON_VIOLET, w=1.1)
    fold("head", head, hc, hr, ht, ((32.0, 59.4), (37.0, 60.6), (42.0, 61.0), (47.0, 60.4)))
    fold("head", head, hc, hr, ht, ((30.0, 47.6), (35.0, 46.6), (40.0, 46.2), (45.0, 46.6)))
    fold("head", head, hc, hr, ht, ((24.0, 60.0), (22.4, 56.0), (22.0, 52.0), (22.6, 48.0), (24.0, 44.0)), up=(-1.2, 0.0))
    fold("tail1", tf, t1c, t1r, t1t, ((-29.0, 47.6), (-36.0, 47.0), (-43.0, 46.4), (-50.0, 45.6)))
    fold("tail2", t2, t2c, t2r, t2t, ((-55.5, 48.4), (-61.0, 48.0), (-66.0, 47.4)))
    # (r42d) across the lit back, between the blanket and the neck, and across the crown over the brow
    fold("hull", body, HULL, br, bt, ((2.0, 56.4), (8.0, 57.2), (14.0, 57.4), (20.0, 57.0)))
    fold("head", head, hc, hr, ht, ((30.0, 62.4), (35.0, 63.2), (40.0, 63.4), (45.0, 62.8)))
    # the eye's wrinkles (two; r40's cheek and jaw creases and every tubercle are gone)
    FW.panel_lines(rig, "head", head, [on(head, hc, hr, ht, pts) for pts in (
        ((42.0, 60.0), (45.0, 62.0), (49.0, 62.4)), ((40.0, 56.0), (42.6, 52.4), (42.4, 48.6)))],
                   fill=FW.LINE_ON_VIOLET, w=0.9)
    # the constellations on the dark back stripe: the shipped stars (y -19, build()) joined by pale lines, two larger
    # stars added to them
    def by(x, z):
        return KB.blob_y(HULL, br, x, z, p=2.3, taper=bt) - 0.3
    big = ((-12.0, 53.6, 1.6), (-24.0, 52.6, 1.4))
    for x, z, r in big:
        KC.specks(rig, "hull", [(x, z, r)], by(x, z) - 0.1)
    shipped = lambda x, z: FW.sc(body, x, z, -19.0)      # noqa: E731
    mine = lambda x, z: FW.sc(body, x, z, by(x, z) + 0.3)   # noqa: E731
    FW.panel_lines(rig, "hull", body, [
        [shipped(-28.0, 50.0), mine(-24.0, 52.6), shipped(-20.0, 56.0), mine(-12.0, 53.6), shipped(-4.0, 58.0)],
        [shipped(4.0, 52.0), shipped(10.0, 56.0), shipped(18.0, 52.0)]], fill=CONST_LINE, w=0.5)
    # the belly's long ventral pleats (six rows) and the throat's grooves
    belly = FC.Face(rig, "hull", [Geo().blob((hx + 2.0, hy, hz - 6.0), (34.0, 19.0, 13.0), p=2.4)], yaw_deg=YAW_DEG)
    FW.panel_lines(rig, "hull", belly, [[FW.sc(belly, x, z + 0.02 * x, -18.2) for x in (-26.0, -12.0, 2.0, 16.0, 28.0)]
                                        for z in (hz - 7.2, hz - 8.6, hz - 10.0, hz - 11.4, hz - 12.7, hz - 14.0)],
                   fill=CW.STAR_TRIM, w=0.7)
    thc, thr = (HEAD_C[0] + 2.0, 0, HEAD_C[2] - 9.0), (20.0, 16.0, 7.0)
    throat = FC.Face(rig, "head", [Geo().blob(thc, thr, p=2.4)], yaw_deg=YAW_DEG)
    FW.panel_lines(rig, "head", throat, [[FW.on_blob(throat, thc, thr, x, z, p=2.4)
                                          for x, z in ((x0, zz), (x0 + 8.0, zz - 0.4), (x0 + 16.0, zz))]
                                         for x0, zz in ((28.0, HEAD_C[2] - 4.6), (30.0, HEAD_C[2] - 7.0),
                                                        (32.0, HEAD_C[2] - 9.4))], fill=CW.STAR_TRIM, w=0.7)
    # the near fin's ribs (team-dark), the fluke's, the sails'
    x, y, z = 12.0, -20.0, 34.0
    fin = FC.Face(rig, "fin_r", [Geo().slab([(x + 4.0, z + 2.0), (x - 6.0, z - 10.0), (x - 22.0, z - 22.0),
                                             (x - 26.0, z - 18.0), (x - 14.0, z - 4.0), (x - 6.0, z + 2.0)], y, 2.4)],
                  yaw_deg=YAW_DEG)
    FW.folds(rig, "fin_r", fin, [[FW.sc(fin, x - 2.0, z - 1.0, y - 1.4), FW.sc(fin, x - 16.0, z - 14.0, y - 1.4)],
                                 [FW.sc(fin, x - 8.0, z - 1.0, y - 1.4), FW.sc(fin, x - 20.0, z - 13.0, y - 1.4)],
                                 [FW.sc(fin, x + 1.0, z + 0.4, y - 1.4), FW.sc(fin, x - 12.0, z - 14.0, y - 1.4)],
                                 [FW.sc(fin, x - 11.0, z - 2.0, y - 1.4), FW.sc(fin, x - 22.0, z - 15.0, y - 1.4)]],
             w=0.9, team=True)
    fl = FC.Face(rig, "tail2", [Geo().slab([(-68.0, 48.0), (-80.0, 64.0), (-88.0, 66.0), (-82.0, 50.0), (-88.0, 34.0),
                                            (-80.0, 34.0)], 0.0, 3.0)], yaw_deg=YAW_DEG)
    FW.folds(rig, "tail2", fl, [[FW.sc(fl, -70.0, 48.0, -1.6), FW.sc(fl, -82.0, 61.0, -1.6)],
                                [FW.sc(fl, -70.0, 46.0, -1.6), FW.sc(fl, -83.0, 38.0, -1.6)],
                                [FW.sc(fl, -76.0, 48.0, -1.6), FW.sc(fl, -82.0, 48.6, -1.6)]], w=0.9, team=True)
    for i, (x, h) in enumerate(((6.0, 16.0), (-14.0, 13.0))):
        sf = FC.Face(rig, f"sail{i}", [Geo().slab([(x + 4.0, 57.0), (x - 4.0, 57.0 + h), (x - 10.0, 57.0 + h - 2.0),
                                                    (x - 8.0, 57.0)], 0.0, 2.4)], yaw_deg=YAW_DEG)
        FW.panel_lines(rig, f"sail{i}", sf, [[FW.sc(sf, x + 1.0, 58.0, -1.3), FW.sc(sf, x - 4.6, 57.0 + h - 2.0, -1.3)],
                                             [FW.sc(sf, x - 3.0, 58.0, -1.3), FW.sc(sf, x - 7.4, 57.0 + h - 3.0, -1.3)]],
                       fill=CW.VIOLET, w=0.8)
    # the blanket: its border seam and its quilted top (team-dark)
    bc, bR, bp = (-15.0, 0, 59.5), (18.0, 16.0, 4.0), 2.6
    bl = FC.Face(rig, "hull", [Geo().blob(bc, bR, p=bp)], yaw_deg=YAW_DEG)
    FW.folds(rig, "hull", bl, [[FW.on_blob(bl, bc, bR, xx, 58.2, p=bp) for xx in (-29.0, -23.0, -17.0, -10.0, -3.0)]],
             w=0.8, team=True)

    def btop(x, y):
        t = 1.0 - abs((x - bc[0]) / bR[0]) ** bp - abs(y / bR[1]) ** bp
        return bc[2] + bR[2] * max(t, 0.0) ** (1.0 / bp)
    quilt = []
    for x0 in (-30.0, -22.0, -14.0, -6.0):
        quilt.append([(x0 + 2.0 * k, -13.0 + 3.0 * k) for k in range(5)])
        quilt.append([(x0 + 2.0 * k, -1.0 - 3.0 * k) for k in range(5)])
    FW.folds(rig, "hull", bl, [[FW.sc(bl, x, btop(x, y) + 0.1, y) for x, y in ln] for ln in quilt], w=0.6, team=True)
    # the riders: craters ringed in moon-dark on the heads, a team-dark belt and a pale star badge on the bodies
    for i, (x, y, z) in enumerate(RIDERS):
        j = f"rider{i}"
        rc, rr = (x + 0.8, y, z + 13.4), (5.6, 5.4, 5.4)
        face = FC.Face(rig, j, [Geo().blob(rc, rr, p=2.2)], yaw_deg=YAW_DEG)
        rings = []
        for cx, cz, ring in ((-2.4, 2.0, 1.2), (0.6, 3.8, 0.8), (-3.4, -1.6, 0.9), (-0.4, -2.6, 0.7)):
            pts = [(rc[0] + cx + ring * math.cos(k * math.pi / 4), rc[2] + cz + ring * math.sin(k * math.pi / 4))
                   for k in range(9)]
            rings.append([FW.on_blob(face, rc, rr, px, pz, p=2.2) for px, pz in pts])
        FW.panel_lines(rig, j, face, rings, fill=CW.MOON_DK, w=0.45)
        bc_, bR_ = (x, y, z + 5.0), (4.4, 4.4, 5.0)
        bf = FC.Face(rig, j, [Geo().blob(bc_, bR_, p=2.3)], yaw_deg=YAW_DEG)
        FW.folds(rig, j, bf, [[FW.on_blob(bf, bc_, bR_, x + dx, z + 4.0 - 0.1 * dx, p=2.3) for dx in (-3.6, -1.2, 1.2, 3.6)]],
                 w=0.6, team=True)
        yy = KB.blob_y(bc_, bR_, x + 1.4, z + 6.4, p=2.3) - 0.2
        KC.specks(rig, j, [(x + 1.4, z + 6.4, 0.8)], yy, color=KC.STAR_PALE)
    # the throat glow's white heart, proud of its core
    g = Geo().blob((HEAD_C[0] + 2.6, -17.6, HEAD_C[2] - 11.0), (2.4, 1.4, 1.6), p=2.3)
    rig.part("throat", g, glow=K.WHITE, outline=0)

    # the pleats under the body, the throat and the tail: capsules on each blob's underside (no decal reaches it; the
    # death roll turns it to the camera)
    def under(c, r, p, x, y, k):
        t = 1.0 - abs((x - c[0]) / (r[0] * k)) ** p - abs((y - c[1]) / (r[1] * k)) ** p
        return c[2] - r[2] * max(t, 0.0) ** (1.0 / p)
    for joint, c, r, k, xs, ys in (
            ("hull", HULL, br, bt[0], (-26.0, -16.0, -6.0, 4.0, 14.0, 24.0), (-7.0, -3.5, 0.0, 3.5, 7.0)),
            ("head", HEAD_C, hr, 0.95, (26.0, 32.0, 38.0, 44.0, 50.0), (-5.0, 0.0, 5.0)),
            ("tail1", t1c, t1r, t1t[0], (-50.0, -45.0, -40.0, -35.0, -30.0), (-3.0, 0.0, 3.0))):
        g = Geo()
        for y in ys:
            pts = [(x, y, under(c, r, 2.3, x, y, k) + 0.3) for x in xs]
            for a_, b_ in zip(pts, pts[1:]):
                g.capsule(a_, b_, 0.6, segs=8, rings=2)
        rig.part(joint, g, CW.STAR_TRIM, outline=0)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, rider: the whale as a beast; no blood), in the model's space: the
    team saddle blanket (a strip), the near team fin, the violet back, the head behind the eye; breath at the mouth."""
    rig.damage_spot("blanket", "hull", (-15.0, -15.4, 58.0), 6.0, "cloth", kind="strip", team=True, normal=(0, -1, 0.3))
    rig.damage_spot("fin", "fin_r", (0.0, -21.4, 26.0), 6.0, "hide", team=True, normal=(0, -1, 0))
    rig.damage_spot("back", "hull", (-6.0, -16.0, 52.0), 7.0, "hide", normal=(0, -0.8, 0.6))
    rig.damage_spot("head", "head", (26.0, -15.0, 52.0), 6.0, "hide", normal=(0, -1, 0.2))
    rig.damage_spot("breath", "head", MOUTH, 5.0, "breath", kind="emit", normal=(0.8, -0.4, 0.2))


def swim(p, amp=1.0):
    """The undulation: the head and the tail wave a beat apart, the fins paddle."""
    return {"head": {"r": 4.0 * amp * math.sin(p)}, "tail1": {"r": -6.0 * amp * math.sin(p - 1.2)},
            "tail2": {"r": -10.0 * amp * math.sin(p - 2.2)}, "fin_r": {"r": 14.0 * amp * math.sin(p - 0.6)},
            "fin_l": {"r": 12.0 * amp * math.sin(p - 0.9)}, "hull": {"r": 1.5 * amp * math.sin(p - 0.4)}}


def riders(p=0.0, duck=0.0):
    return {"rider0": {"z": 1.2 * math.sin(p) - 3.0 * duck}, "rider1": {"z": 1.2 * math.sin(p - 1.4) - 3.0 * duck}}


def _idle(f):
    p = 2 * math.pi * f / 6
    pose = merge(swim(p, 0.6), riders(p), {"body": {"z": 1.4 * SC * math.cos(p)}, "rider0": {"rz": [0, 10, 20, 10, 0, -10][f]}})
    return merge(pose, FC.expr("blink")) if f == 3 else pose


SPEED = 40.0
GROUND = SPEED * 1.25


def _walk(f):
    p = 2 * math.pi * f / 8
    a = GROUND * 0.5 / 4.0
    return merge(swim(p, 1.0), riders(2 * p), {"odo": {"x": a * math.cos(p)}, "body": {"r": -4.0, "z": 1.0 * SC * math.sin(2 * p)}})


# -- attacks: heavy timing (impact on step 6 at 570 of 1230 ms), 10 poses ------------------------------------
def _sing(f, hr, hd, hz, hx, t1, thr, fins=0.0, bx=0.0):
    pose = merge(swim(0.0, 0.0), riders(duck=1.0 if f in (6, 7) else 0.0), {
        "hull": {"r": hr}, "head": {"r": hd}, "body": {"z": hz * SC, "x": (hx + bx) * SC}, "tail1": {"r": t1}, "tail2": {"r": 1.4 * t1},
        "throat": {"show": thr > 0, "s": max(thr, 0.01)}, "fin_r": {"r": fins}, "fin_l": {"r": fins * 0.8}})
    e = {1: ("o",), 2: ("o",), 3: ("squeeze", "o"), 4: ("yell",), 5: ("yell",), 6: ("yell",), 7: ("yell",)}.get(f)
    return merge(pose, FC.expr(*e)) if e else pose


#        read  inhale arch  HOLD  snap  snap  SONG  ring  ease  settle    (A: song wave)
A_HR = [0, 4, 8, 9, 2, -4, -6, -5, -2, 0]
A_HD = [0, 8, 16, 18, 4, -8, -12, -10, -4, 0]
A_T1 = [0, -4, -8, -10, 0, 6, 8, 6, 2, 0]
A_TH = [0, 0.6, 1.0, 1.25, 1.2, 1.0, 0.6, 0.0, 0.0, 0.0]


def _a_pose(f):
    return _sing(f, A_HR[f], A_HD[f], [0, 1, 2, 2.5, 1, -1, -2, -1.5, -0.5, 0][f], [0, -1, -2, -3, 0, 3, 5, 5, 2, 0][f],
                 A_T1[f], A_TH[f], fins=[0, 6, 12, 14, 0, -10, -14, -10, -4, 0][f])


B_HR = [0, 8, 14, 16, 8, 0, -4, -3, -1, 0]
B_HD = [0, 12, 24, 28, 10, -10, -18, -14, -6, 0]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _sing(f, B_HR[f], B_HD[f], [0, 3, 6, 7, 5, 1, -1, -1, 0, 0][f], [0, -2, -4, -5, -2, 1, 3, 3, 1, 0][f],
                 [0, -6, -12, -14, -6, 4, 8, 6, 2, 0][f], A_TH[f], fins=[0, 14, 26, 30, 16, -6, -12, -8, -2, 0][f])


C_HR = [0, -5, -9, -10, -6, -2, 0, 0, 0, 0]
C_HD = [0, -10, -16, -18, -10, 0, 6, 5, 2, 0]


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _sing(f, C_HR[f], C_HD[f], [0, -2, -4, -5, -4, -2, -1, -1, 0, 0][f], [0, -2, -4, -5, 2, 7, 10, 10, 4, 0][f],
                 [0, 6, 12, 14, 8, -2, -6, -4, -2, 0][f], A_TH[f], fins=[0, -6, -12, -14, -4, 6, 10, 8, 2, 0][f])


def _song(f):
    big = tuple(SC * r for r in {4: (6.0, 10.0), 5: (10.0, 16.0), 6: (14.0, 24.0)}[f])
    out = [{"kind": "rings", "joint": "head", "point": MOUTH, "radii_lu": big, "a0": -55.0, "a1": 55.0, "color": CW.MINT_CORE}]
    if f == 6:
        out.append({"kind": "rings", "joint": "head", "point": MOUTH, "radii_lu": (28.0 * SC, 34.0 * SC), "a0": -40.0, "a1": 40.0,
                    "color": CW.MINT_CORE})
    return out


def _heavy_clip(name, fn, reuse=None):
    ov = {3: CW.rings_fx("throat", (HEAD_C[0] + 4.0, -14.0, HEAD_C[2] - 12.0), (8.0 * SC, 12.0 * SC), CW.MINT_CORE, -180.0, 180.0),
          4: _song(4), 5: _song(5), 6: _song(6) + CW.dust_fx(50.0 * SC, 471, size=8.0 * SC, puffs=4)}
    return M.clip(name, [fn(f) for f in range(10)], M.HEAVY_MELEE_MS[:10] + [M.HEAVY_MELEE_MS[10] + M.HEAVY_MELEE_MS[11]],
                  impact=M.HEAVY_MELEE_IMPACT, overlays=ov, sequence=list(range(10)) + [0], reuse=reuse,
                  extra={"holdStep": 3})


# attack_alt: the Moonling riders' own sim attack (20 every 1.4 s); the whale holds idle pose 0. 6 frames, 600 ms,
# the spit on frame 2 at 200 ms; the muzzle moves to the front rider's mouth.
ALT_MS = [80, 120, 100, 100, 100, 100]
RIDER_MOUTH = (RIDERS[0][0] + 7.6, RIDERS[0][1] - 3.0, RIDERS[0][2] + 11.6)


ALT_AIM_W = [0.0, 0.5, 1.0, 0.6, 0.2, 0.0]


def _alt(i, turn=0.0):
    off = (RIDER_MOUTH[0] - MOUTH[0], RIDER_MOUTH[1] - MOUTH[1], RIDER_MOUTH[2] - MOUTH[2])
    pose = merge(_idle(0), {
        "mz": {"x": off[0], "y": off[1], "z": off[2], "r": turn},
        "rider0": {"r": [0, 12, -10, -6, 0, 0][i] + 0.8 * turn, "z": [0, -1, 1.5, 0.5, 0, 0][i]},
        "rider1": {"r": [0, 8, 14, -8, -4, 0][i], "z": [0, 0, -1, 1.5, 0.5, 0][i]},
        "spit0": {"show": i == 1}, "spit1": {"show": i == 2}})
    return pose


def _attack_alt():
    ov = {2: [{"kind": "burst", "joint": "rider0", "point": RIDER_MOUTH, "r0_lu": 3.0 * SC, "r1_lu": 6.0 * SC, "n": 5, "a0": -50.0,
               "arc": 100.0, "color": CW.MINT_CORE}]}
    return M.clip("attack_alt", [_alt(i) for i in range(6)], ALT_MS, impact=2, overlays=ov)


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(swim(0.0, 0.0), riders(duck=max(a, 0)), KC.hit_flyer(k, (0, 0, 42 * SC), 1.4 * SC),
                 {"head": {"r": 10 * a}, "tail1": {"r": -8 * a}})
    return merge(pose, FC.expr("squeeze", "grit") if k <= 1 else (FC.expr("o") if k == 2 else {}))


def _die(k):
    t = min(1.0, k / 5.0)
    drop = SC * [0, 2, -6, -14, -22, -26, -25, -26, -26, -26][k]
    roll = [0, -6, -14, -28, -48, -58, -60, -60, -60, -60][k]
    pose = merge(M.body_about((0, 0, 42 * SC), x=-4 * SC * t, z=drop, rx=roll, q=[-0.04, 0.03, 0.02, 0.0, -0.08, 0.03, -0.02, 0, -0.02, -0.04][k],
                              s=[1, 1, 1, 1, 1, 1, 1, 1, 0.98, 0.95][k]),
                 {"head": {"r": -10 * t}, "tail1": {"r": 10 * t}, "tail2": {"r": 16 * t}, "fin_r": {"r": 30 * t}},
                 {"rider0": {"hide": k >= 2, "z": 10.0 * min(1, k), "x": 10.0 * min(1, k)},
                  "rider1": {"hide": k >= 2, "z": 12.0 * min(1, k), "x": -6.0 * min(1, k)}})
    e = ("squeeze", "o") if k == 0 else (("o",) if k < 3 else ("x", "tongue"))
    return merge(pose, FC.expr(*e))


def clips():
    rr = {0: ("attack", 0), 9: ("attack", 9)}
    alt = _attack_alt()
    # the second gunners (the riders' spit) aimed down 35 degrees at the ground troops (item 44; aimdata measures the
    # muzzle carrier, which rides to the front rider's mouth)
    aimed = AIMED.variants(RIG, alt, _alt, ALT_AIM_W, aims=("down",))
    for v in aimed:
        AIMED.check_timing(alt, v)
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [150] * 6, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _heavy_clip("attack", _a_pose),
        _heavy_clip("attack_b", _b_pose, rr),
        _heavy_clip("attack_c", _c_pose, rr),
        alt,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in M.HEAVY_DIE_KEEP], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ] + aimed
    return M.check_variants(M.check_contract(cl, heavy=True))
