import styles from '@/AliasReferencesNoBaseUrl.module.css';

export const AliasReferencesNoBaseUrl: React.FC = () => (
  <div className={`${styles.usedClass} ${styles.usedClass2}`}>
    <div className={styles.usedClass3} />
  </div>
);
