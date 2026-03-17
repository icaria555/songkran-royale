/**
 * SoundManager — Web Audio API-based procedural sound effects.
 * Singleton. Initializes AudioContext on first user interaction
 * to comply with browser autoplay policies.
 */

export type SoundName =
  | "shoot"
  | "hit"
  | "refill"
  | "elimination"
  | "countdown_tick"
  | "match_start"
  | "victory"
  | "defeat"
  | "button_click"
  | "water_low";

const STORAGE_KEY = "songkran_muted";

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _volume = 0.5;
  private _muted = false;
  private initialized = false;

  // Track active refill oscillator so we can stop it
  private refillOsc: OscillatorNode | null = null;
  private refillGain: GainNode | null = null;

  constructor() {
    // Restore mute state from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") {
        this._muted = true;
      }
    } catch {
      // localStorage unavailable — ignore
    }
  }

  /** Must be called from a user-gesture handler (click/keydown) */
  init(): void {
    if (this.initialized) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._muted ? 0 : this._volume;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn("SoundManager: Web Audio not available", e);
    }
  }

  /** Resume context if suspended (e.g. after tab switch) */
  private ensureRunning(): boolean {
    if (!this.ctx || !this.masterGain) return false;
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return true;
  }

  // ── Public API ──────────────────────────────────────────────

  play(name: SoundName): void {
    if (!this.ensureRunning()) return;
    switch (name) {
      case "shoot":
        this.playShoot();
        break;
      case "hit":
        this.playHit();
        break;
      case "refill":
        this.startRefill();
        break;
      case "elimination":
        this.playElimination();
        break;
      case "countdown_tick":
        this.playCountdownTick();
        break;
      case "match_start":
        this.playMatchStart();
        break;
      case "victory":
        this.playVictory();
        break;
      case "defeat":
        this.playDefeat();
        break;
      case "button_click":
        this.playButtonClick();
        break;
      case "water_low":
        this.playWaterLow();
        break;
    }
  }

  /** Stop a looping sound (currently only refill) */
  stopRefill(): void {
    if (this.refillOsc) {
      try {
        this.refillOsc.stop();
      } catch {
        // already stopped
      }
      this.refillOsc = null;
    }
    if (this.refillGain) {
      this.refillGain.disconnect();
      this.refillGain = null;
    }
  }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && !this._muted) {
      this.masterGain.gain.setValueAtTime(this._volume, this.ctx!.currentTime);
    }
  }

  getVolume(): number {
    return this._volume;
  }

  mute(): void {
    this._muted = true;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(0, this.ctx!.currentTime);
    }
    this.persistMute();
  }

  unmute(): void {
    this._muted = false;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this._volume, this.ctx!.currentTime);
    }
    this.persistMute();
  }

  toggleMute(): boolean {
    if (this._muted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this._muted;
  }

  isMuted(): boolean {
    return this._muted;
  }

  private persistMute(): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(this._muted));
    } catch {
      // ignore
    }
  }

  // ── Sound generators ────────────────────────────────────────

  /** Short "pew" water squirt — high freq sine, quick decay, 100ms */
  private playShoot(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** Splash — white noise burst through bandpass, 150ms */
  private playHit(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const duration = 0.15;

    const bufferSize = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 2000;
    bandpass.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.masterGain!);

    source.start(t);
    source.stop(t + duration);
  }

  /** Bubbling/filling — low freq sine with modulation, loops until stopRefill() */
  private startRefill(): void {
    // Don't stack multiple refill sounds
    if (this.refillOsc) return;

    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, t);

    // LFO for bubbling modulation
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 8;

    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 60;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(t);
    lfo.start(t);

    this.refillOsc = osc;
    this.refillGain = gain;

    // Store lfo ref for cleanup
    osc.onended = () => {
      try { lfo.stop(); } catch { /* */ }
      gain.disconnect();
      lfoGain.disconnect();
    };
  }

  /** Big splash + descending tone, 200ms */
  private playElimination(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    // Noise burst
    const bufferSize = Math.ceil(ctx.sampleRate * 0.2);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buffer;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    noiseSrc.connect(noiseGain);
    noiseGain.connect(this.masterGain!);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.2);

    // Descending tone
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.2);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.25, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /** Short beep — sine 440Hz, 50ms */
  private playCountdownTick(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 440;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  /** Rising tone — sine sweep 200->800Hz, 300ms */
  private playMatchStart(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.setValueAtTime(0.3, t + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  /** Cheerful ascending C-E-G-C arpeggio, 100ms each note */
  private playVictory(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
    const noteDuration = 0.1;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const start = t + i * noteDuration;
      gain.gain.setValueAtTime(0.25, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + noteDuration);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + noteDuration);
    });
  }

  /** Descending sad G-E-C, 150ms each note */
  private playDefeat(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const notes = [392.0, 329.63, 261.63]; // G4, E4, C4
    const noteDuration = 0.15;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      const start = t + i * noteDuration;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + noteDuration);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + noteDuration);
    });
  }

  /** Subtle UI click — sine 600Hz, 30ms */
  private playButtonClick(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 600;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  /** Warning double beep — 80ms each */
  private playWaterLow(): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 880;

      const gain = ctx.createGain();
      const start = t + i * 0.12;
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.08);
    }
  }
}

/** Singleton instance */
export const soundManager = new SoundManager();
