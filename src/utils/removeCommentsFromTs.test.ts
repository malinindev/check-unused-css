import { describe, test, expect } from 'bun:test';
import { removeCommentsFromTs } from './removeCommentsFromTs.js';

describe('removeCommentsFromTs', () => {
  test('removes single-line comments', () => {
    const input =
      'const x = 5; // this is a comment\nconst y = 10; // another comment';

    const expected = 'const x = 5; \nconst y = 10; ';

    expect(removeCommentsFromTs(input)).toBe(expected);
  });

  test('removes multi-line comments', () => {
    const input =
      'const x = 5;\n/* this is a multi-line\n   comment */\nconst y = 10;';

    const expected = 'const x = 5;\n\nconst y = 10;';

    expect(removeCommentsFromTs(input)).toBe(expected);
  });

  test('removes both single-line and multi-line comments', () => {
    const input =
      'const x = 5; // single-line comment\n/* multi-line\n   comment */\nconst y = 10; // another single-line';

    const expected = 'const x = 5; \n\nconst y = 10; ';

    expect(removeCommentsFromTs(input)).toBe(expected);
  });

  test('does not modify lines without comments', () => {
    const input =
      'const x = 5;\nconst y = 10;\nfunction test() {\n  return x + y;\n}';

    expect(removeCommentsFromTs(input)).toBe(input);
  });

  test('handles empty string', () => {
    expect(removeCommentsFromTs('')).toBe('');
  });

  test('removes comments at the beginning of line', () => {
    const input = '// comment at the beginning\nconst x = 5;';

    const expected = '\nconst x = 5;';

    expect(removeCommentsFromTs(input)).toBe(expected);
  });

  test('removes nested multi-line comments', () => {
    const input =
      'const x = 5;\n/* outer comment\n   /* inner */\n   continuation of outer */\nconst y = 10;';

    const expected =
      'const x = 5;\n\n   continuation of outer */\nconst y = 10;';

    expect(removeCommentsFromTs(input)).toBe(expected);
  });

  test('handles inline comments', () => {
    const input = 'const x = /* comment */ 5;';
    const expected = 'const x =  5;';

    expect(removeCommentsFromTs(input)).toBe(expected);
  });

  test('does not remove // inside string literals', () => {
    const input = `<svg xmlns="http://www.w3.org/2000/svg" className={styles.svg} />`;
    const expected = `<svg xmlns="http://www.w3.org/2000/svg" className={styles.svg} />`;

    expect(removeCommentsFromTs(input)).toBe(expected);
  });

  test('does not remove // inside single quotes', () => {
    const input = `const url = 'http://example.com/path';`;
    const expected = `const url = 'http://example.com/path';`;

    expect(removeCommentsFromTs(input)).toBe(expected);
  });

  test('removes // outside strings but preserves // inside strings', () => {
    const input = `const url = 'http://example.com'; // this is a comment`;
    const expected = `const url = 'http://example.com'; `;

    expect(removeCommentsFromTs(input)).toBe(expected);
  });

  test('does not remove // inside template literals', () => {
    const input = 'const url = `http://example.com/${path}`;';
    const expected = 'const url = `http://example.com/${path}`;';

    expect(removeCommentsFromTs(input)).toBe(expected);
  });
});
