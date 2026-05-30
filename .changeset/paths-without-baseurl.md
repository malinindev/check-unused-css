---
'check-unused-css': patch
---

Resolve TypeScript `paths` aliases when `baseUrl` is not set.

`baseUrl` is deprecated in TypeScript 6, so modern configs declare `paths` without it. Resolution previously required `baseUrl`, causing alias-imported CSS modules to be wrongly reported as not imported (#73). Configs that still set `baseUrl` are unaffected.
