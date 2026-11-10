"""Bazooka Trooper: Modern Age anti-armor (DESIGN A5.5). Rocket (proj.rocket), 200 lu, ~70 lu.

Look (A11, Modern palette): a broad soldier in a round helmet with a team band and goggles pushed
up on its front, a team tunic with rolled-up team sleeves (cream chevrons on the near sleeve), khaki
webbing with rocket pouches, olive trousers and khaki puttees, and an olive backpack with a spare
rocket standing up out of it. A huge team launcher tube rests on his near shoulder (gunmetal bells,
olive bands, a pistol grip, a front grip, a sight, dark and pale hazard stripes on the rear bell)
with a gunmetal warhead with a signal band peeking out of the front: the long tube is the
anti-armor silhouette at 56 px.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    peeks through the sight (leans in, one eye squeezed), then looks up over it, blink
  walk    stomp: bow-legged, a heavy down frame, the tube rocking on his shoulder a frame late
  attack  BACK-BLAST KNOCKBACK: he hefts the tube, braces wide, squints down the sight (the held
          extreme), FIRES (a front flash and a back-blast flash, impact lines), and the kick knocks
          him back a step: a huge smoke cloud billows out behind the tube, he teeters on one foot
          with his eyes wide, wobbles back upright, pulls the spare rocket from his pack and the
          fresh warhead is back in the tube as he settles. The rocket leaves the per-frame `muzzle`
          anchor on the fire frame and is gone from the tube until the reload.
  hit     light: the head snaps back, the helmet lifts, eyes squeezed, overshoot forward
  die     D1 fling and spin: the helmet pops off and the tube flies; X eyes and tongue

Animation standard (ANIM_SPEC 2026-10-02):
  walk      walk v3 bounce jog at ground speed (G1, 65 x 1.25 = 81.25 lu/s), a heavy-footed stomp: the
            tube sloped up on his shoulder rocking a frame late, the spare rocket nodding in the pack,
            planted feet
  attack    A as above; the aim is split into the hold and a sight-wobble frame (holdLoop: the sim
            wind-up is 2.1x the authored one)
  attack_b  KNEELING BRACED FIRE: he drops to one knee, the tube level on his shoulder, squints down
            the sight (the held extreme, holdLoop), fires (front and back blast), the kick rocks him
            back onto his heel, he slaps the spare rocket home on one knee and rises

Art round W3 (the detail standard): both shots aimed up about 45 and 70 degrees at flyers (item 44) and damage
spots measured in posed frames (item 40).
"""
import math

from ageborn_art import aimed as AIMED
from ageborn_art import face as F
from ageborn_art import kit_bronze_detail as KD
from ageborn_art import kit_gunpowder as KG
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_modern as KM
from ageborn_art import look
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from units import modern_w3 as MW
from units import stone_w1 as W1

SLUG = "bazooka_trooper"
GAIT_NAME = "biped"
NAME = "Bazooka Trooper"
HEIGHT_LU = 70
CANVAS = (380, 262)
FEET = (184, 222)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (40, 44)}
NO_RETIME = True

TY, TZ = -15.5, 37.5         # tube axis: in front of the near shoulder
T0, T1 = -30.0, 30.0         # tube ends (x)
TR = 4.4                     # tube radius
PIVOT = (-2.0, TY, TZ)       # the tube rotates about the shoulder
GRIP = (6.0, TY + 1.0, TZ - 8.5)
FORE = (15.0, TY + 1.0, TZ - 6.0)
MUZZLE = (T1 + 1.0, TY, TZ)
WARHEAD = "#50565C"
HELM_C = (1.0, 0.0, 55.0)
SPARE = (-15.0, 3.0, 40.0)   # the spare rocket's base in the pack
PACK = ((-12.4, 1.0, 29.0), (5.4, 9.0, 9.0))          # the olive backpack's blob (p 3.2)
SOLE = "#2B2A2E"
BOOT = "#4A3F36"             # W3: a lit side on the boots (was rigs_modern.BOOT #3E342D)
HELMET = "#63674B"           # the helmet's olive paint (steel; rigs_modern.OLIVE stays cloth: pack and trousers)
CHIP = "#7E8264"             # W3: worn paint on the olive helmet (a step lighter than the olive)
# worn paint chips on the helmet's dome above the team band (side-view centre, outline offsets), 3 lu across
CHIPS = [((-6.0, 61.2), [(-1.7, -1.1), (1.3, -1.5), (1.8, 0.9), (-0.6, 1.5), (-1.9, 0.4)]),
         ((3.6, 63.6), [(-1.5, -1.2), (1.6, -1.0), (1.4, 1.2), (-1.2, 1.4)]),
         ((-2.2, 65.2), [(-1.3, -0.9), (1.5, -1.1), (1.2, 1.0), (-1.5, 1.1)])]

# the detail standard (art round W3, ageborn_art/look.py): the lifts and the model detail of audit 5.1 / 5.2.
# What a player sees of a Bazooka Trooper is the team tube across him, the helmet with its goggles, the tunic below
# the tube and the pack: the tube in two tones (its front section team-dark, the business end, against the bright
# middle with the khaki pad and the striped rear), a team-dark hem on the tunic skirt, a side seam and the khaki
# front brace, team-dark folds on the rolled sleeves, the olive pack's lighter flap with a khaki strap and a steel
# buckle, worn paint chips on the olive helmet, lighter boots.
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = MW.HIGHLIGHT_SOLDIER
LOOK_SHADE = MW.SHADE_SOLDIER
MATERIAL_KINDS = MW.kinds({R.SKIN: "skin", R.HAIR: "fur", R.KHAKI: "cloth", R.KHAKI_LT: "cloth", KM.CREAM: "cloth",
                           KM.STRIPE_LT: "polymer", R.OLIVE: "cloth", R.OLIVE_LT: "cloth", HELMET: "iron",
                           CHIP: "iron",
                           BOOT: "leather", SOLE: "leather", R.LEATHER: "leather", R.GUNMETAL: "iron",
                           R.STEEL: "iron", WARHEAD: "iron", R.SIGNAL: "polymer", R.GLASS: "glass",
                           "team": "cloth"})


def _tube(rig, joint):
    g = Geo().capsule((T0 + 4, TY, TZ), (T1 - 2, TY, TZ), TR, TR, segs=20)
    tube = g
    face = F.Face(rig, joint, [tube])
    rig.part(joint, tube, team=True)
    g = Geo()   # flared rear bell and front ring
    g.lathe([(TR - 0.4, 0), (TR + 1.4, 2.0), (TR + 3.6, 7.0), (TR + 2.6, 7.6), (TR - 0.5, 1.0)],
            (T0 + 7.5, TY, TZ), (T0 - 2, TY, TZ), segs=22)
    g.lathe([(TR + 0.8, 0), (TR + 1.0, 3.0), (TR - 0.2, 3.6)], (T1 - 3.5, TY, TZ), (T1 + 2, TY, TZ), segs=22)
    rig.part(joint, g, R.GUNMETAL, finish="metal")
    # W3: the front section team-dark (the tube in two tones), from the front band into the front ring
    g = Geo().lathe([(TR + 0.05, 0.0), (TR + 0.32, 0.3), (TR + 0.32, 18.1), (TR + 0.05, 18.4)], (8.4, TY, TZ),
                    (26.8, TY, TZ), segs=22)
    look.team_part(rig, joint, g)
    g = Geo()   # olive bands, a shoulder pad
    for x in (-13.0, 7.0):
        g.lathe([(TR + 0.5, -1.7), (TR + 0.7, 0), (TR + 0.5, 1.7)], (x, TY, TZ), (x + 1, TY, TZ), segs=20)
    rig.part(joint, g, R.OLIVE, finish="gloss", outline=0.6)
    g = Geo().blob((-3.0, TY + 1.0, TZ - 4.7), (6.0, 2.6, 1.8), p=3.0)
    rig.part(joint, g, R.KHAKI, outline=0.6)
    # hazard stripes on the rear section (back-blast danger) and a chevron on the tube
    g = KM.stripes(face, Geo(), (-21.5, TZ - 1.0), 11.0, 6.2, n=4, slant=0.7)
    rig.part(joint, g, KM.STRIPE_LT, highlight=False, outline=0)
    g = KM.chevron(face, Geo(), (-3.0, TZ + 1.4), s=0.7, n=1, w=1.9)
    rig.part(joint, g, KM.CREAM, highlight=False, outline=0)
    g = Geo().blob((2.0, TY - 1.0, TZ + TR + 1.8), (2.4, 1.1, 2.2), p=3.0)   # sight frame
    g.capsule((GRIP[0], GRIP[1], TZ - TR), (GRIP[0] - 1.5, GRIP[1], GRIP[2]), 1.5)       # pistol grip
    g.capsule((FORE[0], FORE[1], TZ - TR), (FORE[0] + 0.5, FORE[1], FORE[2] - 1.0), 1.4)  # front grip
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.6)
    g = Geo().capsule((-12.0, TY - TR - 0.2, TZ + 1.0), (-8.0, TY - TR - 0.4, TZ - 5.0), 0.6)   # wire
    rig.part(joint, g, R.LEATHER, outline=0)


def _rocket(rig, joint, base, axis=(1, 0, 0), L=9.0):
    """A warhead (gunmetal nose, signal band) from `base` along `axis`."""
    bx, by, bz = base
    ax, ay, az = axis
    g = Geo().lathe([(TR - 0.9, 0), (TR - 0.8, 2.0), (TR - 1.6, 5.4), (1.0, 7.6), (0, 8.0)],
                    base, (bx + ax * L, by + ay * L, bz + az * L), segs=18)
    rig.part(joint, g, WARHEAD, finish="metal")
    g = Geo().lathe([(TR - 0.7, 0), (TR - 0.6, 1.6), (TR - 0.9, 2.4)], (bx + ax * 1.4, by + ay * 1.4, bz + az * 1.4),
                    (bx + ax * 4, by + ay * 4, bz + az * 4), segs=18)
    rig.part(joint, g, R.SIGNAL, outline=0.5)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KM.skeleton_v3(rig)
    KM.legs_v3(rig, trousers=R.OLIVE, thigh_r=4.9, boot=BOOT)
    # backpack with the spare rocket (fins down in the pack, warhead up)
    g = Geo().blob(*PACK, p=3.2)
    rig.part("torso", g, R.OLIVE)
    # W3: the pack's flap a step lighter, a khaki strap down it with a steel buckle
    rig.part("torso", KD.band_z(*PACK, 31.0, 40.0, p=3.2, grow=0.3), R.OLIVE_LT, outline=0.4)
    g = KD.stripe_x(*PACK, -14.1, -11.3, z0=21.5, z1=37.5, p=3.2, grow=0.55)
    rig.part("torso", g, R.KHAKI, outline=0.4)
    MW.studs(rig, "torso", [Geo().blob(*PACK, p=3.2)], [(-12.7, 31.2)], r=1.35, color=R.STEEL, outline=0.4)
    g = Geo().blob((-16.2, -3.6, 25.0), (2.4, 4.0, 4.0), p=3.2)
    rig.part("torso", g, R.KHAKI, outline=0.6)
    rig.joint("spare", "torso", SPARE)
    g = Geo().capsule((SPARE[0], SPARE[1], SPARE[2] - 8.0), (SPARE[0], SPARE[1], SPARE[2]), 2.4)
    rig.part("spare", g, R.GUNMETAL, finish="metal", outline=0.5)
    _rocket(rig, "spare", SPARE, axis=(0, 0, 1), L=8.0)
    R.tunic(rig, hem_z=13.0)
    MW.tunic_w3(rig)     # W3: a team-dark skirt hem, a side seam, the webbing's front brace
    KM.pouches(rig, "torso", [(9.2, -6.8, 19.2), (-4.0, -10.6, 19.0)], size=(2.4, 1.8, 3.4))
    g = Geo().capsule((2.0, -10.6, 37.0), (-8.0, -9.4, 22.0), 1.5)   # pack strap
    rig.part("torso", g, R.KHAKI, outline=0.6)

    KI.head_face(rig, brow=R.HAIR, brow_angry=True, mouth_dz=-9.0, mouth_w=6.0)
    g = Geo().blob((-6.0, 0, 46.0), (5.6, 9.8, 6.0), p=2.2)
    rig.part("head", g, R.HAIR, finish="hair")
    g = Geo().blob((-2.0, -11.2, 49.0), (2.6, 1.6, 3.4), p=2.2)   # ear
    rig.part("head", g, R.SKIN)

    def helmet(j):
        R.helmet_round(rig, c=HELM_C, color=HELMET, net=False, strap=(j == "hat"), joint=j)
        x, y, z = HELM_C
        MW.decals(rig, j, [Geo().blob((x, y, z + 1.5), (12.6, 12.2, 10.4), p=2.3)], CHIPS, CHIP)
        g = Geo()   # goggles pushed up on the helmet front
        for y in (-4.8, 4.4):
            g.lathe([(0, 0), (3.2, 0.2), (3.4, 2.4), (0, 2.6)], (11.4, y, 59.0), (14.0, y, 59.6), segs=14)
        rig.part(j, g, R.LEATHER, outline=0.6)
        g = Geo()
        for y in (-4.8, 4.4):
            g.blob((13.8, y, 59.5), (0.8, 2.5, 2.5), p=2.2)
        rig.part(j, g, R.GLASS, finish="gloss", outline=0)
    rig.joint("hat", "head", HELM_C)
    helmet("hat")
    KI.loose(rig, "hat_loose", HELM_C, helmet)

    for s in ("r", "l"):
        R.arm_parts(rig, s, rolled=True, fist=4.6)
        # W3: the rolled sleeve's lower fold in team-dark (the roll in two tones)
        W1.ring(rig, f"fore_{s}", (0, R.ARM_Y[s], R.ELBOW_Z - 1.7), 4.75, height=1.9, team=True, outline=0.4)
    R.shoulders(rig)
    sleeve = Geo().capsule((0, R.ARM_Y["r"], R.SHOULDER_Z), (0, R.ARM_Y["r"], R.ELBOW_Z), 4.4, 4.1)
    sface = F.Face(rig, "arm_r", [sleeve])
    g = KM.chevron(sface, Geo(), (0.6, 32.8), s=0.95, n=2, w=1.7, gap=2.9)
    rig.part("arm_r", g, KM.CREAM, highlight=False, outline=0)
    # the reload: a spare warhead in the far hand (hidden until he pulls it from the pack)
    hx, hy, hz = 0.4, R.ARM_Y["l"], R.HAND_Z - 0.4
    rig.joint("reload", "hand_l", (hx, hy, hz), hidden=True)
    g = Geo().capsule((hx, hy - 2.5, hz - 5.0), (hx, hy - 2.5, hz + 1.0), 2.4)
    rig.part("reload", g, R.GUNMETAL, finish="metal", outline=0.5)
    _rocket(rig, "reload", (hx, hy - 2.5, hz + 1.0), axis=(0, 0, 1), L=8.0)

    # the launcher, on its own joint (pivot at the shoulder); hands are posed by IK
    rig.joint("tube", "torso", PIVOT)
    _tube(rig, "tube")
    rig.joint("rocket", "tube", (T1, TY, TZ))
    _rocket(rig, "rocket", (T1 - 1.0, TY, TZ))
    rig.track("muzzle", "tube", MUZZLE)
    R.muzzle_flash(rig, "tube", (T1 + 2, TY, TZ), size=2.0)
    R.muzzle_flash(rig, "tube", (T0 - 2, TY, TZ), size=1.7, name="blast", back=True)
    KI.loose(rig, "tube_loose", PIVOT, lambda j: (_tube(rig, j), _rocket(rig, j, (T1 - 1.0, TY, TZ))))
    # back-blast clouds (left in place: parented to the root)
    KG.smoke_cloud(rig, "root", (T0 - 12.0, -8.0, TZ - 1.0), size=1.35, name="smoke", seed=1)
    KG.smoke_cloud(rig, "root", (T0 - 30.0, -6.0, TZ + 4.0), size=1.6, name="smoke2", seed=2,
                   balls=((0, 0, 5.4), (6.4, 2.0, 4.6), (-5.0, 4.0, 4.4), (1.6, 7.4, 4.0), (-9.4, -1.0, 3.6),
                          (8.8, 6.6, 3.2)))
    KG.smoke_cloud(rig, "root", (MUZZLE[0] + 8.0, -8.0, TZ + 2.0), size=0.75, name="puff", seed=3)
    if getattr(rig, "skin", None) is None:     # a skin uses its unit's damage entry (COMMON C1)
        _damage_spots(rig)


def _damage_spots(rig):
    """Damage spots (queue item 40; art/blender/README.md): never on the face or skin. Placed where the posed frames
    show them (the probe's camera rays in idle, walk and both shots, W2 lesson 1): the tunic skirt's front (the
    largest team surface the tube and the arms leave clear, 100% visible: the first mark), the tunic's lower back
    behind the near arm (83-100%), the helmet's dome; a torn strip from the skirt's back hem."""
    rig.damage_spot_at("skirt", "hips", 2.0, 14.0, 8.0, "cloth", team=True)
    rig.damage_spot_at("tunic", "torso", -6.0, 23.0, 7.0, "cloth", team=True)
    rig.damage_spot_at("helmet", "hat", -2.0, 63.0, 6.0, "metal", fill=HELMET)
    rig.damage_spot_at("hem", "hips", -8.0, 12.0, 7.0, "cloth", kind="strip", team=True)


# -- poses ------------------------------------------------------------------------------------------
def aim(deg, dx=0.0, dz=0.0, far=True, fore=FORE):
    """Tube pointing `deg` (torso space; pivot shifted dx, dz); both hands on its grips by IK (`fore`: where the far
    hand holds the tube, W3: closer to the shoulder in the steep aimed shots, within the arm's reach)."""
    pose = {"tube": {"r": deg, "x": dx, "z": dz}}
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))

    def world(p):
        x, z = p[0] - PIVOT[0], p[2] - PIVOT[2]
        return (PIVOT[0] + dx + x * c - z * s, PIVOT[2] + dz + x * s + z * c)
    gx, gz = world(GRIP)
    a, f = R.ik2(R.SH, (gx - 0.4, gz + 0.8))
    pose.update(R.arm("r", a, f))
    if far:
        fx_, fz = world(fore)
        a, f = R.ik2(R.SH, (fx_ - 0.6, fz))
        pose.update(R.arm("l", a, f))
    return pose


# aimed attacks (queue item 44, ageborn_art/aimed.py): a turn of `turn` degrees up tips the tube up about the
# shoulder, which settles a little lower and back, and slides forward along its axis (the rear bell stays off the
# ground, kneeling too); he leans back under it and looks up along the sight; the far hand slides back along the
# tube toward the shoulder as it climbs (the arm's reach). The back-blast cloud and the muzzle puff are left where
# the fire frame's tube put them (they hang in the air, root-level). The feet stay planted.
AIM_LEAN, AIM_HEAD, AIM_DX, AIM_DZ, AIM_SLIDE = 0.20, 0.25, -0.03, -0.04, 0.12
FORE_UP = (8.0, TY + 1.0, TZ - 5.0)      # the far hand's hold on the tube at a full 90-degree climb
AIM_W = [0.0, 0.5, 1.0, 1.0, 1.0, 0.7, 0.4, 0.0, 0.0, 0.0, 0.0]   # per unique frame (A and B: fire on 4)
REAR = (T0 - 6.0, TZ)                    # where the back-blast leaves the rear bell (x, z)
FRONT = (T1 + 6.0, TZ)                   # where the muzzle puff hangs


def _turned(deg, dx, dz, turn):
    """(tube angle, dx, dz, lean, far-hand hold) of a tube at torso-space angle deg turned `turn` up."""
    up = max(0.0, turn)
    lean = AIM_LEAN * turn
    k = min(1.0, up / 90.0)
    fore = tuple(a + (b - a) * k for a, b in zip(FORE, FORE_UP))
    d = deg + turn - lean
    slide = AIM_SLIDE * up
    dx += AIM_DX * up + slide * math.cos(math.radians(d))
    dz += AIM_DZ * up + slide * math.sin(math.radians(d))
    return d, dx, dz, lean, fore


def _tube_at(deg, dx, dz, p):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    x, z = p[0] - PIVOT[0], p[1] - PIVOT[2]
    return PIVOT[0] + dx + x * c - z * s, PIVOT[2] + dz + x * s + z * c


def _blast_shift(deg0, dx0, full):
    """How far the back-blast cloud and the muzzle puff move (torso space, (dx, dz) each) when the fire frame's tube
    (torso-space angle deg0, pivot shift dx0) is turned `full` degrees up."""
    deg1, dx1, dz1, _, _ = _turned(deg0, dx0, 0.0, full)
    r0, r1 = _tube_at(deg0, dx0, 0.0, REAR), _tube_at(deg1, dx1, dz1, REAR)
    f0, f1 = _tube_at(deg0, dx0, 0.0, FRONT), _tube_at(deg1, dx1, dz1, FRONT)
    return (r1[0] - r0[0], r1[1] - r0[1]), (f1[0] - f0[0], f1[1] - f0[1])


def _shift_clouds(pose, rear, front, low=(-29.0, -34.0), full=0.0):
    """Moves the back-blast clouds by `rear` and the puff by `front` (kept above the ground: `low` caps the clouds'
    drop); the back-blast flash shortens as the tube climbs (it fires at the ground behind him)."""
    if "blast" in pose and pose["blast"].get("show"):
        pose["blast"]["s"] = 1.0 - 0.005 * max(0.0, full)
    for name, lo in (("smoke", low[0]), ("smoke2", low[1])):
        if name in pose and pose[name].get("show"):
            pose[name]["x"] = pose[name].get("x", 0.0) + rear[0]
            pose[name]["z"] = max(lo, pose[name].get("z", 0.0) + rear[1])
    if "puff" in pose and pose["puff"].get("show"):
        pose["puff"]["x"] = pose["puff"].get("x", 0.0) + front[0]
        pose["puff"]["z"] = pose["puff"].get("z", 0.0) + front[1]
    return pose


REST_DEG = 7.0
STANCE = merge(aim(REST_DEG), {"torso": {"r": -2.0}})


def _idle(f):
    # 0-1 looks over the tube, 2-3 leans in and peeks through the sight (one eye squeezed), 4-5 back
    peek = [0.0, 0.2, 1.0, 1.0, 0.3, 0.0][f]

    def extra(ctx):
        return merge(aim(REST_DEG - 3.0 * peek + 1.5 * ctx["lag"], dz=0.4 * ctx["lag"]),
                     {"head": {"r": -8.0 * peek, "x": 1.6 * peek, "z": -1.0 * peek},
                      "hat": {"r": 3.0 * peek}, "brow": {"z": -0.8 * peek}})
    pose = M.idle_v2(f, {"torso": {"r": -2.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)
    if f in (2, 3):
        pose = merge(pose, F.expr("squeeze"))
    return KM.ground_feet(RIG, pose, LEGS)


# -- walk v3: G1 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 77 ms --------------
SPEED = 81.25
LEGS = KM.legs_ik()
GAIT = KM.jog_gait(LEGS, SPEED, cycle_ms=616)
WALK_DEG = 22.0          # the tube sloped up on his shoulder (the idle guard holds it level)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(aim(WALK_DEG - 4.0 * lag, dz=0.8 * lag), {"hat": {"r": -1.4 * lag},
                                                                "spare": {"r": 6.0 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -2.0}}, GAIT, legs=LEGS, lean=-8.0, twist=5.0, nod=3.0,
                     extra=extra, report=report)


# 11 unique frames in 790 ms; fire on frame 4 at 291 ms (impactAt 0.3684, as shipped). The shipped
# 191 ms hold is split into the hold (130) and a sight-wobble partner (61) for the holdLoop.
ATTACK_MS = [40, 60, 130, 61, 60, 80, 70, 70, 70, 75, 74]
ATTACK_IMPACT = 4
U_OF = [0, 1, 2, 2, 3, 4, 5, 6, 7, 8, 9]     # unique frame -> row of the pose tables below
#       heft brace HOLD FIRE knock teeter wobble wobble reload settle
DEG = [12.0, 3.0, 0.0, 0.0, 14.0, 9.0, 3.0, 6.0, 8.0, 7.0]        # tube angle, WORLD
LEAN = [-2, -6, -8, -8, 10, 8, -4, 2, -2, -2]
BX = [0.0, 0.5, 1.0, 1.0, -7.0, -10.0, -7.0, -5.0, -3.0, -1.0]
BZ = [0.0, -1.5, -2.2, -2.2, 0.5, 1.5, -0.5, 0.0, 0.0, 0.0]
BQ = [0.02, -0.06, -0.08, 0.02, 0.06, -0.02, -0.06, 0.02, 0.0, 0.0]
BR = [0, 0, 0, 0, 6, 10, -5, 3, 0, 0]          # the whole body rocks back on its heels
TH_R = [4, 14, 16, 16, 22, 34, 10, 14, 8, 4]
SH_R = [0, -10, -14, -14, -10, -28, -4, -8, -4, 0]
TH_L = [-4, -18, -22, -22, -18, -12, -20, -14, -8, -4]
SH_L = [0, -8, -12, -12, -6, -2, -10, -4, -2, 0]


A_DX = [0, 0.5, 0.8, 0.8, -2.5, -1.5, -0.5, 0, 0, 0]


def _attack_pose(i, turn=0.0):
    wob = i == 3
    f = U_OF[i]
    t = LEAN[f]
    deg, dx, dz, lean, fore = _turned(DEG[f] - t + (1.6 if wob else 0.0), A_DX[f], 0.6 if wob else 0.0, turn)
    pose = merge(aim(deg, dx=dx, dz=dz, far=f not in (8,), fore=fore), {
        "torso": {"r": t + lean},
        "head": {"r": [-2, -5, -8, -8, 6, 8, -2, 2, 0, 0][f] - 0.3 * t + AIM_HEAD * turn,
                 "x": [0, 0.8, 1.4, 1.4, 0, 0, 0, 0, 0, 0][f]},
        "hat": {"r": [0, 0, 2, 2, 10, 6, -3, 1, 0, 0][f], "z": [0, 0, 0, 0, 1.5, 0.8, 0, 0, 0, 0][f]},
        "thigh_r": {"r": TH_R[f]}, "shin_r": {"r": SH_R[f]},
        "thigh_l": {"r": TH_L[f]}, "shin_l": {"r": SH_L[f]},
        "flash": {"show": f == 3},
        "blast": {"show": f == 3},
        "rocket": {"hide": 3 <= f <= 8},
        "smoke": {"show": 3 <= f <= 6, "s": [1, 1, 1, 0.75, 1.0, 1.1, 0.95, 1, 1, 1][f],
                  "x": [0, 0, 0, 3, -2, -8, -16, 0, 0, 0][f], "z": [0, 0, 0, 0, 1, 4, 9, 0, 0, 0][f]},
        "smoke2": {"show": 4 <= f <= 7, "s": [1, 1, 1, 1, 0.8, 1.05, 1.1, 0.9, 1, 1][f],
                   "x": [0, 0, 0, 0, -2, -8, -14, -20, 0, 0][f], "z": [0, 0, 0, 0, 0, 3, 7, 12, 0, 0][f]},
        "puff": {"show": f in (4, 5), "s": [1, 1, 1, 1, 0.9, 1.2, 1, 1, 1, 1][f],
                 "z": [0, 0, 0, 0, 0, 3, 0, 0, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=BX[f], z=BZ[f], q=BQ[f], r=BR[f]))
    if f == 8:   # the far hand pulls the spare rocket from the pack
        a, fo = R.ik2(R.SH, (-6.0, 41.0))
        pose = merge(pose, R.arm("l", a - 90.0 + 90.0, fo))
        pose["spare"] = {"hide": True}
        pose["reload"] = {"show": True}
        pose["hand_l"] = {"r": 150.0}
    if f in (1, 2):
        pose = merge(pose, F.expr("squeeze", "grit"), {"brow": {"z": -1.0}})
    elif f == 3:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif f in (4, 5):
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.0}, "pupils": {"s": 0.8}})
    elif f in (6, 7):
        pose = merge(pose, F.expr("grit"))
    if wob:
        pose = merge(pose, {"brow": {"z": -0.4}, "head": {"z": -0.3}})
    if turn and AIM_W[i]:     # the clouds hang where the fire frame's tube left them
        full = turn / AIM_W[i]
        pose = _shift_clouds(pose, *_blast_shift(DEG[3] - LEAN[3], A_DX[3], full), full=full)
    return KM.ground_feet(RIG, pose, LEGS)


def _attack_clip():
    ov = {
        4: [{"kind": "burst", "joint": "tube", "point": (T1 + 4.0, TY, TZ), "r0_lu": 9.0, "r1_lu": 15.0, "n": 5,
             "a0": -60.0, "arc": 120.0},
            {"kind": "dust", "ground": (-24.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 51, "spread": 1.2,
             "dir": -1.0}],
        5: [{"kind": "dust", "ground": (6.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 52, "spread": 0.8,
             "dir": 1.0},
            {"kind": "dust", "ground": (-14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 53, "spread": 0.8,
             "dir": -1.0}],
        6: [{"kind": "rings", "joint": "head", "point": (4.0, 0, 64.0), "radii_lu": (5.0, 8.0), "a0": 30.0,
             "a1": 150.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  extra={"holdStep": 2, "holdLoop": [2, 3]})


# -- attack B: kneeling braced fire (ANIM_SPEC appendix B) ------------------------------------------
# unique frames: 0 = A heft, 1 drop, 2 HOLD (on one knee, the tube level on his shoulder, squinting),
# 3 wobble (holdLoop), 4 FIRE (front and back blast), 5 kick (rocked back onto his heel, smoke behind),
# 6 reload (the spare from the pack), 7 rising (the warhead back in the tube), 8 rising,
# 9 = A reload settle, 10 = A settle
#        drop HOLD wob  FIRE kick reload seat rise
KB_DROP = [8.0, 14.0, 14.0, 14.0, 12.0, 14.0, 13.0, 6.0]
KB_DEG = [6.0, 2.0, 3.4, 2.0, 16.0, 8.0, 6.0, 8.0]
KB_LEAN = [-4, -6, -6, -6, 8, -2, -2, -2]
KB_BX = [0.5, 1.0, 1.0, 1.0, -6.0, -3.0, -2.0, -1.0]
KB_BR = [0, 0, 0, 0, 7, 2, 1, 0]
KB_BQ = [-0.04, -0.07, -0.07, 0.03, 0.06, -0.02, 0.0, 0.0]
KB_FRONT = [8.0, 12.5, 12.5, 12.5, 14.0, 12.5, 12.5, 7.0]


KB_DX = [0.4, 0.8, 0.8, 0.8, -2.5, -0.5, 0, 0]


def _b_pose(i, turn=0.0):
    if i in (0, 9, 10):
        return _attack_pose(i)
    k = i - 1
    t = KB_LEAN[k]
    deg, dx, dz, lean, fore = _turned(KB_DEG[k] - t, KB_DX[k], 0.5 if k == 2 else 0.0, turn)
    pose = merge(aim(deg, dx=dx, dz=dz, far=k != 5, fore=fore), {
        "torso": {"r": t + lean},
        "head": {"r": [-4, -8, -8, -8, 6, -2, 0, 0][k] - 0.3 * t + AIM_HEAD * turn,
                 "x": 1.4 if k in (1, 2, 3) else 0.0},
        "hat": {"r": [0, 2, 2, 2, 10, 2, 0, 0][k], "z": [0, 0, 0, 0, 1.5, 0, 0, 0][k]},
        "flash": {"show": k == 3},
        "blast": {"show": k == 3},
        "rocket": {"hide": 3 <= k <= 5},
        "smoke": {"show": k in (3, 4, 5), "s": [1, 1, 1, 0.75, 1.0, 1.1, 1, 1][k],
                  "x": [0, 0, 0, 3, -4, -12, 0, 0][k], "z": [0, 0, 0, -12, -10, -6, 0, 0][k]},
        "smoke2": {"show": k in (4, 5, 6), "s": [1, 1, 1, 1, 0.8, 1.05, 1.1, 1][k],
                   "x": [0, 0, 0, 0, -2, -10, -18, 0][k], "z": [0, 0, 0, 0, -12, -8, -2, 0][k]},
        "puff": {"show": k == 4, "s": 0.9, "z": -10.0},
    }, M.body_about((0, 0, 14), x=KB_BX[k], r=KB_BR[k], q=KB_BQ[k]))
    if k == 5:   # the far hand pulls the spare rocket from the pack
        a, fo = R.ik2(R.SH, (-6.0, 41.0))
        pose = merge(pose, R.arm("l", a, fo))
        pose["spare"] = {"hide": True}
        pose["reload"] = {"show": True}
        pose["hand_l"] = {"r": 150.0}
    if turn and AIM_W[i]:     # the clouds hang where the fire frame's tube left them (kneeling: lower)
        full = turn / AIM_W[i]
        pose = _shift_clouds(pose, *_blast_shift(KB_DEG[3] - KB_LEAN[3], KB_DX[3], full), low=(-26.0, -31.0),
                             full=full)
    pose = KM.kneel(RIG, pose, LEGS, drop=KB_DROP[k], front=KB_FRONT[k])
    if k in (1, 2):
        pose = merge(pose, F.expr("squeeze", "grit"), {"brow": {"z": -1.0 - (0.4 if k == 2 else 0.0)}})
    elif k == 3:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k == 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.0}})
    elif k in (5, 6):
        pose = merge(pose, F.expr("grit"))
    return pose


def _attack_b():
    ov = {
        4: [{"kind": "burst", "joint": "tube", "point": (T1 + 4.0, TY, TZ), "r0_lu": 9.0, "r1_lu": 15.0, "n": 5,
             "a0": -60.0, "arc": 120.0},
            {"kind": "dust", "ground": (-26.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 54, "spread": 1.2,
             "dir": -1.0}],
        5: [{"kind": "dust", "ground": (-12.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 55, "spread": 0.9,
             "dir": -1.0}],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 2, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return merge(aim(REST_DEG + 14 * a) if a > 0 else {},
                     {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                      "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                      "hat": {"z": 3.0 * max(a, 0), "r": 10 * a}, "brow": {"z": 1.6 * max(a, 0)}})
    base = {"torso": {"r": -2.0}} if M.HIT_AMT[k] > 0 else STANCE
    return M.hit_light(k, base, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


TUBE_PATH = [None, (6, 16, 40), (12, 32, 120), (18, 38, 220), (24, 28, 300), (28, 10, 350),
             (30, -20, 360), (31, -30, 362), (31, -30, 362), (31, -30, 362)]
HAT_PATH = KI.hat_pop(land=53.0, back=60.0)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    base = {j: v for j, v in STANCE.items() if not j.startswith(("arm_", "fore_", "hand_", "tube"))}
    pose = merge(base, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 60 * flail + 20}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    tp = TUBE_PATH[k]
    if tp is None:
        pose = merge(pose, aim(REST_DEG + 20))
    else:
        x, z, r = tp
        pose["tube"] = {"hide": True}
        pose["tube_loose"] = {"show": True, "x": x, "z": z, "r": r}
    hp = HAT_PATH[k]
    if hp is not None:
        x, z, r = hp
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    attack, attack_b = _attack_clip(), _attack_b()
    # aimed up about 45 and 70 degrees at flyers (both shots; the extras sheet)
    aimed_a = AIMED.variants(RIG, attack, lambda u, t: _attack_pose(u, turn=t), AIM_W, aims=("up45", "up70"))
    aimed_b = AIMED.variants(RIG, attack_b, lambda u, t: _b_pose(u, turn=t), AIM_W, aims=("up45", "up70"))
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        attack,
        attack_b,
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ] + aimed_a + aimed_b
    for v in aimed_a:
        AIMED.check_timing(attack, v)
    for v in aimed_b:
        AIMED.check_timing(attack_b, v)
    return M.check_variants(M.check_contract(cl, attack_ms=790, attack_impact_at=0.3684))
