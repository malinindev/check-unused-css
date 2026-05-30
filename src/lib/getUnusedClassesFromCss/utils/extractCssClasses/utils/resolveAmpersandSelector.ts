import {
  type AstRule,
  type AstSelector,
  createParser,
  type Parser,
} from 'css-selector-parser';
import type { Rule } from 'postcss';
import { clearGlobalSelectors } from './clearGlobalSelectors.js';

// Non-strict mode so double-dash modifier classes (`.--variant`) parse; see the
// matching note in extractClassNamesFromRule.ts.
const parseSelector: Parser = createParser({ strict: false });

const getParentRule = (rule: Rule): Rule | null => {
  const { parent } = rule;
  if (parent && parent.type === 'rule') {
    return parent as Rule;
  }
  return null;
};

/**
 * Return the last direct class name of a parsed compound (the right-most
 * `ClassName` in its `items`), ignoring classes that live inside attribute
 * values or pseudo-class arguments (e.g. `[style*=".foo"]`, `:not(.fake)`).
 */
const getLastClassNameOfRule = (rule: AstRule): string | null => {
  let lastClassName: string | null = null;
  for (const item of rule.items) {
    if (item.type === 'ClassName') {
      lastClassName = item.name;
    }
  }
  return lastClassName;
};

/**
 * Return the rightmost (last) class of a selector's right-most compound, or
 * `null` if it has none. For SCSS suffix concatenation (`&-faded`), the suffix
 * joins to the IMMEDIATE parent class — the last class of a compound parent like
 * `.root.--variant` (→ `--variant`), not the first (`root`).
 *
 * Parsing (rather than a raw regex) is required so a `.`-prefixed token inside
 * an attribute value or pseudo-class argument is not mistaken for the parent
 * class — e.g. `.item[style*=".foo"]` must resolve to `item`, not `foo`.
 */
const getLastClassName = (selector: string): string | null => {
  let parsed: AstSelector;
  try {
    parsed = parseSelector(clearGlobalSelectors(selector));
  } catch {
    return null;
  }

  // Use the last selector in a list (`.a, .b` → `.b`), then follow the
  // descendant/combinator chain to its right-most compound.
  let rule: AstRule | undefined = parsed.rules.at(-1);
  if (!rule) {
    return null;
  }
  while (rule.nestedRule) {
    rule = rule.nestedRule;
  }

  return getLastClassNameOfRule(rule);
};

export const getParentClassName = (rule: Rule): string | null => {
  const parentRule = getParentRule(rule);
  if (!parentRule) {
    return null;
  }

  const grandParentClassName = getParentClassName(parentRule);

  if (grandParentClassName && parentRule.selector.includes('&')) {
    const resolved = resolveAmpersandSelector(
      parentRule.selector,
      grandParentClassName
    );
    return getLastClassName(resolved);
  }

  return getLastClassName(parentRule.selector);
};

export const resolveAmpersandSelector = (
  selector: string,
  parentClassName: string | null
): string => {
  if (!parentClassName) {
    return selector;
  }

  return selector.replace(/&(?=[A-Za-z0-9_-])/g, `.${parentClassName}`);
};
