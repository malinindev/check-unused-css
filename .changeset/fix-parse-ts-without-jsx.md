---
'check-unused-css': patch
---

Fix a crash on plain `.ts` files (#89). Angle-bracket syntax like `<string[]>[]` and `<T>(x) => x` is only valid when JSX is off, but the parser always ran with JSX on, so these files failed to parse. JSX is now disabled for `.ts`/`.mts`/`.cts` files.
