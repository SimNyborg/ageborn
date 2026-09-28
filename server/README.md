# Ageborn online 1v1 server (spike)

A Cloudflare Worker with one Durable Object per match: a lockstep input relay for the deterministic
`src/sim`. Local only, not deployed. Design, measurements and the path to production are in
[`../docs/online-spike.md`](../docs/online-spike.md).

```
npm install
npm run build:client   # bundles client/online.ts + a bot driver into client/dist/bot.js
npm run e2e            # wrangler dev on 127.0.0.1:5063 + 2 headless Chromium pages per scenario
npm run bench          # CPU of the relay and the server re-simulation, in Node
npm run dev            # the server alone
```

This package has its own lockfile and does not touch the game's root `package.json`. It reuses `../src`
through the `@/*` alias in `tsconfig.json`. Avoid ports 5060/5061: browsers block them.
