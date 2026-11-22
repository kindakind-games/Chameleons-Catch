import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Droplets,
  Flame,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ChameleonGameEngine } from './game/engine';
import { Difficulty, HudSnapshot } from './game/types';
import { OfflineIndicator, PWAInstallButton } from './pwa/PWAControls';

type ScreenSize = 'big' | 'small';

const SCREEN_SIZE_STORAGE_KEY = 'chameleon_catch_screen_size';

const DIFFICULTY_OPTIONS: {
  id: Difficulty;
  label: string;
  hint: string;
}[] = [
  { id: 'easy', label: 'Easy', hint: 'Relaxed fly speed · Gentle spawns' },
  { id: 'medium', label: 'Medium', hint: 'Balanced arcade speed & spawns' },
  { id: 'hard', label: 'Hard', hint: 'Fast darting flies · Rapid spawns' },
];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

const INITIAL_HUD: HudSnapshot = {
  status: 'TITLE_MENU',
  difficulty: 'medium',
  score: 0,
  timeLeft: 60,
  fliesCaught: 0,
  shotsFired: 0,
  bestScore: 0,
  isNewBest: false,
  slowMoTimeLeft: 0,
  comboCount: 0,
  comboMultiplier: 1,
  comboTimeLeft: 0,
  comboDuration: 3.2,
  maxCombo: 0,
};

function loadInitialScreenSize(): ScreenSize {
  try {
    const saved = window.localStorage.getItem(SCREEN_SIZE_STORAGE_KEY);
    return saved === 'small' ? 'small' : 'big';
  } catch {
    return 'big';
  }
}

export default function App() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<ChameleonGameEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [muted, setMuted] = useState(false);
  const [screenSize, setScreenSize] = useState<ScreenSize>(loadInitialScreenSize);

  const isSmallScreen = screenSize === 'small';

  useEffect(() => {
    try {
      window.localStorage.setItem(SCREEN_SIZE_STORAGE_KEY, screenSize);
    } catch {
      // Ignore storage failures
    }
    const raf = requestAnimationFrame(() => {
      engineRef.current?.updateDimensions();
    });
    return () => cancelAnimationFrame(raf);
  }, [screenSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas) return;

    const engine = new ChameleonGameEngine(canvas, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;
    engine.start();

    const handleResize = () => {
      engine.updateDimensions();
    };

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && stage
        ? new ResizeObserver(() => {
            engine.updateDimensions();
          })
        : null;
    if (resizeObserver && stage) {
      resizeObserver.observe(stage);
    }

    const handleWindowMouseMove = (e: MouseEvent) => {
      engine.handlePointerMove(e.clientX, e.clientY);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        engine.handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleScreenHidden = () => {
      engine.handleScreenHidden();
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        engine.handleScreenHidden();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: true });
    window.addEventListener('pagehide', handleScreenHidden);
    window.addEventListener('blur', handleScreenHidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('freeze', handleScreenHidden);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('pagehide', handleScreenHidden);
      window.removeEventListener('blur', handleScreenHidden);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('freeze', handleScreenHidden);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleStartOrRestart = useCallback(() => {
    engineRef.current?.startGame();
  }, []);

  const handleSelectDifficulty = useCallback((difficulty: Difficulty) => {
    engineRef.current?.setDifficulty(difficulty);
  }, []);

  const handleReturnToTitle = useCallback(() => {
    engineRef.current?.returnToTitle();
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleToggleMute = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.sound.unlock();
    const nextMuted = engine.sound.toggleMute();
    setMuted(nextMuted);
  }, []);

  const handleToggleScreenSize = useCallback(() => {
    setScreenSize((prev) => (prev === 'big' ? 'small' : 'big'));
  }, []);

  // Keyboard shortcuts: Enter/Space to start or play again, Esc to pause/resume, M to mute
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (hud.status === 'PLAYING' || hud.status === 'PAUSED') {
          e.preventDefault();
          handleTogglePause();
        }
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        if (hud.status === 'TITLE_MENU' || hud.status === 'GAME_OVER') {
          e.preventDefault();
          handleStartOrRestart();
        } else if (hud.status === 'PAUSED') {
          e.preventDefault();
          handleTogglePause();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hud.status, handleStartOrRestart, handleTogglePause, handleToggleMute]);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    engineRef.current?.handlePointerDown(e.clientX, e.clientY);
  };

  const accuracy =
    hud.shotsFired > 0 ? Math.round((hud.fliesCaught / hud.shotsFired) * 100) : 0;
  const isUrgentTime = hud.status === 'PLAYING' && hud.timeLeft <= 10;

  return (
    <main className="relative flex h-dvh w-screen items-center justify-center overflow-hidden bg-[#04110b] select-none">
      {/* Subtle outer jungle vignette visible when Small Screen mode is active */}
      {isSmallScreen && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(22,83,52,0.32),rgba(4,17,11,0.96)_72%)]"
        />
      )}

      {/* Game Playfield Stage (Big = Full Screen, Small = Compact Thumb-Reach Screen) */}
      <div
        ref={stageRef}
        data-testid="game-stage"
        className={
          isSmallScreen
            ? 'relative h-[min(78dvh,600px)] w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-emerald-300/25 bg-[#071b12] shadow-2xl'
            : 'relative h-full w-full overflow-hidden bg-[#071b12]'
        }
      >
        {/* Isolated 60fps HTML5 Canvas Playfield */}
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          className={`block h-full w-full touch-none ${
            hud.status === 'PLAYING' ? 'cursor-crosshair' : 'cursor-default'
          }`}
          aria-label="Chameleon Catch game canvas"
        />

        {/* World-Matched, Low-Occlusion Perimeter HUD */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between ${
            isSmallScreen ? 'px-3 py-2.5' : 'px-4 py-3 sm:px-8 sm:py-5'
          }`}
        >
          {/* Top-Left: Score, Best & Live Combo Readout */}
          <div className="flex flex-col items-start gap-1.5">
            <div
              className={`flex flex-col gap-0.5 rounded-xl border border-emerald-300/15 bg-[#06180f]/80 shadow-lg ${
                isSmallScreen ? 'px-2.5 py-1.5' : 'px-3.5 py-2 sm:px-4 sm:py-2.5'
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-medium tracking-wide text-emerald-200/80 sm:text-xs">
                  Score
                </span>
                <span
                  data-testid="hud-score"
                  className={`font-mono-num font-bold leading-none text-[#fef08a] ${
                    isSmallScreen ? 'text-xl' : 'text-2xl sm:text-3xl'
                  }`}
                >
                  {hud.score}
                </span>
              </div>
              <div
                className={`flex items-center gap-1.5 text-emerald-100/70 ${
                  isSmallScreen ? 'text-[11px]' : 'text-xs'
                }`}
              >
                <span>Flies: {hud.fliesCaught}</span>
                <span aria-hidden="true">·</span>
                <span>Best: {hud.bestScore}</span>
                {!isSmallScreen && (
                  <>
                    <span className="hidden sm:inline" aria-hidden="true">
                      ·
                    </span>
                    <span className="hidden sm:inline">
                      {DIFFICULTY_LABELS[hud.difficulty]}
                    </span>
                  </>
                )}
              </div>
            </div>

            {hud.status === 'PLAYING' && hud.comboMultiplier > 1 && (
              <div
                data-testid="hud-combo"
                className={`flex flex-col gap-1 rounded-xl border border-amber-300/40 bg-[#271506]/90 shadow-lg ${
                  isSmallScreen ? 'px-2.5 py-1.5' : 'px-3.5 py-2'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  <span>Combo</span>
                  <span className="font-mono-num text-sm text-[#fef08a]">
                    {hud.comboMultiplier}x
                  </span>
                  <span className="font-mono-num font-medium text-amber-100/80">
                    +{hud.comboMultiplier * 10}/fly
                  </span>
                </div>
                <svg
                  viewBox="0 0 100 4"
                  className="h-1 w-full overflow-hidden rounded-full bg-amber-950/80"
                  aria-hidden="true"
                >
                  <rect
                    x="0"
                    y="0"
                    width={Math.max(
                      0,
                      Math.min(100, (hud.comboTimeLeft / hud.comboDuration) * 100)
                    )}
                    height="4"
                    rx="2"
                    fill="#fb923c"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Top-Right: 60s Countdown & Controls */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className={`flex flex-col items-end rounded-xl border shadow-lg transition-colors duration-150 ${
                  isSmallScreen ? 'px-2.5 py-1.5' : 'px-3 py-1.5 sm:px-4 sm:py-2'
                } ${
                  isUrgentTime
                    ? 'border-rose-400/50 bg-[#2b0c14]/90'
                    : 'border-emerald-300/15 bg-[#06180f]/80'
                }`}
              >
                <span
                  className={`text-[11px] font-medium sm:text-xs ${
                    isUrgentTime ? 'text-rose-200' : 'text-emerald-200/80'
                  }`}
                >
                  {isSmallScreen
                    ? 'Time'
                    : isUrgentTime
                      ? 'Hurry · Time Left'
                      : 'Time Left'}
                </span>
                <span
                  data-testid="hud-timer"
                  className={`font-mono-num font-bold leading-tight ${
                    isSmallScreen ? 'text-xl' : 'text-2xl sm:text-3xl'
                  } ${isUrgentTime ? 'text-rose-300' : 'text-[#f5f3e8]'}`}
                >
                  {hud.timeLeft}s
                </span>
              </div>

              <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
                {(hud.status === 'PAUSED' || hud.status === 'GAME_OVER') && (
                  <PWAInstallButton variant="hud" />
                )}

                <button
                  type="button"
                  onClick={handleToggleScreenSize}
                  aria-label={
                    isSmallScreen
                      ? 'Switch to big screen'
                      : 'Switch to small screen'
                  }
                  title={isSmallScreen ? 'Big Screen' : 'Small Screen'}
                  className={`flex items-center justify-center rounded-xl border border-emerald-300/20 bg-[#06180f]/85 text-emerald-100 transition-colors hover:border-emerald-300/45 hover:bg-[#0c2d1d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 cursor-pointer ${
                    isSmallScreen ? 'h-9 w-9' : 'h-10 w-10 sm:h-11 sm:w-11'
                  }`}
                >
                  {isSmallScreen ? (
                    <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleToggleMute}
                  aria-label={
                    muted ? 'Unmute sound effects' : 'Mute sound effects'
                  }
                  title={muted ? 'Unmute (M)' : 'Mute (M)'}
                  className={`flex items-center justify-center rounded-xl border border-emerald-300/20 bg-[#06180f]/85 text-emerald-100 transition-colors hover:border-emerald-300/45 hover:bg-[#0c2d1d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 cursor-pointer ${
                    isSmallScreen ? 'h-9 w-9' : 'h-10 w-10 sm:h-11 sm:w-11'
                  }`}
                >
                  {muted ? (
                    <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>

                {(hud.status === 'PLAYING' || hud.status === 'PAUSED') && (
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    aria-label={
                      hud.status === 'PAUSED' ? 'Resume game' : 'Pause game'
                    }
                    title={
                      hud.status === 'PAUSED' ? 'Resume (Esc)' : 'Pause (Esc)'
                    }
                    className={`flex items-center justify-center rounded-xl border border-emerald-300/20 bg-[#06180f]/85 text-emerald-100 transition-colors hover:border-emerald-300/45 hover:bg-[#0c2d1d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 cursor-pointer ${
                      isSmallScreen ? 'h-9 w-9' : 'h-10 w-10 sm:h-11 sm:w-11'
                    }`}
                  >
                    {hud.status === 'PAUSED' ? (
                      <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {hud.status === 'PLAYING' && hud.slowMoTimeLeft > 0 && (
              <div className="flex items-center gap-2 rounded-xl border border-cyan-300/35 bg-[#062229]/90 px-3 py-1.5 text-xs font-semibold text-cyan-200 shadow-lg">
                <Droplets className="h-3.5 w-3.5 text-cyan-300" />
                <span>Slow-Mo</span>
                <span className="font-mono-num text-cyan-100">
                  {hud.slowMoTimeLeft.toFixed(1)}s
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Title Screen Overlay (positioned cleanly above the chameleon perch) */}
        {hud.status === 'TITLE_MENU' && (
          <div
            className={`pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-3 ${
              isSmallScreen ? 'pt-14 pb-16' : 'px-4 pt-16 pb-24 sm:pb-32'
            }`}
          >
            <div
              className={`pointer-events-auto flex max-h-full w-full flex-col items-center overflow-y-auto rounded-2xl border border-emerald-300/25 bg-[#061a11]/90 text-center shadow-2xl ${
                isSmallScreen
                  ? 'max-w-sm px-4 py-4'
                  : 'max-w-lg px-5 py-6 sm:px-7 sm:py-8'
              }`}
            >
              {/* Bespoke inline SVG Title Lockup */}
              <svg
                viewBox="0 0 420 96"
                className={
                  isSmallScreen
                    ? 'mb-1.5 h-12 w-full max-w-[260px]'
                    : 'mb-2.5 h-16 w-full max-w-[340px] sm:mb-3 sm:h-20 sm:max-w-[380px]'
                }
                role="img"
                aria-label="Chameleon Catch"
              >
                <defs>
                  <linearGradient
                    id="titleGrad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="52%" stopColor="#86efac" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                {/* Decorative leaf & tongue curl accent */}
                <path
                  d="M 48 24 C 34 10, 14 14, 14 30 C 14 44, 34 46, 42 36"
                  fill="none"
                  stroke="#fb7185"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                <circle cx="43" cy="35" r="4.5" fill="#fb7185" />
                <text
                  x="222"
                  y="46"
                  textAnchor="middle"
                  fill="url(#titleGrad)"
                  fontFamily="Bricolage Grotesque, system-ui, sans-serif"
                  fontWeight="800"
                  fontSize="42"
                  letterSpacing="-0.5"
                >
                  Chameleon
                </text>
                <text
                  x="222"
                  y="84"
                  textAnchor="middle"
                  fill="#fda4af"
                  fontFamily="Bricolage Grotesque, system-ui, sans-serif"
                  fontWeight="800"
                  fontSize="36"
                  letterSpacing="1.5"
                >
                  Catch
                </text>
              </svg>

              <p
                className={`max-w-md leading-relaxed text-emerald-100/90 ${
                  isSmallScreen ? 'text-xs' : 'text-sm sm:text-base'
                }`}
              >
                Tap anywhere in the canopy to snap your stretchy tongue, catch
                buzzing flies, and chain quick catches for up to a 5x combo
                before the 60-second clock runs out.
              </p>

              {/* Difficulty Selector */}
              <div
                className={`flex w-full max-w-xs flex-col items-center gap-1.5 ${
                  isSmallScreen ? 'mt-3' : 'mt-4 sm:mt-5'
                }`}
              >
                <div
                  role="group"
                  aria-label="Difficulty"
                  className="grid w-full grid-cols-3 gap-1 rounded-xl border border-emerald-300/20 bg-[#04120b] p-1"
                >
                  {DIFFICULTY_OPTIONS.map((opt) => {
                    const active = hud.difficulty === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectDifficulty(opt.id)}
                        aria-pressed={active}
                        className={`rounded-lg px-2.5 py-1.5 font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
                          isSmallScreen ? 'min-h-[34px] text-xs' : 'min-h-[40px] text-sm'
                        } ${
                          active
                            ? 'bg-emerald-400 text-[#052013] shadow-sm'
                            : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-emerald-200/75 sm:text-xs">
                  {DIFFICULTY_OPTIONS.find((o) => o.id === hud.difficulty)?.hint}
                </span>
              </div>

              {/* Screen Size Selector: Big or Small */}
              <div className="mt-2.5 flex w-full max-w-xs items-center justify-between gap-2 rounded-xl border border-emerald-300/20 bg-[#04120b] p-1">
                <span className="pl-2.5 text-xs font-medium text-emerald-200/80">
                  Screen
                </span>
                <div
                  role="group"
                  aria-label="Screen size"
                  className="grid grid-cols-2 gap-1"
                >
                  <button
                    type="button"
                    onClick={() => setScreenSize('big')}
                    aria-pressed={screenSize === 'big'}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      isSmallScreen ? 'min-h-[32px]' : 'min-h-[36px]'
                    } ${
                      screenSize === 'big'
                        ? 'bg-amber-300 text-[#052013] shadow-sm'
                        : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
                    }`}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    <span>Big</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScreenSize('small')}
                    aria-pressed={screenSize === 'small'}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      isSmallScreen ? 'min-h-[32px]' : 'min-h-[36px]'
                    } ${
                      screenSize === 'small'
                        ? 'bg-amber-300 text-[#052013] shadow-sm'
                        : 'text-emerald-100/80 hover:bg-emerald-900/40 hover:text-white'
                    }`}
                  >
                    <Minimize2 className="h-3.5 w-3.5" />
                    <span>Small</span>
                  </button>
                </div>
              </div>

              <div
                className={`flex flex-wrap items-center justify-center gap-2.5 ${
                  isSmallScreen ? 'mt-3.5' : 'mt-4 sm:mt-5 sm:gap-3'
                }`}
              >
                <button
                  type="button"
                  onClick={handleStartOrRestart}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#fb7185] to-[#e11d48] font-display font-bold text-white shadow-lg transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 whitespace-nowrap cursor-pointer ${
                    isSmallScreen
                      ? 'min-h-[42px] px-6 py-2 text-base'
                      : 'min-h-[48px] px-8 py-3 text-lg'
                  }`}
                >
                  <Play className="h-5 w-5 fill-current" />
                  Start Game
                </button>
                <PWAInstallButton variant="card" />
              </div>

              <p
                className={`font-medium text-emerald-200/75 ${
                  isSmallScreen ? 'mt-2.5 text-[11px]' : 'mt-4 text-xs'
                }`}
              >
                Tap anywhere to shoot · Gold (+30) &amp; Fast (+20) flies ·
                Clocks (+5s) &amp; slow-mo drops
              </p>
            </div>
          </div>
        )}

        {/* Pause Modal */}
        {hud.status === 'PAUSED' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#030e09]/65 px-4">
            <div className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-emerald-300/25 bg-[#061a11]/95 px-6 py-6 text-center shadow-2xl">
              <h2 className="font-display text-2xl font-bold text-[#fef08a] sm:text-3xl">
                Game Paused
              </h2>
              <p className="mt-2 text-sm text-emerald-100/80">
                Score:{' '}
                <span className="font-mono-num font-bold text-white">
                  {hud.score}
                </span>
                <span className="mx-2" aria-hidden="true">
                  ·
                </span>
                Time Left:{' '}
                <span className="font-mono-num font-bold text-white">
                  {hud.timeLeft}s
                </span>
              </p>

              <div className="mt-5 flex w-full flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 font-display text-base font-bold text-[#052013] transition-colors hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 whitespace-nowrap cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Resume Game
                </button>
                <button
                  type="button"
                  onClick={handleStartOrRestart}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-[#0c2d1d] px-6 py-2.5 font-display text-base font-semibold text-emerald-100 transition-colors hover:bg-[#13422b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 whitespace-nowrap cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restart Round
                </button>
                <button
                  type="button"
                  onClick={handleToggleScreenSize}
                  className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-[#04120b] px-5 py-2 text-sm font-semibold text-emerald-100 transition-colors hover:bg-[#0c2d1d] cursor-pointer"
                >
                  {isSmallScreen ? (
                    <>
                      <Maximize2 className="h-4 w-4 text-amber-300" />
                      <span>Switch to Big Screen</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="h-4 w-4 text-amber-300" />
                      <span>Switch to Small Screen</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleReturnToTitle}
                  className="mt-1 text-xs font-medium text-emerald-200/80 underline-offset-4 hover:text-white hover:underline cursor-pointer"
                >
                  Change Difficulty
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over / Play Again Overlay */}
        {hud.status === 'GAME_OVER' && (
          <div
            className={`absolute inset-0 z-30 flex items-center justify-center bg-[#030e09]/60 px-3 ${
              isSmallScreen ? 'pb-8' : 'px-4 pb-16'
            }`}
          >
            <div
              className={`flex w-full flex-col items-center rounded-2xl border border-emerald-300/25 bg-[#061a11]/95 text-center shadow-2xl ${
                isSmallScreen ? 'max-w-xs px-5 py-5' : 'max-w-md px-8 py-8'
              }`}
            >
              <span className="text-xs font-medium text-emerald-200/80 sm:text-sm">
                {DIFFICULTY_LABELS[hud.difficulty]} Mode ·{' '}
                {hud.isNewBest && hud.score > 0 ? 'New High Score' : 'Time Up'}
              </span>
              <h2
                className={`mt-1 font-display font-extrabold text-[#f5f3e8] ${
                  isSmallScreen ? 'text-3xl' : 'text-4xl'
                }`}
              >
                Final Score
              </h2>

              <div
                data-testid="final-score"
                className={`mt-2 font-mono-num font-bold leading-none text-[#fef08a] ${
                  isSmallScreen ? 'text-5xl' : 'mt-3 text-6xl'
                }`}
              >
                {hud.score}
              </div>

              <div className="mt-4 flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-y border-emerald-300/15 py-2.5 text-xs text-emerald-100/85 sm:mt-5 sm:py-3 sm:text-sm">
                <span>
                  Flies:{' '}
                  <strong className="font-mono-num text-white">
                    {hud.fliesCaught}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Accuracy:{' '}
                  <strong className="font-mono-num text-white">
                    {accuracy}%
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Best Combo:{' '}
                  <strong className="font-mono-num text-orange-300">
                    {Math.max(1, hud.maxCombo)}x
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Best:{' '}
                  <strong className="font-mono-num text-amber-300">
                    {hud.bestScore}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleStartOrRestart}
                className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#fb7185] to-[#e11d48] font-display font-bold text-white shadow-lg transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 whitespace-nowrap cursor-pointer ${
                  isSmallScreen
                    ? 'mt-4 min-h-[44px] px-6 py-2.5 text-base'
                    : 'mt-6 min-h-[48px] px-8 py-3 text-lg'
                }`}
              >
                <RotateCcw className="h-5 w-5" />
                Play Again
              </button>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-emerald-200/75">
                <button
                  type="button"
                  onClick={handleToggleScreenSize}
                  className="font-medium text-amber-200 underline-offset-4 hover:text-white hover:underline cursor-pointer"
                >
                  {isSmallScreen ? 'Big Screen' : 'Small Screen'}
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={handleReturnToTitle}
                  className="font-medium text-emerald-100 underline-offset-4 hover:text-white hover:underline cursor-pointer"
                >
                  Change Difficulty
                </button>
              </div>
            </div>
          </div>
        )}

        <OfflineIndicator />
      </div>
    </main>
  );
}
