"""Art round W1 (Track STONE): small detail helpers shared by the Stone troops' scripts.

Not a unit (it is not in render_all.AGE_OF). The Stone troops opt into the detail standard (`ageborn_art/look.py`,
art/blender/README.md "Detail standard") with the pilot's recipe (`units/bonker.py`, W0 milestone 7), and these
helpers add the secondary shapes the standard asks for (item 47 audit 5.1 and 5.2) in one consistent way:

  kinds()        MATERIAL_KINDS with the far side's shaded copies (the 20% darker far leg and arm)
  locks()        lighter strands over dark hair or fur (two-tone hair, 2.6-3 lu wide)
  team_spots()   team-dark decals on a team surface (wildcat spots: the team zone in two tones, still team)
  ring()         a band lathed round a part (belts, cuffs, armbands, rolled brims)
  laces()        crossed cords over a wrap (1.1 lu lines on part boundaries)
  beads()        a necklace or a strap of round beads (2.5-3.4 lu)
  blush()        a ruddy cheek patch on a big face (a 15+ level value step on skin)

Every number is in lu at rest, character space (x forward, y away from the camera, z up). Shapes that must read
are at least 2.5 lu on their short side and at least 15 levels of luminance off their neighbours.
"""
import math

from ageborn_art import colors as C
from ageborn_art import face as F
from ageborn_art import look
from ageborn_art.geometry import Geo

# The pilot's shading (W0 milestone 7: the art gate's SHD 3 -> 3.5): a lit top, a core shadow along the
# terminator, a darker shadow band, a deeper cavity and a brighter rim. Soldiers take it as is.
SHADE_SOLDIER = {"shadow": 0.82, "core": 0.22, "core_width": 0.32, "gradient": 2.2, "cavity": 0.62,
                 "rim_mix": 0.52, "top": 0.14, "top_t": 0.60, "team_core": 0.4}
RIM_SOLDIER = {"lift": 0.52, "full_lu": 0.6}
HIGHLIGHT_SOLDIER = 1.35
# Beasts and mounts (review W0: "dark, smooth beasts read as masses"): the same structure with a stronger top
# light and core, so the fur's lit back, flank and shadowed belly read as three values at 62 px.
SHADE_BEAST = {"shadow": 0.80, "core": 0.24, "core_width": 0.34, "gradient": 2.3, "cavity": 0.62,
               "rim_mix": 0.55, "top": 0.18, "top_t": 0.58, "team_core": 0.4}
RIM_BEAST = {"lift": 0.56, "full_lu": 0.65}
HIGHLIGHT_BEAST = 1.45


def kinds(base, far=0.8, extra_scales=()):
    """`base` ({hex: kind, "team": kind}) plus the far side's shaded copies of every colour (rigs_stone.CaveBody
    darkens the far leg and foot by `far`; units darken their far arm the same way)."""
    out = {}
    for h, k in base.items():
        out[h.upper() if h.startswith("#") else h] = k
    for h, k in base.items():
        if h.startswith("#"):
            for f in (far,) + tuple(extra_scales):
                out.setdefault(C.scale(h, f).upper(), k)
    return out


def locks(rig, joint, strokes, fill, y, finish="hair", outline=0):
    """Lighter strands over hair or fur: `strokes` = [((x0, z0), (x1, z1), r)], at depth `y` (toward the camera is
    negative y). A capsule of radius r is 2r wide: keep r >= 1.25 so a lock reads as a shape, not texture."""
    g = Geo()
    for (x0, z0), (x1, z1), r in strokes:
        g.capsule((x0, y, z0), (x1, y - 0.2, z1), r, r * 0.72)
    rig.part(joint, g, fill, finish=finish, outline=outline)


def team_spots(rig, joint, face, spots, depth=0.35, tone=look.TEAM_DARK):
    """Team-dark decals laid on `face` (an F.Face over the team part): spots = [(x, z, rx, rz)] seen from the
    camera. They keep their team area and give the zone its second tone (audit rule 5)."""
    g = Geo()
    for x, z, rx, rz in spots:
        face.decal(g, face.hit(x, z), F.ellipse(0, 0, rx, rz, 12), depth)
    look.team_part(rig, joint, g, tone=tone, outline=0)


def stripes(rig, joint, face, strokes, w=1.6, depth=0.35, tone=look.TEAM_DARK):
    """Team-dark strokes on a team surface: strokes = [[(x, z), (x, z), ...]] in screen lu at rest."""
    g = Geo()
    for pts in strokes:
        c = face.hit(*pts[0])
        rel = [(x - pts[0][0], z - pts[0][1]) for x, z in pts]
        face.stroke(g, c, rel, w, depth)
    look.team_part(rig, joint, g, tone=tone, outline=0)


def seam(rig, joint, face, pts, fill=None, w=1.1, depth=1.0, team=False, tone=look.TEAM_DARK):
    """A line laid on a curved surface in short pieces, each centred on the surface under its midpoint (a stitched
    seam round a pad, a woven zigzag): pts = [(x, z), ...] in screen lu at rest. team=True: team-dark."""
    g = Geo()
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        mx, mz = (x0 + x1) / 2, (z0 + z1) / 2
        face.stroke(g, face.hit(mx, mz), [(x0 - mx, z0 - mz), (x1 - mx, z1 - mz)], w, depth)
    if team:
        return look.team_part(rig, joint, g, tone=tone, outline=0)
    return rig.part(joint, g, fill, outline=0, highlight=False)


def ring(rig, joint, center, rx, height=3.0, ry=None, fill=None, team=False, tone=look.TEAM_DARK, segs=36,
         p1=None, outline=0.6, finish="matte", bulge=0.45):
    """A band of `height` lu lathed round a part at `center` (its bottom), radius rx (ry: the depth, via squash).
    team=True makes it team-dark (a stripe in a team zone that keeps its team area)."""
    sq = (1.0, (ry or rx) / rx)
    prof = [(rx, 0.0), (rx + bulge, height * 0.12), (rx + bulge, height * 0.88), (rx, height)]
    g = Geo().lathe(prof, center, p1, segs=segs, squash=sq) if p1 else Geo().lathe(prof, center, segs=segs, squash=sq)
    if team:
        return look.team_part(rig, joint, g, tone=tone, outline=outline)
    return rig.part(joint, g, fill, outline=outline, finish=finish)


def laces(rig, joint, x, y, z0, z1, fill, w=0.55, n=2):
    """Crossed cords over a wrap between heights z0 (low) and z1 (high), on the camera side at depth y."""
    g = Geo()
    step = (z1 - z0) / n
    for k in range(n):
        lo, hi = z0 + k * step, z0 + (k + 1) * step
        g.capsule((x - 1.9, y, hi), (x + 1.9, y, lo), w, segs=8, rings=2)
        g.capsule((x + 1.9, y, hi), (x - 1.9, y, lo), w, segs=8, rings=2)
    rig.part(joint, g, fill, outline=0)


def beads(rig, joint, pts, fill, r=1.45, outline=0.5, finish="gloss"):
    """Round beads at `pts` [(x, y, z)] (a necklace, a strap of pebbles)."""
    g = Geo()
    for p in pts:
        g.sphere(p, r, cuts=3)
    rig.part(joint, g, fill, outline=outline, finish=finish)


def thong(rig, joint, center, r, fill, tilt_to=None, w=0.75):
    """A thin cord ring (a necklace's thong) round the neck: lathed about the axis from `center` to `tilt_to`."""
    prof = [(r, 0), (r + w, w * 0.4), (r + w, w * 1.6), (r, w * 2)]
    g = Geo().lathe(prof, center, tilt_to, segs=24) if tilt_to else Geo().lathe(prof, center, segs=24)
    rig.part(joint, g, fill, outline=0.4)


def blush(rig, joint, face, x, z, rx, rz, fill):
    """A ruddy cheek: a darker, warmer skin patch (a decal) so a big face is not one flat field."""
    g = Geo()
    face.decal(g, face.hit(x, z), F.ellipse(0, 0, rx, rz, 14), 0.35)
    rig.part(joint, g, fill, outline=0, highlight=False)


def fur_lock(g, root, length, tilt, r=2.4, dy=-0.6):
    """A lock of long fur or fleece hanging from `root` into `g`: a cone tilted `tilt` degrees from straight down
    (positive leans forward, +x), 2r wide at the root, so a coat's edge reads as shaggy points (woolly coats)."""
    x, y, z = root
    a = math.radians(tilt)
    tip = (x + length * math.sin(a), y + dy, z - length * math.cos(a))
    g.lathe([(r, 0), (r * 0.85, length * 0.35), (r * 0.45, length * 0.75), (0, length)], root, tip, segs=10,
            squash=(1.0, 0.75))
    return g


def claws(rig, joint, tips, fill, tip_fill, r=1.3, length=3.4):
    """Claws or teeth with a lighter tip: tips = [((x, y, z), (dx, dz))] base point and direction (unit-ish)."""
    g, gt = Geo(), Geo()
    for (x, y, z), (dx, dz) in tips:
        n = math.hypot(dx, dz) or 1.0
        dx, dz = dx / n, dz / n
        mid = (x + dx * length * 0.55, y, z + dz * length * 0.55)
        end = (x + dx * length, y, z + dz * length)
        g.lathe([(r, 0), (r * 0.8, length * 0.5), (0, length)], (x, y, z), end, segs=8)
        gt.lathe([(r * 0.62, 0), (0, length * 0.46)], mid, end, segs=8)
    rig.part(joint, g, fill, outline=0.4, finish="gloss")
    rig.part(joint, gt, tip_fill, outline=0, finish="gloss")


# -- aimed throws of axis-less shooters (queue item 44's art part; ageborn_art/aimed.py) ---------------------------
# aimed.variants solves the turn of a measured weapon (a joint's axis); a sling, a pouch of herbs or a rider's
# rock has none: its clip's aimDeg is item 44's authored angle (aimdata.SPEC `deg`). For those the unit authors the
# aimed throw itself (`pose(f, turn)`: frame f of the base clip thrown `turn` degrees higher) and declares the
# variant's angle the same way: `register_aims` adds `<clip>_up45 = {"deg": 45}` ... to the unit's own aimdata.SPEC
# entry (and to its skins' slugs, whose rigs are named `<slug>@<skin>`), so aimdata writes aimDeg and release for
# them like for any shot clip. Nothing in the shared table changes for any other unit.
AIM_TARGETS = {"up45": 45.0, "up70": 70.0}


def register_aims(slug, skins=(), clips=("attack",), aims=AIM_TARGETS):
    from ageborn_art import aimdata
    base = dict(aimdata.SPEC.get(slug, {}))
    for s in (slug,) + tuple(f"{slug}@{k}" for k in skins):
        spec = aimdata.SPEC.setdefault(s, dict(base))
        for c in clips:
            for aim, deg in aims.items():
                spec[f"{c}_{aim}"] = {"deg": deg}


def authored_variants(clip, pose, weights, base_deg, aims=AIM_TARGETS, log=print):
    """The aimed variants `<clip>_up45` / `_up70` of an axis-less throw, with exactly the base clip's timing (frames,
    sequence, step durations, impact, smear, holdStep, holdLoop) plus aimOf, like aimed.variants. `pose(f, turn)` is
    frame f thrown `turn` degrees higher; `weights[f]` is the share of the turn frame f takes (0 reuses the base
    frame, not rendered again). The turn is the aim minus the base clip's authored angle."""
    from ageborn_art.anim import Clip
    if len(weights) != clip.frames:
        raise ValueError(f"aimed {clip.name}: {len(weights)} weights for {clip.frames} frames")
    out = []
    for aim, deg in aims.items():
        turn = deg - base_deg
        table = [pose(f, turn * weights[f]) if weights[f] > 0 else pose(f, 0.0) for f in range(clip.frames)]
        v = Clip(f"{clip.name}_{aim}", clip.frames, (lambda t: (lambda f: t[f]))(table), loop=clip.loop,
                 impact=clip.impact, sequence=clip.sequence, durations=clip.durations, smear=clip.smear,
                 extra=dict(clip.extra, aimOf=clip.name))
        base_reuse = getattr(clip, "reuse", None) or {}
        reuse = {f: base_reuse.get(f, (clip.name, f)) for f in range(clip.frames) if weights[f] == 0}
        if reuse:
            v.reuse = reuse
        if getattr(clip, "overlays2", None):
            v.overlays2 = {k: list(s) for k, s in clip.overlays2.items()}
        log(f"  aimed {v.name}: authored {deg:.0f} deg (turn {turn:+.1f}), {clip.frames - len(reuse)} new frames")
        out.append(v)
    return out
