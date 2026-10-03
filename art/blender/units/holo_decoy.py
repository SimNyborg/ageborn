"""Holo Decoy: the Holo Projector's summon (CONTENT_PLAN 5.7, X0 M3). A hologram of a Photon Knight, ~70 lu
(the game draws summons at 0.8 scale with a summon ring).

Look: the Photon Knight's shape, sword and moves, re-lit as a projection: every white plate is a pale
mint glass, the charcoal suit a deeper mint, the trim a light mint, so the figure reads as light; the team
plates stay team-coloured (it is still one of yours) and the blade stays the bright mint photon sword.
It deals almost no damage, so the swing is the knight's own (the decoy draws fire, it does not fight).

"A viewer expects a hologram of a knight: the same knight, but glassy and see-through-looking."

Animation: the Photon Knight's clips (idle hum, the G1 jog at 93.75 lu/s, the spin-dash cleave, the
overhead chop, the lunge thrust, the armoured hit, the D2 topple), retinted.
"""
from ageborn_art import kit_future as KF
from ageborn_art import rigs_future as F

from units import photon_knight as P

SLUG = "holo_decoy"
GAIT_NAME = P.GAIT_NAME
NAME = "Holo Decoy"
HEIGHT_LU = P.HEIGHT_LU
CANVAS = P.CANVAS
FEET = P.FEET
ANCHORS = dict(P.ANCHORS)
NO_RETIME = True

HOLO_PLATE = "#C8FBEA"
HOLO_SUIT = "#2F8C76"
HOLO_TRIM = "#7FE6C8"
HOLO_DARK = "#1E5F52"

_PATCH = {"ARMOR": HOLO_PLATE, "SUIT": HOLO_SUIT, "SUIT_LT": HOLO_TRIM, "TRIM": HOLO_TRIM, "GUNMETAL": HOLO_DARK,
          "STEEL": HOLO_TRIM, "VISOR_DARK": HOLO_DARK}


def build(rig):
    saved = {k: getattr(F, k) for k in _PATCH}
    legs = KF.legs_v3
    try:
        for k, v in _PATCH.items():
            setattr(F, k, v)
        KF.legs_v3 = lambda r, **kw: legs(r, suit=HOLO_SUIT, armor=HOLO_PLATE, **kw)
        P.build(rig)
    finally:
        for k, v in saved.items():
            setattr(F, k, v)
        KF.legs_v3 = legs


def clips():
    return P.clips()
