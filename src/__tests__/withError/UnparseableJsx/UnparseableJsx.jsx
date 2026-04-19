import styles from './UnparseableJsx.module.css';

// Intentionally unterminated template literal to force a parser failure.
// biome-ignore lint/correctness/noUnusedVariables: fixture for parse-error reporting
const broken = `unterminated template

export const UnparseableJsx = () => <div className={styles.button} />;
