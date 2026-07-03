import type { Rule } from 'postcss';
import postcssScss from 'postcss-scss';
import { parseIgnoreComments } from '../../../../utils/parseIgnoreComments.js';
import {
  extractClassNamesFromAtRule,
  extractClassNamesFromRule,
} from './utils/extractClassNamesFromRule.js';
import { isInsideGlobalScope } from './utils/isInsideGlobalScope.js';
import { isSelectorBearingAtRule } from './utils/isSelectorBearingAtRule.js';

export type CssClassInfo = {
  className: string;
  line: number;
  column: number;
};

/**
 * The local class names a single rule defines, honoring CSS-Modules scope.
 *
 * The rule's inherited scope (global when it sits inside a bare `:global {}`
 * block) is passed as the extraction's starting scope; bare `:global`/`:local`
 * switches within the rule's own selector then toggle it per compound, so a
 * plain class stays global while a `:local` switch or `:local(...)` form flips
 * back to local (issue #101).
 */
const resolveRuleClassNames = (rule: Rule): string[] =>
  extractClassNamesFromRule(rule, isInsideGlobalScope(rule));

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

    const ruleClassNames = resolveRuleClassNames(rule);
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

    const ruleClassNames = resolveRuleClassNames(rule);
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

  return Array.from(classInfoMap.values());
};
