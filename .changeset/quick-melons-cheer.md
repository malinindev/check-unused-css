---
'check-unused-css': patch
---

Fix a false "non-existent" report for a class in a nested selector that ends with a combinator before `&` (#96). A selector like `.skipLink + &` was rejected by the selector parser once the parent `&` was removed, so every class in the rule was dropped from the defined set and reading `styles.skipLink` looked like a missing class. Combinators orphaned by removing `&` — trailing (`.skipLink + &`), doubled (`.a + & + .b`), and in each member of a selector list — are now stripped before parsing, so the class is recognized.
