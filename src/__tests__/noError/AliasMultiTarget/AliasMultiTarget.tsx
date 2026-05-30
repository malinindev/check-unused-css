import styles from '@/MultiTarget.module.css';

export const AliasMultiTarget: React.FC = () => (
  <div className={`${styles.usedClass} ${styles.usedClass2}`}>
    <div className={styles.usedClass3} />
  </div>
);
