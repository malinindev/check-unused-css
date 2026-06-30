import fs from 'node:fs';
import path from 'node:path';

/**
 * Resolves a SCSS `@use`/`@forward`/`@import` spec to an absolute file path,
 * following Sass's load-path rules relative to the importing file's directory:
 *
 *  - a leading underscore marks a partial, so both `_name.ext` and `name.ext`
 *    are tried;
 *  - the `.scss`, `.sass` and `.css` extensions are tried in that order;
 *  - a spec pointing at a directory resolves to its `_index` / `index` file.
 *
 * Returns the first existing file, or `null` when nothing matches (a missing
 * partial must not break the run).
 */

const EXTENSIONS = ['.scss', '.sass', '.css'] as const;

const candidateFilesFor = (basePath: string): string[] => {
  const dir = path.dirname(basePath);
  const name = path.basename(basePath);

  const candidates: string[] = [];

  // Direct file: `_name.ext` (partial) takes precedence over `name.ext`.
  if (!name.startsWith('_')) {
    for (const ext of EXTENSIONS) {
      candidates.push(path.join(dir, `_${name}${ext}`));
    }
  }
  for (const ext of EXTENSIONS) {
    candidates.push(path.join(dir, `${name}${ext}`));
  }

  // Directory index: `name/_index.ext` then `name/index.ext`.
  for (const ext of EXTENSIONS) {
    candidates.push(path.join(basePath, `_index${ext}`));
  }
  for (const ext of EXTENSIONS) {
    candidates.push(path.join(basePath, `index${ext}`));
  }

  return candidates;
};

export const resolveScssImport = (
  spec: string,
  fromFileDir: string
): string | null => {
  // Strip an explicit extension so we can apply the partial/extension rules
  // uniformly; if the author wrote `shared.scss` we still try `_shared.scss`.
  const withoutExt = spec.replace(/\.(scss|sass|css)$/i, '');
  const basePath = path.resolve(fromFileDir, withoutExt);

  for (const candidate of candidateFilesFor(basePath)) {
    try {
      if (fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // Not present — try the next candidate.
    }
  }

  return null;
};
