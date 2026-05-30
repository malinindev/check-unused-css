---
'check-unused-css': minor
---

Detect unused classes in files that also use dynamic class access.

Previously, any dynamic access to a CSS module (`styles[variant]`, `` styles[`btn-${x}`] ``, `styles[cond ? 'a' : 'b']`) made the whole module skip unused-class detection, hiding genuinely unused classes. Now each access is analysed for coverage: a template with a constant part (`` `btn-${x}` ``) only covers matching classes, a ternary of string literals resolves to those exact classes, and only truly indeterminate expressions (a bare variable, call, concatenation, or a template without a constant part) still cover the whole module. Classes not reached by any access are reported as before, with zero false positives — anything potentially reachable at runtime is never flagged.
