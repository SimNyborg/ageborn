"""War Hound: the Kennel Master's summon (CONTENT_PLAN 5.3, X0 M3). A hunting hound, bite, ~44 lu.

The Hunting Wolves rig at hound proportions: a leaner, short-coated body, a tan-brown coat with a
cream chest and muzzle, a dark saddle, and the same team vest, collar and leg wraps (the collar
carries the bone tag, here the kennel's tally). The game draws summons at 0.8 scale with a summon
ring (CONTENT_PLAN 7). Coat colours stay below 40% saturation (A11 colour rule).

"A viewer expects it to lunge and bite, and to bound along at the master's heel."

Clips: the wolf's (idle sniff and wag, bounding run at 90 x 1.25 = 112.5 lu/s, lunge-bite and
shake, rear-up snap, low nip, beast hit, D4 flop) at hound proportions and timing.
"""
from units import hunting_wolves as W

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
RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.build(rig, HOUND, HEIGHT_LU)


def clips():
    return W.clips()
