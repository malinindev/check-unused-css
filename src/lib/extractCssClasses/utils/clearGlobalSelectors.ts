/* Removes :global() selectors since css-selector-parser doesn't support them */
export const clearGlobalSelectors = (selector: string): string => {
  let processed = selector;

  processed = processed.replace(/:global\([^)]+\)/g, '');
  processed = processed.replace(/\s+/g, ' ').trim();

  if (!processed || processed === ' ') {
    return '';
  }

  return processed;
};
