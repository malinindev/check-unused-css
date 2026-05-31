---
'check-unused-css': patch
---

Eliminate two sources of false "unused"/"non-existent" reports on real-world CSS-Modules codebases.

- **Ampersand-family parents are no longer falsely reported as unused.** SCSS suffix concatenation (`.--orientation { &-horizontal {} }`, also camelCase `.button { &Black {} }`, and multi-level chains) defines a parent class that source typically never references directly — only its children, often dynamically (`s[\`--orientation-${v}\`]`). A used child (directly, via a literal, or via the existing dynamic-coverage matching) now rescues every ancestor on its concatenation path. A family with no used member is still reported, and genuinely-unused siblings are still reported.
- **A CSS module whose whole object is passed to a function is now ignored, with a clear warning.** When the imported module object is handed as a direct argument to any function call (e.g. `responsiveClassNames(s, "--nowrap", v)`, including the composed `classNames(s.root, responsiveClassNames(s, …))` form), the analyzer cannot know which classes that function applies, so it skips both the unused and the non-existent checks for that module and prints a warning naming the source file and reason. Passing a single property (`classNames(s.root, …)`) or reading the module directly (`s.foo`, `s["foo"]`, `s[\`foo-${x}\`]`) does not trigger this; only the specific module passed whole is ignored, and other modules in the same file are still analyzed. Under `--no-dynamic` the ignored module is escalated to an error, and `--remove` never touches it.

Both behaviors are configless and preserve all genuine findings.
