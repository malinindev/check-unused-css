---
'check-unused-css': minor
---

Scan `.js` and `.jsx` source files when looking for CSS-module importers.

Previously only `.ts` and `.tsx` files were scanned, so a project written in plain JavaScript would have every class in every CSS module reported as unused. The file glob is now `**/*.{ts,tsx,js,jsx}`, and the existing AST-based usage, non-existent-class, and dynamic-usage analyses apply uniformly to the new extensions.
