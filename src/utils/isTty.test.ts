import { afterEach, describe, expect, test } from 'bun:test';
import { isInteractiveTty } from './isTty.js';

const setTty = (
  stream: NodeJS.ReadStream | NodeJS.WriteStream,
  value: unknown
) => {
  Object.defineProperty(stream, 'isTTY', {
    value,
    configurable: true,
    writable: true,
  });
};

describe('isInteractiveTty', () => {
  const originalIn = process.stdin.isTTY;
  const originalOut = process.stdout.isTTY;

  afterEach(() => {
    setTty(process.stdin, originalIn);
    setTty(process.stdout, originalOut);
  });

  test('both stdin and stdout TTY → true', () => {
    setTty(process.stdin, true);
    setTty(process.stdout, true);
    expect(isInteractiveTty()).toBe(true);
  });

  test('stdin TTY but stdout piped → false (prompt would be invisible)', () => {
    setTty(process.stdin, true);
    setTty(process.stdout, false);
    expect(isInteractiveTty()).toBe(false);
  });

  test('stdout TTY but stdin piped → false (cannot read a response)', () => {
    setTty(process.stdin, false);
    setTty(process.stdout, true);
    expect(isInteractiveTty()).toBe(false);
  });

  test('isTTY undefined on either side → false', () => {
    setTty(process.stdin, undefined);
    setTty(process.stdout, undefined);
    expect(isInteractiveTty()).toBe(false);
  });
});
