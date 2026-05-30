import { describe, expect, test } from 'bun:test';
import { extractClassAccesses } from './extractClassAccesses.js';

describe('extractClassAccesses', () => {
  test('dot access styles.foo -> literals [foo]', () => {
    const result = extractClassAccesses('const c = styles.foo;', ['styles']);
    expect(result).toHaveLength(1);
    expect(result[0]?.classification).toEqual({
      kind: 'literals',
      classNames: ['foo'],
    });
  });

  test('collects multiple accesses in one file', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: template literal inside a test-input string
    const src = 'const a = styles.first;\nconst b = styles[`b-${x}`];';
    const result = extractClassAccesses(src, ['styles']);
    expect(result).toHaveLength(2);
    expect(result[0]?.classification.kind).toBe('literals');
    expect(result[1]?.classification.kind).toBe('pattern');
  });

  test('filters by import name (other[x] ignored when importNames=[styles])', () => {
    const result = extractClassAccesses('const c = other[variant];', [
      'styles',
    ]);
    expect(result).toHaveLength(0);
  });

  test('classifies under an alternative import name', () => {
    const result = extractClassAccesses(
      "const c = classes[cond ? 'a' : 'b'];",
      ['classes']
    );
    expect(result).toHaveLength(1);
    expect(result[0]?.classification).toEqual({
      kind: 'literals',
      classNames: ['a', 'b'],
    });
  });

  test('still records a coversAll access on an ignored line (no false-positive gap)', () => {
    // An ignore directive must NOT drop a dynamic access from coverage: doing so
    // would re-open the module to unused-checking and surface false positives
    // for classes referenced only via this dynamic access.
    const src =
      '// check-unused-css-disable-next-line\nconst c = styles[variant];';
    const result = extractClassAccesses(src, ['styles']);
    expect(result).toHaveLength(1);
    expect(result[0]?.classification.kind).toBe('coversAll');
  });

  test('still records a static access on an ignored line (ignore directives are bypassed here)', () => {
    // Symmetric to the coversAll case: ALL ignore directives are bypassed in
    // this pass, so a dot access on an ignored line is still recorded. (Per-line
    // ignore never affected the unused-CSS static path either.)
    const src = '// check-unused-css-disable-next-line\nconst c = styles.foo;';
    const result = extractClassAccesses(src, ['styles']);
    expect(result).toHaveLength(1);
    expect(result[0]?.classification).toEqual({
      kind: 'literals',
      classNames: ['foo'],
    });
  });

  test('coversAll display reconstructs styles[expr]', () => {
    const result = extractClassAccesses('const c = styles[variant];', [
      'styles',
    ]);
    expect(result[0]?.classification.kind).toBe('coversAll');
    expect(result[0]?.display).toBe('styles[variant]');
  });

  test('column points at the import identifier (styles), 1-based', () => {
    // `const c = styles[variant];` — `styles` starts at column 11 (0-based 10).
    const result = extractClassAccesses('const c = styles[variant];', [
      'styles',
    ]);
    expect(result[0]?.line).toBe(1);
    expect(result[0]?.column).toBe(11);
  });

  test('throws on unparseable source (surfaces as an INTERNAL error naming the file)', () => {
    // The project deliberately treats unparseable input as an internal error
    // rather than silently swallowing a broken file.
    expect(() =>
      extractClassAccesses('const c = styles[<<<;', ['styles'])
    ).toThrow(/Failed to parse source content/);
  });
});
