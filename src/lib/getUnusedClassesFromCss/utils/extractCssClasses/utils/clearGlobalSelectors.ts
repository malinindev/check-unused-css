import { stripDanglingCombinators } from './stripDanglingCombinators.js';

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

/* Removes :global() selectors, & references, and leading combinators since css-selector-parser doesn't support them */
export const clearGlobalSelectors = (selector: string): string => {
  let processed = selector;

  processed = removeGlobalSelectors(processed);
  processed = processed.replace(/&/g, '');

  processed = processed.replace(/\s+/g, ' ').trim();

  // Removing `&` can orphan a combinator that referred to it — a leading one
  // (`& > .item` -> `> .item`), a trailing one (`.skipLink + &` -> `.skipLink +`,
  // issue #96), or two around it (`.a + & + .b` -> `.a + + .b`). Any of these
  // makes the parser reject the whole selector; strip the orphans so the real
  // compounds survive.
  processed = stripDanglingCombinators(processed);

  if (!processed || processed === ' ') {
    return '';
  }

  return processed;
};
