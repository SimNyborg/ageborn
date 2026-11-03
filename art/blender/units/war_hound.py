"""War Hound: the Kennel Master's summon (CONTENT_PLAN 5.3, X0 M3). A hunting hound, bite, ~44 lu.

The Hunting Wolves rig at hound proportions: a leaner, short-coated body, a tan-brown coat with a
cream chest and muzzle, a dark saddle, and the same team vest, collar and leg wraps (the collar
carries the bone tag, here the kennel's tally). The game draws summons at 0.8 scale with a summon
ring (CONTENT_PLAN 7). Coat colours stay below 40% saturation (A11 colour rule).

Detail standard (art round W2, Track MEDIEVAL): the wolf's recipe (W1: the team vest in two tones,
the two-tone coat with a cream underside and a dark saddle) with the hound's palette, and a war
dog's spiked iron collar: six spikes round the team collar (the ones at the nape and the throat
break the neck's outline). Damage spots: the vest tears and a strip hangs from its hem, scuffs on
the near shoulder and haunch, breath puffs from the nose.

"A viewer expects it to lunge and bite, and to bound along at the master's heel."

Clips: the wolf's (idle sniff and wag, bounding run at 90 x 1.25 = 112.5 lu/s, lunge-bite and
shake, rear-up snap, low nip, beast hit, D4 flop) at hound proportions and timing.
"""
import math

from ageborn_art.geometry import Geo
from units import hunting_wolves as W
from units import medieval_w2 as MW

SLUG = "war_hound"
GAIT_NAME = "quad"
NAME = "War Hound"
HEIGHT_LU = 44
YAW_DEG = -10.0
CANVAS = (236, 176)
FEET = (100, 160)
ANCHORS = {"head": (14, 42), "hitCenter": (0, 21)}
NO_RETIME = True

HOUND = dict(W.WOLF, fur="#9A8570", fur_dk="#79685A", saddle="#5A4B40", cream="#E3D8C5",
             scale=0.86, dz=3.0, vest_z=21.0, head_scale=1.42, speed=112.5, cycle=520, bob=5.4)
IRON = "#A9B1BA"        # the collar's spikes
RIG = None

# the detail standard: the wolf's beast recipe with the hound's palette and the iron of its collar
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = MW.HIGHLIGHT_BEAST
LOOK_SHADE = MW.SHADE_BEAST
LOOK_RIM = MW.RIM_BEAST
MATERIAL_KINDS = dict(W.kinds_of(HOUND), **MW.kinds({IRON: "iron"}))


def build(rig):
    global RIG
    RIG = rig
    W.build(rig, HOUND, HEIGHT_LU)
    _spiked_collar(rig)
    if getattr(rig, "skin", None) is None:
        _damage_spots(rig)


def _spiked_collar(rig):
    """Six iron spikes standing out of the team collar's middle (the wolf's collar: a band lathed from
    (14.5, 0, 28.5) toward (18, 0, 35.5), radius 8.6), from the nape round the camera side to the throat."""
    p0, p1 = (14.5, 0.0, 28.5), (18.0, 0.0, 35.5)
    L = math.dist(p0, p1)
    a = tuple((q - p) / L for p, q in zip(p0, p1))      # the collar's axis
    e1 = (0.0, -1.0, 0.0)                               # toward the camera
    e2 = (a[2], 0.0, -a[0])                             # forward and down, square to the axis
    c = tuple(p + 2.1 * d for p, d in zip(p0, a))       # half way up the band
    g = Geo()
    for deg in (-80, -48, -16, 16, 48, 80):
        t = math.radians(deg)
        u = tuple(math.cos(t) * x + math.sin(t) * y for x, y in zip(e1, e2))
        base = tuple(ci + 8.2 * ui for ci, ui in zip(c, u))
        g.lathe([(1.5, 0), (1.05, 1.7), (0, 4.2)], base, tuple(b + ui for b, ui in zip(base, u)), segs=10)
    rig.part("neck", g, IRON, finish="metal", outline=0.5)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, beast; the wolf's at hound size, the body x 0.86): the team vest
    tears and a strip hangs from its hem, scuffs on the near shoulder and haunch, breath puffs from the nose."""
    rig.damage_spot_at("vest", "chest", 1.5, 27.5, 6.0, "hide", team=True)
    rig.damage_spot_at("shoulder", "leg_fr", 10.0, 16.5, 5.0, "hide")
    rig.damage_spot_at("haunch", "leg_br", -12.0, 19.0, 5.0, "hide")
    rig.damage_spot_at("hem", "chest", 1.5, 22.0, 7.0, "hide", kind="strip", team=True)
    rig.damage_spot("breath", "head", (34.0, -0.3, 33.6), 3.5, "breath", kind="emit", normal=(1, 0, 0))


def clips():
    return W.clips()
