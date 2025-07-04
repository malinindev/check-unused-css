import { describe, test, expect } from 'bun:test';
import { checkIsInsideStringLiteral } from './checkIsInsideStringLiteral.js';

describe('checkIsInsideStringLiteral', () => {
  test('returns false for code outside any quotes', () => {
    const content = 'const x = 5; const y = 10;';
    const matchIndex = 10; // position at "const y"

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('returns true when inside single quotes', () => {
    const content = "const x = 'hello world';";
    const matchIndex = 13; // position at "hello"

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(true);
  });

  test('returns true when inside double quotes', () => {
    const content = 'const x = "hello world";';
    const matchIndex = 13; // position at "hello"

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(true);
  });

  test('returns false when after closing single quote', () => {
    const content = "const x = 'hello'; const y = 10;";
    const matchIndex = 25; // position at "const y"

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('returns false when after closing double quote', () => {
    const content = 'const x = "hello"; const y = 10;';
    const matchIndex = 25; // position at "const y"

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('ignores escaped single quotes', () => {
    const content = "const x = 'hello \\'world\\''; const y = 10;";
    const matchIndex = 35; // position at "const y"

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('ignores escaped double quotes', () => {
    const content = 'const x = "hello \\"world\\""; const y = 10;';
    const matchIndex = 35; // position at "const y"

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('returns true when inside template string', () => {
    const content = 'const x = `hello world`;';
    const matchIndex = 13; // position at "hello"

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(true);
  });

  test('returns false when inside template string interpolation', () => {
    const content = 'const x = `hello ${name} world`;';
    const matchIndex = 19; // position at "name"

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('returns true when in template string but outside interpolation', () => {
    const content = 'const x = `hello ${name} world`;';
    const matchIndex = 13; // position at "hello"

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(true);
  });

  test('returns true when in template string after interpolation', () => {
    const content = 'const x = `hello ${name} world`;';
    const matchIndex = 24; // position at "world"

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(true);
  });

  test('handles multiple template string interpolations', () => {
    const content = 'const x = `hello ${first} and ${second} world`;';
    const matchIndex = 35; // position at "second"

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles nested quotes of different types', () => {
    const content = 'const x = "hello \'nested\' world";';
    const matchIndex = 20; // position at "nested"

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(true);
  });

  test('handles empty string content', () => {
    const content = '';
    const matchIndex = 0;

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles match at the beginning of content', () => {
    const content = 'const x = 5;';
    const matchIndex = 0;

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles complex template string with multiple parts', () => {
    const content =
      'const message = `Start ${variable1} middle ${variable2} end`;';
    const matchIndex = 48; // position at "variable2"

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });
});
