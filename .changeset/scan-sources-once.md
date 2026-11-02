---
'check-unused-css': patch
---

Scan the source files for CSS module imports once per run instead of twice for every CSS module (#104). Run time no longer grows with the number of CSS modules times the number of source files. The reported results do not change. A warning about an unreadable source file now appears once instead of up to twice per CSS module.
