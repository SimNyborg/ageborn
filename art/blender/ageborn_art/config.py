"""Shared constants for the pre-rendered sprite pipeline.

All geometry is authored in lu (lane units, DESIGN A2.1): 1 Blender unit = 1 lu.
The in-game world scale at 1280 px wide is 0.82 px/lu (DESIGN A11), so a 68 lu
infantry unit is about 56 px tall. Sheets are rendered at RENDER_SCALE times that
and tagged with `meta.scale` so Pixi shows them at the right logical size.
"""

# World scale (DESIGN A11): px per lu at a 1280 px wide canvas.
PX_PER_LU_1X = 0.82
# Sheets are rendered at 2x (DPR 2 phones and desktops), the maximum the budget allows.
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

# Outline width: 3 px at 720p = about 3.7 lu (DESIGN A11). Inverted-hull thickness in lu.
OUTLINE_LU = 3.0
OUTLINE_THIN_LU = 1.8

# Clip playback rate for every sprite clip. The game time-scales attack clips so that
# `impactAt` lands on the sim's impact tick (DESIGN B5), so this is only the authoring rate.
FPS = 12

# Camera: orthographic, looking along +Y, tilted down a little so tops of heads read.
CAMERA_ELEVATION_DEG = 12.0
# Characters face +X (screen right). Yawing them toward the camera shows chest and face.
CHARACTER_YAW_DEG = -32.0

# Toon lighting, computed in the shader from world-space normals (no lamps, no noise).
# LIGHT_DIR points from the surface toward the light: above, in front (camera side), a bit right.
LIGHT_DIR = (0.30, -0.50, 0.81)
# Surfaces with dot(N, L) above this are lit; below are the shadow band.
LIGHT_THRESHOLD = 0.02
# Width of the soft terminator in dot units (0 = hard edge; a little softness antialiases).
TERMINATOR_SOFTNESS = 0.06
# Highlight: one glossy shape per part (DESIGN A11) where dot(N, H) is near 1.
HIGHLIGHT_DIR = (-0.05, -0.55, 0.83)
HIGHLIGHT_SOFTNESS = 0.02
SHADOW_FACTOR = 0.82        # shadow = fill darkened 18% (DESIGN A11)
# Surface finishes. Matte follows A11 exactly; gloss (plastic, visors) and metal (plate
# armour, blades) get a larger, brighter highlight and, for metal, a deeper shadow band.
FINISHES = {
    "matte": {"shadow": 0.82, "gradient": 0.22, "hl_threshold": 0.93, "hl_mix": 0.32},
    "gloss": {"shadow": 0.80, "gradient": 0.22, "hl_threshold": 0.90, "hl_mix": 0.60},
    "metal": {"shadow": 0.70, "gradient": 0.34, "hl_threshold": 0.86, "hl_mix": 0.62},
}
OUTLINE_FACTOR = 0.55       # outline = fill darkened 45% (DESIGN A11)
TEAM_HIGHLIGHT_ALPHA = 0.30 # white overlay drawn over the tinted team layer for its highlight
TEAM_RIM_ALPHA = 0.22
# FINISHES["gradient"]: in-band gradient (fraction darker away from the light), in linear light.
# Ambient occlusion: darkens creases between parts (arm against torso, under the helmet).
AO_DISTANCE = 6.0   # lu
AO_STRENGTH = 0.45
AO_SAMPLES = 8
# Rim light: a thin lighter edge just inside the outline on the lit side.
RIM_LO, RIM_HI = 0.62, 0.80
RIM_STRENGTH = 0.8
RIM_MIX = 0.35

# Render quality. Emission-only shading needs samples just for antialiasing.
SAMPLES = 12
THREADS = 2  # the machine is shared with other agents

# Team colours (DESIGN A11) used for previews; the game tints the team layer at runtime.
TEAM_COLORS = {
    "blue": "#2F7DF6",
    "orange": "#F28A1E",
    "cb_blue": "#2F7DF6",
    "cb_yellow": "#F2C21E",
    "hc_blue": "#1F5FD6",
    "hc_orange": "#FF6A00",
}

# Preview background for GIFs (GIF has no partial alpha): a desaturated sky.
PREVIEW_BG = "#C9DCE6"
