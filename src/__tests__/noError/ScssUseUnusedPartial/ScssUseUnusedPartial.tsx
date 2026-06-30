import styles from './ScssUseUnusedPartial.module.scss';

// Uses `.local` (module) and `.used` (partial). `.unused-in-partial` is left
// unreferenced on purpose: classes pulled in from a shared partial must not be
// reported as unused, since this module does not own them.
export const ScssUseUnusedPartial = () => (
  <div className={[styles.local, styles.used].join(' ')} />
);
