import {
  type AstRule,
  type AstSelector,
  createParser,
  type Parser,
} from 'css-selector-parser';

export type SelectorClassification = 'dead' | 'warn' | 'notMentioned';

const parseSelector: Parser = createParser();

// css-selector-parser rejects CSS Modules' :global(...) as an unknown pseudo-
// class. Replace each occurrence with an opaque placeholder class that's
// unlikely to collide with any real user class — the placeholder preserves
// the positional slot (so leading-compound math still works) but never
// matches any unused class name.
const GLOBAL_PLACEHOLDER = '.__scuc_global_placeholder__';

type ReplaceGlobalsResult = { text: string; balanced: boolean };

const replaceGlobals = (selector: string): ReplaceGlobalsResult => {
  let out = '';
  let i = 0;
  let balanced = true;
  while (i < selector.length) {
    if (selector.slice(i, i + 8) === ':global(') {
      out += GLOBAL_PLACEHOLDER;
      i += 8;
      let depth = 1;
      while (i < selector.length && depth > 0) {
        if (selector[i] === '(') depth++;
        else if (selector[i] === ')') depth--;
        i++;
      }
      if (depth > 0) balanced = false;
    } else {
      out += selector[i];
      i++;
    }
  }
  return { text: out, balanced };
};

const classNameEquals = (
  item: AstRule['items'][number],
  name: string
): boolean => item.type === 'ClassName' && item.name === name;

// Top-level items only — pseudo-class arguments are intentionally skipped so
// `.foo:not(.unused)` is NOT considered a dead match for `.unused`.
const compoundContains = (rule: AstRule, className: string): boolean =>
  rule.items.some((item) => classNameEquals(item, className));

// Deep scan including pseudo-class argument selectors — used for the warn
// bucket, where "mentioned anywhere" is enough.
const anyCompoundContains = (
  rule: AstRule | undefined,
  className: string
): boolean => {
  let current: AstRule | undefined = rule;
  while (current) {
    if (compoundContains(current, className)) return true;
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
  const sanitized = replaceGlobals(selectorText);
  if (!sanitized.balanced) {
    // Unbalanced `:global(` — we can't trust any classification of the tail.
    // Demote to 'warn' so the rule is surfaced for manual review rather than
    // silently deleted.
    console.warn(
      `check-unused-css: unbalanced :global(...) in selector "${selectorText}" — treating as warn for manual review.`
    );
    return 'warn';
  }

  let ast: AstSelector;
  try {
    ast = parseSelector(sanitized.text);
  } catch (err) {
    // A parser throw must NEVER silently promote to 'notMentioned': that
    // value participates in the OR-reduce in buildChangePlan, where a dead
    // verdict from a different parent-slice could then remove a rule whose
    // selector we never actually classified. Demote to 'warn' and surface.
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `check-unused-css: failed to parse selector "${selectorText}" (${message}) — treating as warn for manual review.`
    );
    return 'warn';
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
