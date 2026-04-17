---
'check-unused-css': minor
---

Add `--remove` and `--yes` / `-y` flags that delete unused CSS module classes in place.

Given an analysis run that flags unused classes, `--remove` builds a plan, shows a preview, asks for confirmation (y/N in a TTY; `--yes` required in non-interactive environments), and rewrites each affected file via PostCSS's AST. Every un-edited byte is preserved exactly as authored.

Classification uses a **leading-compound** rule: a selector is safe to remove when, after resolving SCSS `&` nesting, the unused class is a simple selector in the leftmost compound. That covers `.unused`, `.unused:hover`, `.other.unused`, `.unused > .child`, `&.unused`, shared selector lists (the dead entries are stripped, the rule survives), and nested `&.unused` inside a used parent. Rules where the class appears only as a descendant (`.wrapper .unused`, `.parent { .unused { } }`) are reported as manual-review warnings instead of being modified.

No new runtime dependency. No behavior change when `--remove` is not passed — report-only output is bit-for-bit identical to the previous release. No git operations performed; rollback is the user's responsibility via their normal VCS workflow.
