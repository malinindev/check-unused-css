import { createParser } from 'css-selector-parser';
import type { Rule } from 'postcss';
import { findClassNamesInSelector } from './findClassNamesInSelector.js';
import { clearGlobalSelectors } from './clearGlobalSelectors.js';

const parseSelector = createParser();

export const extractClassNamesFromRule = (rule: Rule): string[] => {
  try {
    const processedSelector = clearGlobalSelectors(rule.selector);
    const parsed = parseSelector(processedSelector);

    if (Array.isArray(parsed)) {
      return parsed.flatMap(findClassNamesInSelector);
    }

    return findClassNamesInSelector(parsed);
  } catch {
    return [];
  }
};
