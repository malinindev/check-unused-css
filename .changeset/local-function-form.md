---
'check-unused-css': patch
---

Recognize classes defined with the `:local(...)` function form, like `:local(.active) { }` (#97). Such classes are no longer reported as non-existent.
