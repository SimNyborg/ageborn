"""Damage bundles (queue item 40, item 38 B0; COMMON C1): one JSON per age, `public/art/damage/<age>.json`,
outside `public/art/units/` because the sheet scanners read every JSON there as a unit sheet.

    {"v": 1, "units": {"<slug>": {"family": ..., "spots": [...], "clips": {...}, "torso": {...}, "head": {...}}}}

Every unit gets `family`, `torso` and `head`; `spots` and `clips` only where its script authors spots. Frames
are unique frames, indexed like the sheet's `anchorsLu` (the runtime maps a step to its frame through
`sequence`), extras clips included. A render writes `<out>/<slug>.damage.json` (the unit's entry) and the
install merges it into the age's bundle; `anchors_only.py --bundles` writes the same entries without Cycles.
The bundle is written one unit per line, units sorted, so a rerun with the same data writes the same bytes.
"""
import json
import os

# -- vocabulary (COMMON C1; item40 appendix A) --------------------------------------------------------
FAMILIES = ("soldier", "armoured", "beast", "rider", "vehicle", "flyer", "mech", "energy")
KINDS = ("mark", "strip", "emit")
SURFACE_MATS = ("cloth", "hide", "metal", "wood", "stone", "glass", "energy")   # marks and strips
EMIT_MEDIA = ("smoke", "steam", "spark", "breath", "motes")                       # emitters
MARK_MIN_R = 5.0


def check_spot(name, kind, mat, radius):
    if kind not in KINDS:
        raise ValueError(f"damage spot {name!r}: kind {kind!r} is not one of {KINDS}")
    allowed = EMIT_MEDIA if kind == "emit" else SURFACE_MATS
    if mat not in allowed:
        raise ValueError(f"damage spot {name!r}: a {kind}'s mat {mat!r} is not one of {allowed}")
    if not radius > 0:
        raise ValueError(f"damage spot {name!r}: radius must be positive")
    if kind == "mark" and radius < MARK_MIN_R:
        raise ValueError(f"damage spot {name!r}: a mark's radius is at least {MARK_MIN_R} lu (got {radius})")


REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DAMAGE_DIR = os.path.join(REPO, "public", "art", "damage")
BUNDLE_VERSION = 1


def _fam(family, slugs):
    return {s: family for s in slugs.split()}


# item40-visible-damage.md appendix A (all 167 sheets), except the Grand Marshal: appendix A lists it with the
# soldiers, but it rides a horse (a rider and mount rig, like the Cuirassier); a script may override with DAMAGE_FAMILY
FAMILY = {
    **_fam("soldier", """
        atlatl_thrower beast_caller bolas_thrower bonker boulder_hurler drum_shaman herbalist pebbler pelt_rager
        rockfall_shaman spear_hunter torch_runner training_dummy
        aulos_piper belly_bowman cretan_archer discus_thrower javelineer rhodian_slingers standard_bearer
        thracian_raider tragic_chorus
        alchemist brigand crossbowman flailman friar herald kennel_master longbowman pikeman squire_pair yeoman_archer
        bagpiper blunderbuss coehorn_crew corsair drummer_boy field_surgeon fusilier grenadier highlander
        mesmerist powder_monkey voltigeurs wall_gunner
        alpine_climber bandmaster bomb_bowler carbineer clockwork_tinker coal_miners flare_spotter harpoon_gunner
        riveter sapper spark_scientist steam_driller trench_mortar
        bazooka_trooper bulldog_sergeant combat_medic commando ghillie_sniper mortar_team radio_operator rifle_grenadier
        rifleman smg_squad sticky_bomber trench_raider
        arc_lobber emp_saboteur needle_gunner overclock_engineer plasma_lancer pulse_trooper rail_gunner
        antimatter_rifler bio_weaver graviton_halberdier ion_ranger nova_thrower star_mortar starwarden"""),
    **_fam("armoured", """hide_shield hoplite phalangite shield_bearer footman greatsword_knight warhammer_sergeant
        iron_mantlet sandbag_carrier barrier_trooper photon_knight star_legionnaire"""),
    **_fam("beast", """cave_bear cave_pup hunting_wolves sabertooth tuskback woolly_rhino hydra minotaur lindworm
        war_hound moonlings swarm_matron swarmling"""),
    **_fam("rider", """elk_chieftain mammoth_matriarch amazon_rider war_elephant destrier_knight ursa_paladin
        cuirassier dragoon hussar grand_marshal dispatch_rider hover_bike star_leviathan void_skimmer"""),
    **_fam("vehicle", """scorpion war_chariot wooden_horse battering_ram mangonel_cart siege_belfry bronze_cannon
        rocket_cart armoured_car armoured_train land_dreadnought steam_tractor assault_gun behemoth_tank bulldozer
        tankette drone_carrier particle_cannon hover_tank"""),
    **_fam("flyer", """balloon_admiral dive_bomber gyrocopter sky_fortress attack_drone jetpack_trooper repair_drone
        mothership star_fighter"""),
    **_fam("mech", """bronze_colossus clockwork_soldier steam_golem android_pair chrono_titan crab_mech
        overload_android walker_mech asteroid_golem"""),
    **_fam("energy", "holo_decoy holo_projector crystal_guard gravity_sage void_whisperer warp_stalker"),
}
assert all(f in FAMILIES for f in FAMILY.values())


def is_troop(mod):
    """A troop unit (its sheet gets a bundle entry and aim data), not a turret, fort, base or shared effect."""
    return bool(getattr(mod, "DAMAGE_FAMILY", None)) or mod.SLUG in FAMILY or bool(getattr(mod, "IS_TROOP", False))


def family_of(mod):
    fam = getattr(mod, "DAMAGE_FAMILY", None) or FAMILY.get(mod.SLUG)
    if fam not in FAMILIES:
        raise ValueError(f"{mod.SLUG}: no damage family (set DAMAGE_FAMILY to one of {FAMILIES})")
    return fam


def entry(mod, rig, clips):
    """The unit's bundle entry from the probe that measured its frames (render_clips leaves it on the rig)."""
    probe = rig.__dict__.get("_probe")
    if probe is None:
        raise RuntimeError(f"{mod.SLUG}: no probe data (render.render_clips measures every frame)")
    if probe.body is None:
        from .probe import resolve_body
        resolve_body(rig)   # raises with the names it tried
    e = {"family": family_of(mod)}
    names = [c.name for c in clips]
    for n in names:
        d = probe.data.get(n)
        if d is None or any(v is None for v in d["torso"]) or any(v is None for v in d["head"]):
            raise RuntimeError(f"{mod.SLUG}.{n}: a frame without torso or head data")
    if rig.damage_spots:
        spots = []
        for sid, s in rig.damage_spots.items():
            spot = {"id": sid, "kind": s["kind"], "mat": s["mat"], "r": round(s["radius"], 1)}
            if s["team"]:
                spot["team"] = True
            spots.append(spot)
        e["spots"] = spots
        e["clips"] = {n: {sid: probe.data[n]["spots"][sid] for sid in rig.damage_spots} for n in names}
    e["torso"] = {n: probe.data[n]["torso"] for n in names}
    e["head"] = {n: probe.data[n]["head"] for n in names}
    return e


def dumps_entry(e):
    return json.dumps(e, separators=(",", ":"))


def write_entry(mod, rig, clips, out_dir, file_slug=None):
    """A render's unit entry, `<out>/<slug>.damage.json` (merged into the age bundle on install); nothing for
    a turret, fort, base or shared effect."""
    if not is_troop(mod):
        return None
    path = os.path.join(out_dir, f"{file_slug or mod.SLUG}.damage.json")
    with open(path, "w") as fh:
        fh.write(dumps_entry(entry(mod, rig, clips)) + "\n")
    return path


def bundle_path(age):
    return os.path.join(DAMAGE_DIR, f"{age}.json")


def read_bundle(age):
    p = bundle_path(age)
    if not os.path.exists(p):
        return {"v": BUNDLE_VERSION, "units": {}}
    with open(p) as fh:
        b = json.load(fh)
    if b.get("v") != BUNDLE_VERSION:
        raise ValueError(f"{p}: bundle version {b.get('v')} (this pipeline writes {BUNDLE_VERSION})")
    return b


def write_bundle(age, units):
    """Writes the age bundle: one unit per line, sorted by key (the same data gives the same bytes)."""
    os.makedirs(DAMAGE_DIR, exist_ok=True)
    keys = sorted(units)
    lines = [f"{json.dumps(k)}:{dumps_entry(units[k])}" for k in keys]
    text = '{"v":%d,"units":{\n' % BUNDLE_VERSION + ",\n".join(lines) + "\n}}\n"
    p = bundle_path(age)
    old = open(p).read() if os.path.exists(p) else None
    if old != text:
        with open(p, "w") as fh:
            fh.write(text)
    return p


def merge_entries(age, entries):
    """Replaces (or adds) these units' entries in the age bundle; the other units stay as they are."""
    b = read_bundle(age)
    units = dict(b["units"])
    units.update(entries)
    return write_bundle(age, units)


def install_entry(slug, out_dir, age):
    """render_all / render_industrial install: merge the render's `<slug>.damage.json` into the bundle."""
    src = os.path.join(out_dir, f"{slug}.damage.json")
    if not os.path.exists(src):
        return None
    with open(src) as fh:
        e = json.load(fh)
    p = merge_entries(age, {slug: e})
    print(f"  merged {slug} into {os.path.relpath(p, REPO)}", flush=True)
    return p
