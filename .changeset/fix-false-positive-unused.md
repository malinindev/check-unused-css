---
'check-unused-css': patch
---

Fix two sources of false positives.

- A parent class of an SCSS ampersand family (`.--orientation { &-horizontal {} }`) is no longer reported as unused when its children are used.
- A CSS module passed whole into a function (e.g. `responsiveClassNames(s, …)`) is now skipped with a warning, since its class usage can't be determined.
