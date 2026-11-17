"""Art round W4 (Track FUTCOS): small detail helpers shared by the Future and Cosmic troops' scripts.

Not a unit (it is not in render_all.AGE_OF). The Future and Cosmic troops opt into the detail standard
(`ageborn_art/look.py`, art/blender/README.md "Detail standard") with the pilot's recipe and the W1-W3 lessons. The
conforming decals, seams, folds, panels, rivets and two-tone smears come from W3's `units/industrial_w3.py` (and through
it W2's `medieval_w2.py` and W1's `stone_w1.py`); this module adds what the Future and Cosmic kits need:

  panel_lines()  dark panel lines laid on armour plates (conforming ribbons): the plates' value structure at 1x
  wear()         edge wear on plates: small conforming chips in a tone off the plate's (lighter on dark plates, a grey
                 on the white armour), never on faces
  glow_seam()    an emissive seam (a narrow conforming glow ribbon): Future's light lines. Glows are never lifted, so
                 keep them small (the colour rule counts them)
  kinds_future() the Future palette's material kinds: the glossy white armour as ceramic, the trims and gunmetal as
                 iron, the charcoal suit as cloth, the visors as glass (glows take none)

Every number is in lu at rest, character space (x forward, y away from the camera, z up); decal points are screen
lu as Face.hit takes them.
"""
import math

from ageborn_art import face as F
from ageborn_art import look
from ageborn_art import rigs_future as RF
from ageborn_art.geometry import Geo
from units import industrial_w3 as IW
from units import medieval_w2 as MW

# the W1-W3 helpers the W4 scripts use as they are (the conforming decals below: field, ribbon, folds, panel, rivets
# are W2's and W3's with the misses dropped)
kinds = IW.kinds
skin_palette = IW.skin_palette
seam = IW.seam
plate_band = IW.plate_band
piping = IW.piping
rivet_line = IW.rivet_line
soot = IW.soot
stitches = IW.stitches
patch = IW.patch
team_dark = IW.team_dark
smear_two_tone = IW.smear_two_tone

SHADE_SOLDIER = IW.SHADE_SOLDIER
RIM_SOLDIER = IW.RIM_SOLDIER
HIGHLIGHT_SOLDIER = IW.HIGHLIGHT_SOLDIER
SHADE_BEAST = IW.SHADE_BEAST
RIM_BEAST = IW.RIM_BEAST
SHADE_BIG = IW.SHADE_BIG

# the Future kit's plate tones (rigs_future): the panel lines on the white armour are a cool light grey, about 36 levels
# under the white (#9AA2AE, 80 under, made the white beside every line count as highlight: a line 1.5 px wide pulls
# the 5 x 5 mean down past the 28-level rule); wear on the white shows the grey primer
LINE_ON_WHITE = "#AAB1BC"
# the white armour itself two steps under rigs_future.ARMOR (#E9EDF2): with the lifts' dark internal lines between
# the plates, the near-pure white rang every plate with highlight (the Photon Knight's share 0.108 at #E9EDF2, 0.101 at
# #DCE1E8, 0.097 here; the gloss, the top light and the core shadow moved it 0.001 at most); a cool off-white keeps the
# read and the gloss (W4 units pass it to the kit's armour and glove parameters)
ARMOR = "#D2D8E0"
# a softer cel shadow and core for the white-armoured soldiers (the white's lit-to-shadow step is the widest value step
# on the unit): the soldiers' look otherwise
SHADE_WHITE = dict(IW.SHADE_SOLDIER, shadow=0.90, core=0.06)
WEAR_ON_WHITE = "#C3CAD3"
LINE_ON_SUIT = "#1F2229"
WEAR_ON_SUIT = "#565D6B"
# creases on the charcoal suit: about 20 levels over it (WEAR_ON_SUIT's 42 counted every crease as highlight)
FOLD_ON_SUIT = "#41464F"
FOLD_ON_SUIT_LT = "#535A67"     # the same on rigs_future.SUIT_LT (cowls, light suits)
# the wave kits (kit_future_wave.trooper, the legs and arms kits) build their plates in rigs_future.ARMOR: a unit built
# on them sets SKIN_PALETTE = KIT_WHITE (look.remap, with the far leg's shaded copy) to get the W4 off-white
KIT_WHITE = skin_palette({RF.ARMOR: ARMOR})
# the rank-and-file troopers' white, a step greyer (the Pulse Trooper's: white legs, gloves and faceplates on the
# charcoal suit held their highlight share over 0.10) and their guns' light grey (a long white barrel's lit edge
# rang the highlight share)
TROOPER_WHITE = "#CBD1DA"
KIT_TROOPER = skin_palette({RF.ARMOR: TROOPER_WHITE})
GUN_LT, GUN_SEAM = "#B4BBC6", "#8A929F"


# -- conforming decals that never leave their face (r31g) -------------------------------------------------------------
# face.Face.hit returns the point on the y = 0 plane where its camera ray misses the face. W2's ribbon and field cast
# every vertex, so a line drawn past a part's edge (or a cap or a side of it) put vertices on that plane: a sliver past
# the silhouette at rest, and a rod when the joint turned or twisted, the longer the further the part sits off the body
# plane (the Asteroid Golem's fists, 24 lu off it, grew rods 5-10 lu long). These drop what misses: a line keeps its
# runs that stay on the face (with its width and round caps), a chip or rivet that misses is left out. A decal that
# lies wholly on its face is built exactly as W2's.
def _hits(face, x, z):
    from mathutils import Vector
    return (face.hit(x, z) - Vector((x, 0.0, z))).length > 1e-9


def _ribbon_points(pts, w, step):
    """W2's ribbon samples of the line pts (centre and both sides) and its two round caps."""
    path = []
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        k = max(1, math.ceil(math.dist((x0, z0), (x1, z1)) / step))
        path += [(x0 + (x1 - x0) * t / k, z0 + (z1 - z0) * t / k) for t in range(k)]
    path.append(tuple(pts[-1]))
    out = []
    for t, (x, z) in enumerate(path):
        a, b = path[max(t - 1, 0)], path[min(t + 1, len(path) - 1)]
        L = math.dist(a, b) or 1.0
        nx, nz = -(b[1] - a[1]) / L * w / 2, (b[0] - a[0]) / L * w / 2
        out += [(x - nx, z - nz), (x, z), (x + nx, z + nz)]
    for x, z in (pts[0], pts[-1]):
        out += F.ellipse(x, z, w / 2, w / 2, 10)
    return path, out


DROPPED = []        # (joint, line) of every decal line cut or chip left out (bin/decalmiss.py reports them)


def on_face(face, pts, w, step=0.25):
    """The parts of the line pts [(x, z)] (screen lu) that stay on `face` with their width w: a list of polylines."""
    pts = [tuple(p) for p in pts]
    if len(pts) < 2:
        return []
    _, samples = _ribbon_points(pts, w, MW.STEP)
    if all(_hits(face, x, z) for x, z in samples):
        return [pts]
    rec = [face.head, [tuple(round(v, 1) for v in p) for p in pts], 0.0]
    DROPPED.append(rec)
    path, _ = _ribbon_points(pts, w, step)
    ok = []
    for t, (x, z) in enumerate(path):
        a, b = path[max(t - 1, 0)], path[min(t + 1, len(path) - 1)]
        L = math.dist(a, b) or 1.0
        ux, uz = (b[0] - a[0]) / L * w / 2, (b[1] - a[1]) / L * w / 2
        ok.append(all(_hits(face, x + dx, z + dz) for dx, dz in ((0.0, 0.0), (-uz, ux), (uz, -ux), (ux, uz), (-ux, -uz))))
    runs, cur = [], []
    for p, k in zip(path, ok):
        if k:
            cur.append(p)
            continue
        runs.append(cur)
        cur = []
    runs.append(cur)
    out = []
    for run in runs:
        # trim an end whose round cap still leaves the face
        while len(run) >= 2 and not all(_hits(face, x, z) for x, z in F.ellipse(*run[0], w / 2, w / 2, 10)):
            run = run[1:]
        while len(run) >= 2 and not all(_hits(face, x, z) for x, z in F.ellipse(*run[-1], w / 2, w / 2, 10)):
            run = run[:-1]
        if len(run) >= 2 and math.dist(run[0], run[-1]) >= w:
            out.append(run)
    total = sum(math.dist(a, b) for a, b in zip(path, path[1:])) or 1.0
    rec[2] = round(sum(math.dist(a, b) for r in out for a, b in zip(r, r[1:])) / total, 2)
    return out


def ribbon(g, face, pts, w, depth=0.35, step=MW.STEP):
    """W2's ribbon (a conforming line of width w along pts), cut to the runs that stay on `face`."""
    for run in on_face(face, pts, w):
        MW.ribbon(g, face, run, w, depth, step)
    return g


def field(g, face, pts, depth=0.35, step=MW.STEP):
    """W2's field (a conforming decal over the convex polygon pts), left out when any of its corners misses `face`."""
    cx, cz = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
    if all(_hits(face, x, z) for x, z in list(pts) + [(cx, cz)]):
        MW.field(g, face, pts, depth, step)
    else:
        DROPPED.append((face.head, [(round(cx, 1), round(cz, 1))]))
    return g


def _empty(g):
    return len(g.bm.verts) == 0


def folds(rig, joint, face, lines, w=1.3, team=True, fill=None, depth=0.3):
    """W2's folds (pleat lines; team-dark on team cloth) with the safe ribbon."""
    g = Geo()
    for pts in lines:
        ribbon(g, face, pts, w, depth)
    if _empty(g):
        return None
    if team:
        return look.team_part(rig, joint, g, outline=0)
    return rig.part(joint, g, fill, outline=0, highlight=False)


def panel(rig, joint, face, pts, depth=0.35, team=True, fill=None):
    """W2's panel (a conforming heraldic field; team-dark or `fill`) with the safe field."""
    g = field(Geo(), face, pts, depth)
    if _empty(g):
        return g
    if team:
        look.team_part(rig, joint, g, outline=0)
    else:
        rig.part(joint, g, fill, outline=0, highlight=False)
    return g


def rivets(rig, joint, face, pts, r=1.1, fill="#9AA0A8", proud=0.5, outline=0.3, finish="metal"):
    """W3's rivets (domes set onto `face`), the ones whose screen point misses `face` left out."""
    keep = [(x, z) for x, z in pts if _hits(face, x, z)]
    if len(keep) < len(pts):
        DROPPED.append((face.head, [p for p in pts if p not in keep]))
    if not keep:
        return None
    return IW.rivets(rig, joint, face, keep, r=r, fill=fill, proud=proud, outline=outline, finish=finish)


def panel_lines(rig, joint, face, lines, fill=LINE_ON_WHITE, w=0.7, depth=0.35):
    """Panel lines: lines = [[(x, z), ...], ...] in screen lu, conforming ribbons in a tone darker than the plate (the
    plates' value structure at game scale; a seam every 6-12 lu reads as plating, not as texture)."""
    g = Geo()
    for pts in lines:
        ribbon(g, face, pts, w, depth)
    if _empty(g):
        return None
    return rig.part(joint, g, fill, outline=0, highlight=False)


def wear(rig, joint, face, chips, fill=WEAR_ON_WHITE, depth=0.3):
    """Edge wear: chips = [(x, z, rx, rz), ...] in screen lu, conforming ellipses (the plate's corners and edges, where
    a soldier's kit scuffs)."""
    g = Geo()
    for x, z, rx, rz in chips:
        field(g, face, F.ellipse(x, z, rx, rz, 12), depth)
    if _empty(g):
        return None
    return rig.part(joint, g, fill, outline=0, highlight=False)


def glow_seam(rig, joint, face, pts, color=RF.MINT, w=0.6, depth=0.4):
    """An emissive seam along pts [(x, z)] (screen lu): a narrow conforming glow ribbon (Future's light lines)."""
    g = ribbon(Geo(), face, pts, w, depth)
    if _empty(g):
        return None
    return rig.part(joint, g, glow=color, outline=0)


def pack(rig, k=1.0, cell_r=1.15):
    """rigs_future.torso_armor's backpack (call it with pack=False), with slimmer mint cells: the kit's 1.7 lu cells
    held about 0.008 of the highlight share on every frame (a thin glow on charcoal is highlight all through)."""
    g = Geo().blob((-11.0 * k, 0, 31), (4.4, 8.2, 8.6), p=4.0)
    rig.part("torso", g, RF.SUIT)
    g = Geo().capsule((-15.2 * k, -4.5, 27.0), (-15.2 * k, -4.5, 35.0), cell_r)
    g.capsule((-15.2 * k, 1.5, 27.0), (-15.2 * k, 1.5, 35.0), cell_r)
    rig.part("torso", g, glow=RF.MINT, outline=1.0, outline_hex=RF.SUIT)


def fx(rig, skins, hex_):
    """An overlay colour (smear, burst, ring) through the rendered skin's palette: the 2D overlays take no palette of
    their own, so a skin's recoloured blade or glow keeps its own colour in the smears."""
    skin = getattr(rig, "skin", None)
    if not skin:
        return hex_
    return skins.get(skin, {}).get("palette", {}).get(hex_.upper(), hex_)


def wave_pack(rig, bulk=1.0, cell_r=0.95):
    """kit_future_wave.trooper's backpack and its team band (call the trooper with pack=False), with slimmer mint
    cells (`pack`). Not for melee troopers: the slim cells bare the band's back edge, which moves the lunge proxy."""
    pack(rig, k=bulk, cell_r=cell_r)
    g = Geo().blob((-11.4 * bulk, 0, 36.6), (4.8, 8.8, 2.2), p=3.4)
    rig.part("torso", g, team=True, outline=0.6)


def strip(rig, r=0.65):
    """kit_future_wave.trooper's mint light strip over the near shoulder pad, slimmer (call the trooper with
    strip=False): the kit's r 0.8 strip was highlight all through."""
    from ageborn_art import kit_future as KF
    KF.strip(rig, "arm_r", [(-4.0, -18.0, 38.0), (0.6, -18.4, 39.4), (5.2, -17.8, 38.0)], r=r)


def wave_trooper(rig, helmet_kind="dome", bulk=1.0, team_greave=False, team_thigh=False, team_sleeve=False,
                 hips=True, shoulders=True, far_shoulder=True, helmet_team=True):
    """The W4 detail on kit_future_wave.trooper's body (call it after the trooper, with the same arguments): the
    helmet's seams, bands and wear per kind; the team chest plate in two plates with two vents, the gorget's seam;
    the faulds in three chipped plates; the shoulder pads' team-dark rims, the bracers' cuff seams, elbow creases;
    knee creases, the greaves' team-dark rims, the boots' seams and a scuffed toe (char space; decals cast).
    helmet_team=False draws the dome's two bands as seams: a melee unit's team box must not grow forward at the visor
    (the lunge proxy, atlasCombat.lungeCurve, is the team box centre against the idle mean)."""
    from ageborn_art import kit_medieval as KM
    from ageborn_art import face as FC_
    k = bulk
    if helmet_kind == "dome":
        hb = {"team": True} if helmet_team else {"fill": LINE_ON_WHITE}
        band(rig, "head", (2, 0, 52.1), (11.75, 11.35, 11.95), 2.5, 48.7, 49.5, **hb)
        band(rig, "head", (2, 0, 52.1), (11.75, 11.35, 11.95), 2.5, 55.4, 56.1, **hb)
        band(rig, "head", (0, 0, 43.2), (7.5, 7.5, 3.2), 2.4, 42.0, 42.7, fill=LINE_ON_WHITE)
        hf = FC_.Face(rig, "head", [Geo().blob((2, 0, 52), (11.4, 11.0, 11.6), p=2.5)])
        panel_lines(rig, "head", hf, [[sc(hf, -8.0, 47.6, -9.6), sc(hf, -1.0, 46.0, -11.0), sc(hf, 5.0, 46.4, -10.4)]],
                    w=0.75)
        wear(rig, "head", hf, [(*sc(hf, -8.8, 45.0, -8.4), 1.3, 0.7), (*sc(hf, 6.0, 45.2, -9.6), 1.1, 0.6)])
    elif helmet_kind == "android":
        band(rig, "head", (3.0, 0, 41.5), (6.0, 6.4, 3.4), 2.4, 42.4, 43.1, fill=LINE_ON_WHITE)
        hf = FC_.Face(rig, "head", [Geo().blob((2.0, 0, 50.5), (11.0, 10.4, 12.4), p=2.3)])
        panel_lines(rig, "head", hf, [[sc(hf, -6.4, 58.0, -7.6), sc(hf, -8.6, 51.0, -8.2), sc(hf, -6.8, 44.6, -7.8)]],
                    w=0.75)
        wear(rig, "head", hf, [(*sc(hf, -5.6, 59.6, -6.6), 1.2, 0.6), (*sc(hf, -7.6, 45.6, -6.8), 1.0, 0.5)])
    elif helmet_kind == "hardhat":
        band(rig, "head", (1.0, 0, 55.4), (11.6, 11.2, 7.6), 2.4, 58.4, 59.1, team=True)
        band(rig, "head", (1, 0, 42.6), (7.2, 7.2, 3.0), 2.4, 41.6, 42.3, fill=LINE_ON_WHITE)
        hf = FC_.Face(rig, "head", [Geo().blob((2, 0, 49.5), (10.6, 10.2, 10.6), p=2.4)])
        panel_lines(rig, "head", hf, [[sc(hf, -7.4, 51.6, -8.0), sc(hf, -2.0, 47.0, -9.8), sc(hf, 4.0, 46.0, -9.2)]],
                    w=0.75)
        wear(rig, "head", hf, [(*sc(hf, -8.0, 45.4, -7.4), 1.2, 0.6)])
    elif helmet_kind == "hood":
        hf = FC_.Face(rig, "head", [Geo().blob((1.5, 0, 50.0), (11.2, 10.8, 11.4), p=2.2)])
        folds(rig, "head", hf, [[sc(hf, -7.0, 50.0, -8.0), sc(hf, -4.0, 45.4, -9.4), sc(hf, 1.0, 43.2, -9.6)],
                                [sc(hf, -9.2, 46.0, -6.0), sc(hf, -6.0, 42.4, -7.6)]], w=0.8, team=False,
              fill=FOLD_ON_SUIT_LT)
    # the team chest plate in two plates (team-dark) with two vents; the gorget's seam
    cf = FC_.Face(rig, "torso", [Geo().blob((1.8, 0, 32.0), (9.8 * k, 10.6 * k, 7.6), p=3.0, taper=(0.9, 1.0))])
    yy = -10.4 * k
    folds(rig, "torso", cf, [[sc(cf, -6.0 * k, 27.6, yy), sc(cf, 3.0 * k, 27.4, yy), sc(cf, 10.0 * k, 28.2, -9.0 * k)],
                             [sc(cf, -3.0 * k, 37.6, yy), sc(cf, -3.4 * k, 28.0, yy)]], w=0.8, team=True)
    folds(rig, "torso", cf, [[sc(cf, 3.2 * k, 29.6, yy), sc(cf, 6.4 * k, 29.6, yy)],
                             [sc(cf, 3.2 * k, 31.2, yy), sc(cf, 6.4 * k, 31.2, yy)]], w=0.6, team=True)
    band(rig, "torso", (1.0, 0, 39.0), (7.6, 7.8, 1.8), 2.6, 37.8, 38.5, fill=LINE_ON_WHITE)
    if hips:
        ff = FC_.Face(rig, "hips", [Geo().blob((0.6, 0, 16.6), (10.4, 10.2, 4.0), p=2.8, taper=(1.1, 1.0))])
        panel_lines(rig, "hips", ff, [[sc(ff, -3.6, 19.8, -10.2), sc(ff, -4.0, 13.4, -10.2)],
                                      [sc(ff, 3.4, 19.8, -10.2), sc(ff, 3.8, 13.4, -10.2)]], w=0.7)
        wear(rig, "hips", ff, [(*sc(ff, -7.0, 13.8, -9.0), 1.4, 0.6), (*sc(ff, 0.0, 13.6, -10.2), 1.2, 0.5),
                               (*sc(ff, 7.2, 14.0, -8.0), 1.0, 0.5)])
    for s in ("r", "l"):
        y = RF.ARM_Y[s]
        if shoulders and (s == "r" or far_shoulder):
            band(rig, f"arm_{s}", (0.5, y - 0.3 * RF.SIDE_Y[s], 37.6), (6.8, 5.8, 5.4), 2.6, 33.6, 34.4, team=True)
        band(rig, f"fore_{s}", (0.3, y, RF.HAND_Z + 4.2), (4.9, 4.8, 3.6), 2.8, 26.0, 26.7, fill=LINE_ON_WHITE,
             taper=(0.9, 1.1))
        sleeve = FC_.Face(rig, f"arm_{s}", [Geo().capsule((0, y, RF.SHOULDER_Z), (0, y, RF.ELBOW_Z), 4.1, 3.8)])
        folds(rig, f"arm_{s}", sleeve, [[sc(sleeve, -2.6, 30.6, y - 3.8), sc(sleeve, 0.2, 29.8, y - 4.0),
                                         sc(sleeve, 2.8, 30.8, y - 3.8)]], w=0.8, team=team_sleeve,
              fill=None if team_sleeve else FOLD_ON_SUIT)
    for s in ("r", "l"):
        y = RF.LEG_Y * RF.SIDE_Y[s]
        th = FC_.Face(rig, f"thigh_{s}", [Geo().capsule((0, y, KM.V3_THIGH_Z + 0.5), (0.5, y, KM.V3_KNEE_Z), 4.6, 4.1)])
        tt = team_thigh and s == "r"
        folds(rig, f"thigh_{s}", th, [[sc(th, -2.4, 14.4, y - 4.4), sc(th, 0.4, 13.6, y - 4.6),
                                       sc(th, 3.0, 14.6, y - 4.2)]], w=0.8, team=tt, fill=None if tt else FOLD_ON_SUIT)
        if team_greave:
            band(rig, f"shin_{s}", (1.9, y, 8.6), (3.4, 4.2, 2.6), 2.6, 6.4, 7.1, team=True)
        band(rig, f"foot_{s}", (2.8, y, 2.4), (4.4, 4.7, 2.5), 2.9, 3.0, 3.6, fill=LINE_ON_WHITE, taper=(1.02, 0.84))
    tf = FC_.Face(rig, "foot_r", [Geo().blob((2.8, -RF.LEG_Y, 2.4), (4.4, 4.7, 2.5), p=2.9, taper=(1.02, 0.84))])
    wear(rig, "foot_r", tf, [(*sc(tf, 6.2, 2.0, -RF.LEG_Y - 3.0), 1.2, 0.6)])


# the Cosmic kit's tones (rigs_cosmic): a seam and wear on the violet plates, a crease on the void suit, a seam on the
# star-white plates
LINE_ON_VIOLET = "#5A2A86"
WEAR_ON_VIOLET = "#B48BDC"
FOLD_ON_VOID = "#3C2F59"
LINE_ON_STAR = "#ADA5C8"


def cosmic_helmet(rig, kind="dome"):
    """The W4 detail on kit_cosmic_wave.helmet / hood (call it after the helmet, with its kind): the dome's seam over
    the crown behind the visor with chipped edges; the crown cap's seam; the cowl's folds."""
    from ageborn_art import face as FC_
    if kind == "dome":
        hf = FC_.Face(rig, "head", [Geo().blob((2.0, 0, 51.0), (11.6, 11.0, 11.8), p=2.4)])
        panel_lines(rig, "head", hf, [[sc(hf, -5.6, 60.2, -7.4), sc(hf, -8.6, 52.6, -8.8), sc(hf, -6.8, 46.0, -8.4)]],
                    fill=LINE_ON_VIOLET, w=0.75)
        wear(rig, "head", hf, [(*sc(hf, -9.4, 47.4, -7.2), 1.2, 0.6), (*sc(hf, -1.0, 61.6, -6.8), 1.1, 0.5)],
             fill=WEAR_ON_VIOLET)
    elif kind == "crown":
        hf = FC_.Face(rig, "head", [Geo().blob((1.5, 0, 50.5), (11.0, 10.6, 11.2), p=2.3)])
        folds(rig, "head", hf, [[sc(hf, -6.4, 57.6, -7.6), sc(hf, -8.4, 51.0, -8.4), sc(hf, -6.8, 45.0, -8.0)]], w=0.8,
              team=False, fill=FOLD_ON_VOID)
    elif kind == "hood":
        hf = FC_.Face(rig, "head", [Geo().blob((0.5, 0, 50.0), (12.4, 11.6, 12.6), p=2.4)])
        folds(rig, "head", hf, [[sc(hf, -4.0, 59.0, -8.4), sc(hf, -7.0, 52.0, -10.2), sc(hf, -6.4, 44.6, -10.0)],
                                [sc(hf, -10.0, 54.0, -6.8), sc(hf, -11.0, 47.0, -6.4)]], w=0.8, team=False,
              fill=LINE_ON_VIOLET)


def cosmic_body(rig, bulk=1.0, team_shin=True, plate=True, hips=True, shoulders=True, far_shoulder=True,
                bracers=True, boots=True, pad_r=(7.6, 6.6, 6.2), knee=None, bracer_line=None):
    """The W4 detail on the Cosmic body (kit_cosmic legs_v3, rigs_cosmic torso, arms and pads; call it after them
    with the same arguments): the team chest plate in two plates (team-dark), the collar's and belt's seams, the
    violet hip skirt in plates, the pads' team-dark ridges, the sleeves' elbow creases, the bracers' cuff seams, knee
    creases on the void legs, the team shins' rims, the boots' seams and a scuffed toe (char space; decals cast)."""
    from ageborn_art import face as FC_
    from ageborn_art import kit_medieval as KM
    from ageborn_art import rigs_cosmic as RC
    k = bulk
    if plate:
        cf = FC_.Face(rig, "torso", [Geo().blob((1.8, 0, 31.4), (9.8 * k, 10.5 * k, 8.0), p=3.0, taper=(0.88, 1.0))])
        yy = -10.3 * k
        folds(rig, "torso", cf, [[sc(cf, -6.0 * k, 27.4, yy), sc(cf, 1.0 * k, 27.0, yy), sc(cf, 9.6 * k, 27.8, -8.8 * k)],
                                 [sc(cf, -3.0 * k, 37.4, yy), sc(cf, -3.4 * k, 27.6, yy)]], w=0.8, team=True)
    band(rig, "torso", (1.0, 0, 38.8), (7.6, 7.8, 2.0), 2.6, 37.4, 38.0, fill=LINE_ON_VIOLET)
    band(rig, "torso", (0.4, 0, 21.8), (10.2 * k, 10.2 * k, 2.3), 3.4, 21.4, 22.1, fill=LINE_ON_STAR)
    if hips:
        ff = FC_.Face(rig, "hips", [Geo().blob((0.6, 0, 16.6), (10.6 * k, 10.4 * k, 4.2), p=2.8, taper=(1.12, 1.0))])
        panel_lines(rig, "hips", ff, [[sc(ff, -3.6, 19.6, -10.2 * k), sc(ff, -4.0, 13.6, -10.2 * k)],
                                      [sc(ff, 3.0, 19.6, -10.2 * k), sc(ff, 3.4, 13.6, -10.2 * k)]], fill=LINE_ON_VIOLET,
                    w=0.7)
    for s in ("r", "l"):
        y = RC.ARM_Y[s]
        if shoulders and (s == "r" or far_shoulder):
            c = (0.5, y - 0.3 * RC.SIDE_Y[s], 37.6)
            pf = FC_.Face(rig, f"arm_{s}", [Geo().blob(c, pad_r, p=2.6)])
            yy = c[1] - (pad_r[1] - 0.8)              # the camera's side of each pad
            folds(rig, f"arm_{s}", pf, [[sc(pf, -4.6, 40.2, yy), sc(pf, 0.5, 41.8, yy), sc(pf, 5.4, 40.2, yy)]],
                  w=0.75, team=True)
        sleeve = FC_.Face(rig, f"arm_{s}", [Geo().capsule((0, y, RC.SHOULDER_Z), (0, y, RC.ELBOW_Z), 4.0, 3.7)])
        folds(rig, f"arm_{s}", sleeve, [[sc(sleeve, -2.6, 30.6, y - 3.8), sc(sleeve, 0.2, 29.8, y - 4.0),
                                         sc(sleeve, 2.8, 30.8, y - 3.8)]], w=0.8, team=False, fill=FOLD_ON_VOID)
        if bracers:
            band(rig, f"fore_{s}", (0.3, y, RC.HAND_Z + 4.2), (4.8, 4.7, 3.6), 2.8, 26.0, 26.7,
                 fill=bracer_line or LINE_ON_VIOLET, taper=(0.9, 1.1))
    for s in ("r", "l"):
        y = RC.LEG_Y * RC.SIDE_Y[s]
        th = FC_.Face(rig, f"thigh_{s}", [Geo().capsule((0, y, KM.V3_THIGH_Z + 0.5), (0.5, y, KM.V3_KNEE_Z), 4.6, 4.1)])
        folds(rig, f"thigh_{s}", th, [[sc(th, -2.4, 14.4, y - 4.4), sc(th, 0.4, 13.6, y - 4.6),
                                       sc(th, 3.0, 14.6, y - 4.2)]], w=0.8, team=False, fill=FOLD_ON_VOID)
        if team_shin:
            band(rig, f"shin_{s}", (1.9, y, 8.8), (3.4, 4.2, 2.8), 2.6, 6.6, 7.3, team=True)
        if boots:
            band(rig, f"foot_{s}", (2.8, y, 2.4), (4.4, 4.7, 2.5), 2.9, 3.0, 3.6, fill=LINE_ON_VIOLET, taper=(1.02, 0.84))
    if boots:
        tf = FC_.Face(rig, "foot_r", [Geo().blob((2.8, -RC.LEG_Y, 2.4), (4.4, 4.7, 2.5), p=2.9, taper=(1.02, 0.84))])
        # (r37: on the toe; at x 0 its screen point missed the boot, and the chip lay on the y = 0 plane)
        wear(rig, "foot_r", tf, [(*sc(tf, 5.0, 3.2, -RC.LEG_Y - 3.6), 1.1, 0.5)], fill=WEAR_ON_VIOLET)


def cosmic_legs(rig, team_shin=True, boots=True, boot_line=None, sleeves=True):
    """cosmic_body's legs and sleeves alone (for Cosmic units built on legs_v3 and arm_parts without the trooper's
    torso, collar and belt): knee creases on the void legs, the team shins' rims, the boots' seams and a scuffed
    toe, the sleeves' elbow creases."""
    from ageborn_art import face as FC_
    from ageborn_art import kit_medieval as KM
    from ageborn_art import rigs_cosmic as RC
    for s in ("r", "l"):
        y = RC.LEG_Y * RC.SIDE_Y[s]
        th = FC_.Face(rig, f"thigh_{s}", [Geo().capsule((0, y, KM.V3_THIGH_Z + 0.5), (0.5, y, KM.V3_KNEE_Z), 4.6, 4.1)])
        folds(rig, f"thigh_{s}", th, [[sc(th, -2.4, 14.4, y - 4.4), sc(th, 0.4, 13.6, y - 4.6),
                                       sc(th, 3.0, 14.6, y - 4.2)]], w=0.8, team=False, fill=FOLD_ON_VOID)
        if team_shin:
            band(rig, f"shin_{s}", (1.9, y, 8.8), (3.4, 4.2, 2.8), 2.6, 6.6, 7.3, team=True)
        if boots:
            band(rig, f"foot_{s}", (2.8, y, 2.4), (4.4, 4.7, 2.5), 2.9, 3.0, 3.6, fill=boot_line or LINE_ON_VIOLET,
                 taper=(1.02, 0.84))
        if sleeves:
            ya = RC.ARM_Y[s]
            sleeve = FC_.Face(rig, f"arm_{s}", [Geo().capsule((0, ya, RC.SHOULDER_Z), (0, ya, RC.ELBOW_Z), 4.0, 3.7)])
            folds(rig, f"arm_{s}", sleeve, [[sc(sleeve, -2.6, 30.6, ya - 3.8), sc(sleeve, 0.2, 29.8, ya - 4.0),
                                             sc(sleeve, 2.8, 30.8, ya - 3.8)]], w=0.8, team=False, fill=FOLD_ON_VOID)
    if boots:
        tf = FC_.Face(rig, "foot_r", [Geo().blob((2.8, -RC.LEG_Y, 2.4), (4.4, 4.7, 2.5), p=2.9, taper=(1.02, 0.84))])
        # (r37: on the toe; at x 0 its screen point missed the boot, and the chip lay on the y = 0 plane)
        wear(rig, "foot_r", tf, [(*sc(tf, 5.0, 3.2, -RC.LEG_Y - 3.6), 1.1, 0.5)], fill=WEAR_ON_VIOLET)


def melee_clip(name, fn, smear, fx, reuse=None, hold_step=3, band=0.55, soft=True):
    """kit_future_wave.melee_clip with two-tone arc smears (`smear_soft`; a streak stays one tone): a SMALL_MELEE_MS
    attack (impact on step 6) from 10 unique poses played 0-9 then 0, the smear on frames 4-6, `fx` on the impact."""
    from ageborn_art import moves as M

    def sm(spec):
        if spec.get("kind") != "arc":
            return [spec]
        return smear_soft(spec, band=band) if soft else smear_two_tone(spec, band=band)
    ov = {4: sm(dict(smear, **{"from": 3})), 5: sm(dict(smear, **{"from": 4})), 6: sm(dict(smear, **{"from": 5})) + fx}
    return M.clip(name, [fn(f) for f in range(10)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT, smear=4,
                  overlays=ov, sequence=list(range(10)) + [0], reuse=reuse, extra={"holdStep": hold_step})


def kinds_future(extra=None):
    """MATERIAL_KINDS for the Future palette (rigs_future), plus the unit's own colours in `extra`."""
    base = {RF.ARMOR: "ceramic", ARMOR: "ceramic", RF.TRIM: "iron", RF.STEEL: "iron", RF.GUNMETAL: "iron", RF.SUIT: "cloth",
            RF.SUIT_LT: "cloth", RF.CHARCOAL: "cloth", RF.VISOR_DARK: "glass", RF.SKIN: "skin",
            LINE_ON_WHITE: "ceramic", WEAR_ON_WHITE: "ceramic", LINE_ON_SUIT: "cloth", WEAR_ON_SUIT: "cloth",
            FOLD_ON_SUIT: "cloth", FOLD_ON_SUIT_LT: "cloth", TROOPER_WHITE: "ceramic", GUN_LT: "iron", GUN_SEAM: "iron",
            "team": "polymer"}
    return kinds(dict(base, **(extra or {})))


def kinds_cosmic(extra=None):
    """MATERIAL_KINDS for the Cosmic palette (rigs_cosmic), plus the unit's own colours in `extra`."""
    from ageborn_art import rigs_cosmic as RC
    base = {RC.VOID: "cloth", RC.VOID_LT: "cloth", RC.VOID_DK: "cloth", RC.VIOLET: "polymer", RC.VIOLET_DK: "polymer",
            RC.VIOLET_LT: "polymer", RC.STAR: "ceramic", RC.STAR_TRIM: "ceramic", RC.VISOR: "glass",
            LINE_ON_VIOLET: "polymer", WEAR_ON_VIOLET: "polymer", FOLD_ON_VOID: "cloth", LINE_ON_STAR: "ceramic",
            "team": "polymer"}
    base.update(extra or {})
    return kinds(base)


def sc(face, x, z, y):
    """The screen position (x, z) of the char-space point (x, y, z), as Face.hit takes it (kit_medieval.scr)."""
    from ageborn_art import kit_medieval as KM
    return KM.scr(face, (x, y, z))


def on_blob(face, c, r, x, z, p=1.9, k=0.9):
    """sc() of the camera-side surface point at char (x, z) of an unrotated, untapered blob (centre c, radii r, power
    p): the depth solves the superellipse, and (x, z) is first drawn in to `k` of the blob's side profile, so a line
    laid through these points stays on its face (r31g: fissures drawn past a boulder's edge fell off it)."""
    dx, dz = (x - c[0]) / r[0], (z - c[2]) / r[2]
    s = abs(dx) ** p + abs(dz) ** p
    if s > k ** p:
        f = (k ** p / s) ** (1 / p)
        dx, dz, s = dx * f, dz * f, k ** p
    t = max(1.0 - s, 0.0) ** (1 / p)
    return sc(face, c[0] + dx * r[0], c[2] + dz * r[2], c[1] - r[1] * t)


def band(rig, joint, center, radii, p, z0, z1, fill=None, team=False, grow=1.02, taper=(1.0, 1.0)):
    """A band of a blob's own surface between z0 and z1 (char space), `grow` times its size: a seam, rim or cuff that
    stands just proud of the plate and follows it round (decals cast on a curved plate's edge sink in; the plate's
    own surface does not). team=True: team-dark."""
    g = Geo().blob(center, tuple(r * grow for r in radii), p=p, taper=taper)
    g.clip((0, 0, z1), (0, 0, 1)).clip((0, 0, z0), (0, 0, -1))
    if team:
        return team_dark(rig, joint, g)
    return rig.part(joint, g, fill, outline=0, highlight=False)


def smear_soft(spec, band=0.55, lead_white=0.4):
    """`smear_two_tone` with a softer leading strip (white `lead_white`): on the bright Future glows the strip's white
    counted as highlight in every swing frame."""
    base, lead = smear_two_tone(spec, band=band)
    lead["white"] = lead_white
    return [base, lead]
