import styles from './ScssUseSubdir.module.scss';

// `.heading` comes from a partial in a subdirectory (`partials/_typography.scss`);
// `.page` is local. Neither must be reported as non-existent.
export const ScssUseSubdir = () => (
  <div className={[styles.page, styles.heading].join(' ')} />
);
