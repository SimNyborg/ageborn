"""Turns recorded 16:9 frames into a 1080x1920 Reel with titles and the game's own music.

Layout: a blurred, darkened copy of the gameplay fills the frame; the sharp gameplay sits in the
middle; the AGEBORN title and the day's two lines sit above it, a small footer below.

usage: python3 compose.py <framesDir> <fps> <music> <top> <sub> <out.mp4> <cover.jpg>
"""
import os
import subprocess
import sys
import tempfile

FONTS = [
    "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf",
    "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf",
    "/usr/share/fonts/opentype/inter/Inter-Bold.otf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
FONTS_SEMI = [
    "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf",
    "/usr/share/fonts/opentype/inter/Inter-Bold.otf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def first(paths):
    for p in paths:
        if os.path.exists(p):
            return p
    raise SystemExit("no usable font found")


def text(tmp, name, value):
    path = os.path.join(tmp, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(value)
    return path


def main():
    frames, fps, music, top, sub, out, cover = sys.argv[1:8]
    fps = int(fps)
    n = len([f for f in os.listdir(frames) if f.endswith(".jpg")])
    dur = n / fps
    bold, semi = first(FONTS), first(FONTS_SEMI)
    tmp = tempfile.mkdtemp()
    t_title = text(tmp, "title.txt", "AGEBORN")
    t_top = text(tmp, "top.txt", top)
    t_sub = text(tmp, "sub.txt", sub)
    t_foot = text(tmp, "foot.txt", "Real gameplay  |  In development")

    def dt(font, tf, size, y, color, extra=""):
        return (
            f"drawtext=fontfile='{font}':textfile='{tf}':fontsize={size}:fontcolor={color}:"
            f"x=(w-text_w)/2:y={y}:shadowcolor=black@0.55:shadowx=0:shadowy=5{extra}"
        )

    # Gameplay is 1080x608 after scaling; centre it slightly below the middle.
    gy = 700
    fade_out = max(0.0, dur - 0.6)
    vf = ";".join(
        [
            "[0:v]split=2[a][b]",
            "[a]scale=-2:1920,crop=1080:1920,boxblur=24:2,eq=brightness=-0.20:saturation=1.2[bg]",
            "[b]scale=1080:-2:flags=lanczos[fg]",
            f"[bg][fg]overlay=0:{gy}[v0]",
            # thin gold rules framing the gameplay
            f"[v0]drawbox=x=0:y={gy - 6}:w=1080:h=6:color=0xF2C14E@0.9:t=fill,"
            f"drawbox=x=0:y={gy + 608}:w=1080:h=6:color=0xF2C14E@0.9:t=fill[v1]",
            "[v1]"
            + ",".join(
                [
                    dt(bold, t_title, 132, 250, "0xF2C14E", ":borderw=3:bordercolor=0x5A3A12"),
                    dt(bold, t_top, 72, 440, "white"),
                    dt(semi, t_sub, 52, 535, "0xFFE7A8"),
                    dt(semi, t_foot, 38, 1420, "white@0.85"),
                ]
            )
            + f",fade=t=in:st=0:d=0.35,fade=t=out:st={fade_out:.2f}:d=0.6,format=yuv420p[v]",
        ]
    )
    af = f"[1:a]atrim=0:{dur:.2f},afade=t=in:st=0:d=0.6,afade=t=out:st={max(0, dur - 1.5):.2f}:d=1.5,volume=0.9[aout]"
    cmd = [
        "ffmpeg", "-v", "error", "-y",
        "-framerate", str(fps), "-i", os.path.join(frames, "f%05d.jpg"),
        "-stream_loop", "-1", "-i", music,
        "-filter_complex", vf + ";" + af,
        "-map", "[v]", "-map", "[aout]",
        "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "18", "-r", str(fps),
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
        "-t", f"{dur:.2f}", "-movflags", "+faststart", out,
    ]
    subprocess.run(cmd, check=True)
    # A cover frame from about a third in, for the log.
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{dur / 3:.2f}", "-i", out, "-frames:v", "1", "-q:v", "3", cover], check=True)
    print(f"{out}: {dur:.1f} s")


if __name__ == "__main__":
    main()
