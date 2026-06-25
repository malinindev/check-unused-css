---
'check-unused-css': patch
---

Fix a false "non-existent" report for a class defined in a nested selector that starts with a combinator (#86). A nested SCSS/CSS rule whose selector begins with `>`, `+`, or `~` (e.g. `.wrapper { > .item { … } }`, or `& > .item` once the parent `&` is removed) was rejected by the selector parser, so its class was silently dropped from the defined set and reading `styles.item` looked like a missing class. Such leading combinators are now stripped before parsing, so the nested class is recognized.
