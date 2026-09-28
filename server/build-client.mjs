// Bundles the client adapter + a bot driver (reusing ../src via the "@/*" path in tsconfig.json).
import { build } from 'esbuild';
const r = await build({
  entryPoints: ['client/bot-page.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  outfile: 'client/dist/bot.js',
  tsconfig: 'tsconfig.json',
  minify: true,
  metafile: true,
  logLevel: 'warning',
});
const bytes = Object.values(r.metafile.outputs)[0].bytes;
console.log(`client/dist/bot.js ${(bytes / 1024).toFixed(1)} KiB`);
