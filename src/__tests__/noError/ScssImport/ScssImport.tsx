import styles from './ScssImport.module.scss';

// `.legacy-box` comes from the `@import 'legacy'` partial; `.content` is local.
// Neither must be reported as non-existent.
export const ScssImport = () => (
  <div className={[styles.content, styles['legacy-box']].join(' ')} />
);
