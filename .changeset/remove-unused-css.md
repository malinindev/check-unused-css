---
'check-unused-css': minor
---

Add `--remove` / `--yes` flags to delete unused CSS module classes in place.

Shows a plan, prompts for confirmation (or `--yes` in CI), then rewrites files via PostCSS. Only removes rules where the unused class is in the leading compound of the selector — descendants like `.wrapper .unused` go to manual review.

Report-only mode is unchanged.
