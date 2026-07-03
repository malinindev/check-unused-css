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
 * Collect the local class names a selector defines.
 *
 * `initialScope` is the scope the selector starts in, inherited from its
 * ancestors: `false` (local) at the top level, `true` (global) for a rule nested
 * inside a bare `:global {}` block (issue #101). Within the selector a bare
 * `:global`/`:local` switch toggles the scope of every compound to its right —
 * in this selector AND its nested rules — and the nearest (last) switch wins
 * (`:global :local .x` is local, `:local :global .x` is global). Plain class
 * tokens are collected only while in local scope.
 *
 * The function forms `:global(.foo)`/`:local(.foo)` are NOT switches: they never
 * change the running scope. `:local(.foo)` always collects its inner classes as
 * local regardless of scope (issue #97); `:global(.foo)` never collects its
 * argument. The scope is threaded through `rule.nestedRule` and into pseudo-class
 * selector arguments (`:not(...)`) so the whole chain shares one running state.
 */
export const findClassNamesInSelector = (
  selector: AstSelector,
  initialScope = false
): string[] => {
  if (!selector.rules.length) {
    return [];
  }

  const classNames: string[] = [];

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
        classNames.push(...findClassNamesInSelector(item.argument, global));
      }
    }

    if (rule.nestedRule) {
      extractClassNamesFromRule(rule.nestedRule, global);
    }
  };

  for (const rule of selector.rules) {
    extractClassNamesFromRule(rule, initialScope);
  }

  return classNames;
};
