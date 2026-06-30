import styles from './ScssUseDiamond.module.scss';

// `.base-class` is reachable via two forward paths (left + right). It must be
// recognized exactly once; `.shell` is local. Neither must be non-existent.
export const ScssUseDiamond = () => (
  <div className={[styles.shell, styles['base-class']].join(' ')} />
);
