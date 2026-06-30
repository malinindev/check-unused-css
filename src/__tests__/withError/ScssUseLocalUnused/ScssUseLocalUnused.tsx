import styles from './ScssUseLocalUnused.module.scss';

// Uses `.shared` (partial) and `.used` (module). `.localUnused` is a real local
// class that nothing references, so it must still be reported as unused — the
// `@use` import must not mask local dead code.
export const ScssUseLocalUnused = () => (
  <div className={[styles.shared, styles.used].join(' ')} />
);
