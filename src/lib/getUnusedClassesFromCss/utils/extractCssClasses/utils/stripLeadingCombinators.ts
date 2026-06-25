/**
 * A nested SCSS/CSS-Modules rule may start its selector with a combinator —
 * `> .item`, `+ .sibling`, `~ .general` — which is shorthand for
 * `& > .item` etc. Once the parent `&` is gone (see clearGlobalSelectors),
 * `css-selector-parser` rejects a selector that begins with a bare combinator
 * ("Expected rule but '>' found"), which would make the whole rule's classes
 * silently drop out of extraction.
 *
 * A leading combinator carries no class of its own, so for class extraction it
 * is pure noise: drop the one that begins each top-level selector member,
 * leaving the real compound (`.item`) for the parser.
 *
 * The scan only ever removes a combinator that sits at the start of a member
 * (string start, or right after a top-level comma). Commas, combinators, and
 * whitespace inside parens, brackets, or quotes — e.g. `[style*="rgb(0,0,0)"]`
 * or `:is(.a, .b)` — are left byte-for-byte untouched, so the surrounding
 * selector text is never rewritten.
 */
export const stripLeadingCombinators = (selector: string): string => {
  let result = '';
  let depth = 0;
  let quote: '"' | "'" | null = null;
  // True at the start of the selector and right after every top-level comma:
  // the only positions where a leading combinator may legitimately appear.
  let atMemberStart = true;

  for (let i = 0; i < selector.length; i++) {
    const char = selector[i];

    if (quote) {
      result += char;
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      result += char;
      atMemberStart = false;
      continue;
    }

    if (char === '(' || char === '[') {
      depth++;
      result += char;
      atMemberStart = false;
      continue;
    }

    if (char === ')' || char === ']') {
      depth--;
      result += char;
      atMemberStart = false;
      continue;
    }

    if (depth === 0 && char === ',') {
      result += char;
      atMemberStart = true;
      continue;
    }

    // Leading whitespace before a member's first token is not yet "content".
    if (atMemberStart && (char === ' ' || char === '\t' || char === '\n')) {
      result += char;
      continue;
    }

    if (
      atMemberStart &&
      depth === 0 &&
      (char === '>' || char === '+' || char === '~')
    ) {
      // Drop the combinator and any whitespace it owns; the member start stays
      // open so the following compound becomes the member's first token.
      while (
        i + 1 < selector.length &&
        (selector[i + 1] === ' ' ||
          selector[i + 1] === '\t' ||
          selector[i + 1] === '\n')
      ) {
        i++;
      }
      continue;
    }

    result += char;
    atMemberStart = false;
  }

  return result;
};
