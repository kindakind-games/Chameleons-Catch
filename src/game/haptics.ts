import { PowerUpType } from './types';

export class HapticsEngine {
  private enabled = true;

  public isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
    );
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.cancel();
    }
  }

  public cancel(): void {
    if (!this.isSupported()) return;
    try {
      navigator.vibrate(0);
    } catch {
      // Ignore in restricted environments
    }
  }

  private pulse(pattern: number | number[]): void {
    if (!this.enabled || !this.isSupported()) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors when blocked by browser policy
    }
  }

  public playFlyCatch(
    count = 1,
    comboMultiplier = 1,
    isBonusSpecies = false
  ): void {
    if (count > 1 || comboMultiplier >= 4 || isBonusSpecies) {
      // Crisp double-tap pulse for multi-catches, high combos, and bonus species
      this.pulse([18, 28, 26]);
    } else if (comboMultiplier >= 2) {
      // Slightly firmer pulse during active combo streaks
      this.pulse(24);
    } else {
      // Light, snappy haptic tap for standard fly catch
      this.pulse(16);
    }
  }

  public playPowerUp(type: PowerUpType): void {
    if (type === 'time_bonus') {
      // Upbeat triple pulse for +5s Time Bonus
      this.pulse([20, 30, 20, 30, 34]);
    } else {
      // Resonant double pulse for Slow-Mo nectar drop
      this.pulse([35, 40, 22]);
    }
  }
}
