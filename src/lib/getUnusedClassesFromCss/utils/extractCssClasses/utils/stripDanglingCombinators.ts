/**
 * Removing the parent `&` from a nested SCSS/CSS-Modules selector (see
 * clearGlobalSelectors) can leave a combinator (`>`, `+`, `~`) with a missing
 * operand — the `&` it referred to is gone:
 *
 *   `.skipLink + &`  -> `.skipLink +`    (trailing: no right operand)
 *   `& + .after`     -> `+ .after`       (leading: no left operand)
 *   `.a + & + .b`    -> `.a + + .b`       (two combinators, one shared operand)
 *   `.a + &, .b ~ &` -> `.a +, .b ~`     (trailing in each list member)
 *
 * `css-selector-parser` rejects any of these ("Expected rule but '+' found"),
 * which would silently drop every class in the rule. A combinator that lost its
 * `&` operand carries no class of its own, so for class extraction it is pure
 * noise. This normalizes each top-level member of the selector list:
 *
 * - a combinator at the start or end of a member is dropped;
 * - a run that collapses to two or more combinators between two compounds
 *   (e.g. `+ +`) becomes a single descendant combinator (one space);
 * - a lone combinator that still separates two compounds (`.wrapper > .item`)
 *   is preserved verbatim.
 *
 * Commas, combinators, and whitespace inside parens, brackets, or quotes — e.g.
 * `[style*="a>b"]` or `:is(.a + .b)` — are left byte-for-byte untouched; only
 * top-level tokens are considered.
 */

const COMBINATORS = new Set(['>', '+', '~']);
const isWhitespace = (char: string): boolean =>
  char === ' ' || char === '\t' || char === '\n';

type ScannedChar = {
  char: string;
  /** True only outside quotes and outside any `()`/`[]` nesting. */
  topLevel: boolean;
};

/**
 * Walk a selector once, tagging each character with whether it sits at the top
 * level (outside quotes and outside every `()`/`[]` group). Quote spans honor
 * backslash escapes, so an escaped quote inside an attribute value
 * (`[title="a\"b"]`) does not prematurely end the span. This is the single
 * place that understands selector nesting; the splitters below only read the
 * `topLevel` flag.
 */
const scanSelector = (selector: string): ScannedChar[] => {
  const scanned: ScannedChar[] = [];
  let depth = 0;
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < selector.length; i++) {
    const char = selector[i] as string;

    if (quote) {
      scanned.push({ char, topLevel: false });
      if (char === '\\' && i + 1 < selector.length) {
        // Escaped char is a literal; keep it inside the quote span.
        scanned.push({ char: selector[i + 1] as string, topLevel: false });
        i++;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      scanned.push({ char, topLevel: false });
      continue;
    }

    if (char === '(' || char === '[') {
      depth++;
      scanned.push({ char, topLevel: false });
      continue;
    }

    if (char === ')' || char === ']') {
      depth--;
      scanned.push({ char, topLevel: false });
      continue;
    }

    scanned.push({ char, topLevel: depth === 0 });
  }

  return scanned;
};

/** Split a selector into its top-level list members (honoring quotes/brackets). */
const splitTopLevelMembers = (scanned: ScannedChar[]): string[] => {
  const members: string[] = [];
  let current = '';

  for (const { char, topLevel } of scanned) {
    if (topLevel && char === ',') {
      members.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  members.push(current);

  return members;
};

/**
 * Tokenize one member into compound tokens and the raw separators between them.
 * A separator is any run of top-level whitespace and/or combinators; everything
 * else (including bracket/paren/quote spans) accretes into a compound token.
 */
const tokenizeMember = (
  scanned: ScannedChar[]
): { tokens: string[]; separators: string[] } => {
  const tokens: string[] = [];
  const separators: string[] = [];
  let token = '';
  let separator = '';

  const flushToken = (): void => {
    if (token) {
      tokens.push(token);
      token = '';
    }
  };

  for (const { char, topLevel } of scanned) {
    if (topLevel && (isWhitespace(char) || COMBINATORS.has(char))) {
      // Entering a separator run: close the current compound token first.
      flushToken();
      separator += char;
      continue;
    }

    // Leaving a separator run: record it, then resume the compound token.
    if (separator) {
      separators.push(separator);
      separator = '';
    }
    token += char;
  }

  flushToken();

  return { tokens, separators };
};

/**
 * Reduce a raw separator to what should sit between two compounds: a single
 * preserved combinator (`.wrapper > .item`) stays, but a run with no combinator
 * or with several (an `&` was removed from between them) collapses to a plain
 * descendant space.
 */
const normalizeInnerSeparator = (separator: string): string => {
  const combinators = [...separator].filter((char) => COMBINATORS.has(char));
  if (combinators.length === 1) {
    return ` ${combinators[0]} `;
  }
  return ' ';
};

const stripMember = (member: string): string => {
  const { tokens, separators } = tokenizeMember(scanSelector(member));
  if (tokens.length === 0) {
    // No compound survived (e.g. the member was only `&`/combinators); drop it.
    return '';
  }

  // Separators recorded by tokenizeMember only ever sit BETWEEN two compounds,
  // so any leading/trailing combinator has already fallen away with the empty
  // edge token. Join the surviving compounds with normalized separators.
  let result = tokens[0] ?? '';
  for (let i = 1; i < tokens.length; i++) {
    result += normalizeInnerSeparator(separators[i - 1] ?? ' ');
    result += tokens[i];
  }

  return result;
};

export const stripDanglingCombinators = (selector: string): string =>
  splitTopLevelMembers(scanSelector(selector))
    .map(stripMember)
    .filter((member) => member.trim() !== '')
    .join(', ');
