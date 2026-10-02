"""Gait kit (ANIM_SPEC P1): walks authored at ground speed with planted feet.

The old walk helpers (`moves.walk_v2`, `rigs_stone.trot/walk4/bound`) swing the legs by angle
tables, so a planted foot drifts and the stride has nothing to do with the sim's speed. Here
every foot follows a trajectory in character space instead and the legs are solved by two-bone
IK each frame:

  stance   the foot is on the ground and moves backward at exactly the walk speed, so once the
           runtime moves the sprite by the same speed (frame-locked, ANIM_SPEC R2) the foot stays
           on its pixel; a toe-off rolls the foot about the toe at the end of the stance
  swing    the foot lifts (heel kick, passing lift, reach) and returns forward

`solve()` reads the joint positions of the posed rig from Blender (trunk pitch, hip bob, body
rest scale are all included), so the unit's body motion and the legs never fight.

Speeds are in screen lu per second (what the sim moves); the character faces +X and the view
yaw foreshortens x by cos(yaw), so the feet move at speed / cos(yaw) in character space.

Gaits (ANIM_SPEC 2.1): `jog` (G1 bounce jog with flight), `brisk` (G2 walk), `trot` (diagonal
pairs), `walk4` (4-beat, three feet down), `bound` (gallop with flight). A gait is a dict of
per-foot phase offsets plus the stance share; `Gait.targets(frame)` gives the foot targets and
`Gait.meta()` the numbers the pipeline checks.
"""
import math

import bpy
from mathutils import Vector

from .anim import merge


def smooth(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


def _deg(dx, dz):
    return math.degrees(math.atan2(dz, dx))


class Leg:
    """A two-bone leg. `end` is the character-space rest point the IK places (the ankle pivot
    when the leg has a `foot` joint, else the bottom of the hoof or paw on `lower`). `bend` +1
    puts the middle joint in front of the hip-to-end line (human knee, horse carpus), -1 behind
    it (hock). `toe` and `heel` (rest points, character space) are the roll pivots of a foot."""

    def __init__(self, upper, lower, end, foot=None, bend=1.0, toe=None, heel=None):
        self.upper, self.lower, self.end, self.foot, self.bend = upper, lower, Vector(end), foot, bend
        self.toe = Vector(toe) if toe else None
        self.heel = Vector(heel) if heel else None


def _update():
    bpy.context.view_layer.update()


def solve(rig, pose, targets, report=None):
    """Adds leg channels to `pose` so each leg's end reaches its target.

    targets: {name: (Leg, x, z, foot_deg)} in character space (x forward, z up). foot_deg is the
    foot's angle against the ground (0 flat, negative = heel up / toe down). Out-of-reach
    targets are clamped to the reachable circle; `report` (a list) collects the shortfall."""
    rig.apply(pose)
    _update()
    out = {}
    for name, (leg, tx, tz, fdeg) in targets.items():
        mu = rig.char_matrix(rig.joints[leg.upper])
        ml = rig.char_matrix(rig.joints[leg.lower])
        p = mu.translation
        k = mu @ (rig.rest[leg.lower] - rig.rest[leg.upper])
        e = ml @ (leg.end - rig.rest[leg.lower])
        l1 = math.hypot(k.x - p.x, k.z - p.z)
        l2 = math.hypot(e.x - k.x, e.z - k.z)
        a0 = _deg(k.x - p.x, k.z - p.z)
        b0 = _deg(e.x - k.x, e.z - k.z)
        dx, dz = tx - p.x, tz - p.z
        d = math.hypot(dx, dz)
        dmax, dmin = (l1 + l2) * 0.999, abs(l1 - l2) + 1e-3
        if report is not None and d > dmax:
            report.append((name, round(d - dmax, 2)))
        d = max(dmin, min(dmax, d))
        th = _deg(dx, dz)
        cos_a = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
        alpha = math.degrees(math.acos(max(-1.0, min(1.0, cos_a))))
        a = th + leg.bend * alpha
        kx = p.x + l1 * math.cos(math.radians(a))
        kz = p.z + l1 * math.sin(math.radians(a))
        ex, ez = p.x + d * math.cos(math.radians(th)), p.z + d * math.sin(math.radians(th))
        b = _deg(ex - kx, ez - kz)
        ra = a - a0
        rb = (b - b0) - ra
        ch = {leg.upper: {"r": ra}, leg.lower: {"r": rb}}
        if leg.foot:
            psi0 = rig.side_angle(leg.foot)
            ch[leg.foot] = {"r": fdeg - psi0 - (b - b0)}
        out = merge(out, ch)
    return merge(pose, out)


# -- foot trajectories ---------------------------------------------------------------------------
class Gait:
    """One loop of `frames` frames over `cycle_ms` at `speed` (screen lu/s).

    feet: {name: (Leg, phase, x_mid, ground_z)}: the foot touches down at cycle phase `phase`
    (0..1, frame k sits at phase k / frames) and is planted for `stance` of the cycle, centred
    on `x_mid` (character x of the end point at mid-stance); ground_z is the end point's height
    when planted (the rest height of the ankle or hoof bottom).
    lift: swing height (lu) of the end point; kick: extra heel-kick back early in the swing;
    reach: how far the foot reaches past the touchdown point late in the swing (lu)."""

    def __init__(self, frames, cycle_ms, speed, feet, stance, *, yaw_deg=-10.0, lift=6.0,
                 kick=0.0, reach=0.0, toe_off=22.0, heel_strike=8.0, lift_peak=0.45,
                 early_lift=0.0, scale=1.0, drag=0.0):
        self.frames, self.cycle_ms, self.speed = frames, cycle_ms, speed
        # drag: share of the swing in which the toe trails just above the ground after the
        # toe-off (the heel kicks up), so the back foot still reads on the contact frames
        self.drag = drag
        self.feet, self.stance = feet, stance
        self.lift, self.kick, self.reach = lift, kick, reach
        self.toe_off, self.heel_strike, self.lift_peak = toe_off, heel_strike, lift_peak
        self.early_lift = early_lift
        # character-space speed of a planted foot (lu/s)
        self.v = speed / math.cos(math.radians(yaw_deg)) / scale
        self.stride = self.v * cycle_ms / 1000.0          # character lu per cycle
        self.travel = self.stride * stance                  # planted travel per foot

    def durations(self):
        base = self.cycle_ms / self.frames
        out, acc = [], 0.0
        for i in range(self.frames):
            nxt = round(base * (i + 1))
            out.append(int(nxt - acc))
            acc = nxt
        return out

    def phase(self, name, f):
        return (f / self.frames - self.feet[name][1]) % 1.0

    def state(self, name, f, lift=None, sub=0.0):
        """(x, z, foot_deg, planted) of foot `name` at frame f."""
        leg, _, x_mid, gz = self.feet[name]
        u = self.phase(name, f + sub)
        st = self.stance
        x_td = x_mid + self.travel / 2
        x_to = x_mid - self.travel / 2
        lift = self.lift if lift is None else lift
        if u < st:
            x = x_td - self.stride * u
            t = u / st
            # heel strike (toe up) right after touchdown, then flat, then the heel rolls up
            ang = self.heel_strike * max(0.0, 1 - t / 0.18) - self.toe_off * smooth((t - 0.7) / 0.3)
            return x, gz, ang, True
        s = (u - st) / (1 - st)
        if self.drag > 0 and leg.toe is not None:
            return self._drag_swing(leg, s, x_to, x_td, gz, lift)
        x = x_to + (x_td - x_to) * smooth(s) - self.kick * math.sin(math.pi * min(1.0, s / 0.7)) \
            + self.reach * math.sin(math.pi * smooth((s - 0.35) / 0.65))
        # lift peaks at lift_peak of the swing; early_lift makes the foot clear the ground fast
        pk = self.lift_peak
        if s < pk:
            zz = math.sin(0.5 * math.pi * s / pk)
        else:
            zz = math.cos(0.5 * math.pi * (s - pk) / (1 - pk))
        zz = max(zz, min(1.0, s / 0.12) * self.early_lift / max(lift, 1e-3) if s < 0.5 else 0.0)
        z = gz + lift * zz
        # toe-off continues into the swing (foot hangs toe-down), toe up for the landing
        ang = -self.toe_off * (1 - smooth(s / 0.55)) - 18.0 * math.sin(math.pi * min(1.0, s / 0.6)) \
            + self.heel_strike * smooth((s - 0.6) / 0.4)
        return x, z, ang, False

    def _trail(self, leg, s, x_to, gz):
        """The trailing toe in the drag phase: the foot pitches toe-down about the toe, which
        lifts slowly and drifts back; returns the ankle (x, z) and the foot angle."""
        d = self.drag
        t = min(1.0, s / d)
        tr = leg.toe - leg.end
        ang = -self.toe_off - 32.0 * smooth(t)
        secs = s * (1 - self.stance) * self.cycle_ms / 1000.0
        tx = x_to + tr.x - self.v * secs
        tz = gz + tr.z + 0.6 * t * t
        r = math.radians(ang)
        dx, dz = -tr.x, -tr.z
        return tx + dx * math.cos(r) - dz * math.sin(r), tz + dx * math.sin(r) + dz * math.cos(r), ang

    def _drag_swing(self, leg, s, x_to, x_td, gz, lift):
        d = self.drag
        if s < d:
            x, z, ang = self._trail(leg, s, x_to, gz)
            return x, z, ang, False
        x0, z0, a0 = self._trail(leg, d, x_to, gz)
        s2 = (s - d) / (1 - d)
        x = x0 + (x_td - x0) * smooth(s2) + self.reach * math.sin(math.pi * smooth((s2 - 0.35) / 0.65))
        pk = self.lift_peak
        zz = math.sin(0.5 * math.pi * s2 / pk) if s2 < pk else math.cos(0.5 * math.pi * (s2 - pk) / (1 - pk))
        z = gz + lift * zz + (z0 - gz) * (1 - smooth(s2 / 0.45))
        ang = a0 * (1 - smooth(s2 / 0.55)) - 10.0 * math.sin(math.pi * min(1.0, s2 / 0.6)) \
            + self.heel_strike * smooth((s2 - 0.6) / 0.4)
        return x, z, ang, False

    def targets(self, f, roll=True):
        """{name: (Leg, x, z, foot_deg)} for solve(); a foot with toe/heel pivots rolls about
        them (the end point rises with the heel on the toe-off)."""
        out = {}
        for name, (leg, _, _, gz) in self.feet.items():
            x, z, ang, planted = self.state(name, f)
            if roll and leg.foot and leg.toe is not None and planted:
                end = Vector((x, 0, z))
                piv = leg.toe if ang < 0 else leg.heel
                if piv is not None:
                    pv = Vector((x + piv.x - leg.end.x, 0, gz + piv.z - leg.end.z))
                    r = math.radians(ang)
                    d = end - pv
                    end = pv + Vector((d.x * math.cos(r) - d.z * math.sin(r), 0,
                                       d.x * math.sin(r) + d.z * math.cos(r)))
                    x, z = end.x, end.z
            out[name] = (leg, x, z, ang)
        return out

    def planted(self, f):
        return {n: self.state(n, f)[3] for n in self.feet}

    def contacts(self):
        """[(frame, foot)] where each foot is planted on the first frame of its stance."""
        out = []
        for name in self.feet:
            for f in range(self.frames):
                if self.planted(f)[name] and not self.planted((f - 1) % self.frames)[name]:
                    out.append((f, name))
        return sorted(out)


def biped_feet(left, right, x_mid=0.0, ground=None, shift=0.5):
    """Feet dict for a biped: right foot touches down at phase 0, left at `shift`."""
    gz_r = ground if ground is not None else right.end.z
    gz_l = ground if ground is not None else left.end.z
    return {"r": (right, 0.0, x_mid, gz_r), "l": (left, shift, x_mid, gz_l)}


def walk_meta(gait_name, g):
    """Sheet meta the pipeline adds to the walk clip (P2)."""
    return {"gait": gait_name, "gaitSpeedLuPerS": round(g.speed, 1),
            "cycleMs": g.cycle_ms}


def quad_feet(legs, phases, x_off=None, scale=1.0, ground=None):
    """Feet dict for a quadruped: legs {name: Leg}, phases {name: touchdown phase}; each foot's
    mid-stance x is its rest end x (times the body rest scale) plus x_off[name]."""
    x_off = x_off or {}
    out = {}
    for name, leg in legs.items():
        gz = (ground if ground is not None else leg.end.z) * scale
        out[name] = (leg, phases[name], leg.end.x * scale + x_off.get(name, 0.0), gz)
    return out


TROT = {"fr": 0.0, "bl": 0.0, "fl": 0.5, "br": 0.5}
WALK4 = {"bl": 0.0, "fl": 0.25, "br": 0.5, "fr": 0.75}


def quad_walk(rig, f, g, pose, *, trunk="trunk", base_z=0.0, bob=2.0, beats=2, low_at=None,
              pitch=0.0, pitch_phase=0.0, roll=0.0, extra=None, report=None):
    """A quadruped gait frame: the trunk bobs `beats` times per cycle (lowest at cycle phase
    `low_at`, default the middle of the first stance), pitches and rolls, `extra(ctx)` adds the
    head nod, ears, tail and riders, and the legs are solved so planted hooves move backward at
    exactly the ground speed. base_z lowers the trunk so the legs are a little flexed at
    mid-stance and can reach the stride's ends."""
    n = g.frames
    p = 2 * math.pi * f / n
    low = g.stance / 2 if low_at is None else low_at
    ph = 2 * math.pi * low
    z = base_z - bob * math.cos(beats * (p - ph))
    body = {trunk: {"z": z, "r": pitch * math.sin(beats * (p - ph) + pitch_phase),
                    "rx": roll * math.sin(p)}}
    ctx = dict(f=f, n=n, p=p, z=z, bob=bob, low=ph, beats=beats)
    out = merge(pose, body, extra(ctx) if extra else {})
    return solve(rig, out, g.targets(f, roll=False), report=report)
