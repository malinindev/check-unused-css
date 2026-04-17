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

  // Malformed selector returns notMentioned (gracefully, matches existing pattern in codebase)
  test('malformed selector → notMentioned', () => {
    expect(classifySelector('.card {', 'card')).toBe('notMentioned');
  });
});
