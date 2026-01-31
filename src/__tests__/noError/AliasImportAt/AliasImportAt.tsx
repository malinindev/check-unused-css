import styles from '@/AliasImportAt.module.css';

export const AliasImportAt: React.FC = () => (
  <div className={`${styles.usedClass} ${styles.usedClass2}`}>
    <div className={styles.usedClass3} />
  </div>
);
