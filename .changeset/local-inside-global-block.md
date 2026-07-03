---
'check-unused-css': patch
---

Recognize `:local(...)` classes nested inside a bare `:global {}` block, like `:global { :local(.small) {} }` (#101). Such classes are no longer reported as non-existent.
