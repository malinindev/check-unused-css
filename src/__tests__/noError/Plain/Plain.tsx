import styles from './Plain.module.css';

export const Plain: React.FC = () => (
  <div className={`${styles.usedClass} ${styles.usedClass2}`}>
    <div className={styles.usedClass3} />
  </div>
);
