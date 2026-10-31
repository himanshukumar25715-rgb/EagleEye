/**
 * audioAlert.ts - Web Audio API Synthesizer for Eagle Eye 2.0 Threat Intelligence
 * 
 * Generates instant, zero-dependency, tactical security alarms when threats/fights are detected.
 * Adheres strictly to browser autoplay policies with state resumption.
 */

class AudioAlertManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private lastPlayedTime: number = 0;
  private listeners: Array<(enabled: boolean) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('eagleeye_audio_alerts');
      this.enabled = saved !== null ? saved === 'true' : true;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('eagleeye_audio_alerts', String(val));
    }
    this.notifyListeners();
    if (val) {
      this.playTestBeep();
    }
  }

  public subscribe(cb: (enabled: boolean) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.enabled));
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Synthesize a tactical dual-pulse security siren (high urgency for fights/weapons)
   */
  public playAlertSound(type: string = 'fight') {
    if (!this.enabled) return;

    // Rate-limit alert sounds to prevent audio clipping during dense detections
    const now = Date.now();
    if (now - this.lastPlayedTime < 750) return;
    this.lastPlayedTime = now;

    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const isUrgent = ['fight', 'weapon', 'violence', 'altercation'].includes(type.toLowerCase());

      if (isUrgent) {
        // High Urgency: Dual-tone tactical siren (880Hz down to 587Hz, repeated)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sawtooth';

        // Pulse 1
        gain1.gain.setValueAtTime(0.001, t);
        gain1.gain.exponentialRampToValueAtTime(0.35, t + 0.04);
        osc1.frequency.setValueAtTime(880, t); // A5
        osc1.frequency.exponentialRampToValueAtTime(587.33, t + 0.16); // D5
        gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.20);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(t);
        osc1.stop(t + 0.22);

        // Pulse 2 (Higher authoritative chime)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sawtooth';

        gain2.gain.setValueAtTime(0.001, t + 0.24);
        gain2.gain.exponentialRampToValueAtTime(0.40, t + 0.28);
        osc2.frequency.setValueAtTime(987.77, t + 0.26); // B5
        osc2.frequency.exponentialRampToValueAtTime(659.25, t + 0.44); // E5
        gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.52);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(t + 0.24);
        osc2.stop(t + 0.55);
      } else {
        // Standard Notice (e.g. unattended bag, crowd)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(0.30, t + 0.04);
        osc.frequency.setValueAtTime(784, t); // G5
        osc.frequency.exponentialRampToValueAtTime(440, t + 0.28); // A4
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.38);
      }
    } catch (e) {
      console.warn('[EagleEye AudioAlert] Web Audio playback error:', e);
    }
  }

  public playTestBeep() {
    const ctx = this.initContext();
    if (!ctx) return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.20);
    } catch {}
  }
}

export const audioAlert = new AudioAlertManager();
