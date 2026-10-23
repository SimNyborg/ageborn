/**
 * Sprite strips for Home's still island (queue item 37 open items 1 and 2): the strip layout (feet, scale, clip
 * length and box, as the live layer draws the unit), the drawing, the keys and versions a kept strip is stored
 * under, the Cache API store, the strip worker client, the request flow (kept strip, worker, main thread, the skin
 * then the card's own strip), the provider's `strip:` and `stripinfo:` answers, a skin puppet's strip layout, and
 * the strips looked up again at boot.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VisualDef } from '@/contracts/art';
import { parseStripInfo } from '@/ui/screens/home/Diorama';
import { MANIFEST } from '../manifest';
import { createArtProvider } from '../provider';
import { SKIN_PUPPETS } from '../skins';
import { RECENT_KEY, mainSlots, puppetStripLayout, setStripDeps, spriteStripArt, stripInfoUrl, stripRequest, stripWorker, warmRecentStrips, type StripArt, type StripDeps, type StripSource } from '../adapters/spriteStrip';
import { drawParts, drawStrip, stripLayout, stripRendererTag, type StripCtx, type StripInfo, type StripSheet } from '../adapters/spriteStripDraw';
import { cacheStripStore, fingerprint, KEEP_MAX, sheetSlot, sheetVersion } from '../adapters/spriteStripKeep';
import type { StripJob, StripReply } from '../adapters/spriteStripWorker';

const footmanText = Object.values(import.meta.glob<string>('/public/art/units/medieval/footman.json', { eager: true, query: '?raw', import: 'default' }))[0]!;
const footman = JSON.parse(footmanText) as StripSheet & { frames: Record<string, { anchor: { x: number; y: number }; sourceSize: { w: number; h: number } }> };

const INFO: StripInfo = { frames: 6, cell: 160, ms: 920, feet: [70, 150], pxPerLu: 1.4, headLu: 66, box: [40, 110, 20, 155] };
const ART: StripArt = { url: 'data:image/png;base64,AAAA', info: INFO };

describe('strip requests and layouts through the portrait channel', () => {
  it('reads strip and strip-layout requests from the card id', () => {
    expect(stripRequest('strip:walk:standard_bearer')).toEqual({ clip: 'walk', card: 'standard_bearer' });
    expect(stripRequest('stripinfo:idle:footman')).toEqual({ clip: 'idle', card: 'footman', part: 'info' });
    expect(stripRequest('footman')).toBeNull();
    expect(stripRequest('stripinfo:footman')).toBeNull();
  });

  it("carries a layout as a JSON data URL that Home's still island reads back", () => {
    const url = stripInfoUrl(INFO);
    expect(url.startsWith('data:application/json,')).toBe(true);
    expect(parseStripInfo(url)).toEqual(INFO);
  });
});

describe('the strip layout', () => {
  it("fits the clip's frames and team twins into 96% of a cell, standing 2% above its bottom edge", () => {
    const l = stripLayout(footman, 'idle', 160, { heightLu: 68, headLu: 66 })!;
    expect(l.frames).toHaveLength(6);
    expect(l.frames.every((f) => f.team !== null)).toBe(true);
    let x0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    let y0 = Infinity;
    for (const f of l.frames)
      for (const fr of [f.base, f.team!]) {
        const s = fr.spriteSourceSize;
        x0 = Math.min(x0, s.x);
        x1 = Math.max(x1, s.x + s.w);
        y0 = Math.min(y0, s.y);
        y1 = Math.max(y1, s.y + s.h);
      }
    expect(Math.max((x1 - x0) * l.k, (y1 - y0) * l.k)).toBeCloseTo(160 * 0.96, 6);
    expect(l.oy + y1 * l.k).toBeCloseTo(160 * 0.98, 6);
    expect(l.ox + ((x0 + x1) / 2) * l.k).toBeCloseTo(80, 6);
  });

  it('says where the feet are, how large the unit stands and how long the clip is, as the live layer draws it', () => {
    const l = stripLayout(footman, 'idle', 160, { heightLu: 68, headLu: 66 })!;
    const first = footman.frames[footman.animations['idle']![0]!]!;
    const feetX = first.anchor.x * first.sourceSize.w;
    const feetY = first.anchor.y * first.sourceSize.h;
    expect(l.info.feet[0]).toBeCloseTo(l.ox + feetX * l.k, 1);
    expect(l.info.feet[1]).toBeCloseTo(l.oy + feetY * l.k, 1);
    // the sheet draws 1.23 px per lu; the cell scales it by k
    expect(l.info.pxPerLu).toBeCloseTo(l.k * 1.23, 3);
    expect(l.info).toMatchObject({ frames: 6, cell: 160, ms: 920, headLu: 66 });
    // the box is the atlas view's idle extent (`extentLu`: the base frames' trimmed rectangles from the feet)
    let front = 0;
    let top = 0;
    for (const n of footman.animations['idle']!) {
      const s = footman.frames[n]!.spriteSourceSize as { x: number; y: number; w: number; h: number };
      front = Math.max(front, (s.x + s.w - feetX) / 1.23);
      top = Math.max(top, (feetY - s.y) / 1.23);
    }
    expect((l.info.box[1] - l.info.feet[0]) / l.info.pxPerLu).toBeCloseTo(front, 1);
    expect((l.info.feet[1] - l.info.box[2]) / l.info.pxPerLu).toBeCloseTo(top, 1);
  });

  it("rescales like the atlas view when the manifest's height differs from the sheet's by over 2%", () => {
    const same = stripLayout(footman, 'idle', 160, { heightLu: 68.5, headLu: 66 })!;
    const taller = stripLayout(footman, 'idle', 160, { heightLu: 68 * 1.25, headLu: 66 })!;
    expect(same.info.pxPerLu).toBeCloseTo(same.k * 1.23, 3);
    expect(taller.info.pxPerLu).toBeCloseTo(taller.k * (1.23 / 1.25), 3);
  });

  it('is null for a missing clip or frame', () => {
    expect(stripLayout(footman, 'dance', 160, { headLu: 66 })).toBeNull();
    expect(stripLayout({ ...footman, animations: { idle: ['nope'] } }, 'idle', 160, { headLu: 66 })).toBeNull();
  });
});

describe('drawing a strip', () => {
  it("puts each frame in its cell over its team twin tinted in the side's colour", () => {
    const l = stripLayout(footman, 'idle', 160, { headLu: 66 })!;
    const calls: string[] = [];
    const ctx = (name: string): StripCtx => ({
      canvas: name,
      globalCompositeOperation: 'source-over',
      fillStyle: '',
      imageSmoothingQuality: 'low',
      clearRect: () => calls.push(`${name}.clear`),
      fillRect() {
        calls.push(`${name}.fill ${this.globalCompositeOperation} ${String(this.fillStyle)}`);
      },
      drawImage(...a: unknown[]) {
        calls.push(`${name}.draw ${a[0] === 'tmp' ? 'tmp' : 'sheet'} ${this.globalCompositeOperation} ${a.length === 3 ? a[1] : Math.round(a[5] as number)}`);
      },
    });
    const main = ctx('main');
    const tmp = ctx('tmp');
    drawStrip(main, tmp, 'sheet' as unknown as CanvasImageSource, l, 0x2f7df6);
    expect(main.imageSmoothingQuality).toBe('high');
    // frame 2: the team twin, tinted (multiply), masked (destination-in), copied into cell 2, then the frame over it
    const at = calls.indexOf('main.draw tmp source-over 320');
    expect(at).toBeGreaterThan(0);
    expect(calls.slice(at - 4, at)).toEqual(['tmp.clear', `tmp.draw sheet source-over ${Math.round(l.ox + l.frames[2]!.team!.spriteSourceSize.x * l.k)}`, 'tmp.fill multiply #2f7df6', `tmp.draw sheet destination-in ${Math.round(l.ox + l.frames[2]!.team!.spriteSourceSize.x * l.k)}`]);
    expect(calls[at + 1]).toBe(`main.draw sheet source-over ${Math.round(320 + l.ox + l.frames[2]!.base.spriteSourceSize.x * l.k)}`);
    expect(calls.filter((c) => c.startsWith('main.draw sheet'))).toHaveLength(6);
  });

  it("fingerprints the renderer by its drawing code, helpers and constants (a release that changes it never meets an old strip)", () => {
    expect(stripRendererTag()).toMatch(/^\d+\.\d+\.[0-9a-z]+$/);
    expect(stripRendererTag()).toBe(stripRendererTag());
    // review 2 N-e: the cell's fill and foot line and the helpers the drawing calls are part of it
    const parts = drawParts();
    expect(parts).toContain('fill 0.96 foot 0.02');
    expect(parts).toContain('Math.round(');
    expect(parts).toContain('padStart(6');
    expect(stripRendererTag().split('.')[1]).toBe(String(parts.length));
  });
});

describe('keeping strips', () => {
  it('fingerprints bytes and text, length included', () => {
    const a = new Uint8Array([1, 2, 3, 4, 5, 6, 7]).buffer;
    const b = new Uint8Array([1, 2, 3, 4, 5, 6, 8]).buffer;
    expect(fingerprint(a)).toBe(fingerprint(new Uint8Array([1, 2, 3, 4, 5, 6, 7]).buffer));
    expect(fingerprint(a)).not.toBe(fingerprint(b));
    expect(fingerprint(a)).toMatch(/\.7$/);
    expect(fingerprint('abc')).not.toBe(fingerprint('abd'));
    expect(fingerprint(footmanText)).toBe(fingerprint(footmanText));
  });

  it('keys a sheet strip by what it draws and versions it by the renderer, the heights and the sheet bytes', () => {
    const slot = sheetSlot({ clip: 'idle', size: 160, teamColor: 0x2f7df6, url: 'https://x.test/ageborn/art/units/medieval/footman.json' });
    expect(slot).toBe('idle|160|2f7df6|/ageborn/art/units/medieval/footman.json');
    const png = new Uint8Array([9, 9, 9, 9, 1]).buffer;
    const v = sheetVersion({ tag: 't1', heightLu: 68, headLu: 66, json: footmanText, png });
    expect(sheetVersion({ tag: 't1', heightLu: 68, headLu: 66, json: footmanText, png: new Uint8Array([9, 9, 9, 9, 1]).buffer })).toBe(v);
    expect(sheetVersion({ tag: 't2', heightLu: 68, headLu: 66, json: footmanText, png })).not.toBe(v);
    expect(sheetVersion({ tag: 't1', heightLu: 68, headLu: 66, json: `${footmanText} `, png })).not.toBe(v);
    expect(sheetVersion({ tag: 't1', heightLu: 68, headLu: 66, json: footmanText, png: new Uint8Array([9, 9, 9, 9, 2]).buffer })).not.toBe(v);
    expect(sheetVersion({ tag: 't1', heightLu: 68, headLu: 64, json: footmanText, png })).not.toBe(v);
  });

  describe('the Cache API store', () => {
    const real = (globalThis as { caches?: unknown }).caches;
    let entries: Map<string, Response>;
    let failOpen = false;
    beforeEach(() => {
      entries = new Map();
      failOpen = false;
      const cache = {
        match: async (u: string) => entries.get(String(u))?.clone(),
        put: async (u: string, r: Response) => {
          entries.delete(String(u));
          entries.set(String(u), r);
        },
        keys: async () => [...entries.keys()].map((u) => new Request(u)),
        delete: async (u: string) => entries.delete(String(u)),
      };
      (globalThis as { caches?: unknown }).caches = { open: async () => (failOpen ? Promise.reject(new Error('blocked')) : cache) };
    });
    afterEach(() => {
      (globalThis as { caches?: unknown }).caches = real;
    });

    it('keeps a strip with its layout and finds it by slot and version', async () => {
      const store = cacheStripStore<StripInfo>('https://x.test/ageborn/')!;
      await store.put('idle|160|2f7df6|/a.json', 'v1', ART);
      expect(await store.get('idle|160|2f7df6|/a.json', 'v1')).toEqual(ART);
      expect(await store.get('idle|160|2f7df6|/a.json', 'v2')).toBeNull();
      expect([...entries.keys()][0]).toMatch(/^https:\/\/x\.test\/ageborn\/__strips\//);
    });

    it("drops a slot's older versions and the oldest strips over the limit", async () => {
      const store = cacheStripStore<StripInfo>('https://x.test/ageborn/')!;
      await store.put('s0', 'v1', ART);
      await store.put('s0', 'v2', ART);
      expect(entries.size).toBe(1);
      expect(await store.get('s0', 'v2')).toEqual(ART);
      for (let i = 1; i <= KEEP_MAX + 3; i++) await store.put(`s${i}`, 'v1', ART);
      expect(entries.size).toBe(KEEP_MAX);
      expect(await store.get('s0', 'v2')).toBeNull();
      expect(await store.get(`s${KEEP_MAX + 3}`, 'v1')).toEqual(ART);
    });

    it('ignores a damaged entry, and a blocked store keeps nothing and finds nothing', async () => {
      const store = cacheStripStore<StripInfo>('https://x.test/ageborn/')!;
      await store.put('s', 'v', { url: 'not a picture', info: INFO });
      expect(await store.get('s', 'v')).toBeNull();
      failOpen = true;
      const blocked = cacheStripStore<StripInfo>('https://x.test/ageborn/')!;
      await blocked.put('t', 'v', ART);
      expect(await blocked.get('t', 'v')).toBeNull();
      (globalThis as { caches?: unknown }).caches = undefined;
      expect(cacheStripStore('https://x.test/')).toBeNull();
    });

    it('is null where reading `caches` throws (a sandboxed frame), and a strip request still answers instead of throwing (review 2 S-a)', async () => {
      Object.defineProperty(globalThis, 'caches', {
        configurable: true,
        get: () => {
          throw new Error('SecurityError: the operation is insecure');
        },
      });
      try {
        expect(cacheStripStore('https://x.test/')).toBeNull();
        // the page's own strip deps are made without a store (Home asks for strips during its render: a throw here
        // left Home blank); no worker and no sheet fetch in tests, so the strip is simply missing
        setStripDeps(null);
        const art = createArtProvider({ warn: () => {} });
        let strip: Promise<string> | null = null;
        expect(() => {
          strip = art.portrait({ card: 'strip:idle:footman', size: 160 });
        }).not.toThrow();
        expect(await strip).toBe('');
      } finally {
        Object.defineProperty(globalThis, 'caches', { configurable: true, writable: true, value: undefined });
        setStripDeps(null);
      }
    });
  });
});

class FakeWorker {
  onmessage: ((e: MessageEvent<StripReply | StripReply[]>) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  posted: { id: number }[] = [];
  terminated = false;
  postMessage(m: { id: number }): void {
    this.posted.push(m);
  }
  terminate(): void {
    this.terminated = true;
  }
  reply(r: StripReply | StripReply[]): void {
    this.onmessage?.({ data: r } as MessageEvent<StripReply | StripReply[]>);
  }
}

const JOB = { url: 'https://x.test/a.json', clip: 'idle', size: 160, teamColor: 0x2f7df6, headLu: 66, tag: 't', keep: null };

describe('main-thread strip moments', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("lets the strips waiting after Home's entrance draw one after another, a task each, from one idle moment", async () => {
    const slot = mainSlots();
    const order: string[] = [];
    void slot().then(() => order.push('a'));
    void slot().then(() => order.push('b'));
    void slot().then(() => order.push('c'));
    await vi.advanceTimersByTimeAsync(690);
    expect(order).toEqual([]);
    // the entrance (700 ms), then one idle moment (no requestIdleCallback here: the next task) for all three,
    // in order, a task apart: none waits for an idle moment (up to 500 ms) of its own
    await vi.advanceTimersByTimeAsync(60);
    expect(order).toEqual(['a', 'b', 'c']);
    // a strip asked for later waits for the next idle moment only (the entrance is over)
    void slot().then(() => order.push('d'));
    await vi.advanceTimersByTimeAsync(5);
    expect(order).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('the strip worker client', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts one worker, answers each job, and lets an idle worker go', async () => {
    const made: FakeWorker[] = [];
    const run = stripWorker(() => {
      const w = new FakeWorker();
      made.push(w);
      return w as unknown as Worker;
    }, { lingerMs: 1000 });
    const a = run(JOB);
    const b = run({ ...JOB, clip: 'walk' });
    expect(made).toHaveLength(1);
    const w = made[0]!;
    w.reply({ id: w.posted[1]!.id, ok: true, url: ART.url, info: INFO, kept: true });
    w.reply({ id: w.posted[0]!.id, ok: false, error: 'clip' });
    expect(await b).toEqual(ART);
    expect(await a).toBeNull();
    vi.advanceTimersByTime(999);
    expect(w.terminated).toBe(false);
    vi.advanceTimersByTime(2);
    expect(w.terminated).toBe(true);
    // the next job starts a new one
    void run(JOB);
    expect(made).toHaveLength(2);
  });

  it('settles every reply of a batch in the one message (the strips of a screen arrive together)', async () => {
    const made: FakeWorker[] = [];
    const run = stripWorker(() => {
      const w = new FakeWorker();
      made.push(w);
      return w as unknown as Worker;
    });
    const settled: string[] = [];
    const jobs = ['a', 'b', 'c'].map((k) => run({ ...JOB, url: `https://x.test/${k}.json` }).then((r) => settled.push(r ? k : `${k}:none`)));
    const w = made[0]!;
    const [a, b, c] = w.posted.map((p) => p.id);
    w.reply([
      { id: b!, ok: true, url: ART.url, info: INFO, kept: true },
      { id: a!, ok: true, url: ART.url, info: INFO, kept: false },
      { id: c!, ok: false, error: 'clip' },
    ]);
    // all three resolve in the microtasks after that one message, before any timer or task
    await Promise.resolve();
    await Promise.resolve();
    expect(settled.sort()).toEqual(['a', 'b', 'c:none']);
    await Promise.all(jobs);
    // an `unsupported` reply inside a batch gives the worker up for the rest of the page, as alone
    const d = run(JOB);
    const e = run({ ...JOB, clip: 'walk' });
    w.reply([
      { id: w.posted[3]!.id, ok: false, error: 'unsupported' },
      { id: w.posted[4]!.id, ok: true, url: ART.url, info: INFO, kept: true },
    ]);
    expect(await d).toBeNull();
    expect(await e).toBeNull();
    expect(w.terminated).toBe(true);
  });

  it('warms a worker ahead of its first job and lets it go if no job comes', () => {
    const made: FakeWorker[] = [];
    const run = stripWorker(() => {
      const w = new FakeWorker();
      made.push(w);
      return w as unknown as Worker;
    }, { lingerMs: 5000 });
    run.warm();
    run.warm();
    expect(made).toHaveLength(1);
    void run(JOB);
    expect(made).toHaveLength(1);
    expect(made[0]!.posted).toHaveLength(1);
    const idle = stripWorker(() => {
      const w = new FakeWorker();
      made.push(w);
      return w as unknown as Worker;
    }, { lingerMs: 5000 });
    idle.warm();
    vi.advanceTimersByTime(5001);
    expect(made[1]!.terminated).toBe(true);
  });

  it('gives up on a worker that cannot draw, errs or hangs (the main thread does the jobs)', async () => {
    for (const how of ['unsupported', 'error', 'timeout'] as const) {
      const made: FakeWorker[] = [];
      const run = stripWorker(() => {
        const w = new FakeWorker();
        made.push(w);
        return w as unknown as Worker;
      });
      const a = run(JOB);
      const w = made[0]!;
      if (how === 'unsupported') w.reply({ id: w.posted[0]!.id, ok: false, error: 'unsupported' });
      if (how === 'error') w.onerror?.({ preventDefault: () => undefined } as ErrorEvent);
      if (how === 'timeout') vi.advanceTimersByTime(10_001);
      expect(await a).toBeNull();
      expect(w.terminated).toBe(true);
      expect(await run(JOB)).toBeNull();
      expect(made).toHaveLength(1);
    }
    const throws = stripWorker(() => {
      throw new Error('no workers here');
    });
    expect(await throws(JOB)).toBeNull();
  });
});

function workerMock() {
  return Object.assign(
    vi.fn<(job: Omit<StripJob, 'id'>) => Promise<StripArt | null>>(async () => ART),
    { warm: vi.fn() },
  );
}
type WorkerMock = ReturnType<typeof workerMock>;

function deps(o: Partial<StripDeps> = {}): StripDeps & { worker: WorkerMock; mainSlot: ReturnType<typeof vi.fn> } {
  return { fetch: vi.fn(async () => new Response('', { status: 404 })), keep: null, store: null, worker: workerMock(), mainSlot: vi.fn(async () => undefined), keepPuppets: true, ...o } as StripDeps & { worker: WorkerMock; mainSlot: ReturnType<typeof vi.fn> };
}

const sheet = (url = '/ageborn/art/units/medieval/footman.json'): StripSource => ({ kind: 'atlas', url, heightLu: 68, headLu: 66 });
const tinCan = (): StripSource => {
  const def = MANIFEST['unit.footman@tin_can'] as VisualDef;
  return { kind: 'puppet', key: 'unit.footman@tin_can', puppet: SKIN_PUPPETS.find((p) => p.id === 'unit.footman@tin_can')!, def, headLu: -def.anchors.head.y, aura: true };
};

describe('the strip of a request', () => {
  afterEach(() => setStripDeps(null));

  it('asks the worker for a sheet strip, with the sheet, the renderer and the store', async () => {
    const d = deps({ keep: 'https://x.test/ageborn/' });
    expect(await spriteStripArt({ sources: [sheet()], clip: 'idle', size: 160, side: 1, preset: 'default', deps: d })).toEqual(ART);
    expect(d.worker).toHaveBeenCalledTimes(1);
    const job = d.worker.mock.calls[0]![0];
    expect(job).toMatchObject({ clip: 'idle', size: 160, headLu: 66, heightLu: 68, keep: 'https://x.test/ageborn/', tag: stripRendererTag() });
    expect(job.url).toMatch(/\/ageborn\/art\/units\/medieval\/footman\.json$/);
    expect(d.mainSlot).not.toHaveBeenCalled();
  });

  it('without a worker finds a kept strip on the main thread, and draws only in a main-thread slot', async () => {
    const png = new Uint8Array([137, 80, 78, 71]).buffer;
    const fetch = vi.fn(async (u: string) => (u.endsWith('.json') ? new Response(footmanText) : new Response(png)));
    const store = { get: vi.fn(async (_slot: string, _version: string) => ART as StripArt | null), put: vi.fn(async () => undefined) };
    const kept = deps({ worker: null, fetch, store, keep: 'https://x.test/' });
    expect(await spriteStripArt({ sources: [sheet()], clip: 'idle', size: 160, side: 0, preset: 'default', deps: kept })).toEqual(ART);
    expect(store.get).toHaveBeenCalledWith('idle|160|2f7df6|/ageborn/art/units/medieval/footman.json', sheetVersion({ tag: stripRendererTag(), heightLu: 68, headLu: 66, json: footmanText, png }));
    expect(kept.mainSlot).not.toHaveBeenCalled();
    // a miss waits for a main-thread slot (no canvas in this test: nothing is drawn or kept)
    const miss = deps({ worker: null, fetch, store: { get: vi.fn(async () => null), put: vi.fn(async () => undefined) }, keep: 'https://x.test/' });
    expect(await spriteStripArt({ sources: [sheet()], clip: 'idle', size: 160, side: 0, preset: 'default', deps: miss })).toBeNull();
    expect(miss.mainSlot).toHaveBeenCalledTimes(1);
  });

  it("tries the skin's drawing first, then the card's own sheet", async () => {
    const d = deps();
    // the puppet draws on a canvas, which this test has not: the card's own strip answers
    expect(await spriteStripArt({ sources: [tinCan(), sheet()], clip: 'idle', size: 160, side: 0, preset: 'default', deps: d })).toEqual(ART);
    expect(d.mainSlot).toHaveBeenCalledTimes(1);
    expect(d.worker).toHaveBeenCalledTimes(1);
    // a kept puppet strip answers at once (when puppet strips are kept)
    const store = { get: vi.fn(async (_slot: string, _version: string) => ART as StripArt | null), put: vi.fn(async () => undefined) };
    const kept = deps({ store });
    expect(await spriteStripArt({ sources: [tinCan(), sheet()], clip: 'idle', size: 160, side: 0, preset: 'default', deps: kept })).toEqual(ART);
    expect(kept.worker).not.toHaveBeenCalled();
    expect(store.get.mock.calls[0]![0]).toBe('idle|160|2f7df6|unit.footman@tin_can');
    const unkept = deps({ store, keepPuppets: false });
    await spriteStripArt({ sources: [tinCan(), sheet()], clip: 'idle', size: 160, side: 0, preset: 'default', deps: unkept });
    expect(store.get).toHaveBeenCalledTimes(1);
  });

  it('shares one job between the strip and its layout, and keeps none that failed', async () => {
    const d = deps();
    setStripDeps(d);
    const a = spriteStripArt({ sources: [sheet()], clip: 'idle', size: 160, side: 0, preset: 'default' });
    const b = spriteStripArt({ sources: [sheet()], clip: 'idle', size: 160, side: 0, preset: 'default' });
    expect(a).toBe(b);
    await a;
    d.worker.mockResolvedValueOnce(null);
    expect(await spriteStripArt({ sources: [sheet('/x.json')], clip: 'idle', size: 160, side: 0, preset: 'default' })).toBeNull();
    expect(await spriteStripArt({ sources: [sheet('/x.json')], clip: 'idle', size: 160, side: 0, preset: 'default' })).toEqual(ART);
  });
});

describe("the provider's strips", () => {
  afterEach(() => setStripDeps(null));

  it('answers `strip:` with the strip and `stripinfo:` with its layout, from one job', async () => {
    const d = deps();
    setStripDeps(d);
    const art = createArtProvider({ warn: () => {} });
    expect(await art.portrait({ card: 'strip:idle:footman', size: 160 })).toBe(ART.url);
    expect(parseStripInfo(await art.portrait({ card: 'stripinfo:idle:footman', size: 160 }))).toEqual(INFO);
    expect(d.worker).toHaveBeenCalledTimes(1);
    const job = d.worker.mock.calls[0]![0];
    expect(job.url).toMatch(/art\/units\/medieval\/footman\.json$/);
    expect(job.headLu).toBe(66);
  });

  it("draws a troop's skin (its puppet; the card's own strip when the puppet cannot be drawn), and nothing for a forced tier", async () => {
    const d = deps();
    setStripDeps(d);
    const art = createArtProvider({ warn: () => {} });
    expect(await art.portrait({ card: 'strip:idle:footman', skin: 'tin_can', size: 160 })).toBe(ART.url);
    // the skinned strip is its own job (the puppet first, here without a canvas, then the card's sheet)
    expect(d.mainSlot).toHaveBeenCalledTimes(1);
    await art.portrait({ card: 'strip:idle:footman', size: 160 });
    expect(d.worker).toHaveBeenCalledTimes(2);
    const forced = createArtProvider({ warn: () => {}, force: 'procedural' });
    expect(await forced.portrait({ card: 'strip:idle:longbowman', size: 160 })).toBe('');
    expect(await forced.portrait({ card: 'stripinfo:idle:longbowman', size: 160 })).toBe('');
  });
});

describe("a skin puppet's strip", () => {
  it('samples its idle clip at about 115 ms a frame and stands it on its feet in the cell', () => {
    const src = tinCan() as Extract<StripSource, { kind: 'puppet' }>;
    const l = puppetStripLayout(src, 'idle', 160)!;
    const ms = (src.def.clips['idle'] as { durationMs: number }).durationMs;
    expect(l.info.frames).toBe(Math.round(ms / 115));
    expect(l.info.ms).toBe(ms);
    expect(l.poses).toHaveLength(l.info.frames);
    expect(l.info.feet).toEqual([Math.round(l.ox * 100) / 100, Math.round(l.oy * 100) / 100]);
    expect(l.info.pxPerLu).toBeCloseTo(l.k, 3);
    expect(l.info.headLu).toBe(src.headLu);
    const [x0, x1, y0, y1] = l.info.box;
    expect(x0).toBeGreaterThanOrEqual(0);
    expect(x1).toBeLessThanOrEqual(160);
    expect(y0).toBeGreaterThanOrEqual(0);
    expect(y1).toBeLessThanOrEqual(160 * 0.98 + 0.01);
    expect(l.aura).toBeNull();
  });

  it('makes room for an aura glow on the High preset', () => {
    const def = MANIFEST['unit.corsair@ghost_corsair'] as VisualDef;
    const puppet = SKIN_PUPPETS.find((p) => p.id === 'unit.corsair@ghost_corsair')!;
    const high = puppetStripLayout({ kind: 'puppet', key: 'unit.corsair@ghost_corsair', puppet, def, headLu: -def.anchors.head.y, aura: true }, 'idle', 160)!;
    const lite = puppetStripLayout({ kind: 'puppet', key: 'unit.corsair@ghost_corsair', puppet, def, headLu: -def.anchors.head.y, aura: false }, 'idle', 160)!;
    expect(high.aura).not.toBeNull();
    expect(lite.aura).toBeNull();
    expect(high.k).toBeLessThanOrEqual(lite.k);
    // the glow fits in the cell, and the feet stay the puppet's origin
    const a = high.aura!;
    expect(high.ox + (a.x - a.r) * high.k).toBeGreaterThanOrEqual(-0.01);
    expect(high.ox + (a.x + a.r) * high.k).toBeLessThanOrEqual(160.01);
    expect(high.oy + (a.y - a.r) * high.k).toBeGreaterThanOrEqual(-0.01);
    expect(high.oy + (a.y + a.r) * high.k).toBeLessThanOrEqual(160 * 0.98 + 0.01);
    expect(high.info.feet).toEqual([Math.round(high.ox * 100) / 100, Math.round(high.oy * 100) / 100]);
    expect(high.alpha).toBe(0.7);
  });
});

describe('strips ready at boot', () => {
  const real = (globalThis as { localStorage?: unknown }).localStorage;
  let data: Map<string, string>;
  beforeEach(() => {
    vi.useFakeTimers();
    data = new Map();
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  });
  afterEach(() => {
    setStripDeps(null);
    vi.useRealTimers();
    (globalThis as { localStorage?: unknown }).localStorage = real;
  });

  it("remembers the strips asked for and looks them up again at boot: sheets through the worker, a skin puppet's kept strip in the store (review 2 N-b)", async () => {
    const d = deps({ keep: 'https://x.test/' });
    setStripDeps(d);
    await spriteStripArt({ sources: [sheet()], clip: 'idle', size: 160, side: 0, preset: 'default' });
    await spriteStripArt({ sources: [tinCan(), sheet()], clip: 'idle', size: 160, side: 0, preset: 'default' });
    await vi.advanceTimersByTimeAsync(1100);
    const saved = JSON.parse(data.get(RECENT_KEY) ?? '[]') as { id: string; puppet?: unknown; sources: unknown[] }[];
    expect(saved.map((r) => r.id)).toEqual(['/ageborn/art/units/medieval/footman.json|idle|160|2f7df6', 'unit.footman@tin_can>/ageborn/art/units/medieval/footman.json|idle|160|2f7df6']);
    // of the skin's puppet only what its kept strip is keyed by (the puppet itself is the provider's)
    const head = -(MANIFEST['unit.footman@tin_can'] as VisualDef).anchors.head.y;
    expect(saved[1]!.puppet).toEqual({ key: 'unit.footman@tin_can', headLu: head, aura: true });
    expect(saved[1]!.sources).toEqual([sheet()]);
    // the next page load: the skin's kept strip is one store read, the sheet's goes through the worker
    const PUPPET_ART: StripArt = { url: 'data:image/png;base64,BBBB', info: INFO };
    const store = { get: vi.fn(async (slot: string, _version: string) => (slot.endsWith('|unit.footman@tin_can') ? PUPPET_ART : null)), put: vi.fn(async () => undefined) };
    const next = deps({ keep: 'https://x.test/', store });
    setStripDeps(next);
    expect(warmRecentStrips()).toBe(2);
    expect(next.worker.warm).toHaveBeenCalledTimes(1);
    expect(next.worker).toHaveBeenCalledTimes(1);
    expect(store.get.mock.calls.map((c) => c[0])).toEqual(['idle|160|2f7df6|unit.footman@tin_can']);
    // Home's requests find both under way: nothing is drawn, no second worker job or store read
    await spriteStripArt({ sources: [sheet()], clip: 'idle', size: 160, side: 0, preset: 'default' });
    expect(await spriteStripArt({ sources: [tinCan(), sheet()], clip: 'idle', size: 160, side: 0, preset: 'default' })).toEqual(PUPPET_ART);
    expect(next.worker).toHaveBeenCalledTimes(1);
    expect(next.mainSlot).not.toHaveBeenCalled();
    expect(store.get).toHaveBeenCalledTimes(1);
    // a skin whose strip is not kept (a new build) is drawn as before
    const empty = deps({ keep: 'https://x.test/', store: { get: vi.fn(async () => null), put: vi.fn(async () => undefined) } });
    setStripDeps(empty);
    warmRecentStrips();
    expect(await spriteStripArt({ sources: [tinCan(), sheet()], clip: 'idle', size: 160, side: 0, preset: 'default' })).toEqual(ART);
    expect(empty.mainSlot).toHaveBeenCalledTimes(1);
  });

  it('only warms the worker when nothing can be kept, and does nothing without a worker', () => {
    data.set(RECENT_KEY, JSON.stringify([{ id: 'x', sources: [{ kind: 'atlas', url: '/a.json', headLu: 60 }], clip: 'idle', size: 160, side: 0, preset: 'default' }]));
    const d = deps({ keep: null });
    setStripDeps(d);
    expect(warmRecentStrips()).toBe(0);
    expect(d.worker.warm).toHaveBeenCalledTimes(1);
    expect(d.worker).not.toHaveBeenCalled();
    setStripDeps(deps({ worker: null }));
    expect(warmRecentStrips()).toBe(0);
  });
});
