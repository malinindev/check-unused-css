import styles from '~/AliasImportTilde.module.css';

export const AliasImportTilde: React.FC = () => (
  <div className={`${styles.usedClass} ${styles.usedClass2}`}>
    <div className={styles.usedClass3} />
  </div>
);
