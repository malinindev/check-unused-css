import {
  type AstRule,
  type AstSelector,
  createParser,
  type Parser,
} from 'css-selector-parser';

export type SelectorClassification = 'dead' | 'warn' | 'notMentioned';

const parseSelector: Parser = createParser();

const classNameEquals = (
  item: AstRule['items'][number],
  name: string
): boolean => item.type === 'ClassName' && item.name === name;

const compoundContains = (rule: AstRule, className: string): boolean => {
  for (const item of rule.items) {
    if (classNameEquals(item, className)) return true;
    // Pseudo-class arguments can themselves contain selectors (e.g. :not(.X))
    // — we treat those as a NON-leading reference for the outer rule: they
    // still mean the outer element must carry the unused class's sibling
    // selector, which isn't the same as being targeted BY the unused class.
    // For our purposes, a `.foo:not(.unused)` is NOT dead — it matches any
    // `.foo` that is not also `.unused`. So we only look at top-level items.
  }
  return false;
};

const anyCompoundContains = (
  rule: AstRule | undefined,
  className: string
): boolean => {
  let current: AstRule | undefined = rule;
  while (current) {
    if (compoundContains(current, className)) return true;
    // Pseudo-class arguments may contain nested selectors we should NOT count
    // for leading-compound purposes, but they DO count as "mentioned anywhere"
    // for the warn bucket. Scan them for that purpose.
    for (const item of current.items) {
      if (
        item.type === 'PseudoClass' &&
        item.argument &&
        item.argument.type === 'Selector'
      ) {
        if (selectorMentions(item.argument, className)) return true;
      }
    }
    current = current.nestedRule;
  }
  return false;
};

const selectorMentions = (selector: AstSelector, className: string): boolean =>
  selector.rules.some((r) => anyCompoundContains(r, className));

/**
 * Classifies one effective selector string for the given unused class name.
 *
 * - **dead**: at least one comma-separated selector in the string has the
 *   unused class as a simple selector of its **leading compound**. The rule
 *   can never match any element without that class, so it is safe to remove.
 * - **warn**: the class is mentioned somewhere but no comma-separated entry
 *   is "dead" — i.e. it only appears in a non-leading compound or inside a
 *   pseudo-class argument. Auto-removal is unsafe; surface for manual review.
 * - **notMentioned**: the class does not appear anywhere in the selector.
 *
 * The input is expected to be a fully-resolved effective selector (no SCSS
 * `&` left in it). Callers MUST call `resolveEffectiveSelector` first.
 */
export const classifySelector = (
  selectorText: string,
  unusedClassName: string
): SelectorClassification => {
  let ast: AstSelector;
  try {
    ast = parseSelector(selectorText);
  } catch {
    return 'notMentioned';
  }

  let anyDead = false;
  let anyMentioned = false;

  for (const rule of ast.rules) {
    const leadingHasClass = compoundContains(rule, unusedClassName);
    if (leadingHasClass) {
      anyDead = true;
      anyMentioned = true;
      continue;
    }
    if (anyCompoundContains(rule, unusedClassName)) {
      anyMentioned = true;
    }
  }

  if (anyDead) return 'dead';
  if (anyMentioned) return 'warn';
  return 'notMentioned';
};
