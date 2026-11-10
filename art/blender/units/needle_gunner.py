"""Needle Gunner: Future Age common ranged, Skirmisher (CONTENT_PLAN 5.7). Twin-barrel needle gun, ~70 lu.

Look (A11, Future palette): a light trooper in glossy white armour over a charcoal suit, the hard-hat
helmet in team colour with a dark half visor (mint eyes that act), a team chest plate with the hex, team
shoulder pads and a backpack with a team band. The gun is a stubby charcoal receiver with a white shroud
and a TWIN rotary barrel cluster (two white barrels on a mint-ringed hub that spins), a team drum magazine
underneath and a magenta muzzle ring. Needles are thin mint darts.

"A viewer expects a minigunner: the barrels spin up with a whine, then a fast stitch of light shots."

Animation (ANIM_SPEC G1 jog at card 75 x 1.25 = 93.75 lu/s, appendix B guns; the sim fires every 0.5 s):
  idle      the gun at low ready, the barrels idle-turn, he flicks the drum with the far hand, a blink
  walk      walk v3 jog with the gun carried at port across the chest
  attack    SPIN-UP BURST: shoulders the gun, the barrels spin up (a mint ring smear at the hub, the held
            extreme), one needle snaps out (a flash), the gun shudders
  attack_b  HIP STITCH: a low wide crouch with the gun braced at the hip, spinning (the held extreme), one
            needle from the hip, the muzzle jumps up
  hit       light: the head snaps back, eyes > <
  die       D1 fling and spin, the gun flung away, X eyes
"""
from ageborn_art import aimed as AIMED
from ageborn_art import face as FC
from ageborn_art import kit_future as KF
from ageborn_art import kit_future_wave as W
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import futcos_w4 as FW

SLUG = "needle_gunner"
GAIT_NAME = "biped"
NAME = "Needle Gunner"
HEIGHT_LU = 70
CANVAS = (300, 240)
FEET = (110, 210)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (46, 30)}
NO_RETIME = True

# the detail standard (art round W4): the white soldiers' lifts; the wave kit's plates in the W4 off-white (look.remap)
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 0.5
LOOK_SHADE = FW.SHADE_WHITE
LOOK_RIM = dict(FW.RIM_SOLDIER, lift=0.42)
SKIN_PALETTE = FW.KIT_TROOPER       # (FW.KIT_WHITE: highlight share 0.108)
SPIN = "#8CF5D0"               # the hub rings' spin shell and rings, a mid mint (MINT_CORE rang the highlight share)
MATERIAL_KINDS = FW.kinds_future()

G0 = (4.0, -15.0, 27.0)      # gun grip at rest (character space); the gun is a torso child
FORE = 13.0
MUZZLE = (G0[0] + 40.0, G0[1], G0[2] + 3.0)
HUB = (G0[0] + 20.0, G0[1], G0[2] + 3.0)


def _gun(rig, j):
    gx, gy, gz = G0
    g = Geo().blob((gx + 9.0, gy + 1, gz + 3.5), (10.0, 3.4, 4.4), p=3.6)       # receiver
    g.blob((gx - 6, gy + 1, gz + 2.5), (5.6, 2.6, 3.6), p=3.4, rot=(0, 10, 0))  # stock
    g.blob((gx + 0.5, gy + 1, gz - 1.5), (2.2, 2.0, 4.2), p=2.8, rot=(0, -12, 0))
    g.blob((gx + 13.0, gy + 2, gz - 1.0), (2.0, 1.8, 3.4), p=2.8, rot=(0, -8, 0))
    rig.part(j, g, F.SUIT)
    g = Geo().blob((gx + 10.0, gy + 1, gz + 7.6), (9.0, 3.0, 2.2), p=3.4)      # shroud (W4: light gun grey)
    rig.part(j, g, FW.GUN_LT, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(0, -1.0), (5.0, -0.8), (5.0, 3.6), (0, 3.8)], (gx + 6.0, gy + 1, gz - 3.4),
                    (gx + 6.0, gy + 1, gz - 6.6), segs=18)                       # drum magazine (team)
    rig.part(j, g, team=True, outline=0.6)
    hx, hy, hz = HUB
    g = Geo().lathe([(0, -0.5), (4.6, -0.45), (4.6, 0.45), (0, 0.5)], (hx - 1.0, hy + 1, hz), (hx, hy + 1, hz), segs=16)
    g.lathe([(0, -0.5), (4.6, -0.45), (4.6, 0.45), (0, 0.5)], (hx + 8.0, hy + 1, hz), (hx + 9.0, hy + 1, hz), segs=16)
    rig.part(j, g, glow=W.MINT, outline=1.0, outline_hex=F.SUIT)      # (W4: 1.6 lu thick)
    g = Geo().capsule((hx, hy + 1, hz + 2.2), (MUZZLE[0] - 2.0, hy + 1, hz + 2.2), 1.6)
    g.capsule((hx, hy + 1, hz - 2.2), (MUZZLE[0] - 2.0, hy + 1, hz - 2.2), 1.6)
    rig.part(j, g, FW.GUN_LT, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(2.0, 0), (4.6, 0.2), (4.6, 1.6), (2.2, 1.8)], (MUZZLE[0] - 2.5, hy + 1, hz),
                    (MUZZLE[0] + 1.0, hy + 1, hz), segs=18)
    rig.part(j, g, F.MAGENTA)
    # W4: seams across the white shroud and a scuffed nose, vent slots on the receiver, a team-dark ring on the drum
    g = Geo()
    for x in (gx + 5.0, gx + 13.0):
        g.capsule((x, gy - 2.05, gz + 9.4), (x + 0.4, gy - 2.05, gz + 5.8), 0.36, segs=8, rings=2)
    rig.part(j, g, FW.GUN_SEAM, outline=0, highlight=False)
    g = Geo().blob((gx + 17.2, gy - 1.8, gz + 8.6), (1.2, 0.4, 0.6), p=2.2)
    rig.part(j, g, FW.WEAR_ON_WHITE, outline=0, highlight=False)
    g = Geo()
    for x in (gx + 2.0, gx + 4.6, gx + 7.2):
        g.capsule((x, gy - 2.45, gz + 1.6), (x + 1.4, gy - 2.45, gz + 1.6), 0.42, segs=8, rings=2)
    rig.part(j, g, FW.LINE_ON_SUIT, outline=0, highlight=False)
    g = Geo().lathe([(4.9, -0.4), (5.15, 0.0), (4.9, 0.4)], (gx + 6.0, gy + 1, gz - 4.4), (gx + 6.0, gy + 1, gz - 5.4),
                    segs=20)
    FW.team_dark(rig, j, g)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, helmet_kind="hardhat", team_greave=False, strip=False, pack=False)
    FW.strip(rig)
    FW.wave_pack(rig)
    rig.joint("gun", "torso", G0)
    _gun(rig, "gun")
    # the spinning hub: a mint ring smear shell shown while spinning
    hx, hy, hz = HUB
    rig.joint("spin", "gun", HUB, hidden=True)
    g = Geo().lathe([(3.0, -4.6), (6.0, -4.4), (6.0, 4.4), (3.0, 4.6)], (hx + 4.5, hy + 1.2, hz - 0.01),
                    (hx + 4.5, hy + 1.2, hz + 0.01), segs=24)
    g = Geo().capsule((hx, hy + 0.4, hz + 4.6), (MUZZLE[0] - 3.0, hy + 0.4, hz + 4.6), 0.7)     # (W4: r 1.0)
    g.capsule((hx, hy + 0.4, hz - 4.6), (MUZZLE[0] - 3.0, hy + 0.4, hz - 4.6), 0.7)
    rig.part("spin", g, glow=SPIN, outline=0.8, outline_hex=W.MINT)
    rig.track("muzzle", "gun", MUZZLE)
    mx, my, mz = MUZZLE
    rig.joint("flash", "gun", MUZZLE, hidden=True)
    g = Geo().blob((mx + 7.0, my - 1, mz), (7.6, 1.4, 2.8), p=2.0)
    g.blob((mx + 3.6, my - 1, mz + 2.4), (5.0, 1.3, 1.6), p=2.0, rot=(0, -34, 0))
    g.blob((mx + 3.6, my - 1, mz - 2.4), (5.0, 1.3, 1.6), p=2.0, rot=(0, 34, 0))
    rig.part("flash", g, glow=W.MINT, outline=0)
    g = Geo().blob((mx + 4.6, my - 2, mz), (4.6, 1.2, 1.6), p=2.0)
    rig.part("flash", g, glow=F.WHITE, outline=0)
    KI.loose(rig, "gun_loose", G0, lambda j: _gun(rig, j))
    FW.wave_trooper(rig, helmet_kind="hardhat")
    if getattr(rig, "skin", None) is None:
        _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, soldier; never on the face): the team band on the pack, the near
    shoulder pad, the team hard hat, the white faulds, the near thigh."""
    rig.damage_spot_at("pack", "torso", -11.4, 36.6, 5.5, "metal", team=True)
    rig.damage_spot_at("pauldron", "arm_r", 0.5, 39.0, 5.0, "metal", team=True)
    rig.damage_spot_at("hat", "head", -3.0, 58.0, 5.5, "metal", team=True)
    rig.damage_spot_at("faulds", "hips", -5.0, 16.0, 5.0, "metal")
    rig.damage_spot_at("thigh", "thigh_r", 1.0, 13.0, 5.0, "cloth")


def hold(gx, gz, deg):
    return F.hold2("gun", G0, FORE, gx, gz, deg)


LOW = (6.0, 25.0, -8.0)
STANCE = merge(hold(*LOW), {"torso": {"r": -2.0}})


def _idle(f):
    flick = [0.0, 0.0, 0.6, 1.0, 0.4, 0.0][f]
    pose = M.idle_v2(f, STANCE, frames=6, blink=1, face_blink=KF.glyph("g_blink"))
    pose = merge(pose, {"gun": {"r": -8.0 + 1.4 * (f % 3 - 1)}})
    if flick > 0:
        a, fo = F.ik2(F.SH, (LOW[0] + 4.0, LOW[1] - 6.0 + 2.0 * flick))
        pose.update(F.arm("l", a, fo))
    if f in (2, 3):
        pose["spin"] = {"show": f == 3}
    return KI.ground_feet(RIG, pose, LEGS)


SPEED = 93.75
LEGS = KF.legs_ik()
GAIT = KF.jog_gait(LEGS, SPEED, cycle_ms=600)
PORT = (1.0, 23.0, 32.0)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(F.hold2("gun", G0, 8.5, PORT[0], PORT[1] + 1.0 * lag, PORT[2] - 4.0 * lag),
                     {"head": {"r": 4.0 - 2.0 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -3.0}}, GAIT, legs=LEGS, lean=-10.0, twist=6.0, nod=3.0,
                     extra=extra, report=report)


# -- attack: spin-up burst (500 ms like the sim interval, impact at 250 ms = 0.5) --------------------
ATTACK_MS = [40, 60, 100, 50, 50, 60, 60, 80]
ATTACK_IMPACT = 4
#     raise aim  HOLD spin2 FIRE shud settle low
GX = [7.0, 7.5, 7.5, 7.5, 7.5, 6.0, 6.5, 6.0]
GZ = [30.0, 34.0, 34.0, 34.0, 34.5, 35.5, 31.0, 26.0]
DEG = [-4.0, 0.0, 0.0, 0.0, 0.0, 10.0, 2.0, -6.0]
BX = [0.0, 0.5, 1.0, 1.0, 0.0, -2.5, -1.0, 0.0]
BZ = [0.0, -0.6, -1.4, -1.2, -0.6, 0.2, 0.0, 0.0]
BQ = [0.0, -0.03, -0.07, -0.06, 0.04, -0.06, 0.02, 0.0]
TR = [-2, -4, -6, -6, -3, 4, 0, -2]
EYES = ["eyes", "g_angry", "g_angry", "g_squint", "g_squint", "g_angry", "eyes", "eyes"]


# aimed shots (queue item 44, ageborn_art/aimed.py; W4): the Pulse Trooper's rule, a turn of `turn` degrees up raises
# the gun toward the cheek and leans the torso back (the torso carries the gun, so its lean is part of the turn)
AIM_LEAN = 0.22           # torso r per degree of turn (positive leans back)
AIM_RISE = 0.10           # grip z per degree up (torso space, lu)
AIM_DRAW = 0.05           # grip x per degree up (drawn back toward the shoulder)
AIM_HEAD = 0.30           # head r per degree, on top of the torso's lean
#        raise aim  HOLD spin2 FIRE shud settle low
AIM_W = [0.0, 0.6, 1.0, 1.0, 1.0, 0.8, 0.4, 0.15]


def _aim(gx, gz, deg, turn):
    """The grip and the gun's angle (torso space) turned `turn` degrees up, with the torso's lean taken out."""
    if not turn:
        return gx, gz, deg
    up = max(0.0, turn)
    return gx - AIM_DRAW * up, gz + AIM_RISE * up, deg + turn - AIM_LEAN * turn


def _a_pose(f, turn=0.0):
    pose = merge(hold(*_aim(GX[f], GZ[f], DEG[f], turn)), {
        "torso": {"r": TR[f] + AIM_LEAN * turn},
        "head": {"r": TR[f] - 2 + AIM_HEAD * turn, "x": 1.0 if f in (1, 2, 3, 4) else 0.0},
        "thigh_r": {"r": [4, 10, 14, 14, 12, 8, 4, 2][f]}, "shin_r": {"r": [0, -4, -8, -8, -6, -2, 0, 0][f]},
        "thigh_l": {"r": [-4, -10, -14, -14, -16, -12, -6, -4][f]}, "shin_l": {"r": [0, -2, -6, -6, -4, 0, 0, 0][f]},
        "spin": {"show": f in (2, 3, 4)}, "flash": {"show": f == 4},
    }, M.body_about((0, 0, 22), x=BX[f], z=BZ[f], q=BQ[f]))
    if f == 3:
        pose["body"]["x"] += 0.35
    return KI.ground_feet(RIG, merge(pose, KF.glyph(EYES[f])), LEGS)


def _spin_ov(k, rr=(6.5, 10.0)):
    return [{"kind": "rings", "joint": "gun", "point": (HUB[0] + 4.0, HUB[1], HUB[2]), "radii_lu": rr,
             "a0": -80.0, "a1": 80.0, "color": SPIN}]


def _fire_ov(seed):
    return [{"kind": "burst", "joint": "gun", "point": MUZZLE, "r0_lu": 6.0, "r1_lu": 11.0, "n": 5,
             "a0": -60.0, "arc": 120.0, "color": W.MINT_CORE}]


def _attack_clip():
    ov = {2: _spin_ov(2), 3: _spin_ov(3, (7.5, 11.5)), 4: _fire_ov(141)}
    return M.clip("attack", [_a_pose(f) for f in range(8)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  extra={"holdStep": 2})


# -- attack B: hip stitch ---------------------------------------------------------------------------
B_GX = [5.0, 3.0, 2.0, 2.5, 3.0, 1.0, 4.0]
B_GZ = [26.0, 21.5, 20.0, 20.0, 20.5, 23.0, 25.0]
B_DEG = [-6.0, 4.0, 6.0, 6.0, 2.0, 24.0, 8.0]
B_BX = [0.0, -0.5, -1.0, -1.0, -1.0, -3.0, -1.0]
B_BZ = [-2.0, -6.0, -8.0, -8.0, -7.0, -5.0, -2.5]
B_TR = [-4, 4, 7, 7, 6, 12, 4]
B_THR = [10, 24, 30, 30, 30, 24, 12]
B_SHR = [-6, -18, -24, -24, -22, -16, -8]
B_THL = [-10, -22, -28, -28, -30, -24, -12]
B_SHL = [-4, -16, -22, -22, -20, -12, -6]
B_EYES = ["g_angry", "g_angry", "g_angry", "g_squint", "g_squint", "g_hurt", "eyes"]


def _b_pose(i):
    if i == 7:
        return _a_pose(7)
    k = i
    pose = merge(hold(B_GX[k], B_GZ[k], B_DEG[k]), {
        "torso": {"r": B_TR[k]}, "head": {"r": -B_TR[k] * 0.6},
        "thigh_r": {"r": B_THR[k]}, "shin_r": {"r": B_SHR[k]},
        "thigh_l": {"r": B_THL[k]}, "shin_l": {"r": B_SHL[k]},
        "spin": {"show": k in (2, 3, 4)}, "flash": {"show": k == 4},
    }, M.body_about((0, 0, 22), x=B_BX[k], z=B_BZ[k]))
    if k == 3:
        pose["body"]["x"] += 0.3
    return KI.ground_feet(RIG, merge(pose, KF.glyph(B_EYES[k])), LEGS)


def _attack_b():
    ov = {2: _spin_ov(2), 3: _spin_ov(3, (7.5, 11.5)),
          4: _fire_ov(142) + [{"kind": "dust", "ground": (-12.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 143,
                                "spread": 0.8, "color": W.DUST}]}
    return M.clip("attack_b", [_b_pose(i) for i in range(8)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse={7: ("attack", 7)}, extra={"holdStep": 2})


def _hit(k):
    base = {"torso": {"r": -2.0}}
    return W.hit_pose(k, base, lambda a: hold(LOW[0] - 2 * max(a, 0), LOW[1] + 2 * max(a, 0), LOW[2] + 18 * a))


GUN_PATH = [None, (6, 14, 60), (10, 26, 170), (14, 28, 300), (18, 16, 430), (22, 0, 560),
            (24, -20, 700), (25, -24, 720), (25, -24, 720), (25, -24, 720)]


def _die(k):
    return W.die_d1(k, STANCE, HEIGHT_LU, prop="gun", prop_path=GUN_PATH)


def clips():
    attack = _attack_clip()
    # aimed up about 45 and 70 degrees at flyers (the Needle Gunner hits air; they go to the extras sheet): the
    # shouldered burst (A); the hip stitch (B) keeps the runtime's lean
    aimed = AIMED.variants(RIG, attack, _a_pose, AIM_W, aims=("up45", "up70"))
    for v in aimed:
        AIMED.check_timing(attack, v)
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        attack,
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ] + aimed
    return M.check_variants(M.check_contract(cl, attack_ms=500, attack_impact_at=0.5))
