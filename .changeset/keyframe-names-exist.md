---
'check-unused-css': patch
---

Stop reporting `styles.<name>` as a non-existent class when `<name>` is a local `@keyframes` name (#107). css-loader exports keyframe names next to class names, so these reads are valid. Keyframes declared in a `@use`d or `@import`ed Sass partial count too. Names declared with `:global(...)` are not exported and are still reported.
