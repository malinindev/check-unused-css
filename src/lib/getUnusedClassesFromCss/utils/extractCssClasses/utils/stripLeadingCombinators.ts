/**
 * A nested SCSS/CSS-Modules rule may start its selector with a combinator —
 * `> .item`, `+ .sibling`, `~ .general` — which is shorthand for
 * `& > .item` etc. Once the parent `&` is gone (see clearGlobalSelectors),
 * `css-selector-parser` rejects a selector that begins with a bare combinator
 * ("Expected rule but '>' found"), which would make the whole rule's classes
 * silently drop out of extraction.
 *
 * A leading combinator carries no class of its own, so for class extraction it
 * is pure noise: strip it from the start of each comma-separated selector
 * member, leaving the real compound (`.item`) for the parser.
 *
 * Splitting on every comma is safe here because a leading combinator can only
 * appear at the very start of a member; a comma inside `:not(...)`/`:has(...)`
 * is rejoined unchanged, so the only members ever rewritten are those that
 * genuinely begin with `>`, `+`, or `~`.
 */
const LEADING_COMBINATOR_REGEX = /^[>+~]\s*/;

export const stripLeadingCombinators = (selector: string): string =>
  selector
    .split(',')
    .map((member) => member.trim().replace(LEADING_COMBINATOR_REGEX, ''))
    .join(', ');
