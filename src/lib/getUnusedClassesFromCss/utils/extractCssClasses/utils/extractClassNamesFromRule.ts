import { createParser, type Parser } from 'css-selector-parser';
import type { Rule } from 'postcss';
import { clearGlobalSelectors } from './clearGlobalSelectors.js';
import { findClassNamesInSelector } from './findClassNamesInSelector.js';

const parseSelector: Parser = createParser();

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
