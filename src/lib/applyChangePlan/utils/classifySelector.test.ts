import { describe, expect, test } from 'bun:test';
import { classifySelector } from './classifySelector.js';

describe('classifySelector', () => {
  // DEAD — leading compound contains the unused class
  test('.card alone → dead', () => {
    expect(classifySelector('.card', 'card')).toBe('dead');
  });

  test('.card:hover → dead', () => {
    expect(classifySelector('.card:hover', 'card')).toBe('dead');
  });

  test('.card::before → dead', () => {
    expect(classifySelector('.card::before', 'card')).toBe('dead');
  });

  test('.card.mod (compound, leading side) → dead', () => {
    expect(classifySelector('.card.mod', 'card')).toBe('dead');
  });

  test('.other.card (compound, second side — still in LEADING compound) → dead', () => {
    expect(classifySelector('.other.card', 'card')).toBe('dead');
  });

  test('.card > .x (child combinator rooted at .card) → dead', () => {
    expect(classifySelector('.card > .x', 'card')).toBe('dead');
  });

  test('.card .x (descendant) → dead', () => {
    expect(classifySelector('.card .x', 'card')).toBe('dead');
  });

  test('.card + .sibling → dead', () => {
    expect(classifySelector('.card + .sibling', 'card')).toBe('dead');
  });

  test('.card ~ .sibling → dead', () => {
    expect(classifySelector('.card ~ .sibling', 'card')).toBe('dead');
  });

  test('.card.mod:hover > .x → dead (.card still leading)', () => {
    expect(classifySelector('.card.mod:hover > .x', 'card')).toBe('dead');
  });

  // WARN — class appears, but not in leading compound
  test('.wrapper .card → warn', () => {
    expect(classifySelector('.wrapper .card', 'card')).toBe('warn');
  });

  test('.other > .card → warn', () => {
    expect(classifySelector('.other > .card', 'card')).toBe('warn');
  });

  test('.other + .card → warn', () => {
    expect(classifySelector('.other + .card', 'card')).toBe('warn');
  });

  test('.other .x.card → warn (compound in non-leading)', () => {
    expect(classifySelector('.other .x.card', 'card')).toBe('warn');
  });

  test('.foo:not(.card) → warn (mentioned inside pseudo argument)', () => {
    expect(classifySelector('.foo:not(.card)', 'card')).toBe('warn');
  });

  // MIXED comma list — dead wins
  test('`.other, .card` → dead (one selector dead)', () => {
    expect(classifySelector('.other, .card', 'card')).toBe('dead');
  });

  test('`.other, .wrapper .card` → dead (non-leading in one does not demote overall)', () => {
    // The outer rule-level aggregation happens in buildChangePlan — here
    // we classify the whole string; any single dead selector wins.
    // `.other` is notMentioned, `.wrapper .card` is warn → overall warn,
    // because there is NO dead selector in the list.
    expect(classifySelector('.other, .wrapper .card', 'card')).toBe('warn');
  });

  test('`.card, .wrapper .card` → dead (first selector dead)', () => {
    expect(classifySelector('.card, .wrapper .card', 'card')).toBe('dead');
  });

  // NOT MENTIONED
  test('.other → notMentioned', () => {
    expect(classifySelector('.other', 'card')).toBe('notMentioned');
  });

  test('div > span → notMentioned', () => {
    expect(classifySelector('div > span', 'card')).toBe('notMentioned');
  });

  // Case sensitivity
  test('.Card does not match lowercase "card" → notMentioned', () => {
    expect(classifySelector('.Card', 'card')).toBe('notMentioned');
  });

  test('.card does not match uppercase "Card" (class lookup is case-sensitive)', () => {
    expect(classifySelector('.card', 'Card')).toBe('notMentioned');
  });

  // Prefix-style false positives should NOT trigger
  test('.card2 does not count as .card', () => {
    expect(classifySelector('.card2', 'card')).toBe('notMentioned');
  });

  test('.notcard does not count as .card', () => {
    expect(classifySelector('.notcard', 'card')).toBe('notMentioned');
  });

  // Malformed selector demoted to 'warn' so the rule is surfaced for manual
  // review rather than silently removed — a parse failure must never allow
  // another parent-slice to promote the slot to 'dead' in buildChangePlan.
  test('malformed selector → warn (never silently notMentioned)', () => {
    expect(classifySelector('.card {', 'card')).toBe('warn');
  });

  // :global(...) — CSS Modules escape hatch; sanitized before parsing so the
  // local parts of the selector can still be analyzed.
  test('.card :global(.foo) → dead (leading compound still .card)', () => {
    expect(classifySelector('.card :global(.foo)', 'card')).toBe('dead');
  });

  test(':global(.foo) .card → warn (.card lives in a non-leading compound)', () => {
    expect(classifySelector(':global(.foo) .card', 'card')).toBe('warn');
  });

  test(':global(.foo) alone → notMentioned for any local class', () => {
    expect(classifySelector(':global(.foo)', 'card')).toBe('notMentioned');
  });

  test(':global(.x.y) multi-class inside global → notMentioned', () => {
    expect(classifySelector(':global(.x.y)', 'card')).toBe('notMentioned');
  });

  test(':global(.foo):global(.bar) adjacent globals → notMentioned', () => {
    expect(classifySelector(':global(.foo):global(.bar)', 'card')).toBe(
      'notMentioned'
    );
  });

  test(':global(:is(.foo, .card)) — nested pseudo inside global → notMentioned (global hides the card)', () => {
    // Whether `.card` inside a `:global(:is(...))` counts as "mentioned" is a
    // judgment call; current behavior treats everything inside :global as
    // globally-named and therefore not referring to our local class name.
    expect(classifySelector(':global(:is(.foo, .card))', 'card')).toBe(
      'notMentioned'
    );
  });

  test('unterminated :global( → warn (never silently dropped)', () => {
    // Unbalanced :global(... means we can't trust any classification of the
    // tail. Returning 'warn' keeps the rule out of auto-remove.
    expect(classifySelector(':global(.foo .card', 'card')).toBe('warn');
  });

  // Middle-of-compound — most common real-world shape in CSS Modules BEM
  test('.a.unused.b (unused in the middle of a 3-class compound) → dead', () => {
    expect(classifySelector('.a.unused.b', 'unused')).toBe('dead');
  });

  test('.a.b.unused (unused at the end of a compound) → dead', () => {
    expect(classifySelector('.a.b.unused', 'unused')).toBe('dead');
  });

  // :is() / :where() / :has() — argument selectors must stay "warn" because
  // they're not top-level items of the leading compound.
  test('.foo:is(.unused, .bar) → warn (leading compound has :is, not .unused directly)', () => {
    expect(classifySelector('.foo:is(.unused, .bar)', 'unused')).toBe('warn');
  });

  test('.foo:where(.unused) → warn', () => {
    expect(classifySelector('.foo:where(.unused)', 'unused')).toBe('warn');
  });

  test('.foo:has(.unused) → warn', () => {
    expect(classifySelector('.foo:has(.unused)', 'unused')).toBe('warn');
  });
});
