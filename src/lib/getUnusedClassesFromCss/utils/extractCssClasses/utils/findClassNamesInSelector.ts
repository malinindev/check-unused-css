import type { AstRule, AstSelector } from 'css-selector-parser';
import { isGlobalSwitchItem } from './selectorParser.js';

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
