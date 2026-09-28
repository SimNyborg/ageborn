"""Shared constants for the pre-rendered sprite pipeline.

All geometry is authored in lu (lane units, DESIGN A2.1): 1 Blender unit = 1 lu.
The in-game world scale at 1280 px wide is 0.82 px/lu (DESIGN A11), so a 68 lu
infantry unit is about 56 px tall. Sheets are rendered at RENDER_SCALE times that
and tagged with `meta.scale` so Pixi shows them at the right logical size.
"""

# World scale (DESIGN A11): px per lu at a 1280 px wide canvas.
PX_PER_LU_1X = 0.82
# Sheets are rendered at 2x (DPR 2) by default; 1.5 is the size-budget setting.
# Unit CANVAS/FEET values are authored in px at 2x and scaled by set_render_scale().
RENDER_SCALE = 2
PX_PER_LU = PX_PER_LU_1X * RENDER_SCALE


def set_render_scale(scale):
    """Override the sheet scale (e.g. 1.5 for a smaller download) before rendering."""
    global RENDER_SCALE, PX_PER_LU
    RENDER_SCALE = scale
    PX_PER_LU = PX_PER_LU_1X * scale


def px(v):
    """A pixel size authored at 2x, converted to the current render scale."""
    return int(round(v * RENDER_SCALE / 2))


# -- outlines ---------------------------------------------------------------------------
# Outer silhouette outline: added after rendering (sheet.outline), 3 px at 1x (DESIGN A11
# width), in the nearest fill colour x 0.40 capped at HSV value 0.38 (darker than A11's
# x 0.55 on purpose: it is what keeps the unit edge readable at 56 px; see README).
OUTER_OUTLINE_PX_1X = 3.0
# ...and it also covers the silhouette's own edge band this wide (the interior hull line
# there would otherwise make a soft double edge), so the line's inner edge stays crisp.
OUTER_OUTLINE_INNER_PX_1X = 0.9
OUTER_OUTLINE_FACTOR = 0.40
OUTER_OUTLINE_MAX_V = 0.38
# Interior lines between parts: inverted hulls, thin and lighter than the outer line.
OUTLINE_LU = 1.2
OUTLINE_FACTOR = 0.60       # interior line = fill x 0.60

# Unit sheets v3 (art director review): colour-matched, thinner outer line (about 3 lu), a
# sharper pixel filter, and sheets rendered at 2.46 px/lu (@2x) with a 1.23 px/lu (@1x) sheet
# downsampled from the same frames. World renders (bases, turrets) keep the settings above.
UNIT_OUTLINE_V3 = (2.5, 0.55, 0.50)   # px at 1x, fill factor, HSV value cap
CHARACTER_YAW_V3 = -10.0              # bipeds closer to profile (facing reads at 56 px)
UNIT_SCALE_V3 = 3.0                    # render scale of the @2x sheet (0.82 x 3 = 2.46 px/lu)
UNIT_SCALE_LEGENDARY_V3 = 2.5          # Legendaries (>= 170 lu): 2.05 px/lu HD, 1.03 px/lu 1x
LEGENDARY_MIN_LU_V3 = 170
FILTER_WIDTH = 1.5                     # Cycles pixel filter width (v3 units: 1.0)

# Clip timing: the authoring rate for clips without explicit per-frame durations. The game
# time-scales attack clips so that `impactAt` lands on the sim's impact tick (DESIGN B5).
FPS = 12
FRAME_MS = 83

# Camera: orthographic, looking along +Y, tilted down so tops of heads and backs read.
CAMERA_ELEVATION_DEG = 16.0
# Characters face +X (screen right). Yawing them toward the camera shows chest and face.
# Bipeds use this; rider, quadruped and vehicle rigs set YAW_DEG = -10 in their module.
CHARACTER_YAW_DEG = -18.0

# Toon lighting, computed in the shader from world-space normals (no lamps, no noise).
# LIGHT_DIR points from the surface toward the light: above and in front, with no side
# component, so mirrored (opponent) sprites are lit exactly like the player's.
LIGHT_DIR = (0.0, -0.3493, 0.9370)
# Surfaces with dot(N, L) above this are lit; below are the shadow band. 0.30 puts
# undersides, chins, under-arms, inner legs and bellies in shadow (about a third of a part).
LIGHT_THRESHOLD = 0.30
# Width of the soft terminator in dot units (0 = hard edge; a little softness antialiases).
TERMINATOR_SOFTNESS = 0.03
# Highlight: one glossy shape per part (DESIGN A11) where dot(N, H) is near 1.
HIGHLIGHT_DIR = (0.0, -0.45, 0.893)
HIGHLIGHT_SOFTNESS = 0.02
# Surface finishes. shadow = fill x factor (A11 says 0.82; we use a deeper band, see
# README), gradient = in-band darkening away from the light, hl_* = the highlight shape.
# hl_color: what the highlight mixes toward (white, or a warm brown for hair and fur).
FINISHES = {
    "matte": {"shadow": 0.74, "gradient": 0.08, "hl_threshold": 0.93, "hl_mix": 0.32},
    "gloss": {"shadow": 0.72, "gradient": 0.08, "hl_threshold": 0.90, "hl_mix": 0.60},
    "metal": {"shadow": 0.65, "gradient": 0.14, "hl_threshold": 0.86, "hl_mix": 0.62},
    "hair":  {"shadow": 0.74, "gradient": 0.08, "hl_threshold": 0.90, "hl_mix": 0.12,
              "hl_color": "#E0C29A"},
    # polished bronze (Bronze Age accents, A17.12): a deep warm shadow and a big, clearly
    # visible warm specular so the metal reads as polished, not khaki
    "bronze": {"shadow": 0.60, "gradient": 0.16, "hl_threshold": 0.78, "hl_mix": 0.72,
               "hl_color": "#FFF3D6"},
    # dust and smoke: a soft, light shadow so puffs read as air, not rocks
    "dust":  {"shadow": 0.87, "gradient": 0.04, "hl_threshold": 0.90, "hl_mix": 0.30},
}
# Warm materials (hue 15-75 degrees) shift their shadow this many degrees toward red.
WARM_SHADOW_HUE_SHIFT = 8.0
TEAM_HIGHLIGHT_ALPHA = 0.30  # white overlay drawn over the tinted team layer for its highlight
TEAM_RIM_ALPHA = 0.22
# Ambient occlusion: a light touch in creases between parts (arm against torso).
AO_DISTANCE = 3.0   # lu
AO_STRENGTH = 0.35
AO_SAMPLES = 8
# Rim light: a thin lighter edge just inside the outline on the lit side.
RIM_LO, RIM_HI = 0.62, 0.80
RIM_STRENGTH = 0.8
RIM_MIX = 0.35

# Secondary motion (plume, tail, pennant, hair, hem): a damped spring per joint that lags
# its parent by 1-2 frames and overshoots about 20% (anim.py follow_through).
SPRING_HZ = 2.2
SPRING_DAMPING = 0.42

# Render quality. Emission-only shading needs samples just for antialiasing.
import os as _os
SAMPLES = int(_os.environ.get("AGEBORN_SAMPLES", "12"))
THREADS = 2  # the machine is shared with other agents

# Team colours (DESIGN A11) used for previews; the game tints the team layer at runtime.
TEAM_COLORS = {
    "blue": "#2F7DF6",
    "orange": "#F28A1E",
    "cb_yellow": "#F2C21E",   # Blue/Yellow preset (its blue is the default blue)
    "hc_blue": "#1F5FD6",
    "hc_orange": "#FF6A00",
}
# Shared death effects (fx.dust_poof, fx.ko_stars) are rendered once for a unit this wide;
# the game scales them by the unit's widthLu / FX_REF_WIDTH_LU.
FX_REF_WIDTH_LU = 80

# Minimum share of the silhouette that must be team-coloured on every frame.
TEAM_COVERAGE_MIN_PCT = 18.0

# Preview background for GIFs (GIF has no partial alpha): a desaturated sky.
PREVIEW_BG = "#C9DCE6"
