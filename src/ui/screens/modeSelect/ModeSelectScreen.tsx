/**
 * Mode select (A9 #3): Quick Battle, Ladder (format picker from Arena 1), Conquest (from Arena 3),
 * Skirmish (General or Echo, difficulty, format, speed, "Standard levels"; 5 Amber per win) and the
 * Daily Challenge (A9.1). Starting a mode asks the app for the opponent and shows VS.
 *
 * Owner feedback 2026-09-28: Quick Battle and Skirmish open after the training match and have a
 * difficulty picker (Easy II, Normal IV, Hard VI, Expert VIII, Legendary X), remembered in the save.
 * Quick Battle is a Short War Skirmish vs the General that fits the difficulty.
 */
import "./modeSelect.css";
import {
  ageNameKey,
  formatDescKey,
  formatNameKey,
  modifierDescKey,
  modifierNameKey,
} from "@/content/keys";
import type {
  Content,
  DailyDifficulty,
  Difficulty,
  GeneralId,
} from "@/content/types";
import type { AgeId, FormatId } from "@/contracts";
import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { GeneralPortrait } from "../../components/Avatar";
import { Button } from "../../components/Button";
import { AiBadge, Pill } from "../../components/Chips";
import { Segmented, Toggle } from "../../components/Controls";
import { formatInt, formatSigned, tierNumeral } from "../../components/format";
import {
  AmberIcon,
  CalendarIcon,
  CapsuleIcon,
  CastleIcon,
  LastBaseIcon,
  LockIcon,
  StarIcon,
  SundialIcon,
  QuickBattleIcon,
  SkirmishIcon,
  SwordsIcon,
  TrophyIcon,
} from "../../components/icons";
import { ScreenFrame } from "../../components/Layout";
import { Modal } from "../../components/Modal";
import type { MatchRequest, RouteOf } from "../../router";
import { useUi } from "../context";
import { ModeScene } from "./ModeScene";
import { agesAwaitingAntiArmor } from "../model/plan";
import { homeModeFlags, ladderFormat, quickGeneralFor, skirmishSetupFlags } from "../model/homeMode";
import {
  chargesView,
  conquestView,
  DAILY_DIFFICULTIES,
  defaultDailyDifficulty,
  DIFFICULTY_NAME_KEYS,
  difficultyFlags,
  ladderWin,
  lastDifficulty,
  unlocks,
} from "../model/progress";
import { useMatchStarter } from "../shared/MatchStarter";

const SPEEDS = [1, 1.5, 2] as const;
const DIFFICULTY_KEYS: Record<DailyDifficulty, string> = {
  recruit: "ui.mode.daily.recruit",
  veteran: "ui.mode.daily.veteran",
  warlord: "ui.mode.daily.warlord",
};
const ALL_FORMATS: FormatId[] = ["short", "standard", "full"];

/**
 * What a format plays (A18.3.4: formats are age windows): its first and last age and its length,
 * under the format picker ("Stone Age to Medieval Age. 3 ages, about 7 min.").
 */
function FormatNote(p: { content: Content; format: FormatId; t: (k: string, v?: Record<string, string | number>) => string; testid: string }) {
  const ages = p.content.formats[p.format]?.ages ?? [];
  const from = ages[0];
  const to = ages[ages.length - 1];
  if (!from || !to) return null;
  return (
    <p class="skirmish__note" data-testid={p.testid}>
      {p.t("ui.mode.formatWindow", { from: p.t(ageNameKey(from)), to: p.t(ageNameKey(to)), desc: p.t(formatDescKey(p.format)) })}
    </p>
  );
}

/** Short length labels, shared with Home's length picker (whole literals, so the strings check sees them). */
const LENGTH_LABEL: Readonly<Record<string, string>> = {
  short: "ui.hub.format.short",
  standard: "ui.hub.format.standard",
  full: "ui.hub.format.full",
  last: "ui.hub.format.last",
};

/** The Quick Battle opponent for a difficulty (the model lives in `model/homeMode`). */
export const quickGeneral = quickGeneralFor;

/** The five named difficulties, each with its AI tier (owner feedback 2026-09-28). */
export function DifficultyPicker(p: {
  value: Difficulty;
  onChange: (d: Difficulty) => void;
  testid: string;
}) {
  const { content, t } = useUi();
  const table = content.generals.difficulty;
  return (
    <div class="mode-card__diff">
      <Segmented
        label={t("ui.difficulty.label")}
        value={p.value}
        onChange={p.onChange}
        options={table.order.map((d) => ({
          value: d,
          label: t(DIFFICULTY_NAME_KEYS[d]),
          hint: t("ui.vs.tier", { tier: tierNumeral(table.tiers[d]) }),
        }))}
        testid={p.testid}
        size="sm"
      />
    </div>
  );
}

function ModeCard(p: {
  id: string;
  tone: "blue" | "red" | "green" | "gold";
  icon: ComponentChildren;
  title: string;
  desc: string;
  locked?: string | null;
  children?: ComponentChildren;
  action: ComponentChildren;
}) {
  return (
    <article
      class={`mode-card mode-card--${p.tone}${p.locked ? " is-locked" : ""}`}
      data-testid={`mode-${p.id}`}
      aria-labelledby={`mode-${p.id}-title`}
    >
      <header class="mode-card__head">
        <ModeScene id={p.id} />
        <span class="mode-card__art" aria-hidden="true">
          {p.icon}
        </span>
        <h2 class="mode-card__title" id={`mode-${p.id}-title`}>
          {p.title}
        </h2>
      </header>
      <div class="mode-card__body">
        <p class="mode-card__desc">{p.desc}</p>
        {p.children}
      </div>
      <footer class="mode-card__foot">
        {p.locked ? (
          <span class="mode-card__lock">
            <LockIcon size={22} />
            {p.locked}
          </span>
        ) : (
          p.action
        )}
      </footer>
    </article>
  );
}

function SkirmishSetup(p: {
  onStart: (req: MatchRequest) => void;
  onClose: () => void;
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
}) {
  const { content, save, t } = useUi();
  const s = save.value;
  const generals = content.generals.order.filter(
    (g) => !content.generals.list[g].scripted,
  );
  const [general, setGeneral] = useState<GeneralId>("pip");
  const tier = content.generals.difficulty.tiers[p.difficulty];
  const [format, setFormat] = useState<FormatId>("short");
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(s.settings.defaultSpeed);
  const [standard, setStandard] = useState(false);
  const shortAges: AgeId[] = agesAwaitingAntiArmor(s, content, format);
  const g = content.generals.list[general];
  return (
    <Modal
      title={t("ui.mode.skirmish.setup")}
      onClose={p.onClose}
      size="lg"
      testid="skirmish-setup"
      footer={
        <Button
          kind="primary"
          size="lg"
          testid="skirmish-start"
          icon={<SwordsIcon size={26} />}
          onClick={() =>
            p.onStart({
              mode: "skirmish",
              options: {
                generalId: general,
                tier,
                format,
                standardLevels: standard,
              },
              speed,
            })
          }
        >
          {t("ui.mode.start")}
        </Button>
      }
    >
      <div class="skirmish">
        <div
          class="skirmish__generals"
          role="radiogroup"
          aria-label={t("ui.mode.skirmish.general")}
        >
          {generals.map((id) => {
            const on = id === general;
            const def = content.generals.list[id];
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                class={`skirmish__gen${on ? " is-on" : ""}`}
                onClick={() => setGeneral(id)}
                data-testid={`skirmish-general-${id}`}
              >
                <span class="skirmish__portrait">
                  <GeneralPortrait generalId={id} size={56} />
                  <span class="skirmish__ai">
                    <AiBadge size="sm" />
                  </span>
                </span>
                <span class="skirmish__genname">{t(def.nameKey)}</span>
              </button>
            );
          })}
        </div>
        <div class="skirmish__opts">
          <div class="skirmish__who">
            <AiBadge general />
            <b>{t(g.nameKey)}</b>
            <span class="ui-muted">{t(g.personalityKey)}</span>
          </div>
          {g.mirror ? (
            <p class="skirmish__note">{t("ui.mode.skirmish.echo")}</p>
          ) : null}
          <div class="skirmish__row skirmish__row--diff">
            <span class="skirmish__label">{t("ui.difficulty.label")}</span>
            <DifficultyPicker
              value={p.difficulty}
              onChange={p.onDifficulty}
              testid="skirmish-difficulty"
            />
          </div>
          <p class="skirmish__note" data-testid="skirmish-tier">
            <AiBadge size="sm" />{" "}
            {t("ui.vs.tier", { tier: tierNumeral(tier) })} ·{" "}
            {t("ui.difficulty.picked")}
          </p>
          <div class="skirmish__row">
            <span class="skirmish__label">{t("ui.mode.format")}</span>
            <Segmented
              label={t("ui.mode.format")}
              value={format}
              onChange={setFormat}
              options={ALL_FORMATS.map((f) => ({
                value: f,
                label: t(formatNameKey(f)),
              }))}
              size="sm"
            />
          </div>
          <FormatNote content={content} format={format} t={t} testid="skirmish-format-note" />
          <div class="skirmish__row">
            <span class="skirmish__label">{t("ui.mode.speed")}</span>
            <Segmented
              label={t("ui.mode.speed")}
              value={speed}
              onChange={setSpeed}
              options={SPEEDS.map((v) => ({
                value: v,
                label: t("ui.speed.x", { n: v }),
              }))}
              size="sm"
            />
          </div>
          <Toggle
            label={t("ui.mode.skirmish.standardLevels")}
            hint={t("ui.mode.skirmish.standardLevelsHint", {
              n: content.arenas.ladder.standardLevel,
            })}
            checked={standard}
            onChange={setStandard}
            testid="skirmish-standard"
          />
          <p class="skirmish__reward">
            <AmberIcon size={18} />{" "}
            {t("ui.mode.skirmish.reward", {
              n: content.arenas.ladder.skirmishWinAmber,
            })}
          </p>
          {shortAges.map((a) => (
            <p
              key={a}
              class="skirmish__note"
              data-testid={`skirmish-note-${a}`}
            >
              {t("ui.mode.skirmish.threeUnits", { age: t(ageNameKey(a)) })}
            </p>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function ModeSelectScreen(p: { route: RouteOf<"modeSelect"> }) {
  const { save, content, t, locale, router, services, now } = useUi();
  const s = save.value;
  const u = unlocks(s, content);
  // The length Home's Battle plays: the remembered one, else the shortest timed length (every length is
  // open from Arena 1, so a new player must not land on the Long War here). Last Base Standing (A2.10.1)
  // is only ever picked on purpose.
  const [format, setFormat] = useState<FormatId>(() => ladderFormat(s, content));
  const [skirmish, setSkirmish] = useState(
    p.route.focus === "skirmish" && u.skirmish,
  );
  const charges = chargesView(s, content, now());
  const conquest = conquestView(s, content);
  const modifier = services.dailyModifier();
  const challenge = content.dailyModifiers.challenge;
  const wonToday = s.daily.bank <= 0;
  const [difficulty, setDifficulty] = useState<DailyDifficulty>(() =>
    defaultDailyDifficulty(s, content),
  );
  const win = ladderWin(s, content, format);
  // Quick Battle and Skirmish share the last picked difficulty (Normal for a new player).
  const [pick, setPick] = useState<Difficulty>(() =>
    lastDifficulty(s, content),
  );
  const pickDifficulty = (d: Difficulty) => {
    setPick(d);
    services.setUiFlags(difficultyFlags(d, content));
  };
  const quickGen = quickGeneral(content, pick);
  const quickTier = content.generals.difficulty.tiers[pick];

  const starter = useMatchStarter();

  function start(req: MatchRequest) {
    setSkirmish(false);
    // Skirmish setup's Play also selects Skirmish on Home's switcher with these settings (A9 #3).
    if (req.mode === "skirmish" && skirmish)
      services.setUiFlags({ ...skirmishSetupFlags(s, req.options), ...homeModeFlags("skirmish") });
    starter.start(req);
  }

  return (
    <ScreenFrame
      id="modeSelect"
      title={t("ui.mode.title")}
      onBack={() => router.back()}
    >
      <div class="modes">
        <ModeCard
          id="quick"
          tone="green"
          icon={<QuickBattleIcon size={64} />}
          title={t("ui.mode.quick.title")}
          desc={t("ui.mode.quick.desc")}
          locked={
            u.skirmish
              ? null
              : t("ui.lock.afterTraining")
          }
          action={
            <Button
              kind="primary" primary={false}
              size="lg"
              wide
              testid="quick-start"
              icon={<SwordsIcon size={26} />}
              onClick={() =>
                start({
                  mode: "skirmish",
                  options: {
                    generalId: quickGen,
                    tier: quickTier,
                    format: "short",
                    standardLevels: false,
                  },
                  speed: s.settings.defaultSpeed,
                })
              }
            >
              {t("ui.home.battle")}
            </Button>
          }
        >
          <DifficultyPicker
            value={pick}
            onChange={pickDifficulty}
            testid="quick-difficulty"
          />
          <p class="mode-card__meta" data-testid="quick-opponent">
            <AiBadge size="sm" />
            <b>{t(content.generals.list[quickGen].nameKey)}</b>
            <span>{t("ui.vs.tier", { tier: tierNumeral(quickTier) })}</span>
          </p>
          <p class="mode-card__help">
            {t("ui.mode.quick.help", {
              n: content.arenas.ladder.skirmishWinAmber,
            })}
          </p>
        </ModeCard>

        <ModeCard
          id="ladder"
          tone="blue"
          icon={<TrophyIcon size={64} />}
          title={t("ui.mode.ladder.title")}
          desc={t("ui.mode.ladder.desc")}
          action={
            <Button
              kind="primary" primary={false}
              size="lg"
              wide
              testid="ladder-start"
              autofocus
              icon={<SwordsIcon size={26} />}
              onClick={() => start({ mode: "ladder", format })}
            >
              {t("ui.home.battle")}
            </Button>
          }
        >
          {u.formatPicker ? (
            <Segmented
              label={t("ui.mode.format")}
              value={format}
              onChange={setFormat}
              options={u.ladderFormats.map((f) => ({
                value: f,
                // The short length names of Home's picker (A2.10); the note under it names the war.
                label: LENGTH_LABEL[f] ? t(LENGTH_LABEL[f]) : t(formatNameKey(f)),
                ...(f === "last" ? { icon: <LastBaseIcon size={18} /> } : {}),
              }))}
              testid="ladder-format"
              size="sm"
            />
          ) : (
            <Pill tone="blue">{t(formatNameKey(format))}</Pill>
          )}
          <FormatNote content={content} format={format} t={t} testid="ladder-format-note" />
          <p class="mode-card__reward" data-testid="ladder-reward" key={format}>
            <span class="mode-card__rewardLabel">
              {t("ui.mode.ladder.winPays")}
            </span>
            <span class="mode-card__rewardItem">
              <TrophyIcon size={18} /> {formatSigned(win.trophies, locale)}
            </span>
            <span class="mode-card__rewardItem">
              <AmberIcon size={18} /> {formatSigned(win.amber, locale)}
            </span>
          </p>
          <p class="mode-card__meta" data-testid="ladder-sundial">
            <SundialIcon size={22} dim={charges.free === 0 && charges.charges === 0} />
            {charges.free > 0
              ? t("ui.home.freeCapsules", { n: charges.free })
              : t("ui.home.charges", { n: charges.charges, max: charges.max })}
          </p>
          <p class="mode-card__help">{t("ui.mode.ladder.help")}</p>
        </ModeCard>

        <ModeCard
          id="conquest"
          tone="red"
          icon={<CastleIcon size={64} />}
          title={t("ui.mode.conquest.title")}
          desc={t("ui.mode.conquest.desc")}
          locked={
            u.conquest ? null : t("ui.lock.arena", { n: u.conquestArena })
          }
          action={
            <Button
              kind="secondary"
              size="lg"
              wide
              testid="conquest-open"
              onClick={() => router.go({ id: "conquest" })}
            >
              {t("ui.mode.conquest.open")}
            </Button>
          }
        >
          <p class="mode-card__meta">
            <StarIcon size={20} />
            {t("ui.conquest.starsOf", {
              n: conquest.totalStars,
              max: conquest.maxStars,
            })}
          </p>
          <p class="mode-card__help">{t("ui.mode.conquest.rules")}</p>
        </ModeCard>

        <ModeCard
          id="skirmish"
          tone="green"
          icon={<SkirmishIcon size={64} />}
          title={t("ui.mode.skirmish.title")}
          desc={t("ui.mode.skirmish.desc")}
          locked={
            u.skirmish
              ? null
              : t("ui.lock.afterTraining")
          }
          action={
            <Button
              kind="secondary"
              size="lg"
              wide
              testid="skirmish-open"
              onClick={() => setSkirmish(true)}
            >
              {t("ui.mode.skirmish.setup")}
            </Button>
          }
        >
          <p class="mode-card__meta">
            <AmberIcon size={20} />
            {t("ui.mode.skirmish.reward", {
              n: content.arenas.ladder.skirmishWinAmber,
            })}
          </p>
          <p class="mode-card__help">{t("ui.mode.skirmish.help")}</p>
        </ModeCard>

        <ModeCard
          id="daily"
          tone="gold"
          icon={<CalendarIcon size={64} />}
          title={t("ui.mode.daily.title")}
          desc={t("ui.mode.daily.desc", {
            format: t(formatNameKey(challenge.format)),
          })}
          action={
            <Button
              kind="primary" primary={false}
              size="lg"
              wide
              testid="daily-start"
              onClick={() => start({ mode: "daily", difficulty })}
            >
              {t("ui.mode.play")}
            </Button>
          }
        >
          <div class="mode-card__diff">
            <Segmented
              label={t("ui.mode.daily.difficulty")}
              value={difficulty}
              onChange={setDifficulty}
              options={DAILY_DIFFICULTIES.map((d) => ({
                value: d,
                label: t(DIFFICULTY_KEYS[d]),
                hint: t("ui.vs.tier", {
                  tier: tierNumeral(challenge.difficulties[d]),
                }),
              }))}
              testid="daily-difficulty"
              size="sm"
            />
          </div>
          {modifier ? (
            <div class="mode-card__mod" data-testid="daily-modifier">
              <b>{t(modifierNameKey(modifier))}</b>
              <span>{t(modifierDescKey(modifier))}</span>
            </div>
          ) : null}
          <p class="mode-card__meta">
            {wonToday ? (
              <AmberIcon size={20} />
            ) : (
              <CapsuleIcon tier="silver" size={22} />
            )}
            {wonToday
              ? t("ui.mode.daily.wonToday", {
                  n: formatInt(challenge.winAmber, locale),
                })
              : t("ui.mode.daily.bankReady", {
                  n: formatInt(s.daily.bank, locale),
                })}
          </p>
          <p class="mode-card__help">{t("ui.mode.daily.rules")}</p>
        </ModeCard>
      </div>
      {skirmish ? (
        <SkirmishSetup
          onStart={start}
          onClose={() => setSkirmish(false)}
          difficulty={pick}
          onDifficulty={pickDifficulty}
        />
      ) : null}
      {starter.dialog}
    </ScreenFrame>
  );
}
