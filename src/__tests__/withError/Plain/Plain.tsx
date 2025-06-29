import styles from './Plain.module.css';

export const Plain: React.FC = () => (
  <div className={styles.usedClass}>
    <div className={styles.usedClass2} />
  </div>
);
