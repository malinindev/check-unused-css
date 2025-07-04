import postcss from 'postcss';
import { extractComposedClasses } from './utils/extractComposedClasses.js';
import { extractClassNamesFromRule } from './utils/extractClassNamesFromRule.js';

export const extractCssClasses = (cssContent: string): string[] => {
  const classNames = new Set<string>();

  const root = postcss.parse(cssContent);

  root.walkRules((rule) => {
    const ruleClassNames = extractClassNamesFromRule(rule);
    for (const className of ruleClassNames) {
      classNames.add(className);
    }
  });

  const composedClasses = extractComposedClasses(root);
  for (const composedClassName of composedClasses) {
    classNames.delete(composedClassName);
  }

  return Array.from(classNames);
};
