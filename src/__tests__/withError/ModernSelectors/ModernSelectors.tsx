import styles from './ModernSelectors.module.css';

// Exercises the modern selector styles supported by the extractor, all via
// STATIC access (so the non-existent check runs — it skips files with dynamic
// access). Classes referenced here are DEFINED in the CSS and must NOT be
// reported:
//  - nested `&.--modifier` (root, --reversed, --error)
//  - SCSS suffix concat under a compound parent (--variant, --variant-faded/outline)
//  - selector-bearing `@responsive` at-rules (item, --hidden, --visibility)
// `.missing` / `.alsoMissing` are NOT in the CSS — genuine "used but
// non-existent" findings that must survive the extractor fixes.
// `.actuallyUnused` is defined but never referenced — a genuine "unused" finding.
export const ModernSelectors = () => (
  <div
    className={[
      styles.root,
      styles['--reversed'],
      styles['--error'],
      styles['--variant'],
      styles['--variant-faded'],
      styles['--variant-outline'],
      styles.item,
      styles['--hidden'],
      styles['--visibility'],
      styles.missing,
      styles.alsoMissing,
    ].join(' ')}
  />
);
