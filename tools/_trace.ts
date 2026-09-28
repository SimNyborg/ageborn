// Scratch: trace a bot vs a proxy match every N seconds.
import type { FormatId } from '../src/contracts';
import { content } from '../src/content';
import { createSim } from '../src/sim';
import { createBot, botProfile } from '../src/ai';
import { traceLine } from '../src/ai/controller';
import { HeadlessMatch } from './lib/driver';
import { baselinePlan, sideConfig } from './lib/plans';
import { createProxy, STRATEGIES, type ProxyId } from './proxies';

const [proxy = 'turret_turtle', fmt = 'full', tierS = '10', seedS = '1', everyS = '15'] = process.argv.slice(2);
const format = fmt as FormatId;
const seed = Number(seedS);
const sim = createSim({
  seed,
  format,
  content,
  sides: [sideConfig(content, baselinePlan(content), { level: 7, label: 'bot', isBot: true }), sideConfig(content, STRATEGIES[proxy as ProxyId].plan(content), { level: 7, label: 'p', isBot: false })],
});
const bot = createBot(botProfile(content, { generalId: 'echo', tier: Number(tierS) }), 0, seed, content) as unknown as { traces: Parameters<typeof traceLine>[0][] };
const match = new HeadlessMatch(sim, [
  { side: 0, controller: bot as never },
  { side: 1, controller: createProxy(proxy as ProxyId, content, 1, seed, format) },
]);
const every = Number(everyS) * 20;
let lastTrace = 0;
while (!match.ended) {
  match.step();
  const st = sim.state;
  if (st.tick % every === 0) {
    const s = st.sides;
    const u0 = st.units.filter((u) => u.side === 0);
    const u1 = st.units.filter((u) => u.side === 1);
    const pos = (us: typeof u0) => us.map((u) => Math.round(u.x / 1000)).sort((a, b) => a - b).join(',');
    console.log(
      `${(st.tick / 20).toFixed(0)}s ${st.phase} | A age${s[0].ageIndex} g${Math.round(s[0].gold / 1000)} hp${Math.round(s[0].baseHp*100/s[0].baseMaxHp)} tr${s[0].treasury} tur${s[0].turrets.filter(Boolean).length} ${s[0].stance} n${u0.length}[${pos(u0)}] | P age${s[1].ageIndex} g${Math.round(s[1].gold / 1000)} hp${Math.round(s[1].baseHp*100/s[1].baseMaxHp)} tur${s[1].turrets.filter(Boolean).length} n${u1.length}[${pos(u1)}]`,
    );
    const tr = bot.traces;
    const recent = tr.filter((t) => t.tick > lastTrace && t.action);
    for (const t of recent.slice(-6)) console.log('   ', traceLine(t), process.env.CAND ? t.candidates.slice(0,4).map((c) => `${c.action.kind}${'card' in c.action ? ':' + String(c.action.card) : ''}=${c.score}`).join(' ') : '');
    lastTrace = st.tick;
  }
}
console.log(JSON.stringify(sim.state.outcome));
