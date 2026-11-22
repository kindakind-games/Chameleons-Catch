import { SoundEngine } from './audio';
import { HapticsEngine } from './haptics';
import { GameRenderer } from './renderer';
import {
  BurstParticle,
  BurstShape,
  ChameleonVisualState,
  ClickRipple,
  Difficulty,
  DustParticle,
  FloatingText,
  Fly,
  FlySpecies,
  FlyVariant,
  GameStatus,
  HudSnapshot,
  PowerUp,
  PowerUpType,
  ShockwaveRing,
  TongueState,
} from './types';

const ROUND_DURATION = 60;
const POINTS_PER_FLY = 10;
const GOLD_FLY_POINTS = 30;
const FAST_FLY_POINTS = 20;
const BEST_SCORE_STORAGE_KEY = 'chameleon_catch_best_score';
const COLOR_CYCLE_INTERVAL = 10;
const COLOR_MORPH_COUNT = 6;
const COLOR_MORPH_DURATION = 0.85;
const TIME_BONUS_SECONDS = 5;
const SLOW_MO_DURATION = 3.0;
const SLOW_MO_FLY_FACTOR = 0.32;
const COMBO_WINDOW = 3.2;
const MAX_COMBO_MULTIPLIER = 5;

interface DifficultyTuning {
  speedMultiplier: number;
  baseFlyCount: number;
  maxBonusFlies: number;
  spawnIntervalStart: number;
  spawnIntervalMin: number;
  initialFlies: number;
}

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyTuning> = {
  easy: {
    speedMultiplier: 0.72,
    baseFlyCount: 5,
    maxBonusFlies: 2,
    spawnIntervalStart: 1.35,
    spawnIntervalMin: 0.75,
    initialFlies: 5,
  },
  medium: {
    speedMultiplier: 1.0,
    baseFlyCount: 6,
    maxBonusFlies: 3,
    spawnIntervalStart: 1.05,
    spawnIntervalMin: 0.45,
    initialFlies: 6,
  },
  hard: {
    speedMultiplier: 1.42,
    baseFlyCount: 8,
    maxBonusFlies: 4,
    spawnIntervalStart: 0.68,
    spawnIntervalMin: 0.28,
    initialFlies: 8,
  },
};

function pointToSegmentDistSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq <= 0.0001) {
    const dx = px - ax;
    const dy = py - ay;
    return dx * dx + dy * dy;
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lenSq));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy;
}

export class ChameleonGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer = new GameRenderer();
  public sound = new SoundEngine();
  public haptics = new HapticsEngine();

  private width = 960;
  private height = 640;
  private dpr = 1;

  private rafId: number | null = null;
  private lastTimestamp = 0;
  private elapsedTotal = 0;
  private hitstopTimer = 0;

  private status: GameStatus = 'TITLE_MENU';
  private difficulty: Difficulty = 'medium';
  private score = 0;
  private timeLeft = ROUND_DURATION;
  private lastAnnouncedSecond = ROUND_DURATION;
  private fliesCaught = 0;
  private shotsFired = 0;
  private bestScore = 0;
  private isNewBest = false;
  private comboCount = 0;
  private comboTimer = 0;
  private maxCombo = 0;

  private pointerX = 480;
  private pointerY = 220;
  private hasPointerMoved = false;

  private nextFlyId = 1;
  private flySpawnTimer = 0;
  private flies: Fly[] = [];
  private nextPowerUpId = 1;
  private powerUpSpawnTimer = 7.5;
  private powerUps: PowerUp[] = [];
  private slowMoTimer = 0;
  private dust: DustParticle[] = [];
  private bursts: BurstParticle[] = [];
  private shockwaves: ShockwaveRing[] = [];
  private ripples: ClickRipple[] = [];
  private floatingTexts: FloatingText[] = [];

  private shakeMagnitude = 0;
  private shakeX = 0;
  private shakeY = 0;

  private chameleon: ChameleonVisualState;
  private tongue: TongueState;
  private colorCycleTimer = COLOR_CYCLE_INTERVAL;

  private onHudChange: (snapshot: HudSnapshot) => void;
  private lastSnapshotKey = '';

  constructor(canvas: HTMLCanvasElement, onHudChange: (snapshot: HudSnapshot) => void) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not initialize 2D canvas context');
    }
    this.ctx = context;
    this.onHudChange = onHudChange;
    this.bestScore = this.loadBestScore(this.difficulty);

    this.chameleon = {
      x: 480,
      y: 550,
      mouthX: 518,
      mouthY: 521,
      leftEyeX: 516,
      leftEyeY: 500,
      rightEyeX: 491,
      rightEyeY: 510,
      eyeAngleLeft: -Math.PI * 0.4,
      eyeAngleRight: -Math.PI * 0.4,
      eyeDistLeft: 0.7,
      eyeDistRight: 0.7,
      blinkTimer: 3.2,
      isBlinking: false,
      gulpTimer: 0,
      shootPulse: 0,
      hueShift: 0,
      idlePhase: 0,
      colorIndex: 0,
      prevColorIndex: 0,
      colorBlend: 1,
    };

    this.tongue = {
      phase: 'IDLE',
      originX: 518,
      originY: 521,
      targetX: 518,
      targetY: 521,
      tipX: 518,
      tipY: 521,
      prevTipX: 518,
      prevTipY: 521,
      progress: 0,
      distance: 0,
      caughtFlies: [],
      caughtPowerUps: [],
      bufferedClick: null,
    };

    this.updateDimensions();
    this.initDustParticles();
    this.seedInitialFlies(DIFFICULTY_CONFIG[this.difficulty].initialFlies);
    this.emitHudSnapshot(true);
  }

  private getBestScoreKey(difficulty: Difficulty): string {
    return `${BEST_SCORE_STORAGE_KEY}_${difficulty}`;
  }

  private loadBestScore(difficulty: Difficulty): number {
    try {
      const raw = window.localStorage.getItem(this.getBestScoreKey(difficulty));
      const parsed = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    } catch {
      return 0;
    }
  }

  private saveBestScore(difficulty: Difficulty, value: number): void {
    try {
      window.localStorage.setItem(this.getBestScoreKey(difficulty), String(value));
    } catch {
      // Ignore storage failures in private browsing
    }
  }

  public updateDimensions(): void {
    const rect = this.canvas.getBoundingClientRect();
    const nextWidth = Math.max(320, Math.floor(rect.width || window.innerWidth));
    const nextHeight = Math.max(320, Math.floor(rect.height || window.innerHeight));
    const nextDpr = Math.min(2, window.devicePixelRatio || 1);

    this.width = nextWidth;
    this.height = nextHeight;
    this.dpr = nextDpr;

    this.canvas.width = Math.floor(nextWidth * nextDpr);
    this.canvas.height = Math.floor(nextHeight * nextDpr);
    this.renderer.invalidateBackground();

    this.syncChameleonAnchors();

    if (!this.hasPointerMoved) {
      this.pointerX = this.width * 0.55;
      this.pointerY = this.height * 0.34;
    }

    const minY = Math.min(82, Math.round(this.height * 0.15));
    const maxY = Math.max(minY + 40, this.height - 175);
    for (const fly of this.flies) {
      if (!fly.caught) {
        fly.baseY = Math.max(minY, Math.min(maxY, fly.baseY));
        fly.y = Math.max(minY, Math.min(maxY, fly.y));
        fly.x = Math.max(-20, Math.min(this.width + 20, fly.x));
      }
    }
    for (const pu of this.powerUps) {
      if (!pu.caught) {
        pu.baseY = Math.max(minY, Math.min(maxY, pu.baseY));
        pu.y = Math.max(minY, Math.min(maxY, pu.y));
        pu.x = Math.max(-24, Math.min(this.width + 24, pu.x));
      }
    }
    for (const d of this.dust) {
      d.x = Math.min(this.width, Math.max(0, d.x));
      d.y = Math.min(this.height * 0.85, Math.max(0, d.y));
    }
  }

  private syncChameleonAnchors(): void {
    const cx = this.width * 0.5 - 6;
    const cy = this.height - 76;
    const breath = Math.sin(this.chameleon.idlePhase * 2.1) * 1.8;

    this.chameleon.x = cx;
    this.chameleon.y = cy;
    this.chameleon.mouthX = cx + 38;
    this.chameleon.mouthY = cy + breath - 29;
    this.chameleon.leftEyeX = cx + 36;
    this.chameleon.leftEyeY = cy + breath - 50;
    this.chameleon.rightEyeX = cx + 11;
    this.chameleon.rightEyeY = cy + breath - 40;

    if (this.tongue.phase === 'IDLE') {
      this.tongue.originX = this.chameleon.mouthX;
      this.tongue.originY = this.chameleon.mouthY;
      this.tongue.tipX = this.chameleon.mouthX;
      this.tongue.tipY = this.chameleon.mouthY;
      this.tongue.prevTipX = this.chameleon.mouthX;
      this.tongue.prevTipY = this.chameleon.mouthY;
    } else {
      this.tongue.originX = this.chameleon.mouthX;
      this.tongue.originY = this.chameleon.mouthY;
    }
  }

  private initDustParticles(): void {
    this.dust = [];
    const count = 34;
    for (let i = 0; i < count; i++) {
      this.dust.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.height * 0.85),
        vx: (Math.random() - 0.5) * 12,
        vy: -5 - Math.random() * 11,
        radius: 1.1 + Math.random() * 2.2,
        alpha: 0.16 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1.2 + Math.random() * 2,
      });
    }
  }

  private seedInitialFlies(count: number): void {
    this.flies = [];
    for (let i = 0; i < count; i++) {
      const fly = this.createFly(true);
      this.flies.push(fly);
    }
  }

  private createFly(spawnOnScreen = false): Fly {
    const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const minY = Math.min(92, Math.round(this.height * 0.16));
    const maxY = Math.max(minY + 40, this.height - 200);
    const baseY = minY + Math.random() * (maxY - minY);

    // Random fly species: 15% Gold (+30), 18% Fast (+20), 67% Normal (+10)
    const speciesRoll = Math.random();
    const species: FlySpecies =
      speciesRoll < 0.15 ? 'gold' : speciesRoll < 0.33 ? 'fast' : 'normal';

    const points =
      species === 'gold'
        ? GOLD_FLY_POINTS
        : species === 'fast'
          ? FAST_FLY_POINTS
          : POINTS_PER_FLY;
    const speedScale = species === 'fast' ? 1.68 : species === 'gold' ? 1.15 : 1.0;
    const waveFreqScale = species === 'fast' ? 1.5 : species === 'gold' ? 1.1 : 1.0;
    const waveAmpScale = species === 'fast' ? 1.12 : species === 'gold' ? 1.15 : 1.0;
    const radius = species === 'gold' ? 14 : species === 'fast' ? 11.5 : 13;
    const wingSpeed =
      species === 'fast'
        ? 68 + Math.random() * 20
        : species === 'gold'
          ? 48 + Math.random() * 14
          : 42 + Math.random() * 18;

    // Gently ramp fly speed as timer counts down, scaled by selected difficulty and species
    const tuning = DIFFICULTY_CONFIG[this.difficulty];
    const elapsedRatio =
      this.status === 'PLAYING' ? 1 - this.timeLeft / ROUND_DURATION : 0.15;
    const baseSpeed =
      (105 + Math.random() * 145 + elapsedRatio * 55) *
      tuning.speedMultiplier *
      speedScale;

    const variants: FlyVariant[] = ['emerald', 'amber', 'cobalt'];
    const variant = variants[Math.floor(Math.random() * variants.length)];

    const x = spawnOnScreen
      ? this.width * (0.12 + Math.random() * 0.76)
      : direction === 1
        ? -26
        : this.width + 26;

    return {
      id: this.nextFlyId++,
      species,
      points,
      x,
      y: baseY,
      baseY,
      vx: direction * baseSpeed,
      direction,
      age: Math.random() * 8,
      amp1: (18 + Math.random() * 34) * waveAmpScale,
      freq1: (2.0 + Math.random() * 2.2) * waveFreqScale,
      phase1: Math.random() * Math.PI * 2,
      amp2: (8 + Math.random() * 20) * waveAmpScale,
      freq2: (4.5 + Math.random() * 3.8) * waveFreqScale,
      phase2: Math.random() * Math.PI * 2,
      speedFlutterFreq: (2.2 + Math.random() * 2.0) * (species === 'fast' ? 1.35 : 1),
      speedFlutterAmp:
        species === 'fast'
          ? 0.2 + Math.random() * 0.24
          : 0.12 + Math.random() * 0.22,
      radius,
      wingPhase: Math.random() * Math.PI * 2,
      wingSpeed,
      variant,
      caught: false,
      stickOffsetX: 0,
      stickOffsetY: 0,
    };
  }

  public start(): void {
    if (this.rafId !== null) return;
    this.lastTimestamp = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;
      const dt = Math.min(Math.max(rawDt, 0), 0.05);

      this.update(dt);
      this.render();

      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  public destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.sound.setPlayingScreen(false);
    this.haptics.cancel();
  }

  public setDifficulty(difficulty: Difficulty): void {
    if (this.difficulty === difficulty) return;
    this.difficulty = difficulty;
    this.bestScore = this.loadBestScore(difficulty);
    if (this.status === 'TITLE_MENU') {
      this.seedInitialFlies(DIFFICULTY_CONFIG[difficulty].initialFlies);
    }
    this.emitHudSnapshot(true);
  }

  public returnToTitle(): void {
    this.status = 'TITLE_MENU';
    this.slowMoTimer = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.sound.setPlayingScreen(false);
    this.haptics.cancel();
    this.powerUps = [];
    this.bursts = [];
    this.shockwaves = [];
    this.ripples = [];
    this.floatingTexts = [];
    this.bestScore = this.loadBestScore(this.difficulty);
    this.resetTongue();
    this.seedInitialFlies(DIFFICULTY_CONFIG[this.difficulty].initialFlies);
    this.emitHudSnapshot(true);
  }

  public startGame(): void {
    const tuning = DIFFICULTY_CONFIG[this.difficulty];
    this.status = 'PLAYING';
    this.sound.setPlayingScreen(true);
    this.score = 0;
    this.timeLeft = ROUND_DURATION;
    this.lastAnnouncedSecond = ROUND_DURATION;
    this.fliesCaught = 0;
    this.shotsFired = 0;
    this.isNewBest = false;
    this.bestScore = this.loadBestScore(this.difficulty);
    this.comboCount = 0;
    this.comboTimer = 0;
    this.maxCombo = 0;
    this.flySpawnTimer = 0.25;
    this.powerUps = [];
    this.powerUpSpawnTimer = 7.0 + Math.random() * 2.5;
    this.slowMoTimer = 0;
    this.bursts = [];
    this.shockwaves = [];
    this.ripples = [];
    this.floatingTexts = [];
    this.hitstopTimer = 0;
    this.shakeMagnitude = 0;
    this.colorCycleTimer = COLOR_CYCLE_INTERVAL;
    this.chameleon.colorIndex = 0;
    this.chameleon.prevColorIndex = 0;
    this.chameleon.colorBlend = 1;

    this.resetTongue();
    this.seedInitialFlies(tuning.initialFlies);
    this.emitHudSnapshot(true);
  }

  public togglePause(): void {
    if (this.status === 'PLAYING') {
      this.status = 'PAUSED';
      this.sound.setPlayingScreen(false);
      this.haptics.cancel();
      this.emitHudSnapshot(true);
    } else if (this.status === 'PAUSED') {
      this.status = 'PLAYING';
      this.sound.setPlayingScreen(true);
      this.emitHudSnapshot(true);
    }
  }

  public handleScreenHidden(): void {
    // Always stop all game audio & haptics when screen turns off or user leaves the app
    this.sound.setPlayingScreen(false);
    this.haptics.cancel();
    if (this.status === 'PLAYING') {
      this.status = 'PAUSED';
      this.emitHudSnapshot(true);
    }
  }

  public handlePointerMove(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.pointerX = clientX - rect.left;
    this.pointerY = clientY - rect.top;
    this.hasPointerMoved = true;
  }

  public handlePointerDown(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    this.pointerX = x;
    this.pointerY = y;
    this.hasPointerMoved = true;

    if (this.status !== 'PLAYING') return;

    this.sound.setPlayingScreen(true);
    this.shootTongue(x, y);
  }

  private resetTongue(): void {
    this.tongue.phase = 'IDLE';
    this.tongue.progress = 0;
    this.tongue.caughtFlies = [];
    this.tongue.caughtPowerUps = [];
    this.tongue.bufferedClick = null;
    this.syncChameleonAnchors();
  }

  private shootTongue(targetX: number, targetY: number): void {
    if (this.tongue.phase !== 'IDLE') {
      // Buffer one rapid click near end of retraction so fast clicking feels responsive
      if (this.tongue.phase === 'RETRACTING' && this.tongue.progress < 0.35) {
        this.tongue.bufferedClick = { x: targetX, y: targetY };
      }
      return;
    }

    this.syncChameleonAnchors();
    const ox = this.chameleon.mouthX;
    const oy = this.chameleon.mouthY;

    let dx = targetX - ox;
    let dy = targetY - oy;
    let dist = Math.hypot(dx, dy);

    if (dist < 48) {
      if (dist < 1) {
        dx = 0;
        dy = -1;
        dist = 1;
      }
      const scale = 48 / dist;
      dx *= scale;
      dy *= scale;
      dist = 48;
    }

    const clampedTargetX = ox + dx;
    const clampedTargetY = oy + dy;

    this.tongue.phase = 'EXTENDING';
    this.tongue.originX = ox;
    this.tongue.originY = oy;
    this.tongue.targetX = clampedTargetX;
    this.tongue.targetY = clampedTargetY;
    this.tongue.tipX = ox;
    this.tongue.tipY = oy;
    this.tongue.prevTipX = ox;
    this.tongue.prevTipY = oy;
    this.tongue.progress = 0;
    this.tongue.distance = dist;
    this.tongue.caughtFlies = [];
    this.tongue.caughtPowerUps = [];
    this.tongue.bufferedClick = null;

    this.shotsFired += 1;
    this.chameleon.shootPulse = 0.18;
    this.ripples.push({
      x: targetX,
      y: targetY,
      age: 0,
      maxAge: 0.34,
    });

    this.sound.playTongueSnap();
    this.emitHudSnapshot();
  }

  private update(dt: number): void {
    if (this.status === 'PAUSED') {
      return;
    }

    this.elapsedTotal += dt;

    // Update ambient dust motes even on title/game-over screens
    this.updateDust(dt);
    this.updateChameleon(dt);
    this.updateRipples(dt);
    this.updateBursts(dt);
    this.updateShockwaves(dt);
    this.updateFloatingTexts(dt);

    if (this.shakeMagnitude > 0.1) {
      this.shakeMagnitude *= Math.pow(0.001, dt);
      this.shakeX = (Math.random() * 2 - 1) * this.shakeMagnitude;
      this.shakeY = (Math.random() * 2 - 1) * this.shakeMagnitude;
    } else {
      this.shakeMagnitude = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }

    // Brief micro-hitstop for crisp tactile fly catch impact
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    // Always animate buzzing flies on Title Screen and during Playing
    if (this.status === 'TITLE_MENU') {
      this.updateFlies(dt);
    } else if (this.status === 'PLAYING') {
      if (this.slowMoTimer > 0) {
        this.slowMoTimer = Math.max(0, this.slowMoTimer - dt);
      }
      if (this.comboTimer > 0) {
        this.comboTimer = Math.max(0, this.comboTimer - dt);
        if (this.comboTimer <= 0) {
          this.comboCount = 0;
        }
      }
      const flyDt = this.slowMoTimer > 0 ? dt * SLOW_MO_FLY_FACTOR : dt;
      this.updateFlies(flyDt);
      this.updatePowerUps(dt);
      this.updateTongue(dt);
      this.updateCountdown(dt);
      this.emitHudSnapshot();
    }
  }

  private updateChameleon(dt: number): void {
    this.chameleon.idlePhase += dt;
    this.syncChameleonAnchors();

    // Eye tracking toward mouse cursor in real time
    const dxL = this.pointerX - this.chameleon.leftEyeX;
    const dyL = this.pointerY - this.chameleon.leftEyeY;
    this.chameleon.eyeAngleLeft = Math.atan2(dyL, dxL);
    this.chameleon.eyeDistLeft = Math.min(1, Math.hypot(dxL, dyL) / 140);

    const dxR = this.pointerX - this.chameleon.rightEyeX;
    const dyR = this.pointerY - this.chameleon.rightEyeY;
    this.chameleon.eyeAngleRight = Math.atan2(dyR, dxR);
    this.chameleon.eyeDistRight = Math.min(1, Math.hypot(dxR, dyR) / 140);

    // Natural occasional blink
    this.chameleon.blinkTimer -= dt;
    if (this.chameleon.blinkTimer <= 0) {
      if (!this.chameleon.isBlinking) {
        this.chameleon.isBlinking = true;
        this.chameleon.blinkTimer = 0.11;
      } else {
        this.chameleon.isBlinking = false;
        this.chameleon.blinkTimer = 3.0 + Math.random() * 3.2;
      }
    }

    if (this.chameleon.gulpTimer > 0) {
      this.chameleon.gulpTimer = Math.max(0, this.chameleon.gulpTimer - dt);
    }
    if (this.chameleon.shootPulse > 0) {
      this.chameleon.shootPulse = Math.max(0, this.chameleon.shootPulse - dt);
    }
    if (this.chameleon.hueShift > 0) {
      this.chameleon.hueShift = Math.max(0, this.chameleon.hueShift - dt * 1.4);
    }

    // Smoothly change chameleon color every 10 seconds
    if (this.status === 'TITLE_MENU' || this.status === 'PLAYING') {
      this.colorCycleTimer -= dt;
      if (this.colorCycleTimer <= 0) {
        this.colorCycleTimer += COLOR_CYCLE_INTERVAL;
        this.chameleon.prevColorIndex = this.chameleon.colorIndex;
        this.chameleon.colorIndex = (this.chameleon.colorIndex + 1) % COLOR_MORPH_COUNT;
        this.chameleon.colorBlend = 0;
        this.spawnBurst(
          this.chameleon.x,
          this.chameleon.y - 16,
          10,
          '#fef08a',
          '#a7f3d0'
        );
      }

      if (this.chameleon.colorBlend < 1) {
        this.chameleon.colorBlend = Math.min(
          1,
          this.chameleon.colorBlend + dt / COLOR_MORPH_DURATION
        );
      }
    }
  }

  private updateDust(dt: number): void {
    for (const p of this.dust) {
      p.x += p.vx * dt + Math.sin(this.elapsedTotal * 0.8 + p.phase) * 5 * dt;
      p.y += p.vy * dt;

      if (p.y < -10) {
        p.y = this.height * 0.88;
        p.x = Math.random() * this.width;
      }
      if (p.x < -10) p.x = this.width + 10;
      if (p.x > this.width + 10) p.x = -10;
    }
  }

  private updateFlies(dt: number): void {
    const tuning = DIFFICULTY_CONFIG[this.difficulty];
    const elapsedRatio =
      this.status === 'PLAYING' ? 1 - this.timeLeft / ROUND_DURATION : 0;
    const targetFlyCount =
      this.status === 'PLAYING'
        ? Math.round(tuning.baseFlyCount + elapsedRatio * tuning.maxBonusFlies)
        : tuning.initialFlies;
    const spawnInterval = Math.max(
      tuning.spawnIntervalMin,
      tuning.spawnIntervalStart -
        elapsedRatio * (tuning.spawnIntervalStart - tuning.spawnIntervalMin)
    );

    this.flySpawnTimer -= dt;
    const activeUncaught = this.flies.filter((f) => !f.caught).length;
    if (this.flySpawnTimer <= 0 && activeUncaught < targetFlyCount) {
      this.flies.push(this.createFly(false));
      this.flySpawnTimer = spawnInterval;
    }

    const minBoundY = Math.min(82, Math.round(this.height * 0.15));
    const maxBoundY = Math.max(minBoundY + 40, this.height - 175);

    for (let i = this.flies.length - 1; i >= 0; i--) {
      const fly = this.flies[i];
      fly.wingPhase += fly.wingSpeed * dt;

      if (fly.caught) {
        continue;
      }

      fly.age += dt;
      const speedMod =
        1 + Math.sin(fly.age * fly.speedFlutterFreq) * fly.speedFlutterAmp;
      fly.x += fly.vx * speedMod * dt;

      const waveY =
        Math.sin(fly.age * fly.freq1 + fly.phase1) * fly.amp1 +
        Math.cos(fly.age * fly.freq2 + fly.phase2) * fly.amp2;

      fly.y = Math.max(minBoundY, Math.min(maxBoundY, fly.baseY + waveY));

      if (
        (fly.direction === 1 && fly.x > this.width + 48) ||
        (fly.direction === -1 && fly.x < -48)
      ) {
        this.flies.splice(i, 1);
      }
    }
  }

  private createPowerUp(): PowerUp {
    const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const minY = 104;
    const maxY = Math.max(minY + 40, this.height - 205);
    const baseY = minY + Math.random() * (maxY - minY);

    // Slightly favor Time Bonus when timer is under 20s, otherwise 50/50
    const timeBias = this.timeLeft < 20 ? 0.62 : 0.5;
    const type: PowerUpType = Math.random() < timeBias ? 'time_bonus' : 'slow_mo';
    const speed = 82 + Math.random() * 34;

    return {
      id: this.nextPowerUpId++,
      type,
      x: direction === 1 ? -32 : this.width + 32,
      y: baseY,
      baseY,
      vx: direction * speed,
      direction,
      age: 0,
      bobAmp: 16 + Math.random() * 14,
      bobFreq: 2.1 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
      radius: 19,
      caught: false,
      stickOffsetX: 0,
      stickOffsetY: 0,
    };
  }

  private updatePowerUps(dt: number): void {
    const activeUncaught = this.powerUps.filter((p) => !p.caught).length;
    if (activeUncaught === 0) {
      this.powerUpSpawnTimer -= dt;
      if (this.powerUpSpawnTimer <= 0) {
        this.powerUps.push(this.createPowerUp());
        this.powerUpSpawnTimer = 9.0 + Math.random() * 5.0;
      }
    }

    const minBoundY = 92;
    const maxBoundY = Math.max(minBoundY + 40, this.height - 190);

    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      if (p.caught) continue;

      p.age += dt;
      p.x += p.vx * dt;
      p.y = Math.max(
        minBoundY,
        Math.min(maxBoundY, p.baseY + Math.sin(p.age * p.bobFreq + p.phase) * p.bobAmp)
      );

      if (
        (p.direction === 1 && p.x > this.width + 48) ||
        (p.direction === -1 && p.x < -48)
      ) {
        this.powerUps.splice(i, 1);
      }
    }
  }

  private updateTongue(dt: number): void {
    if (this.tongue.phase === 'IDLE') {
      if (this.tongue.bufferedClick) {
        const next = this.tongue.bufferedClick;
        this.tongue.bufferedClick = null;
        this.shootTongue(next.x, next.y);
      }
      return;
    }

    const extendSpeedPx = 1850;
    const retractSpeedPx = 1650;
    const dist = Math.max(1, this.tongue.distance);

    this.tongue.prevTipX = this.tongue.tipX;
    this.tongue.prevTipY = this.tongue.tipY;

    if (this.tongue.phase === 'EXTENDING') {
      this.tongue.progress += (extendSpeedPx / dist) * dt;
      if (this.tongue.progress >= 1) {
        this.tongue.progress = 1;
        this.tongue.phase = 'RETRACTING';
      }
    } else if (this.tongue.phase === 'RETRACTING') {
      this.tongue.progress -= (retractSpeedPx / dist) * dt;
      if (this.tongue.progress <= 0) {
        this.tongue.progress = 0;
        this.completeTongueRetract();
        return;
      }
    }

    // Ease slightly near apex for elastic snap feel
    const p = this.tongue.progress;
    const eased = 1 - Math.pow(1 - p, 1.35);
    this.tongue.tipX =
      this.tongue.originX + (this.tongue.targetX - this.tongue.originX) * eased;
    this.tongue.tipY =
      this.tongue.originY + (this.tongue.targetY - this.tongue.originY) * eased;

    // Update position of any flies or power-ups stuck to the tongue tip
    for (const caught of this.tongue.caughtFlies) {
      caught.x = this.tongue.tipX + caught.stickOffsetX;
      caught.y = this.tongue.tipY + caught.stickOffsetY;
    }
    for (const caught of this.tongue.caughtPowerUps) {
      caught.x = this.tongue.tipX + caught.stickOffsetX;
      caught.y = this.tongue.tipY + caught.stickOffsetY;
    }

    // Swept collision check against uncaught flies and power-ups during BOTH extending and retracting
    const tipCatchRadius = 24;
    let grabbedItem = false;

    for (const fly of this.flies) {
      if (fly.caught) continue;
      const hitRadius = fly.radius + tipCatchRadius;
      const dSq = pointToSegmentDistSq(
        fly.x,
        fly.y,
        this.tongue.prevTipX,
        this.tongue.prevTipY,
        this.tongue.tipX,
        this.tongue.tipY
      );

      if (dSq <= hitRadius * hitRadius) {
        fly.caught = true;
        fly.stickOffsetX = (Math.random() - 0.5) * 6;
        fly.stickOffsetY = (Math.random() - 0.5) * 6;
        fly.x = this.tongue.tipX + fly.stickOffsetX;
        fly.y = this.tongue.tipY + fly.stickOffsetY;
        this.tongue.caughtFlies.push(fly);
        grabbedItem = true;

        this.spawnFlyExplosion(fly, fly.x, fly.y, 1.0);
        this.sound.playFlyStick();
      }
    }

    for (const pu of this.powerUps) {
      if (pu.caught) continue;
      const hitRadius = pu.radius + tipCatchRadius;
      const dSq = pointToSegmentDistSq(
        pu.x,
        pu.y,
        this.tongue.prevTipX,
        this.tongue.prevTipY,
        this.tongue.tipX,
        this.tongue.tipY
      );

      if (dSq <= hitRadius * hitRadius) {
        pu.caught = true;
        pu.stickOffsetX = 0;
        pu.stickOffsetY = 0;
        pu.x = this.tongue.tipX;
        pu.y = this.tongue.tipY;
        this.tongue.caughtPowerUps.push(pu);
        grabbedItem = true;

        if (pu.type === 'time_bonus') {
          this.spawnBurst(pu.x, pu.y, 14, '#fde047', '#f59e0b');
        } else {
          this.spawnBurst(pu.x, pu.y, 14, '#67e8f9', '#06b6d4');
        }
        this.sound.playFlyStick();
      }
    }

    if (grabbedItem) {
      this.hitstopTimer = 0.032;
      if (this.tongue.phase === 'EXTENDING') {
        this.tongue.phase = 'RETRACTING';
      }
    }
  }

  private completeTongueRetract(): void {
    const swallowed = this.tongue.caughtFlies;
    const swallowedPowerUps = this.tongue.caughtPowerUps;

    let flyHapticsInfo: {
      count: number;
      multiplier: number;
      isBonusSpecies: boolean;
    } | null = null;
    let triggeredPowerUpType: PowerUpType | null = null;

    if (swallowed.length > 0) {
      let totalGained = 0;
      let highestMultiplier = 1;
      let hasGold = false;
      let hasFast = false;

      swallowed.forEach((fly, idx) => {
        this.comboCount += 1;
        const multiplier = Math.min(MAX_COMBO_MULTIPLIER, this.comboCount);
        const flyPoints = fly.points * multiplier;
        totalGained += flyPoints;
        highestMultiplier = Math.max(highestMultiplier, multiplier);
        this.maxCombo = Math.max(this.maxCombo, multiplier);

        if (fly.species === 'gold') hasGold = true;
        if (fly.species === 'fast') hasFast = true;

        let text = multiplier > 1 ? `+${flyPoints} · ${multiplier}x` : `+${flyPoints}`;
        let textColor =
          multiplier >= 4 ? '#fb7185' : multiplier >= 2 ? '#fb923c' : '#fde047';

        if (fly.species === 'gold') {
          text =
            multiplier > 1
              ? `+${flyPoints} · ${multiplier}x GOLD!`
              : `+${flyPoints} · GOLD!`;
          textColor = '#fef08a';
        } else if (fly.species === 'fast') {
          text =
            multiplier > 1
              ? `+${flyPoints} · ${multiplier}x FAST!`
              : `+${flyPoints} · FAST!`;
          textColor = '#fda4af';
        }

        this.floatingTexts.push({
          x: this.chameleon.mouthX + (idx - (swallowed.length - 1) * 0.5) * 32,
          y: this.chameleon.mouthY - 34 - idx * 18,
          text,
          vy: -62,
          age: 0,
          maxAge: 0.98,
          color: textColor,
        });
      });

      this.comboTimer = COMBO_WINDOW;
      this.score += totalGained;
      this.fliesCaught += swallowed.length;

      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        this.isNewBest = true;
        this.saveBestScore(this.difficulty, this.bestScore);
      }

      // Remove swallowed flies from active list
      const swallowedIds = new Set(swallowed.map((f) => f.id));
      this.flies = this.flies.filter((f) => !swallowedIds.has(f.id));

      this.chameleon.gulpTimer = 0.28;
      this.chameleon.hueShift = 1.0;
      this.shakeMagnitude = hasGold ? 5.0 : 3.5;

      this.sound.playFlyGulp(highestMultiplier, hasGold);
      flyHapticsInfo = {
        count: swallowed.length,
        multiplier: highestMultiplier,
        isBonusSpecies: hasGold || hasFast,
      };
      swallowed.forEach((fly) => {
        this.spawnFlyExplosion(
          fly,
          this.chameleon.mouthX,
          this.chameleon.mouthY - 8,
          0.75
        );
      });
    } else if (swallowedPowerUps.length === 0) {
      // Missing a shot breaks any active combo streak
      const hadComboStreak = this.comboCount >= 2;
      this.comboCount = 0;
      this.comboTimer = 0;
      if (hadComboStreak) {
        this.floatingTexts.push({
          x: this.chameleon.mouthX,
          y: this.chameleon.mouthY - 34,
          text: 'Combo Lost',
          vy: -42,
          age: 0,
          maxAge: 0.75,
          color: '#fca5a5',
        });
      }
    } else if (this.comboCount > 0) {
      // Catching a power-up keeps an existing streak alive
      this.comboTimer = COMBO_WINDOW;
    }

    if (swallowedPowerUps.length > 0) {
      const puIds = new Set(swallowedPowerUps.map((p) => p.id));
      this.powerUps = this.powerUps.filter((p) => !puIds.has(p.id));

      this.chameleon.gulpTimer = 0.28;
      this.chameleon.hueShift = 1.0;
      this.shakeMagnitude = 4.0;

      swallowedPowerUps.forEach((pu, idx) => {
        triggeredPowerUpType = pu.type;
        const yOffset = swallowed.length > 0 ? -58 - idx * 24 : -38 - idx * 24;
        if (pu.type === 'time_bonus') {
          this.timeLeft += TIME_BONUS_SECONDS;
          this.lastAnnouncedSecond = Math.ceil(this.timeLeft);
          this.sound.playPowerUpTime();
          this.spawnBurst(
            this.chameleon.mouthX,
            this.chameleon.mouthY - 8,
            16,
            '#fde047',
            '#fb923c'
          );
          this.floatingTexts.push({
            x: this.chameleon.mouthX,
            y: this.chameleon.mouthY + yOffset,
            text: `+${TIME_BONUS_SECONDS}s`,
            vy: -66,
            age: 0,
            maxAge: 1.1,
            color: '#fde047',
          });
        } else {
          this.slowMoTimer = SLOW_MO_DURATION;
          this.sound.playPowerUpSlowMo();
          this.spawnBurst(
            this.chameleon.mouthX,
            this.chameleon.mouthY - 8,
            16,
            '#67e8f9',
            '#38bdf8'
          );
          this.floatingTexts.push({
            x: this.chameleon.mouthX,
            y: this.chameleon.mouthY + yOffset,
            text: 'SLOW-MO!',
            vy: -66,
            age: 0,
            maxAge: 1.1,
            color: '#67e8f9',
          });
        }
      });
    }

    if (triggeredPowerUpType) {
      this.haptics.playPowerUp(triggeredPowerUpType);
    } else if (flyHapticsInfo) {
      this.haptics.playFlyCatch(
        flyHapticsInfo.count,
        flyHapticsInfo.multiplier,
        flyHapticsInfo.isBonusSpecies
      );
    }

    this.resetTongue();
    this.emitHudSnapshot();

    if (this.tongue.bufferedClick && this.status === 'PLAYING') {
      const next = this.tongue.bufferedClick;
      this.tongue.bufferedClick = null;
      this.shootTongue(next.x, next.y);
    }
  }

  private updateCountdown(dt: number): void {
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    const ceilSec = Math.ceil(this.timeLeft);

    if (ceilSec !== this.lastAnnouncedSecond) {
      this.lastAnnouncedSecond = ceilSec;
      if (ceilSec > 0 && ceilSec <= 5) {
        this.sound.playCountdownTick();
      }
    }

    if (this.timeLeft <= 0) {
      // Credit any fly or power-up already stuck on the tongue as time expires
      if (
        this.tongue.caughtFlies.length > 0 ||
        this.tongue.caughtPowerUps.length > 0
      ) {
        this.completeTongueRetract();
      } else {
        this.resetTongue();
      }

      if (this.timeLeft <= 0) {
        this.slowMoTimer = 0;
        this.comboTimer = 0;
        this.comboCount = 0;
        this.status = 'GAME_OVER';
        this.sound.finishRoundWithChime(this.isNewBest && this.score > 0);
        this.emitHudSnapshot(true);
      }
    }
  }

  private getFlyExplosionPalette(fly: Fly): {
    colors: string[];
    ringColor: string;
  } {
    if (fly.species === 'gold') {
      return {
        colors: ['#fef9c3', '#fde047', '#f59e0b', '#fbbf24', '#ffffff'],
        ringColor: '#fde047',
      };
    }
    if (fly.species === 'fast') {
      return {
        colors: ['#fb7185', '#f43f5e', '#38bdf8', '#67e8f9', '#ffe4e6'],
        ringColor: '#fb7185',
      };
    }
    if (fly.variant === 'amber') {
      return {
        colors: ['#fbbf24', '#fb923c', '#fde68a', '#fef08a'],
        ringColor: '#fbbf24',
      };
    }
    if (fly.variant === 'cobalt') {
      return {
        colors: ['#38bdf8', '#60a5fa', '#bae6fd', '#818cf8'],
        ringColor: '#38bdf8',
      };
    }
    return {
      colors: ['#34d399', '#4ade80', '#a7f3d0', '#bef264'],
      ringColor: '#4ade80',
    };
  }

  private spawnFlyExplosion(
    fly: Fly,
    x: number,
    y: number,
    intensity = 1.0
  ): void {
    const { colors, ringColor } = this.getFlyExplosionPalette(fly);
    const isGold = fly.species === 'gold';
    const isFast = fly.species === 'fast';
    const count = Math.round((isGold ? 28 : isFast ? 24 : 20) * intensity);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const speed = (105 + Math.random() * 215) * (isFast ? 1.2 : 1) * intensity;
      let shape: BurstShape = 'orb';
      if (isGold && i % 3 === 0) {
        shape = 'star';
      } else if (i % 2 === 0 || (isFast && i % 3 !== 0)) {
        shape = 'spark';
      }

      this.bursts.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 18,
        radius:
          shape === 'star'
            ? 3.8 + Math.random() * 2.4
            : shape === 'spark'
              ? 2.2 + Math.random() * 1.8
              : 2.6 + Math.random() * 3.0,
        color: colors[i % colors.length],
        age: 0,
        maxAge: (0.36 + Math.random() * 0.28) * (isGold ? 1.15 : 1),
        shape,
        drag: shape === 'spark' ? 0.04 : 0.09,
        gravity: shape === 'spark' ? 95 : 185,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 10,
      });
    }

    this.shockwaves.push({
      x,
      y,
      startRadius: 6,
      endRadius: (isGold ? 54 : isFast ? 46 : 38) * intensity,
      color: ringColor,
      lineWidth: isGold ? 3.2 : 2.5,
      age: 0,
      maxAge: isGold ? 0.38 : 0.3,
    });

    if (isGold) {
      this.shockwaves.push({
        x,
        y,
        startRadius: 3,
        endRadius: 34 * intensity,
        color: '#fef9c3',
        lineWidth: 2.0,
        age: 0,
        maxAge: 0.24,
      });
    }
  }

  private spawnBurst(
    x: number,
    y: number,
    count: number,
    colorA: string,
    colorB: string
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 55 + Math.random() * 115;
      this.bursts.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        radius: 2.2 + Math.random() * 2.8,
        color: i % 2 === 0 ? colorA : colorB,
        age: 0,
        maxAge: 0.35 + Math.random() * 0.2,
        shape: i % 3 === 0 ? 'star' : 'orb',
        drag: 0.16,
        gravity: 160,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 6,
      });
    }
  }

  private updateBursts(dt: number): void {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.age += dt;
      const damp = Math.pow(b.drag, dt);
      b.vx *= damp;
      b.vy *= damp;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += b.gravity * dt;
      b.rotation += b.spin * dt;
      if (b.age >= b.maxAge) {
        this.bursts.splice(i, 1);
      }
    }
  }

  private updateShockwaves(dt: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.age += dt;
      if (sw.age >= sw.maxAge) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  private updateRipples(dt: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.age += dt;
      if (r.age >= r.maxAge) {
        this.ripples.splice(i, 1);
      }
    }
  }

  private updateFloatingTexts(dt: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.age += dt;
      ft.y += ft.vy * dt;
      ft.vy *= Math.pow(0.25, dt);
      if (ft.age >= ft.maxAge) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private emitHudSnapshot(force = false): void {
    const displayTime = Math.ceil(this.timeLeft);
    const slowMoDisplay =
      this.slowMoTimer > 0 ? Math.ceil(this.slowMoTimer * 10) / 10 : 0;
    const comboMultiplier =
      this.comboCount > 0 ? Math.min(MAX_COMBO_MULTIPLIER, this.comboCount) : 1;
    const comboTimeDisplay =
      this.comboTimer > 0 ? Math.ceil(this.comboTimer * 10) / 10 : 0;
    const key = `${this.status}|${this.difficulty}|${this.score}|${displayTime}|${this.fliesCaught}|${this.shotsFired}|${this.bestScore}|${this.isNewBest}|${slowMoDisplay}|${this.comboCount}|${comboMultiplier}|${comboTimeDisplay}|${this.maxCombo}`;
    if (!force && key === this.lastSnapshotKey) return;
    this.lastSnapshotKey = key;

    this.onHudChange({
      status: this.status,
      difficulty: this.difficulty,
      score: this.score,
      timeLeft: displayTime,
      fliesCaught: this.fliesCaught,
      shotsFired: this.shotsFired,
      bestScore: this.bestScore,
      isNewBest: this.isNewBest,
      slowMoTimeLeft: slowMoDisplay,
      comboCount: this.comboCount,
      comboMultiplier,
      comboTimeLeft: comboTimeDisplay,
      comboDuration: COMBO_WINDOW,
      maxCombo: this.maxCombo,
    });
  }

  private render(): void {
    this.renderer.render({
      ctx: this.ctx,
      width: this.width,
      height: this.height,
      dpr: this.dpr,
      time: this.elapsedTotal,
      chameleon: this.chameleon,
      tongue: this.tongue,
      flies: this.flies,
      powerUps: this.powerUps,
      slowMoTimer: this.slowMoTimer,
      dust: this.dust,
      bursts: this.bursts,
      shockwaves: this.shockwaves,
      ripples: this.ripples,
      floatingTexts: this.floatingTexts,
      shakeX: this.shakeX,
      shakeY: this.shakeY,
    });
  }
}
