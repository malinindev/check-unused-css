import styles from './ScssUseMissingPartial.module.scss';

// `@use 'missing'` points at a partial that is not present. The tool must run
// cleanly and report nothing; `.only` is defined locally.
export const ScssUseMissingPartial = () => <div className={styles.only} />;
