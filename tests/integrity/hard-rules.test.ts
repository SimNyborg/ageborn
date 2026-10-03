/**
 * The hard rules of CLAUDE.md that code can check:
 *
 * - **No real money, ever**: no payment or ads SDK among the dependencies, no payment API in src.
 * - **Our own IP**: the name "Age of War" appears nowhere in the game, its strings or code identifiers.
 * - **Offline v1** (DESIGN B1, B14 `public/`: no external requests): production code holds no
 *   http(s) URL string.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { isTestFile, parse, productionFiles, rel, ROOT, SRC, walk } from './helpers/source';

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };

/** Package name fragments of payment, in-app purchase and ad SDKs. */
const MONEY_PACKAGES = /stripe|paypal|braintree|adyen|square|revenuecat|purchase|billing|iap\b|admob|adsense|adsbygoogle|googletag|google-ima|applovin|ironsource|unity-ads|chartboost|vungle|mopub|adinplay|gamedistribution|poki|crazygames|y8/i;
/** Payment and ad APIs in source code. */
const MONEY_APIS = /\bPaymentRequest\b|\bgoogletag\b|\badsbygoogle\b|\bgetDigitalGoodsService\b|\bStripe\(/;
const FORBIDDEN_NAME = /age\s*of\s*war/i;

/** Everything that ships (tests excluded: they may spell the name out to forbid it). */
function gameFiles(): string[] {
  return [
    ...walk(SRC, ['.ts', '.tsx', '.json', '.css']).filter((f) => !isTestFile(f)),
    ...walk(path.join(ROOT, 'public'), ['.html', '.svg', '.json', '.txt', '.webmanifest']),
    path.join(ROOT, 'index.html'),
    path.join(ROOT, 'package.json'),
  ];
}

describe('CLAUDE.md hard rules', () => {
  it('no payment or ads SDK is a dependency', () => {
    const deps = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
    expect(deps.length).toBeGreaterThan(5);
    expect(deps.filter((d) => MONEY_PACKAGES.test(d))).toEqual([]);
  });

  it('no payment or ad API is used in src', () => {
    const hits = productionFiles().filter((f) => MONEY_APIS.test(readFileSync(f, 'utf8')));
    expect(hits.map(rel)).toEqual([]);
  });

  it('the name "Age of War" appears nowhere in the game', () => {
    const files = gameFiles();
    expect(files.length).toBeGreaterThan(50);
    expect(files.filter((f) => FORBIDDEN_NAME.test(readFileSync(f, 'utf8').replace(/[_-]/g, ' '))).map(rel)).toEqual([]);
    // About 6.5 MB of sprite-sheet JSON (core, extras and HD sheets): under a full parallel run the scan
    // can pass the default 5 s, so it gets the same allowance as the source scan below.
  }, 30_000);

  it('production code makes no external requests (no http(s) URL strings outside dev pages)', () => {
    const hits: string[] = [];
    for (const f of productionFiles()) {
      if (rel(f).includes('/dev/')) continue;
      const sf = parse(f);
      const visit = (n: ts.Node): void => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && /^https?:\/\//i.test(n.text) && !/^https?:\/\/www\.w3\.org\//.test(n.text)) {
          hits.push(`${rel(f)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1} ${n.text}`);
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
    expect(hits).toEqual([]);
  }, 30_000);
});
