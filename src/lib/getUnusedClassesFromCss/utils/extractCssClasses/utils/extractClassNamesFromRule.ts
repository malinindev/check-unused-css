import { createParser, type Parser } from 'css-selector-parser';
import type { Rule } from 'postcss';
import { clearGlobalSelectors } from './clearGlobalSelectors.js';
import { findClassNamesInSelector } from './findClassNamesInSelector.js';
import {
  getParentClassName,
  resolveAmpersandSelector,
} from './resolveAmpersandSelector.js';

const parseSelector: Parser = createParser();

export const extractClassNamesFromRule = (rule: Rule): string[] => {
  try {
    const parentClassName = getParentClassName(rule);
    const resolved = resolveAmpersandSelector(rule.selector, parentClassName);

    const processedSelector = clearGlobalSelectors(resolved);
    const parsed = parseSelector(processedSelector);

    if (Array.isArray(parsed)) {
      return parsed.flatMap(findClassNamesInSelector);
    }

    return findClassNamesInSelector(parsed);
  } catch {
    return [];
  }
};
