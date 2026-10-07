/**
 * Tiny SVG path toolkit for the avatar parts (AUDIT §6.4): parse a path, move or mirror it, and write
 * it back. The renderer uses it to cut the cel shadow band (the part minus a copy of itself moved up)
 * and the highlight sliver (the part minus a copy moved down and right) without masks, so every part
 * gets the art sheet's shading from one outline path.
 */

type Cmd = { c: string; v: number[] };

const ARGS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

const TOKEN = /([MLHVCSQTAZmlhvcsqtaz])|(-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?)/g;

/** Parses a path into absolute commands (H/V become L, relatives become absolute). */
export function parsePath(d: string): Cmd[] {
  const out: Cmd[] = [];
  const toks = d.match(TOKEN) ?? [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  while (i < toks.length) {
    const t = toks[i]!;
    if (/[a-zA-Z]/.test(t)) {
      cmd = t;
      i += 1;
      if (cmd === 'Z' || cmd === 'z') {
        out.push({ c: 'Z', v: [] });
        x = sx;
        y = sy;
        continue;
      }
    }
    const up = cmd.toUpperCase();
    const n = ARGS[up] ?? 0;
    if (n === 0) {
      i += 1;
      continue;
    }
    const v = toks.slice(i, i + n).map(Number);
    i += n;
    const rel = cmd !== up;
    switch (up) {
      case 'M':
      case 'L':
      case 'T': {
        const nx = rel ? x + v[0]! : v[0]!;
        const ny = rel ? y + v[1]! : v[1]!;
        out.push({ c: up, v: [nx, ny] });
        x = nx;
        y = ny;
        if (up === 'M') {
          sx = nx;
          sy = ny;
          cmd = rel ? 'l' : 'L';
        }
        break;
      }
      case 'H': {
        const nx = rel ? x + v[0]! : v[0]!;
        out.push({ c: 'L', v: [nx, y] });
        x = nx;
        break;
      }
      case 'V': {
        const ny = rel ? y + v[0]! : v[0]!;
        out.push({ c: 'L', v: [x, ny] });
        y = ny;
        break;
      }
      case 'C':
      case 'S':
      case 'Q': {
        const a = v.map((k, j) => (rel ? k + (j % 2 === 0 ? x : y) : k));
        out.push({ c: up, v: a });
        x = a[a.length - 2]!;
        y = a[a.length - 1]!;
        break;
      }
      case 'A': {
        const nx = rel ? x + v[5]! : v[5]!;
        const ny = rel ? y + v[6]! : v[6]!;
        out.push({ c: 'A', v: [v[0]!, v[1]!, v[2]!, v[3]!, v[4]!, nx, ny] });
        x = nx;
        y = ny;
        break;
      }
    }
  }
  return out;
}

const r2 = (n: number): string => {
  const s = (Math.round(n * 100) / 100).toString();
  return s === '-0' ? '0' : s;
};

function write(cmds: Cmd[]): string {
  return cmds.map((k) => k.c + k.v.map(r2).join(' ')).join('');
}

/** Moves a path by (dx, dy). */
export function movePath(d: string, dx: number, dy: number): string {
  return write(
    parsePath(d).map((k) => {
      if (k.c === 'A') return { c: 'A', v: [k.v[0]!, k.v[1]!, k.v[2]!, k.v[3]!, k.v[4]!, k.v[5]! + dx, k.v[6]! + dy] };
      return { c: k.c, v: k.v.map((n, j) => n + (j % 2 === 0 ? dx : dy)) };
    }),
  );
}

/** Mirrors a path around the vertical line x = cx (the face centre is 60). */
export function mirrorPath(d: string, cx = 60): string {
  return write(
    parsePath(d).map((k) => {
      if (k.c === 'A') return { c: 'A', v: [k.v[0]!, k.v[1]!, -k.v[2]!, k.v[3]!, k.v[4]! ? 0 : 1, 2 * cx - k.v[5]!, k.v[6]!] };
      return { c: k.c, v: k.v.map((n, j) => (j % 2 === 0 ? 2 * cx - n : n)) };
    }),
  );
}

/** Scales a path around (ox, oy). */
export function scalePath(d: string, s: number, ox = 60, oy = 60): string {
  return write(
    parsePath(d).map((k) => {
      if (k.c === 'A') return { c: 'A', v: [k.v[0]! * s, k.v[1]! * s, k.v[2]!, k.v[3]!, k.v[4]!, ox + (k.v[5]! - ox) * s, oy + (k.v[6]! - oy) * s] };
      return { c: k.c, v: k.v.map((n, j) => (j % 2 === 0 ? ox + (n - ox) * s : oy + (n - oy) * s)) };
    }),
  );
}

/** The path plus its mirror image (both halves of a symmetric feature). */
export function both(d: string, cx = 60): string {
  return d + mirrorPath(d, cx);
}

/** An ellipse as a path. */
export function ell(cx: number, cy: number, rx: number, ry = rx): string {
  return `M${r2(cx - rx)} ${r2(cy)}A${r2(rx)} ${r2(ry)} 0 1 0 ${r2(cx + rx)} ${r2(cy)}A${r2(rx)} ${r2(ry)} 0 1 0 ${r2(cx - rx)} ${r2(cy)}Z`;
}

/** A rounded rectangle as a path. */
export function rr(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.min(r, w / 2, h / 2);
  return `M${r2(x + q)} ${r2(y)}H${r2(x + w - q)}Q${r2(x + w)} ${r2(y)} ${r2(x + w)} ${r2(y + q)}V${r2(y + h - q)}Q${r2(x + w)} ${r2(y + h)} ${r2(x + w - q)} ${r2(y + h)}H${r2(x + q)}Q${r2(x)} ${r2(y + h)} ${r2(x)} ${r2(y + h - q)}V${r2(y + q)}Q${r2(x)} ${r2(y)} ${r2(x + q)} ${r2(y)}Z`;
}

/** A regular star (points, outer radius, inner radius). */
export function star(cx: number, cy: number, n: number, ro: number, ri: number, rot = -90): string {
  let d = '';
  for (let i = 0; i < n * 2; i += 1) {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    const r = i % 2 === 0 ? ro : ri;
    d += `${i === 0 ? 'M' : 'L'}${r2(cx + Math.cos(a) * r)} ${r2(cy + Math.sin(a) * r)}`;
  }
  return `${d}Z`;
}
