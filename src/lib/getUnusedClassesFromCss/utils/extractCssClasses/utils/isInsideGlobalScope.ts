import type { AstRule, AstSelector } from 'css-selector-parser';
import type { Rule } from 'postcss';
import { clearGlobalSelectors } from './clearGlobalSelectors.js';
import { parseSelector } from './selectorParser.js';

const ruleHasGlobalSwitch = (rule: AstRule): boolean => {
  for (const item of rule.items) {
    // A bare `:global` (no argument) is the scope switch; `:global(.foo)` (with
    // argument) is the function form and does NOT switch nested rules to global.
    if (
      item.type === 'PseudoClass' &&
      item.name === 'global' &&
      !item.argument
    ) {
      return true;
    }
  }
  return rule.nestedRule ? ruleHasGlobalSwitch(rule.nestedRule) : false;
};

/**
 * Does this selector string contain a bare `:global` scope SWITCH at any point?
 * The bare form turns every nested rule's classes global, so a rule with such
 * an ancestor defines global (not local) classes.
 */
const selectorHasGlobalSwitch = (selector: string): boolean => {
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
 */
export const isInsideGlobalScope = (rule: Rule): boolean => {
  let parent = rule.parent;

  while (parent && parent.type === 'rule') {
    if (selectorHasGlobalSwitch((parent as Rule).selector)) {
      return true;
    }
    parent = parent.parent;
  }

  return false;
};
