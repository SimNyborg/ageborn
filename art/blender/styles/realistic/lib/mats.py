"""Material library for the realistic style: tuned PBR presets on top of `core.mat`.

Every preset is a Principled BSDF with procedural colour variation, roughness variation and a
fine bump (see `core.mat`). Colours are sRGB hex. Keep large non-team areas below 40% HSV
saturation in the team hue bands (350-81 and 182-254 degrees, DESIGN A11 colour rule): skin,
wood, leather and fur are desaturated browns, and saturated accents stay small.

Team surfaces (`team_*`) are neutral grey: the render keeps them as a grey layer that the game
tints with the team colour (the tint-underlay contract, art/blender/README.md).

Presets take an optional `name` so a unit can have two variants (e.g. a dark and a light fur).
"""
from . import core as C


def skin(tone="#9c7862", name="skin"):
    return C.mat(name, tone, rough=0.5, noise=0.07, nscale=0.6, bump=0.12, sheen=0.15)


def hair(color="#3b312b", name="hair"):
    return C.mat(name, color, rough=0.75, noise=0.25, nscale=1.4, bump=0.9, sheen=0.3)


def fur(color="#76624f", dark="#4f4236", name="fur", bump=1.0, noise=0.32, nscale=1.1):
    return C.mat(name, color, rough=0.95, noise=noise, nscale=nscale, bump=bump, ramp2=dark, sheen=0.6)


def coat(color="#8a6e52", dark="#6a5440", name="coat", noise=0.1, nscale=2.2):
    """Short animal coat (cat, boar hide): fine grain, subtle variation (large animals read
    blotchy with coarse noise)."""
    return C.mat(name, color, rough=0.8, noise=noise, nscale=nscale, bump=0.45, ramp2=dark, sheen=0.5)


def leather(color="#5a4a3e", name="leather"):
    return C.mat(name, color, rough=0.55, noise=0.14, nscale=0.9, bump=0.35)


def rawhide(color="#a08a6a", name="rawhide"):
    return C.mat(name, color, rough=0.7, noise=0.16, nscale=0.8, bump=0.3, sheen=0.2)


def wood(color="#6b5847", dark="#4e4035", name="wood", stripes=1.6):
    return C.mat(name, color, rough=0.72, noise=0.18, nscale=0.5, bump=0.6, stripes=stripes, ramp2=dark)


def bark(color="#5a4a3c", dark="#3e332a", name="bark"):
    return C.mat(name, color, rough=0.9, noise=0.3, nscale=0.9, bump=1.2, stripes=3.5, ramp2=dark)


def flint(color="#8b8a86", name="flint"):
    return C.mat(name, color, rough=0.35, noise=0.28, nscale=1.2, bump=0.4, spec=0.7)


def stone(color="#8c7b68", dark="#6e6254", name="stone", bump=1.0):
    return C.mat(name, color, rough=0.85, noise=0.22, nscale=0.35, bump=bump, ramp2=dark)


def moss(color="#5f7438", name="moss"):
    return C.mat(name, color, rough=0.95, noise=0.3, nscale=1.2, bump=1.2, sheen=0.5)


def bone(color="#d8cdb5", name="bone"):
    return C.mat(name, color, rough=0.5, noise=0.12, nscale=1.0, bump=0.2)


def ivory(color="#e2d6bb", name="ivory"):
    return C.mat(name, color, rough=0.35, noise=0.1, nscale=0.6, bump=0.12, coat=0.25, stripes=0.9)


def horn(color="#4a3f36", name="horn"):
    return C.mat(name, color, rough=0.4, noise=0.2, nscale=1.0, bump=0.2, stripes=2.4, coat=0.2)


def hoof(color="#2b2826", name="hoof"):
    return C.mat(name, color, rough=0.4, noise=0.1, nscale=1.0, bump=0.1)


def straw(color="#b8a377", name="straw"):
    return C.mat(name, color, rough=0.8, noise=0.25, nscale=2.2, bump=0.8, stripes=6.0, sheen=0.3)


def burlap(color="#a89272", name="burlap"):
    return C.mat(name, color, rough=0.95, noise=0.14, nscale=3.0, bump=0.9, sheen=0.4)


def rope(color="#9c8a68", name="rope"):
    return C.mat(name, color, rough=0.85, noise=0.2, nscale=2.0, bump=0.8, stripes=8.0)


def clay(color="#9a7d62", name="clay"):
    return C.mat(name, color, rough=0.8, noise=0.18, nscale=0.8, bump=0.5)


def feather(color="#d8d2c4", name="feather"):
    return C.mat(name, color, rough=0.7, noise=0.18, nscale=1.6, bump=0.4, sheen=0.6)


def eye(name="eye"):
    return C.mat(name, "#1c1714", rough=0.25, noise=0.0, bump=0, coat=0.6)


def dark(color="#1a1512", name="dark"):
    """Mouths, cave interiors, nostrils: near-black, matte."""
    return C.mat(name, color, rough=0.9, noise=0.05, bump=0)


def ochre(color="#8a5a3a", name="ochre"):
    """Painted ochre stripes (a small accent)."""
    return C.mat(name, color, rough=0.8, noise=0.2, nscale=1.5, bump=0.2)


def glow(color="#ffb060", strength=6.0, name="glow"):
    return C.emit_mat(name, color, strength)


# ---- team surfaces (grey; tinted in the game)
def team_hide(name="team_hide"):
    """Dyed hide / leather: the Stone Age team read."""
    return C.mat(name, "#999999", rough=0.8, noise=0.16, nscale=0.9, bump=0.45, team=True, sheen=0.3)


def team_cloth(name="team_cloth"):
    return C.mat(name, "#999999", rough=0.85, noise=0.1, nscale=0.8, bump=0.35, team=True, sheen=0.6)


def team_paint(name="team_paint"):
    """Painted wood / ochre-dyed surfaces (shields, drum rims, banners on wood)."""
    return C.mat(name, "#999999", rough=0.55, noise=0.1, nscale=0.6, bump=0.15, team=True)


def team_feather(name="team_feather"):
    return C.mat(name, "#9a9a9a", rough=0.7, noise=0.14, nscale=1.6, bump=0.4, team=True, sheen=0.6)
