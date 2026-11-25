"use client";

const SOUND_STORAGE_KEY = "passyli_dashboard_sound_enabled";

export function isDashboardSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const saved = window.localStorage.getItem(SOUND_STORAGE_KEY);
  return saved === null ? true : saved === "true";
}

export function setDashboardSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
}

/**
 * Plays a crisp, non-intrusive two-tone Web Audio API chime when a new receipt arrives.
 * Respects browser autoplay restrictions cleanly without external audio file requests.
 */
export function playReceiptChime(): void {
  if (typeof window === "undefined" || !isDashboardSoundEnabled()) return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    playTone(587.33, now, 0.14); // D5
    playTone(880.0, now + 0.12, 0.24); // A5
  } catch {
    // Ignore autoplay blocks prior to user interaction
  }
}
