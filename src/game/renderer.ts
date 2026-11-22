import {
  BurstParticle,
  ChameleonVisualState,
  ClickRipple,
  DustParticle,
  FloatingText,
  Fly,
  PowerUp,
  ShockwaveRing,
  TongueState,
} from './types';

interface ChameleonPalette {
  bodyMain: string;
  bodyHighlight: string;
  bodyAccent: string;
  tailBase: string;
  tailBands: string;
  belly: string;
  crest: string;
  legDark: string;
  legLight: string;
  jaw: string;
  cheek: string;
  eyeOuterLeft: string;
  eyeOuterRight: string;
  eyeInnerLeft: string;
  eyeInnerRight: string;
  outlineDark: string;
}

const CHAMELEON_PALETTES: ChameleonPalette[] = [
  // 0: Emerald Tropics
  {
    bodyMain: '#22c55e',
    bodyHighlight: '#84cc16',
    bodyAccent: '#0d9488',
    tailBase: '#0f766e',
    tailBands: '#facc15',
    belly: '#fde047',
    crest: '#f59e0b',
    legDark: '#15803d',
    legLight: '#a3e635',
    jaw: '#65a30d',
    cheek: '#14b8a6',
    eyeOuterLeft: '#10b981',
    eyeOuterRight: '#22c55e',
    eyeInnerLeft: '#facc15',
    eyeInnerRight: '#fde047',
    outlineDark: '#14532d',
  },
  // 1: Turquoise Reef
  {
    bodyMain: '#06b6d4',
    bodyHighlight: '#2dd4bf',
    bodyAccent: '#0284c7',
    tailBase: '#0369a1',
    tailBands: '#fef08a',
    belly: '#a5f3fc',
    crest: '#fb7185',
    legDark: '#0e7490',
    legLight: '#5eead4',
    jaw: '#0d9488',
    cheek: '#38bdf8',
    eyeOuterLeft: '#0ea5e9',
    eyeOuterRight: '#06b6d4',
    eyeInnerLeft: '#fda4af',
    eyeInnerRight: '#fef08a',
    outlineDark: '#083344',
  },
  // 2: Sunset Coral
  {
    bodyMain: '#f97316',
    bodyHighlight: '#fb923c',
    bodyAccent: '#e11d48',
    tailBase: '#be123c',
    tailBands: '#fde047',
    belly: '#fef08a',
    crest: '#2dd4bf',
    legDark: '#c2410c',
    legLight: '#fdba74',
    jaw: '#ea580c',
    cheek: '#f43f5e',
    eyeOuterLeft: '#f43f5e',
    eyeOuterRight: '#f97316',
    eyeInnerLeft: '#5eead4',
    eyeInnerRight: '#fde047',
    outlineDark: '#431407',
  },
  // 3: Orchid Berry
  {
    bodyMain: '#a855f7',
    bodyHighlight: '#ec4899',
    bodyAccent: '#6366f1',
    tailBase: '#4f46e5',
    tailBands: '#fef08a',
    belly: '#fbcfe8',
    crest: '#a3e635',
    legDark: '#7e22ce',
    legLight: '#f472b6',
    jaw: '#9333ea',
    cheek: '#e879f9',
    eyeOuterLeft: '#8b5cf6',
    eyeOuterRight: '#a855f7',
    eyeInnerLeft: '#bef264',
    eyeInnerRight: '#fef08a',
    outlineDark: '#3b0764',
  },
  // 4: Sunburst Gold
  {
    bodyMain: '#f59e0b',
    bodyHighlight: '#facc15',
    bodyAccent: '#84cc16',
    tailBase: '#65a30d',
    tailBands: '#fef9c3',
    belly: '#fef9c3',
    crest: '#14b8a6',
    legDark: '#b45309',
    legLight: '#fde047',
    jaw: '#d97706',
    cheek: '#fbbf24',
    eyeOuterLeft: '#eab308',
    eyeOuterRight: '#f59e0b',
    eyeInnerLeft: '#5eead4',
    eyeInnerRight: '#fef9c3',
    outlineDark: '#451a03',
  },
  // 5: Electric Cobalt
  {
    bodyMain: '#3b82f6',
    bodyHighlight: '#38bdf8',
    bodyAccent: '#4f46e5',
    tailBase: '#3730a3',
    tailBands: '#6ee7b7',
    belly: '#bae6fd',
    crest: '#fbbf24',
    legDark: '#1d4ed8',
    legLight: '#7dd3fc',
    jaw: '#2563eb',
    cheek: '#818cf8',
    eyeOuterLeft: '#6366f1',
    eyeOuterRight: '#3b82f6',
    eyeInnerLeft: '#fde047',
    eyeInnerRight: '#6ee7b7',
    outlineDark: '#172554',
  },
];

function lerpHexColor(hexA: string, hexB: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0) return hexA;
  if (clamped >= 1) return hexB;

  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);

  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;

  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;

  const r = Math.round(ar + (br - ar) * clamped);
  const g = Math.round(ag + (bg - ag) * clamped);
  const bl = Math.round(ab + (bb - ab) * clamped);

  return `rgb(${r}, ${g}, ${bl})`;
}

interface RenderSceneParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  time: number;
  chameleon: ChameleonVisualState;
  tongue: TongueState;
  flies: Fly[];
  powerUps: PowerUp[];
  slowMoTimer: number;
  dust: DustParticle[];
  bursts: BurstParticle[];
  shockwaves: ShockwaveRing[];
  ripples: ClickRipple[];
  floatingTexts: FloatingText[];
  shakeX: number;
  shakeY: number;
}

export class GameRenderer {
  private bgCanvas: HTMLCanvasElement | null = null;
  private bgWidth = 0;
  private bgHeight = 0;
  private bgDpr = 0;

  public invalidateBackground(): void {
    this.bgWidth = 0;
    this.bgHeight = 0;
  }

  private ensureBackground(width: number, height: number, dpr: number): HTMLCanvasElement {
    if (
      this.bgCanvas &&
      this.bgWidth === width &&
      this.bgHeight === height &&
      this.bgDpr === dpr
    ) {
      return this.bgCanvas;
    }

    if (!this.bgCanvas) {
      this.bgCanvas = document.createElement('canvas');
    }

    this.bgCanvas.width = Math.max(1, Math.floor(width * dpr));
    this.bgCanvas.height = Math.max(1, Math.floor(height * dpr));
    this.bgWidth = width;
    this.bgHeight = height;
    this.bgDpr = dpr;

    const bctx = this.bgCanvas.getContext('2d');
    if (bctx) {
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.drawStaticJungleBackground(bctx, width, height);
    }

    return this.bgCanvas;
  }

  private drawStaticJungleBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    // 1. Deep lush rainforest canopy gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#071b12');
    skyGrad.addColorStop(0.35, '#0d2e1e');
    skyGrad.addColorStop(0.75, '#134229');
    skyGrad.addColorStop(1, '#092215');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Warm sunlit canopy glow in upper center
    const glowGrad = ctx.createRadialGradient(
      width * 0.52,
      height * 0.14,
      10,
      width * 0.52,
      height * 0.25,
      Math.max(width, height) * 0.65
    );
    glowGrad.addColorStop(0, 'rgba(190, 242, 100, 0.18)');
    glowGrad.addColorStop(0.4, 'rgba(52, 211, 153, 0.08)');
    glowGrad.addColorStop(1, 'rgba(7, 27, 18, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Distant soft misty jungle silhouettes
    ctx.fillStyle = '#0c2a1b';
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width + 60; x += 60) {
      const hillY =
        height * 0.64 + Math.sin(x * 0.008) * 32 + Math.cos(x * 0.021) * 16;
      ctx.lineTo(x, hillY);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // 4. Mid-layer palm fronds and tropical leaves (sides & top corners)
    this.drawPalmFrond(ctx, -20, height * 0.22, 0.35, width * 0.24, '#113a25', '#174c31');
    this.drawPalmFrond(ctx, width + 20, height * 0.18, Math.PI - 0.32, width * 0.25, '#113a25', '#174c31');
    this.drawPalmFrond(ctx, width * 0.12, -18, 1.05, height * 0.28, '#0f3622', '#15482e');
    this.drawPalmFrond(ctx, width * 0.88, -18, Math.PI - 1.05, height * 0.28, '#0f3622', '#15482e');

    // 5. Broad monstera & philodendron leaves framing the edges
    this.drawMonsteraLeaf(ctx, width * 0.04, height * 0.56, -0.45, Math.min(width, height) * 0.18, '#174e31', '#216943');
    this.drawMonsteraLeaf(ctx, width * 0.96, height * 0.52, 0.45, Math.min(width, height) * 0.19, '#174e31', '#216943');
    this.drawMonsteraLeaf(ctx, width * 0.08, height * 0.88, -0.8, Math.min(width, height) * 0.16, '#14442b', '#1c5c3a');
    this.drawMonsteraLeaf(ctx, width * 0.92, height * 0.86, 0.8, Math.min(width, height) * 0.17, '#14442b', '#1c5c3a');

    // Top-corner broad canopy leaves
    this.drawBroadLeaf(ctx, -10, 10, 0.65, 165, '#195434', '#26754a');
    this.drawBroadLeaf(ctx, width + 10, 10, Math.PI - 0.65, 175, '#195434', '#26754a');
    this.drawBroadLeaf(ctx, width * 0.04, height * 0.32, 0.2, 130, '#1c5d3a', '#2b8253');
    this.drawBroadLeaf(ctx, width * 0.96, height * 0.3, Math.PI - 0.2, 130, '#1c5d3a', '#2b8253');

    // 6. Subtle lower foliage vignette
    const bottomVignette = ctx.createLinearGradient(0, height * 0.78, 0, height);
    bottomVignette.addColorStop(0, 'rgba(6, 20, 13, 0)');
    bottomVignette.addColorStop(1, 'rgba(4, 15, 9, 0.68)');
    ctx.fillStyle = bottomVignette;
    ctx.fillRect(0, height * 0.78, width, height * 0.22);
  }

  private drawPalmFrond(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    length: number,
    colorDark: string,
    colorLight: string
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Central stem
    ctx.strokeStyle = colorLight;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(length * 0.5, -18, length, 8);
    ctx.stroke();

    const leaflets = 11;
    for (let i = 1; i <= leaflets; i++) {
      const t = i / (leaflets + 1);
      const lx = t * length;
      const ly = -18 * (2 * t * (1 - t)) + 8 * t * t;
      const leafLen = Math.sin(t * Math.PI) * (length * 0.34);

      for (const side of [-1, 1]) {
        ctx.fillStyle = side === -1 ? colorLight : colorDark;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.quadraticCurveTo(
          lx + leafLen * 0.35,
          ly + side * leafLen * 0.65,
          lx + leafLen * 0.95,
          ly + side * leafLen * 0.9
        );
        ctx.quadraticCurveTo(
          lx + leafLen * 0.25,
          ly + side * leafLen * 0.25,
          lx,
          ly
        );
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawMonsteraLeaf(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    size: number,
    fillColor: string,
    veinColor: string
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.55);
    ctx.bezierCurveTo(
      -size * 0.85,
      size * 0.35,
      -size * 0.78,
      -size * 0.45,
      0,
      -size * 0.72
    );
    ctx.bezierCurveTo(
      size * 0.78,
      -size * 0.45,
      size * 0.85,
      size * 0.35,
      0,
      size * 0.55
    );
    ctx.closePath();
    ctx.fill();

    // Subtle midrib & lateral veins
    ctx.strokeStyle = veinColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.52);
    ctx.lineTo(0, -size * 0.62);
    for (let i = -2; i <= 2; i++) {
      const vy = i * size * 0.16;
      ctx.moveTo(0, vy);
      ctx.quadraticCurveTo(-size * 0.28, vy - size * 0.08, -size * 0.5, vy - size * 0.16);
      ctx.moveTo(0, vy);
      ctx.quadraticCurveTo(size * 0.28, vy - size * 0.08, size * 0.5, vy - size * 0.16);
    }
    ctx.stroke();

    ctx.restore();
  }

  private drawBroadLeaf(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    length: number,
    colorDark: string,
    colorLight: string
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const w = length * 0.42;
    ctx.fillStyle = colorDark;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(length * 0.45, -w, length, 0);
    ctx.quadraticCurveTo(length * 0.45, w, 0, 0);
    ctx.fill();

    ctx.fillStyle = colorLight;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(length * 0.45, -w, length, 0);
    ctx.lineTo(0, 0);
    ctx.fill();

    ctx.restore();
  }

  public render(params: RenderSceneParams): void {
    const {
      ctx,
      width,
      height,
      dpr,
      time,
      chameleon,
      tongue,
      flies,
      powerUps,
      slowMoTimer,
      dust,
      bursts,
      shockwaves,
      ripples,
      floatingTexts,
      shakeX,
      shakeY,
    } = params;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Apply subtle camera shake on catch/gulp
    ctx.translate(shakeX, shakeY);

    // 1. Static cached jungle backdrop
    const bg = this.ensureBackground(width, height, dpr);
    ctx.drawImage(bg, 0, 0, width, height);

    // 2. Animated golden sunbeams filtering through the canopy
    this.drawSunbeams(ctx, width, height, time);

    // 2b. Cool cyan slow-mo canopy atmosphere when active
    if (slowMoTimer > 0) {
      const slowAlpha = Math.min(1, slowMoTimer / 0.35) * 0.16;
      const slowGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        Math.min(width, height) * 0.2,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.72
      );
      slowGrad.addColorStop(0, 'rgba(34, 211, 238, 0.02)');
      slowGrad.addColorStop(1, `rgba(6, 182, 212, ${slowAlpha.toFixed(3)})`);
      ctx.fillStyle = slowGrad;
      ctx.fillRect(0, 0, width, height);
    }

    // 3. Swaying hanging vines
    this.drawSwayingVines(ctx, width, height, time);

    // 4. Floating dust particles
    this.drawDustParticles(ctx, dust, time);

    // 5. Tree branch at bottom center
    this.drawTreeBranch(ctx, width, height, chameleon);

    // 6. Click target ripples
    this.drawClickRipples(ctx, ripples);

    // 7. Uncaught flies and floating power-ups
    for (const fly of flies) {
      if (!fly.caught) {
        this.drawFly(ctx, fly, time);
      }
    }
    for (const pu of powerUps) {
      if (!pu.caught) {
        this.drawPowerUp(ctx, pu, time);
      }
    }

    // 8. Chameleon body, tail, head, mouth, and real-time cursor-tracking eyes
    this.drawChameleon(ctx, chameleon, tongue, time);

    // 9. Stretchy pink tongue + any flies or power-ups stuck to the tip
    if (tongue.phase !== 'IDLE') {
      this.drawTongue(ctx, tongue);
      for (const fly of tongue.caughtFlies) {
        this.drawFly(ctx, fly, time);
      }
      for (const pu of tongue.caughtPowerUps) {
        this.drawPowerUp(ctx, pu, time);
      }
    }

    // 10. Catch & gulp shockwaves and explosive particle bursts
    this.drawShockwaves(ctx, shockwaves);
    this.drawBurstParticles(ctx, bursts);

    // 11. Floating "+10" / power-up pop-ups
    this.drawFloatingTexts(ctx, floatingTexts);

    ctx.restore();
  }

  private drawSunbeams(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ): void {
    ctx.save();
    const beams = [
      { x: width * 0.26, topW: 48, botW: 190, alpha: 0.045 + Math.sin(time * 0.6) * 0.012 },
      { x: width * 0.5, topW: 72, botW: 250, alpha: 0.06 + Math.sin(time * 0.45 + 1.4) * 0.015 },
      { x: width * 0.72, topW: 54, botW: 210, alpha: 0.045 + Math.cos(time * 0.55) * 0.012 },
    ];

    for (const beam of beams) {
      const grad = ctx.createLinearGradient(beam.x, 0, beam.x + 80, height * 0.85);
      grad.addColorStop(0, `rgba(253, 230, 138, ${beam.alpha})`);
      grad.addColorStop(0.7, `rgba(167, 243, 208, ${beam.alpha * 0.45})`);
      grad.addColorStop(1, 'rgba(167, 243, 208, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(beam.x - beam.topW * 0.5, 0);
      ctx.lineTo(beam.x + beam.topW * 0.5, 0);
      ctx.lineTo(beam.x + 90 + beam.botW * 0.5, height * 0.88);
      ctx.lineTo(beam.x + 90 - beam.botW * 0.5, height * 0.88);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawSwayingVines(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number
  ): void {
    const vines = [
      { x: width * 0.14, len: height * 0.24, swayAmp: 10, phase: 0.2, leafCount: 5 },
      { x: width * 0.22, len: height * 0.15, swayAmp: 7, phase: 1.7, leafCount: 3 },
      { x: width * 0.81, len: height * 0.21, swayAmp: 9, phase: 2.5, leafCount: 4 },
      { x: width * 0.9, len: height * 0.28, swayAmp: 11, phase: 0.9, leafCount: 5 },
    ];

    ctx.save();
    for (const v of vines) {
      const sway = Math.sin(time * 1.1 + v.phase) * v.swayAmp;
      ctx.strokeStyle = '#1d5e3b';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(v.x, -4);
      ctx.quadraticCurveTo(v.x + sway * 0.5, v.len * 0.5, v.x + sway, v.len);
      ctx.stroke();

      for (let i = 1; i <= v.leafCount; i++) {
        const t = i / v.leafCount;
        const lx = v.x + sway * t * t;
        const ly = v.len * t;
        const dir = i % 2 === 0 ? 1 : -1;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(dir * 0.55 + Math.sin(time * 1.6 + i) * 0.08);
        ctx.fillStyle = i % 2 === 0 ? '#2b8253' : '#216942';
        ctx.beginPath();
        ctx.ellipse(dir * 8, 0, 9, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  private drawDustParticles(
    ctx: CanvasRenderingContext2D,
    dust: DustParticle[],
    time: number
  ): void {
    ctx.save();
    for (const p of dust) {
      const twinkle = 0.55 + 0.45 * Math.sin(time * p.twinkleSpeed + p.phase);
      const alpha = p.alpha * twinkle;
      ctx.fillStyle = `rgba(254, 243, 199, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawTreeBranch(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    chameleon: ChameleonVisualState
  ): void {
    const branchTopY = chameleon.y + 30;
    const leftEdgeY = branchTopY + 26;
    const rightEdgeY = branchTopY + 18;

    ctx.save();

    // Soft drop shadow beneath branch
    ctx.fillStyle = 'rgba(2, 12, 7, 0.5)';
    ctx.beginPath();
    ctx.moveTo(-20, leftEdgeY + 42);
    ctx.quadraticCurveTo(width * 0.5, branchTopY + 34, width + 20, rightEdgeY + 42);
    ctx.lineTo(width + 20, height + 20);
    ctx.lineTo(-20, height + 20);
    ctx.closePath();
    ctx.fill();

    // Main branch body
    const barkGrad = ctx.createLinearGradient(0, branchTopY - 10, 0, branchTopY + 52);
    barkGrad.addColorStop(0, '#7c4a2b');
    barkGrad.addColorStop(0.35, '#59331c');
    barkGrad.addColorStop(1, '#2f190c');

    ctx.fillStyle = barkGrad;
    ctx.beginPath();
    ctx.moveTo(-20, leftEdgeY);
    ctx.bezierCurveTo(
      width * 0.25,
      branchTopY - 8,
      width * 0.72,
      branchTopY - 12,
      width + 20,
      rightEdgeY
    );
    ctx.lineTo(width + 20, rightEdgeY + 46);
    ctx.bezierCurveTo(
      width * 0.72,
      branchTopY + 38,
      width * 0.25,
      branchTopY + 42,
      -20,
      leftEdgeY + 46
    );
    ctx.closePath();
    ctx.fill();

    // Small forked twig on the right side
    ctx.fillStyle = '#4a2915';
    ctx.beginPath();
    ctx.moveTo(width * 0.76, branchTopY + 6);
    ctx.quadraticCurveTo(width * 0.82, branchTopY - 22, width * 0.87, branchTopY - 32);
    ctx.quadraticCurveTo(width * 0.84, branchTopY - 10, width * 0.8, branchTopY + 12);
    ctx.closePath();
    ctx.fill();

    // Sprouting twig leaves on right fork
    ctx.fillStyle = '#34a853';
    ctx.beginPath();
    ctx.ellipse(width * 0.87, branchTopY - 34, 12, 5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.ellipse(width * 0.855, branchTopY - 25, 9, 4, -1.1, 0, Math.PI * 2);
    ctx.fill();

    // Bark grain lines
    ctx.strokeStyle = 'rgba(22, 10, 4, 0.45)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const startX = width * (0.08 + i * 0.15);
      const yOff = branchTopY + 14 + (i % 2) * 10;
      ctx.beginPath();
      ctx.moveTo(startX, yOff);
      ctx.quadraticCurveTo(startX + 40, yOff - 5, startX + 86, yOff + 2);
      ctx.stroke();
    }

    // Lush moss patches along the top surface of the branch
    const mossSpots = [
      { x: width * 0.15, y: branchTopY + 9, rx: 38, ry: 8 },
      { x: width * 0.34, y: branchTopY - 1, rx: 46, ry: 9 },
      { x: width * 0.56, y: branchTopY - 3, rx: 52, ry: 9 },
      { x: width * 0.74, y: branchTopY + 2, rx: 34, ry: 7 },
    ];
    for (const m of mossSpots) {
      ctx.fillStyle = '#1f7a38';
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, m.rx, m.ry, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#34b44e';
      ctx.beginPath();
      ctx.ellipse(m.x - 4, m.y - 2, m.rx * 0.72, m.ry * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawChameleon(
    ctx: CanvasRenderingContext2D,
    chameleon: ChameleonVisualState,
    tongue: TongueState,
    time: number
  ): void {
    const cx = chameleon.x;
    const cy = chameleon.y;

    const breath = Math.sin(chameleon.idlePhase * 2.1) * 1.8;
    const gulpNorm = chameleon.gulpTimer > 0 ? Math.sin((chameleon.gulpTimer / 0.28) * Math.PI) : 0;
    const shootNorm = chameleon.shootPulse > 0 ? Math.sin((chameleon.shootPulse / 0.18) * Math.PI) : 0;

    const stretchX = 1 + gulpNorm * 0.08 - shootNorm * 0.04;
    const stretchY = 1 - gulpNorm * 0.06 + shootNorm * 0.05;

    ctx.save();
    ctx.translate(cx, cy + breath);
    ctx.scale(stretchX, stretchY);

    const fromPal =
      CHAMELEON_PALETTES[chameleon.prevColorIndex % CHAMELEON_PALETTES.length];
    const toPal =
      CHAMELEON_PALETTES[chameleon.colorIndex % CHAMELEON_PALETTES.length];
    const tColor = chameleon.colorBlend;

    const palette: ChameleonPalette = {
      bodyMain: lerpHexColor(fromPal.bodyMain, toPal.bodyMain, tColor),
      bodyHighlight: lerpHexColor(fromPal.bodyHighlight, toPal.bodyHighlight, tColor),
      bodyAccent: lerpHexColor(fromPal.bodyAccent, toPal.bodyAccent, tColor),
      tailBase: lerpHexColor(fromPal.tailBase, toPal.tailBase, tColor),
      tailBands: lerpHexColor(fromPal.tailBands, toPal.tailBands, tColor),
      belly: lerpHexColor(fromPal.belly, toPal.belly, tColor),
      crest: lerpHexColor(fromPal.crest, toPal.crest, tColor),
      legDark: lerpHexColor(fromPal.legDark, toPal.legDark, tColor),
      legLight: lerpHexColor(fromPal.legLight, toPal.legLight, tColor),
      jaw: lerpHexColor(fromPal.jaw, toPal.jaw, tColor),
      cheek: lerpHexColor(fromPal.cheek, toPal.cheek, tColor),
      eyeOuterLeft: lerpHexColor(fromPal.eyeOuterLeft, toPal.eyeOuterLeft, tColor),
      eyeOuterRight: lerpHexColor(fromPal.eyeOuterRight, toPal.eyeOuterRight, tColor),
      eyeInnerLeft: lerpHexColor(fromPal.eyeInnerLeft, toPal.eyeInnerLeft, tColor),
      eyeInnerRight: lerpHexColor(fromPal.eyeInnerRight, toPal.eyeInnerRight, tColor),
      outlineDark: lerpHexColor(fromPal.outlineDark, toPal.outlineDark, tColor),
    };

    // Subtle luminous brighten pulse when gulping a fly
    const hueShift = chameleon.hueShift;
    const bodyMain =
      hueShift > 0.05
        ? lerpHexColor(toPal.bodyMain, '#fef08a', hueShift * 0.25)
        : palette.bodyMain;
    const bodyHighlight =
      hueShift > 0.05
        ? lerpHexColor(toPal.bodyHighlight, '#ffffff', hueShift * 0.22)
        : palette.bodyHighlight;

    // 1. Curled spiral tail wrapping gracefully to the left onto the branch
    ctx.save();
    ctx.translate(-52, 16);
    ctx.lineCap = 'round';
    ctx.strokeStyle = palette.tailBase;
    ctx.lineWidth = 17;
    ctx.beginPath();
    ctx.moveTo(14, -4);
    ctx.bezierCurveTo(-24, -10, -56, 20, -32, 34);
    ctx.bezierCurveTo(-12, 44, 6, 22, -10, 12);
    ctx.bezierCurveTo(-22, 6, -30, 18, -20, 23);
    ctx.stroke();

    // Lighter inner highlight along tail
    ctx.strokeStyle = bodyHighlight;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(14, -6);
    ctx.bezierCurveTo(-22, -12, -52, 18, -32, 32);
    ctx.stroke();

    // Gold/accent tail bands
    ctx.strokeStyle = palette.tailBands;
    ctx.lineWidth = 3.5;
    for (const [bx, by, bx2, by2] of [
      [-14, -4, -18, 6],
      [-32, 6, -40, 14],
      [-36, 24, -28, 32],
    ]) {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx2, by2);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Back leg gripping branch
    this.drawChameleonLeg(ctx, -34, 10, -28, 28, palette.legDark, bodyHighlight);

    // 3. Plump colorful body torso
    const bodyGrad = ctx.createLinearGradient(-48, -32, 24, 24);
    bodyGrad.addColorStop(0, palette.bodyAccent);
    bodyGrad.addColorStop(0.45, bodyMain);
    bodyGrad.addColorStop(1, bodyHighlight);

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-48, 8);
    ctx.bezierCurveTo(-56, -24, -18, -46, 18, -36);
    ctx.bezierCurveTo(38, -28, 42, -2, 26, 18);
    ctx.bezierCurveTo(8, 28, -34, 26, -48, 8);
    ctx.closePath();
    ctx.fill();

    // Belly warm trim (puffs out slightly on gulp)
    ctx.fillStyle = palette.belly;
    ctx.beginPath();
    ctx.moveTo(-28, 17);
    ctx.quadraticCurveTo(2, 26 + gulpNorm * 8, 26, 13);
    ctx.quadraticCurveTo(4, 17, -28, 17);
    ctx.closePath();
    ctx.fill();

    // Decorative tropical flank stripes
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = palette.tailBase;
    for (const sx of [-24, -8, 8]) {
      ctx.beginPath();
      ctx.ellipse(sx, -10, 4.5, 16, -0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = palette.belly;
    for (const sx of [-16, 0]) {
      ctx.beginPath();
      ctx.arc(sx, -14, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Dorsal spine ridge spikes along the back
    ctx.fillStyle = palette.crest;
    const spikes = [
      { x: -36, y: -15, r: -0.6 },
      { x: -24, y: -27, r: -0.35 },
      { x: -10, y: -35, r: -0.15 },
      { x: 5, y: -38, r: 0.05 },
    ];
    for (const sp of spikes) {
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(sp.r);
      ctx.beginPath();
      ctx.moveTo(-5, 4);
      ctx.lineTo(0, -8);
      ctx.lineTo(5, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 4. Front leg gripping branch
    this.drawChameleonLeg(ctx, 14, 12, 18, 28, palette.legDark, palette.legLight);

    // 5. Expressive Chameleon Head, Casque Crest, Throat & Mouth
    ctx.save();
    ctx.translate(18, -32);

    // Veiled casque crest behind head
    ctx.fillStyle = palette.bodyAccent;
    ctx.beginPath();
    ctx.moveTo(-16, -6);
    ctx.quadraticCurveTo(-24, -34, -4, -38);
    ctx.quadraticCurveTo(10, -30, 8, -14);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = palette.crest;
    ctx.beginPath();
    ctx.moveTo(-14, -22);
    ctx.lineTo(-8, -36);
    ctx.lineTo(-1, -24);
    ctx.closePath();
    ctx.fill();

    // Puffed throat sac when swallowing
    const mouthOpen = tongue.phase !== 'IDLE' ? 1 : 0;
    const jawDrop = mouthOpen * 9 + gulpNorm * 4;

    if (gulpNorm > 0.05) {
      ctx.fillStyle = palette.belly;
      ctx.beginPath();
      ctx.ellipse(-2, 14 + gulpNorm * 4, 15 + gulpNorm * 6, 10 + gulpNorm * 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Head base gradient
    const headGrad = ctx.createLinearGradient(-18, -24, 30, 14);
    headGrad.addColorStop(0, bodyMain);
    headGrad.addColorStop(1, bodyHighlight);

    // Upper skull & snout
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.moveTo(-18, 4);
    ctx.bezierCurveTo(-20, -20, 4, -28, 24, -14);
    ctx.quadraticCurveTo(36, -6, 30, 2);
    ctx.lineTo(-2, 4);
    ctx.closePath();
    ctx.fill();

    // Open mouth interior (coral pink) when shooting tongue
    if (mouthOpen > 0) {
      ctx.fillStyle = '#881337';
      ctx.beginPath();
      ctx.moveTo(2, 1);
      ctx.lineTo(29, 0);
      ctx.lineTo(24, 4 + jawDrop);
      ctx.lineTo(0, 6 + jawDrop * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    // Lower jaw
    ctx.fillStyle = palette.jaw;
    ctx.beginPath();
    ctx.moveTo(-12, 4);
    ctx.lineTo(28, 2 + jawDrop * 0.75);
    ctx.quadraticCurveTo(18, 14 + jawDrop, -8, 12 + jawDrop * 0.3);
    ctx.closePath();
    ctx.fill();

    // Cheek blush / accent
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = palette.cheek;
    ctx.beginPath();
    ctx.arc(-4, -2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Smile crease when mouth is closed
    if (mouthOpen === 0) {
      ctx.strokeStyle = palette.outlineDark;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(2, 2);
      ctx.quadraticCurveTo(15, 4, 27, 1);
      ctx.stroke();
    }

    // Tiny nostril dot
    ctx.fillStyle = palette.outlineDark;
    ctx.beginPath();
    ctx.arc(24, -6, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // end head local transform

    // 6. Real-time Mouse-Tracking Turret Eyes (drawn in chameleon local space)
    // Left/far eye slightly higher & forward; right/near eye prominent on cheek
    const relLeftEyeX = chameleon.leftEyeX - cx;
    const relLeftEyeY = chameleon.leftEyeY - (cy + breath);
    const relRightEyeX = chameleon.rightEyeX - cx;
    const relRightEyeY = chameleon.rightEyeY - (cy + breath);

    this.drawTurretEye(
      ctx,
      relLeftEyeX,
      relLeftEyeY,
      11.5,
      chameleon.eyeAngleLeft,
      chameleon.eyeDistLeft,
      chameleon.isBlinking && tongue.phase === 'IDLE',
      palette.eyeOuterLeft,
      palette.eyeInnerLeft,
      palette.outlineDark
    );

    this.drawTurretEye(
      ctx,
      relRightEyeX,
      relRightEyeY,
      13.5,
      chameleon.eyeAngleRight,
      chameleon.eyeDistRight,
      chameleon.isBlinking && tongue.phase === 'IDLE',
      palette.eyeOuterRight,
      palette.eyeInnerRight,
      palette.outlineDark
    );

    ctx.restore();

    // Unused time check safeguard if needed for subtle aura
    void time;
  }

  private drawChameleonLeg(
    ctx: CanvasRenderingContext2D,
    hipX: number,
    hipY: number,
    footX: number,
    footY: number,
    darkGreen: string,
    lightGreen: string
  ): void {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = darkGreen;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.quadraticCurveTo(hipX + 5, (hipY + footY) * 0.5, footX, footY);
    ctx.stroke();

    ctx.strokeStyle = lightGreen;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(hipX + 1, hipY);
    ctx.quadraticCurveTo(hipX + 5, (hipY + footY) * 0.5, footX, footY);
    ctx.stroke();

    // Grasping mitten toes on branch
    ctx.fillStyle = lightGreen;
    ctx.beginPath();
    ctx.ellipse(footX - 4, footY + 2, 5, 3.5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(footX + 4, footY + 2, 5, 3.5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawTurretEye(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    angle: number,
    distNorm: number,
    isBlinking: boolean,
    outerRingColor: string,
    innerRingColor: string,
    outlineColor: string
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // Outer conical scaly turret
    ctx.fillStyle = outerRingColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Inner turret rim
    ctx.fillStyle = innerRingColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.74, 0, Math.PI * 2);
    ctx.fill();

    if (isBlinking) {
      // Closed eyelid slit
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-radius * 0.5, 0);
      ctx.lineTo(radius * 0.5, 0);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Cream sclera opening
    const scleraR = radius * 0.56;
    ctx.fillStyle = '#fefce8';
    ctx.beginPath();
    ctx.arc(0, 0, scleraR, 0, Math.PI * 2);
    ctx.fill();

    // Pupil tracking mouse cursor in real time
    const maxOffset = scleraR * 0.52;
    const offset = maxOffset * Math.min(1, distNorm);
    const px = Math.cos(angle) * offset;
    const py = Math.sin(angle) * offset;

    // Iris ring
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(px, py, scleraR * 0.62, 0, Math.PI * 2);
    ctx.fill();

    // Glossy black pupil
    ctx.fillStyle = '#090d0b';
    ctx.beginPath();
    ctx.arc(px, py, scleraR * 0.44, 0, Math.PI * 2);
    ctx.fill();

    // Bright catchlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px - scleraR * 0.16, py - scleraR * 0.16, scleraR * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawTongue(ctx: CanvasRenderingContext2D, tongue: TongueState): void {
    const { originX, originY, tipX, tipY, phase } = tongue;
    const dx = tipX - originX;
    const dy = tipY - originY;
    const len = Math.hypot(dx, dy);
    if (len < 2) return;

    // Subtle organic whip curve perpendicular to shoot direction
    const nx = -dy / len;
    const ny = dx / len;
    const sag = phase === 'EXTENDING' ? Math.min(18, len * 0.04) : -Math.min(14, len * 0.035);
    const ctrlX = (originX + tipX) * 0.5 + nx * sag;
    const ctrlY = (originY + tipY) * 0.5 + ny * sag;

    ctx.save();
    ctx.lineCap = 'round';

    // Soft outer pink shadow
    ctx.strokeStyle = '#be123c';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();

    // Main stretchy pink tongue
    const grad = ctx.createLinearGradient(originX, originY, tipX, tipY);
    grad.addColorStop(0, '#fb7185');
    grad.addColorStop(0.7, '#f43f5e');
    grad.addColorStop(1, '#fb7185');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 7.2;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();

    // Glossy highlight strip
    ctx.strokeStyle = 'rgba(255, 228, 230, 0.72)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
    ctx.stroke();

    // Sticky bulbous tip
    const tipRadius = tongue.caughtFlies.length > 0 ? 11 : 9.5;
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(tipX, tipY, tipRadius + 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.arc(tipX, tipY, tipRadius, 0, Math.PI * 2);
    ctx.fill();

    // Wet sheen on tip
    ctx.fillStyle = '#ffe4e6';
    ctx.beginPath();
    ctx.arc(tipX - tipRadius * 0.3, tipY - tipRadius * 0.3, tipRadius * 0.34, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawFly(ctx: CanvasRenderingContext2D, fly: Fly, time: number): void {
    ctx.save();
    ctx.translate(fly.x, fly.y);

    // Fast fly trailing aerodynamic speed streaks (drawn before rotation/body)
    if (fly.species === 'fast' && !fly.caught) {
      const tailDir = -fly.direction;
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const yOff = (i - 1) * 4.5;
        const streakLen = 13 + ((i * 7 + Math.floor(time * 24)) % 9);
        ctx.strokeStyle =
          i === 1 ? 'rgba(251, 113, 133, 0.7)' : 'rgba(103, 232, 249, 0.55)';
        ctx.lineWidth = i === 1 ? 2 : 1.4;
        ctx.beginPath();
        ctx.moveTo(tailDir * 8, yOff);
        ctx.lineTo(tailDir * (8 + streakLen), yOff);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Gold fly luminous aura halo
    if (fly.species === 'gold') {
      const auraRadius = 21 + Math.sin(time * 6 + fly.phase1) * 2.5;
      const aura = ctx.createRadialGradient(0, 0, 3, 0, 0, auraRadius);
      aura.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      aura.addColorStop(0.55, 'rgba(245, 158, 11, 0.16)');
      aura.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle orientation tilt toward travel direction
    const tilt = fly.caught
      ? 0.35
      : fly.direction * (fly.species === 'fast' ? 0.22 : 0.14);
    ctx.rotate(tilt);

    const wingFlap = Math.sin(fly.wingPhase);
    const wingAngleTop = -0.55 + wingFlap * 0.42;
    const wingAngleBot = 0.55 - wingFlap * 0.42;

    // Color palette per species & variant
    let abdomenFill = '#1e293b';
    let thoraxHighlight = '#34d399';
    let wingFill = 'rgba(236, 253, 245, 0.78)';
    let wingStroke = 'rgba(167, 243, 208, 0.85)';
    let headFill = '#0f172a';
    let eyeFill = '#f97316';

    if (fly.species === 'gold') {
      abdomenFill = '#b45309';
      thoraxHighlight = '#fef08a';
      wingFill = 'rgba(254, 249, 195, 0.86)';
      wingStroke = 'rgba(250, 204, 21, 0.9)';
      headFill = '#78350f';
      eyeFill = '#fde047';
    } else if (fly.species === 'fast') {
      abdomenFill = '#4c0519';
      thoraxHighlight = '#fb7185';
      wingFill = 'rgba(224, 242, 254, 0.8)';
      wingStroke = 'rgba(251, 113, 133, 0.85)';
      headFill = '#1e1b4b';
      eyeFill = '#38bdf8';
    } else if (fly.variant === 'amber') {
      abdomenFill = '#292524';
      thoraxHighlight = '#fbbf24';
    } else if (fly.variant === 'cobalt') {
      abdomenFill = '#172554';
      thoraxHighlight = '#38bdf8';
    }

    // Translucent fluttering wings
    const wingRx = fly.species === 'fast' ? 11.5 : 10.5;
    const wingRy = fly.species === 'fast' ? 4.3 : 5.5;
    ctx.save();
    for (const [ang, dir] of [
      [wingAngleTop, -1],
      [wingAngleBot, 1],
    ] as const) {
      ctx.save();
      ctx.translate(-fly.direction * 2, dir * 3);
      ctx.rotate(ang);
      ctx.fillStyle = wingFill;
      ctx.strokeStyle = wingStroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(-fly.direction * 6, dir * 7, wingRx, wingRy, dir * -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // Subtle crisp outline halo so flies always read cleanly over dark leaves
    ctx.fillStyle =
      fly.species === 'gold'
        ? 'rgba(254, 240, 138, 0.32)'
        : fly.species === 'fast'
          ? 'rgba(251, 113, 133, 0.24)'
          : 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Abdomen
    const bodyRx = fly.species === 'fast' ? 9.5 : 8.5;
    const bodyRy = fly.species === 'fast' ? 5.2 : 6.2;
    if (fly.species === 'gold') {
      const goldGrad = ctx.createLinearGradient(-10, -6, 6, 6);
      goldGrad.addColorStop(0, '#fef08a');
      goldGrad.addColorStop(0.55, '#f59e0b');
      goldGrad.addColorStop(1, '#b45309');
      ctx.fillStyle = goldGrad;
    } else {
      ctx.fillStyle = abdomenFill;
    }
    ctx.beginPath();
    ctx.ellipse(-fly.direction * 3.5, 0.5, bodyRx, bodyRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iridescent stripes on abdomen
    ctx.fillStyle = thoraxHighlight;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.ellipse(-fly.direction * 5, 0.5, 3, bodyRy * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Head
    ctx.fillStyle = headFill;
    ctx.beginPath();
    ctx.arc(fly.direction * 5.5, 0, 4.8, 0, Math.PI * 2);
    ctx.fill();

    // Compound eye
    ctx.fillStyle = eyeFill;
    ctx.beginPath();
    ctx.arc(fly.direction * 7.2, -1.6, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Specular eye glint
    ctx.fillStyle = '#fffbeb';
    ctx.beginPath();
    ctx.arc(fly.direction * 7.7, -2.3, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Twinkling star sparkles on Gold Flies
    if (fly.species === 'gold' && !fly.caught) {
      const sp1 = 0.5 + 0.5 * Math.sin(time * 7 + fly.phase1);
      const sp2 = 0.5 + 0.5 * Math.cos(time * 6.2 + fly.phase2);
      this.drawSparkleCross(ctx, -fly.direction * 9, -9, 3.2 * (0.6 + 0.5 * sp1), '#fef9c3');
      this.drawSparkleCross(ctx, fly.direction * 4, 10, 2.6 * (0.6 + 0.5 * sp2), '#fde047');
    }

    ctx.restore();
  }

  private drawSparkleCross(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    color: string
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.moveTo(0, -size);
    ctx.lineTo(0, size);
    ctx.stroke();
    ctx.restore();
  }

  private drawPowerUp(
    ctx: CanvasRenderingContext2D,
    powerUp: PowerUp,
    time: number
  ): void {
    const pulse = 0.85 + 0.15 * Math.sin(time * 5.2 + powerUp.phase);
    const tilt = powerUp.caught ? 0.15 : Math.sin(time * 3 + powerUp.phase) * 0.08;

    ctx.save();
    ctx.translate(powerUp.x, powerUp.y);
    ctx.rotate(tilt);

    if (powerUp.type === 'time_bonus') {
      // Golden aura glow
      const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 28 * pulse);
      glow.addColorStop(0, 'rgba(253, 224, 71, 0.42)');
      glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 28 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Top clock winder crown
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-3.5, -21, 7, 5);
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.roundRect(-5.5, -24, 11, 4, 2);
      ctx.fill();

      // Gold pocket clock rim
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, 0, 16.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Cream dial face
      ctx.fillStyle = '#fefce8';
      ctx.beginPath();
      ctx.arc(0, 0, 12.5, 0, Math.PI * 2);
      ctx.fill();

      // Cardinal hour ticks
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.6;
      for (const [x1, y1, x2, y2] of [
        [0, -10.5, 0, -8],
        [10.5, 0, 8, 0],
        [0, 10.5, 0, 8],
        [-10.5, 0, -8, 0],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Animated clock hands
      const handAngle = time * 4.5;
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -7);
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(handAngle) * 6.5, Math.sin(handAngle) * 6.5);
      ctx.stroke();

      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      // Crisp "+5s" micro label below clock
      if (!powerUp.caught) {
        ctx.font = '800 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(6, 24, 15, 0.9)';
        ctx.strokeText('+5s', 0, 19);
        ctx.fillStyle = '#fde047';
        ctx.fillText('+5s', 0, 19);
      }
    } else {
      // Slow-Mo Nectar Drop aura glow
      const glow = ctx.createRadialGradient(0, 2, 4, 0, 2, 28 * pulse);
      glow.addColorStop(0, 'rgba(103, 232, 249, 0.45)');
      glow.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 2, 28 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Teardrop nectar body
      const dropGrad = ctx.createLinearGradient(-10, -18, 12, 16);
      dropGrad.addColorStop(0, '#a5f3fc');
      dropGrad.addColorStop(0.5, '#06b6d4');
      dropGrad.addColorStop(1, '#0e7490');

      ctx.fillStyle = dropGrad;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.bezierCurveTo(10, -5, 15, 4, 13, 10);
      ctx.bezierCurveTo(11, 18, -11, 18, -13, 10);
      ctx.bezierCurveTo(-15, 4, -10, -5, 0, -18);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#cffafe';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Glossy specular crescent
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.ellipse(-4.5, 4, 2.5, 5.5, -0.35, 0, Math.PI * 2);
      ctx.fill();

      // Crisp "SLOW" micro label below droplet
      if (!powerUp.caught) {
        ctx.font = '800 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(6, 24, 15, 0.9)';
        ctx.strokeText('SLOW', 0, 19);
        ctx.fillStyle = '#67e8f9';
        ctx.fillText('SLOW', 0, 19);
      }
    }

    ctx.restore();
  }

  private drawClickRipples(ctx: CanvasRenderingContext2D, ripples: ClickRipple[]): void {
    ctx.save();
    for (const r of ripples) {
      const t = r.age / r.maxAge;
      const radius = 6 + t * 24;
      const alpha = (1 - t) * 0.65;
      ctx.strokeStyle = `rgba(251, 113, 133, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 2.2 * (1 - t * 0.5);
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawShockwaves(
    ctx: CanvasRenderingContext2D,
    shockwaves: ShockwaveRing[]
  ): void {
    if (shockwaves.length === 0) return;
    ctx.save();
    for (const sw of shockwaves) {
      const t = Math.min(1, sw.age / sw.maxAge);
      const eased = 1 - Math.pow(1 - t, 2.4);
      const radius = sw.startRadius + (sw.endRadius - sw.startRadius) * eased;
      const alpha = Math.max(0, 1 - t) * 0.85;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = Math.max(0.6, sw.lineWidth * (1 - t * 0.7));
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBurstParticles(ctx: CanvasRenderingContext2D, bursts: BurstParticle[]): void {
    if (bursts.length === 0) return;
    ctx.save();
    for (const p of bursts) {
      const t = Math.min(1, p.age / p.maxAge);
      const alpha = Math.max(0, 1 - Math.pow(t, 1.4));
      const scale = 1 - t * 0.45;
      const r = p.radius * scale;

      if (p.shape === 'spark') {
        const angle = Math.atan2(p.vy, p.vx);
        const speed = Math.hypot(p.vx, p.vy);
        const tailLen = Math.max(r * 2.2, Math.min(20, speed * 0.045) * (1 - t * 0.5));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.2, r * 0.9);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-tailLen, 0);
        ctx.lineTo(r * 0.5, 0);
        ctx.stroke();
        ctx.restore();
      } else if (p.shape === 'star') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const outer = r * 1.45;
        const inner = outer * 0.35;
        for (let i = 0; i < 8; i++) {
          const rad = i % 2 === 0 ? outer : inner;
          const a = (i * Math.PI) / 4;
          if (i === 0) {
            ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
          } else {
            ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        // Soft glow halo + bright core orb
        ctx.globalAlpha = alpha * 0.32;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 1.85, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]): void {
    ctx.save();
    ctx.font = '800 24px "Bricolage Grotesque", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const ft of texts) {
      const t = ft.age / ft.maxAge;
      const alpha = t < 0.7 ? 1 : Math.max(0, 1 - (t - 0.7) / 0.3);
      const popScale = t < 0.16 ? 0.7 + (t / 0.16) * 0.45 : 1.15 - t * 0.15;

      ctx.save();
      ctx.translate(ft.x, ft.y);
      ctx.scale(popScale, popScale);
      ctx.globalAlpha = alpha;

      ctx.lineWidth = 4.5;
      ctx.strokeStyle = 'rgba(6, 24, 15, 0.9)';
      ctx.strokeText(ft.text, 0, 0);

      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }
}
