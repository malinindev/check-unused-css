import styles from './GlobalClasses.module.css';

export const GlobalClasses: React.FC = () => (
  <div className={`${styles.usedClass} ${styles.usedClass2}`}>
    <div className={styles.usedClass3} />
  </div>
);
