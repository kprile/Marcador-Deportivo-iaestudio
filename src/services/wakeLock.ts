class ScreenWakeLockService {
  private wakeLock: WakeLockSentinel | null = null;
  private isRequested = false;

  public async requestWakeLock(): Promise<boolean> {
    this.isRequested = true;
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false;
    }

    try {
      this.wakeLock = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
        // Re-request if still wanted and page becomes visible again
        if (this.isRequested && document.visibilityState === 'visible') {
          this.requestWakeLock();
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  public async releaseWakeLock() {
    this.isRequested = false;
    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch {
        // ignore
      }
      this.wakeLock = null;
    }
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }
}

export const screenWakeLock = new ScreenWakeLockService();
