import { BluetoothSignal } from '../types/sports';

export type BluetoothActionHandler = (action: 'p1_point' | 'p2_point' | 'undo', signal: BluetoothSignal) => void;
export type DiagnosticSignalListener = (signal: BluetoothSignal) => void;

interface BluetoothConfig {
  doubleClickWindowMs: number; // default 420ms
  acceptedKeys: string[]; // keys treated as shutter triggers
  undoKeys: string[]; // keys treated as instant undo
}

const DEFAULT_CONFIG: BluetoothConfig = {
  doubleClickWindowMs: 420,
  acceptedKeys: [
    'AudioVolumeUp',
    'VolumeUp',
    'AudioVolumeDown',
    'VolumeDown',
    'Enter',
    ' ',
    'Space',
    'MediaPlayPause',
    'MediaTrackNext',
    'ArrowUp',
    'ArrowRight',
  ],
  undoKeys: ['Backspace', 'Escape', 'KeyU', 'u', 'U', 'ArrowDown'],
};

const STORAGE_KEY = 'marcador_bt_shutter_config';

class BluetoothListenerManager {
  private config: BluetoothConfig = DEFAULT_CONFIG;
  private actionHandler: BluetoothActionHandler | null = null;
  private diagnosticListeners: Set<DiagnosticSignalListener> = new Set();

  private clickCount = 0;
  private clickTimer: NodeJS.Timeout | null = null;
  private lastClickTimestamp = 0;
  private isListening = false;

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      this.config = DEFAULT_CONFIG;
    }
  }

  public saveConfig(newConfig: Partial<BluetoothConfig>) {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // ignore
    }
  }

  public getConfig(): BluetoothConfig {
    return { ...this.config };
  }

  public setDoubleTapWindow(ms: number) {
    this.saveConfig({ doubleClickWindowMs: Math.max(200, Math.min(1000, ms)) });
  }

  public setActionHandler(handler: BluetoothActionHandler | null) {
    this.actionHandler = handler;
  }

  public addDiagnosticListener(listener: DiagnosticSignalListener) {
    this.diagnosticListeners.add(listener);
    return () => {
      this.diagnosticListeners.delete(listener);
    };
  }

  public start() {
    if (this.isListening || typeof window === 'undefined') return;
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    this.isListening = true;
  }

  public stop() {
    if (!this.isListening || typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    if (this.clickTimer) {
      clearTimeout(this.clickTimer);
      this.clickTimer = null;
    }
    this.clickCount = 0;
    this.isListening = false;
  }

  private emitSignal(signal: BluetoothSignal) {
    this.diagnosticListeners.forEach((listener) => {
      try {
        listener(signal);
      } catch {
        // ignore
      }
    });
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    // Avoid hijacking input when user is typing in text fields
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }

    const key = event.key;
    const code = event.code;
    const now = Date.now();
    const deltaMs = this.lastClickTimestamp > 0 ? now - this.lastClickTimestamp : 0;
    this.lastClickTimestamp = now;

    // Check direct Undo key
    if (this.config.undoKeys.includes(key) || this.config.undoKeys.includes(code)) {
      event.preventDefault();
      const signal: BluetoothSignal = {
        id: Math.random().toString(36).substring(2, 9),
        key,
        code,
        timestamp: now,
        deltaMs,
        action: 'undo',
        source: 'keyboard',
      };
      this.emitSignal(signal);
      this.actionHandler?.('undo', signal);
      return;
    }

    // Check Shutter Trigger key
    const isTrigger =
      this.config.acceptedKeys.includes(key) ||
      this.config.acceptedKeys.includes(code) ||
      key === 'VolumeUp' ||
      key === 'AudioVolumeUp' ||
      key === 'Enter' ||
      key === ' ' ||
      code === 'Space' ||
      code === 'Enter';

    if (!isTrigger) {
      // Diagnostic broadcast even for unregistered keys so user can see it in console!
      const signal: BluetoothSignal = {
        id: Math.random().toString(36).substring(2, 9),
        key,
        code,
        timestamp: now,
        deltaMs,
        action: 'ignored',
        source: 'keyboard',
      };
      this.emitSignal(signal);
      return;
    }

    // Prevent default browser behavior (e.g. page scroll down on Space, or volume slider popup if possible)
    event.preventDefault();
    event.stopPropagation();

    this.clickCount += 1;

    // If already waiting on a timer
    if (this.clickTimer) {
      clearTimeout(this.clickTimer);
      this.clickTimer = null;
    }

    if (this.clickCount >= 3) {
      // 3 rapid clicks = Undo!
      this.clickCount = 0;
      const signal: BluetoothSignal = {
        id: Math.random().toString(36).substring(2, 9),
        key,
        code,
        timestamp: now,
        deltaMs,
        action: 'undo',
        source: 'keyboard',
      };
      this.emitSignal(signal);
      this.actionHandler?.('undo', signal);
      return;
    }

    // Set timeout to evaluate whether it's 1 or 2 clicks
    this.clickTimer = setTimeout(() => {
      const count = this.clickCount;
      this.clickCount = 0;
      this.clickTimer = null;

      if (count === 1) {
        // Single Click -> Point for Player 1
        const signal: BluetoothSignal = {
          id: Math.random().toString(36).substring(2, 9),
          key,
          code,
          timestamp: Date.now(),
          deltaMs,
          action: 'p1_point',
          source: 'keyboard',
        };
        this.emitSignal(signal);
        this.actionHandler?.('p1_point', signal);
      } else if (count === 2) {
        // Double Click -> Point for Player 2
        const signal: BluetoothSignal = {
          id: Math.random().toString(36).substring(2, 9),
          key,
          code,
          timestamp: Date.now(),
          deltaMs,
          action: 'p2_point',
          source: 'keyboard',
        };
        this.emitSignal(signal);
        this.actionHandler?.('p2_point', signal);
      }
    }, this.config.doubleClickWindowMs);
  };

  /**
   * Simulate a signal for manual tests or diagnostic screen
   */
  public simulateAction(action: 'p1_point' | 'p2_point' | 'undo') {
    const signal: BluetoothSignal = {
      id: Math.random().toString(36).substring(2, 9),
      key: action === 'p1_point' ? 'VolumeUp (1 tap)' : action === 'p2_point' ? 'VolumeUp (2 taps)' : 'Undo (3 taps)',
      code: 'SimulatedTrigger',
      timestamp: Date.now(),
      deltaMs: 0,
      action,
      source: 'touch',
    };
    this.emitSignal(signal);
    this.actionHandler?.(action, signal);
  }
}

export const bluetoothListener = new BluetoothListenerManager();
