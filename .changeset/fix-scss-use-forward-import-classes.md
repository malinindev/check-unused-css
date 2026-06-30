---
'check-unused-css': patch
---

Recognize classes pulled into a SCSS module via `@use`, `@forward` and the legacy `@import` (#90). Those directives emit the partial's rules into the module's compiled CSS, so the classes are real. They are no longer reported as non-existent, and a shared partial's classes are never reported as unused for the importing module. Partial paths are resolved transitively with cycle protection.
