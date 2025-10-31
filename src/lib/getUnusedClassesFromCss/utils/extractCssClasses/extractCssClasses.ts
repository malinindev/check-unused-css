import postcssScss from 'postcss-scss';
import { parseIgnoreCommentsFromCss } from '../../../../utils/parseIgnoreComments.js';
import { extractClassNamesFromRule } from './utils/extractClassNamesFromRule.js';
import { extractComposedClasses } from './utils/extractComposedClasses.js';

export type CssClassInfo = {
  className: string;
  line: number;
  column: number;
};

export const extractCssClasses = (cssContent: string): string[] => {
  const { isFileIgnored, ignoredLines } =
    parseIgnoreCommentsFromCss(cssContent);

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

  const composedClasses = extractComposedClasses(root);
  for (const composedClassName of composedClasses) {
    classNames.delete(composedClassName);
  }

  return Array.from(classNames);
};

export const extractCssClassesWithLocations = (
  cssContent: string
): CssClassInfo[] => {
  const { isFileIgnored, ignoredLines } =
    parseIgnoreCommentsFromCss(cssContent);

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

  const composedClasses = extractComposedClasses(root);
  for (const composedClassName of composedClasses) {
    classInfoMap.delete(composedClassName);
  }

  return Array.from(classInfoMap.values());
};
