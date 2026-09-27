/**
 * The turret mount popover (DESIGN A9.2, A2.8, A2.12). Mounts are tapped on the base in the canvas;
 * the view reports the tap and this small DOM popover offers the choices:
 *
 * - an empty mount: the two loadout turrets with their prices (tap to build),
 * - an occupied, outdated turret: the Modernise cards (new price minus 50% of the old),
 * - an occupied turret: Sell, which asks for a confirming second tap (refund shown),
 * - a turret that is building or selling: a short "busy" note.
 *
 * It closes after an action, on a press anywhere outside it (a press on another mount then reopens it
 * there), on Escape, and when the match ends. It never blocks the canvas.
 */
import type { CardId } from '@/contracts';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { HudCtx } from './context';
import { CoinIcon } from './icons';
import { buildIntent, mountMenu, moderniseIntent, sellIntent, type TurretOption } from './model';
import { usePortrait } from './usePortrait';

export interface MountPopoverState {
  mount: number;
  /** Anchor in CSS px relative to the HUD root (the canvas box). */
  x: number;
  y: number;
}

function Option(p: { c: HudCtx; o: TurretOption; onPick: () => void; testid: string }) {
  const { c, o } = p;
  const url = usePortrait(c.portrait, o.card, 'none', 48);
  const def = c.config.content.turrets[o.card];
  return (
    <button class={`hud-pop-option${o.affordable ? '' : ' is-poor'}`} data-testid={p.testid} onClick={p.onPick}>
      <span class="hud-pop-pic">{url ? <img src={url} alt="" draggable={false} /> : null}</span>
      <span class="hud-pop-name">{def ? c.t(def.nameKey) : o.card}</span>
      <span class="hud-pop-cost">
        <CoinIcon size={13} />
        {o.cost}
      </span>
    </button>
  );
}

function turretName(c: HudCtx, card: CardId | null): string {
  const def = card ? c.config.content.turrets[card] : undefined;
  return def ? c.t(def.nameKey) : '';
}

export function MountPopover(p: { c: HudCtx; at: MountPopoverState; onClose: () => void }) {
  const { c, at } = p;
  const { m, t } = c;
  const [confirmSell, setConfirmSell] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setConfirmSell(false), [at.mount]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') p.onClose();
    };
    const onDown = (e: PointerEvent): void => {
      if (box.current && e.target instanceof Node && box.current.contains(e.target)) return;
      p.onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown, true);
    };
  }, [p.onClose]);

  const menu = mountMenu(m, c.config, c.side, at.mount);
  const done = (): void => p.onClose();
  // The mount sits on the player's base at the screen edge; open the popover toward the lane.
  const toLeft = c.side === 1;
  const style = {
    left: `${at.x}px`,
    top: `${at.y}px`,
  };

  let body;
  if (menu.status === 'locked') {
    body = <div class="hud-pop-note">{t('hud.mount.locked')}</div>;
  } else if (menu.status === 'empty') {
    body = (
      <>
        <div class="hud-pop-title">{t('hud.mount.build')}</div>
        {menu.build.length === 0 ? <div class="hud-pop-note">{t('hud.mount.noTurrets')}</div> : null}
        {menu.build.map((o) => (
          <Option
            key={o.slot}
            c={c}
            o={o}
            testid={`hud-pop-build-${o.slot}`}
            onPick={() => {
              c.act(buildIntent(m, c.side, at.mount, o));
              if (o.affordable) done();
            }}
          />
        ))}
      </>
    );
  } else if (menu.status === 'busy') {
    body = (
      <>
        <div class="hud-pop-title">{turretName(c, menu.card)}</div>
        <div class="hud-pop-note">{t('hud.mount.busy')}</div>
      </>
    );
  } else {
    body = (
      <>
        <div class="hud-pop-title">{turretName(c, menu.card)}</div>
        {menu.outdated && menu.modernise.length > 0 ? <div class="hud-pop-sub">{t('hud.mount.modernise')}</div> : null}
        {menu.modernise.map((o) => (
          <Option
            key={o.slot}
            c={c}
            o={o}
            testid={`hud-pop-modernise-${o.slot}`}
            onPick={() => {
              c.act(moderniseIntent(m, c.side, at.mount, o));
              if (o.affordable) done();
            }}
          />
        ))}
        {menu.sellRefund !== null ? (
          <button
            class={`hud-pop-sell${confirmSell ? ' is-confirm' : ''}`}
            data-testid="hud-pop-sell"
            onClick={() => {
              if (!confirmSell) {
                c.audio?.play('ui_click');
                setConfirmSell(true);
                return;
              }
              c.act(sellIntent(m, c.side, at.mount));
              done();
            }}
          >
            {confirmSell ? t('hud.mount.sellConfirm', { n: menu.sellRefund }) : t('hud.mount.sell', { n: menu.sellRefund })}
          </button>
        ) : null}
      </>
    );
  }

  return (
    <div
      ref={box}
      class={`hud-pop${toLeft ? ' to-left' : ''}`}
      role="dialog"
      aria-label={t('hud.mount.title', { n: at.mount + 1 })}
      data-testid="hud-mount-popover"
      data-mount={at.mount}
      style={style}
    >
      {body}
    </div>
  );
}
