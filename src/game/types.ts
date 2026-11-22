export type GameStatus = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type FlyVariant = 'emerald' | 'amber' | 'cobalt';

export type FlySpecies = 'normal' | 'gold' | 'fast';

export interface Fly {
  id: number;
  species: FlySpecies;
  points: number;
  x: number;
  y: number;
  baseY: number;
  vx: number;
  direction: 1 | -1;
  age: number;
  amp1: number;
  freq1: number;
  phase1: number;
  amp2: number;
  freq2: number;
  phase2: number;
  speedFlutterFreq: number;
  speedFlutterAmp: number;
  radius: number;
  wingPhase: number;
  wingSpeed: number;
  variant: FlyVariant;
  caught: boolean;
  stickOffsetX: number;
  stickOffsetY: number;
}

export type PowerUpType = 'time_bonus' | 'slow_mo';

export interface PowerUp {
  id: number;
  type: PowerUpType;
  x: number;
  y: number;
  baseY: number;
  vx: number;
  direction: 1 | -1;
  age: number;
  bobAmp: number;
  bobFreq: number;
  phase: number;
  radius: number;
  caught: boolean;
  stickOffsetX: number;
  stickOffsetY: number;
}

export type TonguePhase = 'IDLE' | 'EXTENDING' | 'RETRACTING';

export interface TongueState {
  phase: TonguePhase;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  tipX: number;
  tipY: number;
  prevTipX: number;
  prevTipY: number;
  progress: number;
  distance: number;
  caughtFlies: Fly[];
  caughtPowerUps: PowerUp[];
  bufferedClick: { x: number; y: number } | null;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  vy: number;
  age: number;
  maxAge: number;
  color: string;
}

export interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  phase: number;
  twinkleSpeed: number;
}

export type BurstShape = 'orb' | 'spark' | 'star';

export interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  age: number;
  maxAge: number;
  shape: BurstShape;
  drag: number;
  gravity: number;
  rotation: number;
  spin: number;
}

export interface ShockwaveRing {
  x: number;
  y: number;
  startRadius: number;
  endRadius: number;
  color: string;
  lineWidth: number;
  age: number;
  maxAge: number;
}

export interface ClickRipple {
  x: number;
  y: number;
  age: number;
  maxAge: number;
}

export interface ChameleonVisualState {
  x: number;
  y: number;
  mouthX: number;
  mouthY: number;
  leftEyeX: number;
  leftEyeY: number;
  rightEyeX: number;
  rightEyeY: number;
  eyeAngleLeft: number;
  eyeAngleRight: number;
  eyeDistLeft: number;
  eyeDistRight: number;
  blinkTimer: number;
  isBlinking: boolean;
  gulpTimer: number;
  shootPulse: number;
  hueShift: number;
  idlePhase: number;
  colorIndex: number;
  prevColorIndex: number;
  colorBlend: number;
}

export interface HudSnapshot {
  status: GameStatus;
  difficulty: Difficulty;
  score: number;
  timeLeft: number;
  fliesCaught: number;
  shotsFired: number;
  bestScore: number;
  isNewBest: boolean;
  slowMoTimeLeft: number;
  comboCount: number;
  comboMultiplier: number;
  comboTimeLeft: number;
  comboDuration: number;
  maxCombo: number;
}
