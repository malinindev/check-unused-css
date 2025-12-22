const removeGlobalSelectors = (selector: string): string => {
  let result = '';
  let i = 0;

  while (i < selector.length) {
    if (selector.slice(i, i + 8) === ':global(') {
      i += 8;
      let depth = 1;

      while (i < selector.length && depth > 0) {
        if (selector[i] === '(') {
          depth++;
        } else if (selector[i] === ')') {
          depth--;
        }
        i++;
      }
    } else {
      result += selector[i];
      i++;
    }
  }

  return result;
};

/* Removes :global() selectors and & references since css-selector-parser doesn't support them */
export const clearGlobalSelectors = (selector: string): string => {
  let processed = selector;

  processed = removeGlobalSelectors(processed);
  processed = processed.replace(/&/g, '');

  processed = processed.replace(/\s+/g, ' ').trim();

  if (!processed || processed === ' ') {
    return '';
  }

  return processed;
};
