import styles from './MultipleStyles.module.css';

export const MultipleStyles: React.FC = () => (
  <div className={styles.mainClass1}>
    <div className={styles.mainClass2} />
  </div>
);
