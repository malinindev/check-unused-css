---
'check-unused-css': patch
---

Recognize modern CSS-Modules selector styles when extracting defined classes, eliminating false positives.

Stylesheets using double-dash modifier classes (`.--reversed`), native CSS Nesting (`.root { &.--error {} }`), SCSS-style suffix concatenation under a compound parent (`.root.--variant { &-faded {} }` → `--variant-faded`), and selector-bearing custom at-rules (`@responsive .item[style*="…"] {}`) previously had those classes dropped during extraction. They were then wrongly reported as "used in source but non-existent in CSS", and mis-derived names were reported as "unused". Extraction now handles all of these, while genuinely missing/unused classes are still reported. Responsive-value containers (`@responsive .--size { @value … }`) whose selector is a build-time template are intentionally not treated as defined classes.
