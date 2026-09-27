/**
 * Dev page router (DESIGN B11, C1). Active when the URL has `?dev=1`.
 *
 * Pages are discovered with `import.meta.glob('./*\/page.tsx')`, so each work package adds its own
 * `src/dev/<name>/page.tsx` without touching a shared registry. A page module default-exports a
 * Preact component and may export `title` (string). The page is selected by the URL hash:
 * `?dev=1#gallery` opens `src/dev/gallery/page.tsx`.
 *
 * Dev pages are internal tools and are exempt from the i18n rule.
 */
import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export interface DevPageModule {
  default: ComponentType;
  title?: string;
}

const pages = import.meta.glob<DevPageModule>('./*/page.tsx');

/** Dev page names, sorted, derived from the folder names. */
export const devPageNames: string[] = Object.keys(pages)
  .map((p) => /^\.\/([^/]+)\/page\.tsx$/.exec(p)?.[1])
  .filter((n): n is string => n !== undefined)
  .sort();

/** True when the URL asks for dev mode (`?dev=1`). */
export function isDevMode(search: string = window.location.search): boolean {
  return new URLSearchParams(search).get('dev') === '1';
}

function currentPage(): string {
  return decodeURIComponent(window.location.hash.replace(/^#/, '')).split('/')[0] ?? '';
}

const listStyle = {
  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
  padding: '24px',
  color: '#f4ecd8',
  background: '#1b1a2e',
  minHeight: '100%',
  boxSizing: 'border-box',
  overflow: 'auto',
  position: 'absolute',
  inset: 0,
} as const;

export function DevRouter() {
  const [name, setName] = useState(currentPage());
  const [Page, setPage] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => setName(currentPage());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    setPage(null);
    setError(null);
    const load = name ? pages[`./${name}/page.tsx`] : undefined;
    if (!load) return;
    let cancelled = false;
    load()
      .then((mod) => {
        if (!cancelled) setPage(() => mod.default);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (name && Page) return <Page />;
  if (name && error) return <pre style={listStyle}>Failed to load dev page "{name}": {error}</pre>;
  if (name && pages[`./${name}/page.tsx`]) return <div style={listStyle}>Loading {name}…</div>;

  return (
    <div style={listStyle} data-testid="dev-page-list">
      <h1 style={{ marginTop: 0 }}>Ageborn dev pages</h1>
      {name ? <p>Unknown dev page "{name}".</p> : null}
      {devPageNames.length === 0 ? (
        <p>No dev pages yet. Add src/dev/&lt;name&gt;/page.tsx.</p>
      ) : (
        <ul>
          {devPageNames.map((n) => (
            <li key={n}>
              <a style={{ color: '#f2c14e' }} href={`?dev=1#${n}`}>
                {n}
              </a>
            </li>
          ))}
        </ul>
      )}
      <p>
        <a style={{ color: '#9fc3ff' }} href="./">
          Back to the game
        </a>
      </p>
    </div>
  );
}
