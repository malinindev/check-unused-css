import { afterEach, describe, expect, test } from 'bun:test';
import { isStdinTty } from './isTty.js';

describe('isStdinTty', () => {
  const originalIsTty = process.stdin.isTTY;

  afterEach(() => {
    // Restore to whatever the suite started with.
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalIsTty,
      configurable: true,
      writable: true,
    });
  });

  test('returns true when process.stdin.isTTY is true', () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true,
      writable: true,
    });
    expect(isStdinTty()).toBe(true);
  });

  test('returns false when process.stdin.isTTY is false', () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: false,
      configurable: true,
      writable: true,
    });
    expect(isStdinTty()).toBe(false);
  });

  test('returns false when process.stdin.isTTY is undefined', () => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    expect(isStdinTty()).toBe(false);
  });
});
