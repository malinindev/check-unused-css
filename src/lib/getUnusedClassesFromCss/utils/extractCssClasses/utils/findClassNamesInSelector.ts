import type { AstRule, AstSelector } from 'css-selector-parser';

export const findClassNamesInSelector = (selector: AstSelector): string[] => {
  if (!selector.rules.length) {
    return [];
  }

  const classNames: string[] = [];

  const extractClassNamesFromRule = (rule: AstRule): void => {
    for (const item of rule.items) {
      if (item.type === 'ClassName') {
        classNames.push(item.name);
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
