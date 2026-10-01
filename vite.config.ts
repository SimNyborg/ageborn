import { fileURLToPath, URL } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig, type Plugin } from 'vite';

/**
 * The service packages `src/app/services.ts` imports dynamically at boot (B5 service swap). The browser
 * finds those chunks only once the entry has run, which put them late on the critical chain (perf audit
 * 2026-10-01: provider at 3.1 s, audio at 2.3 s on 4G with a 4x slower CPU). Boot always needs them, so
 * the built index.html preloads them with the entry.
 */
const BOOT_SERVICES = ['src/content/index.ts', 'src/sim/index.ts', 'src/ai/index.ts', 'src/visuals/index.ts', 'src/audio/index.ts', 'src/save/index.ts', 'src/meta/index.ts'];

function preloadBootServices(): Plugin {
  let base = '/';
  return {
    name: 'ageborn-preload-boot-services',
    apply: 'build',
    configResolved(c) {
      base = c.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const bundle = ctx.bundle;
        const entry = ctx.chunk;
        if (!bundle || !entry || entry.type !== 'chunk') return [];
        const chunks = new Map<string, (typeof entry)>();
        for (const c of Object.values(bundle)) if (c.type === 'chunk') chunks.set(c.fileName, c);
        // Everything the entry already loads statically needs no extra tag.
        const loaded = new Set<string>();
        const walk = (f: string): void => {
          if (loaded.has(f)) return;
          loaded.add(f);
          for (const i of chunks.get(f)?.imports ?? []) walk(i);
        };
        walk(entry.fileName);
        const want: string[] = [];
        const add = (f: string): void => {
          if (loaded.has(f)) return;
          loaded.add(f);
          want.push(f);
          for (const i of chunks.get(f)?.imports ?? []) add(i);
        };
        for (const c of chunks.values()) {
          const id = c.facadeModuleId?.replace(/\\/g, '/') ?? '';
          if (c.isDynamicEntry && BOOT_SERVICES.some((s) => id.endsWith(`/${s}`))) add(c.fileName);
        }
        return want.map((f) => ({ tag: 'link', attrs: { rel: 'modulepreload', crossorigin: '', href: `${base}${f}` }, injectTo: 'head' as const }));
      },
    },
  };
}

/**
 * The built stylesheets (about 90 KB gzipped) blocked the first paint until all of them had loaded,
 * so the inline splash of index.html showed late (perf audit 2026-10-01: first paint 4.7 s on 4G with
 * a 4x slower CPU). They load as preloads that turn into stylesheets once fetched; `main.tsx` waits
 * for them (`stylesReady`) before it draws the first screen, so nothing ever shows unstyled.
 */
function nonBlockingStyles(): Plugin {
  return {
    name: 'ageborn-non-blocking-styles',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(/<link rel="stylesheet"( crossorigin)? href="([^"]+)">/g, (_m, co: string | undefined, href: string) => `<link rel="preload" as="style"${co ?? ''} href="${href}" data-style onload="this.onload=null;this.rel='stylesheet'">`);
      },
    },
  };
}

/** GitHub Pages serves the game from /ageborn/ (DESIGN B1). The dev server uses /. */
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview === true ? '/ageborn/' : '/',
  plugins: [preact(), preloadBootServices(), nonBlockingStyles()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
  preview: { port: 4173 },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
}));
