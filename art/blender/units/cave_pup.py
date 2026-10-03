"""Cave Pup: the Beast Caller's summon (CONTENT_PLAN 5.1, X0 M3). A wolf pup, bite, ~36 lu.

The Hunting Wolves rig at pup proportions: a smaller, rounder body, a big head with big eyes,
floppy-tipped ears, a sandy-grey coat with a cream face, and the same team vest, collar and
wraps (drawn at 0.8 scale with a summon ring by the game, CONTENT_PLAN 7).

"A viewer expects it to nip and yap, and to scamper."

Clips: the wolf's (idle sniff and wag, bounding scamper at 90 x 1.25 = 112.5 lu/s, lunge-bite and
shake, rear-up snap, low nip, beast hit, D4 flop) at pup proportions and timing.
"""
from units import hunting_wolves as W

SLUG = "cave_pup"
GAIT_NAME = "quad"
NAME = "Cave Pup"
HEIGHT_LU = 38
YAW_DEG = -10.0
CANVAS = (208, 160)
FEET = (90, 144)
ANCHORS = {"head": (12, 36), "hitCenter": (0, 18)}
NO_RETIME = True

PUP = dict(W.WOLF, fur="#A39A8A", fur_dk="#80786C", saddle="#6A6359", cream="#E8DFCC",
           scale=0.74, dz=2.0, vest_z=20.5, head_scale=1.6, speed=112.5, cycle=500, bob=6.4)
RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.build(rig, PUP, HEIGHT_LU)


def clips():
    return W.clips()
