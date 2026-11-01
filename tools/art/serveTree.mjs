// A Vite dev server for one tree of the art rounds' before/after captures (art/blender/README.md, "Evidence for a
// wave"): the tree's own vite.config.ts, a fixed port, a private dependency cache (two trees that share one
// node_modules would otherwise overwrite each other's node_modules/.vite), no HMR and no file watching (a capture
// run needs neither, and both cost CPU while other work measures frame time). Runs until stopped; prints its PID.
// Dev tool: not part of the build or the test suite.
//
// usage: node tools/art/serveTree.mjs [--root DIR] [--port 8131] [--cache DIR]
//   --root: the tree to serve (default: the current directory), e.g. a `git archive` export of origin/main
//   --cache: the dependency cache (default: <os tmpdir>/ageborn-art-vite-<port>)
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : dflt;
};
const root = path.resolve(arg('root', '.'));
const port = Number(arg('port', '8131'));
const cacheDir = path.resolve(arg('cache', path.join(os.tmpdir(), `ageborn-art-vite-${port}`)));

const server = await createServer({
  root,
  configFile: path.join(root, 'vite.config.ts'),
  cacheDir,
  clearScreen: false,
  server: { port, strictPort: true, host: '127.0.0.1', hmr: false, watch: null },
});
await server.listen();
console.log(`serving ${root} at http://127.0.0.1:${port}/ (pid ${process.pid}, cache ${cacheDir})`);
