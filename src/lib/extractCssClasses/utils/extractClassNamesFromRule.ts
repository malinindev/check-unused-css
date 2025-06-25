import { createParser } from 'css-selector-parser';
import type { Rule } from 'postcss';
import { findClassNamesInSelector } from './findClassNamesInSelector.js';

const parseSelector = createParser();

export const extractClassNamesFromRule = (rule: Rule): string[] => {
  try {
    const parsed = parseSelector(rule.selector);

    if (Array.isArray(parsed)) {
      return parsed.flatMap(findClassNamesInSelector);
    }

    return findClassNamesInSelector(parsed);
  } catch {
    return [];
  }
};
