"""Phone-scale lane GIF of a unit's walk (ANIM_SPEC P6): replaces a screen recording, which headless
Chromium draws at about 5 frames per second.

  .venv-blender/bin/python art/blender/lane_gif.py <sheet.hd.json> <out.gif> [--before <old.hd.json>]
      [--speed <ground lu/s>] [--zoom 3] [--strip <out.png>]

The sprite moves at the ground speed (card speed x 1.25). The new sheet is drawn the way the runtime
plays a sheet made to the standard: the walk at its authored timing (its natural speed is the ground
speed) and the R2 frame lock (the sprite advances in steps at each frame change, so a planted foot
stays on its pixel). `--before` adds a second lane with an old sheet played the old way: the walk
sized from the card speed and the sprite gliding continuously, so its feet skate and sawtooth.
Ground ticks every 10 lu show the slide. `--strip` also writes a time-lapse PNG: 12 panels per
lane at equal time steps on a common ground, so a planted foot visibly stays on its tick (or not).
"""
import argparse
import json
import os

import numpy as np
from PIL import Image, ImageDraw

PHONE = 265.2 / 290.0
BG = (206, 222, 186, 255)
GROUND = (120, 104, 82, 255)


def load(path):
    j = json.load(open(path))
    im = Image.open(os.path.join(os.path.dirname(path), j["meta"]["image"])).convert("RGBA")
    return j, im


def frames(j, im, tint=(47, 125, 246)):
    ppl = j["meta"]["ageborn"]["pxPerLu"]
    k = PHONE / ppl
    out = []
    for name in j["animations"]["walk"]:
        fr = j["frames"][name]
        f, sss, src = fr["frame"], fr["spriteSourceSize"], fr["sourceSize"]
        c = Image.new("RGBA", (src["w"], src["h"]), (0, 0, 0, 0))
        tn = name + "_team"
        if tn in j["frames"]:
            t = j["frames"][tn]
            tf, ts = t["frame"], t["spriteSourceSize"]
            a = np.asarray(im.crop((tf["x"], tf["y"], tf["x"] + tf["w"], tf["y"] + tf["h"]))).astype(np.float32)
            a[..., :3] *= np.array(tint, np.float32) / 255
            c.alpha_composite(Image.fromarray(a.astype(np.uint8)), (ts["x"], ts["y"]))
        c.alpha_composite(im.crop((f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"])), (sss["x"], sss["y"]))
        ax, ay = fr["anchor"]["x"] * src["w"] * k, fr["anchor"]["y"] * src["h"] * k
        c = c.resize((max(1, round(c.width * k)), max(1, round(c.height * k))), Image.Resampling.LANCZOS)
        out.append((c, ax, ay))
    return out


class Lane:
    def __init__(self, path, speed, old=False, card=None):
        self.j, im = load(path)
        self.cells = frames(self.j, im)
        w = self.j["meta"]["ageborn"]["clips"]["walk"]
        self.durs = list(w["durationsMs"])
        nat = w.get("naturalSpeedLuPerS") or speed
        if old:
            # the old runtime: the walk sized once from the card speed (atlasWalkDurationMs), clamped 0.5-2x
            k = max(0.5, min(2.0, nat / max(1e-6, (card or speed / 1.25))))
            self.durs = [d * k for d in self.durs]
        self.total = sum(self.durs)
        self.speed, self.old = speed, old
        self.label = "before" if old else "after"

    def at(self, t_ms):
        """(cell index, x in lu) at time t."""
        tt = t_ms % self.total
        acc, i = 0.0, 0
        while i < len(self.durs) - 1 and acc + self.durs[i] <= tt:
            acc += self.durs[i]
            i += 1
        start = t_ms - (tt - acc)
        x = self.speed * (t_ms if self.old else start) / 1000.0
        return i, x


def draw_lane(img, lane, t, y0, h, x_base):
    d = ImageDraw.Draw(img)
    gy = y0 + h - 8
    d.rectangle([0, y0, img.width, y0 + h], fill=BG)
    d.line([(0, gy), (img.width, gy)], fill=GROUND, width=1)
    step = 10 * PHONE
    x = 0.0
    while x < img.width:
        d.line([(int(x), gy + 1), (int(x), gy + 3)], fill=GROUND)
        x += step
    i, xl = lane.at(t)
    c, ax, ay = lane.cells[i]
    px = x_base + xl * PHONE
    img.alpha_composite(c, (int(round(px - ax)), int(round(gy - ay))))
    d.text((3, y0 + 2), lane.label, fill=(40, 40, 40, 255))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("out")
    ap.add_argument("--before")
    ap.add_argument("--speed", type=float, help="ground speed lu/s (default: the sheet's gaitSpeedLuPerS)")
    ap.add_argument("--card", type=float, help="card speed for the old playback (default speed / 1.25)")
    ap.add_argument("--zoom", type=int, default=3)
    ap.add_argument("--strip")
    ap.add_argument("--seconds", type=float, default=2.0)
    a = ap.parse_args()
    j = json.load(open(a.sheet))
    speed = a.speed or j["meta"]["ageborn"]["clips"]["walk"].get("gaitSpeedLuPerS") or 80.0
    lanes = [Lane(a.sheet, speed)]
    if a.before:
        lanes.insert(0, Lane(a.before, speed, old=True, card=a.card))
    hmax = max(max(c.height for c, _, _ in ln.cells) for ln in lanes) + 14
    travel = speed * a.seconds * PHONE
    W = int(travel + max(max(c.width for c, _, _ in ln.cells) for ln in lanes) + 30)
    H = hmax * len(lanes)
    gif = []
    fps_ms = 1000 / 30
    n = int(a.seconds * 1000 / fps_ms)
    for k in range(n):
        t = k * fps_ms
        img = Image.new("RGBA", (W, H), BG)
        for li, ln in enumerate(lanes):
            draw_lane(img, ln, t, li * hmax, hmax, 20)
        gif.append(img.resize((W * a.zoom, H * a.zoom), Image.Resampling.NEAREST).convert("P", palette=Image.ADAPTIVE))
    gif[0].save(a.out, save_all=True, append_images=gif[1:], duration=round(fps_ms), loop=0)
    if a.strip:
        panels = 12
        cyc = lanes[-1].total
        span = cyc * 1.0
        cw = int(max(max(c.width for c, _, _ in ln.cells) for ln in lanes) + speed * span / 1000 * PHONE / panels * 0 + 10)
        strip = Image.new("RGBA", (cw * panels, H), BG)
        for li, ln in enumerate(lanes):
            for p in range(panels):
                t = span * p / panels
                tile = Image.new("RGBA", (cw, hmax), BG)
                i, xl = ln.at(t)
                c, ax, ay = ln.cells[i]
                d = ImageDraw.Draw(tile)
                gy = hmax - 8
                d.line([(0, gy), (cw, gy)], fill=GROUND)
                # ticks fixed to the ground: they slide left as the unit advances, so a planted
                # foot that stays over the same tick is not skating
                off = (xl * PHONE) % (10 * PHONE)
                x = -off
                while x < cw:
                    if x >= 0:
                        d.line([(int(round(x)), gy + 1), (int(round(x)), gy + 4)], fill=(170, 30, 30, 255))
                    x += 10 * PHONE
                tile.alpha_composite(c, (int(round(cw / 2 - ax)), int(round(gy - ay))))
                d.text((2, 2), f"{ln.label} {int(t)}ms" if p == 0 else f"{int(t)}", fill=(40, 40, 40, 255))
                strip.alpha_composite(tile, (p * cw, li * hmax))
        strip = strip.resize((strip.width * a.zoom, strip.height * a.zoom), Image.Resampling.NEAREST)
        strip.save(a.strip)
    print(a.out, "frames", n, "speed", speed)


if __name__ == "__main__":
    main()
