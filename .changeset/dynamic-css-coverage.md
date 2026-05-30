---
'check-unused-css': minor
---

Detect unused classes in files that also use dynamic class access.

Previously, any dynamic access (`styles[variant]`, `` styles[`btn-${x}`] ``, `styles[cond ? 'a' : 'b']`) hid the whole module from unused-class detection. Now a template with a constant part covers only matching classes, a ternary of string literals resolves to those exact names, and only fully indeterminate expressions still cover the whole module — so genuinely unused classes are reported, with zero false positives.
