"""Shared rigs and parts for the Industrial Age units (docs/design-lane-ages.md A17.10, A17.12):
riveter, carbineer, harpoon gunner, flare spotter, sapper (biped), steam golem (walker) and the
land dreadnought (vehicle with a rhomboid track belt).

Biped: the same proportions as every other age (68 lu, head about a third of the height, feet at
the origin, facing +X, near side at -Y). The posing helpers (`arm`, `ik2`, `hold2`, `idle_body`,
`walk_legs`, `hit_body`, `die_limbs`, `ko`, `yell`, `squint`), the head and face, the track belt
and the flash and smoke are the Modern Age helpers (rigs_modern), re-exported here unchanged so an
Industrial unit reads like a Modern one; the Industrial look (caps, bowlers, goggles, overalls,
long coats, braces, wrenches, lever carbines, rivets, boilers) is added on top.

Palette (A17.12, Industrial): iron, coal, smoke cream and muted brick as large areas; copper as
an accent (it sits in the orange team band, so it stays under 10% of a silhouette). Brass is used
in its muted, aged tone for large areas. Team colour goes on overalls, coats, jackets, bibs,
armbands, boiler plates, hull sides and pennants.
"""
import math

from . import rigs_modern as _M
from .anim import merge, pick, squash  # noqa: F401  (re-exported for unit modules)
from .geometry import Geo

# -- re-exported biped layout and posing (identical to the Modern Age) ------------------------
HIP_Z, KNEE_Z, SHOULDER_Z, ELBOW_Z, HAND_Z = _M.HIP_Z, _M.KNEE_Z, _M.SHOULDER_Z, _M.ELBOW_Z, _M.HAND_Z
UPPER, LOWER, LEG_Y, ARM_Y, SIDE_Y, SH = _M.UPPER, _M.LOWER, _M.LEG_Y, _M.ARM_Y, _M.SIDE_Y, _M.SH
skeleton = _M.skeleton
arm_parts = _M.arm_parts
head_ball = _M.head_ball
face = _M.face
ko, yell, squint = _M.ko, _M.yell, _M.squint
arm, ik2, rot2, hold2 = _M.arm, _M.ik2, _M.rot2, _M.hold2
idle_wave, idle_body, walk_legs = _M.idle_wave, _M.idle_body, _M.walk_legs
hit_body, die_limbs = _M.hit_body, _M.die_limbs
TREAD_PHASES = _M.TREAD_PHASES

# -- palette (A17.12) --------------------------------------------------------------------------
IRON = "#5B6168"
IRON_LT = "#767D86"
IRON_DK = "#454A51"
COAL = "#2B2A2E"
COAL_LT = "#403F45"
CREAM = "#DCD6C8"
CREAM_DK = "#C3BCAC"
BRICK = "#8A6A63"
BRICK_LT = "#A08078"
COPPER = "#B06A3B"
BRASS = "#9A8A62"        # aged brass for large areas (docs/art-style.md)
BRASS_LT = "#B8A776"
LEATHER = "#6B5444"
LEATHER_DK = "#54423A"
WOOD = "#7A5F48"
WOOD_LT = "#94775C"
DENIM = "#4C5560"        # iron-blue work trousers (saturation under 40%)
TWEED = "#7D7462"
BOOT = "#3A302B"
SKIN = _M.SKIN
HAIR = "#4A3A2E"
HAIR_RED = "#7A4E36"
GINGER = "#86695A"
EYE, PUPIL, MOUTH, TOOTH = _M.EYE, _M.PUPIL, _M.MOUTH, _M.TOOTH
GLASS = "#C9DCD8"
GLASS_DK = "#6F8783"
SMOKE = "#E6E1D6"
SMOKE_DK = "#8F8B84"
STEAM = "#F2F0EA"
FLASH = "#FFF1C8"
FLASH_CORE = "#FFFFFF"
FIRE = "#FFE9C4"
EMBER = "#FFD9A8"        # boiler glow: desaturated so it follows the A11 colour rule
FUSE = "#FFF3D0"
FLARE = "#F7C8EC"        # white-magenta flare (A17.12: never red)
FLARE_CORE = "#FFFFFF"
STRIPE_DK = "#2F2E33"


def muzzle_flash(rig, joint, muzzle, size=1.0, name="flash", back=False):
    return _M.muzzle_flash(rig, joint, muzzle, size=size, name=name, back=back)


def smoke_puff(rig, joint, at, size=1.0, name="smoke", color=SMOKE, spread=1.0):
    return _M.smoke_puff(rig, joint, at, size=size, name=name, color=color, spread=spread)


# -- legs and clothes --------------------------------------------------------------------------
def legs(rig, trousers=DENIM, boot=BOOT, team=False, thigh_r=4.9, hip_z=HIP_Z, cuff=None, gaiter=None):
    """Work trousers (team for overalls), turned-up cuffs and chunky hobnail boots."""
    for s in ("r", "l"):
        y = LEG_Y * SIDE_Y[s]
        g = Geo().capsule((0, y, hip_z), (0.5, y, KNEE_Z), thigh_r, thigh_r - 0.3)
        rig.part(f"thigh_{s}", g, trousers, team=team)
        g = Geo().capsule((0.5, y, KNEE_Z), (1.0, y, 4.6), thigh_r - 0.5, 4.3)
        rig.part(f"shin_{s}", g, gaiter or trousers, team=team and gaiter is None)
        if cuff:
            g = Geo().blob((1.0, y, 5.8), (4.9, 4.8, 1.3), p=2.6)
            rig.part(f"shin_{s}", g, cuff, outline=0.5)
        g = Geo().blob((3.8, y, 2.8), (7.2, 5.0, 3.0), p=2.9, taper=(1.02, 0.84))
        g.blob((0.9, y, 5.0), (4.6, 4.5, 2.4), p=2.6)
        rig.part(f"shin_{s}", g, boot, finish="gloss")
        g = Geo().blob((4.0, y, 0.6), (7.3, 5.1, 0.8), p=3.0)     # thick sole
        rig.part(f"shin_{s}", g, COAL, outline=0.4)


def overalls(rig, shirt=CREAM, strap_button=BRASS_LT, pocket=True, hem_z=11.0):
    """Team overalls: a bib with a pocket and shoulder braces with brass buttons over a shirt."""
    g = Geo().blob((0, 0, 28.0), (10.4, 9.4, 11.4), p=2.4, taper=(1.06, 0.94))
    rig.part("torso", g, shirt)
    g = Geo().blob((0.6, 0, 22.0), (11.0, 10.2, 8.6), p=2.8, taper=(1.05, 0.92))
    g.clip((0, 0, 30.5), (0, 0, 1))
    g.blob((6.4, 0, 30.0), (4.8, 7.8, 6.4), p=3.2)          # the bib up the chest
    rig.part("torso", g, team=True)
    if pocket:
        g = Geo().blob((10.8, -1.0, 29.6), (1.0, 4.2, 3.0), p=3.4)
        rig.part("torso", g, team=True, outline=0.6)
    g = Geo()
    for s in (-1, 1):   # braces over the shoulders
        g.capsule((9.6, 5.6 * s, 33.0), (2.0, 7.4 * s, 38.2), 1.3)
        g.capsule((2.0, 7.4 * s, 38.2), (-8.0, 5.0 * s, 26.0), 1.3)
    rig.part("torso", g, team=True, outline=0.5)
    g = Geo()
    for s in (-1, 1):
        g.sphere((10.2, 5.4 * s, 33.0), 1.3, cuts=2)
    rig.part("torso", g, strap_button, finish="metal", outline=0.4)
    g = Geo().blob((1.2, 0, 37.2), (7.0, 7.6, 2.4), p=2.4)    # open shirt collar
    rig.part("torso", g, shirt)
    g = Geo().blob((0.5, 0, 15.8), (11.2, 10.2, 5.8), p=2.6, taper=(1.1, 1.0))
    g.clip((0, 0, hem_z), (0, 0, -1))
    rig.part("hips", g, team=True)


def long_coat(rig, lapel=COAL_LT, buttons=BRASS_LT, belt=LEATHER, tails=True, tail_len=13.0, long=False,
              hem_z=11.0, skirt_z=4.5):
    """A long team coat (duster): body, lapels, a row of buttons, a belt, and coat tails on a
    follow-through joint that swing behind the legs. long=True: the skirt flares down to the
    shins (the Carbineer's duster)."""
    g = Geo().blob((0, 0, 27.6), (10.8, 9.8, 12.0), p=2.4, taper=(1.1, 0.94))
    g.blob((0.3, 0, 17.4), (11.2, 10.2, 5.0), p=2.6)
    rig.part("torso", g, team=True)
    g = Geo()
    for s in (-1, 1):
        g.blob((9.4, 4.0 * s, 33.0), (2.0, 3.8, 5.0), p=2.6, rot=(18 * s, -10, 0))
    rig.part("torso", g, lapel, outline=0.6)
    g = Geo()
    for z in (22.0, 26.0, 30.0):
        g.sphere((11.2, -2.2, z), 0.95, cuts=2)
    rig.part("torso", g, buttons, finish="metal", outline=0.3)
    g = Geo().blob((0.2, 0, 20.4), (11.6, 10.6, 1.9), p=3.2)
    rig.part("torso", g, belt)
    g = Geo().blob((11.6, -1.0, 20.4), (1.0, 2.2, 1.7), p=3.2)
    rig.part("torso", g, BRASS_LT, finish="metal", outline=0.4)
    if long:
        # open at the front (the legs stay readable), the back panel hangs to the shins
        g = Geo().blob((0.4, 0, 15.2), (11.6, 10.6, 5.4), p=2.6, taper=(1.12, 1.0))
        g.clip((0, 0, hem_z), (0, 0, -1))
        rig.part("hips", g, team=True)
        g = Geo().blob((-1.0, 0, 11.0), (11.6, 11.4, 9.0), p=2.6, taper=(1.2, 0.98))
        g.clip((0, 0, skirt_z), (0, 0, -1)).clip((0, 0, 16.0), (0, 0, 1)).clip((-1.0, 0, 0), (1, 0, 0))
        g.clip((0, -3.0, 0), (0, -1, 0))
        rig.part("hips", g, team=True)
    else:
        g = Geo().blob((0.4, 0, 15.2), (11.6, 10.6, 5.4), p=2.6, taper=(1.12, 1.0))
        g.clip((0, 0, hem_z), (0, 0, -1))
        rig.part("hips", g, team=True)
    if tails:
        rig.secondary("coattail", "hips", (-4.0, 0, 15.0), (-9.0, 0, 15.0 - tail_len), max_deg=22, gain=1.1)
        ty, ry = (3.5, 7.0) if long else (0.0, 10.4)   # the long duster's tails hang behind the legs
        g = Geo().blob((-4.8 - (3.0 if long else 0.0), ty, 15.0 - tail_len * 0.5), (7.2, ry, tail_len * 0.55), p=2.6,
                       taper=(1.25, 0.9), shift=(0.25, 0))
        g.clip((0, 0, 15.5), (0, 0, 1))
        rig.part("coattail", g, team=True)
        if long:   # a coal hem band so the long tails read as cloth, not a blob
            g = Geo().blob((-6.8, ty, 15.0 - tail_len * 1.02), (7.6, ry * 0.95, 1.6), p=2.6)
            rig.part("coattail", g, COAL_LT, outline=0.5)


def jacket(rig, collar=COAL_LT, buttons=BRASS_LT, belt=LEATHER, skirt=True, hem_z=11.0):
    """A short team work jacket (reefer): chest, collar, two buttons, a belt, a short skirt."""
    g = Geo().blob((0, 0, 28.0), (10.6, 9.6, 11.6), p=2.4, taper=(1.08, 0.94))
    g.blob((0, 0, 18.4), (10.4, 9.6, 4.6), p=2.6)
    rig.part("torso", g, team=True)
    g = Geo().blob((1.2, 0, 37.4), (7.6, 8.0, 2.8), p=2.4)
    rig.part("torso", g, collar)
    g = Geo()
    for z in (26.0, 31.0):
        g.sphere((10.8, -2.0, z), 0.95, cuts=2)
    rig.part("torso", g, buttons, finish="metal", outline=0.3)
    g = Geo().blob((0.2, 0, 20.6), (11.4, 10.6, 2.2), p=3.2)
    rig.part("torso", g, belt)
    if skirt:
        g = Geo().blob((0.5, 0, 15.8), (11.4, 10.4, 5.8), p=2.6, taper=(1.1, 1.0))
        g.clip((0, 0, hem_z), (0, 0, -1))
        rig.part("hips", g, team=True)


def shoulders(rig, color=None, team=True, arm_y=None):
    for s in ("r", "l"):
        y = (arm_y or ARM_Y)[s]
        g = Geo().blob((0, y - 0.1 * SIDE_Y[s], 37.0), (5.6, 5.0, 4.4), p=2.4)
        rig.part(f"arm_{s}", g, color, team=team)


def armband(rig, s="r", arm_y=None):
    """A wide team armband on the upper arm (the Flare Spotter's cue)."""
    y = (arm_y or ARM_Y)[s]
    g = Geo().lathe([(4.9, 0), (5.1, 1.6), (4.9, 3.2)], (0, y, 30.0), (0, y, 33.2), segs=18)
    rig.part(f"arm_{s}", g, team=True, outline=0.6)


# -- faces and hair ------------------------------------------------------------------------------
def moustache(rig, color, cx=13.2, z=44.2, curl=True, big=1.0):
    g = Geo().blob((cx, -3.6, z), (2.8 * big, 4.0 * big, 1.9 * big), p=2.2, rot=(18, 0, 0))
    g.blob((cx, 2.4, z), (2.8 * big, 4.0 * big, 1.9 * big), p=2.2, rot=(-18, 0, 0))
    if curl:
        g.capsule((cx - 0.4, -7.0, z - 0.2), (cx - 1.2, -8.8, z + 2.0), 1.3, 0.9)
    rig.part("head", g, color, finish="hair")


def sideburns(rig, color, cx=2.0, z=46.0):
    g = Geo().blob((cx + 3.0, -10.6, z), (3.0, 1.6, 5.4), p=2.4, rot=(0, 8, 0))
    rig.part("head", g, color, finish="hair", outline=0.5)


def ear(rig, x=-2.0, z=49.0):
    g = Geo().blob((x, -11.2, z), (2.6, 1.6, 3.4), p=2.2)
    rig.part("head", g, SKIN)


def back_hair(rig, color=HAIR, z=47.0):
    g = Geo().blob((-6.2, 0, z), (5.8, 9.8, 6.4), p=2.2)
    rig.part("head", g, color, finish="hair")


# -- headgear --------------------------------------------------------------------------------
def flat_cap(rig, c=(1.0, 0, 57.4), color=TWEED, team_band=False, joint="head", k=1.0, team=False):
    """Newsboy flat cap: a soft, forward-slouched crown over a short stiff peak (team=True: a
    team-coloured crown)."""
    x, y, z = c
    g = Geo().blob((x + 1.6 * k, y, z + 0.4 * k), (13.4 * k, 12.4 * k, 6.0 * k), p=2.3, shift=(0.12, 0))
    g.clip((x, y, z - 1.8 * k), (0, 0, -1))
    rig.part(joint, g, color, team=team)
    g = Geo().blob((x + 12.2 * k, y, z - 1.4 * k), (5.6 * k, 9.4 * k, 1.1 * k), p=2.8, rot=(0, -12, 0))
    rig.part(joint, g, COAL_LT, finish="gloss")
    g = Geo().sphere((x + 3.4 * k, y, z + 6.0 * k), 1.6 * k, cuts=2)
    rig.part(joint, g, COAL_LT if team else color, outline=0.5)
    if team_band:
        g = Geo().lathe([(12.8 * k, 0), (12.9 * k, 1.8 * k), (12.4 * k, 3.0 * k)], (x + 0.8 * k, y, z - 1.6 * k),
                        (x + 0.8 * k, y, z + 1.4 * k), segs=24)
        rig.part(joint, g, team=True, outline=0.6)


def brim_hat(rig, c=(1.0, 0, 57.6), color=COAL_LT, band=LEATHER, team_band=True, joint="head", k=1.0):
    """A wide-brimmed slouch hat with a pinched crown and a team hat band."""
    x, y, z = c
    g = Geo().blob((x, y, z + 5.0 * k), (10.4 * k, 10.0 * k, 7.6 * k), p=2.6, taper=(1.05, 0.82))
    g.clip((x, y, z), (0, 0, -1))
    g.blob((x + 0.6 * k, y, z + 0.4 * k), (18.4 * k, 17.2 * k, 1.6 * k), p=2.4, rot=(0, 4, 0))
    rig.part(joint, g, color, finish="matte")
    g = Geo().blob((x + 1.0 * k, y, z + 11.8 * k), (6.0 * k, 1.6 * k, 1.4 * k), p=2.2)   # crown pinch
    rig.part(joint, g, COAL, outline=0, highlight=False)
    g = Geo().lathe([(10.6 * k, 0), (10.5 * k, 2.4 * k), (10.1 * k, 3.6 * k)], (x, y, z + 1.4 * k),
                    (x, y, z + 5.0 * k), segs=24)
    if team_band:
        rig.part(joint, g, team=True, outline=0.6)
    else:
        rig.part(joint, g, band, outline=0.6)


def slouch_hat(rig, c=(1.0, 0, 57.6), color=COAL_LT, team_band=True, joint="head", k=1.0):
    """A very wide slouch hat: a pinched crown and a broad soft brim that dips at the front and
    the back (a clear silhouette apart from the bowler)."""
    x, y, z = c
    g = Geo().blob((x - 0.4, y, z + 4.2 * k), (10.2 * k, 9.8 * k, 6.6 * k), p=2.6, taper=(1.06, 0.78))
    g.clip((x, y, z), (0, 0, -1))
    rig.part(joint, g, color, finish="matte")
    g = Geo().blob((x + 0.8 * k, y, z + 0.6 * k), (22.0 * k, 19.0 * k, 1.5 * k), p=2.2)
    for v in g.bm.verts:   # droop the brim ends (front and back) and lift the sides a little
        dx = (v.co.x - x) / (22.0 * k)
        dy = (v.co.y - y) / (19.0 * k)
        v.co.z -= 3.6 * k * dx * dx - 1.2 * k * dy * dy
    rig.part(joint, g, color, finish="matte")
    g = Geo().blob((x + 0.6 * k, y, z + 10.4 * k), (6.0 * k, 1.6 * k, 1.4 * k), p=2.2)   # crown pinch
    rig.part(joint, g, COAL, outline=0, highlight=False)
    g = Geo().lathe([(10.5 * k, 0), (10.4 * k, 2.6 * k), (10.0 * k, 3.8 * k)], (x, y, z + 1.2 * k),
                    (x, y, z + 5.0 * k), segs=24)
    if team_band:
        rig.part(joint, g, team=True, outline=0.6)
    else:
        rig.part(joint, g, LEATHER, outline=0.6)


def peaked_cap(rig, c=(1.0, 0, 57.2), color=IRON, team_band=True, joint="head", k=1.0):
    """An officer's peaked cap: a flat, wide round top over a band and a glossy black peak."""
    x, y, z = c
    g = Geo().lathe([(0, 0), (10.6 * k, 0), (11.2 * k, 3.6 * k), (13.6 * k, 7.0 * k), (13.4 * k, 8.4 * k),
                     (0, 8.8 * k)], (x - 0.8 * k, y, z - 0.6 * k), (x - 1.4 * k, y, z + 8.2 * k), segs=28,
                    squash=(1.0, 0.94))
    rig.part(joint, g, color, finish="matte")
    g = Geo().blob((x + 11.0 * k, y, z - 0.4 * k), (6.6 * k, 9.6 * k, 1.1 * k), p=2.8, rot=(0, -16, 0))
    rig.part(joint, g, COAL, finish="gloss")
    g = Geo().lathe([(11.0 * k, 0), (11.2 * k, 1.6 * k), (11.0 * k, 3.2 * k)], (x - 0.8 * k, y, z),
                    (x - 0.8 * k, y, z + 3.2 * k), segs=28)
    if team_band:
        rig.part(joint, g, team=True, outline=0.6)
    g = Geo().sphere((x + 11.2 * k, y - 0.2, z + 3.0 * k), 1.4 * k, cuts=2)                # badge
    rig.part(joint, g, BRASS_LT, finish="metal", outline=0.4)


def bowler(rig, c=(1.0, 0, 57.0), color=COAL_LT, team_band=True, joint="head", k=1.0):
    x, y, z = c
    g = Geo().blob((x, y, z + 3.6 * k), (11.2 * k, 10.8 * k, 9.4 * k), p=2.2)
    g.clip((x, y, z), (0, 0, -1))
    g.blob((x + 0.6 * k, y, z + 0.2 * k), (15.0 * k, 14.2 * k, 1.5 * k), p=2.2)
    rig.part(joint, g, color, finish="gloss")
    if team_band:
        g = Geo().lathe([(11.5 * k, 0), (11.4 * k, 2.2 * k), (11.0 * k, 3.4 * k)], (x, y, z + 1.0 * k),
                        (x, y, z + 4.4 * k), segs=24)
        rig.part(joint, g, team=True, outline=0.6)


def goggles(rig, at=(11.4, 0, 58.6), joint="head", strap=LEATHER, rim=BRASS, glass=GLASS, dy=(-4.8, 4.2),
            k=1.0, down=False):
    """Brass-rimmed round goggles on a leather strap (pushed up on a cap, or over the eyes)."""
    x, y, z = at
    g = Geo()
    for yy in dy:
        g.lathe([(0, 0), (3.2 * k, 0.2), (3.4 * k, 2.4 * k), (0, 2.6 * k)], (x, yy, z), (x + 2.6 * k, yy, z + 0.4 * k),
                segs=16)
    rig.part(joint, g, rim, finish="metal", outline=0.6)
    g = Geo()
    for yy in dy:
        g.blob((x + 2.5 * k, yy, z + 0.4 * k), (0.8, 2.5 * k, 2.5 * k), p=2.2)
    rig.part(joint, g, glass, finish="gloss", outline=0)
    g = Geo().blob((x - 7.0, 0, z - (0.0 if down else 0.6)), (9.2, 12.4, 1.4), p=2.4)
    g.clip((x - 1.0, 0, 0), (1, 0, 0))
    rig.part(joint, g, strap, outline=0.5)


# -- weapons and tools ---------------------------------------------------------------------------
def wrench(rig, joint, fist, length=30.0, jaw=11.0, color=IRON_LT, grip=LEATHER):
    """An oversized adjustable wrench along +Z from the fist: a leather-wrapped grip, a heavy
    iron shank and an open jaw with a copper adjusting screw. Returns the jaw centre."""
    cx, cy, cz = fist
    g = Geo().capsule((cx, cy, cz - 5.0), (cx, cy, cz + 5.0), 2.6, 2.6)
    rig.part(joint, g, grip)
    g = Geo()
    for z in (-2.6, 0.2, 3.0):
        g.lathe([(2.7, -0.5), (2.9, 0), (2.7, 0.5)], (cx, cy, cz + z), (cx, cy, cz + z + 1), segs=12)
    rig.part(joint, g, LEATHER_DK, outline=0)
    g = Geo().blob((cx, cy, cz + length * 0.5 + 2.0), (2.6, 1.9, length * 0.5 - 1.0), p=3.0, taper=(0.9, 1.15))
    g.blob((cx, cy, cz - 6.6), (2.2, 2.0, 1.6), p=2.6)   # pommel
    rig.part(joint, g, color, finish="metal")
    hz = cz + length + jaw * 0.35
    R = jaw * 0.62
    pts = []
    for i in range(15):   # open-end head: a round jaw with a square mouth opening upward
        a = math.radians(118 + 304 * i / 14)
        pts.append((cx + R * math.cos(a), hz + R * math.sin(a)))
    mw = jaw * 0.26
    pts += [(cx + mw, hz + R * 0.05), (cx - mw, hz + R * 0.05)]
    g = Geo().slab(pts, cy, 4.4)
    g.blob((cx, cy, hz - R * 0.9), (2.9, 2.2, 2.6), p=2.6)   # neck
    rig.part(joint, g, color, finish="metal")
    g = Geo().capsule((cx - R * 0.55, cy - 2.4, hz - R * 0.35), (cx + R * 0.55, cy - 2.4, hz - R * 0.35), 1.4)
    rig.part(joint, g, COPPER, finish="metal", outline=0.4)
    return (cx, cy, hz + R)


def lever_carbine(rig, joint, grip, length=38.0, stock=WOOD_LT, barrel=IRON_DK, receiver=BRASS, k=1.0):
    """A short lever-action carbine along +X from the grip: wooden stock and fore-end, a brass
    receiver, a round barrel over a tube magazine and a big lever loop under the grip.
    The lever is on its own child joint `lever` (swings down to cock). Returns the muzzle."""
    gx, gy, gz = grip
    g = Geo()
    g.blob((gx - 8.0 * k, gy, gz - 2.2 * k), (8.2 * k, 2.2 * k, 3.6 * k), p=2.8, rot=(0, 16, 0),
           taper=(1.0, 0.75))
    g.capsule((gx + 6.0, gy, gz + 0.4), (gx + length * 0.62, gy, gz + 0.8), 1.9 * k, 1.6 * k)
    rig.part(joint, g, stock)
    g = Geo().blob((gx + 2.6, gy, gz + 1.2), (4.6 * k, 2.0 * k, 2.8 * k), p=3.2)
    rig.part(joint, g, receiver, finish="metal", outline=0.8)
    g = Geo().capsule((gx + 5.0, gy, gz + 2.4 * k), (gx + length, gy, gz + 2.4 * k), 1.2 * k, 1.1 * k)
    g.capsule((gx + 5.0, gy, gz + 0.6 * k), (gx + length - 3.0, gy, gz + 0.6 * k), 1.0 * k)
    g.blob((gx + length - 1.0, gy, gz + 3.8 * k), (0.8, 0.7, 1.1), p=2.4)
    g.lathe([(1.5, 0), (1.5, 1.4)], (gx + length * 0.8, gy, gz + 1.6), (gx + length * 0.8 + 1, gy, gz + 1.6), segs=12)
    rig.part(joint, g, barrel, finish="metal", outline=0.8)
    rig.joint("lever", joint, (gx + 1.0, gy, gz - 1.0))
    g = Geo()
    pts = [(gx + 1.0, gz - 1.0), (gx - 1.4, gz - 4.4), (gx + 1.2, gz - 7.4), (gx + 5.6, gz - 6.6),
           (gx + 5.4, gz - 3.0), (gx + 3.8, gz - 1.0)]
    for (ax, az), (bx, bz) in zip(pts, pts[1:]):
        g.capsule((ax, gy - 0.4, az), (bx, gy - 0.4, bz), 0.75 * k, segs=8, rings=2)
    rig.part("lever", g, barrel, finish="metal", outline=0.5)
    return (gx + length + 1.0, gy, gz + 2.4 * k)


def binoculars(rig, joint, at, k=1.0, color=COAL_LT, rim=BRASS):
    x, y, z = at
    g = Geo()
    for dy in (-2.4, 2.4):
        g.capsule((x - 3.0 * k, y + dy, z), (x + 3.0 * k, y + dy, z), 2.2 * k, 2.6 * k, segs=14)
    g.blob((x - 0.5, y, z), (1.4, 2.4, 1.2), p=3.0)
    rig.part(joint, g, color, finish="gloss", outline=0.7)
    g = Geo()
    for dy in (-2.4, 2.4):
        g.lathe([(2.4 * k, 0), (2.8 * k, 0.4), (2.8 * k, 1.4), (2.4 * k, 1.6)], (x + 2.4 * k, y + dy, z),
                (x + 4.0 * k, y + dy, z), segs=14)
    rig.part(joint, g, rim, finish="metal", outline=0.4)


def rivets(g, pts, r=1.0):
    for p in pts:
        g.sphere(p, r, cuts=2)
    return g


def stripes_box(rig, joint, c, r, n=3, light=CREAM, dark=STRIPE_DK, team_lid=True):
    """A striped charge box (dark and cream diagonal hazard bands) with a team lid."""
    x, y, z = c
    rx, ry, rz = r
    g = Geo().blob(c, r, p=4.2)
    rig.part(joint, g, light)
    g = Geo()
    for i in range(n):
        u = -0.8 + 1.6 * (i + 0.5) / n
        g.blob((x + rx * u * 0.9, y - ry - 0.1, z), (rx * 0.16, 0.5, rz * 1.05), p=3.2, rot=(0, 30, 0))
        g.blob((x + rx * u * 0.9, y + ry + 0.1, z), (rx * 0.16, 0.5, rz * 1.05), p=3.2, rot=(0, 30, 0))
    g.clip((0, 0, z + rz - 0.2), (0, 0, 1)).clip((0, 0, z - rz + 0.2), (0, 0, -1))
    g.clip((x + rx - 0.3, 0, 0), (1, 0, 0)).clip((x - rx + 0.3, 0, 0), (-1, 0, 0))
    rig.part(joint, g, dark, outline=0)
    g = Geo().blob((x, y, z + rz + 0.6), (rx + 0.8, ry + 0.8, 1.8), p=4.0)
    rig.part(joint, g, team=team_lid, outline=0.6)


def fuse_spark(rig, joint, at, size=1.0, name="spark", seed=0, hidden=False):
    """A fizzing fuse spark: a white-hot core and short pale rays."""
    x, y, z = at
    rig.joint(name, joint, at, hidden=hidden)
    g = Geo()
    for i in range(7):
        a = math.radians(360.0 * i / 7 + 23 * seed)
        r1 = (5.2 if i % 2 == 0 else 3.6) * size
        g.capsule((x + 1.2 * size * math.cos(a), y - 1, z + 1.2 * size * math.sin(a)),
                  (x + r1 * math.cos(a), y - 1, z + r1 * math.sin(a)), 0.7 * size, 0.25 * size, segs=6, rings=2)
    rig.part(name, g, glow=FUSE, outline=0)
    g = Geo().sphere((x, y - 1.5, z), 1.7 * size, cuts=3)
    rig.part(name, g, glow=FLASH_CORE, outline=0)


def steam_puff(rig, joint, at, size=1.0, name="steam", hidden=True, color=STEAM):
    """A cluster of soft white steam balls on a (hidden) joint."""
    x, y, z = at
    k = size
    rig.joint(name, joint, at, hidden=hidden)
    g = Geo()
    for dx, dz, r in ((0, 0, 3.4), (3.8, 2.0, 2.8), (-2.8, 3.0, 2.6), (1.4, 5.0, 2.3), (5.6, 5.4, 1.8)):
        g.sphere((x + dx * k, y - 2, z + dz * k), r * k, cuts=4)
    rig.part(name, g, color, finish="dust", outline=0.8)


def pennant(rig, parent, pole_base, height, length=16.0, name="pennant", pole=IRON_DK, tip=BRASS_LT,
            w=9.0, gain=1.2, max_deg=18):
    """A pole with a team swallowtail pennant (the heavies' team cue) on follow-through."""
    return _M.pennant(rig, parent, pole_base, height, length=length, name=name, pole=pole, tip=tip, w=w,
                      gain=gain, max_deg=max_deg)


# -- walker (steam golem) ----------------------------------------------------------------------
def walker_leg(rig, s, hip, thigh, shin, parent="hips"):
    x, y, z = hip
    knee = (x, y, z - thigh)
    ankle = (x, y, z - thigh - shin)
    rig.joint(f"thigh_{s}", parent, hip)
    rig.joint(f"shin_{s}", f"thigh_{s}", knee)
    rig.joint(f"foot_{s}", f"shin_{s}", ankle)
    return knee, ankle


def leg_ik(s, hip_xz, target_xz, l1, l2, knee_fwd=True, body_r=0.0, foot_r=0.0):
    a, f = ik2(hip_xz, target_xz, l1, l2, elbow_down=not knee_fwd)
    return {f"thigh_{s}": {"r": a + 90.0}, f"shin_{s}": {"r": f - a},
            f"foot_{s}": {"r": -(f + 90.0) - body_r + foot_r}}


def walker_cycle(f, n, stride, lift, phase=0.0):
    u = ((f / n) + phase) % 1.0
    if u < 0.5:
        t = u / 0.5
        return stride / 2 - stride * t, 0.0, True
    t = (u - 0.5) / 0.5
    e = t * t * (3 - 2 * t)
    return -stride / 2 + stride * e, lift * math.sin(math.pi * t), False


# -- vehicle: a track belt around any rounded polygon (the landship's rhomboid) -------------------
def _rounded_path(corners, radius, n_arc=6):
    """Points around a closed polygon (x, z corners, clockwise on screen), each corner rounded with
    `radius` (a number or one per corner). Returns ([(x, z, s)], total length)."""
    n = len(corners)
    radii = radius if isinstance(radius, (list, tuple)) else [radius] * n
    pts = []
    for i in range(n):
        p0, p1, p2 = corners[i - 1], corners[i], corners[(i + 1) % n]
        a = (p0[0] - p1[0], p0[1] - p1[1])
        b = (p2[0] - p1[0], p2[1] - p1[1])
        la, lb = math.hypot(*a), math.hypot(*b)
        ua, ub = (a[0] / la, a[1] / la), (b[0] / lb, b[1] / lb)
        cosang = max(-1.0, min(1.0, ua[0] * ub[0] + ua[1] * ub[1]))
        ang = math.acos(cosang)
        r = radii[i]
        d = r / math.tan(ang / 2)
        d = min(d, la * 0.45, lb * 0.45)
        r = d * math.tan(ang / 2)
        s0 = (p1[0] + ua[0] * d, p1[1] + ua[1] * d)
        s1 = (p1[0] + ub[0] * d, p1[1] + ub[1] * d)
        bis = (ua[0] + ub[0], ua[1] + ub[1])
        lbis = math.hypot(*bis)
        cdist = r / math.sin(ang / 2)
        c = (p1[0] + bis[0] / lbis * cdist, p1[1] + bis[1] / lbis * cdist)
        a0 = math.atan2(s0[1] - c[1], s0[0] - c[0])
        a1 = math.atan2(s1[1] - c[1], s1[0] - c[0])
        da = a1 - a0
        while da > math.pi:
            da -= 2 * math.pi
        while da < -math.pi:
            da += 2 * math.pi
        for k in range(n_arc + 1):
            t = a0 + da * k / n_arc
            pts.append((c[0] + r * math.cos(t), c[1] + r * math.sin(t)))
    out, s = [], 0.0
    for i, p in enumerate(pts):
        if i:
            s += math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])
        out.append((p[0], p[1], s))
    total = s + math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1])
    return out, total


def _along(path, total, s):
    s %= total
    n = len(path)
    for i in range(n):
        x0, z0, s0 = path[i]
        x1, z1, _ = path[(i + 1) % n]
        s1 = path[i + 1][2] if i + 1 < n else total
        if s <= s1:
            u = (s - s0) / max(1e-6, s1 - s0)
            return (x0 + (x1 - x0) * u, z0 + (z1 - z0) * u), math.atan2(z1 - z0, x1 - x0)
    return (path[0][0], path[0][1]), 0.0


def poly_tread(rig, prefix, parent, corners, radius, y, width, pitch, color=COAL, tooth=IRON_LT,
               thick=3.4, n_arc=6, plate_step=None, plate=IRON_DK):
    """A full-length track belt around a rounded polygon (clockwise on screen: top run forward).
    The belt is plates (one capsule per path segment) plus TREAD_PHASES phase-shifted copies of the
    grouser teeth on hidden joints `<prefix>_ph<k>`; `tread_pose` shows the copy for a step."""
    path, total = _rounded_path(corners, radius, n_arc)
    g = Geo()
    for i in range(len(path)):
        a = path[i]
        b = path[(i + 1) % len(path)]
        g.capsule((a[0], y, a[1]), (b[0], y, b[1]), thick, segs=10, rings=2)
    rig.part(parent, g, color, finish="gloss")
    for k in range(TREAD_PHASES):
        name = f"{prefix}_ph{k}"
        rig.joint(name, parent, (0, y, 0), hidden=True)
        g = Geo()
        s = pitch * k / TREAD_PHASES
        while s < total - 1e-6:
            (px, pz), ang = _along(path, total, s)
            nx, nz = math.sin(ang), -math.cos(ang)
            cx, cz = px + nx * thick * 0.85, pz + nz * thick * 0.85
            g.blob((cx, y - 0.3, cz), (pitch * 0.30, width * 0.5 + 0.4, 1.5), p=3.0,
                   rot=(0, -math.degrees(ang), 0))
            s += pitch
        rig.part(name, g, tooth, finish="metal", outline=0.5)
    return total


def poly_tread_pose(prefix, step, dist_per_step, pitch):
    d = dist_per_step * step
    k = int(round((d % pitch) / pitch * TREAD_PHASES)) % TREAD_PHASES
    return {f"{prefix}_ph{k}": {"show": True}}


def wheel_row(rig, prefix, parent, xs, z, y, r, color=IRON_DK, hub=BRASS, bolts=5):
    """Road wheels on their own joints (`<prefix><i>`), spun by `wheel_spin`."""
    names = []
    for i, x in enumerate(xs):
        name = f"{prefix}{i}"
        rig.joint(name, parent, (x, y, z))
        g = Geo().lathe([(0, -2.0), (r, -2.0), (r, 1.4), (0, 1.4)], (x, y - 0.6, z), (x, y - 1.6, z), segs=18)
        rig.part(name, g, color, finish="metal")
        g = Geo().lathe([(0, -0.6), (r * 0.42, -0.6), (r * 0.36, 0.8), (0, 1.0)], (x, y - 2.6, z), (x, y - 3.6, z),
                        segs=14)
        rig.part(name, g, hub, finish="metal", outline=0.4)
        g = Geo()
        for b in range(bolts):
            a = 2 * math.pi * b / bolts
            g.sphere((x + r * 0.68 * math.cos(a), y - 3.0, z + r * 0.68 * math.sin(a)), 0.9, cuts=2)
        rig.part(name, g, IRON_LT, finish="metal", outline=0)
        names.append((name, r))
    return names


def wheel_spin(names, dist):
    return {n: {"r": -math.degrees(dist / r)} for n, r in names}
