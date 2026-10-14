#!/usr/bin/env python3
"""Unit cut-outs from the game's HD sprite sheets (studio helper, reads the repo's public/art).

A unit frame is drawn the way the game draws it: the grey team layer (`<frame>_team`) multiplied by
the team colour UNDER the base frame, whose team surfaces are holes. Output: a trimmed RGBA PNG.

  python3 tools/cutout.py <unit> <clip> <frame index> <team hex> <out.png> [--flip]
  python3 tools/cutout.py mammoth_matriarch attack 6 2f7df6 out.png
"""
import glob
import json
import os
import sys

from PIL import Image, ImageChops

REPO = os.environ.get('AGEBORN_REPO', '/home/user/ageborn')


def sheet_for(unit):
    for path in glob.glob(f'{REPO}/public/art/units/*/{unit}.hd.json'):
        return path
    raise SystemExit(f'no HD sheet for {unit}')


def frame_image(sheet_img, meta, key):
    f = meta['frames'][key]
    r = f['frame']
    crop = sheet_img.crop((r['x'], r['y'], r['x'] + r['w'], r['y'] + r['h']))
    if f.get('rotated'):
        crop = crop.rotate(90, expand=True)
    canvas = Image.new('RGBA', (f['sourceSize']['w'], f['sourceSize']['h']), (0, 0, 0, 0))
    canvas.alpha_composite(crop, (f['spriteSourceSize']['x'], f['spriteSourceSize']['y']))
    return canvas


def cutout(unit, clip, index, team_hex, flip=False):
    js = sheet_for(unit)
    meta = json.load(open(js))
    img = Image.open(js.replace('.json', '.png')).convert('RGBA')
    names = meta.get('animations', {}).get(clip)
    if names:
        key = names[min(index, len(names) - 1)]
    else:
        key = f'{unit}_{clip}_{index:02d}'
    base = frame_image(img, meta, key)
    team_key = key + '_team'
    out = Image.new('RGBA', base.size, (0, 0, 0, 0))
    if team_key in meta['frames']:
        team = frame_image(img, meta, team_key)
        color = Image.new('RGBA', team.size, tuple(int(team_hex[i:i + 2], 16) for i in (0, 2, 4)) + (255,))
        tinted = ImageChops.multiply(team, color)
        tinted.putalpha(team.getchannel('A'))
        out.alpha_composite(tinted)
    out.alpha_composite(base)
    if flip:
        out = out.transpose(Image.FLIP_LEFT_RIGHT)
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


if __name__ == '__main__':
    unit, clip, index, team_hex, dest = sys.argv[1:6]
    im = cutout(unit, clip, int(index), team_hex, '--flip' in sys.argv)
    im.save(dest)
    print(dest, im.size)
