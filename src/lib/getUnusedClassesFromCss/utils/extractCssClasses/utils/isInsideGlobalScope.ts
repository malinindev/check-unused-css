import type { AstRule, AstSelector } from 'css-selector-parser';
import type { Container, Document, Rule } from 'postcss';
import { clearGlobalSelectors } from './clearGlobalSelectors.js';
import { isGlobalSwitchItem, parseSelector } from './selectorParser.js';

const ruleHasGlobalSwitch = (rule: AstRule): boolean =>
  rule.items.some(isGlobalSwitchItem) ||
  (rule.nestedRule ? ruleHasGlobalSwitch(rule.nestedRule) : false);

/**
 * Does this selector string contain a bare `:global` scope SWITCH at any point?
 * The bare form turns every nested rule's classes global, so a rule with such
 * an ancestor defines global (not local) classes.
 */
const selectorHasGlobalSwitch = (selector: string): boolean => {
  // Cheap reject for the common case (no `:global` at all) — avoids a parser
  // allocation on every ancestor of every rule in `:global`-free stylesheets.
  if (!selector.includes(':global')) {
    return false;
  }

  let parsed: AstSelector;
  try {
    parsed = parseSelector(clearGlobalSelectors(selector));
  } catch {
    return false;
  }

  return parsed.rules.some(ruleHasGlobalSwitch);
};

/**
 * A rule lives in global scope when any ancestor rule opens a bare `:global`
 * block/switch (e.g. `:global { .foo {} }` or `:global .scoped { .deep {} }`).
 * SCSS nesting concatenates the child selector to the right of the switch, so
 * the child is global too. The function form `:global(.foo) { .bar {} }` does
 * NOT count — `.bar` stays local — which `selectorHasGlobalSwitch` reflects.
 *
 * At-rules between the switch and the class (`:global { @media … { .g {} } }`)
 * are walked through, not stopped at: only `rule` ancestors carry a selector to
 * test, but a non-`rule` ancestor must not end the walk or the `.g` above would
 * be missed.
 */
export const isInsideGlobalScope = (rule: Rule): boolean => {
  let parent: Container | Document | undefined = rule.parent;

  while (parent) {
    if (
      parent.type === 'rule' &&
      selectorHasGlobalSwitch((parent as Rule).selector)
    ) {
      return true;
    }
    parent = parent.parent;
  }

  return false;
};
