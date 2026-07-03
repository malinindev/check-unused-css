import type { Rule } from 'postcss';
import postcssScss from 'postcss-scss';
import { parseIgnoreComments } from '../../../../utils/parseIgnoreComments.js';
import {
  extractClassNamesFromAtRule,
  extractClassNamesFromRule,
  extractLocalRescopedClassNamesFromRule,
} from './utils/extractClassNamesFromRule.js';
import {
  isInsideGlobalScope,
  selectorHasLocalSwitch,
} from './utils/isInsideGlobalScope.js';
import { isSelectorBearingAtRule } from './utils/isSelectorBearingAtRule.js';

export type CssClassInfo = {
  className: string;
  line: number;
  column: number;
};

/**
 * The local class names a single rule defines, honoring CSS-Modules scope.
 *
 * A rule inside a bare `:global` block is global, so only classes flipped back
 * to local count: either the whole rule via a bare `:local` switch on its own
 * selector (`:local .x`), or an individual `:local(.foo)` function form. A rule
 * in local scope defines every class its selector names, as usual (issue #101).
 */
const resolveRuleClassNames = (rule: Rule): string[] => {
  if (isInsideGlobalScope(rule) && !selectorHasLocalSwitch(rule.selector)) {
    return extractLocalRescopedClassNamesFromRule(rule);
  }

  return extractClassNamesFromRule(rule);
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
