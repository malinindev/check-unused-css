import { describe, expect, test } from 'bun:test';
import { PassThrough } from 'node:stream';
import { confirmPrompt } from './confirmPrompt.js';

const runPrompt = async (userInput: string): Promise<boolean> => {
  const input = new PassThrough();
  const output = new PassThrough();
  // Drain stdout so the readline interface doesn't buffer indefinitely.
  output.resume();

  const promise = confirmPrompt('Apply? [y/N] ', { input, output });
  input.write(userInput);
  input.end();
  return promise;
};

describe('confirmPrompt', () => {
  test('resolves true for "y"', async () => {
    expect(await runPrompt('y\n')).toBe(true);
  });

  test('resolves true for "Y"', async () => {
    expect(await runPrompt('Y\n')).toBe(true);
  });

  test('resolves true for "yes"', async () => {
    expect(await runPrompt('yes\n')).toBe(true);
  });

  test('resolves true for "YES"', async () => {
    expect(await runPrompt('YES\n')).toBe(true);
  });

  test('resolves true for " yes " (trims whitespace)', async () => {
    expect(await runPrompt('  yes  \n')).toBe(true);
  });

  test('resolves false for empty input', async () => {
    expect(await runPrompt('\n')).toBe(false);
  });

  test('resolves false for "n"', async () => {
    expect(await runPrompt('n\n')).toBe(false);
  });

  test('resolves false for "no"', async () => {
    expect(await runPrompt('no\n')).toBe(false);
  });

  test('resolves false for arbitrary text', async () => {
    expect(await runPrompt('whatever\n')).toBe(false);
  });

  test('resolves false when stdin closes with no line (EOF)', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    output.resume();
    const promise = confirmPrompt('Apply? ', { input, output });
    input.end(); // no data, just EOF
    expect(await promise).toBe(false);
  });

  test('writes the question to the provided output stream', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    let captured = '';
    output.on('data', (chunk: Buffer) => {
      captured += chunk.toString();
    });

    const promise = confirmPrompt('Proceed? [y/N] ', { input, output });
    input.write('y\n');
    input.end();
    await promise;

    expect(captured).toContain('Proceed? [y/N] ');
  });
});
