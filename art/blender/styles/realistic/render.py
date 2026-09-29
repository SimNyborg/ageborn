"""Realistic style: render game sprite sheets, previews and look-dev strips.

Run from the repository root with the bpy venv (Python 3.11, bpy 5.0.1, Cycles CPU):

  PY=<venv>/bin/python
  R=art/blender/styles/realistic/render.py

  $PY $R preview bonker attack:3 attack:4 die:6 [--samples 16]    # look-dev strip (3x + 1x)
  $PY $R unit bonker [--install]                                   # one visual end to end
  $PY $R unit turret:rock_tosser [--install]                       # a turret (turrets/<age>.py)
  $PY $R unit base:stone [--install]                               # a base (bases/<age>.py)
  $PY $R refinish bonker [--install]                               # sheets/GIFs from rendered frames
  $PY $R age stone [--only bonker,base:stone] [--parallel 2] [--install]
  $PY $R backdrop stone [--install]                               # far/mid backdrop layers of an age
  $PY $R ground tar_pits [--install]                              # an arena ground (backdrops/<arena>.py)
  $PY $R install bonker,turret:rock_tosser                         # copy finished sheets into public/art
  $PY $R contact stone                                             # age contact sheet from the sheets

`age` runs every visual of the age (units/<age>/*.py, turrets/<age>.py, bases/<age>.py) in
separate Blender processes, at most `--parallel` at once (each uses core.THREADS = 2 threads),
then with --install copies the sheets into public/art, regenerates the unit manifest summary
(art/blender/gen_unit_manifest.mjs) and the card portraits (art/blender/gen_portraits.py).
"""
import argparse
import glob
import importlib.util
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
OUT = os.environ.get("AGEBORN_REALISTIC_OUT", "/tmp/ageborn-realistic")


def _load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def find(vid):
    """'bonker' / 'unit:bonker' / 'turret:rock_tosser' / 'base:stone' -> module-like object."""
    kind, _, slug = vid.rpartition(":")
    kind = kind or "unit"
    if kind == "unit":
        hits = glob.glob(os.path.join(HERE, "units", "*", slug + ".py"))
        if not hits:
            raise SystemExit(f"no unit script units/*/{slug}.py")
        return _load(hits[0], "unit_" + slug)
    if kind == "turret":
        for p in glob.glob(os.path.join(HERE, "turrets", "*.py")):
            m = _load(p, "turrets_" + os.path.basename(p)[:-3])
            for t in m.TURRETS:
                if t.SLUG == slug:
                    return t
        raise SystemExit(f"no turret {slug}")
    if kind == "base":
        return _load(os.path.join(HERE, "bases", slug + ".py"), "base_" + slug).MODULE
    raise SystemExit(f"unknown kind {kind}")


def age_ids(age):
    ids = [os.path.basename(p)[:-3] for p in sorted(glob.glob(os.path.join(HERE, "units", age, "*.py")))
           if not os.path.basename(p).startswith("_") and not p.endswith("_study.py")]
    tp = os.path.join(HERE, "turrets", age + ".py")
    if os.path.exists(tp):
        ids += ["turret:" + t.SLUG for t in _load(tp, "turrets_" + age).TURRETS]
    if os.path.exists(os.path.join(HERE, "bases", age + ".py")):
        ids.append("base:" + age)
    return ids


def post_install(age, out):
    """Regenerates the unit manifest summary and the card portraits after installing an age."""
    subprocess.run(["node", os.path.join(REPO, "art", "blender", "gen_unit_manifest.mjs")], check=False)
    slugs = [os.path.basename(p)[:-3] for p in sorted(glob.glob(os.path.join(HERE, "units", age, "*.py")))
             if not p.endswith("_study.py")]
    subprocess.run([sys.executable, os.path.join(REPO, "art", "blender", "gen_portraits.py"), out, ",".join(slugs)],
                   check=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd")
    ap.add_argument("target")
    ap.add_argument("frames", nargs="*")
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--samples", type=int, default=14)
    ap.add_argument("--install", action="store_true")
    ap.add_argument("--no-previews", action="store_true")
    ap.add_argument("--only", default=None)
    ap.add_argument("--parallel", type=int, default=2)
    a = ap.parse_args()
    from lib import game as G
    from lib import pipe

    if a.cmd == "preview":
        u = find(a.target)
        jobs = {(f.split(":")[0], int(f.split(":")[1])) for f in a.frames}
        look = os.path.join(a.out, "_look")
        r = G.render(u, look, samples=a.samples, only=jobs)
        png = os.path.join(look, f"{G._file(u)}_strip.png")
        G.strip(u, r, png)
        print("wrote", png)
    elif a.cmd == "restrip":
        u = find(a.target)
        look = os.path.join(a.out, "_look")
        r = G.load_run(u, look)
        G.strip(u, r, os.path.join(look, f"{G._file(u)}_strip.png"))
    elif a.cmd == "unit":
        u = find(a.target)
        r = G.render(u, a.out, samples=a.samples)
        G.write_outputs(u, r, a.out, previews=not a.no_previews)
        if a.install:
            G.install(u, a.out)
    elif a.cmd == "backdrop":
        import importlib
        sys.path.insert(0, os.path.join(HERE, "backdrops"))
        bd = _load(os.path.join(HERE, "backdrops", a.target + ".py"), "backdrop_" + a.target)
        bd.run(os.path.join(a.out, "backdrop"), samples=max(a.samples, 16), install=a.install, repo=REPO)
    elif a.cmd == "install":
        for vid in a.target.split(","):
            G.install(find(vid), a.out)
    elif a.cmd == "ground":
        gd = _load(os.path.join(HERE, "backdrops", a.target + ".py"), "ground_" + a.target)
        gd.run(os.path.join(a.out, "backdrop"), samples=max(a.samples, 16), install=a.install, repo=REPO)
    elif a.cmd == "post":
        post_install(a.target, a.out)
    elif a.cmd == "refinish":
        u = find(a.target)
        r = G.load_run(u, a.out)
        G.write_outputs(u, r, a.out, previews=not a.no_previews)
        if a.install:
            G.install(u, a.out)
    elif a.cmd == "age":
        ids = a.only.split(",") if a.only else age_ids(a.target)
        os.makedirs(os.path.join(a.out, "_logs"), exist_ok=True)
        todo = list(ids)
        running = []
        t0 = time.time()
        while todo or running:
            while todo and len(running) < a.parallel:
                vid = todo.pop(0)
                log = open(os.path.join(a.out, "_logs", vid.replace(":", "_") + ".log"), "w")
                cmd = [sys.executable, __file__, "unit", vid, "--out", a.out, "--samples", str(a.samples)]
                if a.install:
                    cmd.append("--install")
                if a.no_previews:
                    cmd.append("--no-previews")
                running.append((vid, subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT), time.time()))
                print(f"start {vid}", flush=True)
            for item in list(running):
                vid, p, ts = item
                if p.poll() is not None:
                    running.remove(item)
                    print(f"done  {vid} rc={p.returncode} in {time.time() - ts:.0f}s", flush=True)
            time.sleep(2)
        print(f"age {a.target}: {len(ids)} visuals in {time.time() - t0:.0f}s")
        if a.install:
            post_install(a.target, a.out)
    elif a.cmd == "contact":
        from lib import review
        review.age_contact(a.target, a.out, REPO)
    else:
        raise SystemExit(f"unknown command {a.cmd}")


if __name__ == "__main__":
    main()
