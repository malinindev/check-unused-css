import type { AstRule, AstSelector } from 'css-selector-parser';

export const findClassNamesInSelector = (selector: AstSelector): string[] => {
  if (!selector.rules.length) {
    return [];
  }

  const classNames: string[] = [];

  const extractClassNamesFromRule = (rule: AstRule): void => {
    for (const item of rule.items) {
      // A bare `:global` (no argument) is a CSS-Modules scope SWITCH: every
      // compound to its right — in this selector and in its nested rules — is
      // global, so stop collecting this branch. The function form
      // `:global(.foo)` carries an argument and is left alone (its inner class
      // is global, not collected, but `.foo .bar` keeps `.bar` local).
      if (
        item.type === 'PseudoClass' &&
        item.name === 'global' &&
        !item.argument
      ) {
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
