import styles from './PlainJsx.module.css';

export const PlainJsx = () => (
  <div className={`${styles.usedClass} ${styles.usedClass2}`}>
    <div className={styles.usedClass3} />
  </div>
);
