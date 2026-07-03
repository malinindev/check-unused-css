import type { AstRule } from 'css-selector-parser';
import { createParser, type Parser } from 'css-selector-parser';

type AstRuleItem = AstRule['items'][number];

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
 *   its inner class is intentionally not collected, while the `:local(.foo)`
 *   function form has its String argument re-parsed so the inner class IS
 *   collected (issue #97) — both handled in `findClassNamesInSelector`.
 */
export const parseSelector: Parser = createParser({
  strict: false,
  syntax: { baseSyntax: 'progressive', pseudoClasses: { unknown: 'accept' } },
});

/**
 * The single definition of a CSS-Modules scope SWITCH: a bare `:global` (no
 * argument). Everything to its right — in the same selector and in nested rules
 * — is global. The function form `:global(.foo)` carries an argument and is NOT
 * a switch (`:global(.foo) .bar` keeps `.bar` local).
 */
export const isGlobalSwitchItem = (item: AstRuleItem): boolean =>
  item.type === 'PseudoClass' && item.name === 'global' && !item.argument;

/**
 * The mirror of {@link isGlobalSwitchItem}: a bare `:local` (no argument) is a
 * scope SWITCH back to local. Nested inside a `:global` block it re-scopes every
 * compound to its right — in this selector and its nested rules — as local
 * (issue #101). The function form `:local(.foo)` carries an argument and is NOT
 * a switch; its inner class is collected directly by `findClassNamesInSelector`.
 */
export const isLocalSwitchItem = (item: AstRuleItem): boolean =>
  item.type === 'PseudoClass' && item.name === 'local' && !item.argument;
