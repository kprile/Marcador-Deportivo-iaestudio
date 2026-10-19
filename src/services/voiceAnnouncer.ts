import { VoiceSettings } from '../types/sports';

export interface EnhancedVoiceInfo {
  voice: SpeechSynthesisVoice;
  isNatural: boolean;
  country: string;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  enabled: true,
  rate: 1.02,
  pitch: 0.98,
  volume: 1.0,
  voiceURI: null,
  announcePoints: true,
  announceServerChange: true,
  announceGameAndSet: true,
  announceSituations: true,
};

const STORAGE_KEY = 'marcador_bt_voice_settings';

class VoiceAnnouncerService {
  private settings: VoiceSettings = DEFAULT_SETTINGS;
  private audioCtx: AudioContext | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isSpeaking = false;

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        this.initVoices();
      };
    }
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      this.settings = DEFAULT_SETTINGS;
    }
  }

  public saveSettings(newSettings: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore
    }
  }

  public getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  public applyPreset(preset: 'referee' | 'tv' | 'calm') {
    switch (preset) {
      case 'referee':
        this.saveSettings({ rate: 1.04, pitch: 0.96 });
        break;
      case 'tv':
        this.saveSettings({ rate: 1.12, pitch: 1.04 });
        break;
      case 'calm':
        this.saveSettings({ rate: 0.92, pitch: 0.98 });
        break;
    }
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.voices = window.speechSynthesis.getVoices();

    const spanishVoices = this.getSpanishVoices();
    if (spanishVoices.length > 0) {
      // 1. Look specifically for Microsoft Yolanda (as requested by user)
      const yolanda = spanishVoices.find((v) => v.name.toLowerCase().includes('yolanda'));
      if (yolanda) {
        this.settings.voiceURI = yolanda.voiceURI;
        this.saveSettings({ voiceURI: yolanda.voiceURI });
        return;
      }

      // 2. If not already configured or previous voice missing, select best natural voice
      if (!this.settings.voiceURI) {
        const bestVoice =
          spanishVoices.find((v) => this.isHighQualityVoice(v) && !v.lang.startsWith('es-ES')) ||
          spanishVoices.find((v) => this.isHighQualityVoice(v)) ||
          spanishVoices.find((v) => v.lang.startsWith('es-MX') || v.lang.startsWith('es-US') || v.lang.startsWith('es-419')) ||
          spanishVoices[0];

        if (bestVoice) {
          this.settings.voiceURI = bestVoice.voiceURI;
          this.saveSettings({ voiceURI: bestVoice.voiceURI });
        }
      }
    }
  }

  public isHighQualityVoice(v: SpeechSynthesisVoice): boolean {
    const name = v.name.toLowerCase();
    const uri = (v.voiceURI || '').toLowerCase();
    return (
      name.includes('yolanda') ||
      name.includes('natural') ||
      name.includes('neural') ||
      name.includes('google') ||
      name.includes('enhanced') ||
      name.includes('premium') ||
      name.includes('online') ||
      name.includes('siri') ||
      uri.includes('natural') ||
      uri.includes('neural')
    );
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
    return this.voices;
  }

  public getSpanishVoices(): SpeechSynthesisVoice[] {
    const all = this.getAvailableVoices();
    const spanish = all.filter((v) => v.lang.startsWith('es'));

    // Sort Yolanda to the absolute TOP, then other natural/neural voices, then regular
    return spanish.sort((a, b) => {
      const aIsYolanda = a.name.toLowerCase().includes('yolanda');
      const bIsYolanda = b.name.toLowerCase().includes('yolanda');
      if (aIsYolanda && !bIsYolanda) return -1;
      if (!aIsYolanda && bIsYolanda) return 1;

      const aHq = this.isHighQualityVoice(a);
      const bHq = this.isHighQualityVoice(b);
      if (aHq && !bHq) return -1;
      if (!aHq && bHq) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Subtle referee beep using Web Audio API to alert players before the voice
   */
  public playCourtBeep(frequency = 780, durationMs = 85) {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.18, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationMs / 1000);
    } catch {
      // AudioContext might be blocked until user gesture
    }
  }

  /**
   * Speak announcement text
   */
  public speak(text: string, force = false) {
    if (!this.settings.enabled && !force) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      // Cancel previous ongoing speech to prevent backlog delay during fast rallies
      window.speechSynthesis.cancel();

      // Play soft alert beep on speaker
      this.playCourtBeep(680, 80);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.settings.rate;
      utterance.pitch = this.settings.pitch;
      utterance.volume = this.settings.volume;
      utterance.lang = 'es-419';

      const allVoices = this.getAvailableVoices();
      if (this.settings.voiceURI) {
        const found = allVoices.find((v) => v.voiceURI === this.settings.voiceURI);
        if (found) {
          utterance.voice = found;
          utterance.lang = found.lang;
        }
      } else {
        const spanish = this.getSpanishVoices();
        if (spanish.length > 0) {
          utterance.voice = spanish[0];
          utterance.lang = spanish[0].lang;
        }
      }

      this.isSpeaking = true;
      utterance.onend = () => {
        this.isSpeaking = false;
      };
      utterance.onerror = () => {
        this.isSpeaking = false;
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.isSpeaking = false;
    }
  }

  public testVoice() {
    this.speak('Treinta iguales. ¡Punto de oro para la pareja receptora! Saca Pareja Uno.', true);
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }
  }
}

export const voiceAnnouncer = new VoiceAnnouncerService();
