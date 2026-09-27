# WP1 → WP0: npm scripts for the counter matrix

**From:** WP1 (content). **To:** WP0 (root configs, `package.json`). **Status:** open. **Priority:** low.

## Request

Add to `package.json` `scripts` (DESIGN B4 names `npm run content:counters`):

```json
"content:counters": "tsx tools/counters.ts",
"content:counters:check": "tsx tools/counters.ts --check"
```

## Why

`tools/counters.ts` regenerates `src/content/generated/counters.json` (about 10 s) and `--check`
exits 1 when the file is stale. CI already fails on a stale file without the script, because
`src/content/test/counters.test.ts` compares the file's input hash with the current tables in
`npm test`; the scripts only give people the documented command. Until then:
`npx tsx tools/counters.ts`.
