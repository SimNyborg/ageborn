"""Self-test of the detail standard's 2D half (ageborn_art/look2d.py); numpy and Pillow only.

  <venv>/bin/python art/blender/look_selftest.py
"""
import glob
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from ageborn_art import look2d  # noqa: E402

UNITS = os.path.join(HERE, "..", "..", "public", "art", "units")


def _blob(h=120, w=100):
    yy, xx = np.mgrid[0:h, 0:w]
    m = ((xx - 50) / 30.0) ** 2 + ((yy - 64) / 44.0) ** 2 <= 1.0
    base = np.zeros((h, w, 4), np.float32)
    base[m] = (0.55, 0.42, 0.30, 1.0)
    team = np.zeros_like(base)
    tm = m & (yy > 80)
    team[tm] = (1.0, 1.0, 1.0, 1.0)
    base[tm, 3] = 0.0
    return base, team


def test_rim():
    base, team = _blob()
    b1, t1 = look2d.top_rim(base, team, 2.46)
    b2, t2 = look2d.top_rim(base, team, 2.46)
    assert np.array_equal(b1, b2) and np.array_equal(t1, t2), "top_rim is not deterministic"
    top = np.nonzero(base[..., 3][:, 50] > 0.5)[0].min()
    assert b1[top + 1, 50, :3].max() > base[top + 1, 50, :3].max() + 0.05, "no rim at the top edge"
    bottom = np.nonzero(base[..., 3][:, 30] > 0.5)[0].max()
    # the lower edge (facing down) gets no rim; hue and saturation of the rim colour are kept
    assert np.allclose(b1[top + 5:top + 30, 45:55], base[top + 5:top + 30, 45:55]), "rim reaches too deep"
    rgb = b1[top + 1, 50, :3]
    sat = (rgb.max() - rgb.min()) / rgb.max()
    sat0 = (0.55 - 0.30) / 0.55
    assert abs(sat - sat0) < 0.06, (sat, sat0)
    assert bottom > 0


def test_sharpen_keeps_saturation():
    rng = np.random.default_rng(7)
    a = np.ones((40, 40, 4), np.float32)
    a[..., :3] = rng.uniform(0.2, 0.9, (40, 40, 3)).astype(np.float32)
    s = look2d.sharpen_luma(a)
    mx, mn = a[..., :3].max(-1), a[..., :3].min(-1)
    sat = (mx - mn) / mx
    mx2, mn2 = s[..., :3].max(-1), s[..., :3].min(-1)
    sat2 = (mx2 - mn2) / np.maximum(mx2, 1e-6)
    assert np.abs(sat2 - sat).max() < 1e-4, "luma sharpening changed saturation"


def test_maxrects():
    rng = np.random.default_rng(3)
    ims = [Image.new("RGBA", (int(w), int(h)), (255, 0, 0, 255))
           for w, h in rng.integers(20, 220, (60, 2))]
    sheet, pos = look2d.maxrects(ims)
    rects = [(x, y, x + im.width, y + im.height) for (x, y), im in zip(pos, ims)]
    for i, r in enumerate(rects):
        assert r[0] >= 0 and r[1] >= 0 and r[2] <= sheet.width and r[3] <= sheet.height, "out of the sheet"
        for q in rects[i + 1:]:
            assert r[2] <= q[0] or q[2] <= r[0] or r[3] <= q[1] or q[3] <= r[1], "frames overlap"
    used = sum(im.width * im.height for im in ims)
    assert used / (sheet.width * sheet.height) > 0.6, "packing too loose"
    # with the shelf packer as the fallback the sheet is never larger than the shelf packer's
    from ageborn_art import sheet as shelf_sheet
    best, _ = look2d.maxrects(ims, shelf=shelf_sheet.pack)
    shelf, _ = shelf_sheet.pack(ims)
    assert best.width * best.height <= shelf.width * shelf.height, (best.size, shelf.size)


def test_parity_self():
    hd = sorted(glob.glob(os.path.join(UNITS, "stone", "pebbler.hd.json")))
    if not hd:
        return
    # a sheet against itself: IoU 1 everywhere (skinOf is checked separately)
    res = look2d.parity(hd[0], hd[0])
    assert res["iouMin"] == 1.0 and res["weaponIouMin"] == 1.0, res
    assert [p for p in res["problems"] if not p.startswith("skinOf")] == [], res["problems"]


def test_metrics():
    # a flat disc: everything inside is flat; a striped one: edges everywhere
    base, team = _blob(200, 200)
    m = look2d.game_metrics(look2d.composite(base, team), 2.46)
    assert m["flat"] > 0.8 and m["edge"] < 0.15, m
    s = base.copy()
    s[::4, :, :3] *= 0.6
    m2 = look2d.game_metrics(look2d.composite(s, team), 2.46)
    assert m2["flat"] < m["flat"] and m2["edge"] > m["edge"], (m, m2)


def main():
    for name, fn in sorted(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)


if __name__ == "__main__":
    main()
