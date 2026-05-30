import styles from './Comprehensive.module.css';

// File 1 — static access (dot and bracket-literal notation). These classes are
// covered ONLY here, proving cross-file additivity.
export const ComprehensiveStatic = () => {
  return (
    <div className={styles.root}>
      <header className={styles.header} />
    </div>
  );
};
