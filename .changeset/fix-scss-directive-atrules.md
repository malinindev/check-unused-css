---
'check-unused-css': patch
---

Stop treating SCSS directives as class selectors. `@include fonts.body-accent-xs`, `@use "…/_fonts.scss"` and similar carry a dot in their params, which was misread as a class definition and produced false "unused" reports for mixin names. Such directives are now recognized and skipped; only genuine custom at-rules (e.g. `@responsive .item`) still contribute classes.
