import type { AstRule, AstSelector } from 'css-selector-parser';
import { isGlobalSwitchItem, parseSelector } from './selectorParser.js';

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

export const findClassNamesInSelector = (selector: AstSelector): string[] => {
  if (!selector.rules.length) {
    return [];
  }

  const classNames: string[] = [];

  const extractClassNamesFromRule = (rule: AstRule): void => {
    for (const item of rule.items) {
      // A bare `:global` switch makes every compound to its right — in this
      // selector and in its nested rules — global, so stop collecting this
      // branch. (The function form `:global(.foo)` is not a switch; its inner
      // class is simply not collected, while `:global(.foo) .bar` keeps `.bar`.)
      if (isGlobalSwitchItem(item)) {
        return;
      }

      if (item.type === 'ClassName') {
        classNames.push(item.name);
      } else if (
        item.type === 'PseudoClass' &&
        item.name === 'local' &&
        item.argument &&
        item.argument.type === 'String'
      ) {
        // The `:local(.foo)` function form scopes its inner classes as local
        // (issue #97). The parser captures the argument as a raw String, so
        // re-parse it to collect the classes. `:global(.foo)` keeps the opposite
        // behavior: its String argument is intentionally left uncollected.
        classNames.push(...findClassNamesInLocalArgument(item.argument.value));
      } else if (
        item.type === 'PseudoClass' &&
        item.argument &&
        item.argument.type === 'Selector'
      ) {
        // Extract class names from pseudo-class arguments like :not(.class)
        classNames.push(...findClassNamesInSelector(item.argument));
      }
    }

    if (rule.nestedRule) {
      extractClassNamesFromRule(rule.nestedRule);
    }
  };

  for (const rule of selector.rules) {
    extractClassNamesFromRule(rule);
  }

  return classNames;
};
