/**
 * Dev page: save system (WP8). Open with `?dev=1#save`.
 *
 * Everything runs on a sandbox in-memory storage, so the real save in this browser is never touched
 * (the "Real storage" panel only reads it). Buttons drive the store through the DESIGN B8 cases:
 * debounced and immediate writes, slot alternation, damaged and newer-version slots, the quota error
 * with its player-facing message, export codes and `.ageborn` files, the replay ring and event log.
 * `window.__saveDev` exposes the sandbox for browser checks. Dev pages are exempt from the i18n rule.
 */
import { useEffect, useState } from 'preact/hooks';
import type { ReplayDoc, SaveDoc } from '@/contracts';
import { fakeSaveDoc } from '@/contracts/fakes/saveStore';
import { fakeSideConfig } from '@/contracts/fakes/content';
import { i18n } from '@/i18n';
import {
  decodeSlot,
  downloadSaveFile,
  encodeEnvelope,
  IMPORT_MESSAGE_KEYS,
  LocalSaveStore,
  MemoryStorage,
  SAVE_KEYS,
  SAVE_VERSION,
  SLOT_KEYS,
  validateSaveDoc,
  type ImportResult,
  type SaveNotice,
  type SlotId,
} from '@/save';

export const title = 'Save system';

/**
 * The EN strings requested in docs/requests/wp8-strings.md, shown here until the string file lands.
 * Keep in sync with the request.
 */
const PROPOSED_EN: Record<string, string> = {
  'save.problem.quota': "Storage is full, so your progress isn't being saved. Back it up in Settings.",
  'save.problem.unavailable': 'This browser blocks saving. Your progress will be lost when you close the game. Back it up in Settings.',
  'save.problem.writeFailed': "Your progress couldn't be saved. Back it up in Settings.",
  'save.problem.recovered': 'Your last save was damaged, so an earlier copy was loaded.',
  'save.problem.unreadable': 'Save could not be read. Import a backup?',
  'save.problem.tooNew': 'Your save is from a newer version of Ageborn. Reload the page to update. Nothing is saved until then.',
  'save.import.empty': 'Paste a save code first.',
  'save.import.notACode': "That isn't an Ageborn save code.",
  'save.import.corrupt': 'That code is damaged. Copy the whole code and try again.',
  'save.import.notASave': "That code doesn't contain a save.",
  'save.import.tooNew': 'That save is from a newer version. Reload the game to update, then try again.',
  'save.import.invalid': "That save couldn't be read.",
};

function message(key: string): string {
  return i18n.has(key) ? i18n.t(key) : `${PROPOSED_EN[key] ?? key} [string pending]`;
}

const page = {
  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
  fontSize: '12px',
  color: '#f4ecd8',
  background: '#1b1a2e',
  position: 'absolute',
  inset: 0,
  overflow: 'auto',
  padding: '16px',
  boxSizing: 'border-box',
} as const;
const panel = { border: '1px solid #3a3960', borderRadius: '6px', padding: '10px 12px', marginBottom: '12px' } as const;
const btn = {
  marginRight: '6px',
  marginBottom: '6px',
  padding: '4px 10px',
  background: '#2c2b44',
  color: '#f4ecd8',
  border: '1px solid #4a4970',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '12px',
} as const;
const td = { padding: '2px 8px', borderBottom: '1px solid #2c2b44', verticalAlign: 'top' } as const;
const problemBox = (bad: boolean) =>
  ({ ...panel, borderColor: bad ? '#e0605e' : '#3a3960', background: bad ? '#3a1f2a' : 'transparent' }) as const;

let replaySeed = 0;

/** A small, shape-valid replay (the real ones come from the sim at the end of a match). */
function devReplay(): ReplayDoc {
  replaySeed += 1;
  return {
    v: 1,
    simVersion: 'dev',
    contentHash: 'dev',
    seed: replaySeed,
    format: 'short',
    sides: [fakeSideConfig(), fakeSideConfig({ isBot: true })],
    modifiers: [],
    training: null,
    commands: [{ t: 'train', side: 0, slot: 0, tick: 1, seq: 0 }],
    result: { winner: 0, reason: 'baseDestroyed', tick: 2400, baseHpBp: [8000, 0] },
    finalHash: 0x1234abcd,
    hashes: [1, 2, 3],
  };
}

interface Sandbox {
  storage: MemoryStorage;
  store: LocalSaveStore;
}

function newSandbox(storage = new MemoryStorage()): Sandbox {
  return { storage, store: new LocalSaveStore({ storage }) };
}

/** Flips one character in the middle of a slot's payload (the checksum then fails). */
function corrupt(storage: MemoryStorage, slot: SlotId): void {
  const raw = storage.getItem(SLOT_KEYS[slot]);
  if (!raw) return;
  const i = Math.floor(raw.length / 2);
  storage.setItem(SLOT_KEYS[slot], raw.slice(0, i) + (raw[i] === '1' ? '2' : '1') + raw.slice(i + 1));
}

function newestSlot(storage: MemoryStorage): SlotId | null {
  const a = decodeSlot('A', storage.getItem(SLOT_KEYS.A));
  const b = decodeSlot('B', storage.getItem(SLOT_KEYS.B));
  if (a.ok && b.ok) return a.envelope.writtenAt >= b.envelope.writtenAt ? 'A' : 'B';
  return a.ok ? 'A' : b.ok ? 'B' : null;
}

function slotSummary(raw: string | null, slot: SlotId): string {
  const r = decodeSlot(slot, raw);
  if (!r.ok) return r.defect;
  const valid = validateSaveDoc(r.doc, SAVE_VERSION);
  const amber = (r.doc as Partial<SaveDoc>).currencies?.amber;
  return `v${r.envelope.v}, writtenAt ${new Date(r.envelope.writtenAt).toISOString()}, checksum ok, schema ${valid.ok ? 'ok' : 'FAIL'}, amber ${String(amber)}`;
}

function StoragePanel({ storage }: { storage: MemoryStorage }) {
  const snap = storage.snapshot();
  return (
    <table style={{ borderCollapse: 'collapse', width: '100%' }} data-testid="save-storage">
      <tbody>
        {Object.entries(snap).map(([k, val]) => (
          <tr key={k}>
            <td style={td}>{k}</td>
            <td style={td}>{val.length.toLocaleString()} chars</td>
            <td style={td}>
              {k === SLOT_KEYS.A ? slotSummary(val, 'A') : k === SLOT_KEYS.B ? slotSummary(val, 'B') : k.startsWith(SAVE_KEYS.backupPrefix) ? 'backup' : ''}
            </td>
          </tr>
        ))}
        {Object.keys(snap).length === 0 ? (
          <tr>
            <td style={td}>(empty)</td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

function RealStoragePanel() {
  const [rows, setRows] = useState<[string, string][] | null>(null);
  const inspect = () => {
    const out: [string, string][] = [];
    try {
      const ls = window.localStorage;
      for (let i = 0; i < ls.length; i += 1) {
        const k = ls.key(i);
        if (!k || !k.startsWith('ageborn.')) continue;
        const val = ls.getItem(k) ?? '';
        const info = k === SLOT_KEYS.A ? slotSummary(val, 'A') : k === SLOT_KEYS.B ? slotSummary(val, 'B') : '';
        out.push([k, `${val.length.toLocaleString()} chars ${info}`]);
      }
    } catch (e) {
      out.push(['localStorage', `blocked: ${String(e)}`]);
    }
    setRows(out.sort());
  };
  return (
    <div style={panel}>
      <b>Real storage (read-only)</b>{' '}
      <button style={btn} onClick={inspect} data-testid="save-inspect-real">
        Inspect this browser's ageborn.* keys
      </button>
      {rows ? (
        <ul>
          {rows.length === 0 ? <li>No ageborn.* keys.</li> : rows.map(([k, info]) => <li key={k}>{k}: {info}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

export default function SaveDevPage() {
  const [box, setBox] = useState<Sandbox>(() => newSandbox());
  const [doc, setDoc] = useState<SaveDoc>(() => fakeSaveDoc());
  const [, setTick] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [importText, setImportText] = useState('');
  const [imported, setImported] = useState<ImportResult | null>(null);
  const { store, storage } = box;

  const note = (s: string) => setLog((l) => [`${new Date().toISOString().slice(11, 23)} ${s}`, ...l].slice(0, 40));
  const refresh = () => setTick((n) => n + 1);

  useEffect(() => {
    const off = store.onProblem((n: SaveNotice | null) => note(n ? `problem: ${n.kind} (${n.messageKey})` : 'problem cleared'));
    const timer = setInterval(refresh, 250);
    (window as unknown as { __saveDev?: unknown }).__saveDev = { store, storage };
    return () => {
      off();
      clearInterval(timer);
    };
  }, [store, storage]);

  const act = (label: string, fn: () => void | Promise<void>) => async () => {
    await fn();
    note(label);
    refresh();
  };

  const bumpAmber = () => setDoc((d) => ({ ...d, currencies: { ...d.currencies, amber: d.currencies.amber + 100 } }));
  const report = store.loadReport;
  const problem = store.problem;
  const replays = store.loadReplays();

  return (
    <div style={page} data-testid="save-dev">
      <h2 style={{ marginTop: 0 }}>Save system (WP8)</h2>
      <p>
        Sandbox: an in-memory storage, so your real save is safe. Save version v{SAVE_VERSION}, debounce 2 s. The working doc
        has <b data-testid="save-doc-amber">{doc.currencies.amber}</b> Amber.
      </p>

      <div style={panel}>
        <b>Doc</b>{' '}
        <button style={btn} onClick={bumpAmber} data-testid="save-amber">
          Amber +100
        </button>
        <button style={btn} onClick={() => setDoc(fakeSaveDoc())}>
          Fresh fake doc
        </button>
        <br />
        <b>Store</b>{' '}
        <button style={btn} onClick={act('save (debounced)', () => void store.save(doc))} data-testid="save-debounced">
          save()
        </button>
        <button style={btn} onClick={act('save immediate', () => store.save(doc, { immediate: true }))} data-testid="save-now">
          save(immediate)
        </button>
        <button style={btn} onClick={act('flush', () => store.flush())} data-testid="save-flush">
          flush()
        </button>
        <button
          style={btn}
          data-testid="save-load"
          onClick={act('load (new session)', () => {
            const next = newSandbox(storage);
            const loaded = next.store.loadNow();
            if (loaded) setDoc(loaded);
            setBox(next);
          })}
        >
          load() in a new session
        </button>
        <button style={btn} onClick={act('reset', () => store.reset())} data-testid="save-reset">
          reset()
        </button>
        <button style={btn} onClick={act('new empty sandbox', () => setBox(newSandbox()))}>
          New empty sandbox
        </button>
        <br />
        <b>Break it</b>{' '}
        <button
          style={btn}
          data-testid="save-corrupt-newest"
          onClick={act('corrupted newest slot', () => {
            const s = newestSlot(storage);
            if (s) corrupt(storage, s);
          })}
        >
          Corrupt newest slot
        </button>
        <button style={btn} data-testid="save-corrupt-both" onClick={act('corrupted both slots', () => (corrupt(storage, 'A'), corrupt(storage, 'B')))}>
          Corrupt both slots
        </button>
        <button
          style={btn}
          data-testid="save-future"
          onClick={act('wrote a v99 save into slot A', () => {
            storage.setItem(SLOT_KEYS.A, encodeEnvelope(JSON.stringify({ ...doc, v: 99 }), 99, Date.now() + 1e6));
          })}
        >
          Slot A from a newer build (v99)
        </button>
        <button style={btn} data-testid="save-fill" onClick={act('storage full', () => void (storage.quota = storage.used() - 1))}>
          Fill storage (no write can grow it)
        </button>
        <button style={btn} data-testid="save-unfill" onClick={act('storage unlimited', () => void (storage.quota = Number.POSITIVE_INFINITY))}>
          Unlimited storage
        </button>
      </div>

      <div style={problemBox(problem !== null)} data-testid="save-problem">
        <b>Player message:</b> {problem ? `${message(problem.messageKey)} (${problem.kind}, ${problem.messageKey})` : 'none: progress is being saved'}
        {problem?.detail ? <div style={{ opacity: 0.7 }}>detail: {problem.detail}</div> : null}
      </div>

      <div style={panel} data-testid="save-status">
        <b>Status</b>: next write slot {store.nextWriteSlot}, pending {String(store.hasPendingWrite)}, writes {store.writeCount}, last saved{' '}
        {store.lastSavedAt ? new Date(store.lastSavedAt).toISOString() : '-'}, storage {storage.used().toLocaleString()} /{' '}
        {Number.isFinite(storage.quota) ? storage.quota.toLocaleString() : '∞'} chars
        <div data-testid="save-report">
          <b>Last load</b>:{' '}
          {report
            ? `${report.status}${report.slot ? ` from slot ${report.slot}` : ''}; ${report.slots
                .map((s) => `${s.slot}: ${s.outcome}${s.detail ? ` (${s.detail.slice(0, 120)})` : ''}`)
                .join('; ')}`
            : 'not loaded in this session'}
          {report?.notice ? <div>Banner: {message(report.notice.messageKey)}</div> : null}
        </div>
      </div>

      <div style={panel}>
        <b>Storage (sandbox)</b>
        <StoragePanel storage={storage} />
      </div>

      <div style={panel}>
        <b>Export / import</b>{' '}
        <button style={btn} onClick={() => setCode(store.exportCode(doc))} data-testid="save-export">
          Export code
        </button>
        <button style={btn} onClick={() => downloadSaveFile(store.exportFile(doc))}>
          Download .ageborn
        </button>
        {code ? (
          <div>
            <div>
              {code.length.toLocaleString()} chars (JSON {JSON.stringify(doc).length.toLocaleString()}){' '}
              <button style={btn} onClick={() => void navigator.clipboard?.writeText(code)}>
                Copy
              </button>
              <button style={btn} onClick={() => setImportText(code)}>
                Paste into import
              </button>
            </div>
            <textarea readOnly value={code} rows={3} style={{ width: '100%', background: '#12111f', color: '#f4ecd8' }} data-testid="save-code" />
          </div>
        ) : null}
        <div>
          <textarea
            value={importText}
            onInput={(e) => setImportText((e.target as HTMLTextAreaElement).value)}
            rows={3}
            placeholder="Paste a code or a .ageborn file's text"
            style={{ width: '100%', background: '#12111f', color: '#f4ecd8' }}
            data-testid="save-import-text"
          />
          <button style={btn} onClick={() => setImported(store.importCode(importText))} data-testid="save-import">
            Import (validate + migrate)
          </button>
          <input
            type="file"
            accept=".ageborn,text/plain"
            onChange={async (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (f) setImported(store.importFile(await f.text()));
            }}
          />
          {imported ? (
            <div data-testid="save-import-result">
              {imported.ok ? (
                <>
                  OK: v{imported.fromVersion} save with {imported.value.currencies.amber} Amber.{' '}
                  <button style={btn} onClick={() => setDoc(imported.value)}>
                    Use as working doc
                  </button>
                </>
              ) : (
                `Failed: ${imported.reason} → ${IMPORT_MESSAGE_KEYS[imported.reason]}: ${message(IMPORT_MESSAGE_KEYS[imported.reason])}${imported.detail ? ` (${imported.detail.slice(0, 160)})` : ''}`
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div style={panel}>
        <b>Replays and event log</b>{' '}
        <button style={btn} onClick={act('pushed a replay', () => store.pushReplay(devReplay()))} data-testid="save-push-replay">
          Push replay
        </button>
        <button style={btn} onClick={act('pushed 25 replays', () => { for (let i = 0; i < 25; i += 1) store.pushReplay(devReplay()); })}>
          Push 25
        </button>
        <button style={btn} onClick={act('logged an event', () => store.eventLog.record(Date.now(), 'dev', 'savePage'))}>
          Log event
        </button>
        <div data-testid="save-replays">
          Replays: {replays.length} in the ring (seeds {replays.map((r) => r.seed).join(', ') || '-'}), {store.replays.persisted} persisted. Event log:{' '}
          {store.eventLog.items().length} events, {store.eventLog.persisted} persisted.
        </div>
      </div>

      <RealStoragePanel />

      <div style={panel}>
        <b>Log</b>
        <ul data-testid="save-log">
          {log.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
