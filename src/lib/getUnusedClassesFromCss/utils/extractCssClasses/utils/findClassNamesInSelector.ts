import type { AstRule, AstSelector } from 'css-selector-parser';
import {
  isGlobalSwitchItem,
  isLocalSwitchItem,
  parseSelector,
} from './selectorParser.js';

/**
 * The CSS-Modules `:local(...)` function form marks its inner classes as local,
 * so they must be collected. The parser captures the argument as a raw String
 * (e.g. `:local(.a .b)` -> `.a .b`), so re-parse it and recurse. Any `:global(...)`
 * nested inside is already stripped upstream by `clearGlobalSelectors`; if a raw
 * argument still fails to parse, skip it rather than dropping the whole selector.
 */
export const findClassNamesInLocalArgument = (argument: string): string[] => {
  try {
    return findClassNamesInSelector(parseSelector(argument));
  } catch {
    return [];
  }
};

/**
 * Collect ONLY the classes explicitly re-scoped to local via a `:local(...)`
 * function form. Used for rules whose inherited scope is global (they sit inside
 * a bare `:global` block): plain classes there are global and must be dropped,
 * but a `:local(.foo)` form flips `.foo` back to local (issue #101).
 *
 * A bare `:local` switch is NOT handled here — it flips the whole rule back to
 * local scope, which `isInsideGlobalScope` already reflects, so such rules go
 * through the full `findClassNamesInSelector` path (which itself toggles on both
 * `:global` and `:local` switches within the selector chain) instead.
 */
export const findLocalRescopedClassNames = (
  selector: AstSelector
): string[] => {
  if (!selector.rules.length) {
    return [];
  }

  const classNames: string[] = [];

  const collectFromRule = (rule: AstRule): void => {
    for (const item of rule.items) {
      if (
        item.type === 'PseudoClass' &&
        item.name === 'local' &&
        item.argument &&
        item.argument.type === 'String'
      ) {
        classNames.push(...findClassNamesInLocalArgument(item.argument.value));
      } else if (
        item.type === 'PseudoClass' &&
        item.argument &&
        item.argument.type === 'Selector'
      ) {
        // Recurse into pseudo-class selector arguments (e.g. `:not(:local(.x))`)
        // so a nested :local form is still found.
        classNames.push(...findLocalRescopedClassNames(item.argument));
      }
    }

    if (rule.nestedRule) {
      collectFromRule(rule.nestedRule);
    }
  };

  for (const rule of selector.rules) {
    collectFromRule(rule);
  }

  return classNames;
};

export const findClassNamesInSelector = (selector: AstSelector): string[] => {
  if (!selector.rules.length) {
    return [];
  }

  const classNames: string[] = [];

  // A bare `:global`/`:local` switch toggles the scope of every compound to its
  // right — in this selector AND its nested rules — and the nearest (last) one
  // wins (`:global :local .x` is local). While in global scope plain classes are
  // dropped; a later bare `:local` resumes collection. The function forms
  // `:global(.foo)`/`:local(.foo)` are NOT switches and never change `isGlobal`.
  // `isGlobal` is threaded through `rule.nestedRule` so the chain carries state.
  const extractClassNamesFromRule = (
    rule: AstRule,
    isGlobal: boolean
  ): void => {
    let global = isGlobal;

    for (const item of rule.items) {
      if (isGlobalSwitchItem(item)) {
        global = true;
        continue;
      }
      if (isLocalSwitchItem(item)) {
        global = false;
        continue;
      }

      if (item.type === 'ClassName') {
        // Plain classes are local only outside a bare `:global` switch.
        if (!global) {
          classNames.push(item.name);
        }
      } else if (
        item.type === 'PseudoClass' &&
        item.name === 'local' &&
        item.argument &&
        item.argument.type === 'String'
      ) {
        // The `:local(.foo)` function form scopes its inner classes as local
        // (issue #97) regardless of the surrounding switch. The parser captures
        // the argument as a raw String, so re-parse it to collect the classes.
        // `:global(.foo)` keeps the opposite behavior: its String argument is
        // intentionally left uncollected.
        classNames.push(...findClassNamesInLocalArgument(item.argument.value));
      } else if (
        item.type === 'PseudoClass' &&
        item.argument &&
        item.argument.type === 'Selector'
      ) {
        // Extract class names from pseudo-class arguments like :not(.class),
        // carrying the current switch scope into the argument.
        classNames.push(
          ...(global
            ? findLocalRescopedClassNames(item.argument)
            : findClassNamesInSelector(item.argument))
        );
      }
    }

    if (rule.nestedRule) {
      extractClassNamesFromRule(rule.nestedRule, global);
    }
  };

  for (const rule of selector.rules) {
    extractClassNamesFromRule(rule, false);
  }

  return classNames;
};
