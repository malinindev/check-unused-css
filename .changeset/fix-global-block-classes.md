---
'check-unused-css': patch
---

Stop reporting classes inside a bare `:global { ... }` block (or `:global .switch` form) as unused (#91). The bare `:global` switch makes nested classes global, so they are no longer flagged. The function form `:global(.foo)` is unchanged.
