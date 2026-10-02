"""Forts in the cartoon style (owner decision 2026-09-30; the MVP release check flagged the realistic forts).

A fort is a unit-like module for `ageborn_art.pipeline.run_unit` (the same cel shading, 2D outline and
@2x/@1x v3 sheets as the units) that keeps the fort sheet contract of the realistic pipeline
(`styles/realistic/forts/kit.py`), so `src/visuals/fortViews/atlasFortView.ts` draws it unchanged:

  body      4 frames  crumble stage 0-3 (intact, 66%, 33%, 12% HP); no flag, door or trap
  front     4 frames  towers with a crew: the parapet drawn OVER the crew, per crumble stage
  scaffold  1 frame   the building scaffold alone
  rubble    1 frame   what stays on the ground after the collapse
  flag      6 frames  the looping team banner on its pole
  door      3 frames  camps: the entrance closed, half open and open
  trap      4 frames  traps: unarmed, armed, sprung, spent

Every piece belongs to a family and an inclusive frame range: it sits on a hidden joint
`g_<family>_<lo>_<hi>` that a clip frame shows when the frame is inside the range. The meta adds
`kind: 'fort'`, fortKind, age, material, footLu, flag/door crumbleMax, and (filled from trackers after
the render, see `finish_meta`) the crew platform point or a crewless tower's muzzle.
"""
import json
import math
import os
import random

from ageborn_art import moves as M
from ageborn_art.anim import Clip
from ageborn_art.geometry import Geo

FAMILIES = ("body", "front", "scaffold", "rubble", "flag", "door", "trap")


class FortBuilder:
    """Collects a fort's parts on family joints. `build(f)` receives one of these."""

    def __init__(self, rig, spec):
        self.rig = rig
        self.spec = spec
        self.rnd = random.Random(spec.get("seed", 7))
        self.groups = []
        rig.joint("body", "root", (0, 0, 0))

    def group(self, fam, lo=0, hi=9, parent="body", at=(0.0, 0.0, 0.0)):
        name = f"g_{fam}_{lo}_{hi}"
        if parent != "body":
            name += f"_{parent}"
        if name not in self.rig.joints:
            self.rig.joint(name, parent, at, hidden=True)
            self.groups.append((name, fam, lo, hi))
        return name

    def add(self, geo, fill=None, fam="body", lo=0, hi=9, team=False, outline=None, finish="matte", glow=None,
            parent="body"):
        j = self.group(fam, lo, hi, parent)
        kw = {}
        if outline is not None:
            kw["outline"] = outline
        if team:
            self.rig.part(j, geo, team=True, **kw)
        elif glow:
            self.rig.part(j, geo, glow=glow, **kw)
        else:
            self.rig.part(j, geo, fill, finish=finish, **kw)
        return j

    def breakable(self, make, stage, fall=True, fam="body", **kw):
        """A piece that stands in body frames 0..stage-1 and (when `fall`) lies at the foot from `stage` on.
        `make(fallen)` returns (geo, fill_or_None_for_team). stage 4 = never falls."""
        g, fill = make(False)
        self.add(g, fill, fam, 0, min(3, stage - 1), team=fill is None, **kw)
        if fall and stage <= 3:
            g, fill = make(True)
            if g is not None:
                self.add(g, fill, fam, stage, 3, team=fill is None, **kw)

    def stage_for(self, zfrac, edge=0.0, keep=0.0):
        """Crumble stage of a piece: top and edge pieces fall first; `keep` share never falls."""
        if self.rnd.random() < keep:
            return 4
        v = zfrac * 0.7 + edge * 0.3 + self.rnd.uniform(-0.15, 0.15)
        return 1 if v > 0.72 else 2 if v > 0.45 else 3 if v > 0.2 else 4


def flag_bones(f, base, h, length=22.0, n=3):
    """A banner on a pole top at `base` + h, streaming toward -x, on chained joints flag0..flag{n-1}."""
    bx, by, bz = base
    top = bz + h - 2.0
    prev = f.group("flag")
    seg = length / n
    for i in range(n):
        name = f"flag{i}"
        f.rig.joint(name, prev, (bx - 1.0 - seg * i, by, top))
        prev = name
    return top, seg


def banner(f, base, h, length=22.0, width=10.0, pole_fill="#6E5A45", tip_fill=None, pennant=True, pole_r=1.2):
    """The flag family: a pole and a team banner on three joints (waved by the flag clip)."""
    bx, by, bz = base
    f.add(Geo().capsule((bx, by, bz), (bx, by, bz + h + 1.0), pole_r, pole_r * 0.85), pole_fill, "flag")
    if tip_fill:
        f.add(Geo().sphere((bx, by, bz + h + 2.2), pole_r * 1.7, cuts=3), tip_fill, "flag", finish="metal")
    top, seg = flag_bones(f, base, h, length)
    for i in range(3):
        x0 = bx - 1.0 - seg * i
        x1 = x0 - seg - 0.6
        w0 = width * (1.0 - 0.1 * i)
        w1 = width * (1.0 - 0.1 * (i + 1))
        if i == 2 and pennant:
            pts = [(x0, top), (x1, top - 0.5), (x1 + seg * 0.45, top - w1 * 0.5), (x1, top - w1), (x0, top - w0)]
        else:
            pts = [(x0, top), (x1, top - 0.3 * i), (x1, top - w1 - 0.3 * i), (x0, top - w0)]
        f.rig.part(f"flag{i}", Geo().slab(pts, by, 1.4), team=True, outline=0.7)


def scaffold(f, x0, x1, y0, y1, h, wood="#9C8468", rope="#CDBB92", levels=2):
    """A lashed pole scaffold around a footprint (the scaffold family)."""
    rnd = random.Random(11)
    for i, (x, y) in enumerate(((x0, y0), (x1, y0), (x0, y1), (x1, y1))):
        f.add(Geo().capsule((x, y, 0), (x + rnd.uniform(-0.8, 0.8), y, h + rnd.uniform(-2, 3)), 1.2), wood, "scaffold")
    for lv in range(1, levels + 1):
        z = h * lv / (levels + 0.4)
        for (a, b) in (((x0, y0), (x1, y0)), ((x0, y1), (x1, y1)), ((x0, y0), (x0, y1)), ((x1, y0), (x1, y1))):
            f.add(Geo().capsule((a[0] - 2, a[1], z), (b[0] + 2, b[1], z + rnd.uniform(-0.6, 0.6)), 0.9), wood, "scaffold")
        f.add(Geo().blob(((x0 + x1) / 2, (y0 + y1) / 2, z + 1.0), ((x1 - x0) / 2 + 2, (y1 - y0) * 0.25, 0.7), p=3.4),
              wood, "scaffold")
    f.add(Geo().capsule((x0, y0 - 0.5, 1), (x1, y0 - 0.5, h * 0.8), 0.8), wood, "scaffold")
    g = Geo()
    for (x, y) in ((x0, y0), (x1, y0)):
        for lv in range(1, levels + 1):
            z = h * lv / (levels + 0.4)
            g.capsule((x - 1.4, y - 1.5, z - 0.8), (x + 1.4, y - 1.5, z + 0.8), 0.55)
    f.add(g, rope, "scaffold", outline=0.4)


def make(slug, name, age, kind, build, *, canvas, feet, height, hit, material, yaw=-28.0, flag=None, crew=None,
         muzzle=None, lights=None, smoke=None, foot=24.0, flag_len=22.0, flag_width=10.0, flag_crumble=2,
         door_crumble=2, extra_meta=None, pole_fill="#6E5A45", tip_fill=None):
    """A cartoon fort module. `flag` = (x, y, z_base, pole height); `crew` = dict(visualId, at=(x, y, z),
    scale); `muzzle` = (x, y, z) for crewless towers; `lights` = [((x, y, z), r, crumbleMax)];
    `smoke` = [((x, y, z), crumbleMin)]. Points are character space (lu, feet at the origin)."""
    spec = dict(slug=slug)
    mod = type("FortModule", (), {})()
    mod.SLUG = slug
    mod.NAME = name
    mod.AGE = age
    mod.VISUAL_ID = f"fort.{slug}"
    mod.HEIGHT_LU = height
    mod.YAW_DEG = yaw
    mod.CANVAS = canvas
    mod.FEET = feet
    mod.NO_RETIME = True
    hx, hy = hit
    mod.ANCHORS = {"head": (0, height), "hitCenter": (hx, hy)}
    meta = {"style": "cartoon", "kind": "fort", "fortKind": kind, "age": age, "material": material, "footLu": foot}
    if flag:
        meta["flag"] = {"crumbleMax": flag_crumble}
    if kind == "camp":
        meta["door"] = {"crumbleMax": door_crumble}
    if extra_meta:
        meta.update(extra_meta)
    mod.EXTRA_META = meta
    mod.FORT = dict(kind=kind, crew=crew, muzzle=muzzle, lights=lights or [], smoke=smoke or [])
    state = {}

    def _build(rig):
        f = FortBuilder(rig, spec)
        state["f"] = f
        build(f)
        if flag:
            banner(f, flag[:3], flag[3], flag_len, flag_width, pole_fill=pole_fill, tip_fill=tip_fill)
        # trackers: the crew platform, the muzzle, lights and smoke (screen lu exported per clip)
        if crew:
            rig.track("crew", "body", crew["at"])
        if muzzle:
            rig.track("muzzle", "body", muzzle)
        for i, (p, _r, _cm) in enumerate(lights or []):
            rig.track(f"light{i}", "body", p)
        for i, (p, _cm) in enumerate(smoke or []):
            rig.track(f"smoke{i}", "body", p)

    def _clips():
        f = state["f"]

        def frame(fam, i, extra=None):
            pose = {}
            for (j, gf, lo, hi) in f.groups:
                if gf == fam and lo <= i <= hi:
                    pose[j] = {"show": True}
            if extra:
                pose.update(extra)
            return pose
        out = []
        if kind != "trap":
            out.append(M.clip("body", [frame("body", i) for i in range(4)], [1000] * 4))
            if crew:
                out.append(M.clip("front", [frame("front", i) for i in range(4)], [1000] * 4))
            out.append(M.clip("scaffold", [frame("scaffold", 0)], [1000]))
            out.append(M.clip("rubble", [frame("rubble", 0)], [1000]))
        if flag:
            fl = []
            for i in range(6):
                ph = 2 * math.pi * i / 6
                ex = {}
                for k in range(3):
                    a = ph - k * 1.2
                    ex[f"flag{k}"] = {"r": -5 * math.cos(a) - 3 + (2 if k else 0), "rz": 15 * math.sin(a) * (0.55 if k == 0 else 1.0)}
                fl.append(frame("flag", 0, ex))
            out.append(M.clip("flag", fl, [120] * 6, loop=True))
        if kind == "camp":
            out.append(M.clip("door", [frame("door", i) for i in range(3)], [90, 90, 500]))
        if kind == "trap":
            out.append(M.clip("trap", [frame("trap", i) for i in range(4)], [1000] * 4))
        # the first clip's first frame sets the sheet's width: make sure it is the body (or the armed trap)
        return out

    mod.build = _build
    mod.clips = _clips
    return mod


def finish_meta(mod, out_dir):
    """After the render: copy the tracker points (crew platform, muzzle, lights, smoke) from the body
    clip's first frame into the fort meta of both sheets (screen lu from the feet, y up)."""
    fort = mod.FORT
    for fn in (f"{mod.SLUG}.json", f"{mod.SLUG}.hd.json"):
        p = os.path.join(out_dir, fn)
        j = json.load(open(p))
        m = j["meta"]["ageborn"]
        clip = "body" if "body" in m["clips"] else "trap"
        anchors = m["clips"][clip].get("anchorsLu", {})

        def pt(k):
            a = anchors.get(k)
            if not a:
                return None
            v = a[0]
            return [round(v[0], 1), round(v[1], 1)]
        if fort["crew"]:
            c = pt("crew")
            m["crew"] = {"visualId": fort["crew"]["visualId"], "x": c[0], "y": c[1], "scale": fort["crew"].get("scale", 0.6)}
        if fort["muzzle"]:
            m["muzzleLu"] = pt("muzzle")
            m["anchorsLu"]["muzzle"] = pt("muzzle")
        if fort["lights"]:
            m["lightsLu"] = [dict(zip(("x", "y"), pt(f"light{i}")), r=r, crumbleMax=cm)
                             for i, (_p, r, cm) in enumerate(fort["lights"])]
        if fort["smoke"]:
            m["smokeLu"] = [dict(zip(("x", "y"), pt(f"smoke{i}")), crumbleMin=cm) for i, (_p, cm) in enumerate(fort["smoke"])]
        # trackers are art metadata only; keep the per-frame anchors out of the fort sheet
        for c in m["clips"].values():
            c.pop("anchorsLu", None)
        json.dump(j, open(p, "w"), separators=(",", ":"))
