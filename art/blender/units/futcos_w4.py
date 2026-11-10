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
from ageborn_art import face as F
from ageborn_art import rigs_future as RF
from ageborn_art.geometry import Geo
from units import industrial_w3 as IW

# the W1-W3 helpers the W4 scripts use as they are
kinds = IW.kinds
skin_palette = IW.skin_palette
field = IW.field
ribbon = IW.ribbon
seam = IW.seam
plate_band = IW.plate_band
folds = IW.folds
panel = IW.panel
piping = IW.piping
rivets = IW.rivets
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


def panel_lines(rig, joint, face, lines, fill=LINE_ON_WHITE, w=0.7, depth=0.35):
    """Panel lines: lines = [[(x, z), ...], ...] in screen lu, conforming ribbons in a tone darker than the plate (the
    plates' value structure at game scale; a seam every 6-12 lu reads as plating, not as texture)."""
    g = Geo()
    for pts in lines:
        ribbon(g, face, pts, w, depth)
    return rig.part(joint, g, fill, outline=0, highlight=False)


def wear(rig, joint, face, chips, fill=WEAR_ON_WHITE, depth=0.3):
    """Edge wear: chips = [(x, z, rx, rz), ...] in screen lu, conforming ellipses (the plate's corners and edges, where
    a soldier's kit scuffs)."""
    g = Geo()
    for x, z, rx, rz in chips:
        field(g, face, F.ellipse(x, z, rx, rz, 12), depth)
    return rig.part(joint, g, fill, outline=0, highlight=False)


def glow_seam(rig, joint, face, pts, color=RF.MINT, w=0.6, depth=0.4):
    """An emissive seam along pts [(x, z)] (screen lu): a narrow conforming glow ribbon (Future's light lines)."""
    g = ribbon(Geo(), face, pts, w, depth)
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


def kinds_future(extra=None):
    """MATERIAL_KINDS for the Future palette (rigs_future), plus the unit's own colours in `extra`."""
    base = {RF.ARMOR: "ceramic", ARMOR: "ceramic", RF.TRIM: "iron", RF.STEEL: "iron", RF.GUNMETAL: "iron", RF.SUIT: "cloth",
            RF.SUIT_LT: "cloth", RF.CHARCOAL: "cloth", RF.VISOR_DARK: "glass", RF.SKIN: "skin",
            LINE_ON_WHITE: "ceramic", WEAR_ON_WHITE: "ceramic", LINE_ON_SUIT: "cloth", WEAR_ON_SUIT: "cloth",
            FOLD_ON_SUIT: "cloth",
            "team": "polymer"}
    base.update(extra or {})
    return kinds(base)


def sc(face, x, z, y):
    """The screen position (x, z) of the char-space point (x, y, z), as Face.hit takes it (kit_medieval.scr)."""
    from ageborn_art import kit_medieval as KM
    return KM.scr(face, (x, y, z))


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
