# check-unused-css

## 0.5.5

### Patch Changes

- 7434c8b: Recognize `:local(...)` classes nested inside a bare `:global {}` block, like `:global { :local(.small) {} }` (#101). Such classes are no longer reported as non-existent.

## 0.5.4

### Patch Changes

- 31ade53: Recognize classes defined with the `:local(...)` function form, like `:local(.active) { }` (#97). Such classes are no longer reported as non-existent.
- a3a1341: Fix false "non-existent" reports for classes in nested selectors with a combinator next to `&`, like `.skipLink + &` (#96). Such classes are now recognized.

## 0.5.3

### Patch Changes

- cfab8d9: Stop reporting classes inside a bare `:global { ... }` block (or `:global .switch` form) as unused (#91). The bare `:global` switch makes nested classes global, so they are no longer flagged. The function form `:global(.foo)` is unchanged.
- c0d5fd6: Fix a crash on plain `.ts` files (#89). Angle-bracket syntax like `<string[]>[]` and `<T>(x) => x` is only valid when JSX is off, but the parser always ran with JSX on, so these files failed to parse. JSX is now disabled for `.ts`/`.mts`/`.cts` files.
- 098fa60: Recognize classes pulled into a SCSS module via `@use`, `@forward` and the legacy `@import` (#90). Those directives emit the partial's rules into the module's compiled CSS, so the classes are real. They are no longer reported as non-existent, and a shared partial's classes are never reported as unused for the importing module. Partial paths are resolved transitively with cycle protection.

## 0.5.2

### Patch Changes

- 54293ec: Fix a false "non-existent" report for a class defined in a nested selector that starts with a combinator (#86). A nested SCSS/CSS rule whose selector begins with `>`, `+`, or `~` (e.g. `.wrapper { > .item { … } }`, or `& > .item` once the parent `&` is removed) was rejected by the selector parser, so its class was silently dropped from the defined set and reading `styles.item` looked like a missing class. Such leading combinators are now stripped before parsing, so the nested class is recognized.

## 0.5.1

### Patch Changes

- 04c507c: Fix a false "non-existent" report for a local class that is also used via `composes:` (#83). A class defined in the same file and referenced as `composes: localClass` was dropped from the defined set, so reading `styles.localClass` looked like a missing class. Such targets are now kept and counted as used; `composes: x from '…'` / `from global` are still treated as external.

## 0.5.0

### Minor Changes

- 92f91c9: Detect unused classes in files that also use dynamic class access.

  Previously, any dynamic access (`styles[variant]`, `` styles[`btn-${x}`] ``, `styles[cond ? 'a' : 'b']`) hid the whole module from unused-class detection. Now a template with a constant part covers only matching classes, a ternary of string literals resolves to those exact names, and only fully indeterminate expressions still cover the whole module — so genuinely unused classes are reported, with zero false positives.

### Patch Changes

- 3587d92: Fix two sources of false positives.

  - A parent class of an SCSS ampersand family (`.--orientation { &-horizontal {} }`) is no longer reported as unused when its children are used.
  - A CSS module passed whole into a function (e.g. `responsiveClassNames(s, …)`) is now skipped with a warning, since its class usage can't be determined.

- 22c4cf6: Recognize modern CSS-Modules selector styles when extracting defined classes, eliminating false positives.

  Stylesheets using double-dash modifier classes (`.--reversed`), native CSS Nesting (`.root { &.--error {} }`), SCSS-style suffix concatenation under a compound parent (`.root.--variant { &-faded {} }` → `--variant-faded`), and selector-bearing custom at-rules (`@responsive .item[style*="…"] {}`) previously had those classes dropped during extraction. They were then wrongly reported as "used in source but non-existent in CSS", and mis-derived names were reported as "unused". Extraction now handles all of these, while genuinely missing/unused classes are still reported. Responsive-value containers (`@responsive .--size { @value … }`) whose selector is a build-time template are intentionally not treated as defined classes.

- fa23fc4: Stop treating SCSS directives as class selectors. `@include fonts.body-accent-xs`, `@use "…/_fonts.scss"` and similar carry a dot in their params, which was misread as a class definition and produced false "unused" reports for mixin names. Such directives are now recognized and skipped; only genuine custom at-rules (e.g. `@responsive .item`) still contribute classes.

## 0.4.1

### Patch Changes

- 6e38467: Resolve TypeScript `paths` aliases when `baseUrl` is not set.

  `baseUrl` is deprecated in TypeScript 6, so modern configs declare `paths` without it. Resolution previously required `baseUrl`, causing alias-imported CSS modules to be wrongly reported as not imported (#73). Configs that still set `baseUrl` are unaffected.

## 0.4.0

### Minor Changes

- 92d6701: Scan `.js` and `.jsx` source files when looking for CSS-module importers.

  Previously only `.ts` and `.tsx` files were scanned, so a project written in plain JavaScript would have every class in every CSS module reported as unused. The file glob is now `**/*.{ts,tsx,js,jsx}`, and the existing AST-based usage, non-existent-class, and dynamic-usage analyses apply uniformly to the new extensions.

## 0.3.1

### Patch Changes

- 173a52a: Update ts config

## 0.3.0

### Minor Changes

- 9232cc6: Add `--remove` / `--yes` flags to delete unused CSS module classes in place.

  Shows a plan, prompts for confirmation (or `--yes` in CI), then rewrites files via PostCSS. Only removes rules where the unused class is in the leading compound of the selector — descendants like `.wrapper .unused` go to manual review.

  Report-only mode is unchanged.

## 0.2.7

### Patch Changes

- 05ad8ad: resolve SCSS parent selector (&) concatenation in class name extraction

## 0.2.6

### Patch Changes

- fb99e32: Add TypeScript path aliases support

## 0.2.5

### Patch Changes

- cbf441b: add ignore comments

## 0.2.4

### Patch Changes

- 2541d44: add absolute path support
- 8fb4b42: Fix clear global selectors util

## 0.2.3

### Patch Changes

- e5e2afe: Change relative import resolution

## 0.2.2

### Patch Changes

- 638d592: Add round brackets handling for file names

## 0.2.1

### Patch Changes

- 2f8572c: add directory handling

## 0.2.0

### Minor Changes

- ea23810: add checking classes used in TypeScript but non-existent in CSS

### Patch Changes

- f742265: update print format

## 0.1.9

### Patch Changes

- 0b6ff12: add exclude option
- 965bdf3: add no-dynamic option

## 0.1.8

### Patch Changes

- 4f62e6e: change postcss with postcss-scss to fix problems with comments in scss files
- de2ae86: fix lint problems

## 0.1.7

### Patch Changes

- 0576a95: replace regex parser with AST parser
- 78195e1: update deps

## 0.1.6

### Patch Changes

- 0b1b18a: fix bug with unclosed quotes

## 0.1.5

### Patch Changes

- 5ad23c3: fix conditional usage in dynamic styles
- 71d6642: add unit tests

## 0.1.4

### Patch Changes

- 8fdda32: fix dynamic styles usage
- 35582a1: add handling for non-existent path

## 0.1.3

### Patch Changes

- 92a0ac6: add ampersand support

## 0.1.2

### Patch Changes

- 6064eac: clean up the dist foulder

## 0.1.1

### Patch Changes

- b4f7585: fix release script

## 0.1.0

### Minor Changes

- e6012f1: fix :global issues, support nested complex selectors, add integration tests

### Patch Changes

- 12cf570: replace node with bun for a better testing experience

## 0.0.5

### Patch Changes

- f5255c6: use css-selector-parser and postcss instead of regexp for css parsing

## 0.0.4

### Patch Changes

- dd09bf5: add composes support

## 0.0.3

### Patch Changes

- 399d567: remove URL from parsing and add a success message when warnings occur

## 0.0.2

### Patch Changes

- 0e1df61: create basic functionality

## 0.0.2

### Patch Changes

- 0e1df61: create basic functionality
