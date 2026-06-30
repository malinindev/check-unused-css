import postcssScss from 'postcss-scss';

/**
 * Extracts the partial paths a SCSS file pulls in via `@use`, `@forward` and the
 * legacy `@import`. These are the only directives that emit the loaded file's
 * top-level CSS rules into the compiled output, so their classes are real,
 * usable classes of the importing module (issue #90).
 *
 * Only the module URL is returned — namespaces (`as x`), config (`with (…)`),
 * and member filters (`show`/`hide`) are irrelevant to which CSS rules surface.
 *
 * `@import` is matched with Sass's own rule: a string is a Sass import (inlined
 * at build time) UNLESS it has a `.css` extension, begins with `http://` /
 * `https://`, is a `url(…)`, or carries a media query. Those are plain CSS
 * imports that do not inline the file, so they contribute no classes.
 */

const LEADING_QUOTED_STRING = /^['"]([^'"]+)['"]/;

const isSassImportSpec = (segment: string): string | null => {
  const trimmed = segment.trim();

  // `url(...)` is always a plain CSS import.
  if (/^url\s*\(/i.test(trimmed)) {
    return null;
  }

  const leading = trimmed.match(LEADING_QUOTED_STRING);
  if (!leading?.[1]) {
    return null;
  }

  const spec = leading[1];

  // Anything after the closing quote (e.g. a media query) marks a plain CSS
  // import that is not inlined.
  const rest = trimmed.slice(leading[0].length).trim();
  if (rest.length > 0) {
    return null;
  }

  // Sass does not inline CSS-extension or remote URLs.
  if (
    spec.endsWith('.css') ||
    spec.startsWith('http://') ||
    spec.startsWith('https://')
  ) {
    return null;
  }

  return spec;
};

export const extractScssImportPaths = (cssContent: string): string[] => {
  const paths: string[] = [];

  let root: ReturnType<typeof postcssScss.parse>;
  try {
    root = postcssScss.parse(cssContent);
  } catch {
    // A malformed partial should never break class extraction for the module.
    return paths;
  }

  root.walkAtRules((atRule) => {
    const name = atRule.name.toLowerCase();

    if (name === 'use' || name === 'forward') {
      // `@use`/`@forward` take exactly one module URL, optionally followed by
      // `as …`, `with (…)`, `show …` or `hide …` — all irrelevant here.
      const match = atRule.params.match(LEADING_QUOTED_STRING);
      if (match?.[1]) {
        paths.push(match[1]);
      }
      return;
    }

    if (name === 'import') {
      // `@import` may list several comma-separated specs.
      for (const segment of atRule.params.split(',')) {
        const spec = isSassImportSpec(segment);
        if (spec) {
          paths.push(spec);
        }
      }
    }
  });

  return paths;
};
