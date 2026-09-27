/**
 * Phase 0 stub entry (WP0). Mounts a Preact shell over a PixiJS 8 canvas showing the Ageborn
 * title and a lane. With `?dev=1` it shows the dev page list instead (src/dev/router.tsx).
 * WP11 replaces this file with the real boot sequence (DESIGN B11).
 */
import { Application, Graphics } from 'pixi.js';
import { render } from 'preact';
import { DevRouter, isDevMode } from '@/dev/router';

/** The game's name is a brand, not translatable UI copy. */
const GAME_NAME = 'Ageborn';

function drawLane(app: Application, g: Graphics): void {
  const w = app.screen.width;
  const h = app.screen.height;
  const groundY = Math.round(h * 0.68);
  const baseW = Math.max(32, Math.round(w * 0.06));
  g.clear();
  g.rect(0, 0, w, groundY).fill(0x2b2946);
  g.rect(0, groundY, w, h - groundY).fill(0x5b4430);
  g.rect(0, groundY - 6, w, 6).fill(0x7a5c3a);
  g.rect(16, groundY - baseW * 1.6, baseW, baseW * 1.6).fill(0x4f8fd6);
  g.rect(w - 16 - baseW, groundY - baseW * 1.6, baseW, baseW * 1.6).fill(0xd65a4f);
}

async function startCanvas(host: HTMLElement): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const app = new Application();
  await app.init({
    resizeTo: window,
    preference: params.get('gpu') === 'webgpu' ? 'webgpu' : 'webgl',
    background: 0x1b1a2e,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  app.canvas.setAttribute('data-testid', 'game-canvas');
  host.appendChild(app.canvas);
  const lane = new Graphics();
  app.stage.addChild(lane);
  drawLane(app, lane);
  app.renderer.on('resize', () => drawLane(app, lane));
}

function Shell() {
  return (
    <div
      data-testid="shell"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '12vh',
        pointerEvents: 'none',
      }}
    >
      <h1 style={{ margin: 0, fontSize: 'clamp(40px, 9vw, 96px)', letterSpacing: '0.04em', textShadow: '0 4px 0 #0008' }}>
        {GAME_NAME}
      </h1>
    </div>
  );
}

const root = document.getElementById('app');
if (!root) throw new Error('#app element missing');

if (isDevMode()) {
  render(<DevRouter />, root);
} else {
  const canvasHost = document.createElement('div');
  canvasHost.style.cssText = 'position:absolute;inset:0';
  const uiHost = document.createElement('div');
  uiHost.style.cssText = 'position:absolute;inset:0';
  root.append(canvasHost, uiHost);
  render(<Shell />, uiHost);
  void startCanvas(canvasHost);
}
