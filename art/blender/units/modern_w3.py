"""Modern Age detail helpers for the art round's wave W3 (Track MODERN): small parts that bring the Modern troops to
the detail standard on top of the shared `rigs_modern`, `kit_modern` and `kit_bronze_detail` parts.

Only the Modern unit scripts of wave W3 import it; no shared module changes, so every other unit renders byte for
byte as before. Not a unit (it is not in render_all.AGE_OF).

  kinds       MATERIAL_KINDS with the far side's shaded copies (the legs kit darkens the far leg by 0.8)
  diag_band   a strap, sling or bandolier across a jacket: the jacket's own blob grown a little and cut down to the
              strip between two parallel tilted planes (kit_bronze_detail.shell), so it follows the curve
  on_surface  the camera-side surface point of a part at a side-view (x, z)
  studs       buttons, snaps or rivets on the camera-side surface of a part, placed by the camera ray
  team_line   a seam, fold or crease drawn on a team surface in a darker team tone (a team part, so it keeps the team
              area): the jacket's seams and the vehicles' panel lines
  team_patch  a team-dark patch on a team surface (a pocket flap, a shoulder strap, a hull panel): the team zone in
              two tones, still team
  plate       a flat patch of any colour on a surface (a name tape, a cream panel, a canvas cover)
  decals      several flat patches of one colour in one part (paint chips, goggle lenses)
  team_decals several team-dark patches in one team part (camouflage blotches)
  tunic_w3    rigs_modern.tunic's detail: a team-dark skirt hem, a side seam, the webbing's front brace, a pocket flap
  cuffs       team-dark cuffs above the fists
  hat         kit_modern_wave.trooper's hats with the W3 detail (a team-dark band on the team helmet cover, worn
              chips on the olive Brodie), on the `hat` joint and its `hat_loose` copy

Every number is in lu at rest, character space (x forward, y away from the camera, z up). Shapes that must read
are at least 2.5 lu on their short side and at least 15 levels of luminance off their neighbours (W0 review).
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_bronze_detail as KD
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_modern as KM
from ageborn_art import kit_modern_wave as KW
from ageborn_art import look
from ageborn_art import rigs_modern as R
from ageborn_art.geometry import Geo
from units import stone_w1 as W1

kinds = W1.kinds

# The soldiers' look of W2 (GUNPOWDER: every soldier met the infantry floors with it): a lit top, a core shadow, a
# darker shadow band, a stronger in-band gradient and cavity, and a rim; a softer finish highlight than the pilot's,
# because the Modern kit's khaki webbing, pouches and helmet nets already read as highlights on the team jacket.
SHADE_SOLDIER = {"shadow": 0.84, "core": 0.18, "core_width": 0.30, "gradient": 2.0, "cavity": 0.6, "rim_mix": 0.5,
                 "top": 0.08, "top_t": 0.62, "team_core": 0.4}
HIGHLIGHT_SOLDIER = 0.7
# Vehicles and aircraft: the big hull panels need the core shadow and a lit top plane to read as forms at 62 px.
SHADE_MACHINE = {"shadow": 0.82, "core": 0.22, "core_width": 0.30, "gradient": 2.4, "cavity": 0.7, "rim_mix": 0.52,
                 "top": 0.12, "top_t": 0.60, "team_core": 0.45}
HIGHLIGHT_MACHINE = 1.0
BOOT = "#4A3F36"         # boots with a lit side (was rigs_modern.BOOT #3E342D, W1 lesson 2)
CHIP = "#7E8264"         # worn paint on the olive (a step lighter than rigs_modern.OLIVE)


def diag_band(center, radii, a_deg, d0, d1, p=2.4, taper=(1.0, 1.0), grow=0.3, keep=(), rot=(0, 0, 0),
              shift=(0.0, 0.0)):
    """A shell of a blob part (the same centre, radii, p, taper, rot and shift) between two parallel planes whose
    normal n = (cos a, 0, sin a) lies in the side view: the strip at signed distances d0 < d1 from the centre
    along n. `keep` adds more cut planes (point, normal toward the side cut away). Returns the Geo."""
    a = math.radians(a_deg)
    n = (math.cos(a), 0.0, math.sin(a))
    cx, cy, cz = center
    planes = [((cx + n[0] * d1, cy, cz + n[2] * d1), n),
              ((cx + n[0] * d0, cy, cz + n[2] * d0), (-n[0], 0.0, -n[2]))] + list(keep)
    return KD.shell(center, radii, p=p, taper=taper, grow=grow, keep=planes, rot=rot, shift=shift)


def on_surface(rig, joint, refs, x, z):
    """The camera-side surface point of the Geos `refs` (shaped like the joint's parts at rest) seen at the
    side-view (x, z), lifted a little toward the camera (face.Face.hit)."""
    return tuple(F.Face(rig, joint, refs).hit(x, z))


def team_line(rig, joint, ref, pts, w, tone=0.78, depth=0.4):
    """A line of width w (lu) through the side-view points `pts` on the surface of `ref` (a fresh Geo shaped like
    the part), in the team tone `tone` (look.team_part; 1 is the team colour, look.TEAM_DARK the team-dark)."""
    fc = F.Face(rig, joint, [ref])
    g = Geo()
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        mx, mz = (x0 + x1) / 2, (z0 + z1) / 2
        fc.stroke(g, fc.hit(mx, mz), [(x0 - mx, z0 - mz), (x1 - mx, z1 - mz)], w, depth)
    return look.team_part(rig, joint, g, tone=tone, outline=0, highlight=False)


def team_patch(rig, joint, ref, center, poly, depth=0.45, tone=look.TEAM_DARK, outline=0):
    """A team-dark patch (`poly`: side-view offsets in lu round `center`, counter-clockwise) laid on the surface of
    `ref` (a fresh Geo shaped like the part): a pocket flap, a shoulder strap or a hull panel in the team zone's
    darker tone."""
    fc = F.Face(rig, joint, [ref])
    g = Geo()
    fc.decal(g, fc.hit(*center), poly, depth)
    return look.team_part(rig, joint, g, tone=tone, outline=outline, highlight=False)


def plate(rig, joint, ref, center, poly, color, depth=0.45, outline=0, highlight=False, finish=None):
    """A flat patch of `color` laid on the surface of `ref` like team_patch (a name tape, a canvas cover)."""
    fc = F.Face(rig, joint, [ref])
    g = Geo()
    fc.decal(g, fc.hit(*center), poly, depth)
    if finish:
        return rig.part(joint, g, color, outline=outline, highlight=highlight, finish=finish)
    return rig.part(joint, g, color, outline=outline, highlight=highlight)


def decals(rig, joint, refs, items, color, depth=0.4, outline=0, highlight=False, finish=None):
    """Several flat patches of `color` in one part: `items` = [((x, z) side-view centre, poly offsets)] laid on the
    camera-side surface of `refs` (fresh Geos): paint chips, lenses, patches."""
    fc = F.Face(rig, joint, refs)
    g = Geo()
    for center, poly in items:
        fc.decal(g, fc.hit(*center), poly, depth)
    if finish:
        return rig.part(joint, g, color, outline=outline, highlight=highlight, finish=finish)
    return rig.part(joint, g, color, outline=outline, highlight=highlight)


TORSO = ((0, 0, 28.0), (10.8, 9.8, 11.8))            # rigs_modern.tunic's blob (p 2.4, taper (1.08, 0.94))
SKIRT = ((0.5, 0, 15.8), (11.4, 10.4, 5.8))          # its skirt (p 2.6, taper (1.1, 1.0)), on "hips"
POCKET = ((8.6, -4.6, 31.0), (2.6, 3.6, 3.2))        # its near breast pocket (p 3.2)


def torso_ref():
    return Geo().blob(*TORSO, p=2.4, taper=(1.08, 0.94))


def tunic_w3(rig, hem_z=13.0, hem=2.3, seam=True, brace=R.KHAKI, pocket=None):
    """The detail standard on rigs_modern.tunic: a team-dark hem on the skirt (`hem` lu tall, 0 for none), a side
    seam behind the near arm, the webbing's front brace from the near shoulder down to the belt (3 lu, in `brace`;
    None for none) and, with `pocket` (a button colour), a team-dark flap with a button on the near breast pocket."""
    if hem:
        look.team_part(rig, "hips", KD.band_z(*SKIRT, hem_z, hem_z + hem, p=2.6, taper=(1.1, 1.0), grow=0.3))
    if seam:
        team_line(rig, "torso", torso_ref(), [(-5.4, 34.5), (-6.4, 28.5), (-6.6, 22.6)], 1.0)
    if brace:
        g = diag_band(*TORSO, 22.4, 4.2, 7.1, p=2.4, taper=(1.08, 0.94), grow=0.45,
                      keep=[((0, 0, 38.6), (0, 0, 1)), ((0, 0, 19.0), (0, 0, -1)), ((0, 0, 0), (0, 1, 0))])
        rig.part("torso", g, brace, outline=0.5)
    if pocket:
        team_patch(rig, "torso", Geo().blob(*POCKET, p=3.2), (8.7, 33.0), rect(5.0, 2.8, slant=0.3))
        studs(rig, "torso", [Geo().blob(*POCKET, p=3.2)], [(8.8, 31.4)], r=1.3, color=pocket)


def cuffs(rig, dz=2.6, rx=4.25, height=2.5):
    """Team-dark cuffs above the fists (rigs_modern.arm_parts' forearms)."""
    for s in ("r", "l"):
        W1.ring(rig, f"fore_{s}", (0, R.ARM_Y[s], R.HAND_Z + dz), rx, height=height, team=True, outline=0.4)


def team_decals(rig, joint, refs, items, tone=look.TEAM_DARK, depth=0.45):
    """Several team-dark patches in one team part (camouflage blotches, panels): `items` as in `decals`."""
    fc = F.Face(rig, joint, refs)
    g = Geo()
    for center, poly in items:
        fc.decal(g, fc.hit(*center), poly, depth)
    return look.team_part(rig, joint, g, tone=tone, outline=0, highlight=False)


# camouflage blotches (outline offsets, lu): irregular, 4-6 lu across
BLOT_A = [(-2.6, -1.2), (-0.6, -2.2), (2.0, -1.8), (2.8, 0.2), (1.2, 1.9), (-1.4, 1.6), (-2.9, 0.6)]
BLOT_B = [(-2.2, -1.8), (1.4, -2.0), (2.6, -0.4), (1.8, 1.6), (-0.8, 2.0), (-2.4, 0.4)]
BLOT_C = [(-3.0, -0.8), (-1.2, -1.9), (1.6, -1.4), (3.0, -0.2), (2.0, 1.2), (-0.6, 1.4), (-2.4, 0.9)]


# worn paint chips (outline offsets round a centre, lu; at least 2.6 lu across so they read at 62 px)
CHIP_A = [(-1.7, -1.1), (1.3, -1.5), (1.8, 0.9), (-0.6, 1.5), (-1.9, 0.4)]
CHIP_B = [(-1.5, -1.2), (1.6, -1.0), (1.4, 1.2), (-1.2, 1.4)]
CHIP_C = [(-1.5, -1.3), (1.6, -1.2), (1.3, 1.3), (-1.6, 1.2)]


HAT_C = {"round": (1.0, 0.0, 57.4), "brodie": (1.5, 0.0, 59.6), "beret": (0.0, 0.0, 58.0),
         "peaked": (1.0, 0.0, 58.0)}
BRODIE_CHIPS = [((-6.1, 66.4), CHIP_A), ((4.9, 67.9), CHIP_B), ((-1.2, 68.9), CHIP_C)]


def hat_parts(rig, joint, kind, c, loose=False, team_cover=True):
    """kit_modern_wave.trooper's hat `kind` at `c` on `joint` with the W3 detail."""
    x, y, z = c
    if kind == "round":
        KM.round_helmet(rig, joint, c=c, strap=not loose, team_cover=team_cover)
        if team_cover:
            g = KD.band_z((x, y, z + 1.5), (12.6, 12.2, 10.4), z - 1.2, z + 1.9, p=2.3, grow=0.35)
            look.team_part(rig, joint, g)
    elif kind == "brodie":
        KM.brodie(rig, joint, c=c)
        chips = [((cx + x - 1.5, cz + z - 59.6), poly) for (cx, cz), poly in BRODIE_CHIPS]
        decals(rig, joint, [Geo().blob((x, y, z + 0.6), (12.6, 12.2, 9.4), p=2.2)], chips, CHIP)
    elif kind == "beret":
        KW.beret(rig, joint, c=c)
    elif kind == "peaked":
        KW.peaked_cap(rig, joint, c=c)
    else:
        raise ValueError(f"unknown hat {kind!r}")


def hat(rig, kind, c=None, team_cover=True):
    """The `hat` joint on the head with kit_modern_wave.trooper's hat `kind` and the W3 detail, and its `hat_loose`
    copy for the death (call it with `trooper(..., hat=None)`). Returns the hat's centre."""
    c = c or HAT_C[kind]
    rig.joint("hat", "head", c)
    hat_parts(rig, "hat", kind, c, team_cover=team_cover)
    KI.loose(rig, "hat_loose", c, lambda j: hat_parts(rig, j, kind, c, loose=True, team_cover=team_cover))
    return c


def rect(w, h, slant=0.0):
    """A w x h rectangle (side-view offsets, counter-clockwise) with its top edge shifted by `slant` (a flap)."""
    return [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2 + slant, h / 2), (-w / 2 + slant, h / 2)]


def studs(rig, joint, refs, pts, r=1.3, color="#B8A776", outline=0.4, finish="metal", squash=None):
    """Buttons, snaps or rivets of radius r on the camera-side surface of `refs` at the side-view points `pts`
    (`refs` must be fresh Geos: rig.part frees the Geo it is given). `squash` (sx, sy, sz) flattens them into discs.
    New parts under 2.5 lu vanish at game scale (W0 review), so keep r >= 1.25."""
    fc = F.Face(rig, joint, refs)
    g = Geo()
    for x, z in pts:
        c = tuple(fc.hit(x, z))
        if squash:
            g.blob(c, (r * squash[0], r * squash[1], r * squash[2]), p=2.2)
        else:
            g.sphere(c, r, cuts=2)
    return rig.part(joint, g, color, finish=finish, outline=outline)
