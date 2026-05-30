/** Escape regex metacharacters so a constant template segment matches literally. */
const escapeRegex = (segment: string): string =>
  segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Build an anchored matcher from the cooked constant segments (`quasis`) of a
 * template literal used as a CSS-module key. Each `${...}` substitution becomes
 * a `.*` wildcard (matches any sequence, including empty and dashes — the only
 * choice that avoids false positives, since the runtime value is unknown).
 *
 * Returns `null` when there is no constant content at all (e.g. `` `${x}` ``),
 * which the caller maps to `coversAll`.
 *
 * Examples (hyphens are not regex metacharacters, so they stay unescaped):
 * - `` `btn-${x}` ``  → quasis `['btn-', '']`      → `^btn-.*$`
 * - `` `a-${x}-b` ``  → quasis `['a-', '-b']`       → `^a-.*-b$`
 * - `` `a-${x}-${y}` `` → quasis `['a-', '-', '']`  → `^a-.*-.*$`
 */
export const buildPatternRegex = (
  quasis: string[]
): { regex: RegExp; source: string } | null => {
  const hasConstant = quasis.some((segment) => segment.length > 0);
  if (!hasConstant) {
    return null;
  }

  const body = quasis.map(escapeRegex).join('.*');
  const source = `^${body}$`;
  return { regex: new RegExp(source), source };
};
