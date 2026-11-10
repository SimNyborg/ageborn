"""Sky Fortress: Modern Age legendary heavy bomber (CONTENT_PLAN 5.6). Bombs (proj.bomb), splash r50, never stops;
two waist gunners (attack_alt), crashes and the gunners bail out, ~74 lu.

Look (A11 flyer rig, Modern palette): a big, round-bellied cartoon four-engine bomber. A long team-painted
fuselage with an olive belly, a cream chevron and rivet rows, a glass nose with a framed bomb-aimer bubble, a
cockpit with a goggled pilot, a tall team tail fin with a cream band, olive wings carrying four fat radial
engines with team cowling rings and never-still propellers (one blade phase over pale blur arcs), a waist
gunner in a side window and a dorsal gunner in a glass bubble, each with a twin machine gun, and bomb-bay doors
on the belly that swing open on a stick of bombs. Flyers are authored with the origin at their lowest point.

"A viewer expects the bomb bay to open and a stick of bombs to drop while the gunners swivel and fire, and a
steady cruise with the propellers blurring."

Animation (ANIM_SPEC G8 fly, appendix B air; riders get attack_alt, ANIM_SPEC R3):
  idle        cruising: a slow pitch and roll, all four propellers spinning, the gunners scanning
  walk        forward flight at the ground speed (40 x 1.25 = 50 lu/s), nose down 4 degrees, propeller blur;
              the game adds the hover bob (R8)
  attack      BOMB RUN: the bay doors swing open (the held extreme, holdLoop), a stick of four bombs drops away
              and falls, the doors close, the bomber lifts as it lightens
  attack_b    BANKED RUN: it banks toward the camera so the wings and open bay show (the held extreme,
              holdLoop), drops the stick from the bank and rolls level
  attack_alt  the waist and dorsal gunners swivel and fire (the bullets leave `muzzle`); the bomber holds its
              cruise pose
  hit         flyer: a shudder and a drop, the pilot's eyes squeezed
  die         D8 crash: an engine smokes, it noses over and spirals down, the tail breaks, a crash bounce

Art round W3 (the detail standard): the waist gunner's burst aimed down at the ground row (`attack_alt_down`,
item 44: the target sits 22-35 degrees below the gun), damage spots and the smoke places (item 40), and the
Origami Fortress skin (item 46).
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import colors as CL
from ageborn_art import face as F
from ageborn_art import kit_bronze_detail as KD
from ageborn_art import kit_modern as KM
from ageborn_art import look
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import modern_w3 as MW

SLUG = "sky_fortress"
GAIT_NAME = "fly"
NAME = "Sky Fortress"
HEIGHT_LU = 78
YAW_DEG = -10.0
CANVAS = (560, 380)
FEET = (280, 300)
ANCHORS = {"head": (0, 72), "hitCenter": (0, 30)}
NO_RETIME = True

FUS_Z = 28.0
LEN = 70.0                     # half length of the fuselage
NOSE_X = LEN
ENGINES = ((22.0, -22.0), (16.0, -46.0), (22.0, 22.0), (16.0, 46.0))   # (x, y) of the four nacelles
ENG_Z = FUS_Z - 10.0
PROP_R = 13.0
PHASES = 3
BLUR = 3
BAY = (4.0, 0.0, FUS_Z - 15.0)
WAIST = (-26.0, -13.0, FUS_Z + 2.0)      # the near waist gunner's window
DORSAL = (24.0, 0.0, FUS_Z + 15.5)       # the dorsal turret
ALT_MUZ = (WAIST[0] + 14.0, WAIST[1] - 3.0, WAIST[2] + 1.0)
STEEL_DK = "#2F3336"
WINDOW = "#2B2A2E"
BOMB = "#3E4236"
SEAM = "#4E5238"             # panel lines on the olive
SOOT = "#45473F"             # W3: exhaust stains behind the cowlings
CHIP = "#7E8264"             # W3: worn paint on the olive
FUS = dict(center=(0.0, 0, FUS_Z), radii=(LEN, 14.0, 15.0), p=2.6, taper=(0.62, 1.0), shift=(-0.1, 0))
FIN = [(-52, FUS_Z + 6), (-68, FUS_Z + 7), (-74, FUS_Z + 40), (-62, FUS_Z + 42), (-54, FUS_Z + 16)]

# the detail standard (art round W3, ageborn_art/look.py): the lifts and the model detail of audit 5.1 / 5.2.
# What a player sees of a Sky Fortress is the long team fuselage, the olive belly and near wing with its engines and
# the tall tail: the team zone in two tones (a team-dark cheat line along the fuselage above the belly, a team-dark
# rudder on the fin, team panel seams across the fuselage), a row of dark windows, bigger rivets, panel lines and
# worn chips on the olive wing and belly, soot stains behind the cowlings. A flyer reads against the sky by its
# outline and a lit top (SHADE_MACHINE's top light).
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = MW.HIGHLIGHT_MACHINE
# a stronger core shadow and gradient than the hulls': the long smooth airframe needs the light-to-shadow turn to
# read as edges at 62 px (the flyers' edge floor 0.48)
LOOK_SHADE = dict(MW.SHADE_MACHINE, core=0.30, core_width=0.26, gradient=3.0, cavity=0.85)
MATERIAL_KINDS = MW.kinds({R.OLIVE: "iron", R.OLIVE_LT: "iron", SEAM: "iron", SOOT: "iron", CHIP: "iron",
                           R.GUNMETAL: "iron", STEEL_DK: "iron", BOMB: "iron", R.GLASS: "glass", WINDOW: "glass",
                           R.SIGNAL: "polymer", KM.CREAM: "polymer", R.LEATHER: "leather", R.SKIN: "skin",
                           R.HAIR: "fur", "team": "iron"})


def _far(pal):
    out = dict(pal)
    for h, v in pal.items():
        out.setdefault(CL.scale(h, 0.8), CL.scale(v, 0.8))
    return out


# Origami Fortress (DESIGN A5.8, legendary: "folded paper wings and fuselage with crisp creases"): the same bomber
# folded from paper: cream paper for the olive (the belly, the wings, the nacelles, the tailplane), pale grey paper
# for the metal, pale blue tissue for the glass, crease lines folded into the wings, the belly, the fin and along the
# fuselage (a dark valley line beside a pale ridge), a paper fold down the middle of each propeller. The fuselage top,
# the fin, the cowling rings and the wing tip stay team (team-coloured paper).
PAPER = "#DDD6C6"
PAPER_LT = "#E6E0D2"
PAPER_DK = "#B9B19F"
FOLD = "#A69E8C"           # a crease's valley line
RIDGE = "#EFEAE0"          # a crease's lit ridge
PAPER_PAL = _far({R.OLIVE: PAPER, R.OLIVE_LT: PAPER_LT, SEAM: PAPER_DK, SOOT: PAPER_DK, CHIP: PAPER_LT,
                  R.GUNMETAL: "#8F9296", STEEL_DK: "#77797D", BOMB: "#9C9789", R.GLASS: "#C3D2D6", WINDOW: "#7C8285",
                  R.SIGNAL: "#B9877F"})
# W3 review (the Origami Fortress should: "faceted fold shading, flat planes that each take one value"): the airframe is
# folded from a few large flat planes (flat-shaded blobs of few cuts, six-sided nacelles, plates), so each plane takes
# one value of the cel light and the folds between them catch it (the edge highlight lights the convex folds); the
# paper keeps only a faint grain ("polymer", 3%) instead of the ceramic speckle, and the painted creases that ran over
# the old round shading make way for the real folds. Crisp paper points break the outline inside the old extents: the
# wing tips, the fin's tip, the tailplane's tips, the nose folded to a point and pointed spinners.
PAPER_KINDS = MW.kinds({PAPER: "leather", PAPER_LT: "leather", PAPER_DK: "leather", "#8F9296": "polymer",
                        "#77797D": "polymer", "#9C9789": "polymer", "#C3D2D6": "glass", "#7C8285": "polymer",
                        "#B9877F": "polymer", FOLD: "polymer", RIDGE: "polymer", "team": "leather"})
SKINS = {"origami_fortress": {"palette": PAPER_PAL, "kinds": PAPER_KINDS}}
PAPER_CUTS = 2          # the fuselage's planes: a 3 x 3 grid per side of the blob's cube, long strips along it
PAPER_FIN = [(-52, FUS_Z + 6), (-68, FUS_Z + 7), (-74, FUS_Z + 42), (-63, FUS_Z + 38.5), (-54, FUS_Z + 16)]


def _air(paper, center, radii, p=2.0, taper=(1.0, 1.0), shift=(0.0, 0.0), cuts=PAPER_CUTS):
    """An airframe blob: the plain bomber's smooth one, or the Origami Fortress's folded from a few flat planes."""
    if paper:
        return Geo().blob(center, radii, p=p, cuts=cuts, taper=taper, shift=shift, smooth=False)
    return Geo().blob(center, radii, p=p, taper=taper, shift=shift)


def _flat(g):
    """Every face of a Geo flat-shaded (a paper plane takes one value)."""
    for f in g.bm.faces:
        f.smooth = False
    return g


def _plate(pts, z, t):
    """A flat paper plate: the outline `pts` (x, y) at height z, t lu thick."""
    return Geo().slab(pts, -z, t, rot=(-90.0, 0.0, 0.0))


def _fold_plate(pts, z, t, a, b, deg):
    """A paper plate (`_plate`) turned `deg` degrees about the fold line from a to b ((x, y) at height z): one half of
    a folded wing, its fold a crisp ridge between two planes."""
    from mathutils import Matrix, Vector
    g = _plate(pts, z, t)
    p0 = Vector((a[0], a[1], z))
    rot = Matrix.Rotation(math.radians(deg), 4, (Vector((b[0], b[1], z)) - p0).normalized())
    for v in g.bm.verts:
        v.co = p0 + (rot @ (v.co - p0))
    return g


# W3 review: the paper wings folded once along a diagonal, from the root's trailing corner to the tip's leading corner;
# the inner half (toward the leading edge) is turned up a little, so the fold is a lit ridge and each half one tone
# and a flap folded down along its trailing edge (a second fold across the wing)
WING_NEAR = {"front": [(-5.0, -1.0), (29.0, -1.0), (28.0, -64.0)],
             "rear": [(4.0, -18.2), (28.0, -64.0), (22.0, -71.0), (4.0, -71.0)],
             "flap": [(-5.0, -1.0), (4.0, -18.2), (4.0, -71.0), (-4.0, -71.0)],
             "fold": ((-5.0, -1.0), (28.0, -64.0)), "flap_fold": ((4.0, -18.2), (4.0, -71.0))}
WING_FAR = {k: [(x, -y) for x, y in v] for k, v in WING_NEAR.items()}


def _paper_wing(rig, w, z, t, colors, outline, sign=1.0):
    a, b = w["fold"]
    rig.part("plane", _fold_plate(w["front"], z, t, a, b, -7.0 * sign), colors[0], outline=outline)
    rig.part("plane", _plate(w["rear"], z, t), colors[1], outline=outline)
    a, b = w["flap_fold"]
    rig.part("plane", _fold_plate(w["flap"], z, t, a, b, 9.0 * sign), colors[2], outline=outline)


def _split(geo, pred):
    """The faces of a closed Geo split in two Geos by `pred(face centre)`: (the faces it accepts, the others). The
    cut runs along the planes' own edges, so a team or paper area ends on a fold."""
    import bmesh
    bmesh.ops.recalc_face_normals(geo.bm, faces=geo.bm.faces[:])
    out = []
    for want in (True, False):
        g = Geo()
        g.bm.free()
        g.bm = geo.bm.copy()
        drop = [f for f in g.bm.faces if bool(pred(f.calc_center_median())) != want]
        bmesh.ops.delete(g.bm, geom=drop, context="FACES")
        out.append(g)
    geo.bm.free()
    return out


# the folded planes' own values: a plane takes its tone (team) or paper colour by how squarely it faces the light,
# lit (n.l above 0.8), turned (0.45-0.8) or away, on top of the cel light, so each fold shows a clear value step at 1x
PLANE_NL = (0.8, 0.45)
TEAM_TONES = (1.0, 0.84, 0.70)
PAPER_TONES = (PAPER_LT, PAPER, PAPER_DK)


def _planes(obj, mats):
    """Gives each face of a part one of three materials by how squarely it faces the light (PLANE_NL)."""
    from ageborn_art import config as C
    me = obj.data
    me.materials.clear()
    for m in mats:
        me.materials.append(m)
    lx, ly, lz = C.LIGHT_DIR
    for poly in me.polygons:
        n = poly.normal
        nl = n.x * lx + n.y * ly + n.z * lz
        poly.material_index = 0 if nl > PLANE_NL[0] else (1 if nl > PLANE_NL[1] else 2)
    return obj


def _paper_shell(grow, keep):
    """The paper fuselage's painted band (KD.shell of the folded body): the same planes grown by `grow` lu."""
    g = _air(True, FUS["center"], tuple(r + grow for r in FUS["radii"]), p=FUS["p"], taper=FUS["taper"],
             shift=FUS["shift"])
    for point, normal in keep:
        g.clip(point, normal)
    return g


def _engine_pts(ex, ey):
    return (ex + 10.0, ey, ENG_Z)


def _fus(paper=False):
    if paper:
        return _air(True, FUS["center"], FUS["radii"], p=FUS["p"], taper=FUS["taper"], shift=FUS["shift"])
    return Geo().blob(FUS["center"], FUS["radii"], p=FUS["p"], taper=FUS["taper"], shift=FUS["shift"])


RIG = None


def build(rig):
    global RIG
    RIG = rig
    paper = getattr(rig, "skin", None) == "origami_fortress"
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("plane", "body", (0, 0, FUS_Z))
    # far wing and its engines
    if paper:   # W3 review: a flat paper wing folded once along a diagonal
        _paper_wing(rig, WING_FAR, FUS_Z - 7.0, 2.4, (PAPER, PAPER_DK, PAPER_DK), 0.6, sign=-1.0)
    else:
        g = Geo().blob((12.0, 36.0, FUS_Z - 7.0), (17.0, 36.0, 2.6), p=3.0)
        rig.part("plane", g, R.OLIVE_LT, outline=0.6)
    # fuselage: team top, olive belly, a chevron and rivets
    if paper:   # W3 review: folded from long flat planes, the team paper ending on the lower fold, each plane one tone
        from ageborn_art import materials as MAT
        fus, belly_planes = _split(_fus(True), lambda c: c.z > FUS_Z - 4.0)
        fface = F.Face(rig, "plane", [fus])
        _planes(rig.part("plane", fus, team=True), [look.team(t) for t in TEAM_TONES])
    else:
        fus = Geo().blob((0.0, 0, FUS_Z), (LEN, 14.0, 15.0), p=2.6, taper=(0.62, 1.0), shift=(-0.1, 0))
        fus.clip((0, 0, FUS_Z - 3.0), (0, 0, -1))
        fface = F.Face(rig, "plane", [fus])
        rig.part("plane", fus, team=True)
    g = KM.chevron(fface, Geo(), (-6.0, FUS_Z + 3.0), s=1.6, n=2, w=2.2, gap=3.4)
    rig.part("plane", g, KM.CREAM, highlight=False, outline=0)
    if paper:
        _planes(rig.part("plane", belly_planes, R.OLIVE), [MAT.toon(c) for c in PAPER_TONES])
    else:
        g = Geo().blob((0.0, 0, FUS_Z), (LEN, 14.0, 15.0), p=2.6, taper=(0.62, 1.0), shift=(-0.1, 0))
        g.clip((0, 0, FUS_Z - 3.0), (0, 0, 1))
        rig.part("plane", g, R.OLIVE)
    # W3: a team-dark cheat line along the fuselage above the belly, team panel seams across it, a row of windows
    # (paper: the planes' own tones are its two-tone team zone; no seams)
    if not paper:
        keep = [((0, 0, FUS_Z + 1.6), (0, 0, 1)), ((0, 0, FUS_Z - 3.0), (0, 0, -1)), ((57.0, 0, 0), (1, 0, 0)),
                ((-56.0, 0, 0), (-1, 0, 0))]
        g = KD.shell(**FUS, grow=0.3, keep=keep)
        look.team_part(rig, "plane", g)
        for x in (-42.0, -15.0, 12.0, 36.0):
            MW.team_line(rig, "plane", _fus(), [(x, FUS_Z + 2.4), (x + 0.4, FUS_Z + 8.0), (x + 1.0, FUS_Z + 12.6)],
                         1.2, tone=0.7)
    # a cream theatre band round the rear fuselage (it echoes the fin's band) and a row of cream mission markers (little
    # bombs) under the cockpit
    keep = [((-31.5, 0, 0), (1, 0, 0)), ((-35.5, 0, 0), (-1, 0, 0)), ((0, 0, FUS_Z - 2.9), (0, 0, -1))]
    rig.part("plane", _paper_shell(0.35, keep) if paper else KD.shell(**FUS, grow=0.35, keep=keep), KM.CREAM,
             outline=0.4)
    marker = [(-1.6, -0.8), (0.9, -0.8), (1.7, 0.0), (0.9, 0.8), (-1.6, 0.8), (-2.3, 1.2), (-2.3, -1.2)]
    bombs = [((NOSE_X - 36.0 + 4.2 * k, FUS_Z + 1.6), marker) for k in range(5)]
    MW.decals(rig, "plane", [_fus(paper)], bombs, KM.CREAM, depth=0.6)
    # a long panel line along the upper fuselage
    if not paper:
        MW.team_line(rig, "plane", _fus(), [(-54.0, FUS_Z + 14.6), (-10.0, FUS_Z + 15.6), (30.0, FUS_Z + 14.8),
                                            (52.0, FUS_Z + 12.6)], 1.1, tone=0.7)
    wins = [((x, FUS_Z + 5.0), F.ellipse(0, 0, 1.8, 1.7, 12)) for x in (-52.0, -46.0, -40.0, 3.0, 9.0, 15.0)]
    MW.decals(rig, "plane", [_fus(paper)], wins, WINDOW, depth=0.6, outline=0.4)
    if not paper:   # rivets along the belly line and the spine (W3: 2.5 lu, they read at game scale; paper has none)
        g = Geo()
        for x in range(-50, 50, 7):
            g.sphere((x, -13.6, FUS_Z - 2.6), 1.25, cuts=2)
        rig.part("plane", g, R.OLIVE_LT, finish="metal", outline=0.3)
        sface = F.Face(rig, "plane", [_fus()])
        g = Geo()
        for x in range(-46, 44, 8):
            g.sphere(tuple(sface.hit(x + 0.5, FUS_Z + 11.6)), 1.25, cuts=2)
        rig.part("plane", g, R.OLIVE_LT, finish="metal", outline=0.3)
    # the anti-glare panel on the nose ahead of the cockpit
    glare = [(-5.0, -1.2), (4.6, -1.8), (4.8, 1.6), (-4.6, 2.0)]
    MW.decals(rig, "plane", [_fus(paper)], [((NOSE_X - 13.0, FUS_Z + 8.6), glare)], SEAM)
    if paper:
        belly = _fus(True)
    else:
        belly = Geo().blob((0.0, 0, FUS_Z), (LEN, 14.0, 15.0), p=2.6, taper=(0.62, 1.0), shift=(-0.1, 0))
    bface = F.Face(rig, "plane", [belly])
    if not paper:   # (paper: its folds are the planes' own edges, no panel lines or worn paint)
        g = Geo()   # W3: panel lines along and across the belly
        bface.stroke(g, bface.hit(-2.0, FUS_Z - 8.0), [(-40.0, 0.6), (-10.0, 0.0), (20.0, -0.4), (40.0, -1.2)], 1.0,
                     0.4)
        bface.stroke(g, bface.hit(-8.0, FUS_Z - 11.6), [(-30.0, 0.8), (0.0, 0.0), (30.0, -0.6)], 1.0, 0.4)
        for x in (-44.0, -30.0, -12.0, 8.0, 24.0, 40.0):
            bface.stroke(g, bface.hit(x, FUS_Z - 7.0), [(0.0, 3.4), (0.6, -4.0)], 1.0, 0.4)
        rig.part("plane", g, SEAM, highlight=False, outline=0)
        chips = [((-40.0, FUS_Z - 5.6), MW.CHIP_A), ((-12.0, FUS_Z - 10.0), MW.CHIP_B), ((36.0, FUS_Z - 6.0), MW.CHIP_C)]
        MW.decals(rig, "plane", [_fus()], chips, CHIP)
    # glass nose and the cockpit with the pilot
    if paper:   # W3 review: the nose folded to a point (six planes), inside the round nose's reach
        g = _flat(Geo().lathe([(0.0, 0.0), (9.8, 0.4), (8.6, 7.0), (4.2, 13.5), (0.0, 18.0)],
                              (NOSE_X - 13.0, 0, FUS_Z - 1.0), (NOSE_X + 5.0, 0, FUS_Z - 1.0), segs=6, rot=(0, 0, 30)))
    else:
        g = Geo().blob((NOSE_X - 4.0, 0, FUS_Z - 1.0), (9.0, 10.0, 10.0), p=2.2)
    rig.part("plane", g, R.GLASS, finish="gloss", outline=0.7, outline_hex="#6F8A94")
    if not paper:   # (paper: the folded nose has no frame)
        g = Geo()
        for a in (-60, -40, -20, 0, 20, 40, 60):     # W3: the nose glass framed in seven bars (was three)
            r = math.radians(a)
            g.capsule((NOSE_X - 10.0, -8.6 * math.cos(r), FUS_Z - 1.0 + 8.6 * math.sin(r)),
                      (NOSE_X + 3.0, -2.0 * math.cos(r), FUS_Z - 1.0 + 2.0 * math.sin(r)), 0.55)
        g.lathe([(8.9, -0.5), (9.3, 0), (8.9, 0.5)], (NOSE_X - 7.0, 0, FUS_Z - 1.0), (NOSE_X - 6.0, 0, FUS_Z - 1.0),
                segs=20)
        rig.part("plane", g, R.GUNMETAL, finish="metal", outline=0)
    g = Geo().blob((NOSE_X - 22.0, 0, FUS_Z + 11.5), (9.0, 7.0, 3.6), p=2.4)
    g.clip((0, 0, FUS_Z + 10.0), (0, 0, -1))
    rig.part("plane", g, R.GLASS, finish="gloss", outline=0.7, outline_hex="#6F8A94")
    g = Geo()   # W3: the cockpit canopy's frame bars
    for dx in (-5.0, 0.5, 5.5):
        g.capsule((NOSE_X - 22.0 + dx, -6.4, FUS_Z + 10.6), (NOSE_X - 22.0 + dx * 0.6, -1.5, FUS_Z + 14.8), 0.5)
    rig.part("plane", g, R.GUNMETAL, finish="metal", outline=0)
    rig.joint("pilot", "plane", (NOSE_X - 22.0, 0, FUS_Z + 9.5))
    hc = (NOSE_X - 21.0, 0.0, FUS_Z + 12.5)
    KM.crew_head(rig, "p_head", "pilot", hc, k=0.7, brow=R.HAIR, brow_angry=False)
    g = Geo().blob((hc[0] - 0.4, 0, hc[2] + 2.4), (5.9, 5.6, 4.0), p=2.3)
    g.clip((hc[0], 0, hc[2] + 0.3), (0, 0, -1))
    rig.part("p_head", g, R.LEATHER)
    # tail: a tall team fin with a cream band, the tailplane
    fin_pts = PAPER_FIN if paper else FIN   # W3 review: the paper fin folded to a crisp point at its top
    g = Geo().slab(fin_pts, 0.0, 3.0)
    rig.part("plane", g, team=True, outline=0.9)
    g = Geo().slab([(-62.5, FUS_Z + 30), (-71.5, FUS_Z + 30), (-72.5, FUS_Z + 34), (-63, FUS_Z + 34)], -1.8, 0.6)
    rig.part("plane", g, KM.CREAM, outline=0)
    # W3: the rudder team-dark (the fin in two tones), its hinge under the cream band; panel lines on the fin
    if paper:
        g = Geo().slab([(-64.2, FUS_Z + 7.4), (-68.0, FUS_Z + 7.0), (-73.6, FUS_Z + 40.6), (-70.0, FUS_Z + 39.6)],
                       -1.65, 0.3)
    else:
        g = Geo().slab([(-64.2, FUS_Z + 7.4), (-68.0, FUS_Z + 7.0), (-74.0, FUS_Z + 40.0), (-70.2, FUS_Z + 40.6)],
                       -1.65, 0.3)
    look.team_part(rig, "plane", g)
    fin = Geo().slab(fin_pts, 0.0, 3.0)
    for z in (FUS_Z + 18.0, FUS_Z + 25.0):
        MW.team_line(rig, "plane", fin, [(-56.2 - (z - FUS_Z) * 0.24, z), (-66.0 - (z - FUS_Z) * 0.2, z + 0.4)], 1.3,
                     tone=look.TEAM_DARK)
        fin = Geo().slab(fin_pts, 0.0, 3.0)
    if paper:   # W3 review: a flat paper tailplane swept back to two crisp points
        g = _plate([(-52.0, -5.0), (-59.0, -24.0), (-66.0, -22.5), (-72.0, -9.0), (-72.0, 9.0), (-66.0, 22.5),
                    (-59.0, 24.0), (-52.0, 5.0)], FUS_Z + 4.0, 1.6)
    else:
        g = Geo().blob((-62.0, 0, FUS_Z + 4.0), (10.0, 24.0, 1.6), p=2.8)
    rig.part("plane", g, R.OLIVE_LT, outline=0.7)
    # the dorsal turret bubble with a gunner and a twin MG
    g = Geo().blob(DORSAL, (6.4, 6.4, 5.0), p=2.2)
    g.clip((0, 0, DORSAL[2] - 1.0), (0, 0, -1))
    rig.part("plane", g, R.GLASS, finish="gloss", outline=0.7, outline_hex="#6F8A94")
    g = Geo().lathe([(6.5, -0.5), (6.75, 0), (6.5, 0.5)], (DORSAL[0], 0, DORSAL[2] - 0.2),
                    (DORSAL[0], 0, DORSAL[2] + 0.8), segs=20)       # W3: the bubble's frame ring
    rig.part("plane", g, R.GUNMETAL, finish="metal", outline=0)
    rig.joint("dors", "plane", DORSAL)
    KM.crew_head(rig, "d_head", "dors", (DORSAL[0] - 1.0, 0.0, DORSAL[2] + 1.6), k=0.6, brow=R.HAIR)
    g = Geo()
    for y in (-1.6, 1.6):
        g.capsule((DORSAL[0] + 3.0, y, DORSAL[2] + 1.0), (DORSAL[0] + 15.0, y, DORSAL[2] + 2.4), 0.8)
    rig.part("dors", g, STEEL_DK, finish="metal", outline=0.5)
    # the near waist window with a gunner and his MG
    g = Geo().blob((WAIST[0], WAIST[1] - 0.6, WAIST[2]), (6.0, 1.0, 4.4), p=3.0)
    rig.part("plane", g, "#2B2A2E", outline=0.5)
    rig.joint("waist", "plane", WAIST)
    KM.crew_head(rig, "w_head", "waist", (WAIST[0] - 1.0, WAIST[1] - 2.0, WAIST[2] + 1.6), k=0.6, brow=R.HAIR)
    g = Geo()
    for z in (-0.8, 1.2):
        g.capsule((WAIST[0] + 2.0, WAIST[1] - 3.0, WAIST[2] + z), (WAIST[0] + 14.0, WAIST[1] - 3.0, WAIST[2] + 1.0 + z), 0.8)
    rig.part("waist", g, STEEL_DK, finish="metal", outline=0.5)
    # bomb-bay doors and the stick of bombs
    for side, y in (("dl", -4.0), ("dr", 4.0)):
        rig.joint(side, "plane", (BAY[0], y * 1.8, BAY[2] + 1.0))
        if paper:   # W3 review: flat paper doors
            g = _air(True, (BAY[0], y * 1.8, BAY[2]), (13.0, 3.6, 1.0), p=3.0, cuts=1)
        else:
            g = Geo().blob((BAY[0], y * 1.8, BAY[2]), (13.0, 3.6, 1.0), p=3.0)
        rig.part(side, g, R.OLIVE_LT, finish="gloss", outline=0.5)
    rig.joint("bombs", "plane", BAY, hidden=True)
    g = Geo()
    for k in range(4):
        x = BAY[0] - 9.0 + 6.0 * k
        z = BAY[2] - 3.0 - 4.0 * k
        g.blob((x, 0, z), (3.6, 2.0, 2.0), p=2.2)
    rig.part("bombs", g, "#3E4236", finish="gloss", outline=0.5)
    rig.joint("mz", "plane", (BAY[0], 0.0, BAY[2] - 2.0), hidden=True)
    rig.track("muzzle", "mz", (BAY[0], 0.0, BAY[2] - 2.0))
    # near wing (in front of the fuselage) and the engines (nacelles, team rings, spinners)
    if paper:   # W3 review: a flat paper wing folded once along a diagonal (no painted crease)
        _paper_wing(rig, WING_NEAR, FUS_Z - 7.0, 3.0, (PAPER_LT, PAPER, PAPER_DK), 0.7)
    else:
        g = Geo().blob((12.0, -36.0, FUS_Z - 7.0), (17.0, 36.0, 3.0), p=3.0)
        rig.part("plane", g, R.OLIVE, outline=0.7)
    # W3: the flap's hinge line and access panels on the near wing, worn chips
    if not paper:
        wface = F.Face(rig, "plane", [Geo().blob((12.0, -36.0, FUS_Z - 7.0), (17.0, 36.0, 3.0), p=3.0)])
        g = Geo()
        wface.stroke(g, wface.hit(0.0, FUS_Z - 12.0), [(-1.0, 6.0), (0.0, 0.0), (1.5, -7.0)], 1.0, 0.4)
        for cx, cz in ((6.0, FUS_Z - 9.0), (-4.0, FUS_Z - 15.0)):
            wface.decal(g, wface.hit(cx, cz), [(-2.0, -1.4), (2.0, -1.4), (2.0, 1.4), (-2.0, 1.4)], 0.4)
        rig.part("plane", g, SEAM, highlight=False, outline=0)
        MW.decals(rig, "plane", [Geo().blob((12.0, -36.0, FUS_Z - 7.0), (17.0, 36.0, 3.0), p=3.0)],
                  [((14.0, FUS_Z - 12.0), MW.CHIP_A), ((2.0, FUS_Z - 18.0), MW.CHIP_C)], CHIP)
    if paper:   # a crease down the fin
        MW.team_line(rig, "plane", Geo().slab(PAPER_FIN, 0.0, 3.0), [(-56.0, FUS_Z + 9.0), (-67.0, FUS_Z + 37.0)],
                     1.0, tone=0.7)
    if paper:   # W3 review: the team wing tip folded to a crisp point
        g = _plate([(17.5, -64.0), (1.5, -64.0), (8.0, -74.0)], FUS_Z - 7.0, 3.4)
    else:
        g = Geo().blob((10.0, -70.0, FUS_Z - 7.0), (7.0, 4.0, 3.0), p=3.0)
    rig.part("plane", g, team=True, outline=0.5)                                  # team wing tip
    for ex, ey in ENGINES:
        if paper:   # W3 review: six-sided paper nacelles, team rings and pointed spinners
            g = _flat(Geo().lathe([(0, 0), (7.6, 0.6), (8.4, 6.0), (6.4, 15.0), (2.4, 20.0)], (ex + 10.0, ey, ENG_Z),
                                  (ex - 10.0, ey, ENG_Z), segs=6, rot=(0, 0, 30)))
        else:
            g = Geo().lathe([(0, 0), (7.6, 0.6), (8.4, 6.0), (6.4, 15.0), (2.4, 20.0)], (ex + 10.0, ey, ENG_Z),
                            (ex - 10.0, ey, ENG_Z), segs=18)
        rig.part("plane", g, R.OLIVE, finish="gloss", outline=0.6)
        # W3: the cowl flaps' dark band behind the ring, an exhaust stub under the nacelle
        if not paper:
            g = Geo().lathe([(8.25, -1.0), (8.5, 0), (8.25, 1.0)], (ex + 3.0, ey, ENG_Z), (ex + 4.0, ey, ENG_Z),
                            segs=18)
            rig.part("plane", g, SEAM, outline=0)
        g = Geo().capsule((ex - 2.0, ey - 3.0, ENG_Z - 6.6), (ex - 8.0, ey - 3.4, ENG_Z - 7.2), 1.2)
        rig.part("plane", g, R.GUNMETAL, finish="metal", outline=0.4)
        if paper:
            g = _flat(Geo().lathe([(8.6, -1.2), (8.9, 0), (8.6, 1.2)], (ex + 9.0, ey, ENG_Z), (ex + 10.5, ey, ENG_Z),
                                  segs=6, rot=(0, 0, 30)))
        else:
            g = Geo().lathe([(8.5, -1.2), (8.8, 0), (8.5, 1.2)], (ex + 9.0, ey, ENG_Z), (ex + 10.5, ey, ENG_Z),
                            segs=18)
        rig.part("plane", g, team=True, outline=0.4)
        if paper:
            g = _flat(Geo().lathe([(2.6, 0), (1.6, 2.4), (0, 4.4)], (ex + 10.5, ey, ENG_Z), (ex + 14.4, ey, ENG_Z),
                                  segs=4, rot=(0, 0, 45)))
        else:
            g = Geo().lathe([(2.4, 0), (1.8, 2.0), (0, 3.4)], (ex + 10.5, ey, ENG_Z), (ex + 14.0, ey, ENG_Z), segs=12)
        rig.part("plane", g, R.SIGNAL, outline=0.4)
    for k in range(BLUR):
        name = f"blur{k}"
        rig.joint(name, "plane", (0, 0, FUS_Z), hidden=True)
        g = Geo()
        for ex, ey in ENGINES:
            px, py, pz = ex + 11.0, ey, ENG_Z
            for j in range(3):
                if j == k:
                    continue
                a0 = math.radians(120 * j + 20 * k)
                pts = [(px, py + PROP_R * 0.9 * math.cos(a0 + t * 0.5), pz + PROP_R * 0.9 * math.sin(a0 + t * 0.5))
                       for t in range(4)]
                for a, b in zip(pts, pts[1:]):
                    g.capsule(a, b, 1.1, segs=6, rings=2)
        rig.part(name, g, R.KHAKI_LT, highlight=False, outline=0)
    for k in range(PHASES):
        name = f"blade{k}"
        rig.joint(name, "plane", (0, 0, FUS_Z), hidden=True)
        g = Geo()
        for ex, ey in ENGINES:
            px, py, pz = ex + 11.0, ey, ENG_Z
            for j in range(3):
                b = math.radians(40.0 * k + 120.0 * j)
                c = PROP_R * 0.55
                g.blob((px + 0.4, py + c * math.cos(b), pz + c * math.sin(b)), (0.7, 1.2 + abs(math.cos(b)), PROP_R * 0.45),
                       p=2.6, rot=(math.degrees(b) - 90.0, 0, 0))
        rig.part(name, g, R.GUNMETAL, outline=0.5)
    rig.joint("smoke", "plane", (12.0, -30.0, FUS_Z + 2.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 7.0), (-9, 3, 6.0), (-5, 10, 5.4), (6, 7, 5.0), (-16, 1, 4.6), (-23, 7, 4.0)):
        g.sphere((12.0 + dx, -30.0, FUS_Z + 2.0 + dz), r, cuts=4)
    rig.part("smoke", g, R.SMOKE_DK, finish="dust", outline=0.8)
    rig.track("_foot", "odo", (0, 0, 0))
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry (COMMON C1)
        _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40; art/blender/README.md), measured in posed frames: dents and holes on the team
    fuselage behind the waist window and ahead of the chevron (the largest surfaces, always in view), on the olive
    belly and on the fin; a flyer trails smoke from its engines (the inner one first, then the outer)."""
    rig.damage_spot_at("aft", "plane", -40.0, FUS_Z + 8.0, 8.0, "metal", team=True)
    rig.damage_spot_at("fwd", "plane", 24.0, FUS_Z + 4.0, 7.0, "metal", team=True)
    rig.damage_spot_at("belly", "plane", -20.0, FUS_Z - 7.0, 7.0, "metal", fill=R.OLIVE)
    rig.damage_spot_at("fin", "plane", -64.0, FUS_Z + 20.0, 6.0, "metal", team=True)
    ex, ey = ENGINES[0]
    rig.damage_spot("engine", "plane", (ex - 4.0, ey, ENG_Z + 7.4), 6.0, "smoke", kind="emit", normal=(0, 0, 1))
    ex, ey = ENGINES[1]
    rig.damage_spot("engine2", "plane", (ex - 4.0, ey, ENG_Z + 7.4), 5.0, "smoke", kind="emit", normal=(0, 0, 1))


def _prop(step, slow=1, blur=True):
    pose = {f"blade{(step // slow) % PHASES}": {"show": True}}
    if blur:
        pose[f"blur{(step // slow) % BLUR}"] = {"show": True}
    return pose


def _body(x=0.0, z=0.0, r=0.0, rx=0.0, rz=0.0, q=0.0):
    return {"body": dict(M.body_about((0, 0, FUS_Z), x=x, z=z, r=r, rx=rx, rz=rz, q=q)["body"])}


def _doors(open_):
    return {"dl": {"rx": 70.0 * open_}, "dr": {"rx": -70.0 * open_}}


def _idle(f):
    b = math.sin(2 * math.pi * f / 4)
    c = math.cos(2 * math.pi * f / 4)
    pose = merge(_prop(f), _body(z=1.2 * b, r=1.0 * c, rx=1.2 * b), {
        "w_head": {"rz": [0, 20, 0, -20][f]}, "dors": {"rz": [0, 10, 20, 10][f]}})
    if f == 2:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    return merge(_prop(f), _body(z=0.8 * math.sin(p), r=-4.0 + 0.8 * math.sin(p + 1.0)), {
        "odo": {"x": 6.25 * math.cos(p)},     # stride 25 lu per 0.5 s = 50 lu/s (ground speed)
        "w_head": {"r": 2.0 * math.sin(p - 1.0)},
    })


# 9 unique frames in 840 ms; the stick drops on frame 4 at 400 ms (impactAt 0.4762)
ATTACK_MS = [80, 100, 160, 60, 60, 100, 100, 100, 80]
ATTACK_IMPACT = 4
#        doors open  HOLD  wob   DROP  fall  fall2 shut  settle
A_DOOR = [0.3, 0.8, 1.0, 1.0, 1.0, 1.0, 0.8, 0.3, 0.0]
A_Z = [0.0, -0.5, -1.0, -1.2, -0.8, 1.5, 3.0, 2.0, 0.5]
A_R = [-1.0, -2.0, -3.0, -3.2, -2.0, 1.5, 2.5, 1.0, 0.0]


def _attack(i):
    pose = merge(_prop(i), _doors(A_DOOR[i]), _body(z=A_Z[i], r=A_R[i], q=[0, 0, -0.02, -0.01, 0.02, 0.03, 0.01, 0, 0][i]))
    if 4 <= i <= 6:
        pose["bombs"] = {"show": True, "z": [0, 0, 0, 0, 0.0, -10.0, -22.0, 0, 0][i], "x": [0, 0, 0, 0, 0, -3, -7, 0, 0][i]}
    if i in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze"))
    return pose


def _ov():
    return {4: [{"kind": "burst", "joint": "plane", "point": (BAY[0], 0.0, BAY[2] - 6.0), "r0_lu": 8.0, "r1_lu": 14.0,
                 "n": 6, "a0": 200.0, "arc": 140.0, "color": "#FFF4D6"}]}


def _attack_clip():
    return M.clip("attack", [_attack(i) for i in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=_ov(),
                  extra={"holdStep": 2, "holdLoop": [2, 3]})


B_RX = [-10.0, -22.0, -24.0, -22.0, -14.0, -6.0, -2.0]


def _b_pose(i):
    if i in (0, 8):
        return _attack(i)
    k = i - 1
    pose = merge(_prop(i), _doors(A_DOOR[i]), _body(z=A_Z[i], r=A_R[i] - 2.0, rx=B_RX[k]))
    if 4 <= i <= 6:
        pose["bombs"] = {"show": True, "z": [0, 0, 0, 0, 0.0, -10.0, -22.0, 0, 0][i], "x": [0, 0, 0, 0, 0, -3, -7, 0, 0][i]}
    if i in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze"))
    return pose


def _attack_b():
    return M.clip("attack_b", [_b_pose(i) for i in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=_ov(),
                  reuse={0: ("attack", 0), 8: ("attack", 8)}, extra={"holdStep": 2, "holdLoop": [2, 3]})


# attack_alt: the gunners' own sim attack (12 every 0.4 s); the bomber holds idle pose 0. 4 frames, 250 ms,
# the burst on frame 1 at 50 ms; the muzzle moves to the waist gun.
ALT_MS = [50, 60, 70, 70]
MZ_OFF = (ALT_MUZ[0] - BAY[0], ALT_MUZ[1], ALT_MUZ[2] - (BAY[2] - 2.0))


# W3 (item 44): the waist gun aimed down at the ground row (`attack_alt_down`): a turn pitches the gun about its
# mount, the muzzle helper (`mz`, whose +X the aim data reads) pitches with it and follows the muzzle, and the
# gunner's head tips down along the gun.
ALT_W = [0.85, 1.0, 1.0, 0.9]


def _alt(i, turn=0.0):
    c, s = math.cos(math.radians(turn)), math.sin(math.radians(turn))
    mx, mz = ALT_MUZ[0] - WAIST[0], ALT_MUZ[2] - WAIST[2]
    muz = (WAIST[0] + mx * c - mz * s, ALT_MUZ[1], WAIST[2] + mx * s + mz * c)
    pose = merge(_idle(0), {
        "mz": {"x": muz[0] - BAY[0], "y": muz[1], "z": muz[2] - (BAY[2] - 2.0), "r": turn},
        "waist": {"rz": [-6, -4, -5, -6][i], "x": [0, -0.8, -0.3, 0][i], "r": turn},
        "dors": {"rz": [-10, -8, -9, -10][i], "x": [0, -0.6, -0.2, 0][i]},
    })
    if turn:
        pose["w_head"] = {"r": 0.45 * turn}
    return merge(pose, F.expr("squeeze")) if i in (1, 2) else pose


def _attack_alt():
    ov = {1: [{"kind": "burst", "joint": "waist", "point": (ALT_MUZ[0] + 1.0, ALT_MUZ[1], ALT_MUZ[2]), "r0_lu": 4.0,
               "r1_lu": 8.0, "n": 5, "a0": -50.0, "arc": 100.0},
              {"kind": "burst", "joint": "dors", "point": (DORSAL[0] + 16.0, 0.0, DORSAL[2] + 2.4), "r0_lu": 4.0,
               "r1_lu": 8.0, "n": 5, "a0": -50.0, "arc": 100.0}]}
    return M.clip("attack_alt", [_alt(i) for i in range(4)], ALT_MS, impact=1, overlays=ov)


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(_prop(k), _body(x=-2.0 * max(a, 0), z=-4.0 * max(a, 0) + 1.5 * min(a, 0), r=6 * a, rx=4 * a,
                                 q=[-0.05, -0.03, 0.02, -0.01, 0][k]), {"w_head": {"r": 8 * a}})
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


D_R = [-6, -12, -20, -30, -40, -48, -44, -46, -46, -46]
D_RZ = [0, 6, -8, 10, -6, 4, 0, 0, 0, 0]
D_RX = [0, 10, -14, 18, -10, 6, 0, 0, 0, 0]
D_Z = [2, 0, -4, -9, -15, -20, -17, -19, -19, -19]
D_X = [-2, -4, -5, -6, -7, -8, -8, -8, -8, -8]
D_Q = [0.03, 0, 0, 0, 0, -0.12, 0.05, -0.05, -0.03, -0.06]


def _die(k):
    pose = merge(_prop(k, slow=2 if k > 3 else 1, blur=k < 4),
                 _body(x=D_X[k], z=D_Z[k], r=D_R[k], rz=D_RZ[k], rx=D_RX[k], q=D_Q[k]), {
        "smoke": {"show": True, "s": [0.7, 0.85, 0.95, 1.0, 1.05, 1.1, 1.1, 1.15, 1.15, 1.2][k],
                  "x": [0, -1, -2, -3, -4, -5, -6, -7, -8, -9][k]},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 5:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 1.4}})
    else:
        pose = merge(pose, F.expr("spiral", "tongue"))
    return pose


def clips():
    alt = _attack_alt()
    aimed = AIMED.variants(RIG, alt, lambda u, t: _alt(u, turn=t), ALT_W, aims=("down",))
    cl = [
        M.clip("idle", [_idle(f) for f in range(4)], [100, 100, 100, 100], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        _attack_b(),
        alt,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ] + aimed
    for v in aimed:
        AIMED.check_timing(alt, v)
    by = {c.name: c for c in cl}
    assert by["hit"].total_ms() == 310 and by["die"].total_ms() == 695
    return M.check_contract([by["attack"]], attack_ms=840, attack_impact_at=0.4762) and M.check_variants(cl)
