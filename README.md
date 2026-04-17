# check-unused-css

A **zero-config** tool to find unused CSS classes and non-existent class references in your TypeScript project. Works with .module.css, .module.scss, and .module.sass.

No more dead styles in your codebase!

Fully tested - check the [tests folder](./src/__tests__/) for real-world scenarios.

## Example output

![Example output](./exampleOutput.png)

## Install

```bash
npm i --D check-unused-css
```

## Usage

Add script to package.json:

```json
{
  "scripts": {
    "check-unused-css": "check-unused-css"
  }
}
```

Run:

```bash
npm run check-unused-css
```

### Options

You can specify a custom folder path to check:

```bash
npx check-unused-css src/components
```

By default, it checks the `src` directory.

#### Exclude patterns

You can exclude certain files or directories from being checked using the `--exclude` or `-e` flag. Patterns are relative to your project root:

```bash
# Exclude specific directories
npx check-unused-css --exclude "src/components/SidePanel/**"
npx check-unused-css --exclude "./src/stories/**"

# Exclude test files using glob patterns
npx check-unused-css --exclude "**/test/**"
npx check-unused-css --exclude "**/__tests__/**"

# Exclude multiple patterns
npx check-unused-css --exclude "src/components/SidePanel/**" -e "**/stories/**"

# Combine with custom path
npx check-unused-css src/components --exclude "src/components/tests/**"

# Alternative syntax with equals
npx check-unused-css --exclude="src/components/SidePanel/**"
npx check-unused-css -e="./src/stories/**"
```

Exclude patterns support both specific paths and glob syntax:

**Specific paths (from project root):**
- `src/components/SidePanel/**` - exclude specific component folder
- `./src/stories/**` - exclude stories directory
- `src/legacy/**` - exclude legacy code

**Glob patterns (universal matching):**
- `**/test/**`, `**/__tests__/**` - test directories anywhere
- `**/stories/**` - story files anywhere
- `**/*.test.{css,scss}`, `**/*.spec.*` - test files by pattern
- `**/node_modules/**` - node modules (usually not needed)

*Note: Remember to wrap patterns in quotes to prevent shell expansion*

#### Strict mode for dynamic class access

By default, the tool shows warnings for dynamic class access but doesn't fail the process. Use the `--no-dynamic` flag to treat dynamic class usage as errors:

```bash
# Fail on dynamic class access
npx check-unused-css --no-dynamic

# Combine with other options
npx check-unused-css src/components --no-dynamic --exclude "**/test/**"
```

When `--no-dynamic` is used:
- Dynamic class access (e.g., `styles[variable]`) will be treated as errors instead of warnings
- The process will exit with code 1 if any dynamic usage is detected
- Error messages will be displayed in red instead of yellow warnings

This is useful in CI/CD pipelines where you want to enforce explicit class usage.

**[Read more about why dynamic class access should be avoided](./docs/avoid-dynamic-classes.md)**

#### Removing unused classes (`--remove`)

Once the tool has identified unused classes, you can let it delete them for you in place:

```bash
# Preview, prompt, remove
npx check-unused-css --remove

# Skip the y/N confirmation (required in non-interactive environments)
npx check-unused-css --remove --yes
npx check-unused-css --remove -y
```

What the tool does in `--remove` mode:
1. Runs the usual analysis.
2. Prints a **plan** listing every change it intends to make, grouped by file:
   - `remove <.className> (line N)` — the whole rule is dead and will be deleted.
   - `strip <.className> from \`<selector list>\` (line N) → \`<new list>\`` — part of a shared selector list; the rule stays, the dead selector leaves.
   - If any rules mention an unused class but aren't safely auto-removable, they're listed in a **Manual review** block (file, line, full selector).
3. Asks `Apply these changes? [y/N]` in an interactive terminal. In CI or piped contexts you must pass `--yes` — the tool refuses to write without one or the other.
4. Mutates the CSS/SCSS files in place using [PostCSS](https://postcss.org/)'s AST, preserving every unedited byte (whitespace, comments, other rules) exactly as authored.

**What counts as "safely removable"** — the tool auto-removes a rule iff, after resolving SCSS `&` nesting, the unused class is a simple selector of the **leading (leftmost) compound** of the selector. That covers every rule where the target element is required to carry the unused class (including `.unused`, `.unused:hover`, `.other.unused`, `.unused > .child`, `.unused ~ x`, `&.unused` inside a used parent, shared lists). Rules where the unused class appears only as a descendant (`.wrapper .unused`, `.parent { .unused { } }`) are surfaced as warnings instead — those are the only ambiguous case in pure CSS semantics and the tool leaves them for manual review.

**Rollback is yours.** The tool performs no git operations. Commit or stash before running if you want a clean rollback target — `git checkout -- .` reverts any write the tool made.

**Exit codes:**
- `0` — success (action applied, or report-only with nothing to flag).
- `1` — report-only and unused/non-existent classes still exist (unchanged from before `--remove` existed).
- `2` — bad argument combination (unknown flag, non-TTY without `--yes`).
- `4` — user declined the interactive y/N prompt.

#### Ignoring files or lines with comments

You can ignore specific lines or entire files from CSS checking using special comments, similar to ESLint:

**For CSS files:**

```css
/* check-unused-css-disable */
.unusedClass { }
```

```css
.usedClass { }

/* check-unused-css-disable-next-line */
.unusedClass { }
```

**For TypeScript/TSX files:**

```tsx
// check-unused-css-disable
import styles from './Component.module.css';

export const Component = () => (
  <div className={styles.unusedClass} />
);
```

```tsx
import styles from './Component.module.css';

export const Component = () => (
  <div>
    <div className={styles.usedClass} />
    {/* check-unused-css-disable-next-line */}
    <div className={styles.unusedClass} />
  </div>
);
```

**Supported comment formats:**
- `/* check-unused-css-disable */` - ignore entire CSS file
- `/* check-unused-css-disable-next-line */` - ignore next line in CSS
- `// check-unused-css-disable` - ignore entire TS/TSX file
- `// check-unused-css-disable-next-line` - ignore next line in TS/TSX
- `{/* check-unused-css-disable-next-line */}` - ignore next line in JSX (TSX)

## TypeScript Path Aliases Support

`check-unused-css` automatically supports TypeScript path aliases defined in your `tsconfig.json`.

### Example

If you have path aliases in your TypeScript configuration:

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "~/*": ["lib/*"]
    }
  }
}
```

Then imports using these aliases will be correctly resolved:

```typescript
import styles from '@/components/Button.module.css';
import styles from '@components/ui/Card.module.css';
import styles from '~/shared/theme.module.css';
```

### How it works

- Automatically finds and parses `tsconfig.json` in your project
- Supports `extends` for shared configurations
- Supports wildcard patterns (`*`)
- Falls back to regular path resolution if no aliases match
- No configuration needed - it just works!

### Supported features

- Simple aliases: `"@utils": ["src/utils"]`
- Wildcard aliases: `"@/*": ["src/*"]`
- Nested aliases: `"@components/ui/*": ["src/components/ui/*"]`
- Multiple path mappings (uses first match)
- Config inheritance via `extends`
- Project references (automatically resolves paths from referenced tsconfig files)

## CI Integration

Set up automated checks for unused CSS in your pipeline.  
See **[CI integration examples](./docs/ci-integration.md)** for GitHub Actions and GitLab CI.

## Limitations

The tool only works when CSS classes are used directly, for example:

```tsx
import styles from './Component.module.css';

// ...
<div className={styles.yourClassName} />
```

Dynamic class access cannot be detected:

```tsx
import styles from './Component.module.css';

const dynamicClass = Math.random() * 10 >= 5 ? 'classOne' : 'classTwo';

// ...
// cannot detect usage
<div className={styles[dynamicClass]} />
```

In such cases, the tool will skip the check and mark it as passed. [Avoid dynamic access](./docs/avoid-dynamic-classes.md) and use explicit class names for clarity.

## FAQ

### Why not use [`typescript-plugin-css-modules`](https://www.npmjs.com/package/typescript-plugin-css-modules)?
First, it doesn't work in CI without generating `.d.ts` files.  
Second, even in IDEs it **often doesn't work reliably** due to caching, misconfigured TypeScript, or not using the workspace version.

---

### I use dynamic class access like `styles[size]` and don’t want to change that
In that case, this library is probably not a good fit for your project.  
I **[recommend](./docs/avoid-dynamic-classes.md)** not mixing concerns. Instead, you can:
- write explicit map functions to convert values to class names
- use [`class-variance-authority`](https://www.npmjs.com/package/class-variance-authority)

---

### This is too complex. Why not just use Tailwind?
If you like Tailwind - go for it!

---

### [`typed-scss-modules`](https://www.npmjs.com/package/typed-scss-modules) or [`typed-css-modules`](https://www.npmjs.com/package/typed-css-modules) solves this. Why do I need your lib?
These libs require:
- generating and committing `.d.ts` files to your repo
- developing in watch mode to keep them up to date  

`check-unused-css` works out of the box, supports `.css`, `.scss`, `.sass`, and requires zero config.

---

### Why not use [`eslint-plugin-css-modules`](https://www.npmjs.com/package/eslint-plugin-css-modules)?

Short answer: it's abandoned, requires ESLint, and slower.

Problems with `eslint-plugin-css-modules`:
- Not maintained (abandoned by author)
- Requires ESLint (doesn't work with Biome, oxlint, or without a linter)
- Slower (runs through ESLint on every file)
- Needs setup (config files, rules, ignores)

Why `check-unused-css` is better:
- Zero config - just run `npx check-unused-css`
- Works everywhere - no ESLint needed (great for Biome/oxlint users)
- Fast standalone tool, optimized for CSS modules
- Modern TypeScript path aliases and project references support
- Actively maintained with new features and bug fixes

Use `check-unused-css` if you want a simple, fast tool that works without ESLint.

## License

MIT
