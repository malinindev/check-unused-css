import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { buildPatternRegex } from './buildPatternRegex.js';
import type { AccessClassification } from './types.js';

/**
 * Recursively collect the string-literal leaves of a (possibly nested) ternary.
 * Returns `null` if any reachable leaf is not a string literal, signalling the
 * caller to treat the whole expression as `coversAll`.
 */
const collectLiteralLeaves = (node: TSESTree.Expression): string[] | null => {
  if (node.type === 'ConditionalExpression') {
    const consequent = collectLiteralLeaves(node.consequent);
    const alternate = collectLiteralLeaves(node.alternate);
    if (consequent === null || alternate === null) {
      return null;
    }
    return [...consequent, ...alternate];
  }

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return [node.value];
  }

  return null;
};

/**
 * Classify the key of a CSS-module member access into the set of class names it
 * could reference: a concrete literal set, a constant-anchored pattern, or
 * "covers all" for anything not statically reducible.
 */
export const classifyAccessKey = (
  key: TSESTree.Expression
): AccessClassification => {
  // styles['foo']
  if (key.type === 'Literal' && typeof key.value === 'string') {
    return { kind: 'literals', classNames: [key.value] };
  }

  // styles[`btn-${x}`] / styles[`foo`]
  if (key.type === 'TemplateLiteral') {
    const quasis = key.quasis.map((quasi) => quasi.value.cooked);
    if (quasis.some((segment) => segment === null || segment === undefined)) {
      return { kind: 'coversAll' };
    }
    const cooked = quasis as string[];

    // No substitutions: `foo` is a plain literal.
    if (key.expressions.length === 0) {
      return { kind: 'literals', classNames: [cooked.join('')] };
    }

    const built = buildPatternRegex(cooked);
    return built
      ? {
          kind: 'pattern',
          regex: built.regex,
          source: built.source,
          segments: cooked,
        }
      : { kind: 'coversAll' };
  }

  // styles[cond ? 'a' : 'b'] (and nested)
  if (key.type === 'ConditionalExpression') {
    const leaves = collectLiteralLeaves(key);
    return leaves
      ? { kind: 'literals', classNames: leaves }
      : { kind: 'coversAll' };
  }

  // Identifier / MemberExpression / CallExpression / BinaryExpression (incl.
  // string concat) / LogicalExpression / anything else.
  return { kind: 'coversAll' };
};
