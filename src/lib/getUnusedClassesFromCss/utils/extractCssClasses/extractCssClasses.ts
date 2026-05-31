import postcssScss from 'postcss-scss';
import { parseIgnoreComments } from '../../../../utils/parseIgnoreComments.js';
import {
  extractClassNamesFromAtRule,
  extractClassNamesFromRule,
} from './utils/extractClassNamesFromRule.js';
import { extractComposedClasses } from './utils/extractComposedClasses.js';
import { isSelectorBearingAtRule } from './utils/isSelectorBearingAtRule.js';

export type CssClassInfo = {
  className: string;
  line: number;
  column: number;
};

export const extractCssClasses = (cssContent: string): string[] => {
  const { isFileIgnored, ignoredLines } = parseIgnoreComments(cssContent);

  if (isFileIgnored) {
    return [];
  }

  const classNames = new Set<string>();

  const root = postcssScss.parse(cssContent);

  root.walkRules((rule) => {
    if (rule.source?.start && ignoredLines.has(rule.source.start.line)) {
      return;
    }

    const ruleClassNames = extractClassNamesFromRule(rule);
    for (const className of ruleClassNames) {
      classNames.add(className);
    }
  });

  // Selector-bearing custom at-rules (e.g. `@responsive .item[style*="…"]`)
  // hold their selector in `params` with no inner rule node, so `walkRules`
  // never visits them. Extract their classes from the at-rule params.
  root.walkAtRules((atRule) => {
    if (atRule.source?.start && ignoredLines.has(atRule.source.start.line)) {
      return;
    }

    if (!isSelectorBearingAtRule(atRule)) {
      return;
    }

    const atRuleClassNames = extractClassNamesFromAtRule(atRule);
    for (const className of atRuleClassNames) {
      classNames.add(className);
    }
  });

  const composedClasses = extractComposedClasses(root);
  for (const composedClassName of composedClasses) {
    classNames.delete(composedClassName);
  }

  return Array.from(classNames);
};

export const extractCssClassesWithLocations = (
  cssContent: string
): CssClassInfo[] => {
  const { isFileIgnored, ignoredLines } = parseIgnoreComments(cssContent);

  if (isFileIgnored) {
    return [];
  }

  const classInfoMap = new Map<string, CssClassInfo>();

  const root = postcssScss.parse(cssContent);

  root.walkRules((rule) => {
    if (rule.source?.start && ignoredLines.has(rule.source.start.line)) {
      return;
    }

    const ruleClassNames = extractClassNamesFromRule(rule);
    for (const className of ruleClassNames) {
      // Only keep the first occurrence of each class
      if (!classInfoMap.has(className) && rule.source?.start) {
        classInfoMap.set(className, {
          className,
          line: rule.source.start.line,
          column: rule.source.start.column,
        });
      }
    }
  });

  // Selector-bearing custom at-rules (e.g. `@responsive .item[style*="…"]`)
  // hold their selector in `params` with no inner rule node, so `walkRules`
  // never visits them. Extract their classes from the at-rule params.
  root.walkAtRules((atRule) => {
    if (atRule.source?.start && ignoredLines.has(atRule.source.start.line)) {
      return;
    }

    if (!isSelectorBearingAtRule(atRule)) {
      return;
    }

    const atRuleClassNames = extractClassNamesFromAtRule(atRule);
    for (const className of atRuleClassNames) {
      // Only keep the first occurrence of each class
      if (!classInfoMap.has(className) && atRule.source?.start) {
        classInfoMap.set(className, {
          className,
          line: atRule.source.start.line,
          column: atRule.source.start.column,
        });
      }
    }
  });

  const composedClasses = extractComposedClasses(root);
  for (const composedClassName of composedClasses) {
    classInfoMap.delete(composedClassName);
  }

  return Array.from(classInfoMap.values());
};
