// Serves the game repo for captures: its own Vite config, with no hot reload and no file watching, so a
// capture that runs for minutes is never reloaded by an edit. `node scripts/server.mjs` (port 7951).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GAME_PORT, GAME_REPO } from '../lib/config.mjs';

const vite = await import(pathToFileURL(path.join(GAME_REPO, 'node_modules', 'vite', 'dist', 'node', 'index.js')).href);
const server = await vite.createServer({
  root: GAME_REPO,
  configFile: path.join(GAME_REPO, 'vite.config.ts'),
  server: { port: GAME_PORT, strictPort: true, host: '127.0.0.1', hmr: false, watch: null },
  logLevel: 'warn',
});
await server.listen();
console.log(`game dev server (no hot reload) on http://127.0.0.1:${GAME_PORT}/`);
