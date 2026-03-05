// In-memory device code store for Device Code Flow (RFC 8628 style).
// Single-instance only. To support horizontal scaling, replace the
// MemoryDeviceStore implementation with a Redis/Upstash-backed one
// that satisfies the same DeviceStore interface.

export interface DeviceEntry {
  token?: string;
  exp: number; // Unix timestamp ms
}

export interface DeviceStore {
  create(nonce: string, ttlMs: number): void;
  get(nonce: string): DeviceEntry | undefined;
  complete(nonce: string, token: string): boolean;
  delete(nonce: string): void;
}

class MemoryDeviceStore implements DeviceStore {
  private readonly map = new Map<string, DeviceEntry>();

  constructor() {
    // Purge expired entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, val] of this.map) {
        if (val.exp < now) this.map.delete(key);
      }
    }, 60_000).unref();
  }

  create(nonce: string, ttlMs: number): void {
    this.map.set(nonce, { exp: Date.now() + ttlMs });
  }

  get(nonce: string): DeviceEntry | undefined {
    const entry = this.map.get(nonce);
    if (!entry) return undefined;
    if (entry.exp < Date.now()) {
      this.map.delete(nonce);
      return undefined;
    }
    return entry;
  }

  complete(nonce: string, token: string): boolean {
    const entry = this.get(nonce);
    if (!entry) return false;
    this.map.set(nonce, { ...entry, token });
    return true;
  }

  delete(nonce: string): void {
    this.map.delete(nonce);
  }
}

// Module-level singleton — shared across all API route invocations in the same process.
export const deviceStore: DeviceStore = new MemoryDeviceStore();
