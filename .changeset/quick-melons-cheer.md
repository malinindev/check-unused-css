---
'check-unused-css': patch
---

Fix false "non-existent" reports for classes in nested selectors with a combinator next to `&`, like `.skipLink + &` (#96). Such classes are now recognized.
