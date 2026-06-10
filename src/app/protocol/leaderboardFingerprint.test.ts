import { afterEach, describe, expect, it } from 'vitest';
import { getLeaderboardFingerprint } from './leaderboardFingerprint';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const originalLocalStorage = globalThis.localStorage;

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  });
});

describe('leaderboard fingerprint', () => {
  it('derives a stable per-schema fingerprint from the locally stored secret', async () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'securecompare:leaderboard:clientSecret',
      '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
    );
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });

    await expect(getLeaderboardFingerprint('height')).resolves.toBe(
      await getLeaderboardFingerprint('height'),
    );
    await expect(getLeaderboardFingerprint('height')).resolves.not.toBe(
      await getLeaderboardFingerprint('weight'),
    );
  });

  it('creates and stores a random client secret when none exists', async () => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
    });

    const fingerprint = await getLeaderboardFingerprint('height');

    expect(fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(storage.getItem('securecompare:leaderboard:clientSecret')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('falls back to an in-memory secret when localStorage is unavailable', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('storage-disabled');
      },
    });

    await expect(getLeaderboardFingerprint('height')).resolves.toMatch(/^[0-9a-f]{64}$/);
  });
});
