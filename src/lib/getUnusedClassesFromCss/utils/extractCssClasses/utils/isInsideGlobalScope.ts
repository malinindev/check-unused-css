import type { AstRule, AstSelector } from 'css-selector-parser';
import type { Container, Document, Rule } from 'postcss';
import { clearGlobalSelectors } from './clearGlobalSelectors.js';
import {
  isGlobalSwitchItem,
  isLocalSwitchItem,
  parseSelector,
} from './selectorParser.js';

/**
 * The bare-switch scope a single selector opens for its nested rules, or `null`
 * when it opens none. `:global`/`:local` (no argument) are switches; the
 * function forms `:global(.foo)`/`:local(.foo)` are not.
 */
type SwitchScope = 'global' | 'local' | null;

/**
 * The last bare switch in a parsed rule chain wins (SCSS concatenates nested
 * rules left to right, so a later switch overrides an earlier one on the same
 * chain, e.g. `:global :local .x` is local). Returns `null` if the chain has
 * no bare switch at all.
 */
const ruleSwitchScope = (rule: AstRule): SwitchScope => {
  let scope: SwitchScope = null;

  for (const item of rule.items) {
    if (isGlobalSwitchItem(item)) {
      scope = 'global';
    } else if (isLocalSwitchItem(item)) {
      scope = 'local';
    }
  }

  if (rule.nestedRule) {
    const nested = ruleSwitchScope(rule.nestedRule);
    if (nested !== null) {
      return nested;
    }
  }

  return scope;
};

/**
 * The bare `:global`/`:local` scope SWITCH a selector string opens, or `null`
 * when it opens none. The bare form turns every nested rule's classes global
 * (or back to local), so a rule inherits the scope of its nearest switching
 * ancestor. The function forms `:global(.foo)`/`:local(.foo)` are NOT switches.
 */
const selectorSwitchScope = (selector: string): SwitchScope => {
  // Cheap reject for the common case (no switch keyword at all) — avoids a
  // parser allocation on every ancestor of every rule in switch-free sheets.
  if (!selector.includes(':global') && !selector.includes(':local')) {
    return null;
  }

  let parsed: AstSelector;
  try {
    parsed = parseSelector(clearGlobalSelectors(selector));
  } catch {
    return null;
  }

  // Across a selector list (`:global .a, :local .b`) the members can disagree;
  // there is no single scope. This mainly matters for the single-member ancestor
  // selectors we test — take the last SWITCH-BEARING member as the effective one
  // (members with no switch, e.g. the `.b` in `:global .a, .b`, leave it as is).
  let scope: SwitchScope = null;
  for (const rule of parsed.rules) {
    const ruleScope = ruleSwitchScope(rule);
    if (ruleScope !== null) {
      scope = ruleScope;
    }
  }

  return scope;
};

/**
 * A rule lives in global scope when its nearest scope-switching ancestor opens a
 * bare `:global` block/switch (e.g. `:global { .foo {} }` or `:global .scoped {
 * .deep {} }`) and no closer `:local` switch flips it back. SCSS nesting
 * concatenates the child selector to the right of the switch, so the child
 * inherits that scope.
 *
 * The nearest switch wins: `:global { :local { .x {} } }` puts `.x` back in
 * local scope. The function forms `:global(.foo)` / `:local(.foo)` are NOT
 * switches — `:global(.foo) { .bar {} }` leaves `.bar` local (issue #91), and a
 * `:local(.foo)` FUNCTION form nested in a `:global` block re-scopes only `.foo`,
 * not its plain-class descendants (issue #101, handled in `extractCssClasses`).
 *
 * At-rules between the switch and the class (`:global { @media … { .g {} } }`)
 * are walked through, not stopped at: only `rule` ancestors carry a selector to
 * test, but a non-`rule` ancestor must not end the walk or the `.g` above would
 * be missed.
 */
export const isInsideGlobalScope = (rule: Rule): boolean => {
  let parent: Container | Document | undefined = rule.parent;

  while (parent) {
    if (parent.type === 'rule') {
      const scope = selectorSwitchScope((parent as Rule).selector);
      if (scope !== null) {
        return scope === 'global';
      }
    }
    parent = parent.parent;
  }

  return false;
};
