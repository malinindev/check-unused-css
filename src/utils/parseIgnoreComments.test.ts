import { describe, expect, test } from 'bun:test';
import {
  parseIgnoreCommentsFromCss,
  parseIgnoreCommentsFromTs,
} from './parseIgnoreComments.js';

describe('parseIgnoreComments', () => {
  describe('parseIgnoreCommentsFromCss', () => {
    test('detects file-level disable comment in single-line block comment', () => {
      const content = '/* check-unused-css-disable */\n.class { }';
      const result = parseIgnoreCommentsFromCss(content);

      expect(result.isFileIgnored).toBe(true);
      expect(result.ignoredLines.size).toBe(0);
    });

    test('detects file-level disable comment in multi-line block comment', () => {
      const content = `/* check-unused-css-disable
       */\n.class { }`;
      const result = parseIgnoreCommentsFromCss(content);

      expect(result.isFileIgnored).toBe(true);
      expect(result.ignoredLines.size).toBe(0);
    });

    test('detects disable-next-line comment in single-line block comment', () => {
      const content =
        '.class1 { }\n/* check-unused-css-disable-next-line */\n.class2 { }';
      const result = parseIgnoreCommentsFromCss(content);

      expect(result.isFileIgnored).toBe(false);
      expect(result.ignoredLines.has(3)).toBe(true);
    });

    test('detects disable-next-line comment in multi-line block comment', () => {
      const content = `.class1 { }
/* check-unused-css-disable-next-line
 */
.class2 { }`;
      const result = parseIgnoreCommentsFromCss(content);

      expect(result.isFileIgnored).toBe(false);
      expect(result.ignoredLines.has(4)).toBe(true);
    });

    test('handles multiple block comments', () => {
      const content = `/* check-unused-css-disable */
.class1 { }
/* check-unused-css-disable-next-line */
.class2 { }`;
      const result = parseIgnoreCommentsFromCss(content);

      expect(result.isFileIgnored).toBe(true);
      expect(result.ignoredLines.has(4)).toBe(true);
    });

    test('handles single-line comments', () => {
      const content = '// check-unused-css-disable\n.class { }';
      const result = parseIgnoreCommentsFromCss(content);

      expect(result.isFileIgnored).toBe(true);
    });
  });

  describe('parseIgnoreCommentsFromTs', () => {
    test('detects file-level disable comment in single-line comment', () => {
      const content = '// check-unused-css-disable\nconst x = 1;';
      const result = parseIgnoreCommentsFromTs(content);

      expect(result.isFileIgnored).toBe(true);
      expect(result.ignoredLines.size).toBe(0);
    });

    test('detects file-level disable comment in single-line block comment', () => {
      const content = '/* check-unused-css-disable */\nconst x = 1;';
      const result = parseIgnoreCommentsFromTs(content);

      expect(result.isFileIgnored).toBe(true);
      expect(result.ignoredLines.size).toBe(0);
    });

    test('detects file-level disable comment in multi-line block comment', () => {
      const content = `/* check-unused-css-disable
       */\nconst x = 1;`;
      const result = parseIgnoreCommentsFromTs(content);

      expect(result.isFileIgnored).toBe(true);
      expect(result.ignoredLines.size).toBe(0);
    });

    test('detects disable-next-line comment in single-line comment', () => {
      const content =
        'const x = 1;\n// check-unused-css-disable-next-line\nconst y = 2;';
      const result = parseIgnoreCommentsFromTs(content);

      expect(result.isFileIgnored).toBe(false);
      expect(result.ignoredLines.has(3)).toBe(true);
    });

    test('detects disable-next-line comment in JSX block comment', () => {
      const content = `const x = 1;
{/* check-unused-css-disable-next-line */}
const y = 2;`;
      const result = parseIgnoreCommentsFromTs(content);

      expect(result.isFileIgnored).toBe(false);
      expect(result.ignoredLines.has(3)).toBe(true);
    });

    test('handles complex multi-line block comment', () => {
      const content = `/*
 * check-unused-css-disable
 * This is a multi-line comment
 */
const x = 1;`;
      const result = parseIgnoreCommentsFromTs(content);

      expect(result.isFileIgnored).toBe(true);
    });

    test('returns empty ignored lines when no disable comments', () => {
      const content = '.class { }\nconst x = 1;';
      const result = parseIgnoreCommentsFromTs(content);

      expect(result.isFileIgnored).toBe(false);
      expect(result.ignoredLines.size).toBe(0);
    });
  });
});
