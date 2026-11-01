"""The owner's before/after video of an art wave (item 47 audit 7.4) from captured frame sequences.

    <venv>/bin/python art/blender/tools/compose_video.py <plan.json> --frames DIR --out OUT.mp4 --contact OUT.png
        [--ffmpeg PATH]

The plan lists the segments in order; frame folders are `tools/art/battleCapture.mjs` outputs under --frames
(`<scenario>_<vp>_<tag>/0000.png ...`), sheet paths are relative to the repository root. Writes an H.264 MP4
(yuv420p, faststart; 1688 x 780 at 24 fps: a 30-steps-a-second capture plays at 0.8 x) and a contact sheet (one
key frame per segment, the start of every damage stage). Pillow and numpy (the Blender venv has both) and ffmpeg
(--ffmpeg, $FFMPEG or the PATH). Segment kinds:

  card       {"lines": [...], "sec": 2.5}: a title card
  seq        {"dir", "start", "n", "step"?, "box"?, "title"?, "sub"?, "corner"?}: one sequence, fitted or cropped
  pair       {"left", "right", "start", "n", "boxL", "boxR", "left_label", "right_label", ...}: two crops side by side
  damage     {"dir", "start", "n", "step"?, "box"?, "hold"? (s), "hold_delay"? (frames)}: a tracked unit (units.json)
             captioned with its damage stage; each new stage holds once the hit flash has faded
  sheetpair  {"left", "right" (sheet .hd.json), "labels", "clips": [[clip, repeats]], "zoom"}: a unit beside its
             skin, played from their sheets as the game draws them (team layer tinted, GPU bilinear to game scale)
  stills     {"items": [[png, seconds]]}

Every kind but card takes "title" and "sub" (the caption, top left); "key" picks the contact sheet's frame.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.dirname(HERE))
sys.dont_write_bytecode = True
from ageborn_art import look2d  # noqa: E402

W, H, FPS = 1688, 780, 24
BG = (24, 22, 30)
FONT_DIRS = ["/usr/share/fonts/truetype/dejavu", "/usr/share/fonts/TTF", "/usr/share/fonts/dejavu",
             "/Library/Fonts", "/System/Library/Fonts/Supplemental", "C:\\Windows\\Fonts"]
FONT_NAMES = {"bold": ["DejaVuSans-Bold.ttf", "Arial Bold.ttf", "arialbd.ttf"],
              "regular": ["DejaVuSans.ttf", "Arial.ttf", "arial.ttf"]}


def font(kind, size):
    for d in FONT_DIRS:
        for n in FONT_NAMES[kind]:
            p = os.path.join(d, n)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    try:
        return ImageFont.load_default(size)
    except TypeError:  # Pillow before 10.1: one small bitmap font
        return ImageFont.load_default()


F_BIG, F_TITLE, F_SUB, F_SMALL = font("bold", 64), font("bold", 50), font("regular", 40), font("bold", 40)


def load(path):
    return Image.open(path).convert("RGB")


def fit(im, w=W, h=H):
    """Scale to fit inside w x h, centred on the dark background."""
    s = min(w / im.width, h / im.height)
    im2 = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    out = Image.new("RGB", (w, h), BG)
    out.paste(im2, ((w - im2.width) // 2, (h - im2.height) // 2))
    return out


def zoom(im, box, w, h):
    """Crop `box` (x0, y0, x1, y1 in the frame's device px) and scale it to w x h (Lanczos)."""
    return im.crop(tuple(box)).resize((w, h), Image.LANCZOS)


def label(draw, xy, text, fnt, pad=14):
    x, y = xy
    l, t, r, b = draw.textbbox((x, y), text, font=fnt)
    draw.rounded_rectangle((l - pad, t - pad, r + pad, b + pad), radius=12, fill=(0, 0, 0, 170))
    draw.text((x, y), text, font=fnt, fill=(255, 255, 255))
    return b + pad


def caption(img, title=None, sub=None, corner=None, corner_r=None):
    over = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    y = 30
    if title:
        y = label(d, (36, y), title, F_TITLE) + 14
    if sub:
        label(d, (36, y + 4), sub, F_SUB)
    if corner:
        label(d, (36, H - 110), corner, F_BIG)
    if corner_r:
        tw = d.textbbox((0, 0), corner_r, font=F_BIG)[2]
        label(d, (W - 36 - tw, H - 110), corner_r, F_BIG)
    return Image.alpha_composite(img.convert("RGBA"), over).convert("RGB")


def card(lines):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    y = H // 2 - 40 * len(lines)
    for i, t in enumerate(lines):
        f = F_BIG if i == 0 else F_SUB
        tw = d.textbbox((0, 0), t, font=f)[2]
        d.text(((W - tw) // 2, y), t, font=f, fill=(245, 240, 230) if i == 0 else (200, 196, 210))
        y += 96 if i == 0 else 56
    return img


def stage_of(bp):
    """The damage stage at an HP in basis points (src/visuals/damage/stage.ts: entered at 75, 50 and 25%; the
    scenarios have no heals, so the hysteresis never applies)."""
    return 0 if bp > 7500 else 1 if bp > 5000 else 2 if bp > 2500 else 3


class SheetPlayer:
    """A unit sheet played as the game draws it: the clip's steps for their durations, each frame composited
    (team layer tinted under the base) and drawn at game scale (GPU bilinear to 1.83 px/lu)."""

    def __init__(self, path, tint):
        self.fr, d = look2d.frames_of(path)
        xp = path.replace(".hd.json", ".x.hd.json")
        self.meta = dict(d["meta"]["ageborn"]["clips"])
        if os.path.exists(xp):
            xf, xd = look2d.frames_of(xp)
            self.fr.update(xf)
            self.meta.update(xd["meta"]["ageborn"]["clips"])
        a = d["meta"]["ageborn"]
        self.slug = a["visualId"].split(".", 1)[1]
        self.feet = a["feetPx"]
        self.k = look2d.GAME_PX_PER_LU / a["pxPerLu"]
        self.tint = tint
        self.cache = {}

    def frame(self, clip, t_ms):
        m = self.meta[clip]
        seq, durs = m["sequence"], m["durationsMs"]
        t = t_ms % sum(durs) if m.get("loop") else min(t_ms, sum(durs) - 1)
        acc = 0
        f = seq[0]
        for f, ms in zip(seq, durs):
            acc += ms
            if t < acc:
                break
        key = (clip, f)
        if key not in self.cache:
            name = f"{self.slug}_{clip}_{f:02d}"
            c = look2d.composite(self.fr[name], self.fr.get(name + "_team"), self.tint)
            self.cache[key] = look2d.gpu_bilinear(c, self.k)
        return self.cache[key]


def sky(w, h):
    y = np.linspace(0, 1, h)[:, None, None]
    top, low, ground = np.array([214, 228, 238]), np.array([236, 240, 236]), np.array([186, 163, 128])
    img = np.repeat(top + (low - top) * y, w, axis=1)
    img[int(h * 0.80):] = ground
    return Image.fromarray(img.astype(np.uint8))


def frames_of(seg, frames):
    k = seg["kind"]
    at = lambda d: os.path.join(frames, d)  # noqa: E731
    if k == "card":
        img = card(seg["lines"])
        for _ in range(int(seg["sec"] * FPS)):
            yield img
    elif k == "seq":
        for i in range(seg["start"], seg["start"] + seg["n"], seg.get("step", 1)):
            im = load(os.path.join(at(seg["dir"]), f"{i:04d}.png"))
            im = zoom(im, seg["box"], W, H) if seg.get("box") else fit(im)
            yield caption(im, seg.get("title"), seg.get("sub"), seg.get("corner"))
    elif k == "pair":
        half = (W - 8) // 2
        for i in range(seg["start"], seg["start"] + seg["n"], seg.get("step", 1)):
            a = zoom(load(os.path.join(at(seg["left"]), f"{i:04d}.png")), seg["boxL"], half, H)
            b = zoom(load(os.path.join(at(seg["right"]), f"{i:04d}.png")), seg["boxR"], half, H)
            img = Image.new("RGB", (W, H), (255, 255, 255))
            img.paste(a, (0, 0))
            img.paste(b, (half + 8, 0))
            yield caption(img, seg.get("title"), seg.get("sub"), seg.get("left_label"), seg.get("right_label"))
    elif k == "damage":
        d = at(seg["dir"])
        hp = json.load(open(os.path.join(d, "units.json")))["hp"]
        hold = int(seg.get("hold", 0.5) * FPS)
        delay = seg.get("hold_delay", 4)
        seg["_keys"] = []
        prev, since, out = None, None, 0
        for i in range(seg["start"], seg["start"] + seg["n"], seg.get("step", 1)):
            if i >= len(hp) or hp[i][2] == "gone" or not os.path.exists(os.path.join(d, f"{i:04d}.png")):
                break
            st = stage_of(hp[i][1])
            im = load(os.path.join(d, f"{i:04d}.png"))
            im = zoom(im, seg["box"], W, H) if seg.get("box") else fit(im)
            names = seg.get("stage_names", ["Uskadt", "Trin 1", "Trin 2", "Trin 3"])
            img = caption(im, seg.get("title"), seg.get("sub"), names[st])
            if prev is not None and st != prev:
                since = 0
            prev = st
            if since is not None:
                if since == delay:
                    seg["_keys"].append((f"{seg.get('name', 'damage')}, {names[st].lower()}", img, out))
                    for _ in range(hold):
                        yield img
                    out += hold
                    since = None
                else:
                    since += 1
            yield img
            out += 1
    elif k == "sheetpair":
        tint = look2d.TEAM_BLUE
        L, R = SheetPlayer(os.path.join(ROOT, seg["left"]), tint), SheetPlayer(os.path.join(ROOT, seg["right"]), tint)
        z = seg.get("zoom", 2.3)
        half = W // 2
        bg = sky(W, H)
        steps = []
        for clip, reps in seg["clips"]:
            dur = sum(L.meta[clip]["durationsMs"]) * reps
            steps += [(clip, t) for t in np.arange(0, dur, 1000 / 30)]
        for clip, tm in steps:
            img = bg.copy()
            for i, pl in enumerate((L, R)):
                a = pl.frame(clip, tm)
                im = Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
                im = im.resize((round(im.width * z), round(im.height * z)), Image.LANCZOS)
                fx, fy = pl.feet[0] * pl.k * z, pl.feet[1] * pl.k * z
                img.paste(im, (int(i * half + half / 2 - fx), int(H * 0.80 - fy)), im)
            d = ImageDraw.Draw(img)
            for i, name in enumerate(seg["labels"]):
                tw = d.textbbox((0, 0), name, font=F_SMALL)[2]
                label(d, (int(i * half + half / 2 - tw / 2), H - 92), name, F_SMALL)
            yield caption(img, seg.get("title"), seg.get("sub"))
    elif k == "stills":
        for path, sec in seg["items"]:
            img = caption(fit(load(at(path))), seg.get("title"), seg.get("sub"))
            for _ in range(int(sec * FPS)):
                yield img
    else:
        raise SystemExit(f"unknown segment kind {k!r}")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("plan")
    ap.add_argument("--frames", required=True, help="the folder with the capture sequences")
    ap.add_argument("--out", required=True)
    ap.add_argument("--contact", required=True)
    ap.add_argument("--ffmpeg", default=os.environ.get("FFMPEG") or shutil.which("ffmpeg") or "ffmpeg")
    a = ap.parse_args()
    plan = json.load(open(a.plan))
    cmd = [a.ffmpeg, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", str(plan.get("crf", 23)),
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", a.out]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    keys, n = [], 0
    for seg in plan["segments"]:
        first, cnt = None, 0
        for img in frames_of(seg, a.frames):
            ff.stdin.write(img.tobytes())
            if cnt == seg.get("key", 0):
                first = img
            cnt += 1
        print(f"{seg.get('name', seg['kind'])}: {cnt} frames ({cnt / FPS:.1f} s)", flush=True)
        if seg["kind"] != "card":
            if seg.get("_keys"):
                keys += [(name, img, (n + t) / FPS) for name, img, t in seg["_keys"]]
            elif first is not None:
                keys.append((seg.get("name", ""), first, (n + seg.get("key", 0)) / FPS))
        n += cnt
    ff.stdin.close()
    if ff.wait():
        raise SystemExit("ffmpeg failed")
    print(f"total {n / FPS:.1f} s, {os.path.getsize(a.out) / 1e6:.1f} MB")
    tw, th, cols = 422, 195, 4
    rows = (len(keys) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (tw + 8) + 8, rows * (th + 40) + 8), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    f = font("regular", 16)
    for i, (name, img, t) in enumerate(keys):
        x, y = 8 + (i % cols) * (tw + 8), 8 + (i // cols) * (th + 40)
        sheet.paste(img.resize((tw, th), Image.LANCZOS), (x, y))
        d.text((x, y + th + 6), f"{i + 1}. {name} ({t:.0f} s)", font=f, fill=(20, 20, 20))
    sheet.save(a.contact)


if __name__ == "__main__":
    main()
