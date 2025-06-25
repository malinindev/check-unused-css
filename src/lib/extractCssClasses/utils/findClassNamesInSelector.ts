import type { AstSelector } from 'css-selector-parser';

export const findClassNamesInSelector = (selector: AstSelector): string[] => {
  if (!selector.rules.length) {
    return [];
  }

  const classNames: string[] = [];

  for (const rule of selector.rules) {
    for (const item of rule.items) {
      if (item.type !== 'ClassName') {
        continue;
      }

      classNames.push(item.name);
    }
  }

  return classNames;
};
