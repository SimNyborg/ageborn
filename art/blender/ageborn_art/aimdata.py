"""Aim data per shot clip (queue item 44's art part; W0 COMMON C2).

Every attack clip that launches a shot carries in `meta.ageborn.clips.<clip>`, after its other keys:

  aimDeg   the drawn weapon's angle at the release frame, degrees above the facing direction on screen (0.1 deg),
           measured on the rig: the weapon joint's axis seen through the sprite camera (yaw and tilt included,
           so a level rifle on a biped yawed 10 degrees reads about -3); an authored `deg` for axis-less throws
  release  {"frame": <unique frame>, "atLu": [x, y]}: where the shot leaves (its tracker at that frame, lu from
           the feet, x forward, y up); left out when there is no real point (never [0, 0])
  omni     true instead of aimDeg for clips that emit rather than aim (drums, songs, breath, spells, orbs)

Aimed variants (`<clip>_up45`, `<clip>_up70`, `<clip>_down`, aimed.py) are shot clips too and add "aimOf".
Melee clips get none of these keys. Renders write them after `attack_meta` (pipeline.run_unit); the
shipped sheets get them as a JSON-only rewrite (`anchors_only.py --aim`), which leaves every other byte
as it was: removing the three keys gives back the old file.

The weapon of a clip is a joint and an axis in that joint's space at rest (character space: x forward, z
up): by default the joint carrying the clip's muzzle tracker and its +X (weapons are authored pointing
forward). `SPEC` overrides it per unit where the default does not fit (see the comments there).
"""
import json
import math
import os

ATTACKS = ("attack", "attack_b", "attack_c", "attack_alt")
AIMED_SUFFIXES = ("_up45", "_up70", "_down")
AIM_KEYS = ("aimDeg", "release", "omni")
# second attackers name their own trackers (riders, sponsons): the first one the rig has
ALT_TRACKERS = ("riderMuzzle", "mgMuzzle", "rider0Muzzle", "rider1Muzzle")

# Per unit: {"*": spec for every shot clip, "<clip>": spec for one clip}. Spec keys:
#   shot      False: the unit's attack clips launch nothing (a healer's pulse)
#   omni      True: emits rather than aims (no aimDeg)
#   tracker   the tracker the shot leaves from (default: where the clip's impact-frame `muzzle` comes from, its
#             muzzleTracker, else muzzle, else beam; an attack_alt without one (noMuzzle): ALT_TRACKERS)
#   joint     the weapon joint (default: the tracker's joint)
#   axis      the weapon's axis in the joint's rest space (default (1, 0, 0)), or "muzzle": from the joint's
#             pivot to the tracker (a cornet from the hand to its bell, a mortar from its trunnions to its mouth)
#   release   "impact" (default), "before" (the step before the impact: the projectile is gone on the impact
#             frame) or a unique frame index
#   deg       an authored aimDeg (axis-less throws)
#   at        an authored release point (lu from the feet) where no frame shows the projectile leaving
OMNI = {"*": {"omni": True}}


def _thrown(a, b=None, release="before"):
    """An axis-less throw (a rock, a bomb, a vial, a disc): item 44's measured angles (degrees, A and B), released
    where the projectile was last drawn (it is gone on the impact frame)."""
    out = {"attack": {"deg": a, "release": release}}
    if b is not None:
        out["attack_b"] = {"deg": b, "release": release}
    return out


MUZZLE_AXIS = {"*": {"axis": "muzzle"}}
BOW = {"*": {"joint": "arrow", "release": "before"}}   # the nocked arrow on the frame before the loose
SPEC = {
    # emitters (item 44's table): drums, pipes, songs and wails, breath, spirals, tendrils, orbs, beams from a hull
    "drum_shaman": OMNI, "aulos_piper": OMNI, "tragic_chorus": OMNI, "bagpiper": OMNI, "drummer_boy": OMNI,
    "mesmerist": OMNI, "bio_weaver": OMNI, "gravity_sage": OMNI, "mothership": OMNI, "void_whisperer": OMNI,
    "lindworm": {"*": {"omni": True, "tracker": "breath"}},
    # a call strike: the shaman raises its staff and the rocks fall from the sky (item 44's call-strike path)
    "rockfall_shaman": OMNI,
    # the song wave from the leviathan's head; its riders (attack_alt) aim their pellets
    "star_leviathan": {"*": {"omni": True}, "attack_alt": {"omni": False}},
    # the Repair Drone's beam heals (its attack clips carry a muzzle for the beam's start, but launch nothing)
    "repair_drone": {"*": {"shot": False}},
    # bows: the arrow on the frame before the loose (it is gone on the impact frame)
    "cretan_archer": BOW, "longbowman": BOW, "yeoman_archer": BOW,
    # weapons authored along another axis than +X: measured from the joint's pivot to the muzzle
    # A: the cornet (upright at rest), its note from the bell; B: the baton points at the foe and the note
    # flies off its tip (the script's own words; the shipped meta launched it from the bell)
    "bandmaster": {"attack": {"axis": "muzzle"}, "attack_b": {"tracker": "batonTip", "joint": "baton", "axis": "muzzle"}},
    "combat_medic": MUZZLE_AXIS,                             # the pistol stands upright at rest
    "dragoon": MUZZLE_AXIS,                                  # the carbine rides the sabre joint, upright at rest
    "overclock_engineer": MUZZLE_AXIS,                       # the zap tool stands upright at rest
    "field_surgeon": MUZZLE_AXIS,                            # the pistol is part of the hand
    "coehorn_crew": MUZZLE_AXIS, "mortar_team": MUZZLE_AXIS, "trench_mortar": MUZZLE_AXIS,   # trunnions to mouth
    "starwarden": {"*": {"joint": "staff", "axis": "muzzle"}},                # the staff, hand to beacon
    # A: the plasma leaves the palm along the forearm. B: the lens on the swung mast fires from the lens tracker;
    # the dish itself faces 72 degrees down on the rig (+X of the mast swung -76), but it reads edge-on as a bar
    # and the pulse burst is painted level (-70..+70 around the facing), so the drawn shot is level
    "holo_projector": {"attack": {"joint": "fore_r", "axis": "muzzle"}, "attack_b": {"deg": 0}},
    "siege_belfry": {"attack_alt": {"axis": "muzzle"}},                       # the archers' arms point the bows
    # thrown spears: the javelin's own joint on the frame before the throw (the impact frame shows the
    # follow-through, the javelin gone)
    # the atlatl sweeps the dart from behind the shoulder (the frame before) to the follow-through at the belly
    # (the impact frame, the dart gone): no frame shows it leaving, so item 44's measured angles and points
    "atlatl_thrower": {"attack": {"deg": 40, "at": (30.0, 38.0)}, "attack_b": {"deg": 55, "at": (14.0, 46.0)}},
    "standard_bearer": {"*": {"joint": "dart", "release": "before"}},
    "javelineer": {"*": {"joint": "jav", "release": "before"}},
    # axis-less throws, bombs and spits: item 44's angles
    "alchemist": _thrown(10, 15, release="impact"),
    "balloon_admiral": _thrown(0, 0),
    "bolas_thrower": _thrown(5, 10),
    "bomb_bowler": _thrown(50, 45),
    "boulder_hurler": _thrown(5, 0),
    # W1: the discus and the sling stone aimed up at flyers (hand-posed variants, kit_bronze_detail.aimed_hand) leave
    # the hand at the variant's angle on the impact frame, where the throwing arm and the cord point it
    "discus_thrower": dict(_thrown(5, 5), **{c + s: {"deg": d, "release": "impact"} for c in ("attack", "attack_b")
                                             for s, d in (("_up45", 45), ("_up70", 70))}),
    "friar": _thrown(0, 0),
    "grenadier": _thrown(50, 55),
    "herbalist": _thrown(15, 10),
    "mangonel_cart": _thrown(50, 50),
    "moonlings": _thrown(0, 0, release="impact"),
    "nova_thrower": _thrown(45, 50, release="impact"),
    "pebbler": _thrown(20, 5),
    "rhodian_slingers": dict(_thrown(10, 0), **{c + s: {"deg": d, "release": "impact"} for c in ("attack", "attack_b")
                                                for s, d in (("_up45", 45), ("_up70", 70))}),
    "swarm_matron": _thrown(0, 0),
    "mammoth_matriarch": {"attack_alt": {"deg": -20, "release": "before"}},
    # the dive bomber's bomb leaves along the diving plane, from where it hung
    "dive_bomber": {"*": {"release": "before"}},
}


def base_of(name):
    for s in AIMED_SUFFIXES:
        if name.endswith(s):
            return name[: -len(s)]
    return name


def is_attack(name):
    return base_of(name) in ATTACKS


def spec_for(slug, name):
    unit = SPEC.get(slug) or SPEC.get(slug.split("@")[0], {})   # a skin ("<unit>@<skin>") aims as its unit
    out = {}
    for key in ("*", base_of(name), name):
        out.update(unit.get(key, {}))
    return out


def _tracker(rig, clip, sp):
    """The tracker a clip's shot leaves from: the spec's, else the one its impact-frame `muzzle` comes from
    (`attack_meta`: the clip's muzzleTracker, else muzzle, else beam); a second attacker whose clip writes no
    muzzle (`noMuzzle`) shoots from its own per-frame anchor (the sponson gunners' mgMuzzle)."""
    if sp.get("tracker"):
        return sp["tracker"] if sp["tracker"] in rig.trackers else None
    if clip.extra.get("noMuzzle"):
        if base_of(clip.name) == "attack_alt":
            return next((t for t in ALT_TRACKERS if t in rig.trackers), None)
        return None   # a melee clip of a unit that carries a rider's or a gunner's muzzle tracker
    own = clip.extra.get("muzzleTracker")
    if own and own in rig.trackers:
        return own
    return next((t for t in ("muzzle", "beam") if t in rig.trackers), None)


def shot_spec(rig, clip):
    """The resolved spec of a clip that launches a shot, or None (melee, no tracker, no impact)."""
    if not is_attack(clip.name) or clip.impact is None:
        return None
    sp = spec_for(rig.name, clip.name)
    if sp.get("shot") is False:
        return None
    tr = _tracker(rig, clip, sp)
    if tr is None and not sp.get("omni"):
        return None
    joint = sp.get("joint") or (rig.trackers[tr].parent.name.split(".", 1)[1] if tr else None)
    axis = sp.get("axis", (1.0, 0.0, 0.0))
    if axis == "muzzle":
        axis = _toward(rig, joint, tr)
    return dict(sp, tracker=tr, joint=joint, axis=tuple(axis))


def _toward(rig, joint, tracker):
    """The unit vector from `joint`'s pivot to the tracker, in the joint's rest (authoring) space."""
    e = rig.trackers[tracker]
    tj = e.parent.name.split(".", 1)[1]
    p = e.location + rig.rest[tj]           # the tracker in authoring space (as `rig.track` took it)
    d = p - rig.rest[joint]
    if d.length < 1e-6:
        raise ValueError(f"{rig.name}: the {tracker} tracker sits on {joint}'s pivot (no axis)")
    return d.normalized()


def axes_for(rig, clips):
    """{clip: (joint, axis)} of every shot clip with a measured weapon (for the probe)."""
    out = {}
    for c in clips:
        sp = shot_spec(rig, c)
        if sp and not sp.get("omni") and "deg" not in sp and sp["joint"]:
            out[c.name] = (sp["joint"], sp["axis"])
    return out


def release_frame(clip, sp):
    r = sp.get("release", "impact")
    if isinstance(r, int):
        return r
    step = clip.sequence.index(clip.impact)
    if r == "before":
        return clip.sequence[step - 1] if step > 0 else clip.impact
    return clip.impact


def aim_keys(rig, clip, tracks):
    """The aim keys of a clip as an ordered dict ({} for a clip that launches nothing)."""
    sp = shot_spec(rig, clip)
    if sp is None:
        return {}
    f = release_frame(clip, sp)
    out = {}
    if sp.get("omni"):
        out["omni"] = True
    elif "deg" in sp:
        out["aimDeg"] = round(float(sp["deg"]), 1) + 0.0
    else:
        probe = rig.__dict__["_probe"]
        deg = probe.data[clip.name]["axis"][f]
        out["aimDeg"] = round(deg, 1) + 0.0
    tr = sp["tracker"]
    pt = (tracks or {}).get(tr, [None] * (f + 1))[f] if tr else None
    if "at" in sp:
        pt = [float(sp["at"][0]), float(sp["at"][1])]
    if pt is not None and (abs(pt[0]) > 1e-9 or abs(pt[1]) > 1e-9):
        out["release"] = {"frame": f, "atLu": [pt[0], pt[1]]}
    return out


VARIANT_TIMING = ("frames", "durationMs", "durationsMs", "impactAt", "impactStep", "impactFrame", "holdStep",
                  "holdLoop", "smearFrame")


def check_variant(base_meta, meta, name):
    """C2: an aimed variant keeps its base clip's timing exactly (a retime that touched only the base, or a
    hand-made variant that drifted, fails the render here)."""
    for k in VARIANT_TIMING:
        if meta.get(k) != base_meta.get(k):
            raise ValueError(f"{name}.{k}: {meta.get(k)} != {meta.get('aimOf')}'s {base_meta.get(k)}")
    if len(meta["sequence"]) != len(base_meta["sequence"]):
        raise ValueError(f"{name}: sequence length differs from {meta.get('aimOf')}'s")


def annotate_clips(mod, clips, clip_meta, rig, tracks):
    """pipeline.run_unit, after the clip meta: every shot clip's aim keys at the end of its meta, and every
    aimed variant checked against its base clip's timing. Troop units and their skins only (turrets, forts and
    bases aim in code)."""
    from .damage import FAMILY, is_troop
    if not (is_troop(mod) or getattr(mod, "SKIN_OF", None) in FAMILY):
        return
    for c in clips:
        m = clip_meta[c.name]
        if m.get("aimOf") is not None:
            check_variant(clip_meta[m["aimOf"]], m, c.name)
        for k in AIM_KEYS:
            m.pop(k, None)
        m.update(aim_keys(rig, c, tracks.get(c.name)))


# -- the JSON-only rewrite of shipped sheets (anchors_only.py --aim) --------------------------------------
def _dumps(js):
    return json.dumps(js, indent=1)


def rewrite_sheets(slug, age, rig, clips, tracks, units_dir):
    """Writes the aim keys into the unit's four installed sheet JSONs (core and extras, 1x and HD): each shot
    clip's meta loses any old aim keys and gains the new ones at its end; nothing else changes (a file whose
    JSON does not round-trip byte for byte is left alone and reported). Returns {"clips": {clip: keys},
    "changed": [files], "skipped": [files]}."""
    keys = {c.name: aim_keys(rig, c, tracks.get(c.name)) for c in clips}
    report = {"clips": {k: v for k, v in keys.items() if v}, "changed": [], "skipped": []}
    for stem in (slug, f"{slug}.hd", f"{slug}.x", f"{slug}.x.hd"):
        p = os.path.join(units_dir, age, f"{stem}.json")
        if not os.path.exists(p):
            continue
        with open(p) as fh:
            text = fh.read()
        js = json.loads(text)
        if _dumps(js) != text:
            report["skipped"].append(f"{stem}.json (does not round-trip)")
            continue
        for name, m in js["meta"]["ageborn"]["clips"].items():
            for k in AIM_KEYS:
                m.pop(k, None)
            m.update(keys.get(name, {}))
        new = _dumps(js)
        if new != text:
            with open(p, "w") as fh:
                fh.write(new)
            report["changed"].append(f"{stem}.json")
    return report
