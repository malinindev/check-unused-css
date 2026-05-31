import type { AtRule } from 'postcss';

// Matches a CSS class token, including the `.--modifier` double-dash convention.
// Used to confirm the params actually define a class rather than merely
// containing a stray `.` (e.g. a decimal in `(min-width: 1.5rem)` or a URL).
const CLASS_TOKEN_PATTERN = /\.[-_a-zA-Z]/;

/**
 * Known CSS and SCSS at-rules whose `params` are never a class-defining
 * selector — so we classify an at-rule as selector-bearing only when its name
 * is NOT here (a custom at-rule like `@responsive .item { … }`).
 *
 * A blocklist of names is more robust than inspecting params: many of these
 * carry a dot for an unrelated reason (the module path in `@use "…/_fonts.scss"`,
 * the namespaced call in `@include fonts.body`, a decimal in `@media (… 1.5rem)`),
 * which a class-token check alone would misread as a class. Their params are
 * conditions, identifiers, URLs, module paths, mixin calls or expressions; any
 * real selector lives in a nested rule the normal rule walk already visits.
 *
 * Deliberately absent: `@responsive` (design systems use it with a class
 * selector; Tailwind's param-less form yields no class anyway) and `@at-root`
 * (`@at-root .foo { … }` holds a real class in its params, with no nested rule
 * node for the rule walk to catch).
 */
const NON_SELECTOR_AT_RULES = new Set([
  // Standard CSS
  'media',
  'supports',
  'container',
  'layer',
  'scope',
  'keyframes',
  '-webkit-keyframes',
  '-moz-keyframes',
  '-o-keyframes',
  '-ms-keyframes',
  'font-face',
  'font-feature-values',
  'font-palette-values',
  'page',
  'property',
  'counter-style',
  'color-profile',
  'position-try',
  'view-transition',
  'starting-style',
  'document',
  '-moz-document',
  'import',
  'charset',
  'namespace',
  'nest',
  // SCSS / Sass
  'use',
  'forward',
  'mixin',
  'include',
  'function',
  'return',
  'if',
  'else',
  'each',
  'for',
  'while',
  'content',
  'extend',
  'debug',
  'warn',
  'error',
  // CSS Modules / PostCSS plugins
  'value',
  'custom-media',
  'custom-selector',
  'custom-property',
  'apply',
  'tailwind',
  'screen',
  'variants',
]);

/**
 * Whether an at-rule's direct children include a `@value` BLOCK. Such an at-rule
 * is a responsive-value container (e.g. `@responsive .--size { @value small { … } }`):
 * its selector is a TEMPLATE expanded at build time into `--size-small` etc.,
 * never referenced literally as `s['--size']` (source reaches it via helpers
 * like `responsiveClassNames(s, '--size', value)`). Extracting the template name
 * as a class would produce a false "unused" finding, so these are skipped.
 * Any real classes nested deeper (e.g. `&.--visibility` inside a `@value` block)
 * are still picked up by the normal rule walk.
 *
 * Only block-form `@value` (with a `{ … }` body, i.e. a `nodes` array) signals a
 * template container. Statement-form `@value foo: 1;` is a CSS-Modules variable
 * declaration and must NOT cause the selector to be skipped.
 */
const containsValueBlocks = (atRule: AtRule): boolean =>
  (atRule.nodes ?? []).some(
    (node) =>
      node.type === 'atrule' &&
      node.name.toLowerCase() === 'value' &&
      node.nodes !== undefined
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

  // An actual class token is required for the params to define a class. A bare
  // `.includes('.')` is too broad — it matches condition wrappers with decimals
  // or URLs (e.g. `@responsive (min-width: 1.5rem)`), so match a real class
  // token instead. This also filters out condition-only custom at-rules, which
  // invent no class names.
  if (!CLASS_TOKEN_PATTERN.test(atRule.params)) {
    return false;
  }

  return !containsValueBlocks(atRule);
};
