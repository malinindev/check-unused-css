---
'check-unused-css': patch
---

Ignore a CSS module, with a warning, when the whole module object is handed on in any way, not only as a function argument (#108). This covers object property values like `transitionProps={{ classNames: styles }}`, JSX props, spreads, arrays, assignments, returns, `new` arguments and type assertions. Before, every class not read as `styles.foo` in that file was reported as unused. Reading a property (`styles.foo`, `styles[key]`), `typeof styles` and `void styles` still do not count.
