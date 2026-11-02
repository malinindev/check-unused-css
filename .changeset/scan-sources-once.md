---
'check-unused-css': patch
---

Scan the source files for CSS module imports once per run instead of once for every CSS module (#104). Large projects now take seconds instead of minutes. The reported results do not change. A warning about an unreadable source file now appears once instead of once per CSS module.
