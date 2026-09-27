"""Colour helpers. Palette values are sRGB hex strings as in DESIGN A11.

Blender works in linear light, and the scene uses the 'Standard' view transform, so an
emission colour converted with `to_linear` lands in the PNG as exactly the hex value.
"""


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


def rgb_to_hex(rgb):
    return "#" + "".join(f"{max(0, min(255, round(c * 255))):02X}" for c in rgb)


def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def to_linear(h):
    """sRGB hex -> linear RGBA tuple for shader node inputs."""
    return tuple(_lin(c) for c in hex_to_rgb(h)) + (1.0,)


def scale(h, f):
    """Darken (f < 1) in sRGB, as the style guide defines shadow and outline colours."""
    return rgb_to_hex(tuple(c * f for c in hex_to_rgb(h)))


def mix(h1, h2, t):
    a, b = hex_to_rgb(h1), hex_to_rgb(h2)
    return rgb_to_hex(tuple(x + (y - x) * t for x, y in zip(a, b)))


def hsv(h):
    import colorsys
    return colorsys.rgb_to_hsv(*hex_to_rgb(h))
