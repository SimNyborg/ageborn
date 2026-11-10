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
from ageborn_art import rigs_future as F

from units import futcos_w4 as FW
from units import photon_knight as P

SLUG = "holo_decoy"
GAIT_NAME = P.GAIT_NAME
NAME = "Holo Decoy"
HEIGHT_LU = P.HEIGHT_LU
CANVAS = P.CANVAS
FEET = P.FEET
ANCHORS = dict(P.ANCHORS)
NO_RETIME = True

HOLO_PLATE = "#B2EAD6"         # (W4: #C8FBEA; a step down, like the knight's white, for the highlight share)
HOLO_SUIT = "#2F8C76"
HOLO_TRIM = "#7FE6C8"
HOLO_DARK = "#1E5F52"
HOLO_LINE, HOLO_WEAR, HOLO_FOLD = "#8CD3BC", "#A4E1CB", "#3E9C85"

# the detail standard (art round W4): the knight's lifts, and the knight's colours re-lit as a projection by the
# palette (look.remap; W4 replaces the build-time patching of rigs_future, which missed the W4 armour tones)
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = P.LOOK_HIGHLIGHT
LOOK_SHADE = P.LOOK_SHADE
LOOK_RIM = P.LOOK_RIM
SKIN_PALETTE = FW.skin_palette({FW.ARMOR: HOLO_PLATE, F.ARMOR: HOLO_PLATE, F.SUIT: HOLO_SUIT, F.SUIT_LT: HOLO_TRIM,
                                F.TRIM: HOLO_TRIM, F.GUNMETAL: HOLO_DARK, F.STEEL: HOLO_TRIM, F.VISOR_DARK: HOLO_DARK,
                                F.CHARCOAL: HOLO_DARK, FW.LINE_ON_WHITE: HOLO_LINE, FW.WEAR_ON_WHITE: HOLO_WEAR,
                                FW.FOLD_ON_SUIT: HOLO_FOLD, FW.LINE_ON_SUIT: HOLO_DARK, FW.WEAR_ON_SUIT: HOLO_FOLD})
MATERIAL_KINDS = FW.kinds({c: "polymer" for c in (HOLO_PLATE, HOLO_SUIT, HOLO_TRIM, HOLO_DARK, HOLO_LINE, HOLO_WEAR,
                                                  HOLO_FOLD)} | {"team": "polymer"})


def build(rig):
    mat = P.SPOT_MAT
    P.SPOT_MAT = "energy"       # energy family: the knight's marks as glitches, and motes
    try:
        P.build(rig)
    finally:
        P.SPOT_MAT = mat


def clips():
    return P.clips()
