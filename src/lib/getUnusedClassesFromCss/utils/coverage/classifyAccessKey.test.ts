import { describe, expect, test } from 'bun:test';
import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { contentToAst } from '../findUnusedClasses/utils/contentToAst.js';
import { classifyAccessKey } from './classifyAccessKey.js';
import type { AccessClassification } from './types.js';

/**
 * Parse a single `styles[...]` expression and return the classification of its
 * computed property key (the part inside the brackets).
 */
const classifyBracketKey = (expr: string): AccessClassification => {
  const ast = contentToAst(expr);
  const statement = ast.body[0];
  if (statement?.type !== 'ExpressionStatement') {
    throw new Error('expected an expression statement');
  }
  const member = statement.expression as TSESTree.MemberExpression;
  if (member.type !== 'MemberExpression' || !member.computed) {
    throw new Error('expected a computed member expression');
  }
  return classifyAccessKey(member.property as TSESTree.Expression);
};

describe('classifyAccessKey', () => {
  test('string literal -> literals', () => {
    expect(classifyBracketKey("styles['foo']")).toEqual({
      kind: 'literals',
      classNames: ['foo'],
    });
  });

  test('template without expressions -> literals', () => {
    expect(classifyBracketKey('styles[`staticClass`]')).toEqual({
      kind: 'literals',
      classNames: ['staticClass'],
    });
  });

  test('template with prefix const -> pattern', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: template literal inside a test-input string
    const c = classifyBracketKey('styles[`btn-${x}`]');
    expect(c.kind).toBe('pattern');
    if (c.kind === 'pattern') {
      expect(c.regex.test('btn-primary')).toBe(true);
      expect(c.regex.test('btn-')).toBe(true);
      expect(c.regex.test('icon')).toBe(false);
    }
  });

  test('template with middle const -> pattern', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: template literal inside a test-input string
    const c = classifyBracketKey('styles[`a-${x}-b`]');
    expect(c.kind).toBe('pattern');
    if (c.kind === 'pattern') {
      expect(c.regex.test('a-foo-b')).toBe(true);
      expect(c.regex.test('a-b')).toBe(false);
    }
  });

  test('template multi-substitution -> pattern', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: template literal inside a test-input string
    const c = classifyBracketKey('styles[`a-${x}-${y}`]');
    expect(c.kind).toBe('pattern');
    if (c.kind === 'pattern') {
      expect(c.regex.test('a-x-y')).toBe(true);
      expect(c.regex.test('a-foo')).toBe(false);
    }
  });

  test('template without const -> coversAll', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: template literal inside a test-input string
    expect(classifyBracketKey('styles[`${x}`]')).toEqual({ kind: 'coversAll' });
  });

  test('template multi without const -> coversAll', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: template literal inside a test-input string
    expect(classifyBracketKey('styles[`${x}${y}`]')).toEqual({
      kind: 'coversAll',
    });
  });

  test('simple ternary of literals -> literals', () => {
    expect(classifyBracketKey("styles[cond ? 'a' : 'b']")).toEqual({
      kind: 'literals',
      classNames: ['a', 'b'],
    });
  });

  test('nested ternary of literals -> literals (all leaves)', () => {
    expect(classifyBracketKey("styles[c1 ? 'a' : c2 ? 'b' : 'c']")).toEqual({
      kind: 'literals',
      classNames: ['a', 'b', 'c'],
    });
  });

  test('ternary with identifier branch -> coversAll', () => {
    expect(classifyBracketKey("styles[cond ? 'a' : variable]")).toEqual({
      kind: 'coversAll',
    });
  });

  test('ternary with call branch -> coversAll', () => {
    expect(classifyBracketKey("styles[cond ? fn() : 'b']")).toEqual({
      kind: 'coversAll',
    });
  });

  test('ternary with template branch -> coversAll (mixed, conservative)', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: template literal inside a test-input string
    expect(classifyBracketKey("styles[cond ? `p-${x}` : 'b']")).toEqual({
      kind: 'coversAll',
    });
  });

  test('bare variable -> coversAll', () => {
    expect(classifyBracketKey('styles[variant]')).toEqual({
      kind: 'coversAll',
    });
  });

  test('member/obj.prop -> coversAll', () => {
    expect(classifyBracketKey('styles[config.theme]')).toEqual({
      kind: 'coversAll',
    });
  });

  test('function call -> coversAll', () => {
    expect(classifyBracketKey('styles[getName()]')).toEqual({
      kind: 'coversAll',
    });
  });

  test('index access -> coversAll', () => {
    expect(classifyBracketKey('styles[arr[0]]')).toEqual({ kind: 'coversAll' });
  });

  test('logical OR -> coversAll', () => {
    expect(classifyBracketKey('styles[a || b]')).toEqual({ kind: 'coversAll' });
  });

  test('logical AND with literal -> coversAll (literal not extracted)', () => {
    expect(classifyBracketKey("styles[cond && 'x']")).toEqual({
      kind: 'coversAll',
    });
  });

  test('nullish coalescing -> coversAll', () => {
    expect(classifyBracketKey("styles[a ?? 'b']")).toEqual({
      kind: 'coversAll',
    });
  });

  test('string concatenation (out of scope) -> coversAll', () => {
    expect(classifyBracketKey("styles['btn-' + x]")).toEqual({
      kind: 'coversAll',
    });
  });

  test('arithmetic -> coversAll', () => {
    expect(classifyBracketKey('styles[count + 1]')).toEqual({
      kind: 'coversAll',
    });
  });
});
