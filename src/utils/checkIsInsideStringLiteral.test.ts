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

  test('handles apostrophe inside double quotes', () => {
    const content =
      'throw new Error("test error with apostrophe - \'"); return <div className={styles.usedClass} />;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles double quotes inside single quotes', () => {
    const content =
      "throw new Error('test error with double quote - \"'); return <div className={styles.usedClass} />;";
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles multiple nested quotes in sequence', () => {
    const content =
      'const x = "first \\"nested\\" string"; const y = \'second "nested" string\'; return styles.usedClass;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles complex mixed quotes with template strings', () => {
    const content =
      'const msg = `Hello ${name} with "quotes" and \'apostrophes\'`; return styles.usedClass;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles quotes inside template string interpolation', () => {
    const content =
      "const html = `<div title=\"${title.replace('\"', '&quot;')}\">${content}</div>`; return styles.usedClass;";
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles escaped quotes in various combinations', () => {
    const content =
      'const str = "He said: \\"I can\'t believe it!\\""; return styles.usedClass;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles multiple template strings with nested quotes', () => {
    const content =
      'const a = `First ${var1} "quote"`; const b = `Second ${var2} \'quote\'`; return styles.usedClass;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('correctly identifies code inside nested quotes', () => {
    const content =
      'const outer = "This is \\"inner string with styles.usedClass\\" content";';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(true);
  });

  test('handles JSON-like strings with mixed quotes', () => {
    const content =
      'const json = \'{"name": "John", "message": "He said \\"Hello\\""}\';\nreturn styles.usedClass;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles regex patterns with quotes', () => {
    const content = 'const regex = /["\'].*?["\']/ ; return styles.usedClass;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles simple regex patterns', () => {
    const content = 'const regex = /test/g; return styles.usedClass;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles regex patterns in conditionals', () => {
    const content =
      'if (text.match(/["\']/) !== null) return styles.usedClass;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('distinguishes between regex and division', () => {
    const content = 'const result = a / b / c; return styles.usedClass;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles regex inside strings correctly', () => {
    const content =
      'const str = "regex: /["\'].*?["\']/ here"; return styles.usedClass;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(true);
  });

  test('handles SQL-like strings with quotes', () => {
    const content =
      'const query = "SELECT * FROM users WHERE name = \'John\' AND status = \\"active\\""; return styles.usedClass;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles HTML attributes with mixed quotes', () => {
    const content =
      'const html = \'<div class="container" data-value="{\\"key\\": \\"value\\"}">\'; return styles.usedClass;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles complex React JSX with quotes', () => {
    const content =
      'const jsx = `<Component prop="${value}" title=\'${title.replace("\\"", "&quot;")}\' />`; return styles.usedClass;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles multiple escaped backslashes with quotes', () => {
    const content =
      'const path = "C:\\\\Users\\\\John\\\\"Documents\\\\""; return styles.usedClass;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles quotes in comments that are not removed', () => {
    const content =
      'const x = 5; /* comment with "quotes" and \'apostrophes\' */ return styles.usedClass;';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles edge case with only quotes', () => {
    const content = '""\'\'``styles.usedClass';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(false);
  });

  test('handles unmatched quotes at the end', () => {
    const content =
      'const complete = "finished"; const incomplete = "unfinished styles.usedClass';
    const matchIndex = content.indexOf('styles.usedClass');

    expect(checkIsInsideStringLiteral(content, matchIndex)).toBe(true);
  });
});
