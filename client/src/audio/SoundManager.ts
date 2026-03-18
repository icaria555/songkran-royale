/**
 * SoundManager — Web Audio API-based procedural sound effects and music.
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

export type MusicTrack = "menu" | "game" | "result_win" | "result_lose";

const STORAGE_KEY = "songkran_muted";

// Pentatonic scale frequencies (C4, D4, E4, G4, A4 and octaves)
const PENTA_C4 = 261.63;
const PENTA_D4 = 293.66;
const PENTA_E4 = 329.63;
const PENTA_G4 = 392.0;
const PENTA_A4 = 440.0;
const PENTA = [PENTA_C4, PENTA_D4, PENTA_E4, PENTA_G4, PENTA_A4];
const PENTA_HIGH = PENTA.map((f) => f * 2); // octave up
const PENTA_LOW = PENTA.map((f) => f / 2); // octave down

/** Nodes created by a music track that need cleanup */
interface MusicNodes {
  oscillators: OscillatorNode[];
  gains: GainNode[];
  sources: AudioBufferSourceNode[];
  filters: BiquadFilterNode[];
  masterGain: GainNode;
  schedulerHandle: number | null;
  track: MusicTrack;
}

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _volume = 0.5;
  private _musicVolume = 0.35;
  private _muted = false;
  private initialized = false;

  // Track active refill oscillator so we can stop it
  private refillOsc: OscillatorNode | null = null;
  private refillGain: GainNode | null = null;

  // Music state
  private currentMusic: MusicNodes | null = null;
  private currentTrack: MusicTrack | null = null;
  private musicIntensified = false;
  private intensifyNodes: { oscillators: OscillatorNode[]; gains: GainNode[] } | null = null;

  // Ambient water state
  private ambientWaterActive = false;
  private ambientWaterNodes: {
    source: AudioBufferSourceNode;
    gain: GainNode;
    filter: BiquadFilterNode;
    dripHandle: number;
  } | null = null;

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

  // ── Public SFX API ────────────────────────────────────────────

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

  // ── Music Public API ──────────────────────────────────────────

  /** Start a music track with crossfade from current */
  playMusic(track: MusicTrack): void {
    if (!this.ensureRunning()) return;
    if (this.currentTrack === track) return; // already playing

    // Fade out current music
    const fadeOutMs = 200;
    const fadeInMs = 200;

    if (this.currentMusic) {
      this.fadeOutAndCleanup(this.currentMusic, fadeOutMs);
    }
    this.musicIntensified = false;
    this.cleanupIntensify();

    // Start new track after fade out
    setTimeout(() => {
      if (!this.ensureRunning()) return;
      this.currentTrack = track;
      switch (track) {
        case "menu":
          this.currentMusic = this.startMenuMusic(fadeInMs);
          break;
        case "game":
          this.currentMusic = this.startGameMusic(fadeInMs);
          break;
        case "result_win":
          this.currentMusic = this.startResultWinMusic(fadeInMs);
          break;
        case "result_lose":
          this.currentMusic = this.startResultLoseMusic(fadeInMs);
          break;
      }
    }, fadeOutMs);
  }

  /** Fade out and stop current music */
  stopMusic(fadeOutMs = 200): void {
    if (this.currentMusic) {
      this.fadeOutAndCleanup(this.currentMusic, fadeOutMs);
      this.currentMusic = null;
      this.currentTrack = null;
    }
    this.musicIntensified = false;
    this.cleanupIntensify();
  }

  /** Set music volume separately from SFX (0-1) */
  setMusicVolume(v: number): void {
    this._musicVolume = Math.max(0, Math.min(1, v));
    if (this.currentMusic && this.ctx) {
      this.currentMusic.masterGain.gain.setValueAtTime(
        this._musicVolume,
        this.ctx.currentTime
      );
    }
  }

  /** Add extra intensity layer for last 30s of match */
  intensifyMusic(): void {
    if (!this.ensureRunning()) return;
    if (this.musicIntensified) return;
    if (this.currentTrack !== "game") return;
    this.musicIntensified = true;

    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, t);
    masterGain.gain.linearRampToValueAtTime(this._musicVolume * 0.4, t + 0.5);
    masterGain.connect(this.masterGain!);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    // High octave pulse layer
    const osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.value = PENTA_HIGH[0];
    const g1 = ctx.createGain();
    g1.gain.value = 0.15;
    osc1.connect(g1);
    g1.connect(masterGain);
    osc1.start(t);
    oscillators.push(osc1);
    gains.push(g1);

    // Rapid arpeggio scheduler
    let noteIdx = 0;
    const scheduleIntensityNote = () => {
      if (!this.musicIntensified || !this.ctx) return;
      const now = this.ctx.currentTime;
      const freq = PENTA_HIGH[noteIdx % PENTA_HIGH.length];
      osc1.frequency.setValueAtTime(freq, now);
      noteIdx++;
    };

    const handle = window.setInterval(scheduleIntensityNote, 230); // fast arpeggiation

    // Filtered noise "hiss" for urgency
    const noiseLen = 2;
    const bufSize = Math.ceil(ctx.sampleRate * noiseLen);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buf;
    noiseSrc.loop = true;

    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 4000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.04;

    noiseSrc.connect(hpf);
    hpf.connect(noiseGain);
    noiseGain.connect(masterGain);
    noiseSrc.start(t);

    this.intensifyNodes = { oscillators, gains: [masterGain, g1, noiseGain] };

    // Store handle and source for cleanup
    (this.intensifyNodes as any)._handle = handle;
    (this.intensifyNodes as any)._noiseSrc = noiseSrc;
  }

  /** Start ambient water background layer */
  startAmbientWater(): void {
    if (!this.ensureRunning()) return;
    if (this.ambientWaterActive) return;
    this.ambientWaterActive = true;

    const ctx = this.ctx!;
    const t = ctx.currentTime;

    // Looping filtered noise for flowing water sound
    const noiseLen = 2;
    const bufSize = Math.ceil(ctx.sampleRate * noiseLen);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;
    filter.Q.value = 1.5;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.06, t + 0.5);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    source.start(t);

    // Random drip sounds at random intervals
    const scheduleDrip = () => {
      if (!this.ambientWaterActive || !this.ctx) return;
      const now = this.ctx.currentTime;

      const dripOsc = this.ctx.createOscillator();
      dripOsc.type = "sine";
      const dripFreq = 1200 + Math.random() * 2000;
      dripOsc.frequency.setValueAtTime(dripFreq, now);
      dripOsc.frequency.exponentialRampToValueAtTime(dripFreq * 0.5, now + 0.08);

      const dripGain = this.ctx.createGain();
      dripGain.gain.setValueAtTime(0.03 + Math.random() * 0.02, now);
      dripGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      dripOsc.connect(dripGain);
      dripGain.connect(this.masterGain!);
      dripOsc.start(now);
      dripOsc.stop(now + 0.08);
    };

    const dripHandle = window.setInterval(() => {
      if (Math.random() < 0.4) scheduleDrip();
    }, 600);

    this.ambientWaterNodes = { source, gain, filter, dripHandle };
  }

  /** Stop ambient water layer */
  stopAmbientWater(): void {
    if (!this.ambientWaterActive) return;
    this.ambientWaterActive = false;

    if (this.ambientWaterNodes) {
      const { source, gain, dripHandle } = this.ambientWaterNodes;
      window.clearInterval(dripHandle);

      if (this.ctx) {
        const t = this.ctx.currentTime;
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.3);
        setTimeout(() => {
          try { source.stop(); } catch { /* */ }
          gain.disconnect();
        }, 350);
      } else {
        try { source.stop(); } catch { /* */ }
        gain.disconnect();
      }
      this.ambientWaterNodes = null;
    }
  }

  // ── Music generators ──────────────────────────────────────────

  /** Helper: fade out a music node group and clean up */
  private fadeOutAndCleanup(nodes: MusicNodes, fadeMs: number): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const fadeSec = fadeMs / 1000;

    nodes.masterGain.gain.setValueAtTime(nodes.masterGain.gain.value, t);
    nodes.masterGain.gain.linearRampToValueAtTime(0, t + fadeSec);

    if (nodes.schedulerHandle !== null) {
      window.clearInterval(nodes.schedulerHandle);
    }

    setTimeout(() => {
      nodes.oscillators.forEach((osc) => {
        try { osc.stop(); } catch { /* */ }
      });
      nodes.sources.forEach((src) => {
        try { src.stop(); } catch { /* */ }
      });
      nodes.gains.forEach((g) => {
        try { g.disconnect(); } catch { /* */ }
      });
      nodes.filters.forEach((f) => {
        try { f.disconnect(); } catch { /* */ }
      });
      try { nodes.masterGain.disconnect(); } catch { /* */ }
    }, fadeMs + 50);
  }

  private cleanupIntensify(): void {
    if (!this.intensifyNodes) return;
    const nodes = this.intensifyNodes;
    const handle = (nodes as any)._handle as number | undefined;
    const noiseSrc = (nodes as any)._noiseSrc as AudioBufferSourceNode | undefined;

    if (handle !== undefined) window.clearInterval(handle);

    nodes.oscillators.forEach((osc) => {
      try { osc.stop(); } catch { /* */ }
    });
    nodes.gains.forEach((g) => {
      try { g.disconnect(); } catch { /* */ }
    });
    if (noiseSrc) {
      try { noiseSrc.stop(); } catch { /* */ }
    }

    this.intensifyNodes = null;
  }

  /** Menu/Character select — chill Thai-inspired pentatonic melody at ~90 BPM */
  private startMenuMusic(fadeInMs: number): MusicNodes {
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(0, t);
    musicGain.gain.linearRampToValueAtTime(this._musicVolume, t + fadeInMs / 1000);
    musicGain.connect(this.masterGain!);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const sources: AudioBufferSourceNode[] = [];
    const filters: BiquadFilterNode[] = [];

    // Drone pad — low C, very quiet sine
    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = PENTA_LOW[0]; // low C
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.12;
    drone.connect(droneGain);
    droneGain.connect(musicGain);
    drone.start(t);
    oscillators.push(drone);
    gains.push(droneGain);

    // Gentle LFO on drone for warmth
    const droneLfo = ctx.createOscillator();
    droneLfo.type = "sine";
    droneLfo.frequency.value = 0.3;
    const droneLfoGain = ctx.createGain();
    droneLfoGain.gain.value = 5;
    droneLfo.connect(droneLfoGain);
    droneLfoGain.connect(drone.frequency);
    droneLfo.start(t);
    oscillators.push(droneLfo);
    gains.push(droneLfoGain);

    // Melody oscillator — triangle wave, scheduled notes
    const melody = ctx.createOscillator();
    melody.type = "triangle";
    melody.frequency.value = PENTA[0];
    const melodyGain = ctx.createGain();
    melodyGain.gain.value = 0.18;
    melody.connect(melodyGain);
    melodyGain.connect(musicGain);
    melody.start(t);
    oscillators.push(melody);
    gains.push(melodyGain);

    // 4-bar melody pattern (8 notes per bar = 32 notes), pentatonic, at 90 BPM
    // 90 BPM = 0.667s per beat, 8 notes per bar = 4 beats per bar
    // so each note = beat / 2 = 0.333s
    const noteInterval = 60 / 90 / 2; // ~0.333s
    const melodyPattern = [
      0, 2, 4, 2, 3, 1, 0, 3, // bar 1
      1, 3, 4, 3, 2, 0, 1, 2, // bar 2
      2, 4, 3, 1, 0, 2, 3, 4, // bar 3
      3, 2, 0, 1, 4, 3, 2, 0, // bar 4
    ];
    let noteIdx = 0;

    const scheduleMelody = () => {
      if (!this.ctx || this.currentTrack !== "menu") return;
      const now = this.ctx.currentTime;
      const pIdx = melodyPattern[noteIdx % melodyPattern.length];
      const freq = PENTA[pIdx];
      melody.frequency.setValueAtTime(freq, now);

      // Gentle volume envelope per note
      melodyGain.gain.setValueAtTime(0.18, now);
      melodyGain.gain.setValueAtTime(0.14, now + noteInterval * 0.8);

      noteIdx++;
    };

    const handle = window.setInterval(scheduleMelody, noteInterval * 1000);

    return {
      oscillators,
      gains: [musicGain, ...gains],
      sources,
      filters,
      masterGain: musicGain,
      schedulerHandle: handle,
      track: "menu",
    };
  }

  /** In-game music — upbeat, energetic at ~130 BPM */
  private startGameMusic(fadeInMs: number): MusicNodes {
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(0, t);
    musicGain.gain.linearRampToValueAtTime(this._musicVolume, t + fadeInMs / 1000);
    musicGain.connect(this.masterGain!);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const sources: AudioBufferSourceNode[] = [];
    const filters: BiquadFilterNode[] = [];

    // Bass line — 2-note alternating pattern (square wave, low)
    const bass = ctx.createOscillator();
    bass.type = "square";
    bass.frequency.value = PENTA_LOW[0];
    const bassGain = ctx.createGain();
    bassGain.gain.value = 0.1;

    // Low-pass filter on bass to soften square wave
    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = "lowpass";
    bassFilter.frequency.value = 300;
    bass.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(musicGain);
    bass.start(t);
    oscillators.push(bass);
    gains.push(bassGain);
    filters.push(bassFilter);

    // Melody — faster pentatonic, sine wave
    const melody = ctx.createOscillator();
    melody.type = "sine";
    melody.frequency.value = PENTA[0];
    const melodyGain = ctx.createGain();
    melodyGain.gain.value = 0.16;
    melody.connect(melodyGain);
    melodyGain.connect(musicGain);
    melody.start(t);
    oscillators.push(melody);
    gains.push(melodyGain);

    // Second harmony voice — triangle, slightly quieter
    const harmony = ctx.createOscillator();
    harmony.type = "triangle";
    harmony.frequency.value = PENTA[2];
    const harmonyGain = ctx.createGain();
    harmonyGain.gain.value = 0.08;
    harmony.connect(harmonyGain);
    harmonyGain.connect(musicGain);
    harmony.start(t);
    oscillators.push(harmony);
    gains.push(harmonyGain);

    // Percussive noise burst for drum feel
    const drumLen = 0.5;
    const drumBufSize = Math.ceil(ctx.sampleRate * drumLen);
    const drumBuf = ctx.createBuffer(1, drumBufSize, ctx.sampleRate);
    const drumData = drumBuf.getChannelData(0);
    for (let i = 0; i < drumBufSize; i++) {
      drumData[i] = Math.random() * 2 - 1;
    }
    const drumSrc = ctx.createBufferSource();
    drumSrc.buffer = drumBuf;
    drumSrc.loop = true;
    const drumGain = ctx.createGain();
    drumGain.gain.value = 0; // start silent, pulsed by scheduler
    const drumFilter = ctx.createBiquadFilter();
    drumFilter.type = "bandpass";
    drumFilter.frequency.value = 150;
    drumFilter.Q.value = 3;
    drumSrc.connect(drumFilter);
    drumFilter.connect(drumGain);
    drumGain.connect(musicGain);
    drumSrc.start(t);
    sources.push(drumSrc);
    gains.push(drumGain);
    filters.push(drumFilter);

    // 130 BPM scheduling
    const beatInterval = 60 / 130; // ~0.462s per beat
    const noteInterval = beatInterval / 2; // eighth notes ~0.231s

    const gameMelody = [
      0, 2, 4, 3, 1, 4, 2, 0, // bar 1
      3, 4, 2, 1, 0, 3, 4, 2, // bar 2
      4, 3, 1, 0, 2, 4, 3, 1, // bar 3
      1, 0, 3, 4, 2, 0, 1, 3, // bar 4
    ];

    const harmonyOffsets = [2, 2, 3, 3, 1, 1, 4, 4]; // longer changes

    let noteIdx = 0;
    let bassToggle = false;

    const scheduleGameNotes = () => {
      if (!this.ctx || this.currentTrack !== "game") return;
      const now = this.ctx.currentTime;

      // Melody
      const mIdx = gameMelody[noteIdx % gameMelody.length];
      melody.frequency.setValueAtTime(PENTA[mIdx], now);
      melodyGain.gain.setValueAtTime(0.16, now);
      melodyGain.gain.setValueAtTime(0.10, now + noteInterval * 0.7);

      // Harmony (changes every 4 notes)
      const hIdx = harmonyOffsets[Math.floor(noteIdx / 4) % harmonyOffsets.length];
      harmony.frequency.setValueAtTime(PENTA[hIdx], now);

      // Bass alternation (every beat = every 2 eighth notes)
      if (noteIdx % 2 === 0) {
        bassToggle = !bassToggle;
        bass.frequency.setValueAtTime(
          bassToggle ? PENTA_LOW[0] : PENTA_LOW[4],
          now
        );
      }

      // Drum pulse on beats (every 2 eighth notes)
      if (noteIdx % 2 === 0) {
        drumGain.gain.setValueAtTime(0.12, now);
        drumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      }
      // Off-beat lighter hit
      if (noteIdx % 2 === 1 && noteIdx % 4 === 1) {
        drumGain.gain.setValueAtTime(0.06, now);
        drumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      }

      noteIdx++;
    };

    const handle = window.setInterval(scheduleGameNotes, noteInterval * 1000);

    return {
      oscillators,
      gains: [musicGain, ...gains],
      sources,
      filters,
      masterGain: musicGain,
      schedulerHandle: handle,
      track: "game",
    };
  }

  /** Result win — triumphant fanfare then gentle celebration loop */
  private startResultWinMusic(fadeInMs: number): MusicNodes {
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(0, t);
    musicGain.gain.linearRampToValueAtTime(this._musicVolume, t + fadeInMs / 1000);
    musicGain.connect(this.masterGain!);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const sources: AudioBufferSourceNode[] = [];
    const filters: BiquadFilterNode[] = [];

    // Fanfare: ascending arpeggio C-E-G-C5-E5
    const fanfareNotes = [
      PENTA_C4, PENTA_E4, PENTA_G4, PENTA_HIGH[0], PENTA_HIGH[2],
    ];
    const fanfareDur = 0.15;

    fanfareNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      const start = t + i * fanfareDur;
      g.gain.setValueAtTime(0, t);
      g.gain.setValueAtTime(0.2, start);
      g.gain.setValueAtTime(0.15, start + fanfareDur * 0.8);
      g.gain.linearRampToValueAtTime(0.001, start + fanfareDur);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t);
      osc.stop(start + fanfareDur + 0.01);
      oscillators.push(osc);
      gains.push(g);
    });

    // After fanfare, gentle celebration loop
    const loopDelay = fanfareNotes.length * fanfareDur + 0.2;

    // Celebration drone chord — C + E stacked
    const chordC = ctx.createOscillator();
    chordC.type = "sine";
    chordC.frequency.value = PENTA_C4;
    const chordCGain = ctx.createGain();
    chordCGain.gain.setValueAtTime(0, t);
    chordCGain.gain.setValueAtTime(0.1, t + loopDelay);
    chordC.connect(chordCGain);
    chordCGain.connect(musicGain);
    chordC.start(t);
    oscillators.push(chordC);
    gains.push(chordCGain);

    const chordE = ctx.createOscillator();
    chordE.type = "triangle";
    chordE.frequency.value = PENTA_E4;
    const chordEGain = ctx.createGain();
    chordEGain.gain.setValueAtTime(0, t);
    chordEGain.gain.setValueAtTime(0.08, t + loopDelay);
    chordE.connect(chordEGain);
    chordEGain.connect(musicGain);
    chordE.start(t);
    oscillators.push(chordE);
    gains.push(chordEGain);

    // Simple celebration melody loop
    const celebMelody = [4, 3, 4, 2, 4, 3, 2, 0];
    let noteIdx = 0;
    const noteInterval = 60 / 100 / 2; // ~100 BPM eighth notes

    const celebOsc = ctx.createOscillator();
    celebOsc.type = "sine";
    celebOsc.frequency.value = PENTA_HIGH[4];
    const celebGain = ctx.createGain();
    celebGain.gain.setValueAtTime(0, t);
    celebOsc.connect(celebGain);
    celebGain.connect(musicGain);
    celebOsc.start(t);
    oscillators.push(celebOsc);
    gains.push(celebGain);

    const handle = window.setInterval(() => {
      if (!this.ctx || this.currentTrack !== "result_win") return;
      const now = this.ctx.currentTime;
      if (now < t + loopDelay) return; // wait for fanfare
      const pIdx = celebMelody[noteIdx % celebMelody.length];
      celebOsc.frequency.setValueAtTime(PENTA_HIGH[pIdx], now);
      celebGain.gain.setValueAtTime(0.12, now);
      celebGain.gain.setValueAtTime(0.06, now + noteInterval * 0.7);
      noteIdx++;
    }, noteInterval * 1000);

    return {
      oscillators,
      gains: [musicGain, ...gains],
      sources,
      filters,
      masterGain: musicGain,
      schedulerHandle: handle,
      track: "result_win",
    };
  }

  /** Result lose — melancholic short phrase then fade */
  private startResultLoseMusic(fadeInMs: number): MusicNodes {
    const ctx = this.ctx!;
    const t = ctx.currentTime;

    const musicGain = ctx.createGain();
    musicGain.gain.setValueAtTime(0, t);
    musicGain.gain.linearRampToValueAtTime(this._musicVolume, t + fadeInMs / 1000);
    musicGain.connect(this.masterGain!);

    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];
    const sources: AudioBufferSourceNode[] = [];
    const filters: BiquadFilterNode[] = [];

    // Descending melancholic phrase: A4 -> G4 -> E4 -> D4 -> C4
    const phrase = [PENTA_A4, PENTA_G4, PENTA_E4, PENTA_D4, PENTA_C4];
    const noteDur = 0.35;

    phrase.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      const start = t + i * noteDur;
      g.gain.setValueAtTime(0, t);
      g.gain.setValueAtTime(0.15, start);
      g.gain.linearRampToValueAtTime(0.001, start + noteDur);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t);
      osc.stop(start + noteDur + 0.01);
      oscillators.push(osc);
      gains.push(g);
    });

    // Soft sustained low C drone that fades out
    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = PENTA_LOW[0];
    const droneGain = ctx.createGain();
    const droneStart = t + phrase.length * noteDur * 0.5;
    droneGain.gain.setValueAtTime(0, t);
    droneGain.gain.linearRampToValueAtTime(0.1, droneStart);
    droneGain.gain.setValueAtTime(0.1, droneStart + 1.0);
    droneGain.gain.linearRampToValueAtTime(0.001, droneStart + 3.0);
    drone.connect(droneGain);
    droneGain.connect(musicGain);
    drone.start(t);
    drone.stop(droneStart + 3.1);
    oscillators.push(drone);
    gains.push(droneGain);

    // Soft gentle loop after phrase ends (very quiet)
    const loopDelay = phrase.length * noteDur + 0.5;
    const loopMelody = [0, 2, 0, 1, 0, 2, 1, 0]; // mostly C with gentle movement
    let noteIdx = 0;
    const loopInterval = 0.5;

    const loopOsc = ctx.createOscillator();
    loopOsc.type = "triangle";
    loopOsc.frequency.value = PENTA[0];
    const loopGain = ctx.createGain();
    loopGain.gain.setValueAtTime(0, t);
    loopOsc.connect(loopGain);
    loopGain.connect(musicGain);
    loopOsc.start(t);
    oscillators.push(loopOsc);
    gains.push(loopGain);

    const handle = window.setInterval(() => {
      if (!this.ctx || this.currentTrack !== "result_lose") return;
      const now = this.ctx.currentTime;
      if (now < t + loopDelay) return;
      const pIdx = loopMelody[noteIdx % loopMelody.length];
      loopOsc.frequency.setValueAtTime(PENTA[pIdx], now);
      loopGain.gain.setValueAtTime(0.06, now);
      loopGain.gain.setValueAtTime(0.03, now + loopInterval * 0.7);
      noteIdx++;
    }, loopInterval * 1000);

    return {
      oscillators,
      gains: [musicGain, ...gains],
      sources,
      filters,
      masterGain: musicGain,
      schedulerHandle: handle,
      track: "result_lose",
    };
  }

  // ── SFX Sound generators ─────────────────────────────────────

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
