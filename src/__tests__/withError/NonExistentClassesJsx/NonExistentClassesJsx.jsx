import styles from './NonExistentClassesJsx.module.css';

export const NonExistentClassesJsx = () => (
  <div className={styles.existingClass}>
    <div className={styles.nonExistentClass1} />
    {/* biome-ignore lint/complexity/useLiteralKeys: Testing bracket notation access */}
    <div className={styles['nonExistentClass2']} />
    <div className={styles.anotherExistingClass} />
    <div className={styles.nonExistentClass3} />
  </div>
);
