import { createParser, type Parser } from 'css-selector-parser';

/**
 * Shared `css-selector-parser` instance for class extraction.
 *
 * - `strict: false` lets identifiers start with two hyphens (`.--reversed`,
 *   `.root.--variant`) — a common CSS-Modules modifier convention strict mode
 *   rejects — and tolerates truncated selectors, extracting the recognizable
 *   classes instead of dropping the whole rule. For an unused-CSS analyzer,
 *   erring toward "this class is used" is safer than losing a definition.
 * - `baseSyntax: 'progressive'` with `pseudoClasses: { unknown: 'accept' }`
 *   keeps the CSS-Modules `:global` switch (and any other non-standard
 *   pseudo-class) from throwing, so `:global` parses into a `PseudoClass` node
 *   that `findClassNamesInSelector` reads to mark the rest of the compound as
 *   global. The function form `:global(.foo)` parses with a String argument and
 *   its inner class is intentionally not collected.
 */
export const parseSelector: Parser = createParser({
  strict: false,
  syntax: { baseSyntax: 'progressive', pseudoClasses: { unknown: 'accept' } },
});
