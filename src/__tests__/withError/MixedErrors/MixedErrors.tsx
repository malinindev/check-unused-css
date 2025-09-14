import styles from './MixedErrors.module.css';

export const MixedErrors: React.FC = () => (
  <div className={styles.usedClass}>
    <div className={styles.nonExistentClass1} />
    {/* biome-ignore lint/complexity/useLiteralKeys: Testing bracket notation access */}
    <div className={styles['nonExistentClass2']} />
  </div>
);
