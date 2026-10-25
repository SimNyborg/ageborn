# Track C → Home's owner (or the round-3 final): Home's base should wear the troop-system base skin (round 3, 2026-10-25)

Status: **open** (not in Track C's paths; small).

## What is wrong

Home's island draws your base with `eq.baseSkins[age]` only (`src/ui/screens/home/HomeScreen.tsx`, about line 186:
`const skin = eq?.baseSkins?.[age] ?? null; const mySkin = skin && owns(s, content, skin) ? skin : null;`). The
troop-system base skin (Crystal Spire, `save.skins.equipped['base.future']`, the Arena 8 gate reward) is not read, so
a player flying Crystal Spire sees the standard Future base on Home, while the battle (`render/battleView.ts
baseSkinsOf`: the troop skin wins), Customize (`shownBaseKey`) and, since round 3, VS show Crystal Spire. Crystal
Spire is one of the two Legendary models whose aura the base pictures now draw (round 3, item 3), so Home is the one
surface that misses it.

## The fix (a few lines)

Resolve the age's skin as the battle does, the troop skin first:

```ts
const troop = s.skins.equipped[`base.${age}`];
const cos = eq?.baseSkins?.[age] ?? null;
const mySkin = troop && s.skins.owned.includes(troop) ? `baseSkin.${troop}` : cos && owns(s, content, cos) ? cos : null;
```

`SkinnedBase` (`BaseLook`) already takes `baseSkin.<troop skin id>` keys (Customize passes Crystal Spire that way), and
the aura then shows on Home too. Check: Home with the test profile, Crystal Spire equipped on Future, a Skirmish whose
window reaches Future (`full`), the island's left base is Crystal Spire in its aura.
