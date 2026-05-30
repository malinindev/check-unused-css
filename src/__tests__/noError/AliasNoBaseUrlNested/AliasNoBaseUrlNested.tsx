import styles from '@components/Button.module.css';

export const AliasNoBaseUrlNested: React.FC = () => (
  <div className={`${styles.usedClass} ${styles.usedClass2}`}>
    <div className={styles.usedClass3} />
  </div>
);
