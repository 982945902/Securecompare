const clientSecretKey = 'securecompare:leaderboard:clientSecret';
const fingerprintVersion = 'securecompare-leaderboard:v1';
let fallbackClientSecret: string | null = null;

export async function getLeaderboardFingerprint(schemaId: string): Promise<string> {
  const secret = getOrCreateClientSecret();
  return sha256Hex(`${fingerprintVersion}:${schemaId}:${secret}`);
}

function getOrCreateClientSecret(): string {
  const existing = readClientSecret();
  if (existing) {
    return existing;
  }

  if (fallbackClientSecret) {
    return fallbackClientSecret;
  }

  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  const secret = toHex(bytes);
  if (!writeClientSecret(secret)) {
    fallbackClientSecret = secret;
  }
  return secret;
}

function readClientSecret(): string | null {
  try {
    return globalThis.localStorage?.getItem(clientSecretKey) ?? null;
  } catch {
    return null;
  }
}

function writeClientSecret(secret: string): boolean {
  try {
    globalThis.localStorage?.setItem(clientSecretKey, secret);
    return true;
  } catch {
    return false;
  }
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  return toHex(new Uint8Array(digest));
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
