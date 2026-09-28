"""Heroic style constants (exploration; see styles/heroic/render.py).

The heroic look keeps the shipping contract of the base pipeline (feet anchor, tint-underlay
team layer, PixiJS atlas, clip metadata) and changes the art: proportions, materials,
lighting and animation. Everything here is read by hero/materials.py, hero/render.py and
hero/pipeline.py; the shared `ageborn_art` library is used read-only.
"""

# Render scale: the same as the v3 shipping sheets (HD 2.46 px/lu, @1x 1.23 px/lu), so sheet
# sizes compare one to one with today's art.
UNIT_SCALE = 3.0
# The phone the owner plays on (844 x 390 CSS px, render/layout.ts): lane band 68% of the
# height shows 290 lu, so 0.9145 px/lu; a 68 lu infantry unit is 62 px tall.
PHONE_W, PHONE_H = 844, 390
PHONE_PX_PER_LU = 390 * 0.68 / 290.0

# Camera: a little more from above than the base style (backs of shoulders and helmet tops
# read), and bipeds turned further toward the camera so chests, faces and shields show.
CAMERA_ELEVATION_DEG = 18.0
BIPED_YAW_DEG = -20.0
RIDER_YAW_DEG = -12.0

# -- lighting (computed in the shader; symmetric in x so mirrored sprites light the same) --
KEY_DIR = (0.0, -0.50, 0.866)        # from the front and above
TERMINATOR = 0.22                    # dot(N, key) where the lit band starts
TERMINATOR_SOFT = 0.07               # painted soft edge (the base style is a hard 0.03)
# View direction toward the camera (orthographic, elevation 18 degrees)
import math as _m
VIEW_DIR = (0.0, -_m.cos(_m.radians(CAMERA_ELEVATION_DEG)), _m.sin(_m.radians(CAMERA_ELEVATION_DEG)))
# rim light: grazing edges that face up or sideways (never a side light: mirroring)
RIM_EDGE = (0.50, 0.80)              # 1 - |N.V| range
RIM_UP = (-0.35, 0.45)               # N.z range that fades the rim in
RIM_COLOR = "#FFF3DC"
# ambient occlusion: deeper than the base style (creases between armour plates and limbs)
AO_DISTANCE = 5.0
AO_STRENGTH = 0.55
AO_SAMPLES = 10
# ground occlusion: parts near the ground are a little darker (grounds the unit)
GROUND_AO = (0.80, 26.0)             # factor at z = 0, fades out by this height (lu)
# far-side limbs (behind the body) are darker for depth
FAR_FACTOR = 0.78
# bounce light on down-facing surfaces (a warm lift from the ground)
BOUNCE_COLOR = "#B8A58A"
BOUNCE_MIX = 0.16

# Surface finishes: shadow factor, in-band gradient, specular threshold/mix/colour,
# rim strength, env reflection (metals), fresnel sheen (fur, velvet), warm terminator (skin)
FINISHES = {
    "cloth":   dict(shadow=0.60, grad=0.20, spec=None, rim=0.55),
    "fur":     dict(shadow=0.58, grad=0.24, spec=None, rim=0.85, sheen=0.22),
    "hair":    dict(shadow=0.55, grad=0.22, spec=(0.93, 0.30, "#F2DDC0"), rim=0.60),
    "skin":    dict(shadow=0.66, grad=0.16, spec=(0.95, 0.22, "#FFFFFF"), rim=0.65, warm=0.35),
    "leather": dict(shadow=0.56, grad=0.24, spec=(0.88, 0.22, "#FFF1DD"), rim=0.60),
    "wood":    dict(shadow=0.58, grad=0.22, spec=(0.94, 0.12, "#FFF1DD"), rim=0.55),
    "stone":   dict(shadow=0.55, grad=0.26, spec=None, rim=0.70),
    "bone":    dict(shadow=0.70, grad=0.16, spec=(0.92, 0.30, "#FFFFFF"), rim=0.50),
    "gloss":   dict(shadow=0.62, grad=0.18, spec=(0.86, 0.75, "#FFFFFF"), rim=0.70),
    "metal":   dict(shadow=0.50, grad=0.10, spec=(0.90, 0.85, "#FFFFFF"), rim=0.80, env=True),
    "gold":    dict(shadow=0.52, grad=0.10, spec=(0.90, 0.80, "#FFF8E0"), rim=0.80, env=True),
    "dark":    dict(shadow=0.62, grad=0.16, spec=(0.88, 0.40, "#C8D0DC"), rim=0.70),
}
# stylised chrome: brightness of the reflection by the reflected ray's height (-1 ground ..
# 1 sky), with a dark horizon band and a bright line just above it
ENV_RAMP = [(0.00, 0.55), (0.40, 0.62), (0.47, 0.34), (0.515, 0.30), (0.54, 1.25), (0.60, 0.98),
            (0.80, 0.90), (1.00, 1.10)]

# -- team layer --------------------------------------------------------------------------------
TEAM_SHADOW = 0.60            # grey of the team layer in shadow (x team colour)
TEAM_SPEC_ALPHA = 0.45        # white specular drawn over the tinted team layer
TEAM_RIM_ALPHA = 0.42         # white rim drawn over the tinted team layer
TEAM_MIN_PCT = 18.0

# -- outlines ----------------------------------------------------------------------------------
INTERIOR_LINE_LU = 0.8
INTERIOR_LINE_FACTOR = 0.42
# outer line: px at the 0.82 px/lu reference scale, fill factor, HSV value cap
OUTER_OUTLINE = (2.3, 0.34, 0.30)

# -- motion trails -----------------------------------------------------------------------------
TRAIL_CORE = "#FFFDF4"        # white-hot core (base layer)
TRAIL_TEAM_GREY = 0.95        # the fringe goes into the team layer (team coloured trail)

# preview background (GIF)
PREVIEW_BG = "#C9DCE6"
TEAM_COLORS = {"blue": "#2F7DF6", "orange": "#F28A1E"}
