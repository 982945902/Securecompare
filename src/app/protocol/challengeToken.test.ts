import { describe, expect, it } from 'vitest';
import {
  decodeChallengeToken,
  encodeChallengeToken,
  type ChallengeLink,
} from './challengeToken';

describe('challenge tokens', () => {
  it('encodes category and room without exposing the private value or transport metadata', () => {
    const challenge: ChallengeLink = {
      categoryId: 'salary',
      roomId: 'room-123',
    };

    const token = encodeChallengeToken(challenge);
    const decodedText = atob(token);

    expect(decodedText).not.toContain('"v"');
    expect(decodedText).not.toContain('88.8');
    expect(decodedText).not.toContain('candidate-sdp');
    expect(decodeChallengeToken(token)).toEqual(challenge);
  });
});
