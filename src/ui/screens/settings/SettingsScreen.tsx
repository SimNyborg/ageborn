/**
 * Settings (A9 #15): Master / Music / SFX / UI volume; graphics preset; reduce motion; shake;
 * hitstop; damage numbers; colourblind preset; language (EN in v1, DA in v1.1); default speed; save
 * export (code and file), import and reset; the odds overview; About (with "All opponents in this
 * version are AI.", A7.1); credits; event log export (A8). A gentle backup reminder shows when the
 * last export is more than 5 days old (B8). Changes apply at once.
 */
import './settings.css';
import type { Bus, Settings } from '@/contracts';
import { useState } from 'preact/hooks';
import { Button } from '../../components/Button';
import { Segmented, Slider, Toggle } from '../../components/Controls';
import { formatInt } from '../../components/format';
import { CopyIcon, DownloadIcon, InfoIcon, RobotIcon, ScrollIcon, SpeakerIcon, TrashIcon, UploadIcon } from '../../components/icons';
import { Panel, ScreenFrame } from '../../components/Layout';
import { Modal } from '../../components/Modal';
import { OddsSheet } from '../../components/OddsSheet';
import { oddsModel } from '../../components/oddsModel';
import type { RouteOf } from '../../router';
import { useUi } from '../context';
import { arenaOf } from '../model/progress';

const BUSES: { bus: Bus; key: string }[] = [
  { bus: 'master', key: 'ui.settings.volume.master' },
  { bus: 'music', key: 'ui.settings.volume.music' },
  { bus: 'sfx', key: 'ui.settings.volume.sfx' },
  { bus: 'ui', key: 'ui.settings.volume.ui' },
];

/** B8: remind to back up when the last export is older than this. */
export const BACKUP_REMINDER_MS = 5 * 24 * 3600 * 1000;

export function needsBackup(lastExportAt: number | null, createdAt: number, now: number): boolean {
  return now - (lastExportAt ?? createdAt) > BACKUP_REMINDER_MS;
}

type Dialog = null | 'export' | 'import' | 'reset1' | 'reset2' | 'odds' | 'credits';

export function SettingsScreen(_p: { route: RouteOf<'settings'> }) {
  const { save, content, t, locale, router, services, toasts, now } = useUi();
  const s = save.value;
  const st = s.settings;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [code, setCode] = useState('');
  const [importText, setImportText] = useState('');
  const set = (patch: Partial<Settings>) => services.updateSettings(patch);
  const openExport = () => {
    setCode(services.exportCode());
    setDialog('export');
  };

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      toasts.show(t('ui.settings.copied'), { tone: 'good' });
    } catch {
      toasts.show(t('ui.settings.copyFailed'), { tone: 'bad' });
    }
  }

  return (
    <ScreenFrame id="settings" title={t('ui.nav.settings')} onBack={() => router.back()}>
      <div class="set">
        {needsBackup(s.lastExportAt, s.createdAt, now()) ? (
          <div class="set-backup" role="note" data-testid="backup-reminder">
            <DownloadIcon size={26} />
            <span class="ui-grow">{t('ui.settings.backupReminder')}</span>
            <Button variant="gold" size="sm" onClick={openExport} testid="backup-now">
              {t('ui.settings.backupNow')}
            </Button>
          </div>
        ) : null}
        <div class="set-grid">
          <Panel title={t('ui.settings.audio')} icon={<SpeakerIcon size={24} />} testid="set-audio" labelledBy="set-audio-t">
            {BUSES.map((b) => (
              <Slider
                key={b.bus}
                label={t(b.key)}
                value={Math.round(st.volume[b.bus] * 100)}
                min={0}
                max={100}
                step={5}
                format={(v) => t('ui.profile.percent', { n: v })}
                onChange={(v) => set({ volume: { ...st.volume, [b.bus]: v / 100 } })}
                testid={`vol-${b.bus}`}
              />
            ))}
          </Panel>

          <Panel title={t('ui.settings.graphics')} icon={<InfoIcon size={24} />} testid="set-graphics" labelledBy="set-graphics-t">
            <div class="set-row">
              <span>{t('ui.settings.preset')}</span>
              <Segmented
                label={t('ui.settings.preset')}
                value={st.graphics}
                onChange={(graphics) => set({ graphics })}
                size="sm"
                testid="set-preset"
                options={[
                  { value: 'auto', label: t('ui.settings.presetAuto') },
                  { value: 'high', label: t('ui.settings.presetHigh') },
                  { value: 'lite', label: t('ui.settings.presetLite') },
                ]}
              />
            </div>
            <Toggle
              label={t('ui.settings.reduceMotion')}
              hint={t('ui.settings.reduceMotionHint')}
              checked={st.reduceMotion}
              onChange={(reduceMotion) => set({ reduceMotion })}
              testid="set-reduce-motion"
            />
            <Slider
              label={t('ui.settings.shake')}
              value={Math.round(st.shake * 100)}
              min={0}
              max={100}
              step={10}
              format={(v) => t('ui.profile.percent', { n: v })}
              onChange={(v) => set({ shake: v / 100 })}
              testid="set-shake"
            />
            <Toggle label={t('ui.settings.hitstop')} checked={st.hitstop} onChange={(hitstop) => set({ hitstop })} testid="set-hitstop" />
            <div class="set-row">
              <span>{t('ui.settings.damageNumbers')}</span>
              <Segmented
                label={t('ui.settings.damageNumbers')}
                value={st.damageNumbers}
                onChange={(damageNumbers) => set({ damageNumbers })}
                size="sm"
                testid="set-numbers"
                options={[
                  { value: 'off', label: t('ui.settings.numbersOff') },
                  { value: 'important', label: t('ui.settings.numbersImportant') },
                  { value: 'all', label: t('ui.settings.numbersAll') },
                ]}
              />
            </div>
            <div class="set-row">
              <span>{t('ui.settings.colourblind')}</span>
              <Segmented
                label={t('ui.settings.colourblind')}
                value={st.teamPreset}
                onChange={(teamPreset) => set({ teamPreset })}
                size="sm"
                testid="set-team"
                options={[
                  { value: 'default', label: t('ui.settings.teamDefault') },
                  { value: 'blueYellow', label: t('ui.settings.teamBlueYellow') },
                  { value: 'highContrast', label: t('ui.settings.teamHighContrast') },
                ]}
              />
            </div>
            <div class="set-swatches" aria-hidden="true">
              <i style={{ background: 'var(--ui-team-me)' }} />
              <i style={{ background: 'var(--ui-team-foe)' }} />
            </div>
          </Panel>

          <Panel title={t('ui.settings.gameplay')} icon={<ScrollIcon size={24} />} testid="set-gameplay" labelledBy="set-gameplay-t">
            <div class="set-row">
              <span>{t('ui.settings.defaultSpeed')}</span>
              <Segmented
                label={t('ui.settings.defaultSpeed')}
                value={st.defaultSpeed}
                onChange={(defaultSpeed) => set({ defaultSpeed })}
                size="sm"
                testid="set-speed"
                options={([1, 1.5, 2] as const).map((v) => ({ value: v, label: t('ui.speed.x', { n: v }) }))}
              />
            </div>
            <Toggle label={t('ui.settings.vibrate')} checked={st.vibrate} onChange={(vibrate) => set({ vibrate })} testid="set-vibrate" />
            <Toggle
              label={t('ui.settings.muteEmotes')}
              checked={st.mutedEmotes}
              onChange={(mutedEmotes) => set({ mutedEmotes })}
              testid="set-mute-emotes"
            />
            <div class="set-row">
              <span>{t('ui.settings.language')}</span>
              <Segmented
                label={t('ui.settings.language')}
                value={st.locale}
                onChange={(l) => set({ locale: l })}
                size="sm"
                testid="set-language"
                options={[
                  { value: 'en', label: t('ui.settings.langEn') },
                  { value: 'da', label: t('ui.settings.langDa'), disabled: true, hint: t('ui.settings.langSoon') },
                ]}
              />
            </div>
            <p class="set-note">{t('ui.settings.langSoon')}</p>
          </Panel>

          <Panel title={t('ui.settings.save')} icon={<DownloadIcon size={24} />} testid="set-save" labelledBy="set-save-t">
            <p class="set-note">{t('ui.settings.saveLocal')}</p>
            <div class="set-buttons">
              <Button variant="blue" size="sm" icon={<CopyIcon size={20} />} testid="export-code" onClick={openExport}>
                {t('ui.settings.exportCode')}
              </Button>
              <Button
                variant="blue"
                size="sm"
                icon={<DownloadIcon size={20} />}
                testid="export-file"
                onClick={() => services.downloadSave()}
              >
                {t('ui.settings.exportFile')}
              </Button>
              <Button variant="green" size="sm" icon={<UploadIcon size={20} />} testid="import" onClick={() => setDialog('import')}>
                {t('ui.settings.import')}
              </Button>
              <Button variant="red" size="sm" icon={<TrashIcon size={20} />} testid="reset" onClick={() => setDialog('reset1')}>
                {t('ui.settings.reset')}
              </Button>
            </div>
            <div class="set-buttons">
              <Button variant="plain" size="sm" testid="export-log" onClick={() => services.exportEventLog()}>
                {t('ui.settings.exportLog')}
              </Button>
            </div>
          </Panel>

          <Panel title={t('ui.settings.about')} icon={<RobotIcon size={24} />} testid="set-about" labelledBy="set-about-t">
            <ul class="set-about">
              <li data-testid="about-ai">{t('ui.ai.allAi')}</li>
              <li>{t('ui.ai.adapts')}</li>
              <li>{t('ui.settings.noMoney')}</li>
              <li>{t('ui.settings.offline')}</li>
            </ul>
            <div class="set-buttons">
              <Button variant="gold" size="sm" icon={<InfoIcon size={20} />} testid="odds-overview" onClick={() => setDialog('odds')}>
                {t('ui.settings.odds')}
              </Button>
              <Button variant="plain" size="sm" testid="credits" onClick={() => setDialog('credits')}>
                {t('ui.settings.credits')}
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      {dialog === 'export' ? (
        <Modal
          title={t('ui.settings.exportCode')}
          onClose={() => setDialog(null)}
          testid="export-modal"
          footer={
            <Button variant="blue" icon={<CopyIcon size={20} />} onClick={copy} testid="copy-code">
              {t('ui.settings.copy')}
            </Button>
          }
        >
          <p class="set-note">{t('ui.settings.exportHelp')}</p>
          <textarea class="ui-textarea" readOnly value={code} data-testid="export-text" aria-label={t('ui.settings.exportCode')} />
          <p class="set-note">{t('ui.settings.codeLength', { n: formatInt(code.length, locale) })}</p>
        </Modal>
      ) : null}
      {dialog === 'import' ? (
        <Modal
          title={t('ui.settings.import')}
          onClose={() => setDialog(null)}
          testid="import-modal"
          footer={
            <Button
              variant="green"
              icon={<UploadIcon size={20} />}
              disabled={importText.trim().length === 0}
              testid="import-go"
              onClick={() => {
                const r = services.importCode(importText);
                if (r.ok) {
                  toasts.show(t('ui.settings.imported'), { tone: 'good' });
                  setDialog(null);
                  setImportText('');
                } else {
                  toasts.show(t('ui.settings.importFailed'), { tone: 'bad' });
                }
              }}
            >
              {t('ui.settings.import')}
            </Button>
          }
        >
          <p class="set-note">{t('ui.settings.importHelp')}</p>
          <textarea
            class="ui-textarea"
            value={importText}
            data-autofocus=""
            aria-label={t('ui.settings.import')}
            data-testid="import-text"
            onInput={(e) => setImportText((e.currentTarget as HTMLTextAreaElement).value)}
          />
        </Modal>
      ) : null}
      {dialog === 'reset1' ? (
        <Modal
          title={t('ui.settings.resetTitle')}
          tone="danger"
          size="sm"
          onClose={() => setDialog(null)}
          testid="reset-1"
          footer={
            <>
              <Button variant="plain" autofocus onClick={() => setDialog(null)}>
                {t('ui.common.cancel')}
              </Button>
              <Button variant="red" testid="reset-next" onClick={() => setDialog('reset2')}>
                {t('ui.settings.reset')}
              </Button>
            </>
          }
        >
          <p>{t('ui.settings.resetBody')}</p>
        </Modal>
      ) : null}
      {dialog === 'reset2' ? (
        <Modal
          title={t('ui.settings.resetSure')}
          tone="danger"
          size="sm"
          onClose={() => setDialog(null)}
          testid="reset-2"
          footer={
            <>
              <Button variant="plain" autofocus onClick={() => setDialog(null)}>
                {t('ui.common.cancel')}
              </Button>
              <Button
                variant="red"
                testid="reset-yes"
                onClick={() => {
                  setDialog(null);
                  services.resetSave();
                }}
              >
                {t('ui.settings.resetYes')}
              </Button>
            </>
          }
        >
          <p>{t('ui.settings.resetBody2')}</p>
        </Modal>
      ) : null}
      {dialog === 'odds' ? (
        <Modal title={t('ui.odds.title')} size="lg" onClose={() => setDialog(null)} testid="odds-modal" icon={<InfoIcon size={28} />}>
          <OddsSheet model={oddsModel(content.capsules, content.rarities, s, arenaOf(s, content).randomLegendaries)} />
        </Modal>
      ) : null}
      {dialog === 'credits' ? (
        <Modal title={t('ui.settings.credits')} size="sm" onClose={() => setDialog(null)} testid="credits-modal">
          <ul class="set-about">
            <li>{t('ui.settings.creditsGame')}</li>
            <li>{t('ui.settings.creditsSound')}</li>
            <li>{t('ui.settings.creditsTech')}</li>
          </ul>
        </Modal>
      ) : null}
    </ScreenFrame>
  );
}
