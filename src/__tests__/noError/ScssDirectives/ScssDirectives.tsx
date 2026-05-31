import styles from './ScssDirectives.module.scss';

// Every REAL class in the SCSS is referenced here via static access. The mixin
// names (`card-typography`), namespaced @include params (`fonts.body-accent`),
// module paths (`@use "…/_fonts.scss"`) and @each list items (`primary.dark`)
// must NOT be treated as classes — otherwise they'd be reported as unused.
// `.promoted` is defined via `@at-root .promoted` and is a genuine class.
export const ScssDirectives = () => (
  <div
    className={[
      styles.card,
      styles['card-title'],
      styles['visually-hidden'],
      styles.badge,
      styles.wrapper,
      styles.promoted,
      styles.host,
      styles.scoped,
    ].join(' ')}
  />
);
