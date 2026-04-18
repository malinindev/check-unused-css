import type { Container, Document, Root, Rule } from 'postcss';

type AnyAncestor = Container | Document | Root | undefined;

const combineOne = (baseSel: string, childSel: string): string => {
  // SCSS parent-selector substitution. When base is empty, `&` collapses out.
  if (childSel.includes('&')) return childSel.replace(/&/g, baseSel);
  // No '&' → descendant combinator between parent and child (or just the
  // child when there is no parent context to prepend).
  if (baseSel === '') return childSel;
  return `${baseSel} ${childSel}`;
};

const combine = (base: string[], children: string[]): string[] => {
  const result: string[] = [];
  for (const baseSel of base) {
    for (const child of children) {
      result.push(combineOne(baseSel, child.trim()));
    }
  }
  return result;
};

/**
 * Resolves a postcss Rule's selector list into its flat effective form, with
 * every SCSS `&` substituted via its parent-rule chain (Cartesian product
 * across comma-separated parent selectors).
 *
 * Non-rule parents (at-rules like `@media`, `@supports`, mixins) are skipped
 * during the walk — they don't contribute a selector context. A rule inside
 * `@media x { .parent { &.child { } } }` resolves as if it were just
 * `.parent { &.child { } }`.
 */
export const resolveEffectiveSelector = (rule: Rule): string[] => {
  const parentChain: Rule[] = [];
  let current: AnyAncestor = rule.parent;
  while (current) {
    if (current.type === 'rule') {
      parentChain.unshift(current as Rule);
    }
    current = current.parent;
  }

  let base: string[] = [''];
  for (const parent of parentChain) {
    base = combine(base, parent.selectors);
  }
  return combine(base, rule.selectors);
};
