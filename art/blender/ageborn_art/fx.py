"""Shared clip timing and the death hand-off (no blood, DESIGN A11).

A unit's own die clip is 3 frames: a knockback fling with a 20 degree spin, a squash, and a
hand-off frame. The dust poof and KO stars are shared effects (`fx.dust_poof`,
`fx.ko_stars`, rendered once by units/fx_dust_poof.py and units/fx_ko_stars.py) that the
game spawns at the times in the die clip's `fx` metadata, scaled to the unit's width.
"""

# -- standard clip timing (ms per playback step) --------------------------------------------
IDLE_SEQUENCE = [0, 1, 2, 3, 2, 1]        # 4 unique poses, ping-pong: 1.2 s breathing loop
IDLE_MS = 200
WALK_MS = [62, 63, 62, 63, 62, 63, 62, 63]  # 8 frames, 0.5 s cycle (A11 walk at 80 lu/s)
# melee: anticipation, anticipation, held extreme, smear, held impact, 3 recovery frames
MELEE_MS = [83, 83, 167, 42, 125, 83, 83, 83]
MELEE_SMEAR = 3
MELEE_IMPACT = 4
HIT_MS = [83, 83, 83]
DIE_MS = [83, 83, 83]


def death_meta(height_lu):
    """Die clip metadata: when and where the game spawns the shared poof and stars.
    atMs is from the start of the die clip; offsetLu is from the unit's feet."""
    return {
        "fx": [
            {"id": "fx.dust_poof", "atMs": 166, "offsetLu": [0, round(height_lu * 0.42, 1)]},
            {"id": "fx.ko_stars", "atMs": 249, "offsetLu": [0, round(height_lu * 0.62, 1)],
             "loops": 2, "scalePow": 0.5},
        ],
        "hideUnitAtMs": 249,
    }


def die_pose(f, extra=None):
    """Body channels of the 3 death frames (units merge limb flails on top):
    0 fling back and up with a 20 degree spin, 1 squash, 2 hand-off (flattened, small)."""
    table = [
        {"body": {"x": -6.0, "z": 5.0, "r": 20.0, "sz": 1.12, "sx": 0.92, "sy": 0.92}},
        {"body": {"x": -8.0, "z": 0.0, "r": 12.0, "sz": 0.72, "sx": 1.26, "sy": 1.26}},
        {"body": {"x": -8.0, "z": 0.0, "r": 6.0, "s": 0.82, "sz": 0.5, "sx": 1.4, "sy": 1.4}},
    ]
    return table[max(0, min(2, f))]
