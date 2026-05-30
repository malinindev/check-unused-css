import type { AtRule } from 'postcss';

/**
 * Standard at-rules whose `params` are NOT a selector. Some take a condition
 * (`@media (min-width: …)`, `@supports (display: grid)`, `@container`), some an
 * identifier/keyframe-name (`@keyframes spin`, `@layer base`), some nothing or a
 * URL (`@font-face`, `@page`, `@property`, `@import`, `@charset`). A class token
 * appearing inside their params (e.g. a selector list under `@scope (.a) to (.b)`)
 * is part of a condition, not a class definition, so we never treat these as
 * selector-bearing. Custom CSS-Modules `@value` is excluded for the same reason.
 */
const NON_SELECTOR_AT_RULES = new Set([
  'media',
  'supports',
  'container',
  'layer',
  'scope',
  'keyframes',
  'font-face',
  'page',
  'property',
  'counter-style',
  'font-feature-values',
  'import',
  'charset',
  'namespace',
  'document',
  'value',
]);

/**
 * Whether an at-rule's direct children are `@value` blocks. Such an at-rule is a
 * responsive-value container (e.g. `@responsive .--size { @value small { … } }`):
 * its selector is a TEMPLATE expanded at build time into `--size-small` etc.,
 * never referenced literally as `s['--size']` (source reaches it via helpers
 * like `responsiveClassNames(s, '--size', value)`). Extracting the template name
 * as a class would produce a false "unused" finding, so these are skipped.
 * Any real classes nested deeper (e.g. `&.--visibility` inside a `@value` block)
 * are still picked up by the normal rule walk.
 */
const containsValueBlocks = (atRule: AtRule): boolean =>
  (atRule.nodes ?? []).some(
    (node) => node.type === 'atrule' && node.name.toLowerCase() === 'value'
  );

/**
 * Whether an at-rule's `params` should be treated as a CSS selector defining
 * classes. True for custom at-rules (e.g. `@responsive .item[style*="…"]`)
 * whose params contain a class token and whose body is a direct style block;
 * false for standard condition/identifier at-rules, params with no class token
 * (e.g. `@responsive (min-width: 1px)`), and responsive-value containers whose
 * selector is a build-time template (e.g. `@responsive .--size { @value … }`).
 */
export const isSelectorBearingAtRule = (atRule: AtRule): boolean => {
  if (NON_SELECTOR_AT_RULES.has(atRule.name.toLowerCase())) {
    return false;
  }

  // A class token is required for the params to define a class. This also
  // filters out custom at-rules used purely as condition wrappers
  // (e.g. `@responsive (min-width: 1px)`), which invent no class names.
  if (!atRule.params.includes('.')) {
    return false;
  }

  return !containsValueBlocks(atRule);
};
