export type ChallengeLink = {
  categoryId: string;
  roomId: string;
};

export function encodeChallengeToken(challenge: ChallengeLink): string {
  return encodeBase64Url(JSON.stringify({ c: challenge.categoryId, r: challenge.roomId }));
}

export function decodeChallengeToken(token: string): ChallengeLink | null {
  try {
    const parsed = JSON.parse(decodeBase64Url(token)) as {
      c?: unknown;
      r?: unknown;
    };

    if (typeof parsed.c !== 'string' || typeof parsed.r !== 'string') {
      return null;
    }

    return {
      categoryId: parsed.c,
      roomId: parsed.r,
    };
  } catch {
    return null;
  }
}

function encodeBase64Url(value: string): string {
  const base64 = btoa(value);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    Math.ceil(value.length / 4) * 4,
    '=',
  );
  return atob(padded);
}
