export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeSources = new Set<AudioScheduledSourceNode>();
  private muted = false;
  private playingScreenActive = false;
  private gameOverSuspendTimer: number | null = null;

  private isPageHidden(): boolean {
    return (
      typeof document !== 'undefined' &&
      (document.hidden || document.visibilityState === 'hidden')
    );
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopAllAudio();
    } else if (this.playingScreenActive && !this.isPageHidden()) {
      this.unlock();
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public setPlayingScreen(active: boolean): void {
    this.playingScreenActive = active;
    if (!active) {
      this.stopAllAudio();
      return;
    }

    this.clearGameOverTimer();
    if (!this.muted && !this.isPageHidden()) {
      this.unlock();
      if (this.ctx && this.masterGain) {
        this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
      }
    }
  }

  public finishRoundWithChime(isHighScore: boolean): void {
    // Stop any lingering gameplay SFX first, then mark screen non-playing
    this.clearActiveSources();
    this.playingScreenActive = false;

    if (this.muted || this.isPageHidden()) {
      this.stopAllAudio();
      return;
    }

    const ctx = this.getReadyContext(true);
    if (!ctx) {
      this.stopAllAudio();
      return;
    }

    this.playGameOverNotes(ctx, isHighScore);
    this.clearGameOverTimer();
    if (typeof window !== 'undefined') {
      this.gameOverSuspendTimer = window.setTimeout(() => {
        this.gameOverSuspendTimer = null;
        if (!this.playingScreenActive) {
          this.stopAllAudio();
        }
      }, 720);
    }
  }

  public stopAllAudio(): void {
    this.clearGameOverTimer();
    this.clearActiveSources();

    if (this.ctx && this.masterGain) {
      try {
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch {
        // Ignore timing errors on closed/suspended contexts
      }
    }

    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  private clearGameOverTimer(): void {
    if (this.gameOverSuspendTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.gameOverSuspendTimer);
      this.gameOverSuspendTimer = null;
    }
  }

  private clearActiveSources(): void {
    for (const node of this.activeSources) {
      try {
        node.onended = null;
        node.stop();
      } catch {
        // Node may already have stopped
      }
      try {
        node.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
    this.activeSources.clear();
  }

  private trackSource(node: AudioScheduledSourceNode): void {
    this.activeSources.add(node);
    node.onended = () => {
      this.activeSources.delete(node);
      try {
        node.disconnect();
      } catch {
        // Ignore
      }
    };
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(
            this.muted || !this.playingScreenActive ? 0 : 1,
            this.ctx.currentTime
          );
          this.masterGain.connect(this.ctx.destination);
        } catch {
          this.ctx = null;
          this.masterGain = null;
        }
      }
    }
    return this.ctx;
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (this.isPageHidden() || this.muted || !this.playingScreenActive) {
      if (this.masterGain) {
        try {
          this.masterGain.gain.setValueAtTime(0, ctx.currentTime);
        } catch {
          // Ignore
        }
      }
      return;
    }

    if (this.masterGain) {
      try {
        this.masterGain.gain.setValueAtTime(1, ctx.currentTime);
      } catch {
        // Ignore
      }
    }

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  private getReadyContext(allowGameOverChime = false): AudioContext | null {
    if (this.muted || this.isPageHidden()) return null;
    if (!this.playingScreenActive && !allowGameOverChime) return null;

    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return null;

    try {
      this.masterGain.gain.setValueAtTime(1, ctx.currentTime);
    } catch {
      // Ignore
    }

    if (ctx.state !== 'running') {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      return null;
    }
    return ctx;
  }

  private getOutputNode(): AudioNode | null {
    return this.masterGain ?? this.ctx?.destination ?? null;
  }

  public playTongueSnap(): void {
    const ctx = this.getReadyContext();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const now = ctx.currentTime;

    // Elastic pitch-swept triangle snap
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(170, now + 0.065);
    osc.frequency.exponentialRampToValueAtTime(290, now + 0.095);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(out);
    this.trackSource(osc);
    osc.start(now);
    osc.stop(now + 0.105);

    // Crisp filtered whip transient
    const bufferSize = Math.floor(ctx.sampleRate * 0.045);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1900, now);
    filter.Q.setValueAtTime(2.2, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.11, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(out);
    this.trackSource(noise);
    noise.start(now);
  }

  public playFlyStick(): void {
    const ctx = this.getReadyContext();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.045);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(out);
    this.trackSource(osc);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playFlyGulp(comboMultiplier = 1, isGold = false): void {
    const ctx = this.getReadyContext();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const now = ctx.currentTime;
    const pitchScale = 1 + Math.min(4, Math.max(0, comboMultiplier - 1)) * 0.1;

    // Playful two-stage retro gulp + reward blip
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(280 * pitchScale, now);
    osc1.frequency.exponentialRampToValueAtTime(520 * pitchScale, now + 0.065);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.012);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc1.connect(gain1);
    gain1.connect(out);
    this.trackSource(osc1);
    osc1.start(now);
    osc1.stop(now + 0.08);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(587.33 * pitchScale, now + 0.055);
    osc2.frequency.setValueAtTime(880 * pitchScale, now + 0.11);

    gain2.gain.setValueAtTime(0.001, now + 0.055);
    gain2.gain.linearRampToValueAtTime(0.16, now + 0.068);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.21);

    osc2.connect(gain2);
    gain2.connect(out);
    this.trackSource(osc2);
    osc2.start(now + 0.055);
    osc2.stop(now + 0.22);

    if (isGold) {
      const shimmer = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmer.type = 'sine';
      shimmer.frequency.setValueAtTime(1174.66 * pitchScale, now + 0.095);
      shimmer.frequency.setValueAtTime(1567.98 * pitchScale, now + 0.155);

      shimmerGain.gain.setValueAtTime(0.001, now + 0.095);
      shimmerGain.gain.linearRampToValueAtTime(0.13, now + 0.11);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.27);

      shimmer.connect(shimmerGain);
      shimmerGain.connect(out);
      this.trackSource(shimmer);
      shimmer.start(now + 0.095);
      shimmer.stop(now + 0.28);
    }
  }

  public playCountdownTick(): void {
    const ctx = this.getReadyContext();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.035);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(out);
    this.trackSource(osc);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  private playGameOverNotes(ctx: AudioContext, isHighScore: boolean): void {
    const out = this.getOutputNode();
    if (!out) return;

    const now = ctx.currentTime;
    const notes = isHighScore
      ? [523.25, 659.25, 783.99, 1046.5]
      : [659.25, 587.33, 523.25, 392.0];

    notes.forEach((freq, idx) => {
      const start = now + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

      osc.connect(gain);
      gain.connect(out);
      this.trackSource(osc);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  }

  public playPowerUpTime(): void {
    const ctx = this.getReadyContext();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const now = ctx.currentTime;
    const notes = [587.33, 739.99, 880.0, 1174.66];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.19);

      osc.connect(gain);
      gain.connect(out);
      this.trackSource(osc);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  }

  public playPowerUpSlowMo(): void {
    const ctx = this.getReadyContext();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(740, now);
    osc.frequency.exponentialRampToValueAtTime(290, now + 0.34);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc.connect(gain);
    gain.connect(out);
    this.trackSource(osc);
    osc.start(now);
    osc.stop(now + 0.38);

    // Shimmering high overtone
    const chime = ctx.createOscillator();
    const chimeGain = ctx.createGain();
    chime.type = 'triangle';
    chime.frequency.setValueAtTime(1046.5, now + 0.04);
    chime.frequency.exponentialRampToValueAtTime(523.25, now + 0.32);

    chimeGain.gain.setValueAtTime(0.001, now + 0.04);
    chimeGain.gain.linearRampToValueAtTime(0.09, now + 0.07);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);

    chime.connect(chimeGain);
    chimeGain.connect(out);
    this.trackSource(chime);
    chime.start(now + 0.04);
    chime.stop(now + 0.35);
  }
}
