---
'check-unused-css': patch
---

Fix a false "non-existent" report for a local class that is also used via `composes:` (#83). A class defined in the same file and referenced as `composes: localClass` was dropped from the defined set, so reading `styles.localClass` looked like a missing class. Such targets are now kept and counted as used; `composes: x from '…'` / `from global` are still treated as external.
